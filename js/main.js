import * as E from "./game.js";
import { CONFIG as C } from "./config.js";
import { SITES, BASE, RINGS, WORLD_BASE, siteById } from "./sites.js";
import { createWorld as createWorld2D } from "./world2d.js";
import { FACTS } from "./facts.js";
import { buildReport } from "./report.js";
import { t, tr, pick, getLang, setLang, applyStatic } from "./i18n.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = (n) => n.toLocaleString(getLang() === "zh" ? "zh-CN" : "en-US");
const sign = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");
const N = C.totalSols;
const PHASES = ["briefing", "day", "night", "settle"];
const WORLD_QUERY = new URLSearchParams(location.search).get("world");
const WORLD_MODE = WORLD_QUERY === "2d" ? "2d" : "3d";

// The 3D base is at human scale (metres), not the 2D map's 463 m cells. The
// numbers mirror the 2D base diagram so the two views feel like the same place.
const BASE3D = {
  spawn: { x: 0, z: 11.5, heading: Math.PI },
  stations: [
    { id: "habitat", kind: "habitat", icon: "🏠", x: 0, z: 0, r: 2.2, model: "habitat", solid: 2.0, labelY: 6.6 },
    { id: "panels", kind: "panels", icon: "🔆", x: 5.4, z: -1.2, r: 2.8, model: "panels", solid: 1.2, labelY: 3.8 },
    { id: "greenhouse", kind: "greenhouse", icon: "🌱", x: -5.3, z: -1.2, r: 2.8, model: "greenhouse", solid: 1.2, labelY: 4.3 },
    { id: "antenna", kind: "antenna", icon: "📡", x: 9.5, z: -1.4, r: 2.4, model: "dish", solid: 0.9, labelY: 8.2 },
  ],
};
const SITE3D = {
  spawn: { x: 0, z: 10, heading: Math.PI },
  target: { x: 0, z: -4, r: 3, labelY: 3.2 },
};
const wIcon = (key) => E.WEATHER_ICONS[key];
const wName = (key) => t(`weather.${key}`);

let pool = [];
let s = null; // current mission
let ui = freshUi();
function freshUi() {
  return { site: null, alloc: null, prevHud: null, lastPhase: null, classic: false, worldDay: null, place: "base", loading: false };
}
const stage = $("#stage");

// ---------- saving (per browser, optional) ----------
const SAVE_KEY = "solbysol.save";
const SAVE_V = 2;
const COLL_KEY = "solbysol.knowledge";
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_V, g: s })); } catch { /* storage blocked: fine */ }
}
function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    return data && data.v === SAVE_V && data.g && data.g.phase !== "end" ? data.g : null;
  } catch { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
function loadCollection() {
  try { return JSON.parse(localStorage.getItem(COLL_KEY)) || []; } catch { return []; }
}
function saveCollection(ids) {
  try { localStorage.setItem(COLL_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

// ---------- helpers ----------
function show(id) {
  $$(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
  if (world && id !== "screen-game") world.stop();
  window.scrollTo({ top: 0 });
}
const activeScreen = () => $(".screen.active")?.id;

function factHtml(id, label = "", withLesson = false) {
  const f = FACTS[id];
  if (!f) return "";
  return `${label ? `<div class="label">${esc(label)}</div>` : ""}
    <h3>${f.icon} ${esc(pick(f.title))}</h3><p>${esc(pick(f.text))}</p>
    ${withLesson && f.lesson ? `<p class="lesson">🎮 ${esc(pick(f.lesson))}</p>` : ""}
    <p class="src">${esc(t("fact.source"))} <a href="${f.source.url}" target="_blank" rel="noopener">${esc(pick(f.source.label))} ↗</a></p>`;
}
function openInfo(html) {
  $("#info-body").innerHTML = html;
  $("#info").showModal();
}

function alertHtml(list) {
  if (!list.length) return "";
  return `<div class="alerts">${list.map((a) => `<div class="alert ${a.level}"><span class="tag">${esc(t(`alert.${a.level}`))}</span><span>${tr(a.key, a.params)}</span></div>`).join("")}</div>`;
}

// ---------- rendering: shared ----------
function render() {
  renderTop();
  renderHud();
  renderCalendar();
  const phaseKey = `${s.sol}-${s.phase}`;
  syncWorld();
  renderStage();
  if (ui.lastPhase !== phaseKey) {
    stage.scrollTop = 0;
    if (ui.lastPhase !== null) window.scrollTo({ top: 0 });
    ui.lastPhase = phaseKey;
  }
  save();
}

function renderTop() {
  $("#sol-label").textContent = s.phase === "end" ? t("top.over", { n: s.outcome.sol }) : `${t("game.sol", { n: s.sol })} / ${N}`;
  const idx = PHASES.indexOf(s.phase);
  $$("#stepper li").forEach((li, i) => {
    li.classList.toggle("active", i === idx);
    li.classList.toggle("done", s.phase === "end" || i < idx);
  });
}

const nightsLeft = () => N - s.sol + (s.phase === "settle" || s.phase === "end" ? 0 : 1);

function renderHud() {
  const prev = ui.prevHud || {};
  const nights = nightsLeft();
  const foodShort = nights - s.food;
  let batteryNote = "";
  if (s.phase === "day") batteryNote = t("hud.note.batteryDay", { n: E.expectedIncome(s) });
  if (s.phase === "night") batteryNote = t("hud.note.batteryNight", { n: s.today.income });
  const items = [
    { key: "battery", icon: "⚡", val: s.battery, max: C.max.battery, c: "var(--blue)", note: batteryNote, fact: "coldNights" },
    { key: "oxygen", icon: "🫁", val: s.oxygen, max: C.max.oxygen, c: "var(--teal)", fact: "moxie",
      note: t(s.oxygen < 25 ? "hud.note.o2low" : "hud.note.o2", { n: C.oxygenUse.crewDaily }), bad: s.oxygen < 25 },
    { key: "dose", icon: "☢️", val: s.dose, max: C.max.dose, c: "var(--red)", fact: "radiationAddsUp",
      note: t(s.dose >= 70 ? "hud.note.doseHigh" : "hud.note.dose"), bad: s.dose >= 70 },
    { key: "food", icon: "🥫", val: s.food, unit: t("unit.days"), max: N, c: "var(--green)", fact: "veggie",
      note: nights <= 0 ? "" : foodShort > 0 ? t("hud.note.foodShort", { n: foodShort }) : t("hud.note.foodOk"), bad: foodShort > 0 },
  ];
  let html = items.map((it) => {
    const pct = Math.max(0, Math.min(100, (it.val / it.max) * 100));
    const flash = prev[it.key] != null && prev[it.key] !== it.val ? " flash" : "";
    const unit = it.unit ? `<small>${esc(it.unit)}</small>`
      : it.key === "battery" && it.val > it.max ? `<small>${esc(t("hud.avail"))}</small>` : `<small>/${it.max}</small>`;
    return `<div class="res${flash}" style="--c:${it.c}">
      <div class="res-head"><span class="res-icon" aria-hidden="true">${it.icon}</span><span class="res-name">${esc(t(`hud.${it.key}`))}</span>
      <span class="res-val">${it.val}${unit}</span>
      <button class="info" data-fact="${it.fact}" aria-label="${esc(t("hud.info"))}">?</button></div>
      <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
      ${it.note ? `<div class="res-note${it.bad ? " bad" : ""}">${it.note}</div>` : ""}
    </div>`;
  }).join("");
  const starsGot = E.starsFor(s.science);
  html += `<div class="res-divider"></div>
    <div class="res${prev.panel != null && prev.panel !== s.panel ? " flash" : ""}" style="--c:var(--muted)">
      <div class="res-head"><span class="res-icon" aria-hidden="true">🔆</span><span class="res-name">${esc(t("hud.panel"))}</span><span class="res-val">${s.panel}<small>%</small></span>
      <button class="info" data-fact="dustDevil" aria-label="${esc(t("hud.info"))}">?</button></div>
      <div class="bar thin"><div class="fill" style="width:${s.panel}%"></div></div>
    </div>
    <div class="res${prev.science != null && prev.science !== s.science ? " flash" : ""}" style="--c:var(--violet)">
      <div class="res-head"><span class="res-icon" aria-hidden="true">🔬</span><span class="res-name">${esc(t("hud.science"))}</span><span class="res-val">${s.science}</span></div>
      <div class="bar thin"><div class="fill" style="width:${Math.min(100, (s.science / C.stars[2]) * 100)}%"></div>
        <div class="tick" style="left:${(C.stars[1] / C.stars[2]) * 100}%"></div></div>
      <div class="stars-row">
        <span class="${starsGot >= 1 ? "got" : ""}">${esc(t("hud.star1", { n: N }))}</span>
        <span class="${starsGot >= 2 ? "got" : ""}">⭐⭐ ${C.stars[1]}</span>
        <span class="${starsGot >= 3 ? "got" : ""}">⭐⭐⭐ ${C.stars[2]}</span>
      </div>
    </div>`;
  $("#hud").innerHTML = html;
  ui.prevHud = { battery: s.battery, oxygen: s.oxygen, dose: s.dose, food: s.food, panel: s.panel, science: s.science };
}

function renderCalendar() {
  let html = "";
  for (let n = 1; n <= N; n++) {
    const known = E.isKnown(s, n);
    const key = E.weatherKey(s, n);
    const storm = s.solarStorms.find((x) => x.sol === n && E.warningKnown(s, x));
    const cls = ["sol", n < s.sol || s.phase === "end" ? "past" : "", n === s.sol && s.phase !== "end" ? "today" : "", known ? "" : "unknown"].join(" ");
    const label = known ? t("cal.tip", { n, weather: wName(key) }) : t("cal.tipUnknown", { n });
    html += `<div class="${cls}" title="${esc(label)}${storm ? esc(t("cal.tipStorm")) : ""}">
      <span class="w" aria-hidden="true">${known ? wIcon(key) : "?"}</span>${n}
      ${storm ? '<span class="flare" aria-hidden="true">☀️</span>' : ""}</div>`;
  }
  $("#sols").innerHTML = html;
}

function renderStage() {
  if (s.phase !== "day") stage.classList.remove("compact");
  // The floating panel is hidden while the player walks around; the sidebar's
  // "today" box is only used then.
  const walkingDay = s.phase === "day" && walking();
  stage.classList.toggle("hidden", walkingDay);
  if (!walkingDay) $("#side-day").innerHTML = "";
  if (s.phase === "briefing") renderBriefing();
  else if (s.phase === "day") renderDay();
  else if (s.phase === "night") renderNight();
  else if (s.phase === "settle") renderSettle();
  else showEnd();
}

// ---------- phase 1: briefing ----------
function realStormLine(storm) {
  return t("brief.space.real", { date: esc(storm.event.date), speed: num(storm.event.speedKmS) });
}

function renderBriefing() {
  const key = E.weatherKey(s, s.sol);
  const inc = E.expectedIncome(s);
  const hasTomorrow = s.sol < N;
  const tKey = hasTomorrow ? E.weatherKey(s, s.sol + 1) : null;
  const stormToday = E.solarStormOn(s, s.sol);
  const upcoming = E.activeWarnings(s).filter((x) => x.sol > s.sol);

  let space;
  if (stormToday) {
    const ss = E.stormStrength(stormToday);
    space = `<div class="brief-card danger"><div class="label">${esc(t("brief.space"))}</div><div class="big">☢️</div>
      <div class="name">${esc(t("brief.space.today"))}</div>
      <div class="detail">${tr("brief.space.today.detail", { sstrength: stormToday.strength, evaDose: ss.evaDose, shielded: ss.shielded, unshielded: ss.unshielded })}<br>${realStormLine(stormToday)}</div></div>`;
  } else if (upcoming.length) {
    const u = upcoming[0];
    space = `<div class="brief-card warn"><div class="label">${esc(t("brief.space"))}</div><div class="big">⚠️</div>
      <div class="name">${esc(t("brief.space.warn"))}</div>
      <div class="detail">${tr("brief.space.warn.detail", { sol: u.sol, sstrength: u.strength })}<br>${realStormLine(u)}</div></div>`;
  } else {
    space = `<div class="brief-card"><div class="label">${esc(t("brief.space"))}</div><div class="big">🌞</div>
      <div class="name">${esc(t("brief.space.calm"))}</div><div class="detail">${esc(t("brief.space.calm.detail"))}</div></div>`;
  }

  const mail = s.mail.map((m) => `<div class="mail">
    <h4>${t("mail.title", { sent: m.sent })}</h4>
    <div>${t("mail.body", { sci: m.science })}</div>
    <div class="mail-days">${m.forecast.map((n) => `<span class="mail-day">${n} ${wIcon(E.weatherKey(s, n))} ${esc(wName(E.weatherKey(s, n)))}</span>`).join("") || `<span class="mail-day">${esc(t("mail.none"))}</span>`}</div>
  </div>`).join("");

  const alerts = [];
  const add = (level, k, p = {}) => alerts.push({ level, key: k, params: p });
  if (s.sol === C.weatherGen.seasonStartSol) add("warn", "brief.alert.season");
  if (key === "dust") add("danger", "brief.alert.dust", { income: inc });
  if (tKey === "dust" && key !== "dust") add("warn", "brief.alert.tomorrowDust");
  if (s.oxygen < 25) add("warn", "brief.alert.lowO2", { oxygen: s.oxygen });
  const short = nightsLeft() - s.food;
  if (short > 0 && short >= nightsLeft() - 2) add("warn", "brief.alert.food", { food: s.food, nights: nightsLeft() });
  if (s.panel <= 80) add("info", "brief.alert.panel", { panel: s.panel, gain: E.incomeFor(s, s.sol, 100) - inc });
  if (s.dose >= 70) add("warn", "brief.alert.dose", { dose: s.dose });

  stage.innerHTML = `
    <div class="stage-head"><h2>${esc(t("brief.title"))}</h2><span class="sub">${esc(t("brief.sub"))}</span></div>
    <div class="brief-grid">
      <div class="brief-card${key === "dust" ? " danger" : ""}"><div class="label">${esc(t("brief.today"))}</div><div class="big">${wIcon(key)}</div>
        <div class="name">${esc(wName(key))}</div><div class="detail">${t("brief.income", { n: inc, panel: s.panel })}</div></div>
      <div class="brief-card${tKey === "dust" ? " warn" : ""}"><div class="label">${esc(t("brief.tomorrow"))}</div>
        ${hasTomorrow ? `<div class="big">${wIcon(tKey)}</div><div class="name">${esc(wName(tKey))}</div><div class="detail">${t("brief.tomorrow.income", { n: E.incomeFor(s, s.sol + 1) })}</div>`
          : `<div class="big">🏁</div><div class="name">${esc(t("brief.lastDay"))}</div><div class="detail">${esc(t("brief.lastDay.detail"))}</div>`}</div>
      ${space}
    </div>
    ${mail}
    ${alertHtml(alerts)}
    <div class="stage-foot">
      <span class="hint">${t("brief.ap", { n: C.actionPoints })}</span>
      <button class="btn primary" id="go-day" type="button">${esc(t("brief.go"))}</button>
    </div>`;
  $("#go-day").onclick = () => { E.beginDay(s); ui.site = null; ui.place = "base"; ui.worldDay = null; render(); };
}

// ---------- phase 2: day (the map) ----------
function mapSvg() {
  const tracks = SITES.filter((x) => s.visits[x.id]).map((x) =>
    `<line x1="${BASE.x}" y1="${BASE.y}" x2="${x.x}" y2="${x.y}" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-dasharray="2 5"/>`).join("");
  const rocks = [[30, 240], [70, 150], [150, 30], [210, 250], [300, 140], [335, 40], [250, 100], [110, 240], [20, 110], [345, 180]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="rgba(0,0,0,0.25)"/>`).join("");
  const sites = SITES.map((x) => {
    const chk = E.checkEva(s, x.id);
    const v = s.visits[x.id];
    const cls = ["site", v ? "visited" : "", ui.site === x.id ? "selected" : "", chk.ok ? "" : "disabled"].join(" ");
    const name = t(`site.${x.id}.name`);
    return `<g class="${cls}" data-site="${x.id}" tabindex="0" role="button" aria-label="${esc(name)}, ${esc(t(`tier.${x.tier}`))}">
      <circle class="dot" cx="${x.x}" cy="${x.y}" r="17"/>
      <text class="emoji" x="${x.x}" y="${x.y}">${x.icon}</text>
      <text class="name" x="${x.x}" y="${x.y + 31}">${esc(name)}${v ? ` ✓${v}` : ""}</text>
    </g>`;
  }).join("");
  return `<svg class="map" viewBox="0 0 360 270" role="group" aria-label="${esc(t("day.mapAria"))}">
    <defs><radialGradient id="ground" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#b9502c"/><stop offset="1" stop-color="#5a2412"/></radialGradient></defs>
    <rect width="360" height="270" rx="12" fill="url(#ground)"/>
    ${rocks}
    ${RINGS.map((r) => `<circle class="ring" cx="${BASE.x}" cy="${BASE.y}" r="${r}"/>`).join("")}
    ${RINGS.map((r, i) => `<text class="ring-label" x="${BASE.x + r - 4}" y="${BASE.y - 4}" text-anchor="end">${esc(t(`tier.${i + 1}`))}</text>`).join("")}
    ${tracks}
    <g class="base"><circle cx="${BASE.x}" cy="${BASE.y}" r="19" fill="#2e2550" stroke="var(--sand)" stroke-width="2"/><text x="${BASE.x}" y="${BASE.y}">🏠</text></g>
    ${sites}
  </svg>`;
}

function sitePanel() {
  if (!ui.site) return `<div class="site-panel"><p>${esc(t("day.siteHint"))}</p></div>`;
  const st = siteById(ui.site);
  const chk = E.checkEva(s, st.id);
  const c = chk.cost;
  return `<div class="site-panel">
    <h4>${st.icon} ${esc(t(`site.${st.id}.name`))} <span class="chip">${esc(t(`tier.${st.tier}`))} · ${esc(t("day.apCost", { n: c.ap }))}</span></h4>
    <p>${esc(t(`site.${st.id}.desc`))}</p>
    <div class="chips">
      <span class="chip">⚡ −${c.power}</span><span class="chip">🫁 −${c.oxygen}</span>
      <span class="chip${c.storm ? " bad" : ""}">☢️ +${c.dose}</span><span class="chip">🔬 +${c.science}</span>
    </div>
    ${alertHtml(chk.warnings)}
    ${is3D() ? `<p class="note">${esc(t("day.travelNote"))}</p>` : ""}
    <div class="site-go">
      <button class="btn primary" id="go-eva" type="button" ${chk.ok ? "" : "disabled"}>${esc(t(is3D() ? "day.travel" : "day.go"))}</button>
      ${chk.ok ? "" : `<span class="lock">${tr(chk.reason.key, chk.reason.params)}</span>`}
    </div>
  </div>`;
}

function actionButton(id, icon, name, desc, chk) {
  return `<button class="action" id="${id}" type="button" ${chk.ok ? "" : "disabled"}>
    <span class="a-icon" aria-hidden="true">${icon}</span><span class="a-name">${esc(t(name))}</span>
    <span class="a-desc">${chk.ok ? desc : `🚫 ${tr(chk.reason.key, chk.reason.params)}`}</span></button>`;
}

function renderDayClassic() {
  const pips = Array.from({ length: C.actionPoints }, (_, i) => `<span class="pip${i < s.ap ? "" : " used"}"></span>`).join("");
  const clean = E.checkClean(s);
  const key = E.weatherKey(s, s.sol);
  const backLabel = is3D()
    ? (ui.place === "base" ? t("world.baseMode") : t("world.backToSite", { site: t(`site.${ui.place}.name`) }))
    : t("world.walkMode");
  stage.innerHTML = `
    <div class="stage-head"><h2>${esc(t("day.title"))}</h2><span class="sub">${wIcon(key)} ${esc(wName(key))}</span>
      <span class="ap-pips" aria-label="${esc(t("day.apAria", { n: s.ap }))}">${esc(t("day.ap"))} ${pips}</span></div>
    <div class="day-grid">
      <div class="map-wrap">
        <div class="map-title">${esc(t("day.mapTitle"))}</div>
        ${mapSvg()}
        ${sitePanel()}
      </div>
      <div>
        ${is3D() ? `<div class="actions-note">${esc(t("day.baseAtBase"))}</div>` : `<div class="actions">
          ${actionButton("do-clean", "🧽", "act.clean.name", t("act.clean.desc", { panel: s.panel, gain: clean.gain || 0 }), clean)}
          ${actionButton("do-tend", "🌱", "act.tend.name", t("act.tend.desc", { sci: C.greenhouse.tendScience, food: C.greenhouse.tendFood }), E.checkTend(s))}
          ${actionButton("do-call", "📡", "act.call.name", t("act.call.desc", { min: s.lightMinutes, days: C.call.forecastDays, sci: C.call.science }), E.checkCall(s))}
        </div>`}
        <div class="log"><h4>${esc(t("day.log"))}</h4>
          <ul>${s.today.log.length ? s.today.log.map((l) => `<li>${tr(l.key, l.params)}</li>`).join("") : `<li>${esc(t("day.logEmpty"))}</li>`}</ul>
        </div>
      </div>
    </div>
    <div class="stage-foot">
      <span class="hint">${t("day.hint", { n: E.expectedIncome(s) })}${s.ap > 0 ? esc(t("day.hintAp", { n: s.ap })) : ""}</span>
      ${world ? `<button class="btn small" id="to-walk" type="button">${esc(backLabel)}</button>` : ""}
      ${is3D() && ui.place !== "base" ? `<button class="btn small" id="map-to-base" type="button">${esc(t("world.returnBase"))}</button>` : ""}
      <button class="btn primary" id="go-night" type="button">${esc(t("day.sunset"))}</button>
    </div>`;

  if ($("#to-walk")) $("#to-walk").onclick = () => { ui.classic = false; ui.worldDay = null; render(); };
  $("#map-to-base")?.addEventListener("click", () => travelTo("base"));
  $$(".site", stage).forEach((el) => {
    const pick_ = () => { ui.site = el.dataset.site; renderDayClassic(); };
    el.addEventListener("click", pick_);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick_(); } });
  });
  const go = $("#go-eva");
  if (go) go.onclick = () => {
    if (is3D()) travelTo(ui.site);
    else { E.doEva(s, ui.site); render(); }
  };
  const doClean = $("#do-clean"), doTend = $("#do-tend"), doCall = $("#do-call");
  if (doClean) doClean.onclick = () => { E.doClean(s); render(); };
  if (doTend) doTend.onclick = () => { E.doTend(s); render(); };
  if (doCall) doCall.onclick = () => { E.doCall(s); render(); };
  $("#go-night").onclick = () => {
    if (s.ap > 0 && !window.confirm(t("day.confirm", { n: s.ap }))) return;
    E.endDay(s);
    ui.alloc = null;
    render();
  };
}

// ---------- phase 2, walking: 3D base + 2D map fallback ----------
let world = null;
const walking = () => !!world && !ui.classic;
const is3D = () => !!world && world.kind === "3d";

async function ensureWorld() {
  const mount = $("#world-view");
  mount.innerHTML = "";
  if (WORLD_MODE === "3d") {
    try {
      const { createWorld } = await import("./world3d.js");
      const w = await createWorld({
        mount, minimap: $("#minimap"), joystick: $("#joy"),
        dataDir: "data/mars", modelDir: "assets/models",
        onNear: () => updatePrompt(), onUse: () => usePrompt(),
      });
      if (w) {
        await w.setScene("base");
        world = w;
        const sp = BASE3D.spawn;
        world.setSpawn(sp.x, sp.z, sp.heading);
        world.respawn();
        window.solWorld = world; // handy for demos and tests
        if (s && activeScreen() === "screen-game") render();
        return;
      }
    } catch (err) {
      console.warn("3D base unavailable, falling back to the 2D map", err);
    }
    // A failed 3D boot may have left a canvas behind; the 2D world adds its own.
    mount.innerHTML = "";
  }
  try {
    world = await createWorld2D({
      mount, minimap: $("#minimap"), joystick: $("#joy"),
      onNear: () => updatePrompt(), onUse: () => usePrompt(),
    });
  } catch (err) {
    console.warn("2D Mars map unavailable", err);
    world = null;
  }
  if (!world) return;
  const sp = WORLD_BASE.spawn;
  world.setSpawn(sp.x, sp.z, sp.heading);
  world.respawn();
  window.solWorld = world; // handy for demos and tests
  if (s && activeScreen() === "screen-game") render();
}

let placeToken = 0;

function showWorldLoading(place) {
  const el = $("#world-loading");
  if (!el) return;
  const p = el.querySelector("p");
  if (p) p.textContent = place === "base" ? t("world.returning") : t("world.driving", { site: t(`site.${place}.name`) });
  el.classList.add("show");
}

function hideWorldLoading() {
  $("#world-loading")?.classList.remove("show");
}

async function loadPlace(place) {
  const token = ++placeToken;
  ui.loading = true;
  showWorldLoading(place);
  try {
    await world.setScene(place);
    if (token !== placeToken) return;
    const sp = place === "base" ? BASE3D.spawn : SITE3D.spawn;
    world.setSpawn(sp.x, sp.z, sp.heading);
    world.respawn();
    ui.worldDay = s ? s.sol : ui.worldDay;
    ui.loading = false;
    hideWorldLoading();
    render();
  } catch (err) {
    if (token !== placeToken) return;
    console.warn(`3D scene ${place} failed`, err);
    ui.loading = false;
    hideWorldLoading();
    toast(t("world.sceneFail"));
    if (place !== "base") { ui.place = "base"; travelTo("base"); }
    else { ui.classic = true; render(); }
  }
}

// Route B: the rover map is the travel layer; every place is a 3D scene.
function travelTo(place) {
  if (!is3D()) return;
  ui.place = place;
  ui.classic = false;
  ui.site = null;
  ui.loading = false;
  render();
}

function worldTargets() {
  const doneToday = { panels: s.today.cleaned, greenhouse: s.today.tended, antenna: s.today.called };
  if (is3D()) {
    if (ui.place !== "base") {
      const st = siteById(ui.place);
      if (st) {
        const done = s.visits[st.id] > 0;
        return [{
          id: st.id, kind: "site", icon: st.icon,
          x: SITE3D.target.x, z: SITE3D.target.z, r: SITE3D.target.r, labelY: SITE3D.target.labelY,
          done,
          label: `${st.icon} ${t(`site.${st.id}.name`)}${done ? " ✓" : ""}`,
        }];
      }
    }
    return BASE3D.stations.map((st) => ({
      ...st,
      done: !!doneToday[st.id],
      label: `${st.icon} ${t(`world.station.${st.id}`)}${doneToday[st.id] ? " ✓" : ""}`,
    }));
  }
  const list = SITES.map((x) => ({
    id: x.id, kind: "site", x: x.wx, z: x.wz, r: 2.2, tier: x.tier, icon: x.icon, done: s.visits[x.id] > 0,
    label: `${x.icon} ${t(`site.${x.id}.name`)}${s.visits[x.id] ? " ✓" : ""}`,
  }));
  for (const st of WORLD_BASE.stations) {
    list.push({ ...st, done: !!doneToday[st.id], label: `${st.icon} ${t(`world.station.${st.id}`)}${doneToday[st.id] ? " ✓" : ""}` });
  }
  const lm = WORLD_BASE.landmark;
  list.push({ ...lm, label: `${lm.icon} ${t("world.station.perseverance")}` });
  return list;
}

// Keep the 3D view in step with the game: a banner with a slow orbit in the
// morning and at night, full-size and walkable during the day.
function syncWorld() {
  const el = $("#world");
  if (!world) { el.classList.add("hidden"); return; }
  if (!s || s.phase === "end" || activeScreen() !== "screen-game") { world.stop(); return; }
  const play = s.phase === "day" && !ui.classic;
  // The 2D map is the site planner in 3D mode; hide the base while it is open.
  if (s.phase === "day" && ui.classic) {
    el.classList.add("hidden");
    world.stop();
    return;
  }
  el.classList.remove("hidden");
  el.classList.toggle("play", play);
  if (is3D() && world.place !== ui.place) {
    if (!ui.loading) loadPlace(ui.place);
    return;
  }
  el.classList.toggle("is3d", is3D());
  const keysEl = $(".world-keys");
  if (keysEl) keysEl.innerHTML = t(is3D() ? "world.keys3d" : "world.keys");
  const capEl = $(".world-map-cap");
  if (capEl) capEl.textContent = t(is3D() ? "world.mapCapBase" : "world.mapCap");
  const creditEl = $(".side-credit");
  if (creditEl) creditEl.textContent = t(is3D() ? "world.credit3d" : "world.credit");
  world.setTargets(worldTargets());
  world.setLook(s.phase, E.weatherKey(s, s.sol));
  if (play && ui.worldDay !== s.sol) {
    world.respawn();
    ui.worldDay = s.sol;
  }
  world.setMode(play ? "play" : "cinematic");
  world.start();
  if (play) {
    const pips = Array.from({ length: C.actionPoints }, (_, i) => `<span class="pip${i < s.ap ? "" : " used"}"></span>`).join("");
    $("#world-ap").innerHTML = `${esc(t("day.ap"))} ${pips}`;
    const key = E.weatherKey(s, s.sol);
    const storm = E.solarStormOn(s, s.sol);
    const chip = $("#world-weather");
    chip.classList.toggle("alert", !!storm);
    chip.textContent = storm ? t("world.stormAlert") : `${wIcon(key)} ${wName(key)}`;
  }
  updatePrompt();
}

// Real Mars coordinates and MOLA elevation of the spot the astronaut stands on.
function updateLocation() {
  if (!world || !world.location || !s || s.phase !== "day" || ui.classic || activeScreen() !== "screen-game") return;
  const p = world.location;
  const elev = p.elevation == null ? "" : ` · ⛰️ ${t("world.elev", { m: num(p.elevation) })}`;
  $("#world-loc").textContent = `📍 ${p.lat.toFixed(2)}°N ${p.lon.toFixed(2)}°E${elev}`;
}
setInterval(updateLocation, 250);

function promptButton(label, ok = true) {
  return `<button class="btn primary" id="use-btn" type="button" ${ok ? "" : "disabled"}>${esc(label)} <kbd>E</kbd></button>`;
}

function updatePrompt() {
  const el = $("#world-prompt");
  if (!world || !s || s.phase !== "day" || ui.classic) { el.innerHTML = ""; return; }
  const id = world.near;
  el.className = "world-prompt";
  $("#world").classList.toggle("has-card", !!id);
  if (!id) {
    el.classList.add("hint");
    const key = is3D()
      ? (ui.place === "base"
          ? (s.ap > 0 ? "world.hint.base" : "world.hint.baseNoAp")
          : (s.ap > 0 ? "world.hint.site" : "world.hint.siteNoAp"))
      : (s.ap > 0 ? "world.hint.walk" : "world.hint.noAp");
    el.textContent = t(key);
    return;
  }
  const lock = (chk) => (chk.ok ? "" : `<span class="lock">🚫 ${tr(chk.reason.key, chk.reason.params)}</span>`);
  const st = siteById(id);
  let html = "";
  if (st) {
    const chk = E.checkEva(s, id);
    const c = chk.cost;
    html = `<h4>${st.icon} ${esc(t(`site.${id}.name`))} <span class="chip">${esc(t(`tier.${st.tier}`))} · ${esc(t("day.apCost", { n: c.ap }))}</span></h4>
      <p>${esc(t(`site.${id}.desc`))}</p>
      <div class="chips"><span class="chip">⚡ −${c.power}</span><span class="chip">🫁 −${c.oxygen}</span>
        <span class="chip${c.storm ? " bad" : ""}">☢️ +${c.dose}</span><span class="chip">🔬 +${c.science}</span></div>
      ${alertHtml(chk.warnings)}
      <div class="site-go">${promptButton(t("world.site.go"), chk.ok)}${lock(chk)}</div>`;
  } else if (id === "panels") {
    const chk = E.checkClean(s);
    html = `<h4>🔆 ${esc(t("act.clean.name"))}</h4><p>${t("act.clean.desc", { panel: s.panel, gain: chk.gain || 0 })}</p>
      <div class="site-go">${promptButton(t("world.panels.go"), chk.ok)}${lock(chk)}</div>`;
  } else if (id === "greenhouse") {
    const chk = E.checkTend(s);
    html = `<h4>🌱 ${esc(t("act.tend.name"))}</h4><p>${t("act.tend.desc", { sci: C.greenhouse.tendScience, food: C.greenhouse.tendFood })}</p>
      <div class="site-go">${promptButton(t("world.greenhouse.go"), chk.ok)}${lock(chk)}</div>`;
  } else if (id === "antenna") {
    const chk = E.checkCall(s);
    html = `<h4>📡 ${esc(t("act.call.name"))}</h4><p>${t("act.call.desc", { min: s.lightMinutes, days: C.call.forecastDays, sci: C.call.science })}</p>
      <div class="site-go">${promptButton(t("world.antenna.go"), chk.ok)}${lock(chk)}</div>`;
  } else if (id === "habitat") {
    html = `<h4>${esc(t("world.habitat.title"))}</h4><p>${esc(t("world.habitat.desc", { n: E.expectedIncome(s) }))}</p>
      ${s.ap > 0 ? alertHtml([{ level: "warn", key: "world.habitat.apLeft", params: { n: s.ap } }]) : ""}
      <div class="site-go">${promptButton(t("world.habitat.go"))}</div>`;
  } else if (id === "perseverance") {
    html = `<h4>${esc(t("world.landmark.title"))}</h4><p>${esc(t("world.landmark.desc"))}</p>
      <div class="site-go">${promptButton(t("world.landmark.go"))}</div>`;
  }
  el.innerHTML = html;
  const btn = $("#use-btn");
  if (btn) btn.onclick = () => usePrompt();
}

function toast(text) {
  const el = $("#world-toast");
  el.textContent = text;
  el.classList.remove("show");
  void el.offsetWidth; // restart the animation
  el.classList.add("show");
}

function endDayNow() {
  if (s.ap > 0) {
    if (world) world.setEnabled(false);
    const yes = window.confirm(t("day.confirm", { n: s.ap }));
    if (world) world.setEnabled(true);
    if (!yes) return;
  }
  E.endDay(s);
  ui.alloc = null;
  render();
}

// The player pressed E (or tapped the button) next to something.
function usePrompt() {
  if (!world || !s || s.phase !== "day" || ui.classic) return;
  const id = world.near;
  if (!id) return;
  if (siteById(id)) {
    const r = E.doEva(s, id);
    if (!r.ok) return;
    toast(`+${r.cost.science} 🔬   −${r.cost.power} ⚡  −${r.cost.oxygen} 🫁  +${r.cost.dose} ☢️`);
  } else if (id === "panels") {
    const r = E.doClean(s);
    if (!r.ok) return;
    toast(t("world.toast.clean", { gain: r.gain }));
  } else if (id === "greenhouse") {
    if (!E.doTend(s).ok) return;
    toast(t("world.toast.tend", { sci: C.greenhouse.tendScience }));
  } else if (id === "antenna") {
    if (!E.doCall(s).ok) return;
    toast(t("world.toast.call"));
  } else if (id === "habitat") {
    endDayNow();
    return;
  } else if (id === "perseverance") {
    openInfo(factHtml(WORLD_BASE.landmark.fact, "", true));
    return;
  }
  render();
}

function renderDayWorld() {
  const key = E.weatherKey(s, s.sol);
  const atSite = is3D() && ui.place !== "base";
  const title = is3D()
    ? (atSite ? t("day.titleSite", { site: t(`site.${ui.place}.name`) }) : t("day.titleBase"))
    : t("day.titleWorld");
  stage.innerHTML = "";
  $("#side-day").innerHTML = `
    <div class="day-bar">
      <div><h2 class="day-h">${esc(title)}</h2><span class="sub">${wIcon(key)} ${esc(wName(key))} · ${t("day.hint", { n: E.expectedIncome(s) })}</span></div>
      <div class="log"><ul>${s.today.log.length ? s.today.log.map((l) => `<li>${tr(l.key, l.params)}</li>`).join("") : `<li>${esc(t("day.logEmpty"))}</li>`}</ul></div>
      <div class="btns">
        ${atSite ? `<button class="btn small" id="to-base" type="button">${esc(t("world.returnBase"))}</button>` : ""}
        <button class="btn small" id="to-classic" type="button">${esc(t(is3D() ? "world.roverMap" : "world.classic"))}</button>
        <button class="btn small" id="end-day" type="button">${esc(t("world.endDay"))}</button>
      </div>
    </div>`;
  $("#to-base")?.addEventListener("click", () => travelTo("base"));
  $("#to-classic").onclick = () => { ui.classic = true; ui.site = null; render(); };
  $("#end-day").onclick = () => endDayNow();
}

function renderDay() {
  stage.classList.toggle("compact", walking());
  if (walking()) renderDayWorld();
  else renderDayClassic();
}

// ---------- phase 3: night (split the power) ----------
function renderNight() {
  if (!ui.alloc) ui.alloc = { o2: s.lastAlloc.o2, gh: s.lastAlloc.gh, shield: false };
  const storm = E.solarStormOn(s, s.sol);
  const ss = E.stormStrength(storm);
  const tend = s.today.tended;
  const before = s.battery - s.today.income;
  stage.innerHTML = `
    <div class="stage-head"><h2>${esc(t("night.title"))}</h2><span class="sub">${esc(t("night.sub"))}</span></div>
    <div class="pool"><span>${esc(t("night.pool"))}</span><span class="total">${s.battery} ⚡</span>
      <span>${esc(t("night.poolFrom", { before, income: s.today.income }))}</span></div>
    <div class="alloc-bar" id="alloc-bar"></div>
    <div class="alloc-legend">
      <span><i style="background:#8a5a6e"></i>${esc(t("night.leg.ls"))}</span><span><i style="background:var(--teal)"></i>${esc(t("night.leg.o2"))}</span>
      <span><i style="background:var(--green)"></i>${esc(t("night.leg.gh"))}</span><span><i style="background:var(--red)"></i>${esc(t("night.leg.sh"))}</span>
      <span><i style="background:var(--blue)"></i>${esc(t("night.leg.keep", { max: C.max.battery }))}</span><span><i style="background:#666"></i>${esc(t("night.leg.waste"))}</span>
    </div>
    <div class="alloc-rows">
      <div class="arow"><span class="ic" aria-hidden="true">❤️</span>
        <div><div class="t">${esc(t("night.ls.name"))}</div><div class="d">${esc(t("night.ls.desc"))}</div></div>
        <span class="cost">${C.power.lifeSupport} ⚡</span>
        <div class="ctrl"><span class="lock">${esc(t("night.always"))}</span></div></div>
      <div class="arow"><span class="ic" aria-hidden="true">🫁</span>
        <div><div class="t">${esc(t("night.o2.name"))}</div><div class="d" id="o2-desc"></div></div>
        <span class="cost" id="o2-cost"></span>
        <div class="ctrl"><input type="range" id="o2-range" min="0" max="${C.oxygenGen.maxPower}" step="${C.oxygenGen.step}" value="${ui.alloc.o2}" aria-label="${esc(t("night.o2.aria"))}"></div></div>
      <div class="arow"><span class="ic" aria-hidden="true">🌱</span>
        <div><div class="t">${esc(t("night.gh.name"))}</div><div class="d">${t("night.gh.desc", { o2: C.greenhouse.o2, food: C.greenhouse.food + (tend ? C.greenhouse.tendFood : 0) })}${tend ? esc(t("night.gh.tended")) : ""}</div></div>
        <span class="cost">${C.power.greenhouse} ⚡</span>
        <div class="ctrl"><label class="switch"><input type="checkbox" id="gh-toggle" ${ui.alloc.gh ? "checked" : ""}><span class="track"></span><span class="state" id="gh-state"></span></label></div></div>
      <div class="arow${ss ? " highlight" : ""}"><span class="ic" aria-hidden="true">🛡️</span>
        <div><div class="t">${esc(t("night.sh.name"))}</div><div class="d">${ss ? t("night.sh.storm", { shielded: ss.shielded, unshielded: ss.unshielded }) : esc(t("night.sh.calm"))}</div></div>
        <span class="cost">${C.power.shield} ⚡</span>
        <div class="ctrl"><label class="switch"><input type="checkbox" id="sh-toggle" ${ui.alloc.shield ? "checked" : ""}><span class="track"></span><span class="state" id="sh-state"></span></label></div></div>
    </div>
    <div class="proj" id="proj"></div>
    <div id="night-alerts"></div>
    <div class="stage-foot">
      <span class="hint" id="night-hint"></span>
      <button class="btn primary" id="confirm-night" type="button">${esc(t("night.confirm"))}</button>
    </div>`;

  $("#o2-range").addEventListener("input", (e) => { ui.alloc.o2 = +e.target.value; updateNight(); });
  $("#gh-toggle").addEventListener("change", (e) => { ui.alloc.gh = e.target.checked; updateNight(); });
  $("#sh-toggle").addEventListener("change", (e) => { ui.alloc.shield = e.target.checked; updateNight(); });
  $("#confirm-night").onclick = () => {
    if (!E.confirmNight(s, ui.alloc).ok) return;
    ui.alloc = null;
    render();
  };
  updateNight();
}

function updateNight() {
  const a = ui.alloc;
  const p = E.previewNight(s, a);
  $("#o2-cost").textContent = `${a.o2} ⚡`;
  $("#o2-desc").textContent = a.o2 ? t("night.o2.on", { made: p.o2Made, per: C.oxygenGen.step * 2, per2: C.oxygenGen.o2PerStep * 2 }) : t("night.o2.off");
  $("#gh-state").textContent = t(a.gh ? "ui.on" : "ui.off");
  $("#sh-state").textContent = t(a.shield ? "ui.on" : "ui.off");

  const basis = Math.max(s.battery, p.cost);
  const segs = [
    ["ls", C.power.lifeSupport, t("seg.ls")],
    ["o2", a.o2, t("seg.o2")],
    ["gh", a.gh ? C.power.greenhouse : 0, t("seg.gh")],
    ["sh", a.shield ? C.power.shield : 0, t("seg.sh")],
  ];
  if (p.overBudget) segs.push(["over", p.cost - s.battery, t("seg.over")]);
  else {
    segs.push(["keep", p.battery, t("seg.keep")]);
    segs.push(["waste", p.overflow, t("seg.waste")]);
  }
  $("#alloc-bar").innerHTML = segs.filter((x) => x[1] > 0).map(([cls, v, label]) =>
    `<div class="seg ${cls}" style="flex:0 0 calc(${(v / basis) * 100}% - 2px)" title="${esc(label)} ${v}">${v / basis > 0.09 ? `${esc(label)} ${v}` : v / basis > 0.04 ? v : ""}</div>`).join("");

  const tomorrow = p.hasNext ? t("night.tomorrow", { icon: wIcon(E.weatherKey(s, p.nextSol)), weather: wName(E.weatherKey(s, p.nextSol)), income: p.nextIncome }) : t("night.lastNight");
  const cells = [
    ["⚡", "hud.battery", p.battery, p.overBudget ? t("proj.battery.over") : p.overflow ? t("proj.battery.dw", { cost: p.cost, waste: p.overflow }) : t("proj.battery.d", { cost: p.cost }), "var(--blue)"],
    ["🫁", "hud.oxygen", p.oxygen, t("proj.oxygen.d", { delta: sign(p.o2Made + p.ghO2 - C.oxygenUse.crewDaily), breath: C.oxygenUse.crewDaily }), "var(--teal)"],
    ["🥫", "hud.food", `${Math.max(0, p.food)} ${t("unit.days")}`, t("proj.food.d", { delta: sign(p.foodGain - C.food.dailyUse) }), "var(--green)"],
    ["☢️", "hud.dose", p.dose, t("proj.dose.d", { n: p.doseGain }), "var(--red)"],
  ];
  $("#proj").innerHTML = cells.map(([ic, k, v, d, c]) =>
    `<div class="proj-item" style="--c:${c}"><div class="k">${ic} ${esc(t(k))}</div><div class="v">${v}</div><div class="delta">${esc(d)}</div></div>`).join("");
  $("#night-alerts").innerHTML = alertHtml(p.warnings);
  $("#night-hint").textContent = tomorrow;
  $("#confirm-night").disabled = p.overBudget;
}

// ---------- phase 4: settle ----------
function change(icon, nameKey, from, to, parts, c, unit = "") {
  const d = to - from;
  return `<div class="change" style="--c:${c}"><div class="k">${icon} ${esc(t(nameKey))}</div>
    <div class="v">${from}${esc(unit)} → ${to}${esc(unit)} <small>(${sign(d)})</small></div>
    <div class="why">${parts.filter(Boolean).join(esc(t("fmt.sep")))}</div></div>`;
}

function stormBoxHtml(storm) {
  const e = storm.event;
  const text = t("night.stormBox", {
    date: esc(e.date), speed: num(e.speedKmS), instrument: esc(e.instrument),
    sep: e.hadParticleStorm ? t("night.stormSep") : "",
  });
  return `<div class="storm-box">${text} <a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(t("night.stormLink"))}</a></div>`;
}

function renderSettle() {
  const h = s.history[s.history.length - 1];
  const m = s.morning;
  const a = h.alloc;
  const o2Made = E.o2FromPower(a.o2);
  const storm = E.solarStormOn(s, s.sol);
  const w = (k, n) => (n ? t(k, { n }) : "");
  stage.innerHTML = `
    <div class="stage-head"><h2>${esc(t("settle.title"))}</h2><span class="sub">${esc(t("settle.sub", { n: s.sol }))}</span></div>
    <div class="changes">
      ${change("⚡", "hud.battery", m.battery, s.battery, [w("why.income", h.income), w("why.eva", h.evaPower), w("why.night", E.nightCost(a)), w("why.overflow", h.overflow)], "var(--blue)")}
      ${change("🫁", "hud.oxygen", m.oxygen, s.oxygen, [w("why.breath", C.oxygenUse.crewDaily), w("why.suit", h.evaOxygen), w("why.o2made", o2Made), a.gh ? w("why.gh", C.greenhouse.o2) : ""], "var(--teal)")}
      ${change("🥫", "hud.food", m.food, s.food, [t("why.eat"), a.gh ? w("why.food", C.greenhouse.food + (h.tended ? C.greenhouse.tendFood : 0)) : ""], "var(--green)", ` ${t("unit.days")}`)}
      ${change("☢️", "hud.dose", m.dose, s.dose, [w("why.base", h.nightDose), w("why.evaDose", h.evaDose)], "var(--red)")}
      ${change("🔬", "hud.science", m.science, s.science, [h.evas.length ? t("why.evas", { n: h.evas.length }) : t("why.noEva")], "var(--violet)")}
      ${change("🔆", "hud.panel", m.panel, s.panel, [h.cleaned ? t("why.cleaned") : "", t("why.dusted", { weather: wName(h.weather) }), h.dustDevil ? t("why.devil") : ""], "var(--muted)", "%")}
    </div>
    ${s.tonightNotes.length ? `<div class="notes">${s.tonightNotes.map((n) => `<div class="note">${tr(n.key, n.params)}</div>`).join("")}</div>` : ""}
    ${storm ? stormBoxHtml(storm) : ""}
    ${s.tonightCards.map((id) => `<div class="fact-card story">${factHtml(id, t("settle.story"), true)}</div>`).join("")}
    <div class="stage-foot">
      <span class="hint">${esc(s.sol + 1 === N ? t("settle.lastNext") : t("settle.left", { n: N - s.sol }))}</span>
      <button class="btn primary" id="next-sol" type="button">${esc(t("settle.next", { n: s.sol + 1 }))}</button>
    </div>`;
  $("#next-sol").onclick = () => { E.nextSol(s); ui.place = "base"; ui.worldDay = null; render(); };
}

// ---------- end ----------
const SERIES = [
  { key: "battery", color: "#6ea8ff", label: "hud.battery" },
  { key: "oxygen", color: "#4fd1c5", label: "hud.oxygen" },
  { key: "dose", color: "#ff5d73", label: "hud.dose" },
];
const CH = { W: 640, H: 240, l: 34, r: 74, t: 26, b: 28 };
const cx = (n) => CH.l + (n / N) * (CH.W - CH.l - CH.r);
const cy = (v) => CH.t + (1 - Math.max(0, Math.min(100, v)) / 100) * (CH.H - CH.t - CH.b);

function chartPoints() {
  return [{ sol: 0, battery: C.start.battery, oxygen: C.start.oxygen, dose: C.start.dose, food: C.start.food, science: 0, weather: null }]
    .concat(s.history.map((h) => ({ sol: h.sol, battery: h.battery, oxygen: h.oxygen, dose: h.dose, food: h.food, science: h.science, weather: h.weather, solarStorm: h.solarStorm })));
}

function chartHtml() {
  const pts = chartPoints();
  const last = pts[pts.length - 1];
  let grid = "";
  for (let v = 0; v <= 100; v += 25) {
    grid += `<line x1="${CH.l}" x2="${CH.W - CH.r}" y1="${cy(v)}" y2="${cy(v)}" stroke="#4b3f7a" stroke-dasharray="4 4"/>
      <text x="${CH.l - 6}" y="${cy(v) + 4}" text-anchor="end" fill="#c5b8e0" font-size="11">${v}</text>`;
  }
  for (let n = 0; n <= N; n++) {
    grid += `<text x="${cx(n)}" y="${CH.H - 8}" text-anchor="middle" fill="#c5b8e0" font-size="11">${n === 0 ? "" : n}</text>`;
  }
  const bands = s.weather.map((w, n) => (n >= 1 && n <= last.sol && w === "dust"
    ? `<rect x="${cx(n - 1)}" y="${CH.t}" width="${cx(n) - cx(n - 1)}" height="${CH.H - CH.t - CH.b}" fill="rgba(228,106,60,0.22)"/>` : "")).join("");
  const flares = s.solarStorms.filter((x) => x.sol <= last.sol)
    .map((x) => `<text x="${(cx(x.sol - 1) + cx(x.sol)) / 2}" y="${CH.t - 8}" text-anchor="middle" font-size="14">☀️</text>`).join("");
  const lines = SERIES.map((se) =>
    `<polyline fill="none" stroke="${se.color}" stroke-width="3" stroke-linejoin="round" points="${pts.map((p) => `${cx(p.sol)},${cy(p[se.key])}`).join(" ")}"/>`).join("");
  const labels = SERIES.map((se) => ({ se, y: cy(last[se.key]), v: last[se.key] })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;
  const endLabels = labels.map((l) => `<text x="${cx(last.sol) + 8}" y="${l.y + 4}" fill="${l.se.color}" font-size="12" font-weight="700">${l.v}</text>`).join("");
  const rows = pts.slice(1).map((p) => `<tr><td>${p.sol}</td><td>${wIcon(p.weather)} ${esc(wName(p.weather))}${p.solarStorm ? " ☀️" : ""}</td>
    <td>${p.battery}</td><td>${p.oxygen}</td><td>${p.dose}</td><td>${p.food}</td><td>${p.science}</td></tr>`).join("");
  return `<svg viewBox="0 0 ${CH.W} ${CH.H}" role="img" aria-label="${esc(t("end.chartAria"))}">${bands}${grid}${flares}${lines}${endLabels}</svg>
    <div class="legend">${SERIES.map((se) => `<span style="color:${se.color}">━ ${esc(t(se.label))}</span>`).join("")}<span>${esc(t("end.legendDust"))}</span><span>${esc(t("end.legendStorm"))}</span></div>
    <details class="data-table"><summary>${esc(t("end.table"))}</summary><div class="table-scroll"><table>
      <tr><th>${esc(t("end.col.sol"))}</th><th>${esc(t("end.col.weather"))}</th><th>${esc(t("hud.battery"))}</th><th>${esc(t("hud.oxygen"))}</th><th>${esc(t("hud.dose"))}</th><th>${esc(t("hud.food"))}</th><th>${esc(t("hud.science"))}</th></tr>${rows}</table></div></details>`;
}

function renderEnd() {
  const r = buildReport(s);
  const o = s.outcome;
  const st = r.stats;
  $("#end-hero").innerHTML = o.success
    ? `<div class="emoji">🎉</div><h1>${tr(r.title.key, r.title.params)}</h1><div class="stars" aria-label="${esc(t("end.starsAria", { n: o.stars }))}">${"⭐".repeat(o.stars)}${"☆".repeat(C.stars.length - o.stars)}</div>`
    : `<div class="emoji">🚨</div><h1>${esc(t("end.fail"))}</h1><p class="why">${tr(r.title.key, r.title.params)}</p><p class="why">${esc(t("end.tryAgain"))}</p>`;
  $("#end-report").innerHTML = `
    <div class="report-box"><h3>${esc(t("end.what"))}</h3><ul>${r.lines.map((l) => `<li>${tr(l.key, l.params)}</li>`).join("")}</ul></div>
    <div class="report-box"><h3>${esc(t("end.tips"))}</h3><ul>${r.tips.map((l) => `<li>${tr(l.key, l.params)}</li>`).join("")}</ul></div>`;
  $("#chart").innerHTML = chartHtml();
  $("#end-stats").innerHTML = [
    ["stat.sols", `${st.sols} / ${N}`], ["stat.science", st.science], ["stat.evas", st.evas],
    ["stat.sites", `${st.sitesVisited} / ${SITES.length}`], ["stat.clean", st.cleanings], ["stat.calls", st.calls],
    ["stat.gh", st.ghNights], ["stat.dose", st.maxDose],
  ].map(([k, v]) => `<div class="stat"><div class="k">${esc(t(k))}</div><div class="v">${v}</div></div>`).join("");

  const faced = s.history.filter((h) => h.solarStorm);
  $("#storm-list").innerHTML = faced.length
    ? faced.map((h) => {
      const ss = C.solarStorm.strengths[h.solarStorm];
      const shielded = h.alloc && h.alloc.shield;
      return `<li>${t(shielded ? "end.stormShielded" : "end.stormOpen", { sol: h.sol, date: esc(h.stormEvent.date), speed: num(h.stormEvent.speedKmS), dose: h.nightDose, full: ss.unshielded })}
        <a href="${esc(h.stormEvent.link)}" target="_blank" rel="noopener">${esc(t("end.stormLink"))}</a></li>`;
    }).join("")
    : `<li>${esc(t("end.noStorms"))}</li>`;

  $("#new-cards").innerHTML = ui.endFresh.length
    ? ui.endFresh.map((f) => `<div class="fact-card">${factHtml(f)}</div>`).join("")
    : `<p class="note">${esc(t("end.noCards"))}</p>`;
}

function showEnd() {
  if (activeScreen() !== "screen-end") {
    const before = loadCollection();
    ui.endFresh = Object.keys(s.cardsSeen).filter((f) => FACTS[f] && !before.includes(f));
    saveCollection([...before, ...ui.endFresh]);
    updateCollectionCount();
    clearSave();
    show("screen-end");
  }
  renderEnd();
}

// ---------- collection ----------
function updateCollectionCount() {
  $("#collection-count").textContent = `(${loadCollection().filter((id) => FACTS[id]).length}/${Object.keys(FACTS).length})`;
}
function renderCollection() {
  const have = loadCollection();
  $("#collection-grid").innerHTML = Object.keys(FACTS).map((id) => have.includes(id)
    ? `<div class="fact-card">${factHtml(id)}</div>`
    : `<div class="fact-card locked"><h3>🔒 ???</h3><p>${esc(t("collection.locked"))}</p></div>`).join("");
}

// ---------- help ----------
function showHelp() {
  const dayHelp = is3D() ? "help.l2_3d" : "help.l2";
  const steps = [1, 2, 3, 4].map((i) => `<li>${t(i === 2 ? dayHelp : `help.l${i}`, { ap: C.actionPoints })}</li>`).join("");
  openInfo(`<h3>${esc(t("help.title", { n: N }))}</h3><p>${t("help.intro")}</p>
    <ol class="help-list">${steps}</ol>
    <p>${t("help.end", { n: N })}</p>`);
}

// ---------- language ----------
function refreshLanguage() {
  applyStatic();
  updateCollectionCount();
  if (s && activeScreen() === "screen-game") render();
  if (s?.outcome && activeScreen() === "screen-end") renderEnd();
  if ($("#collection").open) renderCollection();
  if ($("#info").open) $("#info").close(); // its content was built in the old language
  updateContinue();
}

// ---------- events ----------
const seedParam = parseInt(new URLSearchParams(location.search).get("seed"), 10);

function startGame(seed) {
  s = E.newGame(pool, Number.isNaN(seed) ? undefined : seed);
  ui = freshUi();
  ui.endFresh = [];
  show("screen-game");
  render();
}

function updateContinue() {
  $("#btn-continue").classList.toggle("hidden", !loadSave());
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.classList.contains("lang-toggle")) {
    setLang(getLang() === "en" ? "zh" : "en");
    refreshLanguage();
  } else if (btn.dataset.fact) {
    openInfo(factHtml(btn.dataset.fact, "", true));
  } else if (btn.matches("[data-close]")) {
    btn.closest("dialog").close();
  }
});

$("#btn-start").addEventListener("click", () => startGame(seedParam));
$("#btn-continue").addEventListener("click", () => {
  const g = loadSave();
  if (!g) return;
  s = g;
  ui = freshUi();
  ui.endFresh = [];
  show("screen-game");
  render();
});
$("#btn-again").addEventListener("click", () => startGame());
$("#btn-replay").addEventListener("click", () => startGame(s.seed));
$("#btn-home").addEventListener("click", () => { show("screen-title"); updateContinue(); });
$("#btn-new").addEventListener("click", () => {
  if (s && s.phase !== "end" && (s.sol > 1 || s.phase !== "briefing") && !window.confirm(t("top.confirmNew"))) return;
  startGame();
});
$("#btn-help").addEventListener("click", showHelp);
$("#btn-collection").addEventListener("click", () => {
  renderCollection();
  $("#collection").showModal();
});

// ---------- boot ----------
ensureWorld();
applyStatic();
updateCollectionCount();
updateContinue();
$("#btn-start").disabled = true;
fetch("data/space_weather_events.json")
  .then((r) => r.json())
  .then((d) => {
    pool = d.events;
    $("#btn-start").disabled = false;
  })
  .catch(() => {
    $(".badge").textContent = t("title.loadError");
  });
