// Background music: a small jazz combo synthesised with Web Audio (no audio
// files, original music). It follows the game:
//   briefing  bright, swinging jazz: walking bass, Rhodes chords, ride and
//             brushes, a vibraphone tune
//   day       the same band, slower and softer, so the Mars wind comes through
//   night     only the bass and long, soft chords
//   storm     tighter straight beat, a low drone and a minor progression
// A new mood starts at the next bar, so the music never stops mid-phrase.
// The sound button (audio.js) mutes it together with the effects.

import { audio } from "./audio.js";

const LOOKAHEAD = 0.3; // seconds of music scheduled ahead of time
const TICK_MS = 60;

// chord qualities as semitones above the root
const Q = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], m9: [0, 3, 7, 10, 14], sus9: [0, 5, 7, 10, 14], dom7b9: [0, 4, 7, 10, 13] };
const F = 41, D = 38, G = 43, C = 36, BB = 46, A = 45; // roots, around the second octave (MIDI)
const ch = (root, q) => ({ root, q });

const MOODS = {
  briefing: { bpm: 116, swing: 0.64, vol: 1, prog: [ch(F, "maj7"), ch(D, "m7"), ch(G, "m7"), ch(C, "dom7")],
    bass: "walk", comp: "charleston", ride: true, brush: true, kick: true, vibes: true },
  day: { bpm: 88, swing: 0.62, vol: 0.55, prog: [ch(F, "maj7"), ch(A - 12, "m7"), ch(BB - 12, "maj7"), ch(C, "sus9")],
    bass: "walk", comp: "soft", ride: true, brush: true },
  night: { bpm: 66, swing: 0.5, vol: 0.55, prog: [ch(F, "maj7"), ch(BB - 12, "maj7"), ch(G, "m9"), ch(C, "sus9")],
    bass: "long", pad: true },
  storm: { bpm: 132, swing: 0.5, vol: 0.7, prog: [ch(D, "m7"), ch(D, "m7"), ch(BB - 12, "maj7"), ch(A - 12, "dom7b9")],
    bass: "ostinato", comp: "stabs", hats: true, kick: true, snare: true, drone: true },
};

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
let mood = null; // what the game asks for
let playing = null; // what the band is playing now
let bar = 0, eighth = 0, nextTime = 0, timer = null, droneNode = null;
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// ---------- instruments ----------
function voice(time, freq, dur, { type = "sine", gain = 0.05, attack = 0.005, release = dur, cutoff = 0, detune = 0 } = {}) {
  const ctx = audio.context();
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain, time + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, time + attack + release);
  let node = o;
  if (cutoff) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    node = o.connect(f);
  }
  node.connect(g).connect(audio.musicBus());
  o.start(time);
  o.stop(time + attack + release + 0.05);
}
function noiseHit(time, dur, { type = "highpass", freq = 7000, q = 0.7, gain = 0.02 } = {}) {
  const ctx = audio.context();
  const src = ctx.createBufferSource();
  src.buffer = audio.noise();
  src.playbackRate.value = 0.8 + rnd() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  src.connect(f).connect(g).connect(audio.musicBus());
  src.start(time, rnd() * 1.5);
  src.stop(time + dur + 0.02);
}
const bassNote = (time, midi, dur, gain = 0.11) => voice(time, hz(midi), dur, { type: "triangle", gain, attack: 0.01, release: dur, cutoff: 700 });
// electric piano: a soft sine with a bell-like overtone that fades fast
function rhodes(time, midis, dur, gain = 0.022) {
  for (const m of midis) {
    voice(time, hz(m), dur, { gain, attack: 0.008, release: dur });
    voice(time, hz(m) * 2.01, dur * 0.35, { gain: gain * 0.35, attack: 0.004, release: dur * 0.35 });
  }
}
function vibes(time, midi, gain = 0.03) {
  voice(time, hz(midi), 0.9, { gain, attack: 0.004, release: 0.9 });
  voice(time, hz(midi) * 4, 0.25, { gain: gain * 0.25, attack: 0.002, release: 0.25 });
}
function pad(time, midis, dur) {
  for (const m of midis) {
    for (const d of [-7, 7]) voice(time, hz(m), dur, { type: "sawtooth", gain: 0.008, attack: dur * 0.35, release: dur * 0.75, cutoff: 900, detune: d });
  }
}
function kick(time, gain = 0.12) {
  const ctx = audio.context();
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(110, time);
  o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
  o.connect(g).connect(audio.musicBus());
  o.start(time);
  o.stop(time + 0.25);
}
function setDrone(on) {
  const ctx = audio.context();
  if (on && !droneNode) {
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = hz(26); // a low D
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 160;
    lfo.frequency.value = 0.25; // slow swell
    lg.gain.value = 60;
    lfo.connect(lg).connect(f.frequency);
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.05, ctx.currentTime, 1.5);
    o.connect(f).connect(g).connect(audio.musicBus());
    o.start();
    lfo.start();
    droneNode = { o, lfo, g };
  } else if (!on && droneNode) {
    const n = droneNode;
    droneNode = null;
    n.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
    setTimeout(() => { try { n.o.stop(); n.lfo.stop(); } catch { /* already stopped */ } }, 3000);
  }
}

// ---------- the band ----------
// voicing near middle C: third, seventh and the next chord tone up
const voicing = (c) => Q[c.q].slice(1).map((i) => 12 + ((c.root + i - 48 + 120) % 12) + 48);
function walkLine(c, next) {
  const iv = Q[c.q];
  const approach = next.root + (rnd() < 0.5 ? -1 : 1); // a half step into the next chord
  return [c.root, c.root + iv[1 + Math.floor(rnd() * 2)], c.root + iv[2], approach];
}

// one eighth note of music at `time`
function play(m, time) {
  const beat = 60 / m.bpm;
  const c = m.prog[bar % m.prog.length], next = m.prog[(bar + 1) % m.prog.length];
  const e = eighth, onBeat = e % 2 === 0, b = e >> 1;

  if (m.bass === "walk" && onBeat) {
    if (b === 0) play.walk = walkLine(c, next);
    bassNote(time, play.walk[b], beat * 0.9, m === MOODS.day ? 0.08 : 0.11);
  } else if (m.bass === "long" && (e === 0 || e === 4)) {
    bassNote(time, e === 0 ? c.root : c.root + 7, beat * 1.9, 0.09);
  } else if (m.bass === "ostinato") {
    bassNote(time, c.root - (e % 4 === 2 ? 0 : 12) + (e === 7 ? 12 : 0), beat * 0.4, 0.12);
  }

  if (m.comp === "charleston" && (e === 0 || e === 3)) rhodes(time, voicing(c), beat * (e === 0 ? 1.2 : 1.6));
  if (m.comp === "soft" && e === 0) rhodes(time, voicing(c), beat * 3.5, 0.016);
  if (m.comp === "soft" && e === 5 && rnd() < 0.5) rhodes(time, voicing(c).slice(0, 2), beat * 1.5, 0.012);
  if (m.comp === "stabs" && (e === 0 || e === 3 || e === 6)) rhodes(time, voicing(c), beat * 0.35, 0.02);
  if (m.pad && e === 0) pad(time, voicing(c), beat * 4.2);

  if (m.ride && (onBeat || e === 3 || e === 7)) noiseHit(time, onBeat ? 0.28 : 0.12, { freq: 8000, gain: m === MOODS.day ? 0.008 : 0.014 });
  if (m.brush && (e === 2 || e === 6)) noiseHit(time, 0.16, { type: "bandpass", freq: 2200, q: 0.6, gain: m === MOODS.day ? 0.01 : 0.018 });
  if (m.hats) noiseHit(time, 0.045, { freq: 9000, gain: e % 2 ? 0.01 : 0.016 });
  if (m.snare && (e === 2 || e === 6)) noiseHit(time, 0.14, { type: "bandpass", freq: 1800, q: 0.9, gain: 0.035 });
  if (m.kick && (e === 0 || (m.snare && e === 4))) kick(time, m.snare ? 0.14 : 0.07);

  // the vibraphone plays a short tune every other bar, from the chord and the F major pentatonic scale
  if (m.vibes && bar % 4 < 2 && rnd() < (onBeat ? 0.45 : 0.3)) {
    const pool = [...Q[c.q].map((i) => c.root + i + 36), 72, 74, 77, 79, 81].filter((n) => n >= 69 && n <= 86);
    vibes(time, pool[Math.floor(rnd() * pool.length)]);
  }
}

// an older cached copy of audio.js (right after an update) has no music bus: stay silent
const ready = () => typeof audio.context === "function" && typeof audio.musicBus === "function";

function tick() {
  if (!ready()) return;
  const ctx = audio.context();
  if (!ctx || !audio.musicBus() || !mood) return;
  if (nextTime < ctx.currentTime - 0.2) { nextTime = ctx.currentTime + 0.05; eighth = 0; } // fell behind (tab was hidden)
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    if (eighth === 0 && playing !== mood) { // change the mood on the bar line
      playing = mood;
      audio.musicBus().gain.setTargetAtTime(0.55 * MOODS[playing].vol, nextTime, 0.8);
      setDrone(!!MOODS[playing].drone);
      bar = 0;
    }
    if (!playing) { eighth = 0; continue; } // start at the top of a bar
    const m = MOODS[playing];
    if (audio.isEnabled()) play(m, nextTime);
    const beat = 60 / m.bpm;
    nextTime += beat * (eighth % 2 === 0 ? m.swing : 1 - m.swing); // swing: long-short eighths
    eighth = (eighth + 1) % 8;
    if (eighth === 0) bar++;
  }
}

// mood: "briefing" | "day" | "night" | "storm" | null (silence)
function setMood(next) {
  if (next && !MOODS[next]) return;
  mood = next;
  if (!ready()) return;
  const ctx = audio.context();
  if (!mood && ctx && audio.musicBus()) {
    audio.musicBus().gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
    setDrone(false);
    playing = null;
  }
  if (!timer) timer = setInterval(tick, TICK_MS);
}

export const music = { setMood, get mood() { return mood; } };
