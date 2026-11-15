// The walkable Mars surface, seen from above.
//
// The ground is a REAL picture of Jezero crater: NASA's MRO Context Camera (CTX)
// mosaics, tinted with the Viking colour mosaic (see scripts/build_mars_map.mjs).
// A sharper layer covers the west half, where the base and survey sites are.
// Real MOLA elevations (scripts/fetch_mars_terrain.mjs) give the height readout.
// The base, the rover and the astronaut are drawings placed on top of it; they
// are drawn much larger than life so they can be seen at this map scale. To
// match the photo they are lit from the west, dusty, and get a little grain.
//
// This module only draws and moves things. Game rules stay in game.js; the UI
// (main.js) tells the world which targets exist and reacts when the player
// walks up to one.

const SPEED = 6.5; // terrain cells per second (one cell is about 463 m of real Mars)
const TURN = 12; // how quickly the astronaut turns to face the walking direction

// kind → picture and its width in terrain cells.
// The base buildings are cartoon drawings in a three-quarter view (made by
// scripts/draw_buildings.mjs): `crisp` keeps their outlines sharp (no blur or
// grain), and `anchor` is how far down the picture (0 = top, 1 = bottom) the
// building stands on the ground, so it rises north of its spot and the
// astronaut can walk behind it.
const SPRITES = {
  habitat: { file: "habitat.svg", size: 4.5, anchor: 0.78, crisp: true },
  panels: { file: "panels.svg", size: 3.75, anchor: 0.72, crisp: true },
  greenhouse: { file: "greenhouse.svg", size: 3.6, anchor: 0.79, crisp: true },
  antenna: { file: "antenna.svg", size: 2.75, anchor: 0.8, crisp: true },
  landmark: { file: "rover.svg", size: 2.1, anchor: 0.8, crisp: true },
  astronaut: { file: "astronaut.svg", size: 1.3 }, // body only: world2d draws the arms and boots so they can move
  // survey sites (scripts/draw_sites.mjs): each is a cartoon of the landform itself, with the instrument used to study it
  site_dune: { file: "site_dune.svg", size: 4.6, crisp: true },
  site_crater: { file: "site_crater.svg", size: 4.6, crisp: true },
  site_cliff: { file: "site_cliff.svg", size: 4.6, crisp: true },
  site_riverbed: { file: "site_riverbed.svg", size: 4.6, crisp: true },
  site_canyon: { file: "site_canyon.svg", size: 4.6, crisp: true },
  site_delta: { file: "site_delta.svg", size: 4.6, crisp: true },
};
// Where the instrument stands in each site drawing, in cells from the drawing's centre.
// The "not explored yet" light and the "explored" flag are placed there.
const SITE_GEAR = {
  dune: [0.72, 0.8], crater: [0.72, 0.8], cliff: [0.75, 0.86], riverbed: [0.83, 0.96], canyon: [0.72, 0.83], delta: [1.03, 1.35],
};
const SITE_LABEL_DZ = 1.72; // name label, below the drawing

const TIER_COLOR = ["#f3b562", "#f3b562", "#ff8a55", "#ff5d73"];
const DONE_COLOR = "#7ad67a";
const GOAL_COLOR = "#ffd36b"; // today's task places
const SUIT = "#e9dfd2", SUIT_SHADE = "#b9a593", SUIT_EDGE = "rgba(61,46,36,0.5)", GLOVE = "#5a514a", BOOT = "#4a423c";

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
    vx: 0, vz: 0, speed: 0, stride: 0, stepN: 0, idleT: 0,
    action: null, // { kind, id, x, z, t0, dur, done } while the astronaut is busy with a job
    puffs: [],
    camX: n / 2, camZ: n / 2, snap: true,
    spawn: { x: n / 2, z: n / 2, heading: Math.PI },
    mode: "cinematic", enabled: true, running: false,
    phase: "day", weather: "sunny",
    near: null, dest: null, time: 0,
    trail: [],
  };
  let targets = [];
  let focus = new Set(); // ids of today's task places: drawn with gold markers
  let insetR = 0; // CSS pixels on the right covered by the open side panel
  let solids = [];
  let dpr = 1, W = 1, H = 1, S = 40; // S = device pixels per terrain cell

  // ---------- input ----------
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  const MOVE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
  const canControl = () => st.mode === "play" && st.enabled && st.running && !st.action && !document.querySelector("dialog[open]");
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
  function turnTo(want, k) {
    let diff = want - st.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    st.heading += diff * Math.min(1, k);
  }

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

    const act = st.action;
    if (act && act.goto) { // a job starts with a short walk up to the instrument
      const dx = act.goto.x - st.x, dz = act.goto.z - st.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.18 || st.time - act.t0 > 1.6) { act.goto = null; act.t0 = st.time; }
      else { mx = dx / d; mz = dz / d; }
    }

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    // Ease into and out of a walk instead of starting and stopping dead.
    const slow = st.weather === "dust" ? 0.8 : 1;
    const ease = Math.min(1, dt * (len > 0.05 ? 9 : 12));
    st.vx += (mx * SPEED * slow - st.vx) * ease;
    st.vz += (mz * SPEED * slow - st.vz) * ease;
    st.speed = Math.hypot(st.vx, st.vz);
    st.moving = st.speed > 0.25;
    if (st.moving) {
      let nx = clamp(st.x + st.vx * dt, 1, n - 1);
      let nz = clamp(st.z + st.vz * dt, 1, n - 1);
      for (const s of solids) {
        // standing buildings have an oval footprint (squashed north–south like their drawing)
        const k = s.k || 1, dx = nx - s.x, dz = (nz - s.z) / k;
        const d = Math.hypot(dx, dz);
        if (d < s.r && d > 0.0001) { nx = s.x + (dx / d) * s.r; nz = s.z + (dz / d) * s.r * k; if (st.dest) st.dest = null; }
      }
      st.x = nx;
      st.z = nz;
      // heading: forward = (sin h, cos h) with x east and z south
      if (len > 0.05) turnTo(Math.atan2(mx, mz), dt * TURN);
      // the walk cycle follows the distance covered, so it slows down and speeds up with the astronaut
      st.walkT += st.speed * dt * 1.55;
      st.idleT = 0;
      const last = st.trail[st.trail.length - 1];
      if (!last || Math.hypot(last.x - st.x, last.z - st.z) > 0.45) {
        st.trail.push({ x: st.x, z: st.z, t: st.time, side: (st.trail.length % 2) * 2 - 1, h: st.heading });
        if (st.trail.length > 26) st.trail.shift();
      }
      const stepN = Math.floor(st.walkT / Math.PI);
      if (stepN !== st.stepN) { // a boot lands: kick up a little dust behind it
        st.stepN = stepN;
        const side = (stepN % 2) * 2 - 1;
        const bx = st.x + Math.cos(st.heading) * 0.2 * side - Math.sin(st.heading) * 0.3;
        const bz = st.z - Math.sin(st.heading) * 0.2 * side - Math.cos(st.heading) * 0.3;
        st.puffs.push({ x: bx, z: bz, t: st.time, r: 0.3 + Math.random() * 0.16, dx: -st.vx * 0.04 + 0.1, dz: -st.vz * 0.04 });
        if (st.puffs.length > 24) st.puffs.shift();
      }
    } else {
      st.vx = st.vz = 0;
      st.idleT += dt;
    }
    // how far the arms and legs are swung: grows as the walk starts, settles when it stops
    st.stride += ((st.moving ? Math.min(1, st.speed / (SPEED * 0.8)) : 0) - st.stride) * Math.min(1, dt * 8);

    // a job in progress: face it, and finish when its time is up
    if (act && !act.goto) {
      turnTo(Math.atan2(act.x - st.x, act.z - st.z), dt * 8);
      if (st.time - act.t0 >= act.dur) {
        st.action = null;
        act.done();
      }
    }

    // camera
    let tx, tz;
    // On tall (phone) screens the top is covered by the chips and the minimap,
    // so look a little north of the astronaut to keep the way ahead visible.
    if (st.mode === "play") { tx = st.x; tz = st.z - (H > W ? 2.2 : 0); }
    // Not walking: drift slowly around the base, kept in the lower part of the
    // view so the floating phase panel (top) does not hide it.
    else { tx = st.spawn.x + 2 + Math.sin(st.time * 0.1) * 1.6; tz = st.spawn.z - 3.4 - (H / S) * 0.2 + Math.cos(st.time * 0.13) * 0.5; }
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

  // The drawings are baked into small bitmaps, once per zoom level, and given
  // the photo's own look: slightly soft, with a little film grain. That makes
  // them sit in the orbital picture instead of floating on top of it (and it is
  // cheaper than drawing the vector pictures again every frame).
  const baked = {};
  let bakedS = 0;
  let grain = null;

  function grainTile() {
    if (grain) return grain;
    grain = document.createElement("canvas");
    grain.width = grain.height = 160;
    const g = grain.getContext("2d");
    const d = g.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 70 + Math.random() * 116; // around mid-grey, which "overlay" leaves unchanged
      d.data[i] = v; d.data[i + 1] = v * 0.97; d.data[i + 2] = v * 0.93; d.data[i + 3] = 62;
    }
    g.putImageData(d, 0, 0);
    return grain;
  }

  function bake() {
    if (bakedS === S) return;
    bakedS = S;
    for (const [kind, sp] of Object.entries(SPRITES)) {
      const img = art[kind];
      const w = Math.max(8, Math.round(sp.size * S));
      const h = Math.max(8, Math.round(w * (img.height / img.width)));
      const c = baked[kind] || (baked[kind] = document.createElement("canvas"));
      c.width = w;
      c.height = h;
      const b = c.getContext("2d");
      b.imageSmoothingQuality = "high";
      if (sp.crisp) { b.drawImage(img, 0, 0, w, h); continue; } // cartoon art: sharp outlines, no photo grain
      b.filter = `blur(${(0.45 * dpr).toFixed(2)}px)`; // ignored where canvas filters are not supported
      b.drawImage(img, 0, 0, w, h);
      b.filter = "none";
      // grain, cut to the drawing's own shape
      const m = document.createElement("canvas");
      m.width = w;
      m.height = h;
      const mc = m.getContext("2d");
      mc.fillStyle = mc.createPattern(grainTile(), "repeat");
      mc.fillRect(0, 0, w, h);
      mc.globalCompositeOperation = "destination-in";
      mc.drawImage(c, 0, 0);
      b.globalCompositeOperation = "overlay";
      b.drawImage(m, 0, 0);
      b.globalCompositeOperation = "source-over";
    }
  }

  // Draws a picture at (x, z). Returns how far (px) it reaches below that point.
  function drawSprite(kind, x, z, rot = 0, scale = 1) {
    const img = baked[kind];
    const w = img.width * scale, h = img.height * scale;
    const an = SPRITES[kind].anchor ?? 0.5;
    ctx.save();
    ctx.translate(sx(x), sy(z));
    if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h * an, w, h);
    ctx.restore();
    return h * (1 - an);
  }

  // A soft shadow on the ground. The sun is in the west in the CTX photo (look
  // at the craters), so everything on the map throws its shadow to the east.
  function drawShadow(x, z, r) {
    const cx = sx(x) + 0.2 * S, cy = sy(z) + 0.06 * S;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.3, 0.92);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * S);
    g.addColorStop(0, "rgba(42,20,11,0.55)");
    g.addColorStop(0.6, "rgba(42,20,11,0.3)");
    g.addColorStop(1, "rgba(42,20,11,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ground wear that ties the drawings to the photo: a trodden path linking the
  // stations, and the rover's wheel tracks trailing away behind it.
  // How far (in cells) a picture reaches above / below the spot it stands on.
  const spriteH = (kind) => SPRITES[kind].size * (art[kind].height / art[kind].width);
  const above = (kind) => spriteH(kind) * (SPRITES[kind].anchor ?? 0.5);
  const below = (kind) => spriteH(kind) * (1 - (SPRITES[kind].anchor ?? 0.5));

  function drawGroundWear() {
    const stops = targets
      .filter((t) => t.kind === "habitat" || t.kind === "panels" || t.kind === "greenhouse" || t.kind === "antenna")
      .map((t) => ({ x: t.x, z: t.kind === "habitat" ? t.z + 0.8 : t.z + below(t.kind) + 0.85 })) // just south of the name labels
      .sort((a, b) => a.x - b.x);
    if (stops.length > 1) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(sx(stops[0].x), sy(stops[0].z));
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i - 1], b = stops[i];
        const mid = (a.x + b.x) / 2;
        ctx.bezierCurveTo(sx(mid), sy(a.z), sx(mid), sy(b.z), sx(b.x), sy(b.z));
      }
      ctx.strokeStyle = "rgba(74,40,24,0.09)";
      ctx.lineWidth = 0.5 * S;
      ctx.stroke();
      ctx.strokeStyle = "rgba(60,30,17,0.11)";
      ctx.lineWidth = 0.2 * S;
      ctx.stroke();
    }
    for (const t of targets) {
      if (t.kind !== "landmark") continue;
      // the rover faces west, so its wheel tracks trail away to the east, one per row of wheels
      const x = sx(t.x) + 0.5 * S, y = sy(t.z), len = 5 * S;
      const g = ctx.createLinearGradient(x, 0, x + len, 0);
      g.addColorStop(0, "rgba(62,32,18,0.42)");
      g.addColorStop(1, "rgba(62,32,18,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 0.1 * S;
      ctx.lineCap = "butt";
      for (const dy of [-0.27, -0.03]) {
        const y0 = y + dy * S;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.bezierCurveTo(x + len * 0.45, y0, x + len * 0.6, y0 + 0.9 * S, x + len, y0 + 1.3 * S);
        ctx.stroke();
      }
    }
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

  // A survey site is a drawing of the landform itself (dunes, a crater, a
  // layered butte...) with the instrument that studies it, not a pin in a ring.
  function drawSite(t) {
    const kind = `site_${t.id}`;
    const x = sx(t.x), y = sy(t.z);
    if (st.near === t.id) { // the astronaut is here: the ground lights up softly
      const r = 2.6 * S, k = 0.5 + 0.5 * Math.sin(st.time * 3);
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, `rgba(255,228,184,${0.16 + 0.08 * k})`);
      g.addColorStop(1, "rgba(255,228,184,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (baked[kind]) drawSprite(kind, t.x, t.z);
  }

  // Beside the instrument: a blinking lamp while the site is unexplored (its
  // colour says how far and costly the trip is), a planted flag once it is done.
  function drawSiteSignal(t) {
    const gear = SITE_GEAR[t.id] || [0, 0];
    const x = sx(t.x + gear[0]) + 0.36 * S, y = sy(t.z + gear[1]) + 0.1 * S;
    if (t.done) {
      const h = 0.66 * S, w = 0.44 * S;
      const wave = Math.sin(st.time * 5 + t.x) * 0.05 * S;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(42,20,11,0.4)";
      ctx.lineWidth = 2.4 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.55 * S, y + 0.13 * S);
      ctx.stroke();
      ctx.strokeStyle = "#efe6da";
      ctx.lineWidth = 2.2 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.quadraticCurveTo(x + w * 0.5, y - h + 0.05 * S + wave, x + w, y - h + 0.15 * S - wave);
      ctx.quadraticCurveTo(x + w * 0.5, y - h + 0.2 * S + wave, x, y - h + 0.3 * S);
      ctx.closePath();
      ctx.fillStyle = DONE_COLOR;
      ctx.fill();
      ctx.lineWidth = 1.2 * dpr;
      ctx.strokeStyle = "rgba(20,60,35,0.6)";
      ctx.stroke();
      return;
    }
    const color = TIER_COLOR[t.tier] || TIER_COLOR[1];
    const k = (st.time * 0.85 + t.x * 0.37) % 1;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * dpr;
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.beginPath();
    ctx.arc(x, y, (0.1 + k * 0.5) * S, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = (8 + 8 * (1 - k)) * dpr;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 0.085 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff8ec";
    ctx.beginPath();
    ctx.arc(x - 0.02 * S, y - 0.02 * S, 0.035 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPuffs() {
    for (const p of st.puffs) {
      const age = (st.time - p.t) / 0.9;
      if (age >= 1) continue;
      const r = p.r * (0.35 + age * 0.85) * S;
      const x = sx(p.x + p.dx * age), y = sy(p.z + p.dz * age);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(228,190,156,${0.36 * (1 - age) ** 1.5})`);
      g.addColorStop(1, "rgba(228,190,156,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function limb(x, y, w, h, r, fill, edge) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (edge) { ctx.strokeStyle = edge; ctx.stroke(); }
  }

  // The astronaut: the baked body picture, with arms and boots drawn here so
  // they can move. Walking swings them in step, standing still breathes and
  // looks around, and a job brings both hands forward to work.
  function drawAstronaut() {
    const u = (SPRITES.astronaut.size * S) / 160; // one unit of the 160-unit body picture
    const busy = st.action && !st.action.goto;
    const swing = Math.sin(st.walkT) * st.stride;
    const idle = st.moving || busy ? 0 : Math.min(1, st.idleT / 1.5);
    const bob = 1 + Math.abs(Math.cos(st.walkT)) * 0.035 * st.stride + Math.sin(st.time * 2.1) * 0.012 * idle;
    const look = Math.sin(st.time * 0.7) * 0.16 * idle + (busy ? Math.sin(st.time * 9) * 0.03 : 0);
    const work = busy ? Math.sin(st.time * 15) : 0;

    drawShadow(st.x, st.z, SPRITES.astronaut.size * 0.42);
    ctx.save();
    ctx.translate(sx(st.x), sy(st.z));
    ctx.rotate(Math.PI - st.heading);
    ctx.lineWidth = 1.6 * u;
    // boots: forward is up (-y). They show ahead of and behind the body as it strides.
    for (const side of [-1, 1]) {
      const y = 6 * u - side * swing * 26 * u;
      limb(side * 25 * u - 10 * u, y - 17 * u, 20 * u, 34 * u, 9 * u, BOOT, null);
      limb(side * 25 * u - 7 * u, y - 15 * u, 14 * u, 9 * u, 4.5 * u, "#6a5f56", null);
    }
    ctx.rotate(look + swing * 0.07); // shoulders turn a little with each step
    ctx.scale(bob, bob);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 46 * u, 2 * u + (busy ? -15 * u + work * side * 5 * u : side * swing * 16 * u));
      ctx.rotate(side * (busy ? -0.5 : 0.22));
      const g = ctx.createLinearGradient(0, -22 * u, 0, 22 * u);
      g.addColorStop(0, SUIT);
      g.addColorStop(1, SUIT_SHADE);
      limb(-11 * u, -22 * u, 22 * u, 44 * u, 11 * u, g, SUIT_EDGE);
      ctx.beginPath();
      ctx.arc(0, -22 * u, 9.5 * u, 0, Math.PI * 2);
      ctx.fillStyle = GLOVE;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -23.5 * u, 5.5 * u, 0, Math.PI * 2);
      ctx.fillStyle = "#796e65";
      ctx.fill();
      ctx.restore();
    }
    const img = baked.astronaut;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  // ---------- jobs: a short animation while the astronaut works ----------
  const rnd = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const dot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

  function drawAction() {
    const a = st.action;
    if (!a || a.goto) return;
    const T = st.time - a.t0, p = clamp(T / a.dur, 0, 1);
    const x = sx(a.x), y = sy(a.z);
    ctx.save();
    ctx.lineCap = "round";

    if (a.kind === "sample") {
      // the drill turns and throws out dust; near the end a sealed sample tube comes up
      if (p < 0.8) {
        ctx.fillStyle = "#e4be9c";
        for (let i = 0; i < 18; i++) {
          const ph = (T / 0.6 + rnd(i + 50)) % 1, ang = rnd(i) * Math.PI * 2;
          const d = (0.12 + ph * 0.8) * S * (0.6 + rnd(i + 9) * 0.6);
          ctx.globalAlpha = (1 - ph) * 0.75;
          dot(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.8, (0.04 + 0.05 * rnd(i + 3)) * S);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#463d37";
        ctx.lineWidth = 3 * dpr;
        for (let k = 0; k < 4; k++) {
          const ang = T * 14 + (k * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(ang) * 0.2 * S, y + Math.sin(ang) * 0.2 * S);
          ctx.stroke();
        }
      }
      if (p > 0.68) {
        const q = (p - 0.68) / 0.32, e = 1 - (1 - q) ** 3;
        const ty = y - e * 1.15 * S, w = 0.2 * S, h = 0.56 * S;
        ctx.globalAlpha = Math.min(1, q * 4);
        ctx.shadowColor = "#7fe3da";
        ctx.shadowBlur = 16 * dpr;
        limb(x - w / 2, ty - h / 2, w, h, w / 2, "#efe6da", null);
        ctx.shadowBlur = 0;
        limb(x - w / 2, ty - h / 2, w, h * 0.28, w / 2, "#b5532c", null);
        limb(x - w * 0.28, ty - h * 0.12, w * 0.56, h * 0.5, w * 0.2, "#b9774f", null); // the rock core inside
        ctx.globalAlpha = 1;
      }
    } else if (a.kind === "clean") {
      // a brush sweeps west to east: dust blows off, clean glass sparkles behind it
      const left = x - 1.2 * S, bx = left + p * 2.4 * S;
      ctx.fillStyle = "#e4be9c";
      for (let i = 0; i < 24; i++) {
        const ph = (T / 0.8 + rnd(i + 20)) % 1;
        ctx.globalAlpha = (1 - ph) * 0.5;
        dot(bx + ph * 1.5 * S * (0.4 + rnd(i)), y + (rnd(i + 7) - 0.5) * 2.1 * S - ph * 0.25 * S, (0.07 + ph * 0.16) * S);
      }
      ctx.globalAlpha = 0.55;
      const g = ctx.createLinearGradient(bx - 0.3 * S, 0, bx + 0.3 * S, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(bx - 0.3 * S, y - 1.05 * S, 0.6 * S, 2.1 * S);
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 7; i++) {
        const px = left + (0.1 + rnd(i + 31) * 0.8) * 2.4 * S;
        if (px > bx) continue;
        const py = y + (Math.floor(rnd(i + 5) * 3) - 1) * 0.75 * S, r = 0.16 * S * Math.abs(Math.sin(T * 7 + i * 1.7));
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(px, py - r); ctx.quadraticCurveTo(px, py, px + r, py); ctx.quadraticCurveTo(px, py, px, py + r);
        ctx.quadraticCurveTo(px, py, px - r, py); ctx.quadraticCurveTo(px, py, px, py - r);
        ctx.fill();
      }
    } else if (a.kind === "tend") {
      // water ripples, then new leaves pop up along the rows
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = "#9bd4ff";
      for (let i = 0; i < 9; i++) {
        const ph = (T / 0.7 + rnd(i + 11)) % 1;
        ctx.globalAlpha = (1 - ph) * 0.8;
        ctx.beginPath();
        ctx.arc(x + (rnd(i) - 0.5) * 1.7 * S, y + (rnd(i + 4) - 0.5) * 0.9 * S, ph * 0.22 * S, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const q = clamp((p - 0.15 - i * 0.08) / 0.18, 0, 1);
        if (!q) continue;
        const sc = (q < 1 ? q * 1.25 : 1) * 0.2 * S;
        const lx = x + (i / 7 - 0.5) * 1.6 * S, ly = y + ((i % 3) - 1) * 0.34 * S - q * 0.12 * S;
        ctx.globalAlpha = 1;
        ctx.fillStyle = i % 2 ? "#7ad67a" : "#a6e88f";
        ctx.strokeStyle = "rgba(20,60,35,0.7)";
        ctx.lineWidth = 1.2 * dpr;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(lx + side * sc * 0.55, ly, sc * 0.62, sc * 0.34, side * -0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (a.kind === "inspect") {
      // a scanner line sweeps down the three rows of panels and lights up the dust it finds
      const top = y - 1.15 * S, h = 2.3 * S, left = x - 1.2 * S, w = 2.4 * S;
      const sy0 = top + ((T / 0.55) % 1) * h;
      ctx.globalAlpha = 0.85;
      const g = ctx.createLinearGradient(0, sy0 - 0.3 * S, 0, sy0 + 0.05 * S);
      g.addColorStop(0, "rgba(127,227,218,0)");
      g.addColorStop(1, "rgba(127,227,218,0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(left, sy0 - 0.3 * S, w, 0.35 * S);
      ctx.strokeStyle = "#bff7f1";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(left, sy0);
      ctx.lineTo(left + w, sy0);
      ctx.stroke();
      ctx.fillStyle = "#ffcf8a";
      for (let i = 0; i < 16; i++) { // dust specks show up once the scanner has passed them
        const py = top + rnd(i + 70) * h;
        if (py > sy0) continue;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(T * 6 + i);
        dot(left + rnd(i + 90) * w, py, 0.04 * S);
      }
    } else if (a.kind === "call") {
      // radio rings spread from the dish and a signal sets off for Earth
      ctx.strokeStyle = "#7fe3da";
      ctx.lineWidth = 3 * dpr;
      for (let k = 0; k < 3; k++) {
        const ph = (T / 0.9 + k / 3) % 1;
        ctx.globalAlpha = (1 - ph) * 0.85;
        ctx.beginPath();
        ctx.arc(x, y, (0.35 + ph * 2.3) * S, 0, Math.PI * 2);
        ctx.stroke();
      }
      const ex = x + 3.4 * S, ey = y - 5.6 * S;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2.5 * dpr;
      ctx.setLineDash([5 * dpr, 11 * dpr]);
      ctx.lineDashOffset = -T * 130 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      const ph = (T / 0.7) % 1;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#eafffb";
      ctx.shadowColor = "#7fe3da";
      ctx.shadowBlur = 14 * dpr;
      dot(x + (ex - x) * ph, y + (ey - y) * ph, 0.09 * S);
    }
    ctx.restore();

    // progress ring around the astronaut
    const ax = sx(st.x), ay = sy(st.z), r = 0.95 * S;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 5 * dpr;
    ctx.strokeStyle = "rgba(27,21,48,0.55)";
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3.4 * dpr;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ax, ay, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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
    const right = W - m - insetR * dpr; // keep clear of the open side panel
    for (const t of targets) {
      const goal = focus.has(t.id);
      if (t.kind !== "site" && t.kind !== "habitat" && !goal) continue;
      const x = sx(t.mx ?? t.x), y = sy(t.mz ?? t.z);
      if (x >= 0 && x <= right && y >= 0 && y <= H) continue;
      const cx = clamp(x, m, right), cy = clamp(y, m + 84 * dpr, H - m); // stay below the top bar and chips
      const ang = Math.atan2(y - cy, x - cx);
      const color = goal ? GOAL_COLOR : t.kind === "habitat" ? "#ffffff" : t.done ? DONE_COLOR : TIER_COLOR[t.tier] || TIER_COLOR[1];
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
    bake();
    drawGround();
    drawGroundWear();

    for (const t of targets) if (t.kind === "site") drawSite(t);
    drawFootprints();
    drawPuffs();
    for (const t of targets) if (t.kind === "site") drawSiteSignal(t);

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
        drawAstronaut();
      } else if (art[o.kind]) {
        const down = drawSprite(o.kind, o.x, o.z);
        labels.push({ text: plainLabel(o.t), x: sx(o.x), y: sy(o.z) + down + 4 * dpr, done: o.t.done });
      }
    }

    drawAtmosphere(night);
    if (play) drawAction();

    // labels and guides stay readable above the weather and the night
    for (const l of labels) pill(l.text, l.x, l.y, { done: l.done, small: true });
    for (const t of targets) {
      if (t.kind === "site") pill(plainLabel(t), sx(t.x), sy(t.z + SITE_LABEL_DZ), { done: t.done });
    }
    if (play) drawFocus();
    if (play) drawOffscreenArrows();
  }

  // A bobbing gold arrow over each place where one of today's tasks is done.
  function drawFocus() {
    for (const t of targets) {
      if (!focus.has(t.id) || st.near === t.id) continue;
      const kind = t.kind === "site" ? `site_${t.id}` : t.kind;
      const up = SPRITES[kind] ? above(kind) : 0.6;
      const x = sx(t.mx ?? t.x), bob = Math.sin(st.time * 4 + t.x) * 0.12 * S;
      const y = sy((t.mz ?? t.z) - up * (t.kind === "site" ? 0.55 : 1)) - 0.35 * S + bob;
      const r = 0.3 * S;
      ctx.save();
      ctx.shadowColor = "rgba(255,211,107,0.9)";
      ctx.shadowBlur = 12 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, y + r * 1.15);
      ctx.lineTo(x - r, y - r * 0.35);
      ctx.lineTo(x - r * 0.42, y - r * 0.35);
      ctx.lineTo(x - r * 0.42, y - r * 1.2);
      ctx.lineTo(x + r * 0.42, y - r * 1.2);
      ctx.lineTo(x + r * 0.42, y - r * 0.35);
      ctx.lineTo(x + r, y - r * 0.35);
      ctx.closePath();
      ctx.fillStyle = GOAL_COLOR;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = "rgba(60,30,10,0.85)";
      ctx.stroke();
      ctx.restore();
    }
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
      if (focus.has(t.id)) { // today's task places: a pulsing gold ring
        c.beginPath();
        c.arc(x, y, 8 + 2 * Math.sin(st.time * 4), 0, Math.PI * 2);
        c.lineWidth = 2.5;
        c.strokeStyle = GOAL_COLOR;
        c.stroke();
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

  function endAction() { // never leave a job hanging if the view stops or changes
    const a = st.action;
    if (!a) return;
    st.action = null;
    a.done();
  }

  const api = {
    kind: "2d",
    size: n,
    info: M,
    setTargets(list) {
      targets = list;
      solids = list.filter((t) => t.solid).map((t) => ({ x: t.mx ?? t.x, z: t.mz ?? t.z, r: t.solid, k: SPRITES[t.kind]?.crisp ? 0.4 : 1 }));
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
      st.puffs = [];
      st.vx = st.vz = st.stride = 0;
      st.snap = true;
      keys.clear();
    },
    setMode(mode) {
      if (st.mode === mode) return;
      st.mode = mode;
      st.snap = true;
      st.dest = null;
      keys.clear();
      if (mode !== "play") endAction();
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
      endAction();
    },
    // Play a job's animation: the astronaut walks up to the instrument (survey
    // sites only), works for `ms`, and the promise resolves when it is over.
    // kind: "sample" | "clean" | "tend" | "call". Walking is paused meanwhile.
    playAction(kind, id, ms = 1500) {
      const t = targets.find((x) => x.id === id);
      if (!t || ms <= 0 || st.mode !== "play" || !st.running) return Promise.resolve();
      endAction();
      return new Promise((resolve) => {
        const gear = t.kind === "site" ? SITE_GEAR[t.id] || [0, 0] : [0, 0];
        // a standing building: play the job over the middle of the picture, not at its feet
        const lift = t.kind !== "site" && SPRITES[t.kind] && art[t.kind] ? above(t.kind) - spriteH(t.kind) / 2 : 0;
        const x = (t.mx ?? t.x) + gear[0], z = (t.mz ?? t.z) + gear[1] - lift;
        st.dest = null;
        const a = {
          kind, id, x, z, t0: st.time, dur: ms / 1000, done: resolve,
          goto: t.kind === "site" ? { x: x - 0.85, z: z + 0.15 } : null, // stand just west of the instrument
        };
        st.action = a;
        // The animation runs on screen frames. If the page is in the background
        // and frames stop coming, still finish the job in good time.
        setTimeout(() => { if (st.action === a) endAction(); }, ms + 2600);
      });
    },
    get busy() { return !!st.action; },
    // Today's task places, drawn with gold markers (an array of target ids).
    setFocus(ids) { focus = new Set(ids); },
    // How much of the right edge (CSS px) is covered, so off-screen arrows stay visible.
    setInsets(right) { insetR = right || 0; },
    // "Show the way": walk to a spot, as if the player had clicked the ground there.
    walkTo(x, z) {
      if (st.mode !== "play" || st.action) return;
      st.dest = { x: clamp(x, 1, n - 1), z: clamp(z, 1, n - 1) };
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
