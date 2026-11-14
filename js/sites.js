// Places the crew can explore. Text lives in i18n.js under site.<id>.name and
// site.<id>.desc. `fact` is a knowledge card unlocked the first time the crew
// visits.
//
// wx / wz are positions on the real Jezero crater terrain grid (column, row of
// the 128 × 128 MOLA cells, about 463 m each). They follow the ancient river
// system on the crater's west side, which is visible in the elevation data:
// the Neretva Vallis notch in the rim → the delta fan → the delta front → the
// crater floor. x / y are for the simple 2D map (360 × 270) used as a fallback.

export const BASE = { x: 180, y: 135 };
export const RINGS = [67, 115, 166]; // tier 1 / 2 / 3 distance rings on the 2D map

export const SITES = [
  { id: "dune", tier: 1, x: 120, y: 105, wx: 50.5, wz: 67.5, icon: "🏜️", fact: "thinAir" },
  { id: "crater", tier: 1, x: 238, y: 168, wx: 61.4, wz: 56.8, icon: "🕳️", fact: "marsquake" }, // a real crater about 290 m wide
  { id: "cliff", tier: 2, x: 275, y: 72, wx: 34.5, wz: 53.5, icon: "🧱", fact: "layers" },
  { id: "riverbed", tier: 2, x: 85, y: 200, wx: 41.5, wz: 49.5, icon: "🪨", fact: "gale" },
  { id: "canyon", tier: 3, x: 40, y: 45, wx: 15.5, wz: 49.5, icon: "⛰️", fact: "eva" },
  { id: "delta", tier: 3, x: 300, y: 224, wx: 24.5, wz: 45.5, icon: "🏞️", fact: "jezero" },
];

// The base, on the flat crater floor, laid out west to east so it fits a wide
// screen: greenhouse, habitat, solar panels, antenna. Stations are where the
// crew does the daytime jobs; the habitat airlock (south side) ends the day.
export const WORLD_BASE = {
  spawn: { x: 56.5, z: 64.1, heading: Math.PI }, // just south of the airlock, facing the base
  stations: [
    { id: "habitat", kind: "habitat", x: 56.5, z: 62.2, r: 1.5, mx: 56.5, mz: 60.5, solid: 1.9, icon: "🏠" },
    { id: "panels", kind: "panels", x: 61.9, z: 61.0, r: 2.4, solid: 1.2, icon: "🔆" },
    { id: "greenhouse", kind: "greenhouse", x: 51.2, z: 61.0, r: 2.3, solid: 1.2, icon: "🌱" },
    { id: "antenna", kind: "antenna", x: 66.0, z: 60.8, r: 2.1, solid: 0.9, icon: "📡" },
  ],
  // Where NASA's Perseverance rover really landed (18.4447°N, 77.4508°E), February 2021.
  landmark: { id: "perseverance", kind: "landmark", x: 37.7, z: 56.1, r: 2.4, solid: 0.9, icon: "🤖", fact: "jezero" },
};

export const siteById = (id) => SITES.find((s) => s.id === id);
