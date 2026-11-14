// Download the real terrain of Jezero crater (where NASA's Perseverance rover
// landed) and save it for the game's walkable 3D world.
//
// Usage:  node scripts/fetch_mars_terrain.mjs      (no API key needed)
//
// 1. Elevation: MGS MOLA Mission Experiment Gridded Data Record (MEGDR),
//    128 pixels/degree (about 463 m per cell), 16-bit metres, from NASA's
//    Planetary Data System. Only the rows covering Jezero are requested.
// 2. Colour: Viking MDIM 2.1 colour mosaic tiles from NASA Mars Trek (WMTS).
//
// Output: data/mars/jezero_terrain.json and data/mars/tiles/*.jpg

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "mars");
mkdirSync(join(ROOT, "tiles"), { recursive: true });

// ---------- 1. MOLA elevation ----------
const MEGDR = {
  url: "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/megt44n000hb.img",
  label: "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/megt44n000hb.lbl",
  ppd: 128, // pixels per degree
  topLat: 44, // file covers 44°N..0°, 0°E..90°E
  westLon: 0,
  cols: 11520,
  bytesPerRow: 23040,
};

// A 1° × 1° window centred on Jezero crater (about 18.4°N, 77.6°E).
const SIZE = 128;
const row0 = 3215;
const col0 = 9876;
const bbox = {
  north: MEGDR.topLat - row0 / MEGDR.ppd,
  south: MEGDR.topLat - (row0 + SIZE) / MEGDR.ppd,
  west: MEGDR.westLon + col0 / MEGDR.ppd,
  east: MEGDR.westLon + (col0 + SIZE) / MEGDR.ppd,
};

const start = row0 * MEGDR.bytesPerRow;
const end = (row0 + SIZE) * MEGDR.bytesPerRow - 1;
console.log(`MOLA: requesting rows ${row0}..${row0 + SIZE - 1} (${((end - start + 1) / 1e6).toFixed(1)} MB)`);
const res = await fetch(MEGDR.url, { headers: { Range: `bytes=${start}-${end}`, "User-Agent": "sol-by-sol-hackathon" } });
if (res.status !== 206) throw new Error(`MOLA range request failed: HTTP ${res.status}`);
const view = new DataView(await res.arrayBuffer());

const heights = [];
let min = Infinity, max = -Infinity;
for (let r = 0; r < SIZE; r++) {
  for (let c = 0; c < SIZE; c++) {
    const h = view.getInt16(r * MEGDR.bytesPerRow + (col0 + c) * 2, false); // big-endian metres
    heights.push(h);
    if (h < min) min = h;
    if (h > max) max = h;
  }
}
console.log(`MOLA: ${SIZE}×${SIZE} cells, elevation ${min} m .. ${max} m`);

// ---------- 2. Viking colour tiles from Mars Trek ----------
const LAYER = "Mars_Viking_MDIM21_ClrMosaic_global_232m";
const Z = 7; // 256 × 128 tiles, 1.40625° per tile
const tileDeg = 180 / 2 ** Z;
const tileUrl = (row, col) => `https://trek.nasa.gov/tiles/Mars/EQ/${LAYER}/1.0.0/default/default028mm/${Z}/${row}/${col}.jpg`;
const colMin = Math.floor((bbox.west + 180) / tileDeg);
const colMax = Math.floor((bbox.east + 180 - 1e-9) / tileDeg);
const rowMin = Math.floor((90 - bbox.north) / tileDeg);
const rowMax = Math.floor((90 - bbox.south - 1e-9) / tileDeg);

const tiles = [];
for (let row = rowMin; row <= rowMax; row++) {
  for (let col = colMin; col <= colMax; col++) {
    const r = await fetch(tileUrl(row, col), { headers: { "User-Agent": "sol-by-sol-hackathon" } });
    if (!r.ok) throw new Error(`Trek tile ${row}/${col}: HTTP ${r.status}`);
    const file = `tiles/viking_z${Z}_${row}_${col}.jpg`;
    writeFileSync(join(ROOT, file), Buffer.from(await r.arrayBuffer()));
    tiles.push({
      file,
      west: -180 + col * tileDeg,
      east: -180 + (col + 1) * tileDeg,
      north: 90 - row * tileDeg,
      south: 90 - (row + 1) * tileDeg,
    });
    console.log(`Trek: saved ${file}`);
  }
}

// ---------- write ----------
const out = {
  name: "Jezero crater, Mars",
  note: "Real elevation and colour. Heights are metres relative to the Mars areoid. The game exaggerates the vertical scale so the crater shape is easy to see.",
  size: SIZE,
  bbox,
  metersPerCell: Math.round((2 * Math.PI * 3396190) / 360 / MEGDR.ppd),
  minElevation: min,
  maxElevation: max,
  elevationSource: {
    name: "MGS MOLA MEGDR 128 pixel/degree topography (NASA Planetary Data System)",
    url: MEGDR.label,
  },
  imagerySource: {
    name: "Viking MDIM 2.1 colour mosaic, 232 m (NASA Mars Trek)",
    url: "https://trek.nasa.gov/mars/",
    layer: LAYER,
  },
  fetchedAt: new Date().toISOString(),
  tiles,
  heights,
};
writeFileSync(join(ROOT, "jezero_terrain.json"), JSON.stringify(out));
console.log(`Saved ${join(ROOT, "jezero_terrain.json")}`);
