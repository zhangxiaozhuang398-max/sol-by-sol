// Mission debrief: explains WHY the mission ended, using the actual numbers from
// the player's own run. Pure logic (no DOM). Everything is returned as
// { key, params } so the UI can translate it; param names like `sols`, `site`
// and `sites` are expanded by tr() in i18n.js.

import { CONFIG as C } from "./config.js";
import { SITES } from "./sites.js";
import { o2FromPower } from "./game.js";

const m = (key, params = {}) => ({ key, params });
const lowSun = (h) => h.weather !== "sunny";

function analyzePower(g) {
  const H = g.history.slice(-5);
  const causes = [];
  const ghSols = H.filter((h) => lowSun(h) && h.alloc && h.alloc.gh).map((h) => h.sol);
  if (ghSols.length) causes.push({ v: ghSols.length * C.power.greenhouse, ...m("rep.power.gh", { sols: ghSols, power: ghSols.length * C.power.greenhouse }) });
  const o2Sols = H.filter((h) => lowSun(h) && h.alloc && h.alloc.o2 > 0 && h.oxygenMorning >= 40);
  const o2Power = o2Sols.reduce((a, h) => a + h.alloc.o2, 0);
  if (o2Power) causes.push({ v: o2Power, ...m("rep.power.o2", { sols: o2Sols.map((h) => h.sol), power: o2Power }) });
  const evaSols = H.filter((h) => h.evaPower > 0);
  const evaPower = evaSols.reduce((a, h) => a + h.evaPower, 0);
  if (evaPower) causes.push({ v: evaPower, ...m("rep.power.eva", { n: evaSols.reduce((a, h) => a + h.evas.length, 0), power: evaPower }) });
  const lost = H.reduce((a, h) => a + (C.weather[h.weather].solar - h.income), 0);
  if (lost >= 10) causes.push({ v: lost, ...m("rep.power.dirt", { worst: Math.min(...H.map((h) => h.panelBefore)), lost }) });
  const shieldWaste = H.filter((h) => h.alloc && h.alloc.shield && !h.solarStorm);
  if (shieldWaste.length) causes.push({ v: shieldWaste.length * C.power.shield, ...m("rep.power.shield", { sols: shieldWaste.map((h) => h.sol), power: shieldWaste.length * C.power.shield }) });
  causes.sort((a, b) => b.v - a.v);

  const lines = [];
  const ds = g.dustStorm;
  if (g.sol >= ds.start) {
    const h = g.history.find((x) => x.sol === ds.start);
    if (h) lines.push(m("rep.power.stormStart", { sol: ds.start, battery: h.batteryMorning }));
  }
  causes.slice(0, 2).forEach((c) => lines.push(m(c.key, c.params)));
  if (!causes.length && g.sol >= ds.start) {
    const days = Math.min(g.sol, ds.end) - ds.start + 1;
    lines.push(m("rep.power.stormLong", { days, solar: C.weather.dust.solar, per: C.power.lifeSupport - C.weather.dust.solar }));
  }
  return {
    title: m("rep.power.title", { sol: g.sol }),
    lines,
    tips: [m("tip.power.hazy"), m("tip.power.tank")],
  };
}

function analyzeOxygen(g) {
  const H = g.history.slice(-4);
  const avg = Math.round(H.reduce((a, h) => a + (h.alloc ? h.alloc.o2 : 0), 0) / H.length);
  const evaO2 = H.reduce((a, h) => a + h.evaOxygen, 0);
  const evas = H.reduce((a, h) => a + h.evas.length, 0);
  const lines = [m("rep.o2.avg", { n: H.length, avg, made: o2FromPower(avg), use: C.oxygenUse.crewDaily })];
  if (evas) lines.push(m("rep.o2.eva", { evas, o2: evaO2 }));
  const ghNights = H.filter((h) => h.alloc && h.alloc.gh).length;
  if (ghNights < H.length) lines.push(m("rep.o2.gh", { n: H.length - ghNights }));
  return {
    title: m("rep.o2.title", { sol: g.sol }),
    lines,
    tips: [m("tip.o2.steady", { power: 15, o2: o2FromPower(15) }), m("tip.o2.eva")],
  };
}

function analyzeFood(g) {
  const ghNights = g.history.filter((h) => h.alloc && h.alloc.gh).length;
  return {
    title: m("rep.food.title", { sol: g.sol }),
    lines: [
      m("rep.food.gh", { n: ghNights }),
      m("rep.food.need", { food: C.start.food, total: C.totalSols, need: C.totalSols - C.start.food }),
    ],
    tips: [m("tip.food.sunny"), m("tip.food.tend")],
  };
}

function analyzeDose(g) {
  const stormEvas = g.history.filter((h) => h.solarStorm && h.evas.length);
  const stormEvaDose = stormEvas.reduce((a, h) => a + h.evaDose, 0);
  const unshielded = g.history.filter((h) => h.solarStorm && h.alloc && !h.alloc.shield);
  const unshieldedDose = unshielded.reduce((a, h) => a + h.nightDose, 0);
  const evaDose = g.history.reduce((a, h) => a + h.evaDose, 0);
  const lines = [];
  if (stormEvaDose) lines.push(m("rep.dose.stormEva", { sols: stormEvas.map((h) => h.sol), dose: stormEvaDose }));
  if (unshieldedDose) lines.push(m("rep.dose.unshielded", { sols: unshielded.map((h) => h.sol), dose: unshieldedDose }));
  lines.push(m("rep.dose.eva", { dose: evaDose }));
  return {
    title: m("rep.dose.title", { sol: g.sol }),
    lines,
    tips: [m("tip.dose.plan"), m("tip.dose.shield", { power: C.power.shield })],
  };
}

function analyzeSuccess(g) {
  const stars = g.outcome.stars;
  const lines = [m("rep.win.sci", { sci: g.science, stars, off: C.stars.length - stars })];
  const ds = g.dustStorm;
  const dsH = g.history.filter((h) => h.sol >= ds.start && h.sol <= ds.end);
  if (dsH.length) {
    lines.push(m("rep.win.dust", { start: ds.start, end: ds.end, morning: dsH[0].batteryMorning, min: Math.min(...dsH.map((h) => h.battery)) }));
  }
  const ss = g.history.filter((h) => h.solarStorm);
  const safe = ss.filter((h) => h.alloc && h.alloc.shield && !h.evas.length).length;
  if (ss.length) lines.push(m("rep.win.storms", { n: ss.length, safe }));
  const tips = [];
  const next = C.stars[stars];
  if (next != null) tips.push(m("tip.win.star", { n: next - g.science }));
  const unvisited = SITES.filter((s) => !g.visits[s.id]);
  if (unvisited.length) tips.push(m("tip.win.unvisited", { n: unvisited.length, sites: unvisited.map((s) => s.id) }));
  if (!g.history.some((h) => h.called)) tips.push(m("tip.win.call"));
  if (!tips.length) tips.push(m("tip.win.again"));
  return { title: m("rep.win.title", { total: C.totalSols }), lines, tips };
}

export function buildReport(g) {
  const o = g.outcome;
  let r;
  if (o.success) r = analyzeSuccess(g);
  else if (o.reason === "power") r = analyzePower(g);
  else if (o.reason === "oxygen") r = analyzeOxygen(g);
  else if (o.reason === "food") r = analyzeFood(g);
  else r = analyzeDose(g);
  const H = g.history;
  r.stats = {
    sols: o.success ? C.totalSols : o.sol,
    science: g.science,
    evas: H.reduce((a, h) => a + h.evas.length, 0),
    sitesVisited: SITES.filter((s) => g.visits[s.id]).length,
    cleanings: H.filter((h) => h.cleaned).length,
    calls: H.filter((h) => h.called).length,
    ghNights: H.filter((h) => h.alloc && h.alloc.gh).length,
    maxDose: g.dose,
  };
  return r;
}
