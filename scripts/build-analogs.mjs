// Builds lib/analogs/events.json: notable real-world events since 2000, by category, from Wikidata,
// with an English Wikipedia link and the article's opening summary.
// Notability = number of Wikipedia language editions covering the event (sitelinks).
// Queries run on QLever (qlever.dev), a fast public Wikidata SPARQL engine; the official endpoint times out on these.
// Usage: node scripts/build-analogs.mjs
import fs from "node:fs/promises";
import path from "node:path";

const UA = "hivemind-sim/0.1 (https://hivemind-chi-drab.vercel.app; analog library builder)";
const OUT = path.join(import.meta.dirname, "..", "lib", "analogs", "events.json");

// Wikidata classes per app category. Items are instances of the class or of a direct subclass.
const GROUPS = [
  { category: "war", limit: 45, minLinks: 20, classes: ["Q198" /* war */, "Q350604" /* armed conflict */, "Q45382" /* coup */] },
  { category: "terror", limit: 35, minLinks: 20, classes: ["Q2223653" /* terrorist attack */, "Q21480300" /* mass shooting */] },
  // Elections sit several subclass levels deep (e.g. "United States presidential election"), so search the whole tree.
  { category: "election", limit: 40, minLinks: 30, deep: true, classes: ["Q40231" /* election */, "Q43109" /* referendum */] },
  {
    category: "scandal",
    limit: 35,
    minLinks: 8,
    classes: ["Q21996358" /* corporate scandal */, "Q1172486" /* data breach */, "Q192909" /* scandal */],
  },
  {
    category: "tech_launch",
    limit: 40,
    minLinks: 25,
    classes: [
      "Q19723451" /* smartphone model */,
      "Q56682555" /* video game console model */,
      "Q115305900" /* large language model */,
      "Q3220391" /* social networking service */,
      "Q620615" /* mobile app */,
    ],
  },
  {
    category: "economic",
    limit: 30,
    minLinks: 8,
    classes: ["Q114380" /* financial crisis */, "Q1020018" /* stock market crash */, "Q4856009" /* bank failure */, "Q176494" /* recession */],
  },
  {
    category: "disaster",
    limit: 50,
    minLinks: 25,
    classes: [
      "Q7944" /* earthquake */,
      "Q8092" /* tropical cyclone */,
      "Q8068" /* flood */,
      "Q169950" /* wildfire */,
      "Q8070" /* tsunami */,
      "Q7692360" /* volcanic eruption */,
      "Q12184" /* pandemic */,
      "Q44512" /* epidemic */,
      "Q744913" /* aviation accident */,
    ],
  },
];

const PREFIXES = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>`;

// One row per item. Date preference: point in time > start time > inception > publication (earliest of each).
const SELECT = `SELECT ?item (SAMPLE(?l) AS ?itemLabel) (SAMPLE(?d) AS ?itemDescription)
  (MIN(?p585) AS ?d1) (MIN(?p580) AS ?d2) (MIN(?p571) AS ?d3) (MIN(?p577) AS ?d4) (MIN(?dt) AS ?d0)
  (SAMPLE(?a) AS ?article) (MAX(?n) AS ?links)`;
const DATES = `OPTIONAL { ?item wdt:P585 ?p585 } OPTIONAL { ?item wdt:P580 ?p580 } OPTIONAL { ?item wdt:P571 ?p571 } OPTIONAL { ?item wdt:P577 ?p577 }`;
const COMMON = `?a schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> .
  ?item rdfs:label ?l . FILTER(LANG(?l) = "en")
  OPTIONAL { ?item schema:description ?d . FILTER(LANG(?d) = "en") }`;
const IN_RANGE = `FILTER(?dt >= "2000-01-01T00:00:00Z"^^xsd:dateTime && ?dt <= "2027-01-01T00:00:00Z"^^xsd:dateTime)`;

const eventQuery = ({ classes, minLinks, limit, deep }) => `${PREFIXES}
${SELECT} WHERE {
  VALUES ?cls { ${classes.map((c) => `wd:${c}`).join(" ")} }
  ${deep ? "?item wdt:P31/wdt:P279* ?cls ." : "{ ?item wdt:P31 ?cls } UNION { ?item wdt:P31/wdt:P279 ?cls }"}
  ?item wikibase:sitelinks ?n . FILTER(?n >= ${minLinks})
  { ?item wdt:P585 ?dt } UNION { ?item wdt:P580 ?dt } UNION { ?item wdt:P571 ?dt } UNION { ?item wdt:P577 ?dt }
  ${IN_RANGE}
  ${DATES}
  ${COMMON}
}
GROUP BY ?item ORDER BY DESC(?links) LIMIT ${limit * 2}`;

// Celebrity deaths: the most widely covered people who died since 2000.
const deathQuery = `${PREFIXES}
${SELECT} WHERE {
  ?item wdt:P31 wd:Q5 ; wdt:P570 ?dt ; wikibase:sitelinks ?n .
  FILTER(?n >= 130)
  ${IN_RANGE}
  ${COMMON}
}
GROUP BY ?item ORDER BY DESC(?links) LIMIT 45`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: url.includes("qlever") ? "application/sparql-results+json" : "application/json" }, signal: AbortSignal.timeout(90_000) });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url.slice(0, 80)}`);
    } catch (err) {
      if (i === tries) throw err;
    }
    await sleep(3000 * i);
  }
  throw new Error(`gave up after ${tries} tries: ${url.slice(0, 80)}`);
}

async function sparql(query) {
  const url = `https://qlever.dev/api/wikidata?query=${encodeURIComponent(query)}`;
  const body = await fetchJSON(url);
  return body.results.bindings.map((b) => ({
    qid: b.item.value.split("/").pop(),
    label: b.itemLabel?.value ?? "",
    description: b.itemDescription?.value ?? "",
    date: [b.d1, b.d2, b.d3, b.d4, b.d0].find((d) => d && d.value >= "2000")?.value.slice(0, 10) ?? b.d0.value.slice(0, 10),
    url: b.article.value,
    links: Number(b.links.value),
  }));
}

/** First one or two sentences of the English Wikipedia article. */
async function summary(url) {
  const title = decodeURIComponent(url.split("/wiki/")[1]);
  try {
    const body = await fetchJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, 2);
    const text = (body.extract ?? "").replace(/\s+/g, " ").trim();
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    let out = "";
    for (const s of sentences) {
      if (out && (out + s).length > 260) break;
      out += s;
    }
    return out.trim();
  } catch {
    return "";
  }
}

// Skip lists, timelines and aggregates; they aren't single events.
const NOT_AN_EVENT = /^(list of|timeline of|lists of)|\b(season|elections in|by country)\b/i;
// Hand-checked exclusions: mis-dated items, umbrella topics, and reference sites nobody "reacts" to as an event.
const EXCLUDE = new Set([
  "Battle of the Alamo",
  "War on Terrorism",
  "Indo-Pakistani wars and conflicts",
  "Arab Spring",
  "Wikispecies",
  "iNaturalist",
  "Discogs",
  "MyHeritage",
  "last.fm",
  "crisis portugal",
  "VLC media player",
]);
// Hand-checked re-categorisations.
const RECATEGORISE = { "2011 Germany E. coli O104:H4 outbreak": "disaster" };
// Hand-checked date fixes where Wikidata's date isn't when the news broke.
const DATE_FIX = {
  "Gaza War": "2023-10-07",
  "Russo-Ukrainian war": "2014-02-20",
  Euromaidan: "2013-11-21",
  "Great Recession": "2007-12-01",
  "Volkswagen emissions scandal": "2015-09-18",
};
for (const name of ["Iraqi invasion of Kuwait" /* 1990 */, "Revolution of Dignity" /* duplicate of Euromaidan */, "2025–2026 Iranian protests" /* unclear date */])
  EXCLUDE.add(name);

const all = new Map();
for (const g of GROUPS) {
  const rows = await sparql(eventQuery(g));
  const seen = new Set();
  const kept = rows
    .filter((r) => !NOT_AN_EVENT.test(r.label) && !EXCLUDE.has(r.label) && !all.has(r.qid) && !seen.has(r.qid) && seen.add(r.qid))
    .slice(0, g.limit);
  for (const r of kept) all.set(r.qid, { ...r, date: DATE_FIX[r.label] ?? r.date, category: RECATEGORISE[r.label] ?? g.category });
  console.log(`${g.category}: ${kept.length}`);
  await sleep(1500);
}
const deathSeen = new Set();
const deaths = (await sparql(deathQuery)).filter((r) => !all.has(r.qid) && !deathSeen.has(r.qid) && deathSeen.add(r.qid));
for (const r of deaths) all.set(r.qid, { ...r, category: "celebrity_death", label: `Death of ${r.label}`, died: true });
console.log(`celebrity_death: ${deaths.length}`);

// Well-known events the class queries miss (filed under other classes, or below the notability cut).
// Fetched by English Wikipedia title; dates are when the news broke.
const EXTRAS = [
  ["Facebook–Cambridge Analytica data scandal", "2018-03-17", "scandal"],
  ["Theranos", "2015-10-15", "scandal"],
  ["Bankruptcy of FTX", "2022-11-11", "scandal"],
  ["Boeing 737 MAX groundings", "2019-03-10", "scandal"],
  ["Wirecard scandal", "2020-06-18", "scandal"],
  ["2017 Equifax data breach", "2017-09-07", "scandal"],
  ["2024 CrowdStrike-related IT outages", "2024-07-19", "scandal"],
  ["Bankruptcy of Lehman Brothers", "2008-09-15", "economic"],
  ["GameStop short squeeze", "2021-01-28", "economic"],
  ["September 2022 United Kingdom mini-budget", "2022-09-23", "economic"],
  ["Liberation Day tariffs", "2025-04-02", "economic"],
  ["IPhone (1st generation)", "2007-01-09", "tech_launch"],
  ["Apple Vision Pro", "2023-06-05", "tech_launch"],
  ["Tesla Cybertruck", "2019-11-21", "tech_launch"],
  ["Acquisition of Twitter by Elon Musk", "2022-10-27", "tech_launch"],
  ["PlayStation 5", "2020-11-12", "tech_launch"],
  ["Nintendo Switch", "2017-03-03", "tech_launch"],
  ["Google Glass", "2013-04-15", "tech_launch"],
  ["2020 Calabasas helicopter crash", "2020-01-26", "celebrity_death"],
  ["Whitney Houston", "2012-02-11", "celebrity_death"],
  ["Prince (musician)", "2016-04-21", "celebrity_death"],
  ["Amy Winehouse", "2011-07-23", "celebrity_death"],
  ["David Bowie", "2016-01-10", "celebrity_death"],
  ["Avicii", "2018-04-20", "celebrity_death"],
  ["Chadwick Boseman", "2020-08-28", "celebrity_death"],
  ["Matthew Perry", "2023-10-28", "celebrity_death"],
  ["Liam Payne", "2024-10-16", "celebrity_death"],
  ["Paul Walker", "2013-11-30", "celebrity_death"],
  ["Steve Irwin", "2006-09-04", "celebrity_death"],
];
for (const [title, date, category] of EXTRAS) {
  try {
    const body = await fetchJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`, 2);
    const qid = body.wikibase_item;
    if (!qid || all.has(qid)) continue;
    const person = category === "celebrity_death" && !/crash|death/i.test(body.title);
    all.set(qid, {
      qid,
      label: person ? `Death of ${body.title.replace(/ \(.*\)$/, "")}` : body.title,
      description: body.description ?? "",
      date,
      url: body.content_urls.desktop.page,
      links: 100, // notability unknown here; mid-range so ranking stays driven by relevance
      category,
      died: person,
    });
  } catch (err) {
    console.warn(`extra not found: ${title} (${err.message})`);
  }
}
console.log(`extras: ${EXTRAS.length}`);

const events = [...all.values()];
console.log(`fetching ${events.length} summaries…`);
for (let i = 0; i < events.length; i += 6) {
  await Promise.all(
    events.slice(i, i + 6).map(async (e) => {
      const text = (await summary(e.url)) || e.description;
      e.summary = e.died ? `Died ${new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}. ${text}` : text;
    }),
  );
}

const out = events
  .map((e) => ({
    id: e.qid,
    title: e.label,
    date: e.date,
    category: e.category,
    url: e.url,
    summary: e.summary,
    notability: e.links,
  }))
  .sort((a, b) => a.category.localeCompare(b.category) || b.notability - a.notability);

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${out.length} events -> ${path.relative(process.cwd(), OUT)}`);
