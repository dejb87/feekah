import React, { useState, useEffect, useCallback } from "react";
import JOKES from "./jokes.json";

/* ------------------------------------------------------------------
   feekah — a finite, ad-free coffee break of good news, ending on a laugh.
   Palette: Nordic winter daylight. Type: Bricolage / Newsreader / DM Mono.
------------------------------------------------------------------- */

const C = {
  paper: "#EDF1F2",
  card: "#FBFCFC",
  ink: "#16302C",
  soft: "#5A6E6A",
  amber: "#E8A33D",
  moss: "#5C7F62",
  sky: "#C8DCE4",
};

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=DM+Mono:wght@400;500&display=swap";

const DISPLAY = "'Bricolage Grotesque', system-ui, sans-serif";
const BODY = "'Newsreader', Georgia, serif";
const MONO = "'DM Mono', ui-monospace, monospace";

const LANGS = [
  { id: "no", short: "NO", name: "norsk", region: "Norge (NRK, Aftenposten, VG, lokalaviser)" },
  { id: "sv", short: "SV", name: "svenska", region: "Sverige (SVT, DN, SVD, lokaltidningar)" },
  { id: "en", short: "EN", name: "English", region: "UK, US, Ireland, Canada, Australia" },
];

const TOPICS = [
  { id: "family", no: "Familie & hverdag", sv: "Familj & vardag", en: "Family & everyday" },
  { id: "health", no: "Helse", sv: "Hälsa", en: "Health" },
  { id: "nature", no: "Natur & dyr", sv: "Natur & djur", en: "Nature & animals" },
  { id: "science", no: "Forskning", sv: "Forskning", en: "Science" },
  { id: "kindness", no: "Nærmiljø", sv: "Närsamhälle", en: "Community" },
  { id: "culture", no: "Kultur & sport", sv: "Kultur & sport", en: "Culture & sport" },
  { id: "humor", no: "Humor & rare saker", sv: "Humor & udda nyheter", en: "Humour & oddities" },
];

const T = {
  no: {
    eyebrow: "DAGENS PAUSE",
    tagline: "Gode nyheter til kaffekoppen. Ingen politikk, ingen reklame.",
    pick: "Velg det du vil lese om",
    load: "Hent dagens nyheter",
    reload: "Hent på nytt",
    loading: "Leter etter lyspunkter …",
    more: "Les mer",
    end: "Det var dagens fika.",
    endSub: "Ta med deg noe godt inn i dagen.",
    emptyTopics: "Velg minst ett tema for å komme i gang.",
    emptyTopic: "Ingen saker i denne utgaven",
    alsoShow: "Vis også saker på",
    errTitle: "Fikk ikke tak i nyhetene",
    errBody: "Nettet svarte ikke. Prøv igjen om et øyeblikk.",
    retry: "Prøv igjen",
    source: "Kilde",
    open: "Åpne saken",
    noResults: "Fant ingenting nytt akkurat nå. Prøv flere temaer.",
    jokeLabel: "DAGENS PAPPAVITS",
    jokeReveal: "Vis svaret",
    jokeNext: "En til",
  },
  sv: {
    eyebrow: "DAGENS FIKA",
    tagline: "Goda nyheter till kaffekoppen. Ingen politik, ingen reklam.",
    pick: "Välj vad du vill läsa om",
    load: "Hämta dagens nyheter",
    reload: "Hämta på nytt",
    loading: "Letar efter ljuspunkter …",
    more: "Läs mer",
    end: "Det var dagens fika.",
    endSub: "Ta med dig något gott in i dagen.",
    emptyTopics: "Välj minst ett ämne för att börja.",
    emptyTopic: "Inga artiklar i dagens utgåva",
    alsoShow: "Visa även artiklar på",
    errTitle: "Kunde inte hämta nyheterna",
    errBody: "Nätet svarade inte. Försök igen om en stund.",
    retry: "Försök igen",
    source: "Källa",
    open: "Öppna artikeln",
    noResults: "Hittade inget nytt just nu. Prova fler ämnen.",
    jokeLabel: "DAGENS PAPPASKÄMT",
    jokeReveal: "Visa svaret",
    jokeNext: "En till",
  },
  en: {
    eyebrow: "TODAY'S BREAK",
    tagline: "Good news with your coffee. No politics, no ads.",
    pick: "Pick what you want to read about",
    load: "Get today's news",
    reload: "Get new stories",
    loading: "Looking for bright spots …",
    more: "Read more",
    end: "That's today's fika.",
    endSub: "Take something good with you into the day.",
    emptyTopics: "Pick at least one topic to start.",
    emptyTopic: "Nothing in today's edition",
    alsoShow: "Also show stories in",
    errTitle: "Couldn't get the news",
    errBody: "The network didn't answer. Try again in a moment.",
    retry: "Try again",
    source: "Source",
    open: "Open the article",
    noResults: "Nothing new turned up. Try adding topics.",
    jokeLabel: "TODAY'S DAD JOKE",
    jokeReveal: "Show the answer",
    jokeNext: "One more",
  },
};

/* --------------------------- Edition ---------------------------
   feekah is AI-free at runtime. Stories come from a static edition file
   rebuilt once a day by build-edition.mjs in CI, so a visit costs one
   cached fetch — no API key, no per-user cost, no tokens, and everyone
   opens the same paper that morning.
---------------------------------------------------------------- */

async function fetchEdition(lang) {
  // Relative so it works from a subpath (GitHub Pages) as well as a root domain.
  const res = await fetch(`./editions/${lang}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!data || !Array.isArray(data.stories)) throw new Error("malformed edition");
  return data;
}

/** Same joke all day, a different one tomorrow — no randomness between reloads. */
function jokeOffsetForToday(count) {
  if (!count) return 0;
  const d = new Date();
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return days % count;
}

/* -------------------------- Daylight -------------------------- */

function DaylightMeter({ progress }) {
  const w = 400, h = 130;
  const t = Math.min(1, Math.max(0, progress));

  const groundY = h - 30;
  const arcHeight = 72;
  const x = 22 + t * (w - 44);
  const y = groundY - Math.sin(t * Math.PI) * arcHeight;

  // sky blends dawn → day → dusk as the reader moves through the edition
  const dawnOpacity = Math.max(0, 1 - t * 2);
  const duskOpacity = Math.max(0, t * 2 - 1);

  return (
    <div className="relative w-full">
      <style>{`
        @keyframes fika-glow   { 0%,100% { r: 15; opacity: .16; } 50% { r: 19; opacity: .26; } }
        @keyframes fika-rays   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fika-drift  { from { transform: translateX(-5px); } to { transform: translateX(5px); } }
        .fika-glow  { animation: fika-glow 4.5s ease-in-out infinite; }
        .fika-rays  { animation: fika-rays 120s linear infinite; transform-origin: center; }
        .fika-cloud { animation: fika-drift 11s ease-in-out infinite alternate; }
        .fika-sun   { transition: transform .5s cubic-bezier(.22,.61,.36,1); }
      `}</style>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" aria-hidden="true">
        <defs>
          <linearGradient id="fika-sky-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.sky} />
            <stop offset="100%" stopColor={C.paper} />
          </linearGradient>
          <linearGradient id="fika-sky-dawn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F6DAB8" />
            <stop offset="100%" stopColor={C.paper} />
          </linearGradient>
          <linearGradient id="fika-sky-dusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EFAE79" />
            <stop offset="100%" stopColor="#E7CDB2" />
          </linearGradient>
          <radialGradient id="fika-sun-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFE7BD" />
            <stop offset="60%" stopColor={C.amber} />
            <stop offset="100%" stopColor={C.amber} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={w} height={h} fill="url(#fika-sky-day)" />
        <rect width={w} height={h} fill="url(#fika-sky-dawn)" opacity={dawnOpacity} />
        <rect width={w} height={h} fill="url(#fika-sky-dusk)" opacity={duskOpacity} />

        {/* sun sits behind the hills, so it rises out of and sets into them */}
        <g className="fika-sun" style={{ transform: `translate(${x}px, ${y}px)` }}>
          <circle className="fika-glow" r="16" fill={C.amber} opacity="0.18" />
          <g className="fika-rays" stroke={C.amber} strokeWidth="1.4" strokeLinecap="round" opacity="0.45">
            {[0, 45, 90, 135].map((deg) => (
              <line key={deg} x1="0" y1="-13" x2="0" y2="-17" transform={`rotate(${deg})`} />
            ))}
          </g>
          <circle r="8" fill="url(#fika-sun-core)" />
          <circle r="5.5" fill={C.amber} />
        </g>

        <g opacity="0.5" className="fika-cloud">
          <ellipse cx={w * 0.2} cy={h * 0.26} rx="24" ry="6" fill={C.paper} />
          <ellipse cx={w * 0.18} cy={h * 0.22} rx="15" ry="5" fill={C.paper} />
        </g>
        <g opacity="0.4" className="fika-cloud" style={{ animationDelay: "-5s" }}>
          <ellipse cx={w * 0.75} cy={h * 0.18} rx="19" ry="5" fill={C.paper} />
        </g>

        {/* rolling hills, two layers for depth */}
        <path
          d={`M0,${h} L0,${h - 34} Q ${w * 0.22},${h - 60} ${w * 0.42},${h - 40}
              T ${w * 0.78},${h - 46} Q ${w * 0.9},${h - 50} ${w},${h - 36} L ${w},${h} Z`}
          fill={C.moss} opacity="0.3"
        />
        <path
          d={`M0,${h} L0,${h - 14} Q ${w * 0.18},${h - 40} ${w * 0.38},${h - 20}
              T ${w * 0.7},${h - 24} Q ${w * 0.88},${h - 30} ${w},${h - 12} L ${w},${h} Z`}
          fill={C.ink} opacity="0.92"
        />
      </svg>
    </div>
  );
}

/* ---------------------------- App ---------------------------- */

export default function Feekah() {
  const [lang, setLang] = useState("no");
  const [topics, setTopics] = useState(["family", "health", "nature"]);
  const [edition, setEdition] = useState(null);
  const [extraLangs, setExtraLangs] = useState([]);   // other editions to borrow from
  const [extraEditions, setExtraEditions] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [progress, setProgress] = useState(0);
  const [jokeIdx, setJokeIdx] = useState(0);
  const [jokeShown, setJokeShown] = useState(false);

  const t = T[lang];
  const langMeta = LANGS.find((l) => l.id === lang);

  /* fonts */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  /* saved preferences — window.storage was an artifact-only API; outside the
     artifact sandbox localStorage is the equivalent, and stays on the device. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("feekah:prefs");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.lang) setLang(p.lang);
        if (Array.isArray(p.topics) && p.topics.length) setTopics(p.topics);
        if (Array.isArray(p.extraLangs)) setExtraLangs(p.extraLangs);
      }
    } catch (e) { /* first run, or storage disabled in this browser */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("feekah:prefs", JSON.stringify({ lang, topics, extraLangs })); }
    catch (e) { /* prefs just won't persist */ }
  }, [lang, topics, extraLangs]);

  /* ---- Derived state ----
     These must be declared BEFORE any effect whose dependency array reads them.
     `stories` used to be useState([]) at the top of the component; turning it
     into derived state computed after the merge left the scroll effect below
     reaching backwards into the temporal dead zone, which threw
     "Cannot access before initialization" and rendered a blank page. */

  // Switching the interface to a language you'd also picked as supplementary
  // would otherwise merge an edition with itself.
  const borrowed = extraLangs.filter((l) => l !== lang);
  const pool = [
    ...(edition?.stories || []),
    ...borrowed.flatMap((l) => extraEditions[l]?.stories || []),
  ];
  const cap = edition?.maxPerTopic ?? 8;
  const seenPerTopic = {};
  const available = pool.filter((s) => {
    const n = (seenPerTopic[s.topic] || 0) + 1;
    seenPerTopic[s.topic] = n;
    return n <= cap;
  });

  const stories = available.filter((s) => topics.includes(s.topic));

  // Counts must describe what's actually reachable, including borrowed stories,
  // or a chip reads 0 while holding items.
  const counts = available.reduce((acc, s) => {
    acc[s.topic] = (acc[s.topic] || 0) + 1;
    return acc;
  }, {});

  /* scroll → daylight */
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 40 ? el.scrollTop / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [stories.length]);

  const load = useCallback(async () => {
    if (!topics.length) return;
    setStatus("loading");
    try {
      const ed = await fetchEdition(lang);
      // The edition holds every topic; the chips filter it on the device, so
      // switching topics is instant and costs no network at all.
      setEdition(ed);
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [topics.length, lang]);

  /* Reload whenever the language changes — each language is its own edition. */
  useEffect(() => { load(); }, [load]);

  /* Jokes are a static file. Start from the date so the joke is stable all day
     but different tomorrow, then step through the list on "one more". */
  const jokes = JOKES[lang] || [];
  useEffect(() => {
    setJokeIdx(jokeOffsetForToday((JOKES[lang] || []).length));
    setJokeShown(false);
  }, [lang]);

  const nextJoke = () => {
    setJokeIdx((i) => (jokes.length ? (i + 1) % jokes.length : 0));
    setJokeShown(false);
  };

  /* Supplementary editions are fetched only once someone asks for one, so the
     common case stays a single file. */
  useEffect(() => {
    const missing = extraLangs.filter((l) => !extraEditions[l]);
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      for (const l of missing) {
        try {
          const ed = await fetchEdition(l);
          if (!cancelled) setExtraEditions((prev) => ({ ...prev, [l]: ed }));
        } catch (e) {
          // A missing supplement must not break the paper you came for.
          console.error(`supplementary edition ${l} failed`, e);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [extraLangs, extraEditions]);

  /* Home edition first, then anything borrowed, then the per-topic cap applied
     across the merged set. That fills a topic the home edition has nothing for
     (Norwegian has no nature sources) without padding one it already fills —
     the toggle is there to close gaps, not to double the length of the read. */
  const toggleExtraLang = (id) =>
    setExtraLangs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleTopic = (id) =>
    setTopics((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const today = new Date().toLocaleDateString(
    lang === "no" ? "nb-NO" : lang === "sv" ? "sv-SE" : "en-GB",
    { weekday: "long", day: "numeric", month: "long" }
  );

  return (
    <div style={{ background: C.paper, color: C.ink, minHeight: "100vh", fontFamily: BODY }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
        .dl-focus:focus-visible { outline: 2px solid ${C.ink}; outline-offset: 3px; }
        .dl-card { transition: box-shadow .25s ease, transform .25s ease; }
        .dl-card:hover { box-shadow: 0 6px 24px rgba(22,48,44,.10); }
      `}</style>

      <div className="mx-auto w-full max-w-2xl px-5 pb-24">

        {/* ---------- Header ---------- */}
        <header className="pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 style={{ fontFamily: DISPLAY, fontSize: 46, lineHeight: 1, letterSpacing: "-.025em" }}>
                <span style={{ fontWeight: 800, borderBottom: `3px solid ${C.amber}`, paddingBottom: 2 }}>fee</span>
                <span style={{ fontWeight: 400, color: C.moss }}>kah</span>
              </h1>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".06em", color: C.soft, marginTop: 10 }}>
                /ˈfiːka/ · {t.eyebrow}
              </div>
              <p style={{ fontSize: 16, color: C.soft, marginTop: 8, maxWidth: 340 }}>{t.tagline}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className="dl-focus px-2 py-1 rounded-full"
                  style={{
                    fontFamily: MONO, fontSize: 11,
                    background: lang === l.id ? C.ink : "transparent",
                    color: lang === l.id ? C.paper : C.soft,
                    border: `1px solid ${lang === l.id ? C.ink : C.sky}`,
                  }}
                >{l.short}</button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <DaylightMeter progress={progress} />
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.soft, marginTop: 2 }}>{today}</div>
          </div>
        </header>

        {/* ---------- Topics ---------- */}
        <section className="mt-7">
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", color: C.soft }}>
            {t.pick.toUpperCase()}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {TOPICS.map((tp) => {
              const on = topics.includes(tp.id);
              // Topic is assigned per source, so an edition can genuinely hold
              // nothing for a chip — Swedish has no family sources at all. A
              // chip that leads to a blank page is worse than one that shows
              // its own emptiness, so say the count and disable it.
              const n = counts[tp.id] || 0;
              const empty = edition && n === 0;
              return (
                <button
                  key={tp.id}
                  onClick={() => toggleTopic(tp.id)}
                  aria-pressed={on}
                  disabled={empty}
                  title={empty ? t.emptyTopic : undefined}
                  className="dl-focus px-3 py-1.5 rounded-full"
                  style={{
                    fontFamily: DISPLAY, fontWeight: 500, fontSize: 14,
                    background: on && !empty ? C.sky : "transparent",
                    color: empty ? "#B3C2C1" : on ? C.ink : C.soft,
                    border: `1px solid ${empty ? "#E2E9EA" : on ? C.sky : "#D6E0E2"}`,
                    cursor: empty ? "not-allowed" : "pointer",
                  }}
                >
                  {tp[lang]}
                  {edition && (
                    <span style={{ fontFamily: MONO, fontSize: 10, opacity: 0.65, marginLeft: 6 }}>{n}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cross-language supplement. Deliberately separate from the NO/SV/EN
              buttons above: those set the interface language, this decides how
              wide to cast the net. Collapsing the two would force a reader to
              choose between a Norwegian interface and having enough to read. */}
          {edition && (
            <div className="flex items-center flex-wrap gap-2 mt-4">
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".06em", color: C.soft }}>
                {t.alsoShow}
              </span>
              {LANGS.filter((l) => l.id !== lang).map((l) => {
                const on = borrowed.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => toggleExtraLang(l.id)}
                    aria-pressed={on}
                    className="dl-focus px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: MONO, fontSize: 11,
                      background: on ? C.moss : "transparent",
                      color: on ? C.paper : C.soft,
                      border: `1px solid ${on ? C.moss : "#D6E0E2"}`,
                    }}
                  >
                    {l.short}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={load}
            disabled={status === "loading" || !topics.length}
            className="dl-focus mt-4 w-full rounded-2xl py-3"
            style={{
              fontFamily: DISPLAY, fontWeight: 700, fontSize: 16,
              background: topics.length ? C.ink : "#C9D4D3",
              color: C.paper, opacity: status === "loading" ? 0.6 : 1,
            }}
          >
            {status === "loading" ? t.loading : stories.length ? t.reload : t.load}
          </button>
          {!topics.length && (
            <p style={{ fontSize: 14, color: C.soft, marginTop: 8 }}>{t.emptyTopics}</p>
          )}
        </section>

        {/* ---------- Stories ---------- */}
        <main className="mt-8 space-y-4">
          {status === "loading" &&
            [0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: C.card }}>
                <div className="h-3 w-24 rounded" style={{ background: C.sky }} />
                <div className="h-5 w-4/5 rounded mt-4" style={{ background: "#E4EBEC" }} />
                <div className="h-4 w-full rounded mt-3" style={{ background: "#EDF1F2" }} />
                <div className="h-4 w-2/3 rounded mt-2" style={{ background: "#EDF1F2" }} />
              </div>
            ))}

          {status === "error" && (
            <div className="rounded-2xl p-5" style={{ background: C.card, borderLeft: `3px solid ${C.amber}` }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>{t.errTitle}</div>
              <p style={{ color: C.soft, marginTop: 6 }}>{t.errBody}</p>
              <button onClick={load} className="dl-focus mt-3 px-4 py-2 rounded-full"
                style={{ fontFamily: DISPLAY, fontWeight: 600, background: C.ink, color: C.paper, fontSize: 14 }}>
                {t.retry}
              </button>
            </div>
          )}

          {status === "done" && stories.length === 0 && (
            <p style={{ color: C.soft }}>{t.noResults}</p>
          )}

          {stories.map((s, i) => {
            /* Some outlets syndicate no summary at all — NRK Viten blanks it on
               most items. With no AI to write one, those become a deliberately
               compact card rather than a full card with a hole in it. NRK writes
               its titles as teasers, so they carry the story unaided. */
            const brief = !s.summary;
            return (
              <article
                key={s.id}
                className={`dl-card rounded-2xl ${brief ? "p-4" : "p-5"}`}
                style={{ background: C.card }}
              >
                <div className="flex items-center gap-2" style={{ fontFamily: MONO, fontSize: 11, color: C.moss }}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ color: "#C3D0D2" }}>/</span>
                  <span style={{ letterSpacing: ".08em" }}>{(s.topic || "").toUpperCase()}</span>
                  {/* Borrowed from another edition, and untranslated — say so,
                      so a reader isn't ambushed by a language they didn't pick. */}
                  {s.lang && s.lang !== lang && (
                    <span
                      className="px-1.5 rounded-full"
                      style={{ background: C.sky, color: C.ink, letterSpacing: ".06em" }}
                    >
                      {(LANGS.find((l) => l.id === s.lang) || {}).short}
                    </span>
                  )}
                </div>

                <h2
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: brief ? 19 : 22,
                    lineHeight: 1.15,
                    marginTop: brief ? 8 : 10,
                  }}
                >
                  {s.headline}
                </h2>

                {!brief && (
                  <p style={{ fontSize: 17, lineHeight: 1.55, marginTop: 10, color: "#2B4340" }}>
                    {s.summary}
                  </p>
                )}

                <div className={`flex items-center flex-wrap gap-x-3 gap-y-2 ${brief ? "mt-3" : "mt-4"}`}>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dl-focus px-3.5 py-1.5 rounded-full"
                      style={{
                        fontFamily: DISPLAY, fontWeight: 600, fontSize: 14,
                        background: C.amber, color: "#3A2A08", textDecoration: "none",
                      }}
                    >
                      {t.more} ↗
                    </a>
                  )}
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.soft }}>
                    {t.source}: {s.source || "web"}
                  </span>
                  {s.date && (
                    <span style={{ fontFamily: MONO, fontSize: 11, color: "#9AAEAD" }}>{s.date}</span>
                  )}
                </div>
              </article>
            );
          })}

          {status === "done" && stories.length > 0 && (
            <>
              {jokes.length > 0 && (
              <section className="rounded-2xl p-5 mt-8" style={{ background: C.amber }}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: "#5B4110" }}>
                  {t.jokeLabel}
                </div>
                {(
                  <>
                    <p style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 21, lineHeight: 1.2, marginTop: 10, color: "#2E2205" }}>
                      {jokes[jokeIdx].setup}
                    </p>
                    {jokeShown ? (
                      <p style={{ fontSize: 19, lineHeight: 1.4, marginTop: 10, color: "#3A2A08" }}>
                        {jokes[jokeIdx].punchline}
                      </p>
                    ) : (
                      <button onClick={() => setJokeShown(true)} className="dl-focus mt-3 px-3.5 py-1.5 rounded-full"
                        style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14, background: "#2E2205", color: C.amber }}>
                        {t.jokeReveal}
                      </button>
                    )}
                    {jokeShown && (
                      <button onClick={nextJoke} className="dl-focus mt-4 px-3.5 py-1.5 rounded-full"
                        style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 14, background: "transparent", color: "#3A2A08", border: "1px solid #B9821F" }}>
                        {t.jokeNext}
                      </button>
                    )}
                  </>
                )}
              </section>
              )}

              <div className="text-center pt-10 pb-4">
                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20 }}>{t.end}</div>
                <p style={{ color: C.soft, marginTop: 6, fontSize: 15 }}>{t.endSub}</p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
