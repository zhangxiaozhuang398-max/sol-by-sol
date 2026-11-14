// Build the ground photo and the real skyline for every 3D place: the base,
// the six survey sites and Perseverance's landing site.
//
// Usage:  npm install   (once, for the two image libraries)
//         node scripts/build_scenes.mjs
//
// For each place:
//  - "near" photo: 384 m square at about 0.32 m per pixel, and
//  - "far" photo: 3 km square at about 2.5 m per pixel,
//    both from NASA Mars Trek's Jezero mosaic of MRO HiRISE and CTX images
//    (layer NES_JEZ_MID_Visible_Mosaic_HiRISE_CTX_HRSC). The cameras are
//    black-and-white; the picture is tinted a natural Mars tone.
//  - skyline: for 120 compass directions, how high the real terrain rises above
//    the horizon as seen from that spot, from the MOLA elevation grid
//    (scripts/fetch_mars_terrain.mjs).
//
// Output: data/mars/scenes/*.jpg and data/mars/scenes.json.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { SITES, WORLD_BASE } from "../js/sites.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARS = join(ROOT, "data", "mars");
const CACHE = join(ROOT, ".cache", "hirise");
const OUT_DIR = join(MARS, "scenes");
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const terrain = JSON.parse(readFileSync(join(MARS, "jezero_terrain.json"), "utf8"));
const { west, east, north, south } = terrain.bbox;
const N = terrain.size;

const LAYER = "NES_JEZ_MID_Visible_Mosaic_HiRISE_CTX_HRSC_GCS_MARS_07-10-2018";
const TILE = 256;
const OUT = 1536;
const QUALITY = 90;
const MARS_RADIUS = 3396190;
const M_PER_DEG = (2 * Math.PI * MARS_RADIUS) / 360;
const MARS_TONE = [1.2, 0.94, 0.72]; // butterscotch, luminance ≈ 1
const NEAR = { zoom: 17, size: 384 }; // metres across
const FAR = { zoom: 14, size: 3072 };
const SKY_STEPS = 120;
const EYE = 2; // metres above the ground

// grid cell (column, row) → latitude / longitude
const cellToLatLon = (x, z) => ({ lat: north - (z / N) * (north - south), lon: west + (x / N) * (east - west) });

const base = WORLD_BASE.stations.find((s) => s.id === "habitat");
const PLACES = [
  { id: "base", x: base.mx ?? base.x, z: (base.mz ?? base.z) + 0.02 },
  ...SITES.map((s) => ({ id: s.id, x: s.wx, z: s.wz })),
  { id: WORLD_BASE.landmark.id, x: WORLD_BASE.landmark.x, z: WORLD_BASE.landmark.z },
];

// ---------- tiles ----------
async function getTile(z, row, col) {
  const file = join(CACHE, `z${z}_${row}_${col}.png`);
  if (existsSync(file)) return readFileSync(file);
  const url = `https://trek.nasa.gov/tiles/Mars/EQ/${LAYER}/1.0.0/default/default028mm/${z}/${row}/${col}.png`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "sol-by-sol-hackathon" } });
      if (res.status === 404) { writeFileSync(file, Buffer.alloc(0)); return Buffer.alloc(0); }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      return buf;
    } catch (err) {
      if (attempt === 3) throw new Error(`tile ${z}/${row}/${col}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

// A square patch of `size` metres centred on (lat, lon), resampled to OUT × OUT grey values (-1 = no data).
async function patch(lat, lon, { zoom, size }) {
  const tileDeg = 180 / 2 ** zoom;
  const dLat = size / 2 / M_PER_DEG;
  const dLon = size / 2 / (M_PER_DEG * Math.cos((lat * Math.PI) / 180));
  const colMin = Math.floor((lon - dLon + 180) / tileDeg), colMax = Math.floor((lon + dLon + 180) / tileDeg);
  const rowMin = Math.floor((90 - (lat + dLat)) / tileDeg), rowMax = Math.floor((90 - (lat - dLat)) / tileDeg);
  const MW = (colMax - colMin + 1) * TILE, MH = (rowMax - rowMin + 1) * TILE;
  const gray = new Uint8Array(MW * MH), mask = new Uint8Array(MW * MH);
  const jobs = [];
  for (let row = rowMin; row <= rowMax; row++) for (let col = colMin; col <= colMax; col++) jobs.push({ row, col });
  let empty = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (jobs.length) {
      const job = jobs.pop();
      const buf = await getTile(zoom, job.row, job.col);
      if (!buf.length) { empty++; continue; }
      const png = PNG.sync.read(buf);
      const ox = (job.col - colMin) * TILE, oy = (job.row - rowMin) * TILE;
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        const i = (y * TILE + x) * 4, o = (oy + y) * MW + ox + x;
        gray[o] = png.data[i];
        mask[o] = png.data[i + 3] > 127 ? 1 : 0;
      }
    }
  }));
  const mWest = -180 + colMin * tileDeg, mNorth = 90 - rowMin * tileDeg, pxPerDeg = TILE / tileDeg;
  const out = new Float32Array(OUT * OUT);
  for (let oy = 0; oy < OUT; oy++) {
    const la = lat + dLat - ((oy + 0.5) / OUT) * 2 * dLat;
    for (let ox = 0; ox < OUT; ox++) {
      const lo = lon - dLon + ((ox + 0.5) / OUT) * 2 * dLon;
      const fx = (lo - mWest) * pxPerDeg - 0.5, fy = (mNorth - la) * pxPerDeg - 0.5;
      let v = -1;
      if (fx >= 0 && fy >= 0 && fx <= MW - 1.001 && fy <= MH - 1.001) {
        const x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0, i = y0 * MW + x0;
        if (mask[i] && mask[i + 1] && mask[i + MW] && mask[i + MW + 1]) {
          v = (gray[i] * (1 - ax) + gray[i + 1] * ax) * (1 - ay) + (gray[i + MW] * (1 - ax) + gray[i + MW + 1] * ax) * ay;
        }
      }
      out[oy * OUT + ox] = v;
    }
  }
  return { out, tiles: (colMax - colMin + 1) * (rowMax - rowMin + 1), empty };
}

function stretchOf(values) {
  const hist = new Uint32Array(256);
  let count = 0;
  for (let i = 0; i < values.length; i += 3) if (values[i] >= 0) { hist[Math.round(values[i])]++; count++; }
  const pct = (p) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= count * p) return v; } return 255; };
  return { lo: pct(0.01), hi: pct(0.99), count };
}

function sharpen(values, amount = 0.32) {
  const out = new Float32Array(values.length);
  for (let y = 0; y < OUT; y++) {
    for (let x = 0; x < OUT; x++) {
      const i = y * OUT + x;
      const v = values[i];
      if (v < 0) { out[i] = v; continue; }
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= OUT || yy >= OUT) continue;
          const u = values[yy * OUT + xx];
          if (u >= 0) { sum += u; n++; }
        }
      }
      out[i] = Math.min(255, Math.max(0, v + (v - sum / n) * amount));
    }
  }
  return out;
}

function saveJpeg(file, values, s) {
  values = sharpen(values);
  const data = Buffer.alloc(OUT * OUT * 4, 255);
  const mid = 0.5;
  for (let i = 0; i < OUT * OUT; i++) {
    const t = values[i] < 0 ? mid : Math.min(1, Math.max(0, (values[i] - s.lo) / Math.max(1, s.hi - s.lo)));
    const g = 44 + t * 186;
    for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.min(255, MARS_TONE[c] * g);
  }
  const buf = jpeg.encode({ data, width: OUT, height: OUT }, QUALITY).data;
  writeFileSync(join(MARS, file), buf);
  return buf.length;
}

// ---------- skyline from MOLA ----------
const heightAt = (x, z) => {
  const fx = Math.min(N - 1.001, Math.max(0, x - 0.5)), fz = Math.min(N - 1.001, Math.max(0, z - 0.5));
  const x0 = Math.floor(fx), z0 = Math.floor(fz), ax = fx - x0, az = fz - z0;
  const h = (c, r) => terrain.heights[r * N + c];
  return (h(x0, z0) * (1 - ax) + h(x0 + 1, z0) * ax) * (1 - az) + (h(x0, z0 + 1) * (1 - ax) + h(x0 + 1, z0 + 1) * ax) * az;
};
function skyline(x, z) {
  const h0 = heightAt(x, z) + EYE;
  const cellM = terrain.metersPerCell;
  const out = [];
  for (let i = 0; i < SKY_STEPS; i++) {
    const a = (i / SKY_STEPS) * Math.PI * 2; // 0 = north, clockwise
    const dx = Math.sin(a), dz = -Math.cos(a);
    let best = 0;
    for (let d = 1.5; ; d += 0.5) {
      const px = x + dx * d, pz = z + dz * d;
      if (px < 0.5 || pz < 0.5 || px > N - 0.5 || pz > N - 0.5) break;
      const ang = Math.atan2(heightAt(px, pz) - h0, d * cellM);
      if (ang > best) best = ang;
    }
    out.push(Math.round(((best * 180) / Math.PI) * 100) / 100);
  }
  return out;
}

// ---------- build ----------
const places = {};
let bytes = 0;
for (const p of PLACES) {
  const { lat, lon } = cellToLatLon(p.x, p.z);
  const far = await patch(lat, lon, FAR);
  const near = await patch(lat, lon, NEAR);
  const s = stretchOf(far.out); // one stretch for both, so the two photos match
  const nearCover = stretchOf(near.out).count / (OUT * OUT / 3);
  bytes += saveJpeg(`scenes/${p.id}_far.jpg`, far.out, s);
  bytes += saveJpeg(`scenes/${p.id}_near.jpg`, near.out, s);
  const sky = skyline(p.x, p.z);
  places[p.id] = {
    lat: Math.round(lat * 1e5) / 1e5,
    lon: Math.round(lon * 1e5) / 1e5,
    elevation: Math.round(heightAt(p.x, p.z)),
    near: { file: `scenes/${p.id}_near.jpg`, size: NEAR.size },
    far: { file: `scenes/${p.id}_far.jpg`, size: FAR.size },
    skyline: sky,
  };
  console.log(`${p.id.padEnd(13)} ${lat.toFixed(4)}°N ${lon.toFixed(4)}°E  ${places[p.id].elevation} m  tiles ${far.tiles}+${near.tiles} (empty ${far.empty}+${near.empty})  near cover ${(nearCover * 100).toFixed(0)}%  skyline max ${Math.max(...sky).toFixed(1)}°`);
}

writeFileSync(join(MARS, "scenes.json"), JSON.stringify({
  note: "Ground photos are real orbital images (black-and-white cameras, tinted a Mars tone). Skyline = real terrain height above the horizon in degrees, 0 = north, clockwise.",
  imagery: { name: "Jezero mosaic of MRO HiRISE and CTX images, via NASA Mars Trek", url: "https://trek.nasa.gov/mars/", layer: LAYER },
  elevation: terrain.elevationSource,
  skylineSteps: SKY_STEPS,
  places,
  builtAt: new Date().toISOString(),
}, null, 1));
console.log(`Saved ${PLACES.length} places, ${(bytes / 1e6).toFixed(1)} MB of photos`);
