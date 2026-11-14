import {
  newGame, endSol, setAlloc, choose, canAdd, canChoose, powerToday, slotMax,
  allocTotal, batteryDraw, previewNight, describeWeather, describeForecast,
} from "./game.js";
import { CARDS } from "./cards.js";
import { FACTS } from "./facts.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let pool = [];
let s = null;
let pendingReport = null;

// ---------- saved knowledge cards (per browser, optional) ----------
const KEY = "solbysol.knowledge";
function loadCollection() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function saveCollection(ids) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage blocked: fine */ }
}

// ---------- screens ----------
function show(id) {
  $$(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
  window.scrollTo({ top: 0 });
}

function factHtml(id, label = "") {
  const f = FACTS[id];
  if (!f) return "";
  return `${label ? `<div class="label">${esc(label)}</div>` : ""}
    <h3>${f.icon} ${esc(f.title)}</h3><p>${esc(f.text)}</p>
    <p class="src">Source: <a href="${f.source.url}" target="_blank" rel="noopener">${esc(f.source.label)} ↗</a></p>`;
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

  $("#sol-num").textContent = `Sol ${s.sol}`;
  const wd = describeWeather[w];
  $("#chip-weather").innerHTML = `${wd.icon} ${wd.label} · ⚡${power}`;
  const fd = describeForecast[fc];
  const chipF = $("#chip-forecast");
  chipF.className = `chip ${fc}`;
  chipF.innerHTML = `${fd.icon} ${fd.label}`;

  $("#progress").innerHTML = Array.from({ length: s.cfg.maxSol }, (_, i) =>
    `<i class="${i + 1 < s.sol ? "done" : i + 1 === s.sol ? "now" : ""}"></i>`).join("");

  // scene
  const scene = $("#scene");
  scene.className = `scene ${w} ${fc === "warning" ? "warning" : ""}`;
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
  const next = s.cfg.stars.find((t) => s.science < t);
  $("#star-goal").textContent = next ? `Next ⭐ at ${next}` : "⭐⭐⭐ reached!";

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
    const wd = describeWeather[i.weather];
    const storm = i.storm
      ? `☀️ <b>Solar storm</b> (${i.storm.event.strength}, up to ${i.storm.dose} ☢️)`
      : "🟢 no solar storm";
    return `<li><b>Sol ${i.sol}:</b> ${wd.icon} ${wd.label} · ${storm}</li>`;
  }).join("");
  box.innerHTML = `<h3>📡 Reply from Earth</h3><ul>${rows}</ul>`;
}

function renderPower(power) {
  const used = allocTotal(s);
  const draw = batteryDraw(s);
  const spare = Math.max(0, power - used);
  $("#supply-label").textContent = `Solar power today:`;
  $("#supply-pips").innerHTML =
    Array.from({ length: power }, (_, i) => `<span class="pip ${i < used ? "used" : "solar"}">⚡</span>`).join("") +
    Array.from({ length: draw }, () => `<span class="pip batt" title="from battery">🔋</span>`).join("");

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
  if (s.o2Broken) notes.push("⚙️ The O₂ Maker is broken: it can only use 2 power. Repair it!");
  if (s.forecast[s.sol] === "warning" && s.alloc.shield === 0) notes.push("⚠️ A storm is coming tonight and your shield is off!");
  if (draw) notes.push(`Using ${draw} 🔋 from your battery.`);
  else if (spare) notes.push(`${spare} spare ⚡ will charge your battery.`);
  $("#power-note").textContent = notes.join(" ");
}

function renderHand() {
  $("#hand").innerHTML = s.hand.map((id) => {
    const c = CARDS[id];
    const ok = canChoose(s, id);
    return `<button class="card ${s.chosen === id ? "chosen" : ""}" data-card="${id}" ${ok ? "" : "disabled"} aria-pressed="${s.chosen === id}">
      <span class="c-icon">${c.icon}</span><span class="c-name">${esc(c.name)}</span>
      <span class="c-hint">${esc(c.hint)}</span>
      <span class="c-gain">✔ ${esc(c.gain)}</span><span class="c-cost">✖ ${esc(c.cost)}</span>
    </button>`;
  }).join("");
}

function renderPreview() {
  const btn = $("#btn-end");
  if (!s.chosen) {
    $("#preview").innerHTML = `<div class="note">Split your power and pick an action to see what happens tonight.</div>`;
    btn.disabled = true;
    btn.textContent = "Pick an action first";
    return;
  }
  const p = previewNight(s);
  const fc = s.forecast[s.sol];
  const cls = (v) => (v <= 0 ? "bad" : v <= 2 ? "warn" : "");
  let storm = "";
  if (fc === "warning") storm = `<div class="row warn"><span>☀️ Storm tonight</span><span>shield blocks ${Math.min(s.alloc.shield + s.berm, 9)} ☢️</span></div>`;
  else if (fc === "watch") storm = `<div class="row"><span>🟡 A storm might come soon</span><span></span></div>`;
  $("#preview").innerHTML = `
    <div class="note">By morning, if nothing surprising happens:</div>
    <div class="row ${cls(p.o2)}"><span>🫁 Oxygen</span><span>${s.o2} → ${Math.max(p.o2, 0)}${p.o2 <= 0 ? " 💀 run out!" : ""}</span></div>
    <div class="row ${p.cold ? "bad" : cls(p.battery)}"><span>🔋 Battery</span><span>${s.battery} → ${p.battery}${p.cold ? " 🥶 too cold!" : ""}</span></div>
    ${storm}`;
  btn.disabled = false;
  btn.textContent = `End Sol ${s.sol} 🌙`;
}

// ---------- night ----------
function showNight(r) {
  pendingReport = r;
  $("#night-title").textContent = `🌙 Night of Sol ${r.sol}`;
  $("#night-lines").innerHTML = r.lines.map((l, i) =>
    `<li class="${l.kind}" style="animation-delay:${i * 0.18}s"><span>${l.icon}</span><span>${esc(l.text)}</span><span class="d">${esc(l.delta)}</span></li>`).join("");

  if (r.storm) {
    const e = r.storm.event;
    $("#night-storm").innerHTML = `<div class="storm-box">
      ☀️ <b>This storm really happened!</b> On <b>${esc(e.date)}</b>, NASA's DONKI database recorded a
      coronal mass ejection racing away from the Sun at <b>${e.speedKmS.toLocaleString()} km/s</b>,
      seen by ${esc(e.instrument)}.${e.hadParticleStorm ? " It also sent a burst of fast particles through space." : ""}
      It was observed near Earth; what it does to your Mars base is a simulation.
      <a href="${e.link}" target="_blank" rel="noopener">See the real record ↗</a></div>`;
  } else $("#night-storm").innerHTML = "";

  $("#night-fact").innerHTML = factHtml(r.fact, "Did you know?");
  $("#btn-next").textContent = r.over ? "See mission report 📋" : `Start Sol ${r.sol + 1} ☀️`;
  $("#night").showModal();
}

// ---------- end ----------
const CAUSES = {
  win: { title: "Mission Complete! 🎉", why: (s) => `You kept your crew safe for ${s.cfg.maxSol} sols and collected ${s.science} science points.` },
  o2: { title: "Out of Oxygen 😮‍💨", why: (s) => `On sol ${s.result.sol} your crew ran out of oxygen. Give the O₂ Maker more power, keep the battery charged for cold nights, and rest when oxygen is low.` },
  dose: { title: "Radiation Limit Reached ☢️", why: (s) => `On sol ${s.result.sol} your crew's radiation dose hit the limit. Radiation never goes away, so power the shield when a storm warning appears and build regolith walls.` },
};

function chartSvg(history, storms) {
  const W = 600, H = 200, P = 26;
  const n = Math.max(history.length - 1, 1);
  const x = (i) => P + (i / n) * (W - 2 * P);
  const y = (v) => H - P - (v / 10) * (H - 2 * P);
  const line = (key, color) =>
    `<polyline fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" points="${history.map((h, i) => `${x(i)},${y(Math.max(0, Math.min(10, h[key])))}`).join(" ")}"/>`;
  const grid = [0, 5, 10].map((v) => `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" stroke="#4b3f7a" stroke-dasharray="4 4"/><text x="4" y="${y(v) + 4}" fill="#c5b8e0" font-size="11">${v}</text>`).join("");
  const marks = storms.map((st) => `<text x="${x(st.sol)}" y="${P - 6}" text-anchor="middle" font-size="14">☀️</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Oxygen, battery and radiation over the mission">${grid}${marks}
    ${line("o2", "#4fd1c5")}${line("battery", "#6ea8ff")}${line("dose", "#ff5d73")}
    <text x="${W - P}" y="${H - 6}" text-anchor="end" fill="#c5b8e0" font-size="11">sol →</text></svg>
    <div class="legend"><span style="color:#4fd1c5">━ 🫁 Oxygen</span><span style="color:#6ea8ff">━ 🔋 Battery</span><span style="color:#ff5d73">━ ☢️ Radiation</span><span>☀️ = solar storm</span></div>`;
}

function showEnd() {
  const c = CAUSES[s.result.cause];
  $("#end-title").textContent = c.title;
  $("#end-stars").textContent = s.result.cause === "win" ? "⭐".repeat(s.result.stars) + "☆".repeat(3 - s.result.stars) : "";
  $("#end-why").textContent = c.why(s) + (s.result.cause === "win" ? ` Science goals: ${s.cfg.stars.join(" / ")}.` : " Every astronaut learns from failure. Try again!");
  $("#chart").innerHTML = chartSvg(s.history, s.stormsFaced);

  $("#storm-list").innerHTML = s.stormsFaced.length
    ? s.stormsFaced.map((st) => `<li><b>Sol ${st.sol}:</b> real CME on ${esc(st.date)}, ${st.speedKmS.toLocaleString()} km/s.
        Shield blocked ${st.blocked} of ${st.dose} ☢️. <a href="${st.link}" target="_blank" rel="noopener">DONKI record ↗</a></li>`).join("")
    : "<li>No storms reached you this time. Lucky!</li>";

  const before = loadCollection();
  const fresh = s.factsSeen.filter((f) => !before.includes(f));
  saveCollection([...before, ...fresh]);
  updateCollectionCount();
  $("#new-cards").innerHTML = fresh.length
    ? fresh.map((f) => `<div class="fact-card">${factHtml(f)}</div>`).join("")
    : `<p class="note">No new cards this time. You've seen them all before!</p>`;
  show("screen-end");
}

// ---------- collection ----------
function updateCollectionCount() {
  $("#collection-count").textContent = `(${loadCollection().length}/${Object.keys(FACTS).length})`;
}
function openCollection() {
  const have = loadCollection();
  $("#collection-grid").innerHTML = Object.keys(FACTS).map((id) => have.includes(id)
    ? `<div class="fact-card">${factHtml(id)}</div>`
    : `<div class="fact-card locked"><h3>🔒 ???</h3><p>Keep playing to unlock.</p></div>`).join("");
  $("#collection").showModal();
}

// ---------- events ----------
function startGame() {
  s = newGame(pool, Date.now() % 2147483647);
  render();
  show("screen-game");
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.matches("[data-plus], [data-minus]")) {
    const slot = t.closest(".slot").dataset.slot;
    setAlloc(s, slot, s.alloc[slot] + (t.matches("[data-plus]") ? 1 : -1));
    render();
  } else if (t.dataset.card) {
    choose(s, t.dataset.card);
    render();
  } else if (t.dataset.fact) {
    openInfo(factHtml(t.dataset.fact));
  } else if (t.matches("[data-close]")) {
    t.closest("dialog").close();
  }
});

$("#chip-forecast").addEventListener("click", () => {
  const fd = describeForecast[s.forecast[s.sol]];
  openInfo(`<h3>${fd.icon} ${esc(fd.label)}</h3><p>${esc(fd.detail)}</p>${factHtml("forecast", "Did you know?")}`);
});
$("#btn-start").addEventListener("click", startGame);
$("#btn-again").addEventListener("click", startGame);
$("#btn-home").addEventListener("click", () => show("screen-title"));
$("#btn-collection").addEventListener("click", openCollection);
$("#btn-end").addEventListener("click", () => {
  const r = endSol(s);
  if (r) showNight(r);
});
$("#btn-next").addEventListener("click", () => {
  $("#night").close();
  if (pendingReport?.over) showEnd();
  else render();
});
// Don't let Escape skip the night report without advancing the game.
$("#night").addEventListener("cancel", (e) => e.preventDefault());

// ---------- boot ----------
updateCollectionCount();
$("#btn-start").disabled = true;
fetch("data/space_weather_events.json")
  .then((r) => r.json())
  .then((d) => {
    pool = d.events;
    $("#btn-start").disabled = false;
  })
  .catch(() => {
    $(".badge").textContent = "Couldn't load the NASA storm data. Please reload the page.";
  });
