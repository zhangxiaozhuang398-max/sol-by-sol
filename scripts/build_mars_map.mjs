// Build the game's ground picture: a sharp, colour image of Jezero crater made
// from real NASA orbital imagery.
//
// Usage:  npm install   (once, for the two image libraries)
//         node scripts/build_mars_map.mjs
//
// 1. Detail: MRO Context Camera (CTX) mosaics of Jezero from NASA Mars Trek.
//    - whole map: layer Jezero_CTX_BlockAdj_dd, about 19 m per pixel
//    - west half (the base and every survey site): the Mars 2020 controlled
//      mosaic JEZ_ctx_B_soc_008, about 9.5 m per pixel at the zoom used here
//    CTX is a black-and-white camera.
// 2. Colour: the Viking MDIM 2.1 colour mosaic (already downloaded by
//    fetch_mars_terrain.mjs). Each pixel keeps its real CTX brightness and is
//    tinted a natural Mars tone, nudged by the real Viking colour there.
//
// Output: data/mars/map/*.jpg (1024 px chunks + a small overview) and
//         data/mars/jezero_map.json. Downloaded tiles are cached in .cache/.

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
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
for (const f of readdirSync(OUT_DIR)) if (f.endsWith(".jpg")) unlinkSync(join(OUT_DIR, f));

const terrain = JSON.parse(readFileSync(join(MARS, "jezero_terrain.json"), "utf8"));
const { west, east, north, south } = terrain.bbox;
const CELLS = terrain.size;

const TILE = 256;
const CHUNK = 1024;
const QUALITY = 84;
// The Viking mosaic is colour-stretched (it looks purple here), so it only nudges the hue.
const MARS_TONE = [1.2, 0.94, 0.72]; // butterscotch, luminance ≈ 1
const VIKING_WEIGHT = 0.3;

const BASE = { layer: "Jezero_CTX_BlockAdj_dd", zoom: 12, pxPerCell: 24, box: { west, east, north, south } };
// Bounding box of the controlled mosaic, from its WMTS capabilities.
const DETAIL = {
  layer: "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0", zoom: 13, pxPerCell: 48,
  box: { west: 77.1604655, east: 77.6991776, north: 18.7211945, south: 18.2110274 },
};
const FEATHER_DEG = 0.02; // blend the two mosaics over about 1.2 km at the edge

// ---------- download + stitch one layer ----------
async function getTile(layer, z, row, col) {
  const file = join(CACHE, `${layer.slice(0, 12)}_z${z}_${row}_${col}.png`);
  if (existsSync(file)) return readFileSync(file);
  const url = `https://trek.nasa.gov/tiles/Mars/EQ/${layer}/1.0.0/default/default028mm/${z}/${row}/${col}.png`;
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

async function loadMosaic({ layer, zoom, box }) {
  const tileDeg = 180 / 2 ** zoom;
  const b = { west: Math.max(west, box.west), east: Math.min(east, box.east), north: Math.min(north, box.north), south: Math.max(south, box.south) };
  const colMin = Math.floor((b.west + 180) / tileDeg);
  const colMax = Math.floor((b.east + 180 - 1e-9) / tileDeg);
  const rowMin = Math.floor((90 - b.north) / tileDeg);
  const rowMax = Math.floor((90 - b.south - 1e-9) / tileDeg);
  const jobs = [];
  for (let row = rowMin; row <= rowMax; row++) for (let col = colMin; col <= colMax; col++) jobs.push({ row, col });
  const total = jobs.length;
  const MW = (colMax - colMin + 1) * TILE;
  const MH = (rowMax - rowMin + 1) * TILE;
  const gray = new Uint8Array(MW * MH);
  const mask = new Uint8Array(MW * MH); // 1 where the camera has data
  let done = 0, empty = 0;
  async function worker() {
    while (jobs.length) {
      const job = jobs.pop();
      const buf = await getTile(layer, zoom, job.row, job.col);
      if (buf.length) {
        const png = PNG.sync.read(buf);
        const ox = (job.col - colMin) * TILE, oy = (job.row - rowMin) * TILE;
        for (let y = 0; y < TILE; y++) {
          for (let x = 0; x < TILE; x++) {
            const i = (y * TILE + x) * 4;
            const o = (oy + y) * MW + ox + x;
            gray[o] = png.data[i];
            mask[o] = png.data[i + 3] > 127 ? 1 : 0;
          }
        }
      } else empty++;
      if (++done % 100 === 0) console.log(`  ${layer.slice(0, 22)}: ${done}/${total} tiles`);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`${layer}: ${total} tiles at zoom ${zoom}, ${MW}×${MH}px, ${empty} empty`);

  const mWest = -180 + colMin * tileDeg, mNorth = 90 - rowMin * tileDeg, pxPerDeg = TILE / tileDeg;
  // bilinear sample; -1 where there is no data
  const at = (lon, lat) => {
    const fx = (lon - mWest) * pxPerDeg - 0.5, fy = (mNorth - lat) * pxPerDeg - 0.5;
    if (fx < 0 || fy < 0 || fx > MW - 1.001 || fy > MH - 1.001) return -1;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const ax = fx - x0, ay = fy - y0;
    const i = y0 * MW + x0;
    if (!(mask[i] && mask[i + 1] && mask[i + MW] && mask[i + MW + 1])) return -1;
    return (gray[i] * (1 - ax) + gray[i + 1] * ax) * (1 - ay) + (gray[i + MW] * (1 - ax) + gray[i + MW + 1] * ax) * ay;
  };
  // brightness stretch (1st..99th percentile) measured inside `within`, so two
  // mosaics of the same ground end up equally bright
  const stretchIn = (within) => {
    const hist = new Uint32Array(256);
    let count = 0;
    for (let lat = within.north; lat > within.south; lat -= 0.0015) {
      for (let lon = within.west; lon < within.east; lon += 0.0015) {
        const v = at(lon, lat);
        if (v >= 0) { hist[Math.round(v)]++; count++; }
      }
    }
    const pct = (p) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= count * p) return v; } return 255; };
    return { lo: pct(0.01), hi: pct(0.99) };
  };
  return { at, stretchIn };
}

const baseM = await loadMosaic(BASE);
const detailM = await loadMosaic(DETAIL);
// Stretch the base over the whole map; stretch the detail so that it matches
// the base where they overlap.
const baseStretch = baseM.stretchIn(BASE.box);
const baseInDetail = baseM.stretchIn(DETAIL.box);
const detailStretch = detailM.stretchIn(DETAIL.box);
const norm = (v, s) => Math.min(1, Math.max(0, (v - s.lo) / (s.hi - s.lo)));
// detail value → the base's 0..1 scale
const detailToBase = (v) => {
  const t = norm(v, detailStretch); // position within the overlap's own range
  const asBase = baseInDetail.lo + t * (baseInDetail.hi - baseInDetail.lo);
  return norm(asBase, baseStretch);
};
console.log("stretch: base", baseStretch, "| base in detail area", baseInDetail, "| detail", detailStretch);

// ---------- Viking colour ----------
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

// ---------- one colour pixel ----------
// 0 outside the detail mosaic, 1 well inside it, a smooth ramp at its edge
function detailWeight(lon, lat) {
  const b = DETAIL.box;
  const d = Math.min(lon - b.west, b.east - lon, lat - b.south, b.north - lat);
  return Math.min(1, Math.max(0, d / FEATHER_DEG));
}

function pixel(lon, lat, useDetail, out, o) {
  const v = vikingAt(lon, lat);
  const lum = 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2] || 1;
  let t = -1; // brightness 0..1
  const b = baseM.at(lon, lat);
  if (b >= 0) t = norm(b, baseStretch);
  if (useDetail) {
    const w = detailWeight(lon, lat);
    if (w > 0) {
      const d = detailM.at(lon, lat);
      if (d >= 0) t = t < 0 ? detailToBase(d) : t * (1 - w) + detailToBase(d) * w;
    }
  }
  if (t < 0) { // no CTX here: fall back to the Viking picture
    for (let c = 0; c < 3; c++) out[o + c] = Math.min(255, v[c] * 1.3);
    return;
  }
  const g = 38 + t * 200;
  for (let c = 0; c < 3; c++) {
    const tint = MARS_TONE[c] * (1 - VIKING_WEIGHT) + (v[c] / lum) * VIKING_WEIGHT;
    out[o + c] = Math.min(255, tint * g);
  }
}

// Render a rectangle of the map at `pxPerCell`, as an RGBA buffer for the JPEG encoder.
function render(pxPerCell, x0, y0, w, h, useDetail) {
  const full = CELLS * pxPerCell;
  const data = Buffer.alloc(w * h * 4, 255);
  for (let y = 0; y < h; y++) {
    const lat = north - ((y0 + y + 0.5) / full) * (north - south);
    for (let x = 0; x < w; x++) {
      const lon = west + ((x0 + x + 0.5) / full) * (east - west);
      pixel(lon, lat, useDetail, data, (y * w + x) * 4);
    }
  }
  return data;
}

// ---------- write chunks ----------
let bytes = 0;
const save = (file, data, w, h) => {
  const buf = jpeg.encode({ data, width: w, height: h }, QUALITY).data;
  writeFileSync(join(MARS, file), buf);
  bytes += buf.length;
};

const chunks = [];
for (let r = 0; r < (CELLS * BASE.pxPerCell) / CHUNK; r++) {
  for (let c = 0; c < (CELLS * BASE.pxPerCell) / CHUNK; c++) {
    const file = `map/jezero_${r}_${c}.jpg`;
    save(file, render(BASE.pxPerCell, c * CHUNK, r * CHUNK, CHUNK, CHUNK, true), CHUNK, CHUNK);
    chunks.push({ file, row: r, col: c });
  }
}
console.log(`base: ${chunks.length} chunks`);

// Detail chunks: only the chunk squares that touch the detail mosaic.
const dFull = CELLS * DETAIL.pxPerCell;
const cellsPerDetailChunk = CHUNK / DETAIL.pxPerCell;
const cellOf = (lon, lat) => ({ x: ((lon - west) / (east - west)) * CELLS, z: ((north - lat) / (north - south)) * CELLS });
const tl = cellOf(DETAIL.box.west, DETAIL.box.north), br = cellOf(DETAIL.box.east, DETAIL.box.south);
const detailChunks = [];
for (let r = Math.floor(Math.max(0, tl.z) / cellsPerDetailChunk); r * cellsPerDetailChunk < Math.min(CELLS, br.z); r++) {
  for (let c = Math.floor(Math.max(0, tl.x) / cellsPerDetailChunk); c * cellsPerDetailChunk < Math.min(CELLS, br.x); c++) {
    // skip squares that the detail mosaic barely touches
    const ox = Math.min(br.x, (c + 1) * cellsPerDetailChunk) - Math.max(tl.x, c * cellsPerDetailChunk);
    const oz = Math.min(br.z, (r + 1) * cellsPerDetailChunk) - Math.max(tl.z, r * cellsPerDetailChunk);
    if ((ox * oz) / cellsPerDetailChunk ** 2 < 0.15) continue;
    const w = Math.min(CHUNK, dFull - c * CHUNK), h = Math.min(CHUNK, dFull - r * CHUNK);
    const file = `map/jezero_hd_${r}_${c}.jpg`;
    save(file, render(DETAIL.pxPerCell, c * CHUNK, r * CHUNK, w, h, true), w, h);
    detailChunks.push({ file, row: r, col: c });
  }
}
console.log(`detail: ${detailChunks.length} chunks`);

// small overview for the minimap (box-filtered from a 1024 px render)
const OV = 256, K = 4;
const big = render((OV * K) / CELLS, 0, 0, OV * K, OV * K, false);
const ov = Buffer.alloc(OV * OV * 4, 255);
for (let y = 0; y < OV; y++) for (let x = 0; x < OV; x++) for (let c = 0; c < 3; c++) {
  let sum = 0;
  for (let yy = 0; yy < K; yy++) for (let xx = 0; xx < K; xx++) sum += big[((y * K + yy) * OV * K + x * K + xx) * 4 + c];
  ov[(y * OV + x) * 4 + c] = sum / (K * K);
}
save("map/overview.jpg", ov, OV, OV);

const mPerCell = terrain.metersPerCell;
writeFileSync(join(MARS, "jezero_map.json"), JSON.stringify({
  name: "Jezero crater, Mars",
  bbox: terrain.bbox,
  cells: CELLS,
  chunk: CHUNK,
  overview: "map/overview.jpg",
  layers: [
    { name: "base", pxPerCell: BASE.pxPerCell, metersPerPixel: Math.round(mPerCell / BASE.pxPerCell), chunks },
    { name: "detail", pxPerCell: DETAIL.pxPerCell, metersPerPixel: Math.round((mPerCell / DETAIL.pxPerCell) * 10) / 10, chunks: detailChunks },
  ],
  sources: [
    { name: "MRO Context Camera (CTX) mosaic of Jezero, via NASA Mars Trek", url: "https://trek.nasa.gov/mars/", layer: BASE.layer, zoom: BASE.zoom },
    { name: "Mars 2020 controlled CTX mosaic of Jezero, via NASA Mars Trek", url: "https://trek.nasa.gov/mars/", layer: DETAIL.layer, zoom: DETAIL.zoom },
    terrain.imagerySource,
  ],
  note: "CTX is a black-and-white camera. Each pixel keeps its real CTX brightness and is tinted a natural Mars tone, nudged by the Viking colour mosaic.",
  builtAt: new Date().toISOString(),
}, null, 2));
console.log(`Saved ${chunks.length + detailChunks.length} chunks + overview, ${(bytes / 1e6).toFixed(1)} MB total`);
