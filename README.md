# feekah

A finite, ad-free coffee break of good news — in Norwegian, Swedish and English.
No politics, no advertising, and **no AI at runtime**: a visit costs one cached
fetch of a static file, and nothing else.

The reading is meant to *end*. A sun arc fills as you scroll and finishes at
"det var dagens fika" — there is no infinite scroll, by design.

## How it works

```
feeds.json ──► build-edition.mjs ──► public/editions/{no,sv,en}.json ──► the app
                     │
                     └── lib/feeds.mjs (shared with validate-feeds.mjs)
```

Feeds are fetched **once per deploy**, in CI — never in the reader's browser.
There is no API key, no server, and no per-user cost. Everyone who opens feekah
that morning reads the same paper.

`lib/feeds.mjs` holds the whole pipeline and is imported by both the builder and
the validator, so what you inspect is exactly what ships.

### Filtering

Sources are split into two tiers, and evidence is weighed strongest-first:

1. **`sectionBlock`** — the URL's own section (`aftenposten.no/meninger/…`)
2. **`categoryBlock`** — the publisher's own tag (`Politi og kriminalitet`)
3. **`block`** — title keywords, with `allow` phrases to rescue false hits
   ("heart attack" survives; "terror attack" doesn't)
4. **Tier 2 only** — must then clear `categoryAllow` *or* `require`

**Tier 1** sources are pre-filtered outlets (Positive News, forskning.no); the
blocklist is just a safety net. **Tier 2** sources are general news wires, where
the logic inverts: an item must earn its way in rather than merely avoid offence.

Publisher metadata beats keyword guessing every time — see `_howItWorks` in
[feeds.json](feeds.json), which documents why, with the evidence that proved it.

## Commands

```bash
npm install
npm run editions        # build the editions (needed once before dev)
npm run dev             # local dev server
npm run validate        # check every feed, report what survives filtering
npm run build           # editions + production build
```

Useful validator flags:

```bash
node validate-feeds.mjs no             # one language
node validate-feeds.mjs --show-dropped # every dropped item, and why
node validate-feeds.mjs --dump vg      # raw XML for one source
node validate-feeds.mjs --write        # save status back to feeds.json
```

## Deployment

Vercel builds from this repo. `npm run build` runs `build-edition.mjs` first, so
every deploy fetches fresh feeds. A GitHub Action
([daily-edition.yml](.github/workflows/daily-edition.yml)) pings a Vercel
**Deploy Hook** each morning to trigger that rebuild — add the hook URL as a
repository secret named `VERCEL_DEPLOY_HOOK`.

Requires Node 22+.

## Adding a source

Add it to the right language in [feeds.json](feeds.json), then run
`npm run validate` and read what actually survives. Two things worth knowing
before you guess at a URL:

- **Labrador CMS sites** (forskning.no, sciencenorway.no, ung.forskning.no)
  serve RSS from a query parameter — `?lab_viewport=rss` — not a path. Every
  `/rss.xml` and `/feed` guess returns 404 or HTML.
- Keep Norwegian and Swedish blocklist entries **four characters or longer**.
  Those languages compound their nouns, so matching is substring-based, and a
  short stem collides badly: bare `val` in Swedish also matches *val* (whale),
  *valp*, *valross* and *kvalitet*.

## Licence and content

feekah displays the headline and the summary that publishers syndicate in their
own feeds, attributes the source, and links out to the original article. It does
not scrape article bodies and does not translate — translation would create a
derivative work, which is a different legal question entirely.
