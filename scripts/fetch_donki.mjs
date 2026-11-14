// Fetch real historical solar storms (CMEs) from NASA DONKI and save a curated
// event pool for the game.
//
// Usage:   npm run fetch-data
//          (put NASA_API_KEY=your_key in a .env file; it is git-ignored, never commit it)
// Get a free key at https://api.nasa.gov/ (DEMO_KEY works but is heavily rate-limited).
// Output:  data/space_weather_events.json

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
console.log(API_KEY === "DEMO_KEY" ? "Using DEMO_KEY (low rate limit)" : "Using your NASA_API_KEY from the environment");
const BASE = "https://api.nasa.gov/DONKI/CME";

// Active solar periods with well-known storms. One request per window.
const WINDOWS = [
  ["2017-09-01", "2017-09-30"],
  ["2021-10-20", "2021-11-10"],
  ["2022-01-25", "2022-02-15"],
  ["2023-02-15", "2023-03-15"],
  ["2024-05-01", "2024-05-31"],
  ["2024-10-01", "2024-10-31"],
];

const MIN_SPEED = 450; // km/s, ignore slow, weak CMEs
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "space_weather_events.json");

// Game mapping (design choice, not a physics formula).
const strengthFor = (speed) => (speed >= 1000 ? "big" : speed >= 700 ? "medium" : "small");

function bestAnalysis(cme) {
  const analyses = (cme.cmeAnalyses || []).filter((a) => a.speed);
  const accurate = analyses.filter((a) => a.isMostAccurate);
  const pool = accurate.length ? accurate : analyses;
  return pool.length ? pool.reduce((m, a) => (a.speed > m.speed ? a : m)) : null;
}

const byDay = new Map();
for (const [start, end] of WINDOWS) {
  const url = `${BASE}?startDate=${start}&endDate=${end}&api_key=${API_KEY}`;
  let cmes;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "sol-by-sol-hackathon" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cmes = await res.json();
  } catch (err) {
    console.warn(`[warn] ${start}..${end}: ${err.message}`);
    continue;
  }
  for (const cme of cmes) {
    const a = bestAnalysis(cme);
    if (!a || a.speed < MIN_SPEED) continue;
    const linked = (cme.linkedEvents || []).map((e) => e.activityID || "");
    const instruments = (cme.instruments || []).map((i) => i.displayName);
    const event = {
      id: cme.activityID,
      date: cme.startTime.slice(0, 10),
      time: cme.startTime,
      speedKmS: Math.round(a.speed),
      strength: strengthFor(a.speed),
      hadParticleStorm: linked.some((x) => x.includes("-SEP-")),
      hadGeomagneticStorm: linked.some((x) => x.includes("-GST-")),
      linkedFlare: linked.find((x) => x.includes("-FLR-")) || null,
      instrument: instruments[0] || "SOHO: LASCO",
      link: cme.link,
    };
    const prev = byDay.get(event.date);
    if (!prev || event.speedKmS > prev.speedKmS) byDay.set(event.date, event); // fastest per day
  }
  console.log(`${start}..${end}: ${cmes.length} CMEs`);
  await new Promise((r) => setTimeout(r, 1000));
}

const events = [...byDay.values()].sort((a, b) => a.time.localeCompare(b.time));
const payload = {
  source: "NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)",
  sourceUrl: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
  api: BASE,
  note: "Real historical coronal mass ejections observed by spacecraft near Earth. Their effect on the Mars base in the game is simulated.",
  fetchedAt: new Date().toISOString(),
  events,
};
writeFileSync(OUT, JSON.stringify(payload, null, 2));
const counts = Object.fromEntries(["small", "medium", "big"].map((s) => [s, events.filter((e) => e.strength === s).length]));
console.log(`Saved ${events.length} events to ${OUT}`, counts);
process.exit(events.length ? 0 : 1);
