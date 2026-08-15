#!/usr/bin/env node
/**
 * Builds the static editions the app serves: public/editions/{no,sv,en}.json
 *
 *   node build-edition.mjs           build all languages
 *   node build-edition.mjs no        build one
 *
 * Runs once a day in CI, never in the browser. No API keys, no AI, no tokens —
 * every reader gets the same pre-built edition, so a visit costs one static
 * file fetch and nothing else.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fetchSource, filterItems, matcher, newSeen, emptyish } from "./lib/feeds.mjs";

const onlyLang = process.argv.slice(2).find((a) => !a.startsWith("--"));
const cfg = JSON.parse(await readFile(new URL("./feeds.json", import.meta.url), "utf8"));
const outDir = new URL("./public/editions/", import.meta.url);
await mkdir(outDir, { recursive: true });

/** RSS dates are RFC-822 or ISO; the app only ever needs YYYY-MM-DD. */
const isoDate = (s) => {
  const d = new Date(s);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
};

const SUMMARY_MAX = 260;

/**
 * Feeds disagree wildly about what <description> is for. Atlas Obscura syndicates
 * the ENTIRE article (one item ran past 10,000 characters), and WordPress sites
 * append "The post X appeared first on Y." to every summary. A card designed for
 * two calm sentences can't absorb either, so normalise here rather than making
 * the component defend itself at render time.
 */
function tidySummary(s) {
  if (!s) return "";
  let out = s
    .replace(/\s*The post .*? appeared first on .*?\.\s*$/i, "")
    .replace(/\s*\[…\]\s*$/, "")
    .replace(/\s*\[\.\.\.\]\s*$/, "")
    .trim();

  if (out.length <= SUMMARY_MAX) return out;

  // Prefer ending on a sentence; fall back to a word boundary.
  const window = out.slice(0, SUMMARY_MAX);
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (lastStop > SUMMARY_MAX * 0.5) return window.slice(0, lastStop + 1);
  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window).replace(/[,;:—–-]$/, "") + "…";
}

const IMAGE_MAX_BYTES = 1_200_000;

/**
 * Many publishers ship no image in RSS at all — ScienceDaily's items carry five
 * fields and nothing else, and Good News Network, Positive News and every SVT
 * feed are the same. Those articles do have a picture; it just isn't syndicated.
 *
 * The article page advertises it in an og:image meta tag, which exists for
 * precisely this purpose: so a link shows a picture when it's shared. Reading
 * that one tag is not scraping the article — we take the meta tag and nothing
 * else, and still link out for the story itself.
 *
 * Costs one request per imageless story, once a day, in CI. Readers pay nothing:
 * the result is baked into the static edition.
 */
async function fetchOgImage(pageUrl) {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "feekah/1.0 (+https://feekah.no) link preview" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    // Meta tags live in <head>; no need to read a whole article to find them.
    const head = (await res.text()).slice(0, 200_000);
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
      const m = head.match(re);
      if (!m) continue;
      const url = m[1].replace(/&amp;/g, "&").trim();
      if (/^https?:\/\//i.test(url)) return url;
    }
  } catch { /* unreachable or too slow — the card simply has no image */ }
  return "";
}

async function backfillImages(stories) {
  const missing = stories.filter((s) => !s.image && s.url);
  let found = 0;
  const BATCH = 6;   // polite: never more than six open connections at once
  for (let i = 0; i < missing.length; i += BATCH) {
    await Promise.all(missing.slice(i, i + BATCH).map(async (s) => {
      const img = await fetchOgImage(s.url);
      if (img) { s.image = img; found++; }
    }));
  }
  return { attempted: missing.length, found };
}

/**
 * Publishers syndicate whatever they have, unresized. One Natursidan image
 * measured 4 MB — a single card costing more than the rest of the page put
 * together, on a phone, for a reader who wanted a quick calm break. Check
 * cheaply at build time (HEAD, in CI, once a day) and drop the offenders
 * rather than making every reader pay to discover them.
 */
async function verifyImages(stories) {
  const withImages = stories.filter((s) => s.image);
  let dropped = 0;
  const BATCH = 8;
  for (let i = 0; i < withImages.length; i += BATCH) {
    await Promise.all(withImages.slice(i, i + BATCH).map(async (s) => {
      try {
        const r = await fetch(s.image, { method: "HEAD", signal: AbortSignal.timeout(8000), redirect: "follow" });
        const type = r.headers.get("content-type") || "";
        const size = Number(r.headers.get("content-length") || 0);
        if (!r.ok || !type.startsWith("image/") || size > IMAGE_MAX_BYTES) {
          s.image = ""; dropped++;
        }
      } catch {
        s.image = ""; dropped++;   // unreachable now means broken in a browser too
      }
    }));
  }
  return { checked: withImages.length, dropped };
}

const buildStamp = new Date().toISOString();
const maxPerTopic = cfg._policy?.maxPerTopic ?? 8;
let totalItems = 0;

for (const [lang, L] of Object.entries(cfg)) {
  if (lang.startsWith("_") || !L.sources) continue;
  if (onlyLang && lang !== onlyLang) continue;

  const match = matcher(L.matchMode || "substring");
  const seen = newSeen();
  const stories = [];
  const problems = [];

  for (const src of L.sources) {
    const res = await fetchSource(src);
    if (!res.ok) {
      // A dead feed must not take the whole edition down with it. Record it,
      // serve what the other sources gave us, and surface it in the summary.
      problems.push({ source: src.name, why: res.why });
      console.warn(`  ! ${src.name}: ${res.why}`);
      continue;
    }
    const { kept } = filterItems(res.items, src, L, match, seen);
    for (const i of kept) {
      stories.push({
        id: `${lang}-${src.id}-${stories.length}`,
        lang, // so a story borrowed into another edition can be labelled
        headline: i.title,
        // Empty string, never a soft hyphen — the app renders a compact
        // title-only card when this is falsy. See lib/feeds.mjs:emptyish.
        summary: emptyish(i.summary) ? "" : tidySummary(i.summary),
        topic: i.topic,
        source: i.source,
        url: i.link,
        image: i.image || "",
        date: isoDate(i.date),
        tier: i.tier,
      });
    }
  }

  // Newest first, and interleave sources so one prolific feed (forskning.no
  // ships 168 items) can't own the entire top of the edition.
  stories.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const bySource = new Map();
  for (const s of stories) {
    if (!bySource.has(s.source)) bySource.set(s.source, []);
    bySource.get(s.source).push(s);
  }
  let woven = [];
  let added = true;
  while (added) {
    added = false;
    for (const list of bySource.values()) {
      const next = list.shift();
      if (next) { woven.push(next); added = true; }
    }
  }

  // feekah is meant to END. The sun arc fills as you scroll and finishes at
  // "that's the good news for today" — 300 stories makes that promise a lie and
  // rebuilds the doom-scroll the app exists to avoid. Cap per topic rather than
  // overall, so picking a single chip still yields a real read instead of the
  // two leftovers after a dominant topic ate the budget.
  const perTopic = new Map();
  woven = woven.filter((s) => {
    const n = (perTopic.get(s.topic) || 0) + 1;
    perTopic.set(s.topic, n);
    return n <= maxPerTopic;
  });

  // Backfill first, then verify everything — an og:image can be oversized too.
  const back = await backfillImages(woven);
  const img = await verifyImages(woven);

  const edition = {
    lang,
    label: L.label,
    built: buildStamp,
    // The app re-applies this after merging in a supplementary edition, so a
    // mixed paper stays one morning's reading rather than two.
    maxPerTopic,
    count: woven.length,
    withSummary: woven.filter((s) => s.summary).length,
    problems,
    stories: woven,
  };

  await writeFile(new URL(`${lang}.json`, outDir), JSON.stringify(edition, null, 2) + "\n");
  totalItems += woven.length;
  console.log(
    `${lang}: ${woven.length} stories (${edition.withSummary} with summary, ` +
    `${woven.length - edition.withSummary} title-only) · ` +
    `${woven.filter((s) => s.image).length} with image` +
    (back.attempted ? ` (+${back.found} of ${back.attempted} from og:image)` : "") +
    (img.dropped ? ` (−${img.dropped} dropped: too large, broken or not an image)` : "") +
    (problems.length ? ` · ${problems.length} source(s) failed` : "")
  );
}

if (totalItems === 0) {
  console.error("\nNo stories in any edition — refusing to ship an empty paper.");
  process.exit(1);
}
console.log(`\nWrote ${totalItems} stories to public/editions/`);
