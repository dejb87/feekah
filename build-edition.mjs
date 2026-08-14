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
    `${woven.length - edition.withSummary} title-only)` +
    (problems.length ? ` · ${problems.length} source(s) failed` : "")
  );
}

if (totalItems === 0) {
  console.error("\nNo stories in any edition — refusing to ship an empty paper.");
  process.exit(1);
}
console.log(`\nWrote ${totalItems} stories to public/editions/`);
