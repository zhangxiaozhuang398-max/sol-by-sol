// Tiny Web Audio sound bed for Sol by Sol. No files: everything is synthesised
// so the game stays a single static download. Browsers start audio only after a
// user gesture, so init() is called on the first pointerdown.
const STORAGE = "solbysol.sound";
let ctx = null;
let master = null;
let noise = null;
let windSource = null;
let windFilter = null;
let windGain = null;
let pendingWind = ["sunny", "day"];
let enabled = true;
try { enabled = localStorage.getItem(STORAGE) !== "off"; } catch { /* storage blocked */ }

function makeNoise() {
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 2463534242;
  for (let i = 0; i < len; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    data[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
  }
  return buf;
}

function init() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = enabled ? 0.35 : 0;
  master.connect(ctx.destination);
  noise = makeNoise();

  windSource = ctx.createBufferSource();
  windSource.buffer = noise;
  windSource.loop = true;
  windFilter = ctx.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.value = 450;
  windGain = ctx.createGain();
  windGain.gain.value = 0.02;
  windSource.connect(windFilter).connect(windGain).connect(master);
  windSource.start();
  applyWind();
  // the background music (js/music.js) plays into its own bus under the sound effects
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}
let musicBus = null;

function ensure() {
  if (!ctx) init();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function applyWind() {
  if (!ctx || !windGain) return;
  const [weather, phase] = pendingWind;
  const base = weather === "dust" ? 0.1 : weather === "hazy" ? 0.05 : 0.025;
  const night = phase === "night" || phase === "settle" ? 0.6 : phase === "briefing" ? 0.8 : 1;
  windGain.gain.setTargetAtTime(base * night, ctx.currentTime, 0.8);
  windFilter.frequency.setTargetAtTime(weather === "dust" ? 900 : 450, ctx.currentTime, 1);
}

function setWind(weather, phase) {
  pendingWind = [weather, phase];
  applyWind();
}

function setEnabled(on) {
  enabled = !!on;
  try { localStorage.setItem(STORAGE, enabled ? "on" : "off"); } catch { /* ignore */ }
  if (master && ctx) master.gain.setTargetAtTime(enabled ? 0.35 : 0, ctx.currentTime, 0.03);
}

function toggle() {
  setEnabled(!enabled);
  if (enabled) ensure();
  return enabled;
}

function click() {
  if (!ensure()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.value = 560;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.035, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.08);
}

function step() {
  if (!ensure()) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 190;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.12);
}

function chime() {
  if (!ensure()) return;
  const t = ctx.currentTime;
  for (const [freq, delay] of [[660, 0], [880, 0.09]]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t + delay);
    g.gain.exponentialRampToValueAtTime(0.04, t + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.32);
    o.connect(g).connect(master);
    o.start(t + delay);
    o.stop(t + delay + 0.34);
  }
}

function whoosh() {
  if (!ensure()) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 0.7;
  f.frequency.setValueAtTime(320, t);
  f.frequency.exponentialRampToValueAtTime(1300, t + 0.4);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.11, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.6);
}

// Two-tone warning beep: something is in danger.
function alarm() {
  if (!ensure()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = i % 2 ? 620 : 880;
    const at = t + i * 0.16;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.03, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + 0.15);
  }
}

// A buzzing rock drill for about `seconds`.
function drill(seconds = 1.5) {
  if (!ensure()) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 3;
  f.frequency.setValueAtTime(420, t);
  f.frequency.linearRampToValueAtTime(700, t + seconds);
  const buzz = ctx.createOscillator();
  buzz.type = "sawtooth";
  buzz.frequency.value = 55;
  const bg = ctx.createGain();
  bg.gain.value = 0.012;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.08);
  g.gain.setValueAtTime(0.09, t + seconds - 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  src.connect(f).connect(g).connect(master);
  buzz.connect(bg).connect(g);
  src.start(t);
  buzz.start(t);
  src.stop(t + seconds + 0.05);
  buzz.stop(t + seconds + 0.05);
}

// Happy rising notes: a sample was found.
function found(rare = false) {
  if (!ensure()) return;
  const t = ctx.currentTime;
  const notes = rare ? [523, 659, 784, 1047] : [587, 784, 988];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    const at = t + i * 0.08;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.05, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + 0.37);
  });
}

export const audio = {
  init, ensure, setWind, setEnabled, toggle, click, step, chime, whoosh, alarm, drill, found,
  isEnabled: () => enabled,
  // for js/music.js: the audio context (null until the first tap), its bus and the shared noise
  context: () => ctx,
  musicBus: () => musicBus,
  noise: () => noise,
};
