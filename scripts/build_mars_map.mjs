// Build the game's ground picture: a sharp, colour image of Jezero crater made
// from real NASA orbital imagery.
//
// Usage:  npm install   (once, for the two image libraries)
//         node scripts/build_mars_map.mjs
//
// 1. Detail: MRO Context Camera (CTX) mosaic of Jezero from NASA Mars Trek
//    (layer Jezero_CTX_BlockAdj_dd), about 19 m per pixel at the zoom used here.
//    CTX is a black-and-white camera.
// 2. Colour: the Viking MDIM 2.1 colour mosaic (already downloaded by
//    fetch_mars_terrain.mjs). Each CTX pixel keeps its real brightness and
//    is tinted a natural Mars tone, nudged by the real Viking colour there.
//
// Output: data/mars/map/*.jpg (1024 px chunks + a small overview) and
//         data/mars/jezero_map.json. Downloaded tiles are cached in .cache/.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARS = join(ROOT, "data", "mars");
const CACHE = join(ROOT, ".cache", "ctx");
const OUT_DIR = join(MARS, "map");
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const terrain = JSON.parse(readFileSync(join(MARS, "jezero_terrain.json"), "utf8"));
const { west, east, north, south } = terrain.bbox;

const LAYER = "Jezero_CTX_BlockAdj_dd";
const Z = 12;
const TILE = 256;
const tileDeg = 180 / 2 ** Z;
const OUT = 3072; // 24 px per terrain cell
const CHUNK = 1024;
const QUALITY = 84;
// The Viking mosaic is colour-stretched (it looks purple here), so it only nudges the hue.
const MARS_TONE = [1.2, 0.94, 0.72]; // butterscotch, luminance ≈ 1
const VIKING_WEIGHT = 0.3;

// ---------- 1. download CTX tiles ----------
const colMin = Math.floor((west + 180) / tileDeg);
const colMax = Math.floor((east + 180 - 1e-9) / tileDeg);
const rowMin = Math.floor((90 - north) / tileDeg);
const rowMax = Math.floor((90 - south - 1e-9) / tileDeg);
const jobs = [];
for (let row = rowMin; row <= rowMax; row++) for (let col = colMin; col <= colMax; col++) jobs.push({ row, col });
console.log(`CTX: ${jobs.length} tiles (zoom ${Z}, rows ${rowMin}..${rowMax}, cols ${colMin}..${colMax})`);

async function getTile({ row, col }) {
  const file = join(CACHE, `z${Z}_${row}_${col}.png`);
  if (existsSync(file)) return readFileSync(file);
  const url = `https://trek.nasa.gov/tiles/Mars/EQ/${LAYER}/1.0.0/default/default028mm/${Z}/${row}/${col}.png`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "sol-by-sol-hackathon" } });
      if (res.status === 404) { writeFileSync(file, Buffer.alloc(0)); return Buffer.alloc(0); }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      return buf;
    } catch (err) {
      if (attempt === 3) throw new Error(`tile ${row}/${col}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

const MW = (colMax - colMin + 1) * TILE;
const MH = (rowMax - rowMin + 1) * TILE;
const gray = new Uint8Array(MW * MH);
const mask = new Uint8Array(MW * MH); // 1 where CTX has data

let done = 0;
let missing = 0;
async function worker() {
  while (jobs.length) {
    const job = jobs.pop();
    const buf = await getTile(job);
    if (buf.length) {
      const png = PNG.sync.read(buf);
      const ox = (job.col - colMin) * TILE;
      const oy = (job.row - rowMin) * TILE;
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const i = (y * TILE + x) * 4;
          const o = (oy + y) * MW + ox + x;
          gray[o] = png.data[i];
          mask[o] = png.data[i + 3] > 127 ? 1 : 0;
        }
      }
    } else missing++;
    if (++done % 50 === 0) console.log(`  ${done} tiles`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`CTX: mosaic ${MW}×${MH}px, ${missing} empty tiles`);

// ---------- 2. Viking colour ----------
const vik = terrain.tiles.map((t) => ({ ...t, img: jpeg.decode(readFileSync(join(MARS, t.file)), { useTArray: true }) }));
function vikingAt(lon, lat) {
  const t = vik.find((v) => lon >= v.west && lon < v.east && lat <= v.north && lat > v.south) || vik[0];
  const { width: w, height: h, data } = t.img;
  const fx = Math.min(w - 1.001, Math.max(0, ((lon - t.west) / (t.east - t.west)) * w - 0.5));
  const fy = Math.min(h - 1.001, Math.max(0, ((t.north - lat) / (t.north - t.south)) * h - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const ax = fx - x0, ay = fy - y0;
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const p = (x, y) => data[(y * w + x) * 4 + c];
    out[c] = (p(x0, y0) * (1 - ax) + p(x0 + 1, y0) * ax) * (1 - ay) + (p(x0, y0 + 1) * (1 - ax) + p(x0 + 1, y0 + 1) * ax) * ay;
  }
  return out;
}

// ---------- 3. resample + colourise ----------
const mosaicWest = -180 + colMin * tileDeg;
const mosaicNorth = 90 - rowMin * tileDeg;
const pxPerDeg = TILE / tileDeg;

function ctxAt(lon, lat) {
  const fx = Math.min(MW - 1.001, Math.max(0, (lon - mosaicWest) * pxPerDeg - 0.5));
  const fy = Math.min(MH - 1.001, Math.max(0, (mosaicNorth - lat) * pxPerDeg - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const ax = fx - x0, ay = fy - y0;
  const i = y0 * MW + x0;
  if (!(mask[i] && mask[i + 1] && mask[i + MW] && mask[i + MW + 1])) return -1;
  return (gray[i] * (1 - ax) + gray[i + 1] * ax) * (1 - ay) + (gray[i + MW] * (1 - ax) + gray[i + MW + 1] * ax) * ay;
}

// brightness stretch from the CTX histogram (1st..99th percentile)
const hist = new Uint32Array(256);
let count = 0;
for (let i = 0; i < gray.length; i += 7) if (mask[i]) { hist[gray[i]]++; count++; }
const pct = (p) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= count * p) return v; } return 255; };
const lo = pct(0.01), hi = pct(0.99);
console.log(`CTX: brightness stretch ${lo}..${hi}`);

const rgb = new Uint8Array(OUT * OUT * 3);
let holes = 0;
for (let oy = 0; oy < OUT; oy++) {
  const lat = north - ((oy + 0.5) / OUT) * (north - south);
  for (let ox = 0; ox < OUT; ox++) {
    const lon = west + ((ox + 0.5) / OUT) * (east - west);
    const v = vikingAt(lon, lat);
    const lum = 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2] || 1;
    let g = ctxAt(lon, lat);
    const o = (oy * OUT + ox) * 3;
    if (g < 0) { // no CTX here: fall back to the Viking picture
      holes++;
      rgb[o] = Math.min(255, v[0] * 1.3); rgb[o + 1] = Math.min(255, v[1] * 1.3); rgb[o + 2] = Math.min(255, v[2] * 1.3);
      continue;
    }
    g = 38 + (Math.min(1, Math.max(0, (g - lo) / (hi - lo))) * 200); // 38..238
    // Tint: mostly a natural Mars tone, nudged by the real Viking colour so that
    // darker volcanic floor and brighter dusty areas still differ in hue.
    for (let c = 0; c < 3; c++) {
      const tint = MARS_TONE[c] * (1 - VIKING_WEIGHT) + (v[c] / lum) * VIKING_WEIGHT;
      rgb[o + c] = Math.min(255, tint * g);
    }
  }
}
console.log(`Colourised ${OUT}×${OUT}px (${((holes / (OUT * OUT)) * 100).toFixed(2)}% filled from Viking)`);

// ---------- 4. write JPEG chunks + overview ----------
function encode(x0, y0, w, h, step = 1) {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y * step) * OUT + x0 + x * step) * 3;
      const d = (y * w + x) * 4;
      if (step === 1) { data[d] = rgb[s]; data[d + 1] = rgb[s + 1]; data[d + 2] = rgb[s + 2]; }
      else { // box filter for the overview
        let r = 0, g = 0, b = 0;
        for (let yy = 0; yy < step; yy++) for (let xx = 0; xx < step; xx++) {
          const q = ((y0 + y * step + yy) * OUT + x0 + x * step + xx) * 3;
          r += rgb[q]; g += rgb[q + 1]; b += rgb[q + 2];
        }
        const n = step * step;
        data[d] = r / n; data[d + 1] = g / n; data[d + 2] = b / n;
      }
      data[d + 3] = 255;
    }
  }
  return jpeg.encode({ data, width: w, height: h }, QUALITY).data;
}

const chunks = [];
let bytes = 0;
for (let r = 0; r < OUT / CHUNK; r++) {
  for (let c = 0; c < OUT / CHUNK; c++) {
    const file = `map/jezero_${r}_${c}.jpg`;
    const buf = encode(c * CHUNK, r * CHUNK, CHUNK, CHUNK);
    writeFileSync(join(MARS, file), buf);
    bytes += buf.length;
    chunks.push({ file, row: r, col: c });
  }
}
const overview = encode(0, 0, 256, 256, OUT / 256);
writeFileSync(join(MARS, "map/overview.jpg"), overview);
bytes += overview.length;

writeFileSync(join(MARS, "jezero_map.json"), JSON.stringify({
  name: "Jezero crater, Mars",
  bbox: terrain.bbox,
  size: OUT,
  chunk: CHUNK,
  cells: terrain.size,
  pxPerCell: OUT / terrain.size,
  metersPerPixel: Math.round((terrain.metersPerCell * terrain.size) / OUT),
  overview: "map/overview.jpg",
  chunks,
  detailSource: { name: "MRO Context Camera (CTX) mosaic of Jezero, via NASA Mars Trek", url: "https://trek.nasa.gov/mars/", layer: LAYER, zoom: Z },
  colourSource: terrain.imagerySource,
  note: "CTX is a black-and-white camera. Each pixel keeps its real CTX brightness and is tinted a natural Mars tone, nudged by the Viking colour mosaic.",
  builtAt: new Date().toISOString(),
}, null, 2));
console.log(`Saved ${chunks.length} chunks + overview, ${(bytes / 1e6).toFixed(1)} MB total`);
