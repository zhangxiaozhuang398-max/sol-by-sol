// Pure game logic: no DOM. Used by the browser UI and by scripts/simulate.mjs.
import { CARDS } from "./cards.js";

export const CONFIG = {
  maxSol: 20,
  start: { o2: 8, battery: 5, dose: 0, science: 0 },
  caps: { o2: 10, battery: 10, dose: 10 },
  slotMax: 3,
  brokenO2Max: 2,
  weatherPower: { sunny: 6, hazy: 4, dust: 2 },
  weatherOdds: { sunny: 0.6, hazy: 0.3 }, // the rest starts a dust storm
  dustStormLength: [2, 4],
  dustCooldown: 3, // clear-ish sols guaranteed after a dust storm
  breathing: 2,
  restBreathing: 1,
  heater: 1,
  coldNightO2: 1,
  cosmicEvery: 5,
  stormDose: { small: 2, medium: 3, big: 4 },
  stormCount: [4, 6],
  firstStormSol: 3,
  minStormGap: 2,
  surpriseChance: 0.2, // storm with no "watch" the sol before
  falseAlarmChance: 0.15, // "watch" with no storm
  nightEventChance: 0.3,
  bermMax: 2,
  handSize: 3,
  stars: [20, 35, 50],
};

// ---------- seeded random ----------
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle(arr) {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

// ---------- mission setup (everything pre-rolled so forecasts can be honest) ----------
function rollWeather(cfg, rng) {
  const weather = [null];
  let dustLeft = 0;
  let cooldown = 0;
  for (let sol = 1; sol <= cfg.maxSol; sol++) {
    if (dustLeft > 0) {
      weather.push({ type: "dust", start: false });
      if (--dustLeft === 0) cooldown = cfg.dustCooldown;
      continue;
    }
    const r = rng.next();
    const dustAllowed = sol > 1 && cooldown === 0;
    if (cooldown > 0) cooldown--;
    if (dustAllowed && r >= cfg.weatherOdds.sunny + cfg.weatherOdds.hazy) {
      dustLeft = rng.int(...cfg.dustStormLength) - 1;
      if (dustLeft === 0) cooldown = cfg.dustCooldown;
      weather.push({ type: "dust", start: true });
    } else {
      // during cooldown a would-be dust roll becomes haze
      weather.push({ type: r < cfg.weatherOdds.sunny ? "sunny" : "hazy", start: false });
    }
  }
  return weather;
}

function rollStorms(cfg, rng, eventPool) {
  const count = rng.int(...cfg.stormCount);
  const candidates = rng.shuffle(
    Array.from({ length: cfg.maxSol - cfg.firstStormSol + 1 }, (_, i) => cfg.firstStormSol + i),
  );
  const sols = [];
  for (const sol of candidates) {
    if (sols.length >= count) break;
    if (sols.every((s) => Math.abs(s - sol) >= cfg.minStormGap)) sols.push(sol);
  }
  // random real events, replayed in date order so the mission reads like a story
  const events = rng.shuffle(eventPool).slice(0, sols.length).sort((a, b) => a.time.localeCompare(b.time));
  const storms = {};
  sols.sort((a, b) => a - b).forEach((sol, i) => {
    const ev = events[i % events.length];
    storms[sol] = { event: ev, dose: cfg.stormDose[ev.strength], surprise: rng.next() < cfg.surpriseChance };
  });
  return storms;
}

function rollForecasts(cfg, rng, storms) {
  const forecast = [null];
  for (let sol = 1; sol <= cfg.maxSol; sol++) {
    if (storms[sol]) forecast.push("warning");
    else if (storms[sol + 1] && !storms[sol + 1].surprise) forecast.push("watch");
    else forecast.push(rng.next() < cfg.falseAlarmChance ? "watch" : "calm");
  }
  return forecast;
}

export function newGame(eventPool, seed = Date.now(), cfg = CONFIG) {
  const rng = makeRng(seed);
  const weather = rollWeather(cfg, rng);
  const storms = rollStorms(cfg, rng, eventPool);
  const forecast = rollForecasts(cfg, rng, storms);
  const s = {
    cfg,
    seed,
    rng,
    sol: 0,
    ...cfg.start,
    berm: 0,
    panelsClean: false,
    o2Broken: false,
    earthCall: null,
    intel: null,
    resting: false,
    weather,
    storms,
    forecast,
    alloc: { o2: 0, shield: 0, lab: 0 },
    hand: [],
    chosen: null,
    history: [],
    stormsFaced: [],
    factsSeen: [],
    over: false,
    result: null,
  };
  s.history.push(snapshot(s));
  startSol(s);
  return s;
}

const snapshot = (s) => ({ sol: s.sol, o2: s.o2, battery: s.battery, dose: s.dose, science: s.science });

// ---------- morning ----------
export function powerToday(s) {
  const w = s.weather[s.sol].type;
  return s.cfg.weatherPower[w] + (s.panelsClean && w !== "dust" ? 1 : 0);
}

export const slotMax = (s, slot) => (slot === "o2" && s.o2Broken ? s.cfg.brokenO2Max : s.cfg.slotMax);

function startSol(s) {
  s.sol += 1;
  s.resting = false;
  s.chosen = null;
  s.alloc = { o2: 0, shield: 0, lab: 0 };
  if (s.weather[s.sol].start) s.panelsClean = false; // dust storm coats the panels

  s.intel = null;
  if (s.earthCall && s.earthCall.arrives === s.sol) {
    s.intel = [s.sol, s.sol + 1]
      .filter((n) => n <= s.cfg.maxSol)
      .map((n) => ({ sol: n, weather: s.weather[n].type, storm: s.storms[n] || null }));
    s.earthCall = null;
  }
  drawHand(s);
}

function drawHand(s) {
  const ids = Object.keys(CARDS).filter((id) => CARDS[id].eligible(s));
  let hand = [];
  if (ids.includes("repair")) hand.push("repair");
  hand.push(...s.rng.shuffle(ids.filter((id) => id !== "repair")));
  hand = hand.slice(0, s.cfg.handSize);
  // Never deal a hand the player can't afford: keep at least one card with no battery cost.
  if (hand.every((id) => cardBatteryCost(id) > s.battery)) {
    const free = hand.findLastIndex((id) => id !== "repair");
    hand[free >= 0 ? free : hand.length - 1] = "rest";
  }
  s.hand = hand;
}

// ---------- player actions ----------
export const allocTotal = (s) => s.alloc.o2 + s.alloc.shield + s.alloc.lab;
export const batteryDraw = (s) => Math.max(0, allocTotal(s) - powerToday(s));
export const cardBatteryCost = (id) => (id && CARDS[id].batteryCost) || 0;

export function canAdd(s, slot) {
  if (s.alloc[slot] >= slotMax(s, slot)) return false;
  const nextDraw = Math.max(0, allocTotal(s) + 1 - powerToday(s));
  return nextDraw + cardBatteryCost(s.chosen) <= s.battery;
}

export function setAlloc(s, slot, n) {
  n = Math.max(0, Math.min(n, slotMax(s, slot)));
  const prev = s.alloc[slot];
  s.alloc[slot] = n;
  if (batteryDraw(s) + cardBatteryCost(s.chosen) > s.battery) {
    s.alloc[slot] = prev;
    return false;
  }
  return true;
}

export function canChoose(s, id) {
  return s.hand.includes(id) && batteryDraw(s) + cardBatteryCost(id) <= s.battery;
}

export function choose(s, id) {
  if (!canChoose(s, id)) return false;
  s.chosen = id;
  return true;
}

// What the player can expect by morning, ignoring storms and random events.
// Shown in the UI so kids can see the cost of a plan before committing.
export function previewNight(s) {
  const card = s.chosen;
  let o2 = Math.min(s.o2 + s.alloc.o2, s.cfg.caps.o2);
  let battery = Math.min(s.battery + Math.max(0, powerToday(s) - allocTotal(s)) - batteryDraw(s), s.cfg.caps.battery);
  battery -= cardBatteryCost(card);
  if (card === "eva" || card === "clean") o2 -= 1;
  o2 -= card === "rest" ? s.cfg.restBreathing : s.cfg.breathing;
  let cold = false;
  if (battery >= s.cfg.heater) battery -= s.cfg.heater;
  else {
    cold = true;
    battery = 0;
    o2 -= s.cfg.coldNightO2;
  }
  return { o2, battery, cold };
}

// ---------- night ----------
function makeReport(s) {
  const lines = [];
  return {
    sol: s.sol,
    lines,
    storm: null,
    events: [],
    facts: [],
    line(icon, text, delta = "", kind = "") {
      lines.push({ icon, text, delta, kind });
    },
  };
}

const clamp = (s) => {
  s.o2 = Math.min(s.o2, s.cfg.caps.o2);
  s.battery = Math.min(Math.max(s.battery, 0), s.cfg.caps.battery);
};

export function endSol(s) {
  if (s.over || !s.chosen) return null;
  const cfg = s.cfg;
  const r = makeReport(s);
  const power = powerToday(s);

  // 1. power
  const draw = batteryDraw(s);
  const spare = Math.max(0, power - allocTotal(s));
  s.battery += spare - draw;
  if (s.alloc.o2) r.line("🫁", `O₂ Maker made oxygen`, `+${s.alloc.o2} 🫁`);
  if (s.alloc.lab) r.line("🔬", `Lab experiments`, `+${s.alloc.lab} 🔬`);
  if (spare) r.line("🔋", `Spare solar power stored`, `+${spare} 🔋`);
  if (draw) r.line("🔋", `Used stored battery power`, `−${draw} 🔋`);
  s.o2 += s.alloc.o2;
  s.science += s.alloc.lab;
  if (s.alloc.o2) r.facts.push("moxie");
  clamp(s);

  // 2. action card
  const card = CARDS[s.chosen];
  card.apply(s, r);
  r.facts.push(card.fact);
  clamp(s);

  // 3. breathing
  const breath = s.resting ? cfg.restBreathing : cfg.breathing;
  s.o2 -= breath;
  r.line("😮‍💨", "Crew breathed through the night", `−${breath} 🫁`);

  // 4. heaters
  if (s.battery >= cfg.heater) {
    s.battery -= cfg.heater;
    r.line("🌡️", "Heaters kept the base warm", `−${cfg.heater} 🔋`);
  } else {
    s.battery = 0;
    s.o2 -= cfg.coldNightO2;
    r.line("🥶", "Battery empty! Cold night, life support struggled", `−${cfg.coldNightO2} 🫁`, "bad");
    r.facts.unshift("coldNights");
  }

  // 5. background cosmic rays
  if (s.sol % cfg.cosmicEvery === 0) {
    s.dose += 1;
    r.line("✨", "Cosmic rays from deep space", "+1 ☢️");
    r.facts.unshift("thinAir", "marsRadiation");
  }

  // 6. solar storm
  const storm = s.storms[s.sol];
  if (storm) {
    const blocked = Math.min(storm.dose, s.alloc.shield + s.berm);
    const taken = storm.dose - blocked;
    s.dose += taken;
    r.storm = { ...storm, blocked, taken };
    s.stormsFaced.push({ sol: s.sol, ...storm.event, blocked, taken, dose: storm.dose });
    r.line(
      "☀️",
      `Solar storm hit! Shield blocked ${blocked} of ${storm.dose}`,
      taken ? `+${taken} ☢️` : "0 ☢️",
      taken ? "bad" : "good",
    );
    r.stormFacts = [storm.event.date.startsWith("2017-09") ? "mars2017" : "cme", storm.surprise ? "forecast" : "radiationAddsUp"];
  } else if (s.alloc.shield) {
    r.line("🛡️", "Shield was ready, but no storm came tonight", "");
    r.facts.unshift("forecast");
  }

  // 7. random night event
  if (s.rng.next() < cfg.nightEventChance) {
    const roll = s.rng.int(1, 3);
    if (roll === 1 && !s.panelsClean && s.sol < cfg.maxSol) {
      s.panelsClean = true;
      r.line("🌀", "A dust devil blew the solar panels clean!", "+1 ⚡ later", "good");
      r.facts.unshift("dustDevil");
    } else if (roll === 2 && !s.o2Broken && s.sol < cfg.maxSol) {
      s.o2Broken = true;
      r.line("⚙️", "A part in the O₂ Maker broke", "O₂ Maker max 2", "bad");
      r.facts.unshift("moxie");
    } else if (roll === 3) {
      s.science += 1;
      r.line("🌋", "Your seismometer felt a marsquake", "+1 🔬", "good");
      r.facts.unshift("marsquake");
    }
  }
  if (s.sol < cfg.maxSol && s.weather[s.sol + 1].start) r.facts.unshift("dustStorm");
  if (r.stormFacts) r.facts.unshift(...r.stormFacts); // a storm night always explains the storm first

  clamp(s);
  s.dose = Math.min(s.dose, cfg.caps.dose);
  s.history.push(snapshot(s));

  // 8. win / lose
  if (s.o2 <= 0) finish(s, "o2");
  else if (s.dose >= cfg.caps.dose) finish(s, "dose");
  else if (s.sol >= cfg.maxSol) finish(s, "win");

  r.fact = r.facts.find((f) => !s.factsSeen.includes(f)) || r.facts[0] || "sol";
  if (!s.factsSeen.includes(r.fact)) s.factsSeen.push(r.fact);
  r.over = s.over;
  r.result = s.result;
  if (!s.over) startSol(s);
  return r;
}

function finish(s, cause) {
  s.over = true;
  s.o2 = Math.max(s.o2, 0);
  const stars = cause === "win" ? s.cfg.stars.filter((t) => s.science >= t).length : 0;
  s.result = { cause, stars, sol: s.sol, science: s.science };
}

export const describeWeather = {
  sunny: { icon: "☀️", label: "Clear sky" },
  hazy: { icon: "🌤️", label: "Dusty haze" },
  dust: { icon: "🌪️", label: "Dust storm" },
};

export const describeForecast = {
  calm: { icon: "🟢", label: "Space weather calm", detail: "No solar storm expected tonight." },
  watch: { icon: "🟡", label: "Storm watch", detail: "A solar storm might arrive in the next sol or two. Forecasts aren't perfect!" },
  warning: { icon: "🔴", label: "Storm warning", detail: "A solar storm is arriving tonight. Power up the shield!" },
};
