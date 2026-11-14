// The walkable Mars surface, seen from above.
//
// The ground is a REAL picture of Jezero crater: NASA's MRO Context Camera (CTX)
// mosaics, tinted with the Viking colour mosaic (see scripts/build_mars_map.mjs).
// A sharper layer covers the west half, where the base and survey sites are.
// Real MOLA elevations (scripts/fetch_mars_terrain.mjs) give the height readout.
// The base, the rover and the astronaut are drawings placed on top of it; they
// are drawn much larger than life so they can be seen at this map scale.
//
// This module only draws and moves things. Game rules stay in game.js; the UI
// (main.js) tells the world which targets exist and reacts when the player
// walks up to one.

const SPEED = 6.5; // terrain cells per second (one cell is about 463 m of real Mars)
const TURN = 12; // how quickly the astronaut turns to face the walking direction

// kind → picture and its width in terrain cells
const SPRITES = {
  habitat: { file: "habitat.svg", size: 3.6 },
  panels: { file: "panels.svg", size: 2.8 },
  greenhouse: { file: "greenhouse.svg", size: 2.6 },
  antenna: { file: "antenna.svg", size: 2.0 },
  landmark: { file: "rover.svg", size: 1.3 },
  astronaut: { file: "astronaut.svg", size: 1.3 },
};

const TIER_COLOR = ["#f3b562", "#f3b562", "#ff8a55", "#ff5d73"];
const DONE_COLOR = "#7ad67a";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export async function createWorld(opts) {
  const {
    mount, minimap, joystick, dataDir = "data/mars", assetDir = "assets",
    onNear = () => {}, onUse = () => {},
  } = opts;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let M, overview;
  const art = {};
  try {
    M = await fetch(`${dataDir}/jezero_map.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    overview = await loadImage(`${dataDir}/${M.overview}`);
    await Promise.all(Object.entries(SPRITES).map(async ([kind, s]) => {
      art[kind] = await loadImage(`${assetDir}/${s.file}`);
    }));
  } catch (err) {
    console.warn("Mars map failed to load", err);
    return null;
  }
  const n = M.cells;
  // Picture chunks load in the background, coarse layer first; the small
  // overview shows until they arrive. Later layers are sharper and draw on top.
  const layers = M.layers.map((l) => ({
    cellsPerChunk: M.chunk / l.pxPerCell,
    chunks: l.chunks.map((c) => ({ ...c, img: null })),
  }));
  (async () => {
    for (const l of layers) {
      await Promise.all(l.chunks.map((c) => loadImage(`${dataDir}/${c.file}`).then((img) => { c.img = img; }).catch(() => {})));
    }
  })();

  // Real elevations (metres) for the height readout. Optional: the map works without them.
  let heights = null;
  fetch(`${dataDir}/jezero_terrain.json`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.size === n) heights = d.heights; }).catch(() => {});

  canvas.style.touchAction = "none";
  mount.appendChild(canvas);

  const st = {
    x: n / 2, z: n / 2, heading: Math.PI, moving: false, walkT: 0,
    camX: n / 2, camZ: n / 2, snap: true,
    spawn: { x: n / 2, z: n / 2, heading: Math.PI },
    mode: "cinematic", enabled: true, running: false,
    phase: "day", weather: "sunny",
    near: null, dest: null, time: 0,
    trail: [],
  };
  let targets = [];
  let solids = [];
  let dpr = 1, W = 1, H = 1, S = 40; // S = device pixels per terrain cell

  // ---------- input ----------
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  const MOVE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
  const canControl = () => st.mode === "play" && st.enabled && st.running && !document.querySelector("dialog[open]");
  const typing = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");

  window.addEventListener("keydown", (e) => {
    if (!canControl() || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (MOVE_KEYS.includes(e.code)) {
      keys.add(e.code);
      e.preventDefault();
    } else if (e.code === "KeyE" || ((e.code === "Space" || e.code === "Enter") && e.target.tagName !== "BUTTON")) {
      e.preventDefault();
      if (!e.repeat) onUse();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  // click or tap the ground to walk there
  canvas.addEventListener("pointerdown", (e) => {
    if (!canControl()) return;
    const b = canvas.getBoundingClientRect();
    const px = (e.clientX - b.left) * (W / b.width);
    const py = (e.clientY - b.top) * (H / b.height);
    st.dest = { x: clamp(st.camX + (px - W / 2) / S, 1, n - 1), z: clamp(st.camZ + (py - H / 2) / S, 1, n - 1) };
  });

  if (joystick) {
    const knob = joystick.querySelector("i");
    let jid = null;
    const setJoy = (e) => {
      const b = joystick.getBoundingClientRect();
      let dx = (e.clientX - (b.left + b.width / 2)) / (b.width / 2);
      let dy = (e.clientY - (b.top + b.height / 2)) / (b.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      joy.x = dx;
      joy.y = dy;
      if (knob) knob.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
    };
    const clearJoy = () => {
      jid = null;
      joy.x = joy.y = 0;
      if (knob) knob.style.transform = "";
    };
    joystick.style.touchAction = "none";
    joystick.addEventListener("pointerdown", (e) => { jid = e.pointerId; joystick.setPointerCapture(e.pointerId); setJoy(e); e.preventDefault(); });
    joystick.addEventListener("pointermove", (e) => { if (jid === e.pointerId) setJoy(e); });
    joystick.addEventListener("pointerup", clearJoy);
    joystick.addEventListener("pointercancel", clearJoy);
  }

  // ---------- simulation ----------
  function step(dt) {
    st.time += dt;
    let mx = 0, mz = 0;
    if (st.mode === "play" && canControl()) {
      if (keys.has("ArrowUp") || keys.has("KeyW")) mz -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) mz += 1;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
      if (Math.hypot(joy.x, joy.y) > 0.18) { mx += joy.x; mz += joy.y; }
      if (mx || mz) st.dest = null;
      else if (st.dest) {
        const dx = st.dest.x - st.x, dz = st.dest.z - st.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.12) st.dest = null;
        else { mx = dx / d; mz = dz / d; if (d < SPEED * dt) { mx *= d / (SPEED * dt); mz *= d / (SPEED * dt); } }
      }
    } else if (st.mode !== "play") st.dest = null;

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    st.moving = len > 0.05;
    if (st.moving) {
      const slow = st.weather === "dust" ? 0.8 : 1;
      let nx = clamp(st.x + mx * SPEED * slow * dt, 1, n - 1);
      let nz = clamp(st.z + mz * SPEED * slow * dt, 1, n - 1);
      for (const s of solids) {
        const dx = nx - s.x, dz = nz - s.z;
        const d = Math.hypot(dx, dz);
        if (d < s.r && d > 0.0001) { nx = s.x + (dx / d) * s.r; nz = s.z + (dz / d) * s.r; if (st.dest) st.dest = null; }
      }
      st.x = nx;
      st.z = nz;
      // heading: forward = (sin h, cos h) with x east and z south
      const want = Math.atan2(mx, mz);
      let diff = want - st.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      st.heading += diff * Math.min(1, dt * TURN);
      st.walkT += dt * 10;
      const last = st.trail[st.trail.length - 1];
      if (!last || Math.hypot(last.x - st.x, last.z - st.z) > 0.45) {
        st.trail.push({ x: st.x, z: st.z, t: st.time, side: (st.trail.length % 2) * 2 - 1, h: st.heading });
        if (st.trail.length > 26) st.trail.shift();
      }
    }

    // camera
    let tx, tz;
    // On tall (phone) screens the top is covered by the chips and the minimap,
    // so look a little north of the astronaut to keep the way ahead visible.
    if (st.mode === "play") { tx = st.x; tz = st.z - (H > W ? 2.2 : 0); }
    else { tx = st.spawn.x + Math.sin(st.time * 0.1) * 1.6; tz = st.spawn.z - 5.5 + Math.cos(st.time * 0.13) * 0.5; }
    const halfW = W / (2 * S), halfH = H / (2 * S);
    tx = halfW * 2 >= n ? n / 2 : clamp(tx, halfW, n - halfW);
    tz = halfH * 2 >= n ? n / 2 : clamp(tz, halfH, n - halfH);
    const k = st.snap ? 1 : Math.min(1, dt * 7);
    st.snap = false;
    st.camX += (tx - st.camX) * k;
    st.camZ += (tz - st.camZ) * k;

    // which target is the player standing at?
    let best = null;
    if (st.mode === "play") {
      let bestD = Infinity;
      for (const t of targets) {
        const d = Math.hypot(st.x - t.x, st.z - t.z);
        if (d <= t.r && d < bestD) { best = t; bestD = d; }
      }
    }
    const id = best ? best.id : null;
    if (id !== st.near) {
      st.near = id;
      onNear(id);
    }
  }

  // ---------- drawing ----------
  const sx = (x) => (x - st.camX) * S + W / 2;
  const sy = (z) => (z - st.camZ) * S + H / 2;
  const FONT = '"Nunito", "PingFang SC", "Microsoft YaHei", sans-serif';

  function drawGround() {
    ctx.fillStyle = "#2a160e";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(overview, Math.floor(sx(0)), Math.floor(sy(0)), Math.ceil(n * S), Math.ceil(n * S));
    for (const l of layers) {
      const k = (l.cellsPerChunk * S) / M.chunk; // screen pixels per picture pixel
      for (const c of l.chunks) {
        if (!c.img) continue;
        const x0 = sx(c.col * l.cellsPerChunk), y0 = sy(c.row * l.cellsPerChunk);
        const w = c.img.width * k, h = c.img.height * k;
        if (x0 > W || y0 > H || x0 + w < 0 || y0 + h < 0) continue;
        ctx.drawImage(c.img, Math.floor(x0), Math.floor(y0), Math.ceil(w) + 1, Math.ceil(h) + 1);
      }
    }
  }

  function drawSprite(kind, x, z, rot = 0, scale = 1) {
    const img = art[kind];
    const w = SPRITES[kind].size * S * scale;
    const h = w * (img.height / img.width);
    ctx.save();
    ctx.translate(sx(x), sy(z));
    if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return h;
  }

  function pill(text, cx, cy, { done = false, small = false } = {}) {
    const fs = (small ? 11 : 13) * dpr;
    ctx.font = `800 ${fs}px ${FONT}`;
    const tw = ctx.measureText(text).width;
    const padX = 8 * dpr, hgt = fs + 9 * dpr;
    const x = cx - tw / 2 - padX, y = cy - hgt / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, tw + padX * 2, hgt, hgt / 2);
    ctx.fillStyle = done ? "rgba(31,77,61,0.92)" : "rgba(27,21,48,0.86)";
    ctx.fill();
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeStyle = done ? DONE_COLOR : "rgba(243,181,98,0.9)";
    ctx.stroke();
    ctx.fillStyle = "#fbf4ea";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy + dpr);
  }

  const plainLabel = (t) => (t.icon && t.label.startsWith(t.icon) ? t.label.slice(t.icon.length).trim() : t.label);

  function drawSiteMarker(t) {
    const x = sx(t.x), y = sy(t.z);
    const color = t.done ? DONE_COLOR : TIER_COLOR[t.tier] || TIER_COLOR[1];
    const pulse = 0.5 + 0.5 * Math.sin(st.time * 2.4 + t.x);
    // survey ring on the ground
    ctx.beginPath();
    ctx.arc(x, y, t.r * S * (0.82 + pulse * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = t.done ? "rgba(122,214,122,0.12)" : "rgba(243,181,98,0.13)";
    ctx.fill();
    ctx.setLineDash([8 * dpr, 6 * dpr]);
    ctx.lineDashOffset = -st.time * 14 * dpr;
    ctx.lineWidth = 2.5 * dpr;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.setLineDash([]);
    // flag pin
    const r = 0.5 * S;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(27,21,48,0.9)";
    ctx.fill();
    ctx.lineWidth = 3 * dpr;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.font = `${Math.round(r * 1.05)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(t.icon || "📍", x, y + r * 0.06);
  }

  function drawFootprints() {
    for (const p of st.trail) {
      const age = st.time - p.t;
      if (age > 6) continue;
      const ox = Math.cos(p.h) * 0.13 * p.side, oz = -Math.sin(p.h) * 0.13 * p.side;
      ctx.beginPath();
      ctx.ellipse(sx(p.x + ox), sy(p.z + oz), 0.07 * S, 0.11 * S, -p.h, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40,18,10,${0.38 * (1 - age / 6)})`;
      ctx.fill();
    }
  }

  function drawOffscreenArrows() {
    const m = 30 * dpr;
    for (const t of targets) {
      if (t.kind !== "site" && t.kind !== "habitat") continue;
      const x = sx(t.x), y = sy(t.z);
      if (x >= 0 && x <= W && y >= 0 && y <= H) continue;
      const cx = clamp(x, m, W - m), cy = clamp(y, m + 34 * dpr, H - m);
      const ang = Math.atan2(y - cy, x - cx);
      const color = t.kind === "habitat" ? "#ffffff" : t.done ? DONE_COLOR : TIER_COLOR[t.tier] || TIER_COLOR[1];
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.arc(0, 0, 15 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(27,21,48,0.88)";
      ctx.fill();
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(25 * dpr, 0);
      ctx.lineTo(17 * dpr, -6 * dpr);
      ctx.lineTo(17 * dpr, 6 * dpr);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      ctx.font = `${15 * dpr}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.icon || "📍", cx, cy + dpr);
    }
  }

  // dust streaks for dust-storm sols (screen space)
  const streaks = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.25 + Math.random() * 0.4, l: 0.03 + Math.random() * 0.05 }));

  function drawAtmosphere(night) {
    if (st.weather === "hazy") {
      ctx.fillStyle = "rgba(214,160,110,0.2)";
      ctx.fillRect(0, 0, W, H);
    } else if (st.weather === "dust") {
      ctx.fillStyle = "rgba(170,105,60,0.5)";
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = "rgba(255,214,170,0.35)";
      ctx.beginPath();
      for (const p of streaks) {
        const x = ((p.x + st.time * p.v) % 1.2 - 0.1) * W;
        const y = ((p.y + st.time * p.v * 0.12) % 1) * H;
        ctx.moveTo(x, y);
        ctx.lineTo(x + p.l * W, y + p.l * W * 0.12);
      }
      ctx.stroke();
    }
    if (st.phase === "briefing" && !night) {
      ctx.fillStyle = "rgba(255,170,110,0.12)"; // low morning sun
      ctx.fillRect(0, 0, W, H);
    }
    if (night) {
      ctx.fillStyle = "rgba(8,10,36,0.66)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const t of targets) {
        if (t.kind === "site" || t.kind === "landmark") continue;
        const x = sx(t.mx ?? t.x), y = sy(t.mz ?? t.z);
        const r = (t.kind === "habitat" ? 4.2 : 1.8) * S;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, t.kind === "habitat" ? "rgba(255,200,120,0.55)" : "rgba(120,220,210,0.3)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = "source-over";
    }
    // soft vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    const night = st.phase === "night" || st.phase === "settle";
    const play = st.mode === "play";
    drawGround();

    for (const t of targets) if (t.kind === "site") drawSiteMarker(t);
    drawFootprints();

    // walk-to marker
    if (play && st.dest) {
      const x = sx(st.dest.x), y = sy(st.dest.z);
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(x, y, (0.22 + 0.06 * Math.sin(st.time * 8)) * S, 0, Math.PI * 2);
      ctx.stroke();
    }

    // things on the ground, north to south so nearer ones overlap farther ones
    const things = targets.filter((t) => t.kind !== "site").map((t) => ({ kind: t.kind, x: t.mx ?? t.x, z: t.mz ?? t.z, t }));
    if (play) things.push({ kind: "astronaut", x: st.x, z: st.z });
    things.sort((a, b) => a.z - b.z);
    const labels = [];
    for (const o of things) {
      if (o.kind === "astronaut") {
        const bob = st.moving ? 1 + Math.sin(st.walkT) * 0.035 : 1;
        drawSprite("astronaut", o.x, o.z, Math.PI - st.heading, bob);
      } else if (art[o.kind]) {
        const h = drawSprite(o.kind, o.x, o.z);
        labels.push({ text: plainLabel(o.t), x: sx(o.x), y: sy(o.z) + h / 2 + 4 * dpr, done: o.t.done });
      }
    }

    drawAtmosphere(night);

    // labels and guides stay readable above the weather and the night
    for (const l of labels) pill(l.text, l.x, l.y, { done: l.done, small: true });
    for (const t of targets) {
      if (t.kind === "site") pill(plainLabel(t), sx(t.x), sy(t.z) + 0.5 * S + 12 * dpr, { done: t.done });
    }
    if (play) drawOffscreenArrows();
  }

  function drawMinimap() {
    if (!minimap) return;
    const c = minimap.getContext("2d");
    const size = minimap.width;
    const k = size / n;
    c.imageSmoothingEnabled = true;
    c.drawImage(overview, 0, 0, size, size);
    // what the main view shows
    c.strokeStyle = "rgba(255,255,255,0.85)";
    c.lineWidth = 1.5;
    c.strokeRect((st.camX - W / (2 * S)) * k, (st.camZ - H / (2 * S)) * k, (W / S) * k, (H / S) * k);
    for (const t of targets) {
      const x = t.x * k, y = t.z * k;
      if (t.kind === "site") {
        c.beginPath();
        c.arc(x, y, 5, 0, Math.PI * 2);
        c.fillStyle = t.done ? DONE_COLOR : "#f3b562";
        c.fill();
        c.lineWidth = 2;
        c.strokeStyle = "#1b1530";
        c.stroke();
      } else if (t.kind === "habitat") {
        c.fillStyle = "#ffffff";
        c.strokeStyle = "#1b1530";
        c.lineWidth = 2;
        c.fillRect(x - 5, y - 5, 10, 10);
        c.strokeRect(x - 5, y - 5, 10, 10);
      } else if (t.kind === "landmark") {
        c.fillStyle = "#4fd1c5";
        c.fillRect(x - 3, y - 3, 6, 6);
      }
    }
    c.save();
    c.translate(st.x * k, st.z * k);
    c.rotate(-st.heading);
    c.beginPath();
    c.moveTo(0, 8);
    c.lineTo(5, -5);
    c.lineTo(0, -2);
    c.lineTo(-5, -5);
    c.closePath();
    c.fillStyle = "#ff5d73";
    c.strokeStyle = "#ffffff";
    c.lineWidth = 1.5;
    c.fill();
    c.stroke();
    c.restore();
  }

  // ---------- loop + sizing ----------
  function resize() {
    const cw = mount.clientWidth, ch = mount.clientHeight;
    if (!cw || !ch) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(cw * dpr);
    H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    S = clamp(Math.min(cw / 15, ch / 11.5), 28, 60) * dpr; // fit about 15 cells across and 11.5 down
    if (st.running) draw();
  }
  new ResizeObserver(resize).observe(mount);
  resize();

  let last = performance.now();
  let raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    if (st.mode === "play") drawMinimap();
  }

  const api = {
    kind: "2d",
    size: n,
    info: M,
    setTargets(list) {
      targets = list;
      solids = list.filter((t) => t.solid).map((t) => ({ x: t.mx ?? t.x, z: t.mz ?? t.z, r: t.solid }));
    },
    setSpawn(x, z, heading = Math.PI) {
      st.spawn = { x, z, heading };
    },
    respawn() {
      st.x = st.spawn.x;
      st.z = st.spawn.z;
      st.heading = st.spawn.heading;
      st.near = null;
      st.dest = null;
      st.trail = [];
      st.snap = true;
      keys.clear();
    },
    setMode(mode) {
      if (st.mode === mode) return;
      st.mode = mode;
      st.snap = true;
      st.dest = null;
      keys.clear();
      if (mode !== "play" && st.near !== null) {
        st.near = null;
        onNear(null);
      }
    },
    setLook(phase, weather) {
      st.phase = phase;
      st.weather = weather;
    },
    setEnabled(v) {
      st.enabled = v;
      if (!v) keys.clear();
    },
    start() {
      if (st.running) return;
      st.running = true;
      last = performance.now();
      resize();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      st.running = false;
      cancelAnimationFrame(raf);
      keys.clear();
    },
    get near() { return st.near; },
    // Where the astronaut really is on Mars: latitude, longitude (degrees) and
    // elevation in metres from MOLA (null until the elevation file has loaded).
    get location() {
      const b = M.bbox;
      const c = clamp(Math.floor(st.x), 0, n - 1), r = clamp(Math.floor(st.z), 0, n - 1);
      return {
        lat: b.north - (st.z / n) * (b.north - b.south),
        lon: b.west + (st.x / n) * (b.east - b.west),
        elevation: heights ? heights[r * n + c] : null,
      };
    },
    get position() { return { x: st.x, z: st.z, heading: st.heading }; },
    // for tests and demos
    teleport(x, z, heading) {
      st.x = x;
      st.z = z;
      if (heading != null) st.heading = heading;
      st.dest = null;
      st.snap = true;
    },
    renderOnce(dt = 0.016) {
      resize();
      step(dt);
      draw();
      drawMinimap();
    },
  };
  api.respawn();
  return api;
}
