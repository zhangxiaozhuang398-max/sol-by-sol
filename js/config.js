// Every tunable number in one place. All values are abstract "game units" on a
// 0–100 scale so kids can read them. Comments say which real-world fact each
// number is loosely anchored to. Balance with: node scripts/simulate.mjs

export const CONFIG = {
  totalSols: 15,
  actionPoints: 3,

  start: { battery: 80, oxygen: 70, dose: 0, food: 12, panel: 100 },
  max: { battery: 100, oxygen: 100, dose: 100 },

  // Weather → solar power (with perfectly clean panels).
  // Anchor: sunlight at Mars is roughly 43% of sunlight at Earth.
  // `dust` is how much dust settles on the panels that day (percent).
  weather: {
    sunny: { solar: 80, dust: 1 },
    hazy: { solar: 45, dust: 3 },
    dust: { solar: 10, dust: 6 },
  },
  weatherGen: {
    calmSols: 2, // first sols are always clear so kids can learn the controls
    hazyChanceEarly: 0.25,
    hazyChanceSeason: 0.4,
    seasonStartSol: 8, // dust-storm season
    dustStormStart: [8, 12], // exactly one storm per mission, starting in this range
    dustStormLength: [2, 4],
  },

  // Nightly power costs.
  power: { lifeSupport: 25, greenhouse: 15, shield: 20 },
  // O₂ Maker: 5 power → 4 oxygen. Anchor: Perseverance's MOXIE makes oxygen from CO₂.
  oxygenGen: { step: 5, o2PerStep: 4, maxPower: 30 },
  oxygenUse: { crewDaily: 10 }, // two astronauts
  greenhouse: { o2: 2, food: 1, tendFood: 1, tendScience: 1 },
  food: { dailyUse: 1 },

  // Radiation dose accumulates; 100 = mission limit.
  // Anchor: Curiosity's RAD measures about 0.64 mSv/day on the surface.
  dose: { daily: 1 },

  // Two real solar storms per mission. Each one is a real DONKI event: "moderate"
  // for small/medium CMEs, "strong" for big ones.
  solarStorm: {
    windows: [[3, 7], [9, 14]],
    warnLead: [1, 2],
    strengths: {
      moderate: { evaDose: 12, unshielded: 6, shielded: 2 },
      strong: { evaDose: 18, unshielded: 10, shielded: 2 },
    },
  },

  // EVA to a site on the map: farther = more science, more risk.
  evaTiers: {
    1: { ap: 1, power: 10, oxygen: 3, dose: 2, science: 4 },
    2: { ap: 1, power: 15, oxygen: 4, dose: 3, science: 8 },
    3: { ap: 2, power: 20, oxygen: 6, dose: 4, science: 14 },
  },
  revisitFactor: 0.5, // going back to the same site halves the science (min 1)

  clean: { ap: 1 },
  tend: { ap: 1 },
  // Anchor: radio between Mars and Earth takes about 3–22 minutes one way.
  call: { ap: 1, science: 2, forecastDays: 3, lightMinutes: [4, 22] },

  // Dust devils sometimes clean the panels overnight (Spirit and Opportunity!).
  dustDevil: { chance: 0.15, minDirt: 15 },

  dirtyPanelCardAt: 70, // panels this dirty or worse → InSight story card
  radiationCardAt: 30,
  radiationCardAt2: 50,

  // Science thresholds for ⭐ (first star = surviving all sols).
  stars: [0, 60, 100],

  // Daily orders from Mission Control (see genTasks in game.js): bonus research
  // for finishing them. Checking the solar panels is a free daily routine.
  tasks: { sample: 2, anySample: 1, shelter: 1, tend: 1, call: 1 },

  // The technology line: research (science) unlocks real NASA technologies.
  // Science never goes down, so a technology stays on once unlocked.
  // The 60 and 100 steps are also the ⭐⭐ and ⭐⭐⭐ marks.
  tech: [
    { id: "dustShield", at: 20 }, // dust settles on the panels half as fast
    { id: "moxie2", at: 40 }, // O₂ Maker: 5 power → 5 oxygen
    { id: "shelter", at: 60 }, // shield room costs 10 power a night
    { id: "fission", at: 80 }, // +10 power every sunset, whatever the weather
    { id: "sampleReturn", at: 100 }, // the goal: samples ready to fly home
  ],
  techEffects: { o2PerStep: 5, shieldPower: 10, fissionPower: 10 },
};
