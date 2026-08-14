#!/usr/bin/env node
/**
 * Checks every feed in feeds.json: is it reachable, does it parse, and what
 * survives the two-tier filter. See _howItWorks in feeds.json for the model.
 *
 *   node validate-feeds.mjs                  check everything
 *   node validate-feeds.mjs no               check one language
 *   node validate-feeds.mjs --write          update "status" in feeds.json
 *   node validate-feeds.mjs --dump vg        dump raw XML for one source's
 *                                            first 3 items
 *   node validate-feeds.mjs --show-dropped   list every dropped item and the
 *                                            exact reason it was dropped
 *
 * Filtering logic lives in lib/feeds.mjs, shared with build-edition.mjs, so
 * what this reports is exactly what the app will serve.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fetchSource, filterItems, matcher, newSeen, parseFeed, emptyish } from "./lib/feeds.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const showDropped = args.includes("--show-dropped");
const dumpIdx = args.indexOf("--dump");
const dumpTarget = dumpIdx !== -1 ? args[dumpIdx + 1] : null;
const onlyLang = args.find((a) => !a.startsWith("--") && a !== dumpTarget);

const cfg = JSON.parse(await readFile(new URL("./feeds.json", import.meta.url), "utf8"));

const g = (s) => `\x1b[32m${s}\x1b[0m`;
const r = (s) => `\x1b[31m${s}\x1b[0m`;
const y = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

if (dumpTarget) {
  let found = null;
  for (const L of Object.values(cfg)) {
    if (!L || !L.sources) continue;
    found = L.sources.find((s) => s.id === dumpTarget);
    if (found) break;
  }
  if (!found) {
    console.log(r(`No source with id "${dumpTarget}". Check the "id" field in feeds.json.`));
    process.exit(1);
  }
  console.log(`\nFetching ${found.name}  ${dim(found.url)}\n`);
  const xml = await (await fetch(found.url, { headers: { "User-Agent": "feekah/1.0" } })).text();
  const items = parseFeed(xml);
  if (!items.length) {
    console.log(r("No items parsed — raw response follows:\n"));
    console.log(xml.slice(0, 2000));
  } else {
    console.log(`${items.length} items found. Raw XML for the first 3, so you can see real tag names:\n`);
    items.slice(0, 3).forEach((it, i) => {
      console.log(`${dim("─".repeat(60))}\n#${i + 1}: ${it.title}`);
      console.log(`categories: ${it.categories.length ? it.categories.join(", ") : "(none)"}\n`);
      console.log(it.raw.slice(0, 1500), "\n");
    });
  }
  process.exit(0);
}

let alive = 0, dead = 0;
const editions = {};

for (const [lang, L] of Object.entries(cfg)) {
  if (lang.startsWith("_") || !L.sources) continue;
  if (onlyLang && lang !== onlyLang) continue;

  const match = matcher(L.matchMode || "substring");
  const seen = newSeen();  // dedup is per edition — a NO reader never sees EN items
  const edition = [];

  console.log(`\n${"─".repeat(64)}\n  ${L.label}  (${L.sources.length} sources, matching: ${L.matchMode || "substring"})\n${"─".repeat(64)}`);

  for (const src of L.sources) {
    const res = await fetchSource(src);
    if (!res.ok) {
      dead++;
      src.status = "dead";
      console.log(`\n${r("✗")} ${src.name}  ${dim(src.url)}\n   ${r(res.why)}`);
      continue;
    }
    alive++;
    src.status = "ok";

    const { kept, drops, dropLog } = filterItems(res.items, src, L, match, seen);
    edition.push(...kept);

    const thin = kept.filter((i) => emptyish(i.summary)).length;
    const health = kept.length === 0 ? y("nothing survived") : g(`${kept.length} usable`);
    console.log(`\n${g("✓")} ${src.name}  ${dim(`tier ${src.tier} · ${src.url}`)}`);
    console.log(
      `   ${health} of ${res.items.length} · ${drops.dup} dup · ${drops.section} section · ` +
      `${drops.category} cat · ${drops.blocked} blocked` +
      (src.tier === 2 ? ` · ${drops.noSignal} no signal` : "") +
      (L.requireSummary ? ` · ${drops.noSummary} no summary` : "") +
      ` · ${thin} thin · ${res.ms}ms`
    );
    kept.slice(0, 2).forEach((i) =>
      console.log(`   ${dim("·")} ${(i.title || "").slice(0, 72)}${i.signal ? dim(`  [+${i.signal}]`) : ""}`)
    );
    if (showDropped) dropLog.forEach(([t, why]) => console.log(`   ${dim("✕")} ${dim(`${(t || "").slice(0, 60)}  [${why}]`)}`));
  }

  editions[lang] = edition;
  const t1 = edition.filter((i) => i.tier === 1).length;
  const thin = edition.filter((i) => emptyish(i.summary)).length;
  console.log(`\n  ${L.label} edition: ${g(edition.length + " items")} ${dim(`(${t1} tier 1, ${edition.length - t1} tier 2, ${thin} title-only)`)}`);
  if (edition.length < 8) console.log(`  ${y("⚠ thin edition — under 8 items is not a day's reading")}`);
}

console.log(`\n${"─".repeat(64)}`);
console.log(`  feeds: ${g(alive + " live")} · ${dead ? r(dead + " dead") : "0 dead"}`);
console.log(`  editions: ${Object.entries(editions).map(([l, e]) => `${l} ${e.length}`).join(" · ")}`);
console.log(`${"─".repeat(64)}\n`);

if (write) {
  await writeFile(new URL("./feeds.json", import.meta.url), JSON.stringify(cfg, null, 2) + "\n");
  console.log("Updated status in feeds.json\n");
}
