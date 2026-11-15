// Pure game logic: no DOM. Used by the browser UI (main.js), scripts/balance.html
// and scripts/simulate.mjs.
//
// One Mars day (sol) has four phases:
//   briefing → day (3 action points: EVA on the map, clean panels, tend greenhouse,
//   call Earth, repairs, building) → night (split power, a night event may
//   happen) → settle (what changed + story cards)
//
// Four supplies to keep up: battery, oxygen, radiation dose (keep it low), food.
// Panel cleanliness is only known after the free daily check. Research (science)
// earns the stars and unlocks blueprints; the crew builds them (action points +
// power) to get tools that reach new terrain and upgrades for the base.
//
// What the crew knows matters as much as what they have. The base only sees
// today's weather. Solar storms, the weather ahead and parts that are wearing
// out stay hidden unless the crew spends an action point to call Earth; the
// report arrives the next morning (see `receive`). The base gives a few hints of
// its own (radio static, an odd reading), but those can be wrong.
//
// The mission has three stages (config.stages), each with goals. Where the crew
// can go is set by its equipment (sites.js `needs`). All text is produced as
// { key, params } so the UI can translate it (i18n.js).

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
const no = (key, params = {}) => ({ key, params });

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
    faults: [], // parts that will wear out (hidden until Earth spots them, or they break)
    signs: { static: [], odd: [] }, // the base's own unreliable hints, per sol
    known: {}, // sols whose weather the crew knows
    sunUntil: 0, // Earth has watched the Sun for the crew through this sol
    lastTelemetry: 0, // the sol of the latest base data Earth has checked
    inbox: [], // reports from Earth on their way
    mail: [], // reports that arrived this morning
    reports: 0,
    request: null, // { site, until, bonus }: something Earth asked the crew to look at
    requestsDone: 0,
    visits: {},
    goals: {}, // stage goal id → the sol it was reached
    tendCount: 0,
    built: {}, // equipment the crew has built: tech id → sol
    repairs: 0,
    stormReady: null,
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
  genFaults(g);
  genSigns(g);
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
    const strength = order[i];
    const src = (strength === "strong" ? strong : mild);
    const list = src.length ? src : pool;
    const e = list[randInt(g, 0, list.length - 1)];
    const event = { date: e.date, speedKmS: e.speedKmS, instrument: e.instrument, link: e.link, hadParticleStorm: !!e.hadParticleStorm, size: e.strength };
    return { sol, strength, event, known: false };
  });
}

// Two different parts start to wear out, one in each window. `start` is the
// first sol Earth can see it in the base's data; at the dawn of `fail` it breaks.
function genFaults(g) {
  const F = C.faults;
  const kinds = F.kinds.slice();
  g.faults = F.windows.map((win) => {
    const kind = kinds.splice(randInt(g, 0, kinds.length - 1), 1)[0];
    const start = randInt(g, win[0], win[1]);
    return { kind, start, fail: start + F.fuse, known: false, fixed: false, broken: false };
  });
}

// The base's own hints: radio static the day before a solar storm, an odd
// reading the morning after a part starts to wear out. Both sometimes fail to
// show, and both sometimes show for no reason.
function genSigns(g) {
  const G = C.signs, N = C.totalSols;
  for (let sol = 1; sol <= N; sol++) {
    const stormTomorrow = g.solarStorms.some((s) => s.sol === sol + 1);
    const partYesterday = g.faults.some((f) => f.start === sol - 1);
    g.signs.static[sol] = chance(g, stormTomorrow ? G.staticChance : G.staticFalse);
    g.signs.odd[sol] = chance(g, partYesterday ? G.oddChance : G.oddFalse);
  }
}

// ---------- queries: the true state ----------
export const site = siteById;
export const weatherKey = (g, sol) => g.weather[sol];
export const weatherOf = (g, sol) => C.weather[g.weather[sol]];
export const solarStormOn = (g, sol) => g.solarStorms.find((s) => s.sol === sol) || null;
export const stormStrength = (storm) => (storm ? C.solarStorm.strengths[storm.strength] : null);
export const isBroken = (g, kind) => !!g && g.faults.some((f) => f.kind === kind && f.broken && !f.fixed);
export const ghOk = (g) => !isBroken(g, "greenhouse");

// ---------- queries: what the crew knows ----------
export const isKnown = (g, sol) => !!g.known[sol];
export const knownStormOn = (g, sol) => { const s = solarStormOn(g, sol); return s && s.known ? s : null; };
export const activeWarnings = (g) => g.solarStorms.filter((s) => s.known && s.sol >= g.sol);
export const warningKnown = (g, storm) => !!storm.known;
// "storm" | "clear" | "unknown" for a sol's space weather
export const spaceStatus = (g, sol) => (knownStormOn(g, sol) ? "storm" : sol <= g.sunUntil ? "clear" : "unknown");
// the last sol in an unbroken run of known weather, starting today
export function weatherKnownUntil(g) {
  let n = g.sol;
  while (n + 1 <= C.totalSols && g.known[n + 1]) n++;
  return n;
}
export const knownFaults = (g) => g.faults.filter((f) => f.known && !f.fixed);
export const knownFault = (g, kind) => knownFaults(g).find((f) => f.kind === kind) || null;
// Hints the base shows this morning. A hint is hidden once Earth's report already answers it.
export function hunches(g) {
  const N = C.totalSols;
  return {
    static: !!g.signs.static[g.sol] && g.sol < N && spaceStatus(g, g.sol + 1) === "unknown",
    odd: !!g.signs.odd[g.sol] && g.lastTelemetry < g.sol - 1 && knownFaults(g).length === 0,
  };
}

// ---------- stages and their goals ----------
export const stageOf = (g) => C.stages.find((st) => g.sol <= st.to) || C.stages[C.stages.length - 1];
export const tubeCount = (g) => SITES.filter((x) => g.visits[x.id] > 0).length;
const sampledTier = (g, tier) => SITES.some((x) => x.tier >= tier && g.visits[x.id] > 0);
const COUNT_GOALS = {
  tubes2: [tubeCount, 2], tubes6: [tubeCount, 6], tubes8: [tubeCount, 8],
  build1: [(g) => builtCount(g), 1], build3: [(g) => builtCount(g), 3],
};
const GOAL_TEST = {
  report1: (g) => g.reports >= 1,
  far1: (g) => sampledTier(g, 3),
  expedition1: (g) => sampledTier(g, 4),
  stormReady: (g) => g.stormReady === true,
  launch: (g) => !!(g.outcome && g.outcome.success),
};
for (const [id, [count, need]] of Object.entries(COUNT_GOALS)) GOAL_TEST[id] = (g) => count(g) >= need;
export const goalDone = (g, id) => !!g.goals[id];
// progress toward a goal as [have, need], for the goals that count something
export function goalProgress(g, id) {
  const c = COUNT_GOALS[id];
  return c ? [Math.min(c[1], c[0](g)), c[1]] : null;
}
function checkGoals(g) {
  for (const st of C.stages) {
    for (const id of st.goals) {
      if (g.goals[id] || !GOAL_TEST[id](g)) continue;
      g.goals[id] = g.sol;
      addScience(g, C.goals.reward);
      if (g.today) g.today.log.push(no("log.goal", { n: C.goals.reward }));
    }
  }
}

// ---------- technology line (config.tech): blueprints, then building ----------
export const techById = (id) => C.tech.find((k) => k.id === id) || null;
export const techOn = (g, id) => !!(g && g.built && g.built[id]); // built and working
export const blueprintReady = (g, id) => { const x = techById(id); return !!x && g.science >= x.at; };
export const techsBetween = (from, to) => C.tech.filter((k) => k.at > from && k.at <= to); // blueprints unlocked when research went from → to
export const unlockedTechs = (g) => C.tech.filter((k) => g.science >= k.at);
export const builtTechs = (g) => C.tech.filter((k) => techOn(g, k.id));
export const builtCount = (g) => builtTechs(g).length;
export const nextTech = (g) => C.tech.find((k) => g.science < k.at) || null;
// blueprints that are ready but not built yet
export const buildable = (g) => C.tech.filter((k) => g.science >= k.at && !techOn(g, k.id));
// research rewards (config.apBonus): one more action point a day for each total reached
export const apBonusCount = (g) => C.apBonus.filter((n) => g.science >= n).length;
export const maxAp = (g) => C.actionPoints + apBonusCount(g);
export const apBonusBetween = (from, to) => C.apBonus.filter((n) => n > from && n <= to);
export const nextApBonus = (g) => C.apBonus.find((n) => g.science < n) ?? null;

export function checkBuild(g, id) {
  const x = techById(id);
  if (!x) return { ok: false, reason: no("reason.noFault") };
  const res = { ok: true, ap: x.ap, power: x.power, reason: null };
  const bad = (reason) => ({ ...res, ok: false, reason });
  if (techOn(g, id)) return bad(no("reason.built"));
  if (g.science < x.at) return bad(no("reason.needResearch", { n: x.at - g.science }));
  if (g.phase !== "day") return bad(no("reason.notDay"));
  if (g.ap < x.ap) return bad(no("reason.needAp", { n: x.ap }));
  if (g.battery < x.power) return bad(no("reason.noPowerBuild", { need: x.power }));
  return res;
}
// Build it in the habitat workshop. It works from now on.
export function doBuild(g, id) {
  const chk = checkBuild(g, id);
  if (!chk.ok) return chk;
  g.ap -= chk.ap;
  g.battery -= chk.power;
  g.built[id] = g.sol;
  g.today.built = (g.today.built || []).concat(id);
  g.today.log.push(no("log.build", { tech: id }));
  checkTasks(g);
  checkGoals(g);
  return chk;
}

// The equipment a site's terrain calls for that the crew has not built yet.
export const missingGear = (g, id) => (siteById(id).needs || []).filter((k) => !techOn(g, k));
export const reachable = (g, id) => missingGear(g, id).length === 0;
export const shieldCost = (g) => (g && techOn(g, "shelter") ? C.techEffects.shieldPower : C.power.shield);
export const o2PerStep = (g) => (g && techOn(g, "moxie2") ? C.techEffects.o2PerStep : C.oxygenGen.o2PerStep) * (isBroken(g, "o2") ? C.faults.brokenO2 : 1);
export const bonusPower = (g) => (g && techOn(g, "fission") ? C.techEffects.fissionPower : 0);

// Solar power from the weather and the panels' cleanliness (panel %).
const solarFactor = (g) => (isBroken(g, "panels") ? C.faults.brokenSolar : 1);
export const incomeFor = (g, sol, panel) => Math.round((weatherOf(g, sol).solar * (panel == null ? g.panel : panel) * solarFactor(g)) / 100);
// Everything that reaches the battery at sunset: solar + the fission plant once unlocked.
export const powerFor = (g, sol, panel) => incomeFor(g, sol, panel) + bonusPower(g);
export const maxPowerFor = (g, sol) => incomeFor(g, sol, 100) + bonusPower(g); // with perfectly clean panels
export const expectedIncome = (g) => powerFor(g, g.sol);
export const o2FromPower = (p, g) => Math.round((p / C.oxygenGen.step) * o2PerStep(g));
export const nightCost = (alloc, g) =>
  C.power.lifeSupport + alloc.o2 + (alloc.gh && ghOk(g) ? C.power.greenhouse : 0) + (alloc.shield ? shieldCost(g) : 0);
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
  if (!id || g.cardsSeen[id]) return;
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
// Orders only use what the crew knows. Calling Earth is never an order: when
// to ask, and whether it is worth an action point, is the player's call.
function genTasks(g) {
  const tasks = [{ kind: "inspect", reward: 0 }];
  const storm = knownStormOn(g, g.sol);
  if (storm || weatherKey(g, g.sol) === "dust" || g.battery < C.tasks.lowPower) {
    // storm days and low-power days teach the opposite lesson: the best science is staying safe
    tasks.push({ kind: "shelter", why: storm ? "solar" : weatherKey(g, g.sol) === "dust" ? "dust" : "power", reward: C.tasks.shelter });
  } else {
    // Earth's request first; otherwise the next unexplored site the crew can
    // reach, nearer ones first. Expeditions (tier 4) are never ordered: they
    // are the crew's own plan.
    // only trips the battery can comfortably pay for: Mission Control does not
    // send the crew far when power is tight
    const ok = (x) => x.tier <= 3 && reachable(g, x.id) && g.battery >= 35 + C.evaTiers[x.tier].power * 1.5;
    const left = SITES.filter((x) => !g.visits[x.id] && ok(x)).sort((a, b) => a.tier - b.tier);
    const asked = g.request && ok(siteById(g.request.site)) ? siteById(g.request.site) : null;
    const pick = asked || left[0];
    tasks.push(pick ? { kind: "sample", site: pick.id, reward: C.tasks.sample } : { kind: "anySample", reward: C.tasks.anySample });
  }
  // base order: fix what Earth found; else look after the plants if food is
  // getting short; else build a ready blueprint (tools first); else the plants
  const fault = knownFaults(g)[0];
  const nightsLeft = C.totalSols - g.sol + 1;
  const hungry = g.food < nightsLeft && ghOk(g);
  const ready = g.battery >= 60 ? buildable(g) : []; // only when there is power to spare
  const build = ready.find((k) => SITES.some((x) => (x.needs || []).includes(k.id))) || ready[0];
  tasks.push(fault ? { kind: "repair", part: fault.kind, reward: C.tasks.repair }
    : build && !hungry ? { kind: "build", tech: build.id, reward: C.tasks.build }
    : { kind: "tend", reward: C.tasks.tend });
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
      : k.kind === "repair" ? T.repaired
      : k.kind === "build" ? (T.built || []).includes(k.tech)
      : k.kind === "shelter" ? final && T.evas.length === 0
      : false;
    if (!ok) continue;
    k.done = true;
    g.tasksDone = (g.tasksDone || 0) + 1;
    if (k.reward) {
      addScience(g, k.reward);
      T.log.push(no(`log.task.${k.kind}`, { site: k.site, tech: k.tech, n: k.reward }));
    }
  }
}

// ---------- a report from Earth arrives ----------
// Everything Earth can see that the base cannot. `m` stays in g.mail so the
// morning report can show it.
function receive(g, m) {
  const A = g.sol, N = C.totalSols;
  // weather from orbit (Mars Reconnaissance Orbiter)
  m.forecast = [];
  for (let n = A + 1; n <= Math.min(N, A + C.call.weatherDays); n++) { g.known[n] = true; m.forecast.push(n); }
  // the Sun (SOHO, STEREO): today and the next few sols
  m.sunUntil = Math.min(N, A + C.call.sunDays);
  g.sunUntil = Math.max(g.sunUntil, m.sunUntil);
  m.storms = g.solarStorms.filter((s) => s.sol >= A && s.sol <= m.sunUntil).map((s) => { s.known = true; return s.sol; });
  // engineers go through the base data sent with the call
  m.faults = g.faults.filter((f) => !f.fixed && f.start <= m.sent).map((f) => { f.known = true; return { kind: f.kind, fail: f.fail, broken: f.broken }; });
  g.lastTelemetry = Math.max(g.lastTelemetry, m.sent);
  // something spotted from orbit that is worth a trip
  m.request = null;
  if (!g.request && chance(g, C.request.chance)) {
    // somewhere the crew can get to, or could after building a blueprint they already have
    const gettable = (x) => missingGear(g, x.id).every((k) => blueprintReady(g, k));
    const open = SITES.filter((x) => !g.visits[x.id] && x.tier >= 2 && x.tier <= 3 && gettable(x));
    if (open.length) {
      const x = open[randInt(g, 0, open.length - 1)];
      g.request = { site: x.id, until: Math.min(N, A + C.request.days - 1), bonus: C.request.bonus };
      m.request = { ...g.request };
    }
  }
  addScience(g, m.science);
  g.reports += 1;
  queueCard(g, "dsn", "teach");
  queueCard(g, "weatherFromOrbit", "teach");
  if (m.storms.length) queueCard(g, "forecast", "teach");
}

// ---------- phase 1: briefing ----------
function startSol(g) {
  g.phase = "briefing";
  g.ap = maxAp(g);
  g.today = {
    evas: [], cleaned: false, tended: false, called: false, inspected: false, repaired: false,
    income: 0, overflow: 0, panelBefore: g.panel, batterySunset: null,
    alloc: null, nightDose: 0, dustDevil: false, alarm: false, log: [], tasks: [], broke: [], built: [], nightEvent: null,
  };
  g.known[g.sol] = true; // the crew can see today's sky for themselves
  // parts that were not fixed in time break at dawn
  for (const f of g.faults) {
    if (f.fixed || f.broken || f.fail > g.sol) continue;
    f.broken = true;
    f.known = true;
    g.today.broke.push(f.kind);
    const loss = C.faults.breakLoss[f.kind] || {};
    for (const key of Object.keys(loss)) g[key] = Math.max(0, g[key] - loss[key]);
  }
  if (g.request && g.request.until < g.sol) g.request = null; // Earth's request has passed
  g.mail = g.inbox.filter((m) => m.arrives === g.sol);
  g.inbox = g.inbox.filter((m) => m.arrives !== g.sol);
  g.mail.forEach((m) => receive(g, m));
  if (g.dustStorm.start === g.sol) g.stormReady = g.battery >= C.goals.stormBattery;
  g.today.tasks = genTasks(g);
  checkGoals(g);
  g.ap = maxAp(g); // research that arrived overnight counts for the reward today
  g.today.apGain = g.ap - (g.apMax || C.actionPoints); // >0 on the first morning with a research reward
  g.apMax = g.ap;
  g.morning = snapshot(g);
}

// ---------- phase 2: day ----------
export function beginDay(g) {
  if (g.phase !== "briefing") return;
  g.phase = "day";
}

// What a trip costs. `dose` is what the crew expects: if a solar storm is on
// its way that nobody warned them about, the real dose (`trueDose`) is higher.
export function evaCost(g, id) {
  const st = siteById(id);
  const tier = C.evaTiers[st.tier];
  const storm = solarStormOn(g, g.sol);
  const seen = !!(storm && storm.known);
  const trueDose = storm ? stormStrength(storm).evaDose : tier.dose;
  const visits = g.visits[id] || 0;
  const science = visits === 0 ? tier.science : Math.max(1, Math.round(tier.science * Math.pow(C.revisitFactor, visits)));
  return {
    ap: tier.ap, power: tier.power, oxygen: tier.oxygen,
    dose: seen ? trueDose : tier.dose, trueDose,
    normalDose: tier.dose, science, storm: seen, visits, tier: st.tier,
    bonus: g.request && g.request.site === id ? g.request.bonus : 0,
  };
}

export function checkEva(g, id) {
  const cost = evaCost(g, id);
  const res = { ok: true, reason: null, cost, warnings: [] };
  const bad = (reason) => ({ ...res, ok: false, reason });
  if (g.phase !== "day") return bad(no("reason.notDay"));
  const missing = missingGear(g, id);
  if (missing.length) return bad(no("reason.needsGear", { tech: missing[0] }));
  if (g.ap < cost.ap) return bad(no("reason.needAp", { n: cost.ap }));
  if (g.battery < cost.power) return bad(no("reason.noPowerEva", { need: cost.power }));
  if (g.oxygen < cost.oxygen) return bad(no("reason.noO2Eva", { need: cost.oxygen }));
  if (cost.storm) res.warnings.push({ level: "danger", ...no("warn.evaStorm", { dose: cost.dose, normal: cost.normalDose }) });
  else if (spaceStatus(g, g.sol) === "unknown" && cost.tier >= 3) res.warnings.push({ level: "warn", ...no("warn.evaBlind") });
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

// Returns the check result with the dose really received in cost.dose, and
// `surprise: true` when an unannounced solar storm caught the crew outside.
export function doEva(g, id) {
  const chk = checkEva(g, id);
  if (!chk.ok) return chk;
  const c = { ...chk.cost, dose: chk.cost.trueDose };
  const storm = solarStormOn(g, g.sol);
  const surprise = !!storm && !storm.known;
  g.ap -= c.ap;
  g.battery -= c.power;
  g.oxygen -= c.oxygen;
  g.dose += c.dose;
  addScience(g, c.science);
  g.visits[id] += 1;
  g.today.evas.push({ id, tier: c.tier, power: c.power, oxygen: c.oxygen, dose: c.dose, science: c.science, storm: !!storm });
  g.today.log.push(no("log.eva", { site: id, sci: c.science, power: c.power, o2: c.oxygen, dose: c.dose }));
  if (surprise) { // the suit's dosimeter goes off: now everyone knows
    storm.known = true;
    g.today.alarm = true;
    g.today.log.push(no("log.stormSurprise", { dose: c.dose, normal: c.normalDose }));
    queueCard(g, "forecast", "teach");
  }
  if (c.bonus) { // this is what Earth asked for
    addScience(g, c.bonus);
    g.requestsDone += 1;
    g.request = null;
    g.today.log.push(no("log.request", { site: id, n: c.bonus }));
  }
  checkTasks(g);
  checkGoals(g);
  queueCard(g, siteById(id).fact, "teach");
  if (g.dose >= C.radiationCardAt) queueCard(g, "marsRadiation", "teach");
  if (g.dose >= C.radiationCardAt2) queueCard(g, "radiationAddsUp", "teach");
  if (g.dose >= C.max.dose) {
    recordHistory(g);
    fail(g, "dose");
  }
  return { ...chk, cost: c, surprise };
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
  if (!ghOk(g)) return { ok: false, reason: no("reason.ghBroken") };
  if (g.today.tended) return { ok: false, reason: no("reason.tended") };
  if (g.ap < C.tend.ap) return { ok: false, reason: no("reason.noAp") };
  return { ok: true };
}
export function doTend(g) {
  const chk = checkTend(g);
  if (!chk.ok) return chk;
  g.ap -= C.tend.ap;
  g.today.tended = true;
  g.tendCount += 1;
  addScience(g, C.greenhouse.tendScience);
  g.today.log.push(no("log.tend", { sci: C.greenhouse.tendScience, food: C.greenhouse.tendFood }));
  checkTasks(g);
  checkGoals(g);
  queueCard(g, "veggie", "teach");
  return chk;
}

// Call Earth: send the base's data and ask what is coming. The report arrives
// tomorrow morning (see `receive`). It may also say "all clear".
export function checkCall(g) {
  if (g.phase !== "day") return { ok: false, reason: no("reason.notDay") };
  if (isBroken(g, "antenna")) return { ok: false, reason: no("reason.antennaBroken") };
  if (g.today.called) return { ok: false, reason: no("reason.called") };
  if (g.today.blackout) return { ok: false, reason: no("reason.blackout") };
  if (g.ap < C.call.ap) return { ok: false, reason: no("reason.noAp") };
  if (g.sol >= C.totalSols) return { ok: false, reason: no("reason.lastSol") };
  return { ok: true };
}
// On the day a solar storm hits, its particles block the radio ("radio
// blackout"): the call does not get through and costs nothing, but the static
// tells the crew a storm is here.
export function doCall(g) {
  const chk = checkCall(g);
  if (!chk.ok) return chk;
  const storm = solarStormOn(g, g.sol);
  if (storm) {
    storm.known = true;
    g.today.blackout = true;
    g.today.log.push(no("log.blackout"));
    queueCard(g, "blackout", "teach");
    return { ok: false, blackout: true, reason: no("reason.blackout") };
  }
  g.ap -= C.call.ap;
  g.today.called = true;
  g.inbox.push({ sent: g.sol, arrives: g.sol + 1, science: C.call.science });
  g.today.log.push(no("log.call", { min: g.lightMinutes }));
  queueCard(g, "commDelay", "teach");
  return chk;
}

// Fix a part Earth has warned about (or one that has already broken, which
// takes longer). `kind`: "panels" | "greenhouse" | "antenna" | "o2".
export function checkRepair(g, kind) {
  const f = knownFault(g, kind);
  if (!f) return { ok: false, reason: no("reason.noFault") };
  const ap = f.broken ? C.faults.brokenAp : C.faults.repairAp;
  if (g.phase !== "day") return { ok: false, ap, fault: f, reason: no("reason.notDay") };
  if (g.ap < ap) return { ok: false, ap, fault: f, reason: no("reason.needAp", { n: ap }) };
  return { ok: true, ap, fault: f };
}
export function doRepair(g, kind) {
  const chk = checkRepair(g, kind);
  if (!chk.ok) return chk;
  const wasBroken = chk.fault.broken;
  g.ap -= chk.ap;
  chk.fault.fixed = true;
  chk.fault.broken = false;
  g.repairs += 1;
  g.today.repaired = true;
  g.today.log.push(no(wasBroken ? "log.repairBroken" : "log.repair", { part: kind }));
  checkTasks(g);
  return { ...chk, wasBroken };
}

// Sunset: the day's solar power joins the battery, panels get dusty, night begins.
export function endDay(g) {
  if (g.phase !== "day") return;
  checkTasks(g, true);
  const storm = solarStormOn(g, g.sol);
  if (storm && !storm.known) { // the base's radiation alarm goes off at dusk
    storm.known = true;
    g.today.alarm = true;
  }
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
  const gh = alloc.gh && ghOk(g);
  const storm = solarStormOn(g, g.sol); // known by now: the alarm rang at dusk
  const ss = stormStrength(storm);
  const o2Made = o2FromPower(alloc.o2, g);
  const ghO2 = gh ? C.greenhouse.o2 : 0;
  const oxygenRaw = g.oxygen + o2Made + ghO2 - C.oxygenUse.crewDaily;
  const oxygen = clamp(oxygenRaw, 0, C.max.oxygen);
  const foodGain = gh ? C.greenhouse.food + (g.today.tended ? C.greenhouse.tendFood : 0) : 0;
  const food = g.food + foodGain - C.food.dailyUse;
  const doseGain = ss ? (alloc.shield ? ss.shielded : ss.unshielded) : C.dose.daily;
  const battery = Math.min(C.max.battery, g.battery - cost);
  const overflow = Math.max(0, g.battery - cost - C.max.battery);
  const nextSol = g.sol + 1;
  const hasNext = nextSol <= C.totalSols;
  const nextKnown = hasNext && isKnown(g, nextSol); // only if Earth sent a forecast
  const nextIncome = nextKnown ? powerFor(g, nextSol, g.panel) : null;

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
  if (nextKnown && cost <= g.battery && battery + nextIncome < C.power.lifeSupport) {
    add("danger", "warn.tomorrowShort", { weather: weatherKey(g, nextSol), income: nextIncome });
  } else if (nextKnown && weatherKey(g, nextSol) === "dust" && weatherKey(g, g.sol) !== "dust") {
    const perDay = C.power.lifeSupport - nextIncome;
    add("warn", "warn.stormComing", { income: nextIncome, per: perDay, need: perDay * 3 });
  } else if (hasNext && !nextKnown && cost <= g.battery && battery < C.power.lifeSupport + 10) {
    add("warn", "warn.blindLow", { battery });
  }
  if (weatherKey(g, g.sol) === "dust" && (gh || alloc.o2 > 0) && g.oxygen >= 30) add("info", "warn.stormSaveHint");
  return {
    cost, battery, overflow, overBudget: cost > g.battery, o2Made, ghO2, oxygenRaw, oxygen,
    foodGain, food, doseGain, dose: g.dose + doseGain, storm, nextSol, hasNext, nextKnown, nextIncome, warnings: w,
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
  g.today.alloc = { ...alloc, gh: alloc.gh && ghOk(g) };
  g.today.nightDose = p.doseGain;

  if (alloc.o2 > 0) queueCard(g, "moxie", "teach");
  if (alloc.shield) queueCard(g, "regolith", "teach");
  if (g.sol >= 2) queueCard(g, "coldNights", "teach");
  if (g.dose >= C.radiationCardAt) queueCard(g, "marsRadiation", "teach");
  if (g.dose >= C.radiationCardAt2) queueCard(g, "radiationAddsUp", "teach");
  if (p.storm) {
    queueCard(g, stormCardId(p.storm.event), "event");
    queueCard(g, "aurora", "teach"); // the aurora that night
    notes.push(no(alloc.shield ? "note.shielded" : "note.unshielded", { dose: p.doseGain }));
  }
  if (weatherKey(g, g.sol) === "dust") queueCard(g, "dustStorm", "event");
  const dirt = 100 - g.panel;
  if (weatherKey(g, g.sol) !== "dust" && dirt >= C.dustDevil.minDirt && chance(g, C.dustDevil.chance)) {
    g.panel = 100;
    g.today.dustDevil = true;
    queueCard(g, "dustDevil", "event");
    notes.push(no("note.dustDevil"));
  } else if (weatherKey(g, g.sol) !== "dust" && g.sol < C.totalSols) {
    nightEvent(g, notes);
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

// Something that happens in the night (config.nightEvents). Shown in the night
// report; its effects carry into tomorrow.
function nightEvent(g, notes) {
  const NE = C.nightEvents;
  if (!chance(g, NE.chance)) return;
  const total = Object.values(NE.weights).reduce((a, b) => a + b, 0);
  let r = rand(g) * total, kind = "wind";
  for (const [k, w] of Object.entries(NE.weights)) { if ((r -= w) < 0) { kind = k; break; } }
  if (kind === "wind") { // a windy night blows dust onto the panels
    const lost = techOn(g, "dustShield") ? Math.ceil(NE.wind / 2) : NE.wind;
    g.panel = Math.max(0, g.panel - lost);
    notes.push(no("note.wind", { n: lost }));
    queueCard(g, "insightEnd", "event");
  } else if (kind === "cold") { // a cold snap: the heaters work harder
    g.battery = Math.max(0, g.battery - NE.cold);
    notes.push(no("note.cold", { n: NE.cold }));
    queueCard(g, "coldNights", "event");
  } else if (kind === "quake") { // the base shook: a part may have been shaken loose (hidden, like a worn part)
    const used = new Set(g.faults.filter((f) => !f.fixed).map((f) => f.kind));
    const free = C.faults.kinds.filter((k) => !used.has(k));
    if (free.length) {
      const kindHit = free[randInt(g, 0, free.length - 1)];
      g.faults.push({ kind: kindHit, start: g.sol, fail: g.sol + 1 + C.faults.fuse, known: false, fixed: false, broken: false, quake: true });
    }
    notes.push(no("note.quake"));
    queueCard(g, "marsquake", "event");
  } else { // a meteor streaks across the sky and the cameras catch it
    addScience(g, NE.meteor);
    notes.push(no("note.meteor", { n: NE.meteor }));
    queueCard(g, "meteorite", "event");
  }
  g.today.nightEvent = kind;
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
  g.outcome = { success: true, stars: 1, sol: g.sol };
  g.phase = "end";
  checkGoals(g); // "launch" is the last stage goal
  g.outcome.stars = starsFor(g.science);
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
    inspected: t.inspected, repaired: t.repaired, alarm: t.alarm, broke: (t.broke || []).slice(),
    built: (t.built || []).slice(), nightEvent: t.nightEvent || null, blackout: !!t.blackout,
    tasks: (t.tasks || []).map((k) => ({ kind: k.kind, site: k.site, done: k.done })),
  };
  if (prev >= 0) g.history[prev] = entry;
  else g.history.push(entry);
}

export const WEATHER_ICONS = { sunny: "☀️", hazy: "🌫️", dust: "🌪️" };
