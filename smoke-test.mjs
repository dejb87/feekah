#!/usr/bin/env node
/**
 * Renders the built bundle in jsdom and asserts the page actually has content.
 *
 *   npm run build && npm run smoke
 *
 * This exists because a blank white page once shipped to production while every
 * other check passed: the editions were valid, the HTML shell served fine, and
 * the build succeeded — but the component threw at render time (a `const` read
 * by an effect's dependency array before it was initialised) and React mounted
 * nothing. Verifying data and verifying that the app RENDERS are different
 * things, and only the second one catches that.
 */

import { JSDOM } from "jsdom";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const bundle = readdirSync("dist/assets").find((f) => f.endsWith(".js"));
if (!bundle) {
  console.error("No JS bundle in dist/assets — run `npm run build` first.");
  process.exit(1);
}

for (const l of ["no", "sv", "en"]) {
  if (!existsSync(`public/editions/${l}.json`)) {
    console.error(`Missing public/editions/${l}.json — run \`npm run editions\` first.`);
    process.exit(1);
  }
}

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  url: "https://feekah.vercel.app/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const w = dom.window;
w.scrollTo = () => {};
w.matchMedia = w.matchMedia || (() => ({
  matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
}));

// Serve the locally built editions in place of the network.
w.fetch = async (u) => {
  const lang = String(u).match(/(no|sv|en)\.json/)?.[1];
  if (!lang) return { ok: false, status: 404 };
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(`public/editions/${lang}.json`, "utf8")) };
};

const errors = [];
w.addEventListener("error", (e) => errors.push(e.error?.stack || e.message));
const realConsole = console;
w.console = { ...console, error: (...a) => errors.push(a.map(String).join(" ")) };

try {
  w.eval(readFileSync(`dist/assets/${bundle}`, "utf8"));
} catch (e) {
  errors.push("bundle threw on evaluation: " + (e.stack || e.message));
}

await new Promise((r) => setTimeout(r, 2000));

const root = w.document.getElementById("root");
const html = root.innerHTML;
const text = root.textContent || "";
const fail = [];

if (errors.length) fail.push(`runtime error: ${errors[0].slice(0, 300)}`);
if (html.length < 500) fail.push(`rendered almost nothing (${html.length} chars) — blank page`);
if (!text.includes("feekah")) fail.push("wordmark missing from render");
// The edition loads asynchronously; if no story headline appears, the data path
// is broken even though the shell rendered.
if (!w.document.querySelector("article")) fail.push("no <article> cards rendered — stories never reached the page");

if (fail.length) {
  realConsole.error("\nSMOKE TEST FAILED");
  fail.forEach((f) => realConsole.error("  ✗ " + f));
  process.exit(1);
}

realConsole.log(
  `smoke test passed — ${w.document.querySelectorAll("article").length} cards, ${html.length} chars rendered`
);
