// Pure game logic: no DOM. Used by the browser UI (main.js) and scripts/simulate.mjs.
//
// One Mars day (sol) has four phases:
//   briefing → day (3 action points: EVA on the map, clean panels, tend greenhouse,
//   call Earth) → night (split power) → settle (what changed + story cards)
//
// Four supplies to keep up: battery, oxygen, radiation dose (keep it low), food.
// Panel cleanliness is only known after the free daily check. Research (science)
// earns the stars and unlocks the technology line; Mission Control's daily
// orders give bonus research.
// All text is produced as { key, params } so the UI can translate it (i18n.js).

import { CONFIG as C } from "./config.js";
import { SITES, siteById } from "./sites.js";

export { CONFIG } from "./config.js";

// ---------- seeded random (state lives in g.rng so saves stay reproducible) ----------
function rand(g) {
  let t = (g.rng = (g.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (g, a, b) => a + Math.floor(rand(g) * (b - a + 1));
const chance = (g, p) => rand(g) < p;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- new mission ----------
export function newGame(pool, seed) {
  if (seed == null || Number.isNaN(seed)) seed = Math.floor(Math.random() * 2147483647);
  const s = C.start;
  const g = {
    seed,
    rng: seed | 0,
    sol: 1,
    phase: "briefing",
    battery: s.battery,
    oxygen: s.oxygen,
    dose: s.dose,
    food: s.food,
    panel: s.panel,
    science: 0,
    ap: C.actionPoints,
    weather: [],
    dustStorm: null,
    solarStorms: [],
    known: {}, // sols whose weather the crew knows
    inbox: [], // replies from Earth on their way
    mail: [], // replies that arrived this morning
    visits: {},
    lastAlloc: { o2: 15, gh: true, shield: false },
    today: null,
    morning: null,
    cardsSeen: {},
    pendingTeach: [],
    eventCards: [],
    tonightCards: [],
    tonightNotes: [],
    history: [],
    tasksDone: 0,
    outcome: null,
  };
  SITES.forEach((site) => (g.visits[site.id] = 0));
  genWeather(g);
  genSolarStorms(g, pool);
  g.lightMinutes = randInt(g, C.call.lightMinutes[0], C.call.lightMinutes[1]);
  queueCard(g, "sol", "teach");
  startSol(g);
  return g;
}

function genWeather(g) {
  const W = C.weatherGen;
  const N = C.totalSols;
  const w = new Array(N + 1).fill("sunny");
  for (let s = W.calmSols + 1; s <= N; s++) {
    const p = s >= W.seasonStartSol ? W.hazyChanceSeason : W.hazyChanceEarly;
    w[s] = chance(g, p) ? "hazy" : "sunny";
  }
  const start = randInt(g, W.dustStormStart[0], W.dustStormStart[1]);
  const len = randInt(g, W.dustStormLength[0], W.dustStormLength[1]);
  const end = Math.min(N, start + len - 1);
  for (let s = start; s <= end; s++) w[s] = "dust";
  w[start - 1] = "hazy"; // the day before a dust storm is always hazy (a hint!)
  g.weather = w;
  g.dustStorm = { start, end };
}

// Real DONKI events drive the two storms: a "big" CME makes a strong storm,
// small and medium ones make a moderate storm.
function genSolarStorms(g, pool) {
  const S = C.solarStorm;
  const strong = pool.filter((e) => e.strength === "big");
  const mild = pool.filter((e) => e.strength !== "big");
  const order = chance(g, 0.5) ? ["moderate", "strong"] : ["strong", "moderate"];
  g.solarStorms = S.windows.map((win, i) => {
    const sol = randInt(g, win[0], win[1]);
    const lead = randInt(g, S.warnLead[0], S.warnLead[1]);
    const strength = order[i];
    const src = (strength === "strong" ? strong : mild);
    const list = src.length ? src : pool;
    const e = list[randInt(g, 0, list.length - 1)];
    const event = { date: e.date, speedKmS: e.speedKmS, instrument: e.instrument, link: e.link, hadParticleStorm: !!e.hadParticleStorm, size: e.strength };
    return { sol, warnSol: Math.max(1, sol - lead), strength, event };
  });
}

// ---------- queries ----------
export const site = siteById;
export const weatherKey = (g, sol) => g.weather[sol];
export const weatherOf = (g, sol) => C.weather[g.weather[sol]];
export const solarStormOn = (g, sol) => g.solarStorms.find((s) => s.sol === sol) || null;
export const stormStrength = (storm) => (storm ? C.solarStorm.strengths[storm.strength] : null);
// ---------- technology line (config.tech) ----------
export const techOn = (g, id) => { const x = C.tech.find((k) => k.id === id); return !!x && g.science >= x.at; };
export const techsBetween = (from, to) => C.tech.filter((k) => k.at > from && k.at <= to); // unlocked when science went from → to
export const unlockedTechs = (g) => C.tech.filter((k) => g.science >= k.at);
export const nextTech = (g) => C.tech.find((k) => g.science < k.at) || null;
export const shieldCost = (g) => (g && techOn(g, "shelter") ? C.techEffects.shieldPower : C.power.shield);
export const o2PerStep = (g) => (g && techOn(g, "moxie2") ? C.techEffects.o2PerStep : C.oxygenGen.o2PerStep);
export const bonusPower = (g) => (g && techOn(g, "fission") ? C.techEffects.fissionPower : 0);

// Solar power from the weather and the panels' cleanliness (panel %).
export const incomeFor = (g, sol, panel) => Math.round((weatherOf(g, sol).solar * (panel == null ? g.panel : panel)) / 100);
// Everything that reaches the battery at sunset: solar + the fission plant once unlocked.
export const powerFor = (g, sol, panel) => incomeFor(g, sol, panel) + bonusPower(g);
export const maxPowerFor = (g, sol) => weatherOf(g, sol).solar + bonusPower(g); // with perfectly clean panels
export const expectedIncome = (g) => powerFor(g, g.sol);
export const isKnown = (g, sol) => !!g.known[sol];
export const activeWarnings = (g) => g.solarStorms.filter((s) => s.warnSol <= g.sol && s.sol >= g.sol);
export const warningKnown = (g, storm) => storm.warnSol <= g.sol;
export const o2FromPower = (p, g) => (p / C.oxygenGen.step) * o2PerStep(g);
export const nightCost = (alloc, g) =>
  C.power.lifeSupport + alloc.o2 + (alloc.gh ? C.power.greenhouse : 0) + (alloc.shield ? shieldCost(g) : 0);
export const starsFor = (science) => C.stars.filter((t) => science >= t).length;

// Which knowledge/story card goes with a real storm.
export function stormCardId(event) {
  if (event.date.startsWith("2017-09")) return "mars2017";
  if (event.date.startsWith("2024-05")) return "solar2024";
  return "cme";
}

const snapshot = (g) => ({ battery: g.battery, oxygen: g.oxygen, dose: g.dose, food: g.food, science: g.science, panel: g.panel });

// ---------- story cards ----------
// "event" cards pop up the night they happen; "teach" cards queue up, one per night.
// Card ids are keys of FACTS (facts.js). A card shows once per mission.
function queueCard(g, id, kind) {
  if (g.cardsSeen[id]) return;
  if (kind === "event") {
    if (!g.eventCards.includes(id)) g.eventCards.push(id);
  } else if (!g.pendingTeach.includes(id)) {
    g.pendingTeach.push(id);
  }
}

const addScience = (g, n) => { g.science += n; };

// ---------- daily orders from Mission Control ----------
// Every morning: a free routine (check the solar panels), one science order and
// one base order. Finishing an order earns bonus research (config.tasks).
function genTasks(g) {
  const tasks = [{ kind: "inspect", reward: 0 }];
  const storm = solarStormOn(g, g.sol);
  if (storm || weatherKey(g, g.sol) === "dust") {
    // storm days teach the opposite lesson: the best science is staying safe
    tasks.push({ kind: "shelter", why: storm ? "solar" : "dust", reward: C.tasks.shelter });
  } else {
    // the next unexplored site, nearer ones first; farther ones as the crew gains experience
    const allowed = g.sol <= 3 ? 1 : g.sol <= 7 ? 2 : 3;
    const left = SITES.filter((x) => !g.visits[x.id]).sort((a, b) => a.tier - b.tier);
    const pick = left.find((x) => x.tier <= allowed) || left[0];
    tasks.push(pick ? { kind: "sample", site: pick.id, reward: C.tasks.sample } : { kind: "anySample", reward: C.tasks.anySample });
  }
  let knownAhead = 0;
  for (let n = g.sol + 2; n <= Math.min(C.totalSols, g.sol + 4); n++) if (g.known[n]) knownAhead++;
  const foodShort = C.totalSols - g.sol + 1 - g.food;
  const base = g.sol >= C.totalSols ? "tend"
    : g.sol >= 2 && knownAhead < 2 ? "call"
    : foodShort > 0 ? "tend"
    : g.sol % 2 ? "tend" : "call";
  tasks.push({ kind: base, reward: C.tasks[base] });
  return tasks.map((k) => ({ ...k, done: false }));
}

// Mark finished orders and pay their bonus. `final` is sunset, when "stay
// inside" orders are judged.
function checkTasks(g, final = false) {
  const T = g.today;
  for (const k of T.tasks || []) {
    if (k.done) continue;
    const ok = k.kind === "inspect" ? T.inspected
      : k.kind === "sample" ? T.evas.some((e) => e.id === k.site)
      : k.kind === "anySample" ? T.evas.length > 0
      : k.kind === "tend" ? T.tended
      : k.kind === "call" ? T.called
      : k.kind === "shelter" ? final && T.evas.length === 0
      : false;
    if (!ok) continue;
    k.done = true;
    g.tasksDone = (g.tasksDone || 0) + 1;
    if (k.reward) {
      addScience(g, k.reward);
      T.log.push(no(`log.task.${k.kind}`, { site: k.site, n: k.reward }));
    }
  }
}

// ---------- phase 1: briefing ----------
function startSol(g) {
  g.phase = "briefing";
  g.ap = C.actionPoints;
  g.today = {
    evas: [], cleaned: false, tended: false, called: false, inspected: false,
    income: 0, overflow: 0, panelBefore: g.panel, batterySunset: null,
    alloc: null, nightDose: 0, dustDevil: false, log: [], tasks: [],
  };
  g.known[g.sol] = true;
  if (g.sol + 1 <= C.totalSols) g.known[g.sol + 1] = true;
  g.mail = g.inbox.filter((m) => m.arrives === g.sol);
  g.inbox = g.inbox.filter((m) => m.arrives !== g.sol);
  g.mail.forEach((m) => {
    m.forecast.forEach((s) => (g.known[s] = true));
    addScience(g, m.science);
    queueCard(g, "weatherFromOrbit", "teach");
  });
  if (activeWarnings(g).some((s) => s.sol >= g.sol)) queueCard(g, "forecast", "teach");
  g.today.tasks = genTasks(g);
  g.morning = snapshot(g);
}

// ---------- phase 2: day ----------
export function beginDay(g) {
  if (g.phase !== "briefing") return;
  g.phase = "day";
}

const no = (key, params = {}) => ({ key, params });

export function evaCost(g, id) {
  const st = siteById(id);
  const tier = C.evaTiers[st.tier];
  const storm = solarStormOn(g, g.sol);
  const visits = g.visits[id] || 0;
  const science = visits === 0 ? tier.science : Math.max(1, Math.round(tier.science * Math.pow(C.revisitFactor, visits)));
  return {
    ap: tier.ap, power: tier.power, oxygen: tier.oxygen,
    dose: storm ? stormStrength(storm).evaDose : tier.dose,
    normalDose: tier.dose, science, storm: !!storm, visits, tier: st.tier,
  };
}

export function checkEva(g, id) {
  const cost = evaCost(g, id);
  const res = { ok: true, reason: null, cost, warnings: [] };
  const bad = (reason) => ({ ...res, ok: false, reason });
  if (g.phase !== "day") return bad(no("reason.notDay"));
  if (g.ap < cost.ap) return bad(no("reason.needAp", { n: cost.ap }));
  if (g.battery < cost.power) return bad(no("reason.noPowerEva", { need: cost.power }));
  if (g.oxygen < cost.oxygen) return bad(no("reason.noO2Eva", { need: cost.oxygen }));
  if (cost.storm) res.warnings.push({ level: "danger", ...no("warn.evaStorm", { dose: cost.dose, normal: cost.normalDose }) });
  if (g.dose + cost.dose >= C.max.dose) res.warnings.push({ level: "danger", ...no("warn.evaDoseLimit") });
  const tonight = g.battery - cost.power + expectedIncome(g);
  if (tonight < C.power.lifeSupport) {
    res.warnings.push({ level: "danger", ...no("warn.evaPowerShort", { tonight, need: C.power.lifeSupport }) });
  } else if (tonight < C.power.lifeSupport + 15) {
    res.warnings.push({ level: "warn", ...no("warn.evaPowerLow", { tonight }) });
  }
  if (weatherKey(g, g.sol) === "dust") res.warnings.push({ level: "info", ...no("warn.evaDustVis") });
  if (cost.visits > 0) res.warnings.push({ level: "info", ...no("warn.evaRevisit", { n: cost.visits }) });
  return res;
}

export function doEva(g, id) {
  const chk = checkEva(g, id);
  if (!chk.ok) return chk;
  const c = chk.cost;
  g.ap -= c.ap;
  g.battery -= c.power;
  g.oxygen -= c.oxygen;
  g.dose += c.dose;
  addScience(g, c.science);
  g.visits[id] += 1;
  g.today.evas.push({ id, tier: c.tier, power: c.power, oxygen: c.oxygen, dose: c.dose, science: c.science, storm: c.storm });
  g.today.log.push(no("log.eva", { site: id, sci: c.science, power: c.power, o2: c.oxygen, dose: c.dose }));
  checkTasks(g);
  queueCard(g, siteById(id).fact, "teach");
  if (g.dose >= C.radiationCardAt) queueCard(g, "marsRadiation", "teach");
  if (g.dose >= C.radiationCardAt2) queueCard(g, "radiationAddsUp", "teach");
  if (g.dose >= C.max.dose) {
    recordHistory(g);
    fail(g, "dose");
  }
  return chk;
}

// Checking the panels is free, once a day: until then the crew does not know
// how much dust has settled on them (the UI hides the number).
export function checkInspect(g) {
  if (g.phase !== "day") return { ok: false, reason: no("reason.notDay") };
  if (g.today.inspected) return { ok: false, reason: no("reason.inspected") };
  return { ok: true };
}
export function inspectPanels(g) {
  const chk = checkInspect(g);
  if (!chk.ok) return chk;
  g.today.inspected = true;
  g.today.log.push(no("log.inspect", { panel: g.panel }));
  checkTasks(g);
  return { ok: true, panel: g.panel };
}

export function checkClean(g) {
  if (g.phase !== "day") return { ok: false, reason: no("reason.notDay") };
  if (g.ap < C.clean.ap) return { ok: false, reason: no("reason.noAp") };
  if (g.panel >= 100) return { ok: false, reason: no("reason.panelClean") };
  return { ok: true, gain: incomeFor(g, g.sol, 100) - incomeFor(g, g.sol) };
}
export function doClean(g) {
  const chk = checkClean(g);
  if (!chk.ok) return chk;
  g.ap -= C.clean.ap;
  const before = g.panel;
  g.panel = 100;
  g.today.cleaned = true;
  g.today.inspected = true; // you see the panels while you wipe them
  g.today.log.push(no("log.clean", { before, gain: chk.gain }));
  checkTasks(g);
  return chk;
}

export function checkTend(g) {
  if (g.phase !== "day") return { ok: false, reason: no("reason.notDay") };
  if (g.today.tended) return { ok: false, reason: no("reason.tended") };
  if (g.ap < C.tend.ap) return { ok: false, reason: no("reason.noAp") };
  return { ok: true };
}
export function doTend(g) {
  const chk = checkTend(g);
  if (!chk.ok) return chk;
  g.ap -= C.tend.ap;
  g.today.tended = true;
  addScience(g, C.greenhouse.tendScience);
  g.today.log.push(no("log.tend", { sci: C.greenhouse.tendScience, food: C.greenhouse.tendFood }));
  checkTasks(g);
  queueCard(g, "veggie", "teach");
  return chk;
}

export function checkCall(g) {
  if (g.phase !== "day") return { ok: false, reason: no("reason.notDay") };
  if (g.today.called) return { ok: false, reason: no("reason.called") };
  if (g.ap < C.call.ap) return { ok: false, reason: no("reason.noAp") };
  if (g.sol >= C.totalSols) return { ok: false, reason: no("reason.lastSol") };
  return { ok: true };
}
export function doCall(g) {
  const chk = checkCall(g);
  if (!chk.ok) return chk;
  g.ap -= C.call.ap;
  g.today.called = true;
  const forecast = [];
  for (let s = g.sol + 2; s <= Math.min(C.totalSols, g.sol + 1 + C.call.forecastDays); s++) forecast.push(s);
  g.inbox.push({ sent: g.sol, arrives: g.sol + 1, forecast, science: C.call.science });
  g.today.log.push(no("log.call", { min: g.lightMinutes }));
  checkTasks(g);
  queueCard(g, "commDelay", "teach");
  return chk;
}

// Sunset: the day's solar power joins the battery, panels get dusty, night begins.
export function endDay(g) {
  if (g.phase !== "day") return;
  checkTasks(g, true);
  const w = weatherOf(g, g.sol);
  const income = expectedIncome(g);
  // Power made today is "available tonight" and can exceed the battery cap;
  // only what is left after the night's spending is stored (up to the cap).
  g.battery += income;
  g.today.income = income;
  g.today.panelBefore = g.panel;
  g.panel = Math.max(0, g.panel - (techOn(g, "dustShield") ? Math.ceil(w.dust / 2) : w.dust));
  g.today.batterySunset = g.battery;
  if (g.panel <= C.dirtyPanelCardAt) queueCard(g, "insightEnd", "teach");
  g.phase = "night";
  if (g.battery < C.power.lifeSupport) {
    recordHistory(g);
    fail(g, "power");
  }
}

// ---------- phase 3: night ----------
export function previewNight(g, alloc) {
  const cost = nightCost(alloc, g);
  const storm = solarStormOn(g, g.sol);
  const ss = stormStrength(storm);
  const o2Made = o2FromPower(alloc.o2, g);
  const ghO2 = alloc.gh ? C.greenhouse.o2 : 0;
  const oxygenRaw = g.oxygen + o2Made + ghO2 - C.oxygenUse.crewDaily;
  const oxygen = clamp(oxygenRaw, 0, C.max.oxygen);
  const foodGain = alloc.gh ? C.greenhouse.food + (g.today.tended ? C.greenhouse.tendFood : 0) : 0;
  const food = g.food + foodGain - C.food.dailyUse;
  const doseGain = ss ? (alloc.shield ? ss.shielded : ss.unshielded) : C.dose.daily;
  const battery = Math.min(C.max.battery, g.battery - cost);
  const overflow = Math.max(0, g.battery - cost - C.max.battery);
  const nextSol = g.sol + 1;
  const hasNext = nextSol <= C.totalSols;
  const nextIncome = hasNext ? powerFor(g, nextSol, g.panel) : null;

  const w = [];
  const add = (level, key, params = {}) => w.push({ level, key, params });
  if (cost > g.battery) add("danger", "warn.overBudget", { cost, have: g.battery });
  if (overflow > 0) add("info", "warn.overflow", { overflow, max: C.max.battery });
  if (oxygenRaw < 0) add("danger", "warn.noAir");
  else if (oxygen < 20) add("warn", "warn.lowAir", { oxygen });
  if (oxygenRaw > C.max.oxygen) add("info", "warn.tankFull", { extra: oxygenRaw - C.max.oxygen });
  if (food < 0) add("danger", "warn.noFood");
  else if (food <= 2 && hasNext) add("warn", "warn.lowFood", { food });
  if (ss && !alloc.shield) add("warn", "warn.stormNoShield", { unshielded: ss.unshielded, shielded: ss.shielded });
  if (!ss && alloc.shield) add("info", "warn.shieldWaste");
  if (g.dose + doseGain >= C.max.dose) add("danger", "warn.doseLimit");
  if (hasNext && cost <= g.battery && battery + nextIncome < C.power.lifeSupport) {
    add("danger", "warn.tomorrowShort", { weather: weatherKey(g, nextSol), income: nextIncome });
  } else if (hasNext && weatherKey(g, nextSol) === "dust" && weatherKey(g, g.sol) !== "dust") {
    const perDay = C.power.lifeSupport - nextIncome;
    add("warn", "warn.stormComing", { income: nextIncome, per: perDay, need: perDay * 3 });
  }
  if (weatherKey(g, g.sol) === "dust" && (alloc.gh || alloc.o2 > 0) && g.oxygen >= 30) add("info", "warn.stormSaveHint");
  return {
    cost, battery, overflow, overBudget: cost > g.battery, o2Made, ghO2, oxygenRaw, oxygen,
    foodGain, food, doseGain, dose: g.dose + doseGain, storm, nextSol, hasNext, nextIncome, warnings: w,
  };
}

export function confirmNight(g, alloc) {
  if (g.phase !== "night") return { ok: false };
  const p = previewNight(g, alloc);
  if (p.overBudget) return { ok: false };
  const notes = [];
  g.battery = p.battery;
  g.today.overflow = p.overflow;
  g.oxygen = p.oxygen;
  g.food = Math.max(0, p.food);
  g.dose += p.doseGain;
  g.lastAlloc = { ...alloc };
  g.today.alloc = { ...alloc };
  g.today.nightDose = p.doseGain;

  if (alloc.o2 > 0) queueCard(g, "moxie", "teach");
  if (alloc.shield) queueCard(g, "regolith", "teach");
  if (g.sol >= 2) queueCard(g, "coldNights", "teach");
  if (g.dose >= C.radiationCardAt) queueCard(g, "marsRadiation", "teach");
  if (g.dose >= C.radiationCardAt2) queueCard(g, "radiationAddsUp", "teach");
  if (p.storm) {
    queueCard(g, stormCardId(p.storm.event), "event");
    notes.push(no(alloc.shield ? "note.shielded" : "note.unshielded", { dose: p.doseGain }));
  }
  if (weatherKey(g, g.sol) === "dust") queueCard(g, "dustStorm", "event");
  const dirt = 100 - g.panel;
  if (weatherKey(g, g.sol) !== "dust" && dirt >= C.dustDevil.minDirt && chance(g, C.dustDevil.chance)) {
    g.panel = 100;
    g.today.dustDevil = true;
    queueCard(g, "dustDevil", "event");
    notes.push(no("note.dustDevil"));
  }

  // Tonight's cards: every event card, or else one queued teaching card.
  const tonight = g.eventCards.splice(0);
  if (tonight.length === 0 && g.pendingTeach.length) tonight.push(g.pendingTeach.shift());
  tonight.forEach((id) => (g.cardsSeen[id] = true));
  g.tonightCards = tonight;
  g.tonightNotes = notes;

  recordHistory(g);
  const failReason = p.oxygenRaw < 0 ? "oxygen" : p.food < 0 ? "food" : g.dose >= C.max.dose ? "dose" : null;
  if (failReason) fail(g, failReason);
  else if (g.sol >= C.totalSols) succeed(g);
  else g.phase = "settle";
  return { ok: true };
}

// ---------- phase 4 → next sol ----------
export function nextSol(g) {
  if (g.phase !== "settle") return;
  g.sol += 1;
  g.tonightCards = [];
  g.tonightNotes = [];
  startSol(g);
}

// ---------- ending ----------
function fail(g, reason) {
  g.outcome = { success: false, reason, sol: g.sol };
  g.phase = "end";
}
function succeed(g) {
  g.outcome = { success: true, stars: starsFor(g.science), sol: g.sol };
  g.phase = "end";
}

function recordHistory(g) {
  const t = g.today;
  const prev = g.history.findIndex((h) => h.sol === g.sol);
  const storm = solarStormOn(g, g.sol);
  const entry = {
    sol: g.sol,
    weather: weatherKey(g, g.sol),
    panelBefore: t.panelBefore,
    income: t.income,
    overflow: t.overflow,
    batteryMorning: g.morning.battery,
    oxygenMorning: g.morning.oxygen,
    batterySunset: t.batterySunset,
    battery: g.battery,
    oxygen: g.oxygen,
    food: g.food,
    dose: g.dose,
    science: g.science,
    alloc: t.alloc,
    evas: t.evas.slice(),
    evaPower: t.evas.reduce((a, e) => a + e.power, 0),
    evaOxygen: t.evas.reduce((a, e) => a + e.oxygen, 0),
    evaDose: t.evas.reduce((a, e) => a + e.dose, 0),
    nightDose: t.nightDose,
    solarStorm: storm ? storm.strength : null,
    stormEvent: storm ? storm.event : null,
    cleaned: t.cleaned, tended: t.tended, called: t.called, dustDevil: t.dustDevil,
    inspected: t.inspected, tasks: (t.tasks || []).map((k) => ({ kind: k.kind, site: k.site, done: k.done })),
  };
  if (prev >= 0) g.history[prev] = entry;
  else g.history.push(entry);
}

export const WEATHER_ICONS = { sunny: "☀️", hazy: "🌫️", dust: "🌪️" };
