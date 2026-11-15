// Quick check that "Suggest a plan" (js/kid.js) keeps a player alive, compared
// with the simple night rule of the "average" player in simulate.mjs.
// Day ("pip"): check and clean the panels, tend the greenhouse, and sample one
// nearby site when there is no storm, no dust and the battery is at least 50
// (what Pip's tips point to). Day ("eager"): also samples when power is low.
// Usage: node scripts/suggest-check.mjs [games]
import fs from "node:fs";
import * as E from "../js/game.js";
import { CONFIG as C } from "../js/config.js";
import { suggestAlloc } from "../js/kid.js";

const pool = JSON.parse(fs.readFileSync(new URL("../data/space_weather_events.json", import.meta.url))).events;
const games = +process.argv[2] || 300;
const N = C.totalSols;

function trim(g, a) { // same as simulate.mjs nightAlloc: cut back until it fits
  while (E.nightCost(a, g) > g.battery) {
    if (a.shield) a.shield = false;
    else if (a.o2 > 10) a.o2 -= 5;
    else if (a.gh) a.gh = false;
    else if (a.o2 > 0) a.o2 -= 5;
    else break;
  }
  return a;
}
const nights = {
  suggest: (g) => suggestAlloc(g),
  average: (g) => {
    const dust = E.weatherKey(g, g.sol) === "dust" || (g.sol < N && E.weatherKey(g, g.sol + 1) === "dust");
    return trim(g, { o2: g.oxygen >= 80 ? 5 : dust && g.oxygen >= 30 ? 0 : 15, gh: !dust, shield: !!E.solarStormOn(g, g.sol) });
  },
};

for (const day of ["pip", "eager"]) {
  for (const [name, night] of Object.entries(nights)) {
    let wins = 0, sci = 0;
    const lost = {};
    for (let seed = 1; seed <= games; seed++) {
      const g = E.newGame(pool, seed);
      while (g.phase !== "end") {
        if (g.phase === "briefing") E.beginDay(g);
        else if (g.phase === "day") {
          if (E.checkInspect(g).ok) E.inspectPanels(g);
          if (E.checkClean(g).ok && g.panel < 90) E.doClean(g);
          if (E.checkTend(g).ok) E.doTend(g);
          const ok = day === "eager" || (!E.solarStormOn(g, g.sol) && g.battery >= 50 && E.weatherKey(g, g.sol) !== "dust");
          if (ok) {
            for (const id of ["dune", "crater", "cliff", "riverbed"]) {
              const c = E.checkEva(g, id);
              if (c.ok && !c.warnings.some((w) => w.level === "danger")) { E.doEva(g, id); break; }
            }
          }
          if (g.phase === "day") E.endDay(g);
        } else if (g.phase === "night") {
          if (!E.confirmNight(g, night(g)).ok) E.confirmNight(g, { o2: 0, gh: false, shield: false });
        } else if (g.phase === "settle") E.nextSol(g);
      }
      if (g.outcome.success) { wins++; sci += g.science; } else lost[g.outcome.reason] = (lost[g.outcome.reason] || 0) + 1;
    }
    console.log(`day ${day.padEnd(5)} night ${name.padEnd(7)} win ${String(Math.round((wins / games) * 100)).padStart(3)}% | avg science of wins ${wins ? Math.round(sci / wins) : "-"} | lost`, lost);
  }
}
