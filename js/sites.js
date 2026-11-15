// Places the crew can explore. Text lives in i18n.js under site.<id>.name and
// site.<id>.desc. `fact` is a knowledge card unlocked the first time the crew
// visits.
//
// wx / wz are positions on the real Jezero crater terrain grid (column, row of
// the 128 × 128 MOLA cells, about 463 m each). x / y are for the simple 2D map
// (360 × 270) used as a fallback.
//
// `tier` is how far a site is (1 near … 4 a whole day's drive), which sets the
// action points, power and oxygen a trip costs. `needs` is the equipment the
// terrain calls for (built from the technology line, config.tech): hard lava
// rock needs a stronger drill bit, cliffs and crater walls need a rope and
// winch, the steep delta front needs a helicopter to scout a safe route, and
// the far east side is too far to walk in a spacesuit, so it needs a
// pressurised rover. `zone` is the region of the crater it lies in (ZONES).
//
// The west side follows the ancient river system visible in the elevation
// data (Neretva Vallis → delta → crater floor). The northern fan, the outlet
// valley and the deep crater in the east are placed on those features in the
// CTX picture.

export const BASE = { x: 180, y: 135 };
export const RINGS = [67, 115, 166]; // tier 1 / 2 / 3 distance rings on the 2D map

export const SITES = [
  { id: "dune", tier: 1, zone: "plain", needs: [], x: 120, y: 105, wx: 50.5, wz: 67.5, icon: "🏜️", fact: "thinAir" },
  { id: "crater", tier: 1, zone: "plain", needs: [], x: 238, y: 168, wx: 64.5, wz: 54.5, icon: "🕳️", fact: "marsquake" },
  { id: "meteorite", tier: 1, zone: "plain", needs: [], x: 196, y: 72, wx: 62.6, wz: 69.4, icon: "☄️", fact: "meteorite" },
  { id: "lava", tier: 2, zone: "floor", needs: ["drill"], x: 92, y: 132, wx: 45.2, wz: 59.6, icon: "🌋", fact: "igneous" },
  { id: "riverbed", tier: 2, zone: "floor", needs: [], x: 85, y: 200, wx: 41.5, wz: 49.5, icon: "🪨", fact: "gale" },
  { id: "cliff", tier: 2, zone: "delta", needs: ["rope"], x: 275, y: 72, wx: 34.5, wz: 53.5, icon: "🧱", fact: "layers" },
  { id: "delta", tier: 3, zone: "delta", needs: ["heli"], x: 300, y: 224, wx: 24.5, wz: 45.5, icon: "🏞️", fact: "jezero" },
  { id: "canyon", tier: 3, zone: "rim", needs: ["rope"], x: 40, y: 45, wx: 15.5, wz: 49.5, icon: "⛰️", fact: "eva" },
  { id: "northfan", tier: 3, zone: "north", needs: ["heli"], x: 166, y: 12, wx: 50.8, wz: 36.4, icon: "🪭", fact: "openLake" },
  { id: "outlet", tier: 4, zone: "east", needs: ["rover"], x: 346, y: 58, wx: 109.6, wz: 51.2, icon: "🚿", fact: "openLake" },
  { id: "eastcrater", tier: 4, zone: "east", needs: ["rover", "rope"], x: 342, y: 196, wx: 101.6, wz: 70.0, icon: "🌑", fact: "craterAges" },
];

// The crater's regions, as ellipses on the terrain grid (centre x/z, radii).
// Names in i18n.js under zone.<id>.
export const ZONES = [
  { id: "plain", x: 58, z: 64, rx: 9, rz: 8 },
  { id: "floor", x: 43, z: 55, rx: 6.5, rz: 8 },
  { id: "delta", x: 29, z: 49, rx: 7.5, rz: 7 },
  { id: "rim", x: 13, z: 50, rx: 6, rz: 9 },
  { id: "north", x: 51, z: 36, rx: 10, rz: 6 },
  { id: "east", x: 105, z: 61, rx: 11, rz: 15 },
];
// Straight-line distance from the habitat, in km (one terrain cell ≈ 463 m).
export const siteKm = (s) => Math.round(Math.hypot(s.wx - 56.5, s.wz - 62.2) * 0.463);

// The base, on the flat crater floor, laid out west to east so it fits a wide
// screen: greenhouse, habitat, solar panels, antenna. Stations are where the
// crew does the daytime jobs; the habitat airlock (south side) ends the day.
export const WORLD_BASE = {
  spawn: { x: 56.5, z: 64.1, heading: Math.PI }, // just south of the airlock, facing the base
  stations: [
    { id: "habitat", kind: "habitat", x: 56.5, z: 62.2, r: 1.5, mx: 56.5, mz: 60.5, solid: 1.9, icon: "🏠" },
    { id: "panels", kind: "panels", x: 61.9, z: 61.0, r: 2.4, solid: 1.5, icon: "🔆" },
    { id: "greenhouse", kind: "greenhouse", x: 51.2, z: 61.0, r: 2.3, solid: 1.4, icon: "🌱" },
    { id: "antenna", kind: "antenna", x: 66.0, z: 60.8, r: 2.1, solid: 0.9, icon: "📡" },
  ],
  // Where NASA's Perseverance rover really landed (18.4447°N, 77.4508°E), February 2021.
  landmark: { id: "perseverance", kind: "landmark", x: 37.7, z: 56.1, r: 2.4, solid: 0.9, icon: "🤖", fact: "jezero" },
};
// Which station a worn-out part is fixed at.
export const PART_STATION = { panels: "panels", greenhouse: "greenhouse", antenna: "antenna", o2: "habitat" };

export const siteById = (id) => SITES.find((s) => s.id === id);
