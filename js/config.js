// Every tunable number in one place. All values are abstract "game units" on a
// 0–100 scale so kids can read them. Comments say which real-world fact each
// number is loosely anchored to. Balance with scripts/balance.html (open it
// from the local server) or node scripts/simulate.mjs.

export const CONFIG = {
  totalSols: 15,
  actionPoints: 3,

  // Supplies are tight on purpose: a quiet sunny day leaves only a little power
  // to spare, so every trip outside has to be paid for.
  start: { battery: 75, oxygen: 75, dose: 0, food: 8, panel: 100 },
  max: { battery: 100, oxygen: 100, dose: 100 },

  // Weather → solar power (with perfectly clean panels).
  // Anchor: sunlight at Mars is roughly 43% of sunlight at Earth.
  // `dust` is how much dust settles on the panels that day (percent).
  // Haze roughly halves the power, and a dust storm buries the panels.
  weather: {
    sunny: { solar: 62, dust: 2 },
    hazy: { solar: 36, dust: 5 },
    dust: { solar: 14, dust: 10 },
  },
  weatherGen: {
    calmSols: 2, // first sols are always clear so kids can learn the controls
    hazyChanceEarly: 0.25,
    hazyChanceSeason: 0.4,
    seasonStartSol: 9, // dust-storm season
    // Exactly one dust storm per mission. It always comes in the last stage
    // ("storm season and return") and is over by launch day at the latest.
    dustStormStart: [11, 12],
    dustStormLength: [2, 3],
  },

  // Nightly power costs.
  power: { lifeSupport: 25, greenhouse: 15, shield: 20 },
  // O₂ Maker: 5 power → 4 oxygen. Anchor: Perseverance's MOXIE makes oxygen from CO₂.
  oxygenGen: { step: 5, o2PerStep: 4, maxPower: 30 },
  oxygenUse: { crewDaily: 10 }, // two astronauts
  // The greenhouse only gives food on a day the crew tended it: plants need looking after.
  greenhouse: { o2: 2, food: 0, tendFood: 2, tendScience: 1 },
  food: { dailyUse: 1 },

  // Radiation dose accumulates; 100 = mission limit.
  // Anchor: Curiosity's RAD measures about 0.64 mSv/day on the surface.
  dose: { daily: 1 },

  // Two real solar storms per mission. Each one is a real DONKI event: "moderate"
  // for small/medium CMEs, "strong" for big ones. The base cannot see them
  // coming: only Earth's Sun-watching spacecraft can (see `call`).
  // On the day a storm hits, its particles also block the radio: no calls to
  // Earth that day (a "radio blackout"), so the call has to be made before.
  solarStorm: {
    windows: [[3, 7], [9, 14]],
    strengths: {
      moderate: { evaDose: 20, unshielded: 8, shielded: 2 },
      strong: { evaDose: 30, unshielded: 14, shielded: 2 },
    },
  },

  // EVA to a site on the map: farther = more science, more risk.
  // Tier 4 is an expedition: it takes the whole day.
  evaTiers: {
    1: { ap: 1, power: 10, oxygen: 3, dose: 2, science: 4 },
    2: { ap: 1, power: 15, oxygen: 4, dose: 3, science: 8 },
    3: { ap: 2, power: 20, oxygen: 6, dose: 4, science: 14 },
    4: { ap: 3, power: 25, oxygen: 8, dose: 5, science: 22 },
  },
  revisitFactor: 0.5, // going back to the same site halves the science (min 1)

  clean: { ap: 1 },
  tend: { ap: 1 },

  // Calling Earth: the crew's only way to see trouble coming. It costs an
  // action point, and the report arrives the next morning. A report covers:
  //   weather from orbit for the `weatherDays` sols after it arrives (MRO),
  //   the Sun for the arrival sol and the `sunDays` sols after it (SOHO, STEREO),
  //   and a check of the base's own data for parts that are wearing out.
  // Sometimes it also carries a request: something Earth spotted from orbit.
  // Anchor: radio between Mars and Earth takes about 3–22 minutes one way.
  call: { ap: 1, science: 1, weatherDays: 3, sunDays: 2, lightMinutes: [4, 22] },
  request: { chance: 0.6, days: 3, bonus: 5 },

  // What the crew can notice without Earth. These hints are not reliable: the
  // real sign shows up only some of the time, and there are false alarms.
  signs: {
    staticChance: 0.7, // radio static the day before a solar storm
    staticFalse: 0.1,
    oddChance: 0.65, // an odd reading the morning after a part starts to wear out
    oddFalse: 0.07,
  },

  // Two parts wear out during a mission. Earth can spot one from the base's
  // data as soon as it starts; `fuse` sols later it breaks. Fixing it in time
  // costs `repairAp`; fixing it after it broke costs `brokenAp`.
  faults: {
    windows: [[4, 7], [9, 12]],
    fuse: 3,
    repairAp: 1,
    brokenAp: 2,
    kinds: ["panels", "greenhouse", "antenna", "o2"],
    brokenSolar: 0.6, // broken junction box: the panels deliver 60%
    brokenO2: 0.5, // clogged filter: the O₂ Maker makes half
    // what is lost the morning a part breaks: a short circuit drains the battery,
    // a leak empties some of the tank, a dead pump kills part of the crop
    breakLoss: { panels: { battery: 20 }, o2: { oxygen: 15 }, greenhouse: { food: 2 }, antenna: {} },
  },

  // Dust devils sometimes clean the panels overnight (Spirit and Opportunity!).
  dustDevil: { chance: 0.15, minDirt: 15 },

  // Other things that can happen at night (at most one per night, never during
  // a dust storm): a windy night dusts the panels, a cold snap makes the
  // heaters work harder, a marsquake shakes something loose (a hidden worn
  // part, as in `faults`), or the crew films a meteor.
  nightEvents: {
    chance: 0.35,
    weights: { wind: 4, cold: 3, quake: 2, meteor: 2 },
    wind: 12, // panel cleanliness lost (half with the dust-shedding coating)
    cold: 8, // extra power the heaters use
    meteor: 2, // research from the video
  },

  dirtyPanelCardAt: 70, // panels this dirty or worse → InSight story card
  radiationCardAt: 30,
  radiationCardAt2: 50,

  // Science thresholds for ⭐ (first star = surviving all sols).
  stars: [0, 80, 120],

  // Daily orders from Mission Control (see genTasks in game.js): bonus research
  // for finishing them. Checking the solar panels is a free daily routine.
  // With less than `lowPower` in the battery, Mission Control asks for a rest day instead of a trip.
  tasks: { sample: 1, anySample: 1, shelter: 1, tend: 1, repair: 1, build: 1, lowPower: 45 },

  // The mission has three stages, each with goals worth bonus research. What
  // the crew can reach is set by its equipment (see `tech` and sites.js), not
  // by the stage.
  stages: [
    { id: 1, from: 1, to: 3, goals: ["tubes2", "report1", "build1"] },
    { id: 2, from: 4, to: 10, goals: ["build3", "far1", "expedition1", "tubes6"] },
    { id: 3, from: 11, to: 15, goals: ["stormReady", "tubes8", "launch"] },
  ],
  goals: { reward: 3, stormBattery: 70 },

  // The technology line. Research unlocks a blueprint (`at`); then the crew
  // builds it from spare parts in the habitat workshop, which costs action
  // points and power. Tools open new kinds of terrain (sites.js `needs`);
  // upgrades improve the base. Research never goes down, so a blueprint stays
  // available, and a built item stays built.
  tech: [
    { id: "drill", at: 8, ap: 1, power: 5 }, // hard-rock drill bit: lava rock
    { id: "dustShield", at: 18, ap: 1, power: 5 }, // dust settles on the panels half as fast
    { id: "rope", at: 26, ap: 1, power: 5 }, // rope and winch: cliffs and crater walls
    { id: "heli", at: 34, ap: 2, power: 10 }, // scout helicopter: a safe route up the delta front
    { id: "moxie2", at: 40, ap: 1, power: 5 }, // O₂ Maker: 5 power → 5 oxygen
    { id: "rover", at: 50, ap: 2, power: 10 }, // pressurised rover: whole-day expeditions
    { id: "shelter", at: 60, ap: 1, power: 5 }, // shield room costs 10 power a night
    { id: "fission", at: 80, ap: 1, power: 5 }, // +10 power every sunset, whatever the weather
  ],
  techEffects: { o2PerStep: 5, shieldPower: 10, fissionPower: 10 },

  // Research rewards: at each of these research totals the crew gets one more
  // action point every day from then on, for free (no building). Applies from
  // the next morning. Picked with scripts/balance.html (?apb=… to try others).
  // 30 comes mid-game for most players, when the far trips (helicopter, rover)
  // start to need more points; 70 comes in storm season for good researchers.
  // In the bot runs this mainly turns more good missions into ⭐⭐⭐ (planner:
  // 2% → 10%), while players who spend every point on trips run lower on
  // power and air, so the extra point is a choice, not a free win.
  apBonus: [30, 70],
};
