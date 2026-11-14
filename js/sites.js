// Places on the map around the base. Text lives in i18n.js under
// site.<id>.name and site.<id>.desc. `fact` is a knowledge card unlocked the
// first time the crew visits. Base sits at (180, 135) on a 360×270 map.

export const BASE = { x: 180, y: 135 };
export const RINGS = [67, 115, 166]; // tier 1 / 2 / 3 distance rings

export const SITES = [
  { id: "dune", tier: 1, x: 120, y: 105, icon: "🏜️", fact: "thinAir" },
  { id: "crater", tier: 1, x: 238, y: 168, icon: "🕳️", fact: "marsquake" },
  { id: "cliff", tier: 2, x: 275, y: 72, icon: "🧱", fact: "layers" },
  { id: "riverbed", tier: 2, x: 85, y: 200, icon: "🪨", fact: "gale" },
  { id: "canyon", tier: 3, x: 40, y: 45, icon: "⛰️", fact: "eva" },
  { id: "delta", tier: 3, x: 300, y: 224, icon: "🏞️", fact: "jezero" },
];

export const siteById = (id) => SITES.find((s) => s.id === id);
