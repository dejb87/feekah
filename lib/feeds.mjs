/**
 * Shared feed pipeline. Imported by both validate-feeds.mjs (which reports) and
 * build-edition.mjs (which writes the editions the app serves), so the thing you
 * inspect is always the thing that ships.
 *
 * Deliberately dependency-free and AI-free: this runs once a day in CI and must
 * cost nothing per user and consume no tokens.
 */

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", deg: "°",
  eacute: "é", aring: "å", oslash: "ø", aelig: "æ", auml: "ä", ouml: "ö",
};

/**
 * WordPress feeds (Oddity Central, Positive News, Good News Network) lean on
 * NUMERIC entities — "World&#8217;s Most Crowded Beach" — so decoding only a
 * handful of named ones leaves raw &#8217; sitting in the rendered headline.
 * Decode numerics generally, then the named ones we actually see.
 *
 * &amp; is unescaped LAST: doing it first would turn "&amp;#8217;" into a live
 * entity and mangle text that was legitimately double-escaped.
 */
export const strip = (s = "") =>
  s.replace(/<!\[CDATA\[|\]\]>/g, "")
   .replace(/<[^>]+>/g, "")
   .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
   .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() === "amp" ? m : NAMED[n.toLowerCase()] ?? m))
   .replace(/&amp;/g, "&")
   .replace(/\s+/g, " ")
   .trim();

/**
 * NRK ships a <description> containing a lone soft hyphen (U+00AD) on most
 * Viten items — a deliberately blanked field, not a missing one. It is not
 * whitespace, so it survives strip() as a truthy 1-character string and would
 * render as a stray hyphen in a card. Treat invisible-only text as absent.
 */
export const emptyish = (s) => !s || !s.replace(/[\u00AD\u200B-\u200D\uFEFF\s]/g, "").length;

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? strip(m[1]) : "";
};

/** Minimal RSS + Atom parser. Enough for every feed in feeds.json. */
export function parseFeed(xml) {
  const chunks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  return chunks.map((c) => {
    let link = tag(c, "link");
    if (!link) {
      const m = c.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = m ? m[1] : "";
    }
    const categories = [...c.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) => strip(m[1]));
    const summary = [tag(c, "description"), tag(c, "summary"), tag(c, "content")].find((s) => !emptyish(s)) || "";
    return {
      title: tag(c, "title"),
      summary,
      link,
      date: tag(c, "pubDate") || tag(c, "published") || tag(c, "updated"),
      categories,
      raw: c,
    };
  });
}

/**
 * Norwegian and Swedish compound their nouns — "tarmkreft", "brannvesen",
 * "riksdagsval" — so a blocked stem routinely sits at the END of a word and
 * word-boundary matching sails straight past it. English doesn't compound, and
 * needs the boundary, or "dead" swallows "deadline". Hence per-language mode.
 */
export const matcher = (mode) => (haystack, words) => {
  const hay = (haystack || "").toLowerCase();
  return (words || []).find((w) => {
    const word = w.toLowerCase();
    return mode === "word"
      ? new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(hay)
      : hay.includes(word);
  });
};

/**
 * Block words are matched against the TITLE ONLY. Matching the summary as well
 * was killing good stories: "Taking the stairs could protect your heart" died
 * because its summary happened to mention a heart attack.
 *
 * An `allow` phrase rescues a hit, but only when the blocked word actually sits
 * inside that phrase — so "heart attack" survives while "terror attack" dies.
 */
export function blockedBy(item, lang, match) {
  const title = item.title || "";
  const hit = match(title, lang.block);
  if (!hit) return null;
  const rescue = (lang.allow || []).find(
    (p) => title.toLowerCase().includes(p.toLowerCase()) && p.toLowerCase().includes(hit.toLowerCase())
  );
  return rescue ? null : hit;
}

export const section = (u) => {
  try { return new URL(u).pathname.split("/").filter(Boolean)[0] || ""; } catch { return ""; }
};

const catText = (item) => (item.categories || []).join(" | ").toLowerCase();
export const catMatch = (item, list) => {
  const cats = catText(item);
  return cats ? (list || []).find((c) => cats.includes(c.toLowerCase())) || null : null;
};

export const normTitle = (t) =>
  (t || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();

export const canonUrl = (u) => {
  try {
    const url = new URL(u);
    return `${url.host}${url.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return (u || "").toLowerCase();
  }
};

const UA = "feekah/1.0 (+https://feekah.no) feed reader";

export async function fetchSource(src, timeout = 15000) {
  const t0 = Date.now();
  try {
    const res = await fetch(src.url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}`, ms: Date.now() - t0 };
    const items = parseFeed(await res.text());
    if (!items.length) return { ok: false, why: "parsed 0 items — not a feed?", ms: Date.now() - t0 };
    return { ok: true, items, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, why: e.name === "TimeoutError" ? "timed out" : e.message, ms: Date.now() - t0 };
  }
}

/**
 * Filter one source's items, strongest evidence first:
 *   sectionBlock (the URL's own section)
 *   → categoryBlock (the publisher's own tag)
 *   → block (title keywords)
 *   → tier 2 must then clear categoryAllow OR require
 *
 * `seen` carries dedup state across sources within an edition and is mutated.
 */
export function filterItems(items, src, lang, match, seen) {
  const drops = { dup: 0, section: 0, category: 0, blocked: 0, noSignal: 0, noSummary: 0 };
  const dropLog = [];
  const kept = [];

  for (const item of items) {
    const nt = normTitle(item.title), cu = canonUrl(item.link);
    if ((nt && seen.title.has(nt)) || (cu && seen.url.has(cu))) {
      drops.dup++; dropLog.push([item.title, "duplicate of an earlier source"]); continue;
    }

    const sec = section(item.link);
    if (sec && (src.sectionBlock || []).includes(sec)) {
      drops.section++; dropLog.push([item.title, `section: ${sec}`]); continue;
    }

    const badCat = catMatch(item, lang.categoryBlock);
    if (badCat) { drops.category++; dropLog.push([item.title, `category: ${badCat}`]); continue; }

    const hit = blockedBy(item, lang, match);
    if (hit) { drops.blocked++; dropLog.push([item.title, `blocked: ${hit}`]); continue; }

    if (src.tier === 2) {
      // A publisher's own category is stronger evidence than a title keyword,
      // so it satisfies the gate on its own.
      const goodCat = catMatch(item, lang.categoryAllow);
      const signal = goodCat ? `cat:${goodCat}` : match(item.title, lang.require);
      if (!signal) { drops.noSignal++; dropLog.push([item.title, "no positive signal"]); continue; }
      item.signal = signal;
    }

    if (lang.requireSummary && emptyish(item.summary)) {
      drops.noSummary++; dropLog.push([item.title, "no usable summary"]); continue;
    }

    if (nt) seen.title.add(nt);
    if (cu) seen.url.add(cu);
    item.source = src.name;
    item.sourceId = src.id;
    item.topic = src.topic;
    item.tier = src.tier;
    kept.push(item);
  }

  return { kept, drops, dropLog };
}

export const newSeen = () => ({ title: new Set(), url: new Set() });
