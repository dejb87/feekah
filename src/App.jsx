import React, { useState, useEffect, useCallback } from "react";
import JOKES from "./jokes.json";
import FACTS from "./facts.json";

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

/* Masthead details for the footer. CONTACT renders only when set, so the site
   never ships a placeholder address — an unreachable contact is worse than
   none, both for readers and for the URL-categorisation reviewers who look for
   a real human behind a new domain. */
const OWNER = "Et privat prosjekt fra Norge";
const CONTACT = "finnswede@rngd.no";

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
  // Not "humour": no reliable warm-funny feed exists in any of the three
  // languages, so the chip promised a laugh the sources couldn't deliver.
  // Comedy lives in the dad-joke card; this is the odd and the delightful.
  { id: "wonder", no: "Rare saker", sv: "Udda saker", en: "Odd & curious" },
];

const T = {
  no: {
    eyebrow: "DAGENS PAUSE",
    tagline: "Gode nyheter til kaffekoppen. Ingen politikk, ingen reklame.",
    pick: "Velg det du vil lese om",
    loading: "Leter etter lyspunkter …",
    more: "Les mer",
    end: "Det var dagens fika.",
    endSub: "Ta med deg noe godt inn i dagen.",
    emptyTopics: "Velg minst ett tema for å komme i gang.",
    emptyTopic: "Ingen saker i denne utgaven",
    alsoShow: "Vis også saker på",
    selectAll: "Velg alle",
    clearAll: "Fjern alle",
    newEdition: "Ny utgave er klar — hent den",
    errTitle: "Fikk ikke tak i nyhetene",
    errBody: "Nettet svarte ikke. Prøv igjen om et øyeblikk.",
    retry: "Prøv igjen",
    source: "Kilde",
    noResults: "Fant ingenting nytt akkurat nå. Prøv flere temaer.",
    jokeLabel: "DAGENS PAPPAVITS",
    factLabel: "VISSTE DU AT",
    jokeReveal: "Vis svaret",
    jokeNext: "En til",
    aboutTitle: "Om feekah",
    aboutBody: "feekah samler dagens gode nyheter fra kilder som allerede skriver om det som går bra. Ingen politikk, ingen reklame, ingen sporing, og ingen uendelig scrolling — du blir ferdig, og så er dagen din. Utgaven bygges én gang i døgnet og er den samme for alle som åpner den den morgenen.",
    aboutSources: "Kilder i denne utgaven",
    aboutCredit: "Overskrifter og ingresser vises slik avisene selv publiserer dem i sine RSS-strømmer. Vi henter aldri hele artikler — trykk deg videre til avisen for å lese saken.",
    aboutContact: "Kontakt",
  },
  sv: {
    eyebrow: "DAGENS FIKA",
    tagline: "Goda nyheter till kaffekoppen. Ingen politik, ingen reklam.",
    pick: "Välj vad du vill läsa om",
    loading: "Letar efter ljuspunkter …",
    more: "Läs mer",
    end: "Det var dagens fika.",
    endSub: "Ta med dig något gott in i dagen.",
    emptyTopics: "Välj minst ett ämne för att börja.",
    emptyTopic: "Inga artiklar i dagens utgåva",
    alsoShow: "Visa även artiklar på",
    selectAll: "Välj alla",
    clearAll: "Rensa",
    newEdition: "Ny utgåva finns — hämta den",
    errTitle: "Kunde inte hämta nyheterna",
    errBody: "Nätet svarade inte. Försök igen om en stund.",
    retry: "Försök igen",
    source: "Källa",
    noResults: "Hittade inget nytt just nu. Prova fler ämnen.",
    jokeLabel: "DAGENS PAPPASKÄMT",
    factLabel: "VISSTE DU ATT",
    jokeReveal: "Visa svaret",
    jokeNext: "En till",
    aboutTitle: "Om feekah",
    aboutBody: "feekah samlar dagens goda nyheter från källor som redan skriver om det som går bra. Ingen politik, ingen reklam, ingen spårning och ingen oändlig scrollning — du blir klar, och sedan är dagen din. Utgåvan byggs en gång i dygnet och är densamma för alla som öppnar den den morgonen.",
    aboutSources: "Källor i denna utgåva",
    aboutCredit: "Rubriker och ingresser visas så som tidningarna själva publicerar dem i sina RSS-flöden. Vi hämtar aldrig hela artiklar — klicka vidare till tidningen för att läsa den.",
    aboutContact: "Kontakt",
  },
  en: {
    eyebrow: "TODAY'S BREAK",
    tagline: "Good news with your coffee. No politics, no ads.",
    pick: "Pick what you want to read about",
    loading: "Looking for bright spots …",
    more: "Read more",
    end: "That's today's fika.",
    endSub: "Take something good with you into the day.",
    emptyTopics: "Pick at least one topic to start.",
    emptyTopic: "Nothing in today's edition",
    alsoShow: "Also show stories in",
    selectAll: "Select all",
    clearAll: "Clear",
    newEdition: "A new edition is ready — load it",
    errTitle: "Couldn't get the news",
    errBody: "The network didn't answer. Try again in a moment.",
    retry: "Try again",
    source: "Source",
    noResults: "Nothing new turned up. Try adding topics.",
    jokeLabel: "TODAY'S DAD JOKE",
    factLabel: "DID YOU KNOW",
    jokeReveal: "Show the answer",
    jokeNext: "One more",
    aboutTitle: "About feekah",
    aboutBody: "feekah gathers the day's good news from outlets that already write about what is going well. No politics, no advertising, no tracking, and no infinite scroll — you finish, and then the day is yours. The edition is built once every 24 hours and is the same for everyone who opens it that morning.",
    aboutSources: "Sources in this edition",
    aboutCredit: "Headlines and summaries appear exactly as the publishers syndicate them in their own RSS feeds. We never fetch whole articles — follow the link to read the story at the source.",
    aboutContact: "Contact",
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

/** The fact stays put all day — a "did you know" reads as today's, not a slot machine. */
function offsetForToday(count) {
  if (!count) return 0;
  const d = new Date();
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return days % count;
}

/**
 * Jokes are drawn from a shuffle bag, not picked at random.
 *
 * Plain Math.random() over N jokes repeats the one you just read about 1/N of
 * the time, which is exactly what feels broken. Remembering which have already
 * come up and drawing only from the rest guarantees you see every joke once
 * before any repeats — and the bag empties and refills automatically. Persisted,
 * so a refresh continues the sequence instead of restarting it.
 */
function drawJoke(lang, count) {
  if (!count) return 0;
  const key = `feekah:jokesSeen:${lang}`;
  let seen = [];
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(raw)) seen = raw.filter((n) => Number.isInteger(n) && n < count);
  } catch { /* storage disabled — every draw is simply independent */ }

  let pool = Array.from({ length: count }, (_, i) => i).filter((i) => !seen.includes(i));
  if (!pool.length) { seen = []; pool = Array.from({ length: count }, (_, i) => i); }

  const idx = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem(key, JSON.stringify([...seen, idx])); } catch { /* ignore */ }
  return idx;
}

/* -------------------------- Daylight -------------------------- */

const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/* Smoothstep, so the collapse eases in and out of itself instead of tracking
   the scroll wheel linearly — linear interpolation reads as mechanical. */
const ease = (u) => u * u * (3 - 2 * u);

/**
 * `collapse` is a CONTINUOUS 0→1 morph, not a boolean.
 *
 * It used to be a `stuck` flag flipped at a scroll threshold, which meant two
 * entirely different drawings swapped in one frame — clouds vanishing, hills
 * changing shape, the viewBox jumping. Even with hysteresis to stop it
 * chattering, the switch itself was a visible pop. Interpolating every
 * dimension against one eased value means there is no switch to see, and
 * hysteresis becomes unnecessary: there is no state to flip.
 */
function DaylightMeter({ progress, collapse }) {
  const t = clamp01(progress);
  const c = clamp01(collapse);

  const w = 400;
  const h = lerp(130, 46, c);
  const groundY = lerp(100, 32, c);
  const arcHeight = lerp(72, 20, c);
  // The sun scales WITH the drawing. Fixed radii made the glow 12% of the full
  // sky but 47% of the collapsed band, where it swallowed the sky entirely.
  const k = lerp(1, 0.42, c);

  const x = 22 + t * (w - 44);
  const y = groundY - Math.sin(t * Math.PI) * arcHeight;

  // sky blends dawn → day → dusk as the reader moves through the edition
  const dawnOpacity = Math.max(0, 1 - t * 2);
  const duskOpacity = Math.max(0, t * 2 - 1);
  // Clouds fade out rather than unmounting — a pop is exactly what we removed.
  const cloudOpacity = 1 - c;

  /* Hills are expressed as FRACTIONS of h, so one set of paths works at every
     height. Absolute offsets (h - 60) went negative once h shrank below 60 and
     the ridge shot off the top of the viewBox. */
  const backHill =
    `M0,${h} L0,${h - 0.26 * h} Q ${w * 0.22},${h - 0.46 * h} ${w * 0.42},${h - 0.31 * h}` +
    ` T ${w * 0.78},${h - 0.35 * h} Q ${w * 0.9},${h - 0.38 * h} ${w},${h - 0.28 * h} L ${w},${h} Z`;
  const frontHill =
    `M0,${h} L0,${h - 0.11 * h} Q ${w * 0.18},${h - 0.31 * h} ${w * 0.38},${h - 0.15 * h}` +
    ` T ${w * 0.7},${h - 0.18 * h} Q ${w * 0.88},${h - 0.23 * h} ${w},${h - 0.09 * h} L ${w},${h} Z`;

  return (
    <div className="relative w-full">
      <style>{`
        /* Pulse via opacity + scale, NOT the r attribute. Animating SVG geometry
           properties like r in CSS is unsupported in Firefox, where the glow
           simply never breathes; opacity and transform animate everywhere. */
        @keyframes fika-glow  { 0%,100% { opacity: .16; transform: scale(1); }
                                50%     { opacity: .30; transform: scale(1.2); } }
        @keyframes fika-rays  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fika-drift { from { transform: translateX(-6px); } to { transform: translateX(6px); } }
        @keyframes fika-twinkle { 0%,100% { opacity: .15; } 50% { opacity: .55; } }
        .fika-glow  { animation: fika-glow 4.5s ease-in-out infinite;
                      transform-box: fill-box; transform-origin: center; }
        .fika-rays  { animation: fika-rays 120s linear infinite;
                      transform-box: fill-box; transform-origin: center; }
        .fika-cloud { animation: fika-drift 13s ease-in-out infinite alternate; }
        .fika-star  { animation: fika-twinkle 3.5s ease-in-out infinite; }
      `}</style>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full block"
        // aspect-ratio matches the viewBox exactly, so the drawing always fills
        // the full width with no letterboxing. No CSS transition on it: the
        // value is already changing smoothly with scroll, and a transition on
        // top would lag behind the finger.
        style={{ aspectRatio: `${w} / ${h}` }}
        aria-hidden="true"
      >
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

        {/* First stars, only near the end of the edition and only at full size.
            The reward for finishing, not decoration. */}
        {duskOpacity > 0.15 && cloudOpacity > 0.4 && (
          <g fill={C.paper} opacity={duskOpacity * cloudOpacity}>
            {[[62, 0.17], [128, 0.11], [196, 0.2], [268, 0.13], [330, 0.18]].map(([sx, sy], i) => (
              <circle
                key={sx}
                className="fika-star"
                cx={sx}
                cy={h * sy}
                r={1.5}
                style={{ animationDelay: `${i * 0.7}s` }}
              />
            ))}
          </g>
        )}

        {cloudOpacity > 0.02 && (
          <g opacity={cloudOpacity}>
            <g opacity="0.5" className="fika-cloud">
              <ellipse cx={w * 0.2} cy={h * 0.26} rx="24" ry="6" fill={C.paper} />
              <ellipse cx={w * 0.18} cy={h * 0.22} rx="15" ry="5" fill={C.paper} />
            </g>
            <g opacity="0.4" className="fika-cloud" style={{ animationDelay: "-6s" }}>
              <ellipse cx={w * 0.75} cy={h * 0.18} rx="19" ry="5" fill={C.paper} />
            </g>
          </g>
        )}

        {/* sun sits behind the hills, so it rises out of and sets into them */}
        <g style={{ transform: `translate(${x}px, ${y}px)` }}>
          <circle className="fika-glow" r={16 * k} fill={C.amber} opacity="0.18" />
          <g className="fika-rays" stroke={C.amber} strokeWidth={1.4 * k} strokeLinecap="round" opacity="0.45">
            {[0, 45, 90, 135].map((deg) => (
              <line key={deg} x1="0" y1={-13 * k} x2="0" y2={-17 * k} transform={`rotate(${deg})`} />
            ))}
          </g>
          <circle r={8 * k} fill="url(#fika-sun-core)" />
          <circle r={5.5 * k} fill={C.amber} />
        </g>

        <path d={backHill} fill={C.moss} opacity="0.3" />
        <path d={frontHill} fill={C.ink} opacity="0.92" />
      </svg>
    </div>
  );
}

/**
 * Owns its own scroll state so the rest of the page doesn't re-render.
 *
 * Progress used to live in the App component, so every scroll event re-rendered
 * all 24 story cards to move a sun a few pixels. Keeping it here means a scroll
 * updates only this SVG. The listener is also rAF-throttled: scroll events can
 * fire far more often than the screen refreshes, and doing layout reads on each
 * one is wasted work.
 */
function DaylightBand() {
  const [progress, setProgress] = useState(0);
  const [collapse, setCollapse] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 40 ? el.scrollTop / max : 0);
      // Morph across a band of scroll rather than snapping at one point.
      setCollapse(ease(clamp01((el.scrollTop - 120) / 130)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    /* The page gets taller when the edition arrives and when topics are
       toggled, and neither fires scroll or resize — so progress would stay
       pinned to whatever the height was at mount. Watching the body catches
       every content change without App having to tell us about it. */
    // Guarded: ResizeObserver is absent in some environments (jsdom, older
    // browsers), and an unguarded constructor throws hard enough to take the
    // whole component down and render a blank page.
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onScroll);
      ro.observe(document.body);
    }

    read();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (ro) ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 20,
        background: C.paper,
        marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20,
        marginTop: 16,
        boxShadow: collapse > 0.6 ? `0 6px 16px -12px ${C.ink}` : "none",
        borderBottom: `1px solid ${collapse > 0.6 ? C.sky : "transparent"}`,
        transition: "box-shadow .3s ease, border-color .3s ease",
      }}
    >
      <DaylightMeter progress={progress} collapse={collapse} />
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
        // "humor" was renamed to "wonder"; migrate saved selections rather than
        // leaving anyone pointing at a topic that no longer exists.
        const topics = (p.topics || []).map((t) => (t === "humor" ? "wonder" : t));
        if (topics.length) setTopics(topics);
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

  /* Scroll state lives in DaylightBand, not here — see the note on that
     component. Keeping it in App meant every scroll event re-rendered all 24
     story cards to move the sun a few pixels. */

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
  // Same day-based pick as the joke: stable all day, different tomorrow.
  const facts = FACTS[lang] || [];
  const fact = facts[offsetForToday(facts.length)] || "";
  useEffect(() => {
    setJokeIdx(drawJoke(lang, (JOKES[lang] || []).length));
    setJokeShown(false);
  }, [lang]);

  const nextJoke = () => {
    setJokeIdx(drawJoke(lang, jokes.length));
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

  // Only topics with stories count as "all" — an edition legitimately has
  // nothing for some chips, and those are disabled.
  /* True only when the edition on screen was built on an earlier day than the
     one the reader is now in — a tab left open overnight. Compared as local
     calendar days, since "today's paper" is a human notion, not a UTC one. */
  const staleEdition = (() => {
    if (!edition?.built) return false;
    const built = new Date(edition.built), now = new Date();
    return built.toDateString() !== now.toDateString() && now - built > 6 * 3600 * 1000;
  })();

  const fillable = TOPICS.filter((tp) => (counts[tp.id] || 0) > 0).map((tp) => tp.id);
  const allSelected = fillable.length > 0 && fillable.every((id) => topics.includes(id));
  const toggleAll = () => setTopics(allSelected ? [] : fillable);

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

          <div style={{ fontFamily: MONO, fontSize: 11, color: C.soft, marginTop: 14 }}>{today}</div>
        </header>

        {/* The sun is the reading progress, so it stays in view rather than
            scrolling away with the masthead. It MUST be a direct child of the
            full-height page column: `position: sticky` is constrained to its
            containing block, so while this lived inside <header> it unstuck and
            vanished the moment the header's own short box scrolled past. */}
        <DaylightBand />

        {/* ---------- Topics ---------- */}
        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", color: C.soft }}>
              {t.pick.toUpperCase()}
            </div>
            {/* Selects only topics that actually have stories — offering to
                select an empty chip would just re-create the disabled state. */}
            {edition && (
              <button
                onClick={toggleAll}
                className="dl-focus px-2.5 py-1 rounded-full shrink-0"
                style={{
                  fontFamily: MONO, fontSize: 11,
                  background: "transparent", color: C.soft,
                  border: `1px solid ${C.sky}`,
                }}
              >
                {allSelected ? t.clearAll : t.selectAll}
              </button>
            )}
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

          {/* The old "hent på nytt" button is gone. It was AI machinery: each
              press fired a fresh web search, so "get new stories" was true.
              Against a static daily edition it re-fetched the same file and
              handed back identical stories — a control that promised something
              it could no longer do. The edition loads on open and the chips
              filter on-device, so there is nothing left for it to trigger.

              What IS worth offering is a reload when the edition on screen is
              genuinely out of date — a tab left open overnight. */}
          {staleEdition && (
            <button
              onClick={() => window.location.reload()}
              className="dl-focus mt-4 w-full rounded-2xl py-3"
              style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, background: C.ink, color: C.paper }}
            >
              {t.newEdition}
            </button>
          )}
          {!topics.length && (
            <p style={{ fontSize: 14, color: C.soft, marginTop: 12 }}>{t.emptyTopics}</p>
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
                className="dl-card rounded-2xl overflow-hidden"
                style={{ background: C.card }}
              >
                {/* Roughly half of any edition has an image — ScienceDaily,
                    Good News Network, Positive News and every SVT feed publish
                    none at all — so the card must read as deliberate either way,
                    never as one with a hole where a picture should be.
                    aspect-ratio reserves the space before the image arrives, so
                    nothing jumps as you scroll; lazy loading means only the
                    cards you actually reach cost anything. */}
                {s.image && (
                  <img
                    src={s.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full block"
                    style={{ aspectRatio: "16 / 9", objectFit: "cover", background: C.sky }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <div className={brief ? "p-4" : "p-5"}>
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
                </div>
              </article>
            );
          })}

          {status === "done" && stories.length > 0 && (
            <>
              {/* Fun facts are static and curated for the same reason the jokes
                  are: nobody syndicates "did you know" as a feed, and feekah
                  spends nothing at runtime. It also means the closing sequence
                  works in every language regardless of what the publishers gave
                  us that morning — Swedish has no oddities source at all. */}
              {fact && (
                <section
                  className="rounded-2xl p-5 mt-8"
                  style={{ background: C.card, borderLeft: `3px solid ${C.moss}` }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: C.moss }}>
                    {t.factLabel}
                  </div>
                  <p style={{ fontSize: 18, lineHeight: 1.5, marginTop: 10, color: "#2B4340" }}>
                    {fact}
                  </p>
                </section>
              )}

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

              {/* Deliberately at the very bottom and deliberately quiet — it is
                  a masthead, not a feature. It exists so a reader (and a URL
                  categorisation reviewer, who is often a person) can see who
                  runs this, what it does with publishers' work, and how to get
                  in touch. The source list is generated from the edition on
                  screen, so it can never drift out of date. */}
              <footer
                className="mt-10 pt-6"
                style={{ borderTop: `1px solid ${C.sky}`, fontSize: 13, lineHeight: 1.6, color: C.soft }}
              >
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", color: C.moss }}>
                  {t.aboutTitle.toUpperCase()}
                </div>
                <p style={{ marginTop: 8 }}>{t.aboutBody}</p>
                <p style={{ marginTop: 10 }}>{t.aboutCredit}</p>

                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".06em", marginTop: 14, color: "#8AA0A0" }}>
                  {t.aboutSources}
                </div>
                <p style={{ marginTop: 4, color: "#8AA0A0" }}>
                  {[...new Set(available.map((s) => s.source))].sort().join(" · ")}
                </p>

                <p style={{ marginTop: 14, color: "#9AAEAD" }}>
                  {OWNER}
                  {CONTACT && (
                    <>
                      {" · "}
                      {t.aboutContact}:{" "}
                      <a href={`mailto:${CONTACT}`} className="dl-focus" style={{ color: C.soft, textDecoration: "underline" }}>
                        {CONTACT}
                      </a>
                    </>
                  )}
                </p>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
