import * as E from "./game.js";
import { CONFIG as C } from "./config.js";
import { SITES, BASE, RINGS, WORLD_BASE, PART_STATION, ZONES, siteKm, siteById } from "./sites.js";
import { createWorld } from "./world2d.js";
import { FACTS, SITE_STORIES, TECH_INFO } from "./facts.js";
import { buildReport } from "./report.js";
import { t, tr, pick, getLang, setLang, applyStatic } from "./i18n.js";
import { SHORT, ROCKS, rockFor, moodOf, guideLine, suggestAlloc } from "./kid.js";
import { audio } from "./audio.js";
import { music } from "./music.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = (n) => n.toLocaleString(getLang() === "zh" ? "zh-CN" : "en-US");
const sign = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0");
const N = C.totalSols;
const PHASES = ["briefing", "day", "night", "settle"];
const wIcon = (key) => E.WEATHER_ICONS[key];
const wName = (key) => t(`weather.${key}`);

let pool = [];
let s = null; // current mission
let ui = freshUi();
function freshUi() {
  return {
    site: null, alloc: null, prevHud: null, lastPhase: null, classic: false, worldDay: null,
    // which right-hand panel is open: "tasks", "tech", "cal" or null (phones start closed)
    panel: window.matchMedia("(max-width: 900px)").matches ? null : "tasks",
    prevSci: null, doneMark: "",
    collapsed: false, suggested: false, prevMoods: null,
  };
}
const stage = $("#stage");

// Optional synthesized sound (js/audio.js). The button shows the saved choice;
// browsers only let audio start after the first tap or key press.
function updateSoundBtn() {
  const b = $("#btn-sound");
  if (!b) return;
  const on = audio.isEnabled();
  b.textContent = on ? "🔊" : "🔇";
  b.setAttribute("aria-label", t(on ? "top.soundOn" : "top.soundOff"));
  b.title = t(on ? "top.soundOn" : "top.soundOff");
}
$("#btn-sound")?.addEventListener("click", () => { audio.toggle(); updateSoundBtn(); });
document.addEventListener("pointerdown", () => { audio.init(); updateMusic(); }, { once: true });
document.addEventListener("keydown", () => { audio.init(); updateMusic(); }, { once: true });

// ---------- saving (per browser, optional) ----------
const SAVE_KEY = "solbysol.save";
const SAVE_V = 3; // 3: daily orders, panel checks and the technology line
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
  updateMusic();
}
const activeScreen = () => $(".screen.active")?.id;

// The background music (js/music.js) follows the game: bright jazz for the
// morning report and the title, a soft version while walking, bass and long
// chords at night, and a tense version on a storm day (a solar storm the crew
// knows about, or a dust storm).
function musicMood() {
  const screen = activeScreen();
  if (screen === "screen-end") return s && s.outcome && s.outcome.success ? "briefing" : "night";
  if (screen !== "screen-game" || !s) return "briefing";
  const storm = !!E.knownStormOn(s, s.sol) || E.weatherKey(s, s.sol) === "dust";
  if (storm && s.phase !== "settle") return "storm";
  return { briefing: "briefing", day: "day", night: "night", settle: "night" }[s.phase] || "briefing";
}
function updateMusic() { music.setMood(musicMood()); }

function factHtml(id, label = "", withLesson = false) {
  const f = FACTS[id];
  if (!f) return "";
  // One short sentence up front; the full card is folded behind "Learn more".
  const short = SHORT[id] ? pick(SHORT[id]) : pick(f.text);
  return `${label ? `<div class="label">${esc(label)}</div>` : ""}
    <div class="kcard"><span class="kcard-icon" aria-hidden="true">${f.icon}</span>
      <div><h3>${esc(pick(f.title))}</h3><p class="kcard-short">${esc(short)}</p></div></div>
    <details class="more"><summary>${esc(t("learn.more"))}</summary>
      <p>${esc(pick(f.text))}</p>
      ${withLesson && f.lesson ? `<p class="lesson">🎮 ${esc(pick(f.lesson))}</p>` : ""}
      <p class="src">${esc(t("fact.source"))} <a href="${f.source.url}" target="_blank" rel="noopener">${esc(pick(f.source.label))} ↗</a></p>
    </details>`;
}
function openInfo(html, wide = false) {
  $("#info-body").innerHTML = html;
  $("#info").classList.toggle("wide", wide);
  $("#info").showModal();
}

// The card shown after collecting at a survey site: what went into the sample
// tube, what it tells us, why it matters for future explorers, and the real
// missions behind it. `fresh` is the first visit; later it reads as field notes.
const SAMPLE_COLOR = {
  dune: "#c9774f", crater: "#a58a76", cliff: "#d8b294", riverbed: "#8a6c5a", canyon: "#7a5240", delta: "#e0b898",
  meteorite: "#6b6560", lava: "#5f4d43", northfan: "#f0cfa8", outlet: "#9c5b3a", eastcrater: "#8f5034",
};
function storyHtml(id, fresh) {
  const st = siteById(id), story = SITE_STORIES[id];
  if (!st || !story) return "";
  const sealed = SITES.filter((x) => s.visits[x.id] > 0).length;
  const tubes = SITES.map((x) => `<i class="tube${s.visits[x.id] > 0 ? " full" : ""}${x.id === id ? " now" : ""}" style="--tube:${SAMPLE_COLOR[x.id]}" title="${esc(t(`site.${x.id}.name`))}"></i>`).join("");
  const part = (cls, icon, key) => `<section class="story-part ${cls}"><h4><span aria-hidden="true">${icon}</span> ${esc(t(`story.${key}`))}</h4><p>${esc(pick(story[key]))}</p></section>`;
  return `<div class="label">${esc(t(fresh ? "story.label" : "story.notes"))}</div>
    <h3>${st.icon} ${esc(t(`site.${id}.name`))}</h3>
    <div class="tube-rack"><span class="tubes" aria-hidden="true">${tubes}</span><span>${esc(t("story.tube", { n: sealed, total: SITES.length }))}</span></div>
    <p class="story-sample"><span aria-hidden="true">🧪</span> <b>${esc(t("story.sample"))}</b> ${esc(pick(story.sample))}</p>
    ${part("sci", "🔬", "science")}
    <details class="more"><summary>${esc(t("learn.more"))}</summary>
      ${part("fut", "🚀", "future")}${part("his", "📜", "history")}
      <p class="src">${esc(t("fact.source"))} <a href="${story.source.url}" target="_blank" rel="noopener">${esc(pick(story.source.label))} ↗</a></p>
    </details>`;
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
  if (ui.lastPhase !== phaseKey) { ui.collapsed = false; ui.suggested = false; } // a new phase starts unfolded
  renderStage();
  $("#screen-game").classList.toggle("staged", !stage.classList.contains("hidden"));
  renderPanels();
  noticeTech();
  updateGuide();
  updateNudges();
  updateMusic();
  if (ui.lastPhase !== phaseKey) {
    stage.scrollTop = 0;
    if (ui.lastPhase !== null) window.scrollTo({ top: 0 });
    ui.lastPhase = phaseKey;
    phaseCard();
  }
  save();
}

// A title card for the new phase ("SOL 3 · Night power"). Hidden by default;
// a theme (css/themes/*.css) can show it as a short animation.
function phaseCard() {
  const el = $("#phase-card");
  if (!el || s.phase === "end" || calmMotion.matches) return;
  $(".pc-sol", el).textContent = t("game.sol", { n: s.sol });
  $(".pc-phase", el).textContent = t(`step.${s.phase}`);
  replay(el, "show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}

// ---------- Pip the robot: one short sentence for right now ----------
const BOT_FACE = { happy: "🙂", think: "🤔", worry: "😟", alarm: "😱" };
let lastAlarm = 0;
function alarmOnce() { // never more than one alarm every few seconds
  if (performance.now() - lastAlarm < 2500) return;
  lastAlarm = performance.now();
  audio.alarm();
}
function updateGuide(preview) {
  const el = $("#guide");
  if (!el) return;
  if (!s || s.phase === "end" || activeScreen() !== "screen-game") { el.classList.add("hidden"); return; }
  const p = preview || (s.phase === "night" && ui.alloc ? E.previewNight(s, ui.alloc) : null);
  const line = guideLine(s, { walking: walking(), near: world ? world.near : null, preview: p, suggested: ui.suggested });
  if (!line) { el.classList.add("hidden"); el.dataset.text = ""; return; }
  const text = t(line.key, line.params);
  el.classList.remove("hidden", "happy", "think", "worry", "alarm");
  el.classList.add(line.mood);
  if (el.dataset.text === text) return;
  if (line.mood === "alarm") alarmOnce();
  el.dataset.text = text;
  el.innerHTML = `<span class="guide-bot" aria-hidden="true">🤖<i>${BOT_FACE[line.mood]}</i></span>
    <p><b>${esc(t("guide.name"))}</b>${esc(text)}</p>`;
  replay(el, "pop"); // a little hop when Pip says something new
}

// ---------- tutorial: a bouncing arrow on the next button to press ----------
// Only on the first sol (and whenever the day's work is finished), so new
// players always know where to go next. The gold arrows on the map do the rest.
function updateNudges() {
  $$(".nudge").forEach((el) => el.classList.remove("nudge"));
  if (!s || s.phase === "end") return;
  const first = s.sol === 1;
  let target = null;
  if (s.phase === "briefing" && first) target = "#go-day";
  else if (s.phase === "night" && first) target = ui.suggested ? "#confirm-night" : "#suggest";
  else if (s.phase === "settle" && first) target = "#next-sol";
  else if (s.phase === "day" && walking() && s.ap <= 0) target = "#end-day";
  else if (s.phase === "day" && !walking() && s.ap <= 0) target = "#go-night";
  if (target) $(target)?.classList.add("nudge");
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

// The sidebar gauges. Each resource has a small moving drawing instead of an
// emoji. The drawings take the row's colour (--c) and its fill level (--pct,
// 0 to 1), so the battery icon really fills and empties. All motion is CSS (see
// "sidebar gauges" in style.css) and stops under prefers-reduced-motion.
const HUD_ICONS = {
  // battery: the level bar follows --pct, the bolt flickers
  battery: `<svg viewBox="0 0 24 24"><rect class="ln" x="2.5" y="7" width="17" height="10" rx="3"/><rect class="fl" x="20.6" y="10" width="1.9" height="4" rx="0.95"/>
    <rect class="fl i-level" x="4.7" y="9.2" width="12.6" height="5.6" rx="1.4"/><path class="i-bolt" d="M12.3 7.4 8.5 12.7h2.6l-.9 3.9 3.9-5.4h-2.7z"/></svg>`,
  // oxygen: bubbles rise and fade, one after another
  oxygen: `<svg viewBox="0 0 24 24"><circle class="ln i-bub" cx="7.6" cy="15.6" r="3.1"/><circle class="ln i-bub b2" cx="15.6" cy="13.4" r="4.3"/>
    <circle class="ln i-bub b3" cx="10.6" cy="6.6" r="2.2"/><path class="ln thin i-bub b2" d="M13.4 12.4a2.5 2.5 0 0 1 2-1.4"/></svg>`,
  // radiation: the trefoil turns slowly, a ring pulses out like a counter click
  dose: `<svg viewBox="0 0 24 24"><g transform="translate(12 12)"><circle class="ln thin i-ping" r="9"/><g class="i-spin">
    <path class="fl" d="M-4.5-7.79A9 9 0 0 1 4.5-7.79L1.7-2.94A3.4 3.4 0 0 0-1.7-2.94Z"/>
    <path class="fl" transform="rotate(120)" d="M-4.5-7.79A9 9 0 0 1 4.5-7.79L1.7-2.94A3.4 3.4 0 0 0-1.7-2.94Z"/>
    <path class="fl" transform="rotate(240)" d="M-4.5-7.79A9 9 0 0 1 4.5-7.79L1.7-2.94A3.4 3.4 0 0 0-1.7-2.94Z"/></g><circle class="fl" r="1.7"/></g></svg>`,
  // food: a sprout in a pot, swaying
  food: `<svg viewBox="0 0 24 24"><path class="fl dim" d="M6.4 16.6h11.2l-1.3 4.3a1.5 1.5 0 0 1-1.4 1.1H9.1a1.5 1.5 0 0 1-1.4-1.1z"/><g transform="translate(12 16.6)"><g class="i-sway">
    <path class="ln" d="M0 0V-7"/><path class="fl" d="M0-3.8C-3.8-3.7-6.4-5.9-6.6-9.7-2.8-9.8-.2-7.6 0-3.8Z"/><path class="fl" d="M0-6.6C.1-10.1 2.5-12.5 6.4-12.6 6.3-9 3.9-6.7 0-6.6Z"/></g></g></svg>`,
  // solar panel: a glint of sunlight sweeps across the cells
  panel: `<svg viewBox="0 0 24 24"><rect class="fl dim" x="3" y="5.5" width="18" height="12" rx="2"/><svg x="3" y="5.5" width="18" height="12" viewBox="0 0 18 12"><path class="i-sheen" d="M-7 0h5l-3 12h-5z"/></svg>
    <rect class="ln" x="3" y="5.5" width="18" height="12" rx="2"/><path class="ln thin" d="M9 5.5v12M15 5.5v12M3 11.5h18"/><path class="ln" d="M12 17.5v3.2M8.6 20.9h6.8"/></svg>`,
  // science: two electrons circle an atom's core
  science: `<svg viewBox="0 0 24 24"><g transform="translate(12 12)"><g transform="rotate(-32)"><ellipse class="ln thin" rx="9.8" ry="4.1"/><g class="i-ex"><g class="i-ey"><circle class="fl" r="1.6"/></g></g></g>
    <g transform="rotate(32)"><ellipse class="ln thin" rx="9.8" ry="4.1"/><g class="i-ex e2"><g class="i-ey e2"><circle class="fl" r="1.6"/></g></g></g><circle class="fl i-core" r="2.5"/></g></svg>`,
};

const calmMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function replay(el, cls) { // run a CSS animation class again from the start
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
function countTo(el, from, to, ms = 650) {
  cancelAnimationFrame(el._raf);
  if (calmMotion.matches || from === to) { el.textContent = to; return; }
  el.textContent = from;
  const t0 = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
    if (k < 1) el._raf = requestAnimationFrame(tick);
  };
  el._raf = requestAnimationFrame(tick);
}
function floatDelta(row, d, upIsBad) { // a little "+12" that rises from the number and fades
  if (calmMotion.matches) return;
  const chip = document.createElement("span");
  chip.className = `res-delta ${(d > 0) !== upIsBad ? "good" : "bad"}`;
  chip.textContent = sign(d);
  chip.setAttribute("aria-hidden", "true");
  chip.addEventListener("animationend", () => chip.remove());
  setTimeout(() => chip.remove(), 2500);
  row.appendChild(chip);
}

function hudRows() {
  const nights = nightsLeft();
  const foodShort = nights - s.food;
  let batteryNote = "";
  if (s.phase === "day") batteryNote = t("hud.note.batteryDay", { n: sunsetPower() });
  if (s.phase === "night") batteryNote = t("hud.note.batteryNight", { n: s.today.income });
  return [
    { key: "oxygen", val: s.oxygen, max: C.max.oxygen, unit: `/${C.max.oxygen}`, c: "var(--teal)", fact: "moxie",
      note: t(s.oxygen < 25 ? "hud.note.o2low" : "hud.note.o2", { n: C.oxygenUse.crewDaily }), bad: s.oxygen < 25 },
    { key: "battery", val: s.battery, max: C.max.battery, c: "var(--blue)", note: batteryNote, fact: "coldNights",
      unit: s.battery > C.max.battery ? t("hud.avail") : `/${C.max.battery}` },
    { key: "food", val: s.food, max: N, unit: t("unit.days"), c: "var(--green)", fact: "veggie",
      note: nights <= 0 ? "" : foodShort > 0 ? t("hud.note.foodShort", { n: foodShort }) : t("hud.note.foodOk"), bad: foodShort > 0 },
    { key: "dose", val: s.dose, max: C.max.dose, unit: `/${C.max.dose}`, c: "var(--red)", fact: "radiationAddsUp", upIsBad: true,
      note: t(s.dose >= 70 ? "hud.note.doseHigh" : "hud.note.dose"), bad: s.dose >= 70 },
    // Panel cleanliness is found out at the panels (free daily check); research
    // lives in the mission panel on the right.
  ];
}

// What sunset will add today. Until the panels are checked the crew only
// knows the most it could be ("≤ 80").
function sunsetPower() {
  return s.today && s.today.inspected ? E.expectedIncome(s) : `≤${E.maxPowerFor(s, s.sol)}`;
}

// Each supply is a big ring that empties as it runs out, with the moving icon
// in the middle and a face underneath (😊 good, 😟 getting low, 😱 danger).
// Tapping a ring opens its knowledge card.
const FACE = { ok: "😊", low: "😟", bad: "😱" };
function hudRowHtml(r, i) {
  return `<button class="res gauge" type="button" data-res="${r.key}" data-fact="${r.fact}" style="--c:${r.c};--i:${i}">
      <span class="ring" aria-hidden="true"><span class="res-icon">${HUD_ICONS[r.key]}</span></span>
      <span class="g-name">${esc(t(`hud.short.${r.key}`))}</span>
      <span class="res-val"><span class="num"></span><small></small></span>
      <span class="g-mood"><span class="g-face"></span><span class="g-word"></span></span>
    </button>`;
}

// The rows are built once (per language) and then updated in place, so the bars
// slide, the numbers count, and the icons keep moving instead of restarting.
function renderHud() {
  const hud = $("#hud");
  const first = !ui.prevHud; // a mission has just started or been loaded: let the gauges appear one by one
  const prev = ui.prevHud || {};
  const rows = hudRows();
  if (hud.dataset.lang !== getLang() || !hud.firstElementChild) {
    hud.innerHTML = `<div class="gauges">${rows.map(hudRowHtml).join("")}</div><p class="hud-tap">${esc(t("hud.tap"))}</p>`;
    hud.dataset.lang = getLang();
  }
  if (first) {
    $$(".res", hud).forEach((el) => el.classList.remove("flash"));
    $$(".res-delta", hud).forEach((el) => el.remove());
    replay(hud, "enter");
    clearTimeout(hud._enter);
    hud._enter = setTimeout(() => hud.classList.remove("enter"), 1800);
  }
  rows.forEach((r) => {
    const el = $(`[data-res="${r.key}"]`, hud);
    const pct = Math.max(0, Math.min(1, r.val / r.max));
    el.style.setProperty("--pct", pct.toFixed(3));
    const mood = moodOf(s, r.key);
    el.classList.remove("ok", "low", "bad");
    el.classList.add(mood);
    el.classList.toggle("warn", !!r.bad || mood === "bad");
    const word = t(r.key === "dose" ? `hud.dose.${mood}` : `hud.mood.${mood}`);
    $(".g-face", el).textContent = FACE[mood];
    $(".g-word", el).textContent = word;
    el.title = r.note || "";
    el.setAttribute("aria-label", `${t(`hud.short.${r.key}`)}: ${r.val}${r.unit.startsWith("/") ? r.unit : ` ${r.unit}`}. ${word}${r.note ? `. ${r.note}` : ""}`);
    $(".res-val small", el).textContent = r.unit;
    const numEl = $(".num", el);
    const had = prev[r.key] != null && numEl.textContent !== "";
    const changed = had && prev[r.key] !== r.val;
    if (first) countTo(numEl, 0, r.val, 900);
    else if (changed) countTo(numEl, prev[r.key], r.val);
    else { cancelAnimationFrame(numEl._raf); numEl.textContent = r.val; }
    if (changed) {
      replay(el, "flash");
      floatDelta(el, r.val - prev[r.key], !!r.upIsBad);
    }
  });
  // a supply that has just turned to "danger" sounds the alarm
  const moods = rows.map((r) => moodOf(s, r.key));
  if (ui.prevMoods && moods.some((m, i) => m === "bad" && ui.prevMoods[i] !== "bad")) alarmOnce();
  ui.prevMoods = moods;
  ui.prevHud ={ battery: s.battery, oxygen: s.oxygen, dose: s.dose, food: s.food, panel: s.panel, science: s.science };
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
  if (s.phase === "briefing") renderBriefing();
  else if (s.phase === "day") renderDay();
  else if (s.phase === "night") renderNight();
  else if (s.phase === "settle") renderSettle();
  else showEnd();
  addCollapseButton();
}

// "Look outside": fold the floating panel away to see the base, the night sky
// or the storm, and unfold it again. Every new phase starts unfolded.
function addCollapseButton() {
  const can = ["briefing", "night", "settle"].includes(s.phase) && !!world;
  stage.classList.toggle("collapsed", can && ui.collapsed);
  if (!can) return;
  const head = stage.querySelector(".stage-head");
  if (!head || head.querySelector(".collapse-btn")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn small collapse-btn";
  btn.textContent = t(ui.collapsed ? "panel.open" : "panel.peek");
  btn.onclick = () => {
    ui.collapsed = !ui.collapsed;
    stage.classList.toggle("collapsed", ui.collapsed);
    btn.textContent = t(ui.collapsed ? "panel.open" : "panel.peek");
    audio.click();
  };
  head.appendChild(btn);
}

// ---------- phase 1: briefing ----------
function realStormLine(storm) {
  return t("brief.space.real", { date: esc(storm.event.date), speed: num(storm.event.speedKmS) });
}

// The Earth report that arrived this morning: everything the base cannot see
// for itself. Each part says plainly when there is nothing to report.
function mailHtml(m) {
  const fc = m.forecast.length
    ? m.forecast.map((n) => `<span class="mail-day">${n} ${wIcon(E.weatherKey(s, n))} ${esc(wName(E.weatherKey(s, n)))}</span>`).join("")
    : `<span class="mail-day">${esc(t("mail.none"))}</span>`;
  const sun = m.storms.length
    ? m.storms.map((n) => { const x = E.solarStormOn(s, n); return `<b class="bad">${tr("mail.sun.storm", { sol: n, sstrength: x.strength })}</b>`; }).join(" ")
    : esc(t("mail.sun.clear", { from: s.sol, to: m.sunUntil }));
  const parts = m.faults.length
    ? m.faults.map((f) => `<b class="bad">${esc(t(f.broken ? "mail.part.broken" : "mail.part.wearing", { part: t(`part.${f.kind}`), sol: f.fail }))}</b>`).join(" ")
    : esc(t("mail.part.ok"));
  const req = m.request
    ? `<div class="mail-row req"><span>🎯</span><div><b>${esc(t("mail.req.title"))}</b> ${esc(tr("mail.req", { site: m.request.site, until: m.request.until, n: m.request.bonus }))}</div></div>`
    : "";
  return `<div class="mail">
    <h4>${t("mail.title", { sent: m.sent })}</h4>
    <div class="mail-row"><span>🛰️</span><div><b>${esc(t("mail.wx"))}</b><div class="mail-days">${fc}</div></div></div>
    <div class="mail-row"><span>☀️</span><div><b>${esc(t("mail.sun"))}</b> ${sun}</div></div>
    <div class="mail-row"><span>🔧</span><div><b>${esc(t("mail.parts"))}</b> ${parts}</div></div>
    ${req}
    <div class="mail-sci">${t("mail.sci", { sci: m.science })}</div>
  </div>`;
}

// Space weather, as far as the crew knows: a known storm, Earth's all-clear,
// or nothing at all (with the base's own unreliable hint, if there is one).
function spaceCardHtml(hunch) {
  const today = E.knownStormOn(s, s.sol);
  const upcoming = E.activeWarnings(s).filter((x) => x.sol > s.sol);
  const label = `<div class="label">${esc(t("brief.space"))}</div>`;
  if (today) {
    const ss = E.stormStrength(today);
    return `<div class="brief-card danger">${label}<div class="big">☢️</div><div class="name">${esc(t("brief.space.today"))}</div>
      <div class="detail">${tr("brief.space.today.detail", { sstrength: today.strength, evaDose: ss.evaDose, shielded: ss.shielded, unshielded: ss.unshielded })}<br>${realStormLine(today)}</div></div>`;
  }
  if (upcoming.length) {
    const u = upcoming[0];
    return `<div class="brief-card warn">${label}<div class="big">⚠️</div><div class="name">${esc(t("brief.space.warn"))}</div>
      <div class="detail">${tr("brief.space.warn.detail", { sol: u.sol, sstrength: u.strength })}<br>${realStormLine(u)}</div></div>`;
  }
  if (E.spaceStatus(s, s.sol) === "clear") {
    return `<div class="brief-card">${label}<div class="big">🌞</div><div class="name">${esc(t("brief.space.calm"))}</div>
      <div class="detail">${esc(t("brief.space.clearUntil", { n: s.sunUntil }))}</div></div>`;
  }
  return `<div class="brief-card unknown${hunch.static ? " warn" : ""}">${label}<div class="big">${hunch.static ? "📻" : "❔"}</div>
    <div class="name">${esc(t("brief.space.unknown"))}</div>
    <div class="detail">${esc(t(hunch.static ? "brief.space.static" : "brief.space.unknown.detail"))}</div></div>`;
}

// Which stage of the mission we are in, and its three goals.
function stageHtml(compact = false) {
  const st = E.stageOf(s);
  const goals = st.goals.map((id) => {
    const done = E.goalDone(s, id), pr = E.goalProgress(s, id);
    return `<li class="${done ? "done" : ""}"><span class="tk" aria-hidden="true">${done ? "✓" : "○"}</span>
      <span>${esc(t(`goal.${id}`, { n: C.goals.stormBattery }))}</span>${pr && !done ? `<span class="p">${pr[0]}/${pr[1]}</span>` : done ? `<span class="p">+${C.goals.reward} 🔬</span>` : ""}</li>`;
  }).join("");
  const fresh = s.sol === st.from && s.phase === "briefing" && st.id > 1;
  return `<div class="stage-box s${st.id}${compact ? " compact" : ""}">
    <div class="stage-top"><span class="stage-no">${esc(t("stage.no", { n: st.id, total: C.stages.length }))}</span>
      <b>${esc(t(`stage.${st.id}.name`))}</b><span class="stage-sols">${esc(t("stage.sols", { a: st.from, b: st.to }))}</span></div>
    ${compact ? "" : `<p class="stage-why">${esc(t(`stage.${st.id}.why`))}</p>`}
    ${fresh ? `<p class="stage-new">🗺️ ${esc(t(`stage.${st.id}.opens`))}</p>` : ""}
    <ul class="stage-goals">${goals}</ul></div>`;
}

function renderBriefing() {
  const key = E.weatherKey(s, s.sol);
  const inc = E.maxPowerFor(s, s.sol); // the panels have not been checked yet this morning
  const hasTomorrow = s.sol < N;
  const tKnown = hasTomorrow && E.isKnown(s, s.sol + 1);
  const tKey = tKnown ? E.weatherKey(s, s.sol + 1) : null;
  const hunch = E.hunches(s);
  const space = spaceCardHtml(hunch);
  const tomorrowCard = !hasTomorrow
    ? `<div class="big">🏁</div><div class="name">${esc(t("brief.lastDay"))}</div><div class="detail">${esc(t("brief.lastDay.detail"))}</div>`
    : tKnown
      ? `<div class="big">${wIcon(tKey)}</div><div class="name">${esc(wName(tKey))}</div><div class="detail">${t("brief.tomorrow.income2", { n: E.maxPowerFor(s, s.sol + 1) })}</div>`
      : `<div class="big">❔</div><div class="name">${esc(t("brief.tomorrow.unknown"))}</div><div class="detail">${esc(t("brief.tomorrow.unknown.detail"))}</div>`;
  const mail = s.mail.map(mailHtml).join("");

  const alerts = [];
  const add = (level, k, p = {}) => alerts.push({ level, key: k, params: p });
  for (const kind of s.today.broke || []) add("danger", `brief.broke.${kind}`, { ap: C.faults.brokenAp });
  for (const f of E.knownFaults(s)) if (!f.broken) add("warn", "brief.fault", { part: t(`part.${f.kind}`), sol: f.fail, ap: C.faults.repairAp });
  if (hunch.odd) add("info", "brief.odd");
  if (s.request) add("info", "brief.request", { site: s.request.site, until: s.request.until, n: s.request.bonus });
  if (s.sol === C.weatherGen.seasonStartSol) add("warn", "brief.alert.season");
  if (key === "dust") add("danger", "brief.alert.dust", { income: inc });
  if (tKey === "dust" && key !== "dust") add("warn", "brief.alert.tomorrowDust");
  if (s.oxygen < 25) add("warn", "brief.alert.lowO2", { oxygen: s.oxygen });
  const short = nightsLeft() - s.food;
  if (short > 0 && short >= nightsLeft() - 2) add("warn", "brief.alert.food", { food: s.food, nights: nightsLeft() });
  if (s.dose >= 70) add("warn", "brief.alert.dose", { dose: s.dose });
  if (key === "hazy") add("info", "brief.alert.haze", { n: E.maxPowerFor(s, s.sol) });
  const ready = E.buildable(s);
  if (ready.length === 1) add("info", "brief.blueprint", { tech: ready[0].id, ap: ready[0].ap, power: ready[0].power });
  else if (ready.length > 1) add("info", "brief.blueprints", { n: ready.length, list: ready.map((k) => t(`techname.${k.id}`)).join(t("fmt.sep")) });
  // technologies unlocked overnight by research Earth sent back with its reply
  const lastSci = s.history.length ? s.history[s.history.length - 1].science : 0;
  const newTech = E.techsBetween(lastSci, s.science);

  stage.innerHTML = `
    <div class="stage-head"><h2>${esc(t("brief.title"))}</h2><span class="sub">${esc(t("brief.sub"))}</span></div>
    ${stageHtml(s.sol !== E.stageOf(s).from)}
    <div class="brief-grid">
      <div class="brief-card${key === "dust" ? " danger" : ""}"><div class="label">${esc(t("brief.today"))}</div><div class="big">${wIcon(key)}</div>
        <div class="name">${esc(wName(key))}</div><div class="detail">${t("brief.income2", { n: E.maxPowerFor(s, s.sol) })}</div></div>
      <div class="brief-card${tKey === "dust" ? " warn" : !tKnown && hasTomorrow ? " unknown" : ""}"><div class="label">${esc(t("brief.tomorrow"))}</div>${tomorrowCard}</div>
      ${space}
    </div>
    ${mail}
    ${s.today.apGain > 0 ? rewardCardHtml("today") : E.apBonusBetween(lastSci, s.science).length && s.sol < N ? rewardCardHtml("tomorrow") : ""}
    ${newTech.map(techCardHtml).join("")}
    <div class="orders"><h3>${esc(t("brief.orders", { n: s.sol }))}</h3>
      <ul class="task-list">${s.today.tasks.map((k, i) => taskHtml(k, i)).join("")}</ul></div>
    ${alertHtml(alerts)}
    <div class="stage-foot">
      <span class="hint">${t("brief.ap", { n: s.ap })}</span>
      <button class="btn primary" id="go-day" type="button">${esc(t("brief.go"))}</button>
    </div>`;
  $("#go-day").onclick = () => { E.beginDay(s); ui.site = null; render(); };
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
    <div class="site-go">
      <button class="btn primary" id="go-eva" type="button" ${chk.ok ? "" : "disabled"}>${esc(t("day.go"))}</button>
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
  const pips = Array.from({ length: Math.max(s.apMax || C.actionPoints, s.ap) }, (_, i) => `<span class="pip${i < s.ap ? "" : " used"}"></span>`).join("");
  const clean = E.checkClean(s);
  const key = E.weatherKey(s, s.sol);
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
        <div class="actions">
          ${actionButton("do-inspect", "🔍", "act.inspect.name", t("act.inspect.desc"), E.checkInspect(s))}
          ${actionButton("do-clean", "🧽", "act.clean.name", s.today.inspected ? t("act.clean.desc", { panel: s.panel, gain: clean.gain || 0 }) : t("act.clean.descUnknown"), clean)}
          ${actionButton("do-tend", "🌱", "act.tend.name", t("act.tend.desc", { sci: C.greenhouse.tendScience, food: C.greenhouse.tendFood }), E.checkTend(s))}
          ${actionButton("do-call", "📡", "act.call.name", t("act.call.desc", { min: s.lightMinutes, days: C.call.weatherDays, sci: C.call.science }), E.checkCall(s))}
          ${E.knownFaults(s).map((f) => actionButton(`do-repair-${f.kind}`, "🔧", `part.${f.kind}`, t("world.repair.go", { n: f.broken ? C.faults.brokenAp : C.faults.repairAp }), E.checkRepair(s, f.kind))).join("")}
          ${E.buildable(s).map((k) => actionButton(`do-build-${k.id}`, TECH_INFO[k.id].icon, `techname.${k.id}`, t("tech.cost", { ap: k.ap, power: k.power }), E.checkBuild(s, k.id))).join("")}
        </div>
        <div class="log"><h4>${esc(t("day.log"))}</h4>
          <ul>${s.today.log.length ? s.today.log.map((l) => `<li>${tr(l.key, l.params)}</li>`).join("") : `<li>${esc(t("day.logEmpty"))}</li>`}</ul>
        </div>
      </div>
    </div>
    <div class="stage-foot">
      <span class="hint">${t("day.hint", { n: sunsetPower() })}${s.ap > 0 ? esc(t("day.hintAp", { n: s.ap })) : ""}</span>
      ${world ? `<button class="btn small" id="to-walk" type="button">${esc(t("world.walkMode"))}</button>` : ""}
      <button class="btn primary" id="go-night" type="button">${esc(t("day.sunset"))}</button>
    </div>`;

  if ($("#to-walk")) $("#to-walk").onclick = () => { ui.classic = false; ui.worldDay = null; render(); };
  $$(".site", stage).forEach((el) => {
    const pick_ = () => { ui.site = el.dataset.site; renderDayClassic(); };
    el.addEventListener("click", pick_);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick_(); } });
  });
  const go = $("#go-eva");
  if (go) go.onclick = () => {
    const site = ui.site;
    if (!E.doEva(s, site).ok) return;
    toast(rockLine(collectRock(site)));
    render();
  };
  $("#do-inspect").onclick = () => { E.inspectPanels(s); render(); };
  $("#do-clean").onclick = () => { E.doClean(s); render(); };
  $("#do-tend").onclick = () => { E.doTend(s); render(); };
  $("#do-call").onclick = () => { E.doCall(s); render(); };
  for (const f of E.knownFaults(s)) $(`#do-repair-${f.kind}`).onclick = () => { E.doRepair(s, f.kind); render(); };
  for (const k of E.buildable(s)) $(`#do-build-${k.id}`).onclick = () => buildTech(k.id);
  $("#go-night").onclick = () => endDayNow();
}

// ---------- phase 2, walking: the real Mars surface (world2d.js) ----------
let world = null;
const walking = () => !!world && !ui.classic;

async function ensureWorld() {
  try {
    world = await createWorld({
      mount: $("#world-view"), minimap: $("#minimap"), joystick: $("#joy"),
      onNear: () => { updatePrompt(); updateGuide(); }, onUse: () => usePrompt(),
    });
  } catch (err) {
    console.warn("3D world unavailable, using the simple map", err);
    world = null;
  }
  if (!world) return;
  const sp = WORLD_BASE.spawn;
  world.setSpawn(sp.x, sp.z, sp.heading);
  world.respawn();
  window.solWorld = world; // handy for demos and tests
  if (s && activeScreen() === "screen-game") render();
}

function worldTargets() {
  const doneToday = { panels: s.today.cleaned, greenhouse: s.today.tended, antenna: s.today.called };
  const list = SITES.map((x) => {
    const missing = E.missingGear(s, x.id);
    const locked = missing.length > 0;
    const asked = s.request && s.request.site === x.id;
    const gear = missing.map((k) => TECH_INFO[k].icon).join("");
    return {
      id: x.id, kind: "site", x: x.wx, z: x.wz, r: 2.2, tier: x.tier, icon: x.icon, done: s.visits[x.id] > 0, locked, asked,
      lockIcon: locked ? TECH_INFO[missing[0]].icon : null, zone: x.zone,
      label: `${locked ? `🔒${gear}` : asked ? "🎯" : x.icon} ${t(`site.${x.id}.name`)}${s.visits[x.id] ? " ✓" : ""}`,
    };
  });
  // a station with a part that needs fixing gets a warning sign
  const hurt = {};
  for (const f of E.knownFaults(s)) hurt[PART_STATION[f.kind]] = f.broken ? "broken" : "wearing";
  for (const st of WORLD_BASE.stations) {
    const mark = hurt[st.id] === "broken" ? " 💥" : hurt[st.id] ? " ⚠️" : doneToday[st.id] ? " ✓" : "";
    list.push({ ...st, done: !!doneToday[st.id] && !hurt[st.id], hurt: hurt[st.id] || null, label: `${st.icon} ${t(`world.station.${st.id}`)}${mark}` });
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
  el.classList.remove("hidden");
  el.classList.toggle("play", play);
  $("#screen-game").classList.toggle("playing", play);
  world.setTargets(worldTargets());
  world.setFocus(play ? focusTargets() : []);
  world.setLook(s.phase, E.weatherKey(s, s.sol), !!E.knownStormOn(s, s.sol));
  world.setZones(ZONES.map((z) => ({ ...z, label: t(`zone.${z.id}`) })));
  el.classList.toggle("storm-alert", play && !!E.knownStormOn(s, s.sol)); // red, pulsing edges on a known solar-storm day
  audio.setWind(E.weatherKey(s, s.sol), s.phase);
  if (play && ui.worldDay !== s.sol) {
    world.respawn();
    ui.worldDay = s.sol;
  }
  world.setMode(play ? "play" : "cinematic");
  world.start();
  if (play) {
    const pips = Array.from({ length: Math.max(s.apMax || C.actionPoints, s.ap) }, (_, i) => `<span class="pip${i < s.ap ? "" : " used"}"></span>`).join("");
    $("#world-ap").innerHTML = `${esc(t("day.ap"))} ${pips}`;
    const key = E.weatherKey(s, s.sol);
    const storm = E.knownStormOn(s, s.sol);
    const sun = E.spaceStatus(s, s.sol);
    const chip = $("#world-weather");
    chip.classList.toggle("alert", !!storm);
    const fx = key === "sunny" ? "" : ` (${t(`world.wx.${key}`)})`; // what the weather does to the panels
    chip.textContent = storm ? t("world.stormAlert") : `${wIcon(key)} ${wName(key)}${fx} · ${t(sun === "clear" ? "world.sunClear" : "world.sunUnknown")}`;
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
  if (!world || !s || s.phase !== "day" || ui.classic) { el.innerHTML = ""; $("#screen-game").classList.remove("carded"); return; }
  const id = world.near;
  el.className = "world-prompt";
  $("#world").classList.toggle("has-card", !!id);
  $("#screen-game").classList.toggle("carded", !!id);
  if (!id) {
    el.classList.add("hint");
    el.textContent = t(s.ap > 0 ? "world.hint.walk" : "world.hint.noAp");
    return;
  }
  const lock = (chk) => (chk.ok ? "" : `<span class="lock">🚫 ${tr(chk.reason.key, chk.reason.params)}</span>`);
  const st = siteById(id);
  const fault = E.knownFaults(s).find((f) => PART_STATION[f.kind] === id);
  let html = "";
  if (fault) { // a part here needs fixing: that comes first (E), the station's usual job is the second button
    const chk = E.checkRepair(s, fault.kind);
    const other = { panels: s.today.inspected ? "world.panels.go" : "world.panels.inspect", greenhouse: "world.greenhouse.go", antenna: "world.antenna.go", habitat: "world.habitat.go" }[id];
    html = `<h4>🔧 ${esc(t(`part.${fault.kind}`))} <span class="chip bad">${esc(t(fault.broken ? "fault.broken" : "fault.wearing", { sol: fault.fail }))}</span></h4>
      <p>${esc(t(fault.broken ? `fault.${fault.kind}.broken` : `fault.${fault.kind}.wearing`))}</p>
      <div class="site-go">${promptButton(t("world.repair.go", { n: chk.ap }), chk.ok)}${lock(chk)}
        ${other && !(id === "antenna" && fault.broken) ? `<button class="btn small" id="alt-btn" type="button">${esc(t(other))}</button>` : ""}</div>`;
  } else if (st) {
    const chk = E.checkEva(s, id);
    const c = chk.cost;
    const missing = E.missingGear(s, id);
    const locked = missing.length > 0;
    const asked = s.request && s.request.site === id;
    // why this place is hard to reach: the tools its terrain needs, and how far it is
    const gearNote = missing.map((k) => {
      const x = E.techById(k);
      const state = E.blueprintReady(s, k) ? t("gear.state.ready", { ap: x.ap, power: x.power }) : t("gear.state.research", { n: x.at - s.science });
      return `<p class="locked-note">${TECH_INFO[k].icon} <b>${esc(t("gear.needs", { tech: t(`techname.${k}`) }))}</b> ${esc(t(`gear.why.${k}`))}<br><small>${esc(state)}</small></p>`;
    }).join("");
    html = `<h4>${st.icon} ${esc(t(`site.${id}.name`))} <span class="chip">${esc(t(`tier.${st.tier}`))} · ${esc(t("day.apCost", { n: c.ap }))}</span>
        ${asked ? `<span class="chip good">🎯 ${esc(t("world.site.asked", { n: s.request.bonus }))}</span>` : ""}</h4>
      <p class="site-where">📍 ${esc(t(`zone.${st.zone}`))} · ${esc(t("site.km", { n: siteKm(st) }))} · ${esc(t(`trip.why.${st.tier}`))}</p>
      <p>${esc(t(`site.${id}.desc`))}</p>
      ${locked ? gearNote : `
      ${st.tier >= 4 ? `<p class="expedition-note">🚙 ${esc(t("world.site.expedition"))}</p>` : ""}
      <div class="chips"><span class="chip">⚡ −${c.power}</span><span class="chip">🫁 −${c.oxygen}</span>
        <span class="chip${c.storm ? " bad" : ""}">☢️ +${c.dose}${!c.storm && E.spaceStatus(s, s.sol) === "unknown" ? "?" : ""}</span><span class="chip">🔬 +${c.science + c.bonus}</span></div>
      ${alertHtml(chk.warnings)}`}
      <div class="site-go">${locked ? "" : promptButton(t("world.site.go"), chk.ok)}${locked ? "" : lock(chk)}
        ${s.visits[id] > 0 ? `<button class="btn small" id="notes-btn" type="button">${esc(t("story.notesBtn"))}</button>` : ""}</div>`;
  } else if (id === "panels") {
    if (!s.today.inspected) { // first the free daily check: until then nobody knows how dusty they are
      html = `<h4>🔆 ${esc(t("world.panels.title"))} <span class="chip">${esc(t("task.free"))}</span></h4><p>${esc(t("world.panels.check"))}</p>
        <div class="site-go">${promptButton(t("world.panels.inspect"))}</div>`;
    } else {
      const chk = E.checkClean(s);
      const tone = s.panel >= 90 ? "var(--green)" : s.panel >= 75 ? "var(--sand)" : "var(--red)";
      html = `<h4>🔆 ${esc(t("world.panels.title"))}</h4>
        <div class="panel-gauge"><span>${esc(t("world.panels.clean"))}</span><div class="bar" style="--c:${tone}"><div class="fill" style="width:${s.panel}%"></div></div><span>${s.panel}%</span></div>
        <p>${esc(t("world.panels.status", { n: E.expectedIncome(s), max: E.maxPowerFor(s, s.sol) }))}${chk.ok ? ` ${esc(t("world.panels.gain", { gain: chk.gain }))}` : ""}</p>
        <div class="site-go">${promptButton(t("world.panels.go"), chk.ok)}${lock(chk)}</div>`;
    }
  } else if (id === "greenhouse") {
    const chk = E.checkTend(s);
    html = `<h4>🌱 ${esc(t("act.tend.name"))}</h4><p>${t("act.tend.desc", { sci: C.greenhouse.tendScience, food: C.greenhouse.tendFood })}</p>
      <div class="site-go">${promptButton(t("world.greenhouse.go"), chk.ok)}${lock(chk)}</div>`;
  } else if (id === "antenna") {
    html = callCardHtml(lock);
  } else if (id === "habitat") {
    html = `<h4>${esc(t("world.habitat.title"))}</h4><p>${esc(t("world.habitat.desc", { n: sunsetPower() }))}</p>
      ${s.ap > 0 ? alertHtml([{ level: "warn", key: "world.habitat.apLeft", params: { n: s.ap } }]) : ""}
      <div class="site-go">${promptButton(t("world.habitat.go"))}</div>`;
  } else if (id === "perseverance") {
    html = `<h4>${esc(t("world.landmark.title"))}</h4><p>${esc(t("world.landmark.desc"))}</p>
      <div class="site-go">${promptButton(t("world.landmark.go"))}</div>`;
  }
  el.innerHTML = html;
  const btn = $("#use-btn");
  if (btn) btn.onclick = () => usePrompt();
  const alt = $("#alt-btn");
  if (alt) alt.onclick = () => usePrompt(true);
  const notes = $("#notes-btn");
  if (notes) notes.onclick = () => openInfo(storyHtml(id, false), true);
}

// Calling Earth: what tomorrow's report will cover, laid out next to what the
// crew already knows, so the player can judge whether it is worth an action point.
function callCardHtml(lock) {
  const chk = E.checkCall(s);
  const A = s.sol + 1;
  const wxTo = Math.min(N, A + C.call.weatherDays), sunTo = Math.min(N, A + C.call.sunDays);
  const knownWx = E.weatherKnownUntil(s);
  const row = (icon, key, p, now) => `<li><span>${icon}</span><div>${esc(t(key, p))}<small>${esc(now)}</small></div></li>`;
  return `<h4>📡 ${esc(t("act.call.name"))} <span class="chip">${esc(t("day.apCost", { n: C.call.ap }))}</span></h4>
    <p>${esc(t("call.intro", { min: s.lightMinutes }))}</p>
    <ul class="call-list">
      ${row("🛰️", "call.wx", { a: A + 1 > N ? N : A + 1, b: wxTo }, t("call.now.wx", { n: knownWx }))}
      ${row("☀️", "call.sun", { a: A, b: sunTo }, s.sunUntil >= s.sol ? t("call.now.sun", { n: s.sunUntil }) : t("call.now.sunNone"))}
      ${row("🔧", "call.parts", {}, s.lastTelemetry ? t("call.now.parts", { n: s.lastTelemetry }) : t("call.now.partsNone"))}
    </ul>
    <p class="call-note">${esc(t("call.note"))}</p>
    <div class="site-go">${promptButton(t("world.antenna.go"), chk.ok)}${lock(chk)}</div>`;
}

function toast(text) {
  const el = $("#world-toast");
  el.textContent = text;
  el.classList.remove("show");
  void el.offsetWidth; // restart the animation
  el.classList.add("show");
}

// An in-game "Are you sure?" box. window.confirm is not used because some
// browsers and embedded views block it (it then silently answers "no", and the
// day could never end). Resolves true or false.
function askYesNo(text) {
  const dlg = $("#ask");
  $("#ask-text").textContent = text;
  return new Promise((resolve) => {
    const done = (v) => {
      dlg.removeEventListener("close", onClose);
      if (dlg.open) dlg.close();
      resolve(v);
    };
    const onClose = () => done(false); // Esc
    dlg.addEventListener("close", onClose);
    $("#ask-yes").onclick = () => done(true);
    $("#ask-no").onclick = () => done(false);
    dlg.showModal();
    $("#ask-yes").focus();
  });
}

async function endDayNow() {
  if (s.ap > 0) {
    if (world) world.setEnabled(false);
    const yes = await askYesNo(t("day.confirm", { n: s.ap }));
    if (world) world.setEnabled(true);
    if (!yes || s.phase !== "day") return;
  }
  E.endDay(s);
  ui.alloc = null;
  render();
}

// The player pressed E (or tapped the button) next to something. A job first
// plays a short animation on the map (drilling, brushing, watering, calling
// Earth); its result is applied when the animation ends.
let working = false;
const JOB_MS = { sample: 1900, inspect: 1200, clean: 1500, tend: 1600, call: 1700, repair: 1600 };
const STATION_JOB = { greenhouse: "tend", antenna: "call" };
const JOB_CHECK = {
  sample: (id) => E.checkEva(s, id), inspect: () => E.checkInspect(s), clean: () => E.checkClean(s),
  tend: () => E.checkTend(s), call: () => E.checkCall(s), repair: (id, part) => E.checkRepair(s, part),
};

// `skipRepair`: the second button on a station that needs fixing (do the usual job instead).
async function usePrompt(skipRepair = false) {
  if (working || !world || !s || s.phase !== "day" || ui.classic) return;
  const id = world.near;
  if (!id) return;
  const fault = skipRepair ? null : E.knownFaults(s).find((f) => PART_STATION[f.kind] === id);
  const job = fault ? "repair" : siteById(id) ? "sample" : id === "panels" ? (s.today.inspected ? "clean" : "inspect") : STATION_JOB[id];
  if (job) {
    const chk = JOB_CHECK[job](id, fault && fault.kind);
    if (!chk.ok) return; // nothing to animate: the card already says why
    const mission = s;
    working = true;
    const el = $("#world-prompt");
    el.className = "world-prompt hint busy";
    el.textContent = t(`world.busy.${job}`);
    if (job === "sample" && !calmMotion.matches) audio.drill(JOB_MS.sample / 1000);
    try {
      await world.playAction(job, id, calmMotion.matches ? 0 : JOB_MS[job]);
    } finally {
      working = false;
    }
    if (s !== mission || s.phase !== "day" || ui.classic) { // the mission changed while the job was playing
      if (s) updatePrompt();
      return;
    }
  }
  if (job === "repair") {
    const r = E.doRepair(s, fault.kind);
    if (!r.ok) return;
    toast(t("world.toast.repair", { part: t(`part.${fault.kind}`) }));
  } else if (siteById(id)) {
    const r = E.doEva(s, id);
    if (!r.ok) { updatePrompt(); return; }
    const rock = collectRock(id);
    if (r.surprise) { // a solar storm nobody warned about: the suit dosimeter goes off
      alarmOnce();
      toast(t("world.toast.surprise", { dose: r.cost.dose }));
    } else {
      toast(`${rockLine(rock)}   +${r.cost.science + r.cost.bonus} 🔬  −${r.cost.power} ⚡  −${r.cost.oxygen} 🫁  +${r.cost.dose} ☢️`);
    }
    render();
    if (r.cost.visits === 0 && s.phase === "day") openInfo(storyHtml(id, true), true); // first sample from this site
    return;
  } else if (id === "panels" && job === "inspect") {
    const r = E.inspectPanels(s);
    if (!r.ok) return;
    toast(t("world.toast.inspect", { panel: r.panel }));
  } else if (id === "panels") {
    const r = E.doClean(s);
    if (!r.ok) return;
    toast(t("world.toast.clean", { gain: r.gain }));
  } else if (id === "greenhouse") {
    if (!E.doTend(s).ok) return;
    toast(t("world.toast.tend", { sci: C.greenhouse.tendScience }));
  } else if (id === "antenna") {
    const r = E.doCall(s);
    if (r.blackout) { // a solar storm is blocking the radio: only static
      alarmOnce();
      toast(t("world.toast.blackout"));
      render();
      return;
    }
    if (!r.ok) return;
    toast(t("world.toast.call"));
  } else if (id === "habitat") {
    endDayNow();
    return;
  } else if (id === "perseverance") {
    openInfo(factHtml(WORLD_BASE.landmark.fact, "", true));
    return;
  }
  audio.chime();
  render();
}

// Every sample puts a real kind of Mars rock in the collection (just for fun:
// rocks never change the rules). Sometimes it is a rare one.
function collectRock(siteId) {
  const id = rockFor(siteId);
  if (!s.rocks) s.rocks = [];
  s.rocks.push(id);
  audio.found(!!ROCKS[id].rare);
  return id;
}
function rockLine(id) {
  const r = ROCKS[id];
  return `${r.icon} ${t(r.rare ? "toast.rare" : "toast.rock", { rock: pick(r) })}`;
}
function rocksHtml() {
  const list = s.rocks || [];
  if (!list.length) return `<div class="rock-shelf empty">🪨 ${esc(t("rocks.none"))}</div>`;
  const icons = list.map((id) => `<span class="rk${ROCKS[id].rare ? " rare" : ""}" title="${esc(pick(ROCKS[id]))}">${ROCKS[id].icon}</span>`).join("");
  return `<div class="rock-shelf"><span class="rk-title">🪨 ${esc(t("rocks.title", { n: list.length }))}</span><span class="rks">${icons}</span></div>`;
}

// Walking day: the map is the screen. The day's log, the "simple map" switch
// and "end the day" live in the mission panel (renderTasksPanel).
function renderDayWorld() {
  stage.innerHTML = "";
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
      <span>${esc(t("night.poolFrom", { before, income: s.today.income }))}</span>
      <button class="btn suggest" id="suggest" type="button">${esc(t("knight.suggest"))}</button></div>
    <p class="suggest-note" id="suggest-note">${ui.suggested ? esc(t("knight.suggested")) : ""}</p>
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
        <div><div class="t">${esc(t("night.gh.name"))}</div><div class="d">${E.ghOk(s) ? `${t("night.gh.desc", { o2: C.greenhouse.o2, food: C.greenhouse.food + (tend ? C.greenhouse.tendFood : 0) })}${esc(t(tend ? "night.gh.tended" : "night.gh.untended"))}` : `<b class="bad">${esc(t("night.gh.broken"))}</b>`}</div></div>
        <span class="cost">${C.power.greenhouse} ⚡</span>
        <div class="ctrl"><label class="switch"><input type="checkbox" id="gh-toggle" ${ui.alloc.gh && E.ghOk(s) ? "checked" : ""} ${E.ghOk(s) ? "" : "disabled"}><span class="track"></span><span class="state" id="gh-state"></span></label></div></div>
      <div class="arow${ss ? " highlight" : ""}"><span class="ic" aria-hidden="true">🛡️</span>
        <div><div class="t">${esc(t("night.sh.name"))}</div><div class="d">${ss ? t("night.sh.storm", { shielded: ss.shielded, unshielded: ss.unshielded }) : esc(t("night.sh.calm"))}</div></div>
        <span class="cost">${E.shieldCost(s)} ⚡</span>
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
  // "Suggest a plan": set the sliders to a safe split. The player can still change anything.
  $("#suggest").onclick = () => {
    ui.alloc = suggestAlloc(s);
    ui.suggested = true;
    audio.chime();
    const top = stage.scrollTop;
    renderNight();
    addCollapseButton();
    stage.scrollTop = top;
    updateNudges();
  };
  updateNight();
}

function updateNight() {
  const a = ui.alloc;
  const p = E.previewNight(s, a);
  $("#o2-cost").textContent = `${a.o2} ⚡`;
  $("#o2-desc").textContent = a.o2 ? t("night.o2.on", { made: p.o2Made, per: C.oxygenGen.step * 2, per2: E.o2PerStep(s) * 2 }) : t("night.o2.off");
  $("#gh-state").textContent = t(a.gh ? "ui.on" : "ui.off");
  $("#sh-state").textContent = t(a.shield ? "ui.on" : "ui.off");

  const basis = Math.max(s.battery, p.cost);
  const segs = [
    ["ls", C.power.lifeSupport, t("seg.ls")],
    ["o2", a.o2, t("seg.o2")],
    ["gh", a.gh ? C.power.greenhouse : 0, t("seg.gh")],
    ["sh", a.shield ? E.shieldCost(s) : 0, t("seg.sh")],
  ];
  if (p.overBudget) segs.push(["over", p.cost - s.battery, t("seg.over")]);
  else {
    segs.push(["keep", p.battery, t("seg.keep")]);
    segs.push(["waste", p.overflow, t("seg.waste")]);
  }
  $("#alloc-bar").innerHTML = segs.filter((x) => x[1] > 0).map(([cls, v, label]) =>
    `<div class="seg ${cls}" style="flex:0 0 calc(${(v / basis) * 100}% - 2px)" title="${esc(label)} ${v}">${v / basis > 0.09 ? `${esc(label)} ${v}` : v / basis > 0.04 ? v : ""}</div>`).join("");

  const tomorrow = !p.hasNext ? t("night.lastNight")
    : p.nextKnown ? t("night.tomorrow", { icon: wIcon(E.weatherKey(s, p.nextSol)), weather: wName(E.weatherKey(s, p.nextSol)), income: p.nextIncome })
    : t("night.tomorrowUnknown");
  const cells = [
    ["⚡", "hud.battery", p.battery, p.overBudget ? t("proj.battery.over") : p.overflow ? t("proj.battery.dw", { cost: p.cost, waste: p.overflow }) : t("proj.battery.d", { cost: p.cost }), "var(--blue)"],
    ["🫁", "hud.oxygen", p.oxygen, t("proj.oxygen.d", { delta: sign(p.o2Made + p.ghO2 - C.oxygenUse.crewDaily), breath: C.oxygenUse.crewDaily }), "var(--teal)"],
    ["🥫", "hud.food", `${Math.max(0, p.food)} ${t("unit.days")}`, t("proj.food.d", { delta: sign(p.foodGain - C.food.dailyUse) }), "var(--green)"],
    ["☢️", "hud.dose", p.dose, t("proj.dose.d", { n: p.doseGain }), "var(--red)"],
  ];
  $("#proj").innerHTML = cells.map(([ic, k, v, d, c]) =>
    `<div class="proj-item" style="--c:${c}"><div class="k">${ic} ${esc(t(k))}</div><div class="v">${v}</div><div class="delta">${esc(d)}</div></div>`).join("");
  // the warnings that matter stay in view; the small "good to know" notes fold away
  const big = p.warnings.filter((w) => w.level !== "info"), small = p.warnings.filter((w) => w.level === "info");
  $("#night-alerts").innerHTML = alertHtml(big) + (small.length
    ? `<details class="more"><summary>${esc(t("knight.more", { n: small.length }))}</summary>${alertHtml(small)}</details>` : "");
  $("#night-hint").textContent = tomorrow;
  $("#confirm-night").disabled = p.overBudget;
  updateGuide(p);
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
  const o2Made = E.o2FromPower(a.o2, s);
  const tasks = s.today.tasks || [];
  const newTech = E.techsBetween(m.science, s.science);
  const storm = E.solarStormOn(s, s.sol);
  const w = (k, n) => (n ? t(k, { n }) : "");
  const EV_ICON = { wind: "💨", cold: "🥶", quake: "🫨", meteor: "🌠" };
  // what happened in the night comes first: it changes tomorrow
  const nightBox = s.tonightNotes.length ? `<div class="night-box${h.nightEvent ? ` ev-${h.nightEvent}` : ""}">
      <span class="nb-icon" aria-hidden="true">${EV_ICON[h.nightEvent] || (storm ? "🌌" : h.dustDevil ? "🌀" : "🌙")}</span>
      <div><h3>${esc(t("settle.night"))}</h3>${s.tonightNotes.map((n) => `<p>${tr(n.key, n.params)}</p>`).join("")}</div></div>` : "";
  stage.innerHTML = `
    <div class="stage-head"><h2>${esc(t("settle.title"))}</h2><span class="sub">${esc(t("settle.sub", { n: s.sol }))}</span></div>
    ${nightBox}
    <div class="changes">
      ${change("⚡", "hud.battery", m.battery, s.battery, [w("why.income", h.income), w("why.eva", h.evaPower), w("why.night", E.nightCost(a, s)), w("why.overflow", h.overflow)], "var(--blue)")}
      ${change("🫁", "hud.oxygen", m.oxygen, s.oxygen, [w("why.breath", C.oxygenUse.crewDaily), w("why.suit", h.evaOxygen), w("why.o2made", o2Made), a.gh ? w("why.gh", C.greenhouse.o2) : ""], "var(--teal)")}
      ${change("🥫", "hud.food", m.food, s.food, [t("why.eat"), a.gh ? w("why.food", C.greenhouse.food + (h.tended ? C.greenhouse.tendFood : 0)) : ""], "var(--green)", ` ${t("unit.days")}`)}
      ${change("☢️", "hud.dose", m.dose, s.dose, [w("why.base", h.nightDose), w("why.evaDose", h.evaDose)], "var(--red)")}
      ${change("🔬", "hud.science", m.science, s.science, [h.evas.length ? t("why.evas", { n: h.evas.length }) : t("why.noEva")], "var(--violet)")}
      <div class="change" style="--c:var(--sand)"><div class="k">🔆 ${esc(t("settle.power"))}</div>
        <div class="v">+${h.income} ⚡ <small>/ ${C.weather[h.weather].solar + E.bonusPower(s)}</small></div>
        <div class="why">${esc(t(h.inspected ? "settle.powerWhy" : "settle.powerWhyUnchecked", { panel: h.panelBefore }))}${h.dustDevil ? esc(t("fmt.sep")) + t("why.devil") : ""}</div></div>
    </div>
    <div class="settle-goals">
      <div><h3>${esc(t("settle.tasks", { n: tasks.filter((k) => k.done).length, total: tasks.length }))}</h3>
        <ul class="task-list">${tasks.map((k, i) => taskHtml(k, i, { final: true })).join("")}</ul></div>
      <div><h3>${esc(t("research.title"))}</h3>${researchHtml()}</div>
    </div>
    ${E.apBonusBetween(m.science, s.science).length && s.sol < N ? rewardCardHtml("tomorrow") : ""}
    ${newTech.map(techCardHtml).join("")}
    ${h.alarm ? alertHtml([{ level: "danger", key: h.evas.some((e) => e.storm) ? "settle.surprise" : "settle.alarm" }]) : ""}
    ${storm ? stormBoxHtml(storm) : ""}
    ${s.tonightCards.map((id) => `<div class="fact-card story">${factHtml(id, t("settle.story"), true)}</div>`).join("")}
    <div class="stage-foot">
      <span class="hint">${esc(s.sol + 1 === N ? t("settle.lastNext") : t("settle.left", { n: N - s.sol }))}</span>
      <button class="btn primary" id="next-sol" type="button">${esc(t("settle.next", { n: s.sol + 1 }))}</button>
    </div>`;
  $("#next-sol").onclick = () => { E.nextSol(s); render(); };
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
    ["stat.tasks", s.tasksDone || 0], ["stat.tech", `${E.builtCount(s)} / ${C.tech.length}`],
    ["stat.goals", `${Object.keys(s.goals || {}).length} / ${C.stages.reduce((a, x) => a + x.goals.length, 0)}`], ["stat.repairs", s.repairs || 0], ["stat.requests", s.requestsDone || 0],
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

// ---------- right-hand panels: mission + research, technology line, calendar ----------
const TASK_ICON = { inspect: "🔍", sample: "🧪", anySample: "🧪", shelter: "🛡️", tend: "🌱", call: "📡", repair: "🔧", build: "🛠️" };
const TASK_PLACE = { inspect: "panels", tend: "greenhouse", call: "antenna" }; // where each order is done on the map
const taskPlace = (k) => (k.kind === "sample" ? k.site : k.kind === "repair" ? PART_STATION[k.part] : TASK_PLACE[k.kind] || null);
const starOf = (at) => (at === C.stars[2] ? "⭐⭐⭐" : at === C.stars[1] ? "⭐⭐" : "");

// done / failed / todo. `final`: the day is over, so anything not done is missed.
function taskState(k, final) {
  if (k.done) return "done";
  if (final || (k.kind === "shelter" && s.today.evas.length)) return "failed";
  return "todo";
}

function taskHtml(k, i, opts = {}) {
  const st = taskState(k, opts.final);
  const place = taskPlace(k);
  const go = opts.go && st === "todo" && place;
  const mark = st === "done" ? "✓" : st === "failed" ? "✕" : TASK_ICON[k.kind];
  const part = k.part ? t(`part.${k.part}`) : "";
  const name = k.kind === "shelter" ? t(`task.shelter.${k.why}`) : tr(`task.${k.kind}`, { site: k.site, part, tech: k.tech });
  const sub = k.kind === "shelter" ? t(`task.shelter.${k.why}.d`) : t(`task.${k.kind}.d`, { part });
  const reward = k.reward ? `<span class="rw">+${k.reward} 🔬</span>` : `<span class="rw free">${esc(t("task.free"))}</span>`;
  return `<li class="task ${st}${go ? " go" : ""}${opts.fresh && opts.fresh.has(i) ? " just-done" : ""}"${go ? ` data-go="${place}" tabindex="0" role="button" title="${esc(t("tasks.guide"))}"` : ""}>
    <span class="tk" aria-hidden="true">${mark}</span><span class="tt">${esc(name)}<span class="td">${esc(sub)}</span></span>${reward}</li>`;
}

function tubesHtml() {
  return SITES.map((x) => `<i class="tube${s.visits[x.id] > 0 ? " full" : ""}" style="--tube:${SAMPLE_COLOR[x.id]}" title="${esc(t(`site.${x.id}.name`))}"></i>`).join("");
}

// The whole game in one box: when the rocket leaves, what earns each star, the sample case.
function goalHtml() {
  const left = N - s.sol;
  const pips = Array.from({ length: N }, (_, i) => `<i class="${i + 1 < s.sol ? "past" : i + 1 === s.sol ? "now" : ""}${i + 1 === N ? " last" : ""}"></i>`).join("");
  const stars = [
    { n: 1, label: t("goal.star1", { n: N }), p: `${Math.min(s.sol, N)}/${N}`, got: !!(s.outcome && s.outcome.success) },
    { n: 2, label: t("goal.star2", { n: C.stars[1] }), p: `${Math.min(s.science, C.stars[1])}/${C.stars[1]}`, got: s.science >= C.stars[1] },
    { n: 3, label: t("goal.star3", { n: C.stars[2] }), p: `${Math.min(s.science, C.stars[2])}/${C.stars[2]}`, got: s.science >= C.stars[2] },
  ];
  const sealed = SITES.filter((x) => s.visits[x.id] > 0).length;
  return `<div class="goal"><div class="goal-title">${esc(t("goal.title"))}</div><div class="goal-sub">${esc(t("goal.sub"))}</div>
    <div class="launch"><span class="rocket" aria-hidden="true">🚀</span><span>${esc(left > 0 ? t("goal.launch", { n: left }) : t("goal.launchToday"))}</span></div>
    <div class="sol-pips" aria-hidden="true">${pips}</div>
    <ul class="stars-goal">${stars.map((x) => `<li class="${x.got ? "got" : ""}"><span class="st" aria-hidden="true">${"⭐".repeat(x.n)}</span><span>${esc(x.label)}</span><span class="p">${x.p}</span></li>`).join("")}</ul>
    <div class="mini-rack"><span class="tubes" aria-hidden="true">${tubesHtml()}</span><span>${esc(t("goal.samples", { n: sealed, total: SITES.length }))}</span></div>
  </div>`;
}

// Research points on a bar, with each blueprint as a step along it and the
// ⭐⭐ / ⭐⭐⭐ marks above. A built item gets a tick.
function researchHtml(withLink = true) {
  const max = C.stars[2];
  const pos = (n) => Math.min(100, (n / max) * 100);
  const steps = C.tech.map((k) => {
    const info = TECH_INFO[k.id];
    const cls = E.techOn(s, k.id) ? " on built" : s.science >= k.at ? " on" : "";
    return `<span class="step${cls}" style="left:${pos(k.at)}%" title="${esc(pick(info.name))}">${info.icon}<b>${k.at}</b></span>`;
  }).join("");
  const stars = [1, 2].map((i) => `<span class="star-mark" style="left:${pos(C.stars[i])}%">${"⭐".repeat(i + 1)}</span>`).join("");
  const gifts = C.apBonus.map((n) => `<span class="gift-mark${s.science >= n ? " got" : ""}" style="left:${pos(n)}%" title="${esc(t("reward.name"))}">🎁</span>`).join("");
  const nx = E.nextTech(s);
  const ready = E.buildable(s);
  return `<div class="research-line"><span class="big">${s.science}</span><span>${esc(t("research.pts"))}</span></div>
    <div class="research-bar" role="img" aria-label="${esc(t("research.aria", { n: s.science, max }))}"><div class="fill" style="width:${pos(s.science)}%"></div>${steps}${stars}${gifts}</div>
    ${ready.length ? `<div class="research-ready">🔧 ${t("research.ready", { names: ready.map((k) => `<b>${esc(t(`techname.${k.id}`))}</b>`).join(esc(t("fmt.sep"))) })}</div>` : ""}
    <div class="research-next">${nx ? t("research.next", { name: esc(t(`techname.${nx.id}`)), n: nx.at - s.science }) : esc(t("research.all"))}
      ${withLink ? ` <button class="linkish" type="button" data-open-panel="tech">${esc(t("research.open"))}</button>` : ""}</div>`;
}

// Research rewards (config.apBonus): one more action point every day, free.
// A row in the tech panel, with how far the next one is.
function rewardsHtml() {
  const nx = E.nextApBonus(s);
  const rows = C.apBonus.map((n, i) => {
    const got = s.science >= n, next = n === nx;
    const prev = i ? C.apBonus[i - 1] : 0;
    const status = got ? t("reward.got") : t("reward.at", { n });
    return `<li class="reward ${got ? "got" : next ? "next" : "locked"}">
      <span class="ri" aria-hidden="true">${got ? "✅" : "🎁"}</span>
      <div><b>${esc(t("reward.name"))}</b><span class="at">${esc(status)}</span>
        <small>${esc(t("reward.total", { n: C.actionPoints + i + 1 }))}${next ? ` · ${esc(t("reward.left", { n: n - s.science }))}` : ""}</small>
        ${next ? `<div class="prog" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, ((s.science - prev) / (n - prev)) * 100))}%"></i></div>` : ""}</div></li>`;
  }).join("");
  return `<div class="rewards"><h4>🎁 ${esc(t("reward.title"))}</h4><p class="rw-intro">${esc(t("reward.intro"))}</p><ul>${rows}</ul></div>`;
}
// The card in the morning report (first day with the extra point) or night report (just earned).
function rewardCardHtml(kind) {
  return `<div class="tech-card reward-card"><div class="label">🎁 ${esc(t("reward.label"))}</div>
    <h3>${esc(t("reward.name"))}</h3>
    <p>${esc(kind === "today" ? t("reward.today", { n: s.ap }) : t("reward.tomorrow", { n: E.maxAp(s) }))}</p>
    <p class="rw-tip">${esc(t("reward.tip"))}</p></div>`;
}

// Which survey sites a tool opens (for the tech panel and cards).
const opensSites = (id) => SITES.filter((x) => (x.needs || []).includes(id));

function techSource(info) {
  return `<p class="src">${esc(t("fact.source"))} <a href="${info.source.url}" target="_blank" rel="noopener">${esc(pick(info.source.label))} ↗</a></p>`;
}

// Shown in the morning report or night report the day a blueprint unlocks.
function techCardHtml(k) {
  const info = TECH_INFO[k.id];
  const opens = opensSites(k.id);
  return `<div class="tech-card"><div class="label">${esc(t("tech.newLabel"))}</div>
    <h3>${info.icon} ${esc(pick(info.name))}</h3>
    <p><b>${esc(t("tech.effect"))}</b> ${esc(pick(info.effect))}</p>
    ${opens.length ? `<p class="tech-opens">🗺️ ${esc(t("tech.opens", { sites: opens.map((x) => t(`site.${x.id}.name`)).join(t("fmt.sep")) }))}</p>` : ""}
    <p class="tech-cost">🔧 ${esc(t("tech.cost", { ap: k.ap, power: k.power }))}</p>
    <p>${esc(pick(info.story))}</p>${techSource(info)}</div>`;
}

// One blueprint in the tech panel: locked (not enough research), ready to
// build (with the Build button during the day), or built.
function techItemHtml(k, nx) {
  const info = TECH_INFO[k.id];
  const built = E.techOn(s, k.id), ready = !built && s.science >= k.at, next = !!nx && nx.id === k.id;
  const chk = E.checkBuild(s, k.id);
  const opens = opensSites(k.id);
  const status = built ? t("tech.built") : ready ? t("tech.ready") : t("tech.at", { n: k.at });
  return `<article class="tech ${built ? "on" : ready ? "ready" : next ? "next" : "locked"}">
    <div class="ti" aria-hidden="true">${info.icon}</div>
    <div><h5>${esc(pick(info.name))}<span class="at">${esc(status)}</span></h5>
      <p class="eff"><b>${esc(t("tech.effect"))}</b> ${esc(pick(info.effect))}</p>
      ${opens.length ? `<p class="tech-opens">🗺️ ${esc(t("tech.opens", { sites: opens.map((x) => t(`site.${x.id}.name`)).join(t("fmt.sep")) }))}</p>` : ""}
      ${next ? `<div class="prog" aria-hidden="true"><i style="width:${Math.min(100, (s.science / k.at) * 100)}%"></i></div>` : ""}
      ${built ? "" : `<div class="tech-build"><span>🔧 ${esc(t("tech.cost", { ap: k.ap, power: k.power }))}</span>
        ${ready ? `<button class="btn small primary" type="button" data-build="${k.id}" ${chk.ok ? "" : "disabled"}>${esc(t("tech.buildBtn"))}</button>
          ${chk.ok ? "" : `<small class="lock">${tr(chk.reason.key, chk.reason.params)}</small>`}` : ""}</div>`}
      <details><summary>${esc(t("tech.story"))}</summary><p>${esc(pick(info.story))}</p>${techSource(info)}</details></div>
  </article>`;
}

// Build a blueprint (from the tech panel, or the classic map's buttons).
function buildTech(id) {
  if (!s || s.phase !== "day") return;
  const r = E.doBuild(s, id);
  if (!r.ok) return;
  audio.chime();
  toast(t("world.toast.build", { tech: t(`techname.${id}`) }));
  render();
}

const panelHead = (key) => `<div class="gpanel-head"><h3>${esc(t(key))}</h3><button class="gpanel-x" type="button" data-panel-close aria-label="${esc(t("dock.close"))}">✕</button></div>`;

function renderTasksPanel() {
  const el = $("#panel-tasks");
  const tasks = (s.today && s.today.tasks) || [];
  const final = s.phase === "night" || s.phase === "settle" || s.phase === "end";
  const walkingDay = s.phase === "day" && walking();
  // tasks finished since the last draw get a little "done!" bounce
  const mark = `${s.sol}:${tasks.map((k) => (k.done ? 1 : 0)).join("")}`;
  const [prevSol, prevBits = ""] = ui.doneMark.split(":");
  const fresh = new Set();
  if (prevSol === String(s.sol)) tasks.forEach((k, i) => { if (k.done && prevBits[i] === "0") fresh.add(i); });
  ui.doneMark = mark;
  const log = s.today ? s.today.log : [];
  const top = el.scrollTop;
  el.innerHTML = `${panelHead("tasks.title")}
    ${goalHtml()}
    ${stageHtml(true)}
    ${knowsHtml()}
    ${rocksHtml()}
    <h4>${esc(t("tasks.today", { n: s.sol }))}</h4>
    <ul class="task-list">${tasks.map((k, i) => taskHtml(k, i, { go: walkingDay, fresh, final })).join("")}</ul>
    ${walkingDay ? `<p class="task-hint">${esc(t("tasks.hintGo"))}</p>` : ""}
    <h4>${esc(t("research.title"))}</h4>
    ${researchHtml()}
    ${walkingDay ? `<details class="day-log"${log.length ? " open" : ""}><summary>${esc(t("day.log"))}</summary>
        <ul>${log.length ? log.map((l) => `<li>${tr(l.key, l.params)}</li>`).join("") : `<li>${esc(t("day.logEmpty"))}</li>`}</ul></details>
      <div class="day-ctrl"><button class="btn" id="to-classic" type="button">${esc(t("world.classic"))}</button>
        <button class="btn primary" id="end-day" type="button">${esc(t("world.endDay"))}</button></div>` : ""}`;
  el.scrollTop = top;
}

function renderTechPanel() {
  const el = $("#panel-tech");
  const nx = E.nextTech(s);
  const top = el.scrollTop;
  el.innerHTML = `${panelHead("tech.title")}<p class="tech-intro">${esc(t("tech.intro"))}</p>
    ${researchHtml(false)}
    ${rewardsHtml()}
    <div class="tech-list">${C.tech.map((k) => techItemHtml(k, nx)).join("")}</div>`;
  el.scrollTop = top;
}

function renderPanels() {
  if (!s) return;
  const tasks = (s.today && s.today.tasks) || [];
  $("#dock-tasks").textContent = tasks.length ? `${tasks.filter((k) => k.done).length}/${tasks.length}` : "";
  const ready = E.buildable(s).length;
  $("#dock-tech").textContent = ready && s.phase !== "end" ? `🔧${ready}` : `${s.science}`; // blueprints waiting to be built
  $('.dock-btn[data-panel="tech"]').classList.toggle("has-ready", !!ready && s.phase !== "end");
  $("#dock-cal").textContent = "";
  $$(".dock-btn").forEach((b) => {
    b.classList.toggle("on", b.dataset.panel === ui.panel);
    b.setAttribute("aria-expanded", String(b.dataset.panel === ui.panel));
  });
  $$(".gpanel").forEach((p) => p.classList.toggle("open", p.dataset.panel === ui.panel));
  if (world) world.setInsets(ui.panel && !window.matchMedia("(max-width: 900px)").matches ? 336 : 0);
  if (ui.panel === "tasks") renderTasksPanel();
  else if (ui.panel === "tech") renderTechPanel();
}

function openPanel(name) {
  ui.panel = name;
  renderPanels();
}

// A technology unlocked while walking: tell the player on the map and make
// the dock's technology button pulse. (The reports show the full card.)
function noticeTech() {
  const before = ui.prevSci == null ? s.science : ui.prevSci;
  ui.prevSci = s.science;
  const gained = E.techsBetween(before, s.science);
  if (E.apBonusBetween(before, s.science).length && s.phase === "day" && s.sol < N) { // a research reward
    replay($('.dock-btn[data-panel="tech"]'), "ping");
    audio.found(true);
    if (walking()) setTimeout(() => toast(t("reward.toast")), gained.length ? 3400 : 1700);
  }
  if (!gained.length) return;
  replay($('.dock-btn[data-panel="tech"]'), "ping");
  if (s.phase === "day" && walking()) {
    const name = t(`techname.${gained[gained.length - 1].id}`);
    setTimeout(() => toast(t("tech.toast", { name })), 1700); // after the job's own toast
  }
}

// Gold markers on the map: where today's unfinished orders are done, and the
// habitat once there is nothing left to do.
function focusTargets() {
  const ids = (s.today.tasks || []).filter((k) => taskState(k) === "todo").map(taskPlace).filter(Boolean);
  for (const f of E.knownFaults(s)) ids.push(PART_STATION[f.kind]); // anything that needs fixing
  if (s.request && E.reachable(s, s.request.site)) ids.push(s.request.site); // Earth's request
  if (!ids.length || s.ap === 0) ids.push("habitat");
  return [...new Set(ids)];
}

// "What we know": how far ahead the crew can see. This is what the player
// weighs when deciding whether calling Earth is worth an action point.
function knowsHtml() {
  const sun = E.spaceStatus(s, s.sol);
  const wxTo = E.weatherKnownUntil(s);
  const faults = E.knownFaults(s);
  const line = (cls, icon, text) => `<li class="${cls}"><span aria-hidden="true">${icon}</span>${esc(text)}</li>`;
  return `<div class="knows"><h4>${esc(t("knows.title"))}</h4><ul>
    ${line(sun === "storm" ? "bad" : sun === "clear" ? "ok" : "unk", "☀️", sun === "storm" ? t("knows.sun.storm") : sun === "clear" ? t("knows.sun.clear", { n: s.sunUntil }) : t("knows.sun.unknown"))}
    ${line(wxTo > s.sol ? "ok" : "unk", "🛰️", wxTo > s.sol ? t("knows.wx", { n: wxTo }) : t("knows.wx.none"))}
    ${line(faults.length ? "bad" : s.lastTelemetry ? "ok" : "unk", "🔧", faults.length ? t("knows.parts.bad", { n: faults.length }) : s.lastTelemetry ? t("knows.parts.ok", { n: s.lastTelemetry }) : t("knows.parts.none"))}
  </ul><p class="knows-tip">📡 ${esc(t("knows.tip"))}</p></div>`;
}

// "Show the way": the astronaut walks to the place of a task.
function guideTo(id) {
  if (!world || !walking() || s.phase !== "day") return;
  const site = siteById(id);
  const st = WORLD_BASE.stations.find((x) => x.id === id);
  if (site) world.walkTo(site.wx, site.wz);
  else if (st) world.walkTo(st.x, st.z);
  if (window.matchMedia("(max-width: 900px)").matches) openPanel(null); // phones: get the panel out of the way
}

$("#rcol").addEventListener("click", (e) => {
  const bld = e.target.closest("[data-build]");
  if (bld) { buildTech(bld.dataset.build); return; }
  const dock = e.target.closest(".dock-btn");
  if (dock) { openPanel(ui.panel === dock.dataset.panel ? null : dock.dataset.panel); return; }
  if (e.target.closest("[data-panel-close]")) { openPanel(null); return; }
  const go = e.target.closest("[data-go]");
  if (go) { guideTo(go.dataset.go); return; }
  if (e.target.closest("#to-classic")) { ui.classic = true; ui.site = null; render(); return; }
  if (e.target.closest("#end-day")) endDayNow();
});
// ---------- the big map (click the minimap) ----------
function openBigMap() {
  if (!world || !s) return;
  ui.mapSel = null;
  $("#bigmap").showModal();
  drawBigMap();
}
function drawBigMap() {
  ui.mapMarks = world.drawOverview($("#bigmap-canvas"));
  const x = ui.mapSel ? siteById(ui.mapSel) : null;
  const info = $("#bigmap-info");
  if (!x) { info.textContent = t("bigmap.hint"); return; }
  const missing = E.missingGear(s, x.id);
  const tier = C.evaTiers[x.tier];
  const canGo = s.phase === "day" && walking() && !missing.length;
  info.innerHTML = `<b>${x.icon} ${esc(t(`site.${x.id}.name`))}</b> · ${esc(t(`zone.${x.zone}`))} · ${esc(t("site.km", { n: siteKm(x) }))} · ${esc(t("day.apCost", { n: tier.ap }))}
    ${s.visits[x.id] ? ` · ✓ ${esc(t("bigmap.sampled"))}` : ""}
    <div>${missing.length ? missing.map((k) => `${TECH_INFO[k].icon} ${esc(t("gear.needs", { tech: t(`techname.${k}`) }))}`).join(" · ") : esc(t(`trip.why.${x.tier}`))}</div>
    ${canGo ? `<button class="btn small primary" type="button" id="bigmap-go">${esc(t("tasks.guide"))}</button>` : ""}`;
  const go = $("#bigmap-go");
  if (go) go.onclick = () => { $("#bigmap").close(); guideTo(x.id); };
}
$(".world-map").addEventListener("click", openBigMap);
$("#bigmap-canvas").addEventListener("click", (e) => {
  const cv = e.currentTarget, b = cv.getBoundingClientRect();
  const px = (e.clientX - b.left) * (cv.width / b.width), py = (e.clientY - b.top) * (cv.height / b.height);
  let best = null, bestD = Infinity;
  for (const m of ui.mapMarks || []) {
    const d = Math.hypot(m.x - px, m.y - py);
    if (d < m.r && d < bestD) { best = m; bestD = d; }
  }
  ui.mapSel = best && siteById(best.id) ? best.id : null;
  drawBigMap();
});

$("#rcol").addEventListener("keydown", (e) => {
  const go = e.target.closest("[data-go]");
  if (go && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); guideTo(go.dataset.go); }
});

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
  openInfo(`<h3>${esc(t("help.title", { n: N }))}</h3><p>${t("help.intro")}</p>
    <ol class="help-list">${[1, 2, 3, 4].map((i) => `<li>${t(`help.l${i}`, { ap: C.actionPoints })}</li>`).join("")}</ol>
    <p>${t("help.end", { n: N })}</p>`);
}

// ---------- language ----------
function refreshLanguage() {
  applyStatic();
  updateSoundBtn();
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
  } else if (btn.dataset.openPanel) {
    openPanel(btn.dataset.openPanel);
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
$("#btn-new").addEventListener("click", async () => {
  if (s && s.phase !== "end" && (s.sol > 1 || s.phase !== "briefing") && !(await askYesNo(t("top.confirmNew")))) return;
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
updateSoundBtn();
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
