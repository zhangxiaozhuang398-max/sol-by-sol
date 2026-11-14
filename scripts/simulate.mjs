// Play thousands of games with simple bot strategies to check balance.
// Usage: node scripts/simulate.mjs [games]
import { readFileSync } from "node:fs";
import { newGame, setAlloc, choose, endSol, canChoose, powerToday, slotMax, canAdd } from "../js/game.js";

const pool = JSON.parse(readFileSync(new URL("../data/space_weather_events.json", import.meta.url))).events;
const GAMES = Number(process.argv[2]) || 5000;

const fill = (s, slot, n) => {
  for (let i = 0; i < n && canAdd(s, slot); i++) setAlloc(s, slot, s.alloc[slot] + 1);
};

const strategies = {
  random(s) {
    const id = s.rng.pick(s.hand.filter((h) => canChoose(s, h)));
    choose(s, id);
    for (let i = 0; i < 9; i++) fill(s, s.rng.pick(["o2", "shield", "lab"]), 1);
  },
  // Like a first-time kid: random card, remembers to make oxygen, shields only on red warnings.
  novice(s) {
    choose(s, s.rng.pick(s.hand.filter((h) => canChoose(s, h))));
    fill(s, "o2", Math.max(0, 6 - s.o2));
    if (s.forecast[s.sol] === "warning") fill(s, "shield", s.rng.int(1, 3));
    for (let i = 0; i < 3; i++) fill(s, s.rng.pick(["lab", "lab", "o2"]), 1);
  },
  greedy(s) {
    // Science first, ignores storms.
    const pref = ["eva", "drill", "callEarth", "clean", "rest", "berm", "repair"];
    choose(s, pref.find((id) => canChoose(s, id)) || s.hand[0]);
    fill(s, "lab", 3);
    fill(s, "o2", Math.max(0, 4 - s.o2));
  },
  // Plans ahead: protect O₂ and battery first, shield on warnings, then science.
  careful(s) {
    const pref = [
      s.o2Broken && "repair",
      s.berm < 2 && s.battery >= 4 && "berm",
      !s.panelsClean && s.o2 >= 6 && "clean",
      s.dose <= 5 && s.o2 >= 5 && "eva",
      s.battery >= 3 && "drill",
      s.o2 <= 3 && "rest",
      "callEarth",
      "rest",
      "eva",
      "drill",
    ].filter(Boolean);
    choose(s, pref.find((id) => canChoose(s, id)) || s.hand.find((h) => canChoose(s, h)));

    // oxygen first: end the night with at least 3
    const cold = s.battery + powerToday(s) <= 2 ? 1 : 0;
    const o2Loss = (s.chosen === "rest" ? 1 : 2) + (s.chosen === "eva" || s.chosen === "clean" ? 1 : 0) + cold;
    fill(s, "o2", Math.max(0, 3 + o2Loss - s.o2));

    const intelStorm = s.intel?.find((i) => i.sol === s.sol)?.storm;
    const warning = s.forecast[s.sol] === "warning";
    const shieldNeed = intelStorm ? intelStorm.dose - s.berm : warning ? 3 - Math.min(s.berm, 1) : 0;
    fill(s, "shield", Math.max(0, Math.min(3, shieldNeed)));
    fill(s, "o2", Math.max(0, 4 + o2Loss - s.o2 - s.alloc.o2));

    // keep enough battery for tonight's heater plus one spare
    const cardCost = s.chosen === "berm" ? 2 : ["drill", "repair"].includes(s.chosen) ? 1 : 0;
    const used = s.alloc.o2 + s.alloc.shield;
    const free = powerToday(s) + s.battery - cardCost - 2 - used;
    fill(s, "lab", Math.max(0, Math.min(free, powerToday(s) - used)));
  },
};

// Trace one game:  node scripts/simulate.mjs --trace careful 1003
if (process.argv[2] === "--trace") {
  const play = strategies[process.argv[3] || "careful"];
  const s = newGame(pool, Number(process.argv[4]) || 1000);
  while (!s.over) {
    play(s);
    if (!s.chosen) choose(s, s.hand.find((h) => canChoose(s, h)));
    const pre = `sol${String(s.sol).padStart(2)} ${s.weather[s.sol].type.padEnd(5)} ⚡${powerToday(s)} ${s.forecast[s.sol].padEnd(7)} 🫁${s.o2} 🔋${s.battery} ☢️${s.dose} card=${s.chosen} o2/sh/lab=${s.alloc.o2}/${s.alloc.shield}/${s.alloc.lab}`;
    const r = endSol(s);
    console.log(pre, "=>", r.lines.map((l) => l.icon + l.delta).join(" "));
  }
  console.log(s.result);
  process.exit(0);
}

for (const [name, play] of Object.entries(strategies)) {
  const stats = { win: 0, o2: 0, dose: 0, stars: [0, 0, 0, 0], science: 0, failSol: 0 };
  for (let g = 0; g < GAMES; g++) {
    const s = newGame(pool, 1000 + g);
    let guard = 0;
    while (!s.over && guard++ < 100) {
      play(s);
      if (!s.chosen) choose(s, s.hand.find((h) => canChoose(s, h)));
      endSol(s);
    }
    stats[s.result.cause]++;
    stats.science += s.result.science;
    if (s.result.cause === "win") stats.stars[s.result.stars]++;
    else stats.failSol += s.result.sol;
  }
  const pct = (n) => `${((100 * n) / GAMES).toFixed(1)}%`;
  const fails = GAMES - stats.win;
  console.log(
    `${name.padEnd(8)} win ${pct(stats.win)} | lost: O₂ ${pct(stats.o2)}, dose ${pct(stats.dose)}` +
      ` (avg sol ${fails ? (stats.failSol / fails).toFixed(1) : "-"}) | avg 🔬 ${(stats.science / GAMES).toFixed(1)}` +
      ` | stars 0/1/2/3: ${stats.stars.map(pct).join(" ")}`,
  );
}
