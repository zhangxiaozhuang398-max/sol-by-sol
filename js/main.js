import {
  newGame, endSol, setAlloc, choose, canAdd, canChoose, powerToday, slotMax,
  allocTotal, batteryDraw, previewNight, WEATHER_ICONS, FORECAST_ICONS,
} from "./game.js";
import { CARDS } from "./cards.js";
import { FACTS } from "./facts.js";
import { t, pick, getLang, setLang, applyStatic } from "./i18n.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = (n) => n.toLocaleString(getLang() === "zh" ? "zh-CN" : "en-US");

let pool = [];
let s = null;
let nightReport = null; // report currently shown (or last shown) in the night dialog
let endFresh = []; // knowledge cards newly unlocked on the end screen

// ---------- saved knowledge cards (per browser, optional) ----------
const KEY = "solbysol.knowledge";
function loadCollection() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function saveCollection(ids) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage blocked: fine */ }
}

// ---------- helpers ----------
function show(id) {
  $$(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
  window.scrollTo({ top: 0 });
}
const activeScreen = () => $(".screen.active")?.id;

function factHtml(id, label = "") {
  const f = FACTS[id];
  if (!f) return "";
  return `${label ? `<div class="label">${esc(label)}</div>` : ""}
    <h3>${f.icon} ${esc(pick(f.title))}</h3><p>${esc(pick(f.text))}</p>
    <p class="src">${esc(t("night.source"))} <a href="${f.source.url}" target="_blank" rel="noopener">${esc(pick(f.source.label))} ↗</a></p>`;
}

function openInfo(html) {
  $("#info-body").innerHTML = html;
  $("#info").showModal();
}

// ---------- game rendering ----------
function render() {
  const w = s.weather[s.sol].type;
  const fc = s.forecast[s.sol];
  const power = powerToday(s);

  $("#sol-num").textContent = t("game.sol", { n: s.sol });
  $("#chip-weather").textContent = `${WEATHER_ICONS[w]} ${t(`weather.${w}`)} · ⚡${power}`;
  const chipF = $("#chip-forecast");
  chipF.className = `chip ${fc}`;
  chipF.textContent = `${FORECAST_ICONS[fc]} ${t(`forecast.${fc}`)}`;

  $("#progress").innerHTML = Array.from({ length: s.cfg.maxSol }, (_, i) =>
    `<i class="${i + 1 < s.sol ? "done" : i + 1 === s.sol ? "now" : ""}"></i>`).join("");

  // scene
  $("#scene").className = `scene ${w} ${fc === "warning" ? "warning" : ""}`;
  $("#shield-arc").style.strokeWidth = s.alloc.shield * 3;
  $("#berm1").style.opacity = s.berm ? 0.5 + s.berm * 0.25 : 0;

  // meters
  for (const key of ["o2", "battery", "dose"]) {
    const m = $(`.meter[data-key="${key}"]`);
    $(".val", m).textContent = `${s[key]} / 10`;
    $(".bar i", m).style.width = `${s[key] * 10}%`;
    m.classList.toggle("low", key === "dose" ? s.dose >= 7 : s[key] <= 2);
  }
  $("#science-val").textContent = s.science;
  const next = s.cfg.stars.find((goal) => s.science < goal);
  $("#star-goal").textContent = next ? t("goal.next", { n: next }) : t("goal.done");

  renderIntel();
  renderPower(power);
  renderHand();
  renderPreview();
}

function renderIntel() {
  const box = $("#intel");
  if (!s.intel) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const rows = s.intel.map((i) => {
    const storm = i.storm
      ? t("intel.storm", { strength: esc(t(`strength.${i.storm.event.strength}`)), dose: i.storm.dose })
      : esc(t("intel.noStorm"));
    return `<li><b>${esc(t("intel.sol", { n: i.sol }))}</b> ${WEATHER_ICONS[i.weather]} ${esc(t(`weather.${i.weather}`))} · ${storm}</li>`;
  }).join("");
  box.innerHTML = `<h3>${esc(t("intel.title"))}</h3><ul>${rows}</ul>`;
}

function renderPower(power) {
  const used = allocTotal(s);
  const draw = batteryDraw(s);
  const spare = Math.max(0, power - used);
  $("#supply-pips").innerHTML =
    Array.from({ length: power }, (_, i) => `<span class="pip ${i < used ? "used" : "solar"}">⚡</span>`).join("") +
    Array.from({ length: draw }, () => `<span class="pip batt" title="${esc(t("power.fromBattery"))}">🔋</span>`).join("");

  for (const slotEl of $$(".slot")) {
    const slot = slotEl.dataset.slot;
    const max = slotMax(s, slot);
    $("[data-pips]", slotEl).innerHTML = Array.from({ length: s.cfg.slotMax }, (_, i) =>
      `<span class="pip ${i < s.alloc[slot] ? "solar" : ""}" ${i >= max ? 'style="opacity:.2"' : ""}>${i < s.alloc[slot] ? "⚡" : ""}</span>`).join("");
    $("[data-plus]", slotEl).disabled = !canAdd(s, slot);
    $("[data-minus]", slotEl).disabled = s.alloc[slot] === 0;
    slotEl.classList.toggle("broken", slot === "o2" && s.o2Broken);
  }

  const notes = [];
  if (s.o2Broken) notes.push(t("note.broken"));
  if (s.forecast[s.sol] === "warning" && s.alloc.shield === 0) notes.push(t("note.noShield"));
  if (draw) notes.push(t("note.draw", { n: draw }));
  else if (spare) notes.push(t("note.spare", { n: spare }));
  $("#power-note").textContent = notes.join(" ");
}

function renderHand() {
  $("#hand").innerHTML = s.hand.map((id) => {
    const c = CARDS[id];
    const ok = canChoose(s, id);
    return `<button class="card ${s.chosen === id ? "chosen" : ""}" data-card="${id}" ${ok ? "" : "disabled"} aria-pressed="${s.chosen === id}">
      <span class="c-icon">${c.icon}</span><span class="c-name">${esc(t(`card.${id}.name`))}</span>
      <span class="c-hint">${esc(t(`card.${id}.hint`))}</span>
      <span class="c-gain">✔ ${esc(t(`card.${id}.gain`))}</span><span class="c-cost">✖ ${esc(t(`card.${id}.cost`))}</span>
    </button>`;
  }).join("");
}

function renderPreview() {
  const btn = $("#btn-end");
  if (!s.chosen) {
    $("#preview").innerHTML = `<div class="note">${esc(t("preview.empty"))}</div>`;
    btn.disabled = true;
    btn.textContent = t("preview.pickFirst");
    return;
  }
  const p = previewNight(s);
  const fc = s.forecast[s.sol];
  const cls = (v) => (v <= 0 ? "bad" : v <= 2 ? "warn" : "");
  let storm = "";
  if (fc === "warning") storm = `<div class="row warn"><span>${esc(t("preview.stormTonight"))}</span><span>${esc(t("preview.shieldBlocks", { n: s.alloc.shield + s.berm }))}</span></div>`;
  else if (fc === "watch") storm = `<div class="row"><span>${esc(t("preview.stormSoon"))}</span><span></span></div>`;
  $("#preview").innerHTML = `
    <div class="note">${esc(t("preview.intro"))}</div>
    <div class="row ${cls(p.o2)}"><span>${esc(t("preview.o2"))}</span><span>${s.o2} → ${Math.max(p.o2, 0)}${p.o2 <= 0 ? esc(t("preview.runOut")) : ""}</span></div>
    <div class="row ${p.cold ? "bad" : cls(p.battery)}"><span>${esc(t("preview.battery"))}</span><span>${s.battery} → ${p.battery}${p.cold ? esc(t("preview.tooCold")) : ""}</span></div>
    ${storm}`;
  btn.disabled = false;
  btn.textContent = t("preview.end", { n: s.sol });
}

// ---------- night ----------
function renderNight(r, animate) {
  $("#night-title").textContent = t("night.title", { n: r.sol });
  $("#night-lines").innerHTML = r.lines.map((l, i) => {
    const delta = l.deltaKey ? t(l.deltaKey) : l.delta;
    const style = animate ? `animation-delay:${i * 0.18}s` : "animation:none;opacity:1";
    return `<li class="${l.kind}" style="${style}"><span>${l.icon}</span><span>${esc(t(l.key, l.params))}</span><span class="d">${esc(delta)}</span></li>`;
  }).join("");

  if (r.storm) {
    const e = r.storm.event;
    const text = t("night.stormBox", {
      date: esc(e.date),
      speed: num(e.speedKmS),
      instrument: esc(e.instrument),
      sep: e.hadParticleStorm ? esc(t("night.stormSep")) : "",
    });
    $("#night-storm").innerHTML = `<div class="storm-box">${text}
      <a href="${e.link}" target="_blank" rel="noopener">${esc(t("night.stormLink"))}</a></div>`;
  } else $("#night-storm").innerHTML = "";

  $("#night-fact").innerHTML = factHtml(r.fact, t("night.didYouKnow"));
  $("#btn-next").textContent = r.over ? t("night.report") : t("night.next", { n: r.sol + 1 });
}

function showNight(r) {
  nightReport = r;
  renderNight(r, true);
  $("#night").showModal();
}

// ---------- end ----------
function chartSvg(history, storms) {
  const W = 600, H = 200, P = 26;
  const n = Math.max(history.length - 1, 1);
  const x = (i) => P + (i / n) * (W - 2 * P);
  const y = (v) => H - P - (v / 10) * (H - 2 * P);
  const line = (key, color) =>
    `<polyline fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" points="${history.map((h, i) => `${x(i)},${y(Math.max(0, Math.min(10, h[key])))}`).join(" ")}"/>`;
  const grid = [0, 5, 10].map((v) => `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" stroke="#4b3f7a" stroke-dasharray="4 4"/><text x="4" y="${y(v) + 4}" fill="#c5b8e0" font-size="11">${v}</text>`).join("");
  const marks = storms.map((st) => `<text x="${x(st.sol)}" y="${P - 6}" text-anchor="middle" font-size="14">☀️</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t("end.chartAria"))}">${grid}${marks}
    ${line("o2", "#4fd1c5")}${line("battery", "#6ea8ff")}${line("dose", "#ff5d73")}
    <text x="${W - P}" y="${H - 6}" text-anchor="end" fill="#c5b8e0" font-size="11">${esc(t("end.axis"))}</text></svg>
    <div class="legend"><span style="color:#4fd1c5">${esc(t("end.legendO2"))}</span><span style="color:#6ea8ff">${esc(t("end.legendBattery"))}</span><span style="color:#ff5d73">${esc(t("end.legendDose"))}</span><span>${esc(t("end.legendStorm"))}</span></div>`;
}

function renderEnd() {
  const { cause, stars, sol } = s.result;
  $("#end-title").textContent = t(`end.${cause}`);
  $("#end-stars").textContent = cause === "win" ? "⭐".repeat(stars) + "☆".repeat(3 - stars) : "";
  const why = t(`end.${cause}.why`, { sol, max: s.cfg.maxSol, sci: s.science });
  const tail = cause === "win" ? t("end.goals", { goals: s.cfg.stars.join(" / ") }) : t("end.tryAgain");
  $("#end-why").textContent = `${why} ${tail}`;
  $("#chart").innerHTML = chartSvg(s.history, s.stormsFaced);

  $("#storm-list").innerHTML = s.stormsFaced.length
    ? s.stormsFaced.map((st) => `<li>${t("end.stormItem", { sol: st.sol, date: esc(st.date), speed: num(st.speedKmS), blocked: st.blocked, dose: st.dose })}
        <a href="${st.link}" target="_blank" rel="noopener">${esc(t("end.stormLink"))}</a></li>`).join("")
    : `<li>${esc(t("end.noStorms"))}</li>`;

  $("#new-cards").innerHTML = endFresh.length
    ? endFresh.map((f) => `<div class="fact-card">${factHtml(f)}</div>`).join("")
    : `<p class="note">${esc(t("end.noCards"))}</p>`;
}

function showEnd() {
  const before = loadCollection();
  endFresh = s.factsSeen.filter((f) => !before.includes(f));
  saveCollection([...before, ...endFresh]);
  updateCollectionCount();
  renderEnd();
  show("screen-end");
}

// ---------- collection ----------
function updateCollectionCount() {
  $("#collection-count").textContent = `(${loadCollection().length}/${Object.keys(FACTS).length})`;
}
function renderCollection() {
  const have = loadCollection();
  $("#collection-grid").innerHTML = Object.keys(FACTS).map((id) => have.includes(id)
    ? `<div class="fact-card">${factHtml(id)}</div>`
    : `<div class="fact-card locked"><h3>🔒 ???</h3><p>${esc(t("collection.locked"))}</p></div>`).join("");
}

// ---------- language ----------
function refreshLanguage() {
  applyStatic();
  updateCollectionCount();
  if (s && activeScreen() === "screen-game") render();
  if (s?.result && activeScreen() === "screen-end") renderEnd();
  if ($("#night").open && nightReport) renderNight(nightReport, false);
  if ($("#collection").open) renderCollection();
  if ($("#info").open) $("#info").close(); // its content was built in the old language
}

// ---------- events ----------
function startGame() {
  s = newGame(pool, Date.now() % 2147483647);
  render();
  show("screen-game");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.classList.contains("lang-toggle")) {
    setLang(getLang() === "en" ? "zh" : "en");
    refreshLanguage();
  } else if (btn.matches("[data-plus], [data-minus]")) {
    const slot = btn.closest(".slot").dataset.slot;
    setAlloc(s, slot, s.alloc[slot] + (btn.matches("[data-plus]") ? 1 : -1));
    render();
  } else if (btn.dataset.card) {
    choose(s, btn.dataset.card);
    render();
  } else if (btn.dataset.fact) {
    openInfo(factHtml(btn.dataset.fact));
  } else if (btn.matches("[data-close]")) {
    btn.closest("dialog").close();
  }
});

$("#chip-forecast").addEventListener("click", () => {
  const fc = s.forecast[s.sol];
  openInfo(`<h3>${FORECAST_ICONS[fc]} ${esc(t(`forecast.${fc}`))}</h3><p>${esc(t(`forecast.${fc}.detail`))}</p>${factHtml("forecast", t("night.didYouKnow"))}`);
});
$("#btn-start").addEventListener("click", startGame);
$("#btn-again").addEventListener("click", startGame);
$("#btn-home").addEventListener("click", () => show("screen-title"));
$("#btn-collection").addEventListener("click", () => {
  renderCollection();
  $("#collection").showModal();
});
$("#btn-end").addEventListener("click", () => {
  const r = endSol(s);
  if (r) showNight(r);
});
$("#btn-next").addEventListener("click", () => {
  $("#night").close();
  if (nightReport?.over) showEnd();
  else render();
});
// Don't let Escape skip the night report without advancing the game.
$("#night").addEventListener("cancel", (e) => e.preventDefault());

// ---------- boot ----------
applyStatic();
updateCollectionCount();
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
