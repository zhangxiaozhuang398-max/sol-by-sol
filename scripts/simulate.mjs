// Play thousands of missions with simple bot strategies to check balance.
//   node scripts/simulate.mjs [missions]            win rates per strategy
//   node scripts/simulate.mjs --trace careful 1003  one mission, sol by sol
import { readFileSync } from "node:fs";
import * as E from "../js/game.js";
import { CONFIG as C } from "../js/config.js";
import { SITES } from "../js/sites.js";
import { buildReport } from "../js/report.js";

const pool = JSON.parse(readFileSync(new URL("../data/space_weather_events.json", import.meta.url))).events;
const N = C.totalSols;
const LS = C.power.lifeSupport;

// Battery the crew should keep for tomorrow morning, using only what a player can see:
// tomorrow's weather, replies from Earth, and the fact that a "hazy" day in storm season
// often comes right before a dust storm.
function reserveNeeded(g) {
  let need = 0, worst = 0;
  const stormSeen = g.history.some((h) => h.weather === "dust");
  for (let k = 1; k <= 4; k++) {
    const s = g.sol + k;
    if (s > N) break;
    let w;
    if (E.isKnown(g, s)) w = E.weatherKey(g, s);
    else if (!stormSeen && s >= C.weatherGen.seasonStartSol && E.weatherKey(g, s - 1) !== "sunny" && E.isKnown(g, s - 1)) w = "dust";
    else break;
    need += LS - Math.round((C.weather[w].solar * g.panel) / 100);
    worst = Math.max(worst, need);
  }
  const floor = !stormSeen && g.sol >= C.weatherGen.seasonStartSol - 2 ? 60 : 25;
  return Math.max(floor, worst + 5);
}

// Reduce a night plan until the power adds up (drop shield first, then oxygen, then greenhouse).
function nightAlloc(g, o2, gh, shield) {
  const a = { o2, gh, shield };
  while (E.nightCost(a) > g.battery) {
    if (a.shield) a.shield = false;
    else if (a.o2 > 10) a.o2 -= 5;
    else if (a.gh) a.gh = false;
    else if (a.o2 > 0) a.o2 -= 5;
    else break;
  }
  return a;
}

const strategies = {
  // Plans ahead: stores power before dust storms, shields on warnings, avoids EVA in storms.
  careful(g) {
    E.beginDay(g);
    const storm = E.solarStormOn(g, g.sol);
    while (g.ap > 0 && g.phase === "day") {
      if (g.panel <= 80 && E.checkClean(g).ok) { E.doClean(g); continue; }
      if (g.sol >= 6 && !g.history.some((h) => h.weather === "dust") && E.checkCall(g).ok) { E.doCall(g); continue; }
      if (!storm) {
        const income = E.expectedIncome(g);
        const nightPlan = LS + 15 + C.power.greenhouse;
        const reserve = reserveNeeded(g);
        const opts = SITES.map((s) => ({ s, c: E.checkEva(g, s.id) }))
          .filter((o) => o.c.ok && g.dose + o.c.cost.dose < 70 && g.battery - o.c.cost.power + income - nightPlan >= reserve)
          .sort((a, b) => b.c.cost.science / b.c.cost.ap - a.c.cost.science / a.c.cost.ap);
        if (opts.length) { E.doEva(g, opts[0].s.id); continue; }
      }
      if (E.checkTend(g).ok) { E.doTend(g); continue; }
      if (E.checkCall(g).ok) { E.doCall(g); continue; }
      break;
    }
    if (g.phase !== "day") return;
    E.endDay(g);
    if (g.phase !== "night") return;
    const reserve = reserveNeeded(g);
    let budget = g.battery - LS - reserve;
    const solsLeft = N - g.sol;
    const ghNeeded = g.food <= solsLeft;
    const lowSun = E.weatherKey(g, g.sol) !== "sunny";
    let gh = ghNeeded || budget >= C.power.greenhouse + 15;
    const base = g.oxygen - 10 + (gh ? 2 : 0);
    const minO2 = Math.max(0, Math.ceil((10 - base) / 4) * 5);
    const wantO2 = Math.max(minO2, Math.min(30, Math.ceil(((lowSun ? 25 : 80) - base) / 4) * 5));
    let o2 = minO2;
    budget -= o2;
    let shield = false;
    if (storm && budget >= C.power.shield) { shield = true; budget -= C.power.shield; }
    if (gh && !ghNeeded && budget < C.power.greenhouse) gh = false;
    if (gh) budget -= C.power.greenhouse;
    while (o2 < wantO2 && budget >= 5) { o2 += 5; budget -= 5; }
    E.confirmNight(g, nightAlloc(g, o2, gh, shield));
  },

  // Listens to the on-screen hints but doesn't do the math: one EVA when power is high,
  // saves power when told a dust storm is coming tomorrow.
  average(g) {
    E.beginDay(g);
    const storm = E.solarStormOn(g, g.sol);
    if (g.panel <= 80 && E.checkClean(g).ok) E.doClean(g);
    if (!storm && g.battery >= 50 && E.weatherKey(g, g.sol) !== "dust") {
      const opts = SITES.filter((s) => s.tier <= 2).map((s) => ({ s, c: E.checkEva(g, s.id) }))
        .filter((o) => o.c.ok).sort((a, b) => b.c.cost.science - a.c.cost.science);
      if (opts.length) E.doEva(g, opts[0].s.id);
    }
    if (g.phase !== "day") return;
    if (E.checkTend(g).ok) E.doTend(g);
    if (E.checkCall(g).ok) E.doCall(g);
    E.endDay(g);
    if (g.phase !== "night") return;
    const tomorrowStorm = g.sol < N && E.weatherKey(g, g.sol + 1) === "dust";
    const dust = E.weatherKey(g, g.sol) === "dust" || tomorrowStorm;
    const o2 = g.oxygen >= 80 ? 5 : dust && g.oxygen >= 30 ? 0 : 15;
    E.confirmNight(g, nightAlloc(g, o2, !dust, !!storm));
  },

  // A first-time player who ignores the hints: one EVA a day when power looks fine,
  // never checks storm warnings, never plans for dust storms.
  novice(g) {
    E.beginDay(g);
    if (g.battery >= 50 && E.weatherKey(g, g.sol) !== "dust") {
      const opts = SITES.filter((s) => s.tier <= 2).map((s) => ({ s, c: E.checkEva(g, s.id) }))
        .filter((o) => o.c.ok).sort((a, b) => b.c.cost.science - a.c.cost.science);
      if (opts.length) E.doEva(g, opts[0].s.id);
    }
    if (g.phase !== "day") return;
    if (E.checkTend(g).ok) E.doTend(g);
    E.endDay(g);
    if (g.phase !== "night") return;
    E.confirmNight(g, nightAlloc(g, 15, true, false));
  },

  // Never leaves the base: safe but only one star.
  homebody(g) {
    E.beginDay(g);
    if (g.panel <= 85 && E.checkClean(g).ok) E.doClean(g);
    if (E.checkTend(g).ok) E.doTend(g);
    if (E.checkCall(g).ok) E.doCall(g);
    E.endDay(g);
    if (g.phase !== "night") return;
    const storm = E.solarStormOn(g, g.sol);
    const lowSun = E.weatherKey(g, g.sol) !== "sunny";
    const o2 = lowSun ? (g.oxygen >= 30 ? 0 : 10) : g.oxygen >= 80 ? 5 : g.oxygen >= 50 ? 10 : 15;
    const gh = g.battery - LS - o2 - C.power.greenhouse >= reserveNeeded(g);
    E.confirmNight(g, nightAlloc(g, o2, gh, !!storm));
  },

  // Science first: EVA to the farthest site every time, ignores storms and power.
  greedy(g) {
    E.beginDay(g);
    while (g.ap > 0 && g.phase === "day") {
      const opts = SITES.map((s) => ({ s, c: E.checkEva(g, s.id) })).filter((o) => o.c.ok)
        .sort((a, b) => b.c.cost.science - a.c.cost.science);
      if (opts.length) { E.doEva(g, opts[0].s.id); continue; }
      if (E.checkTend(g).ok) { E.doTend(g); continue; }
      break;
    }
    if (g.phase !== "day") return;
    E.endDay(g);
    if (g.phase !== "night") return;
    E.confirmNight(g, nightAlloc(g, 15, true, false));
  },

  random(g) {
    E.beginDay(g);
    let guard = 0;
    while (g.ap > 0 && g.phase === "day" && guard++ < 10) {
      const r = Math.random();
      if (r < 0.5) E.doEva(g, SITES[Math.floor(Math.random() * SITES.length)].id);
      else if (r < 0.65) E.doClean(g);
      else if (r < 0.85) E.doTend(g);
      else E.doCall(g);
    }
    if (g.phase !== "day") return;
    E.endDay(g);
    if (g.phase !== "night") return;
    E.confirmNight(g, nightAlloc(g, 5 * Math.floor(Math.random() * 7), Math.random() < 0.6, Math.random() < 0.3));
  },
};

function playOne(strategy, seed) {
  const g = E.newGame(pool, seed);
  let guard = 0;
  while (g.phase !== "end" && guard++ < 100) {
    strategy(g);
    if (g.phase === "settle") E.nextSol(g);
  }
  return g;
}

// Trace one mission:  node scripts/simulate.mjs --trace careful 1003
if (process.argv[2] === "--trace") {
  const play = strategies[process.argv[3] || "careful"];
  const g = E.newGame(pool, Number(process.argv[4]) || 1000);
  while (g.phase !== "end") {
    const sol = g.sol;
    const w = E.weatherKey(g, sol);
    play(g);
    const h = g.history[g.history.length - 1];
    console.log(
      `sol${String(sol).padStart(2)} ${w.padEnd(5)} 🔋${String(h.battery).padStart(3)} 🫁${String(h.oxygen).padStart(3)} ☢️${String(h.dose).padStart(3)} 🥫${String(h.food).padStart(2)} 🔬${String(h.science).padStart(3)}` +
        ` eva=${h.evas.map((e) => e.id).join(",") || "-"}${h.solarStorm ? " ☀️storm:" + h.solarStorm : ""}`,
    );
    if (g.phase === "settle") E.nextSol(g);
  }
  console.log(g.outcome);
  const r = buildReport(g);
  console.log(r.title, r.lines, r.tips);
  process.exit(0);
}

const GAMES = Number(process.argv[2]) || 1000;
for (const [name, play] of Object.entries(strategies)) {
  const r = { win: 0, stars: [0, 0, 0, 0], sci: 0, fail: { power: 0, oxygen: 0, food: 0, dose: 0 }, failSol: 0 };
  for (let i = 0; i < GAMES; i++) {
    const g = playOne(play, 1000 + i);
    if (g.outcome.success) { r.win++; r.stars[g.outcome.stars]++; r.sci += g.science; }
    else { r.fail[g.outcome.reason]++; r.failSol += g.outcome.sol; }
  }
  const pct = (n) => `${((100 * n) / GAMES).toFixed(0)}%`;
  const fails = GAMES - r.win;
  console.log(
    `${name.padEnd(9)} win ${pct(r.win).padStart(4)} | ⭐1/2/3 of wins: ${r.stars.slice(1).join("/")} | avg 🔬 ${r.win ? (r.sci / r.win).toFixed(0) : "-"}` +
      ` | lost: power ${r.fail.power}, oxygen ${r.fail.oxygen}, food ${r.fail.food}, dose ${r.fail.dose}` +
      ` (avg sol ${fails ? (r.failSol / fails).toFixed(1) : "-"})`,
  );
}
