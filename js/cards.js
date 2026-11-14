// Action cards. Every card has a gain AND a cost: there is no free choice.
// eligible(state) decides whether it can be drawn; apply(state, report) mutates.
// Card text lives in i18n.js under card.<id>.name / hint / gain / cost.

export const CARDS = {
  eva: {
    icon: "🚶",
    fact: "eva",
    eligible: () => true,
    apply(s, r) {
      s.science += 3;
      s.dose += 1;
      s.o2 -= 1;
      r.line("🚶", "line.eva", "+3 🔬  +1 ☢️  −1 🫁");
    },
  },
  drill: {
    icon: "🪨",
    fact: "sol",
    batteryCost: 1,
    eligible: () => true,
    apply(s, r) {
      s.science += 2;
      s.battery -= 1;
      r.line("🪨", "line.drill", "+2 🔬  −1 🔋");
    },
  },
  berm: {
    icon: "🧱",
    fact: "regolith",
    batteryCost: 2,
    eligible: (s) => s.berm < s.cfg.bermMax,
    apply(s, r) {
      s.berm += 1;
      s.battery -= 2;
      r.line("🧱", "line.berm", "−2 🔋", "", { level: s.berm });
    },
  },
  clean: {
    icon: "🧹",
    fact: "dustStorm",
    eligible: (s) => !s.panelsClean,
    apply(s, r) {
      s.panelsClean = true;
      s.o2 -= 1;
      r.line("🧹", "line.clean", "−1 🫁");
    },
  },
  callEarth: {
    icon: "📡",
    fact: "commDelay",
    eligible: (s) => s.science >= 1 && !s.earthCall && s.sol < s.cfg.maxSol - 1,
    apply(s, r) {
      s.science -= 1;
      s.earthCall = { arrives: s.sol + 1 };
      r.line("📡", "line.callEarth", "−1 🔬");
    },
  },
  rest: {
    icon: "😴",
    fact: "radiationAddsUp",
    eligible: () => true,
    apply(s, r) {
      s.resting = true;
      r.line("😴", "line.rest", "");
    },
  },
  repair: {
    icon: "🔧",
    fact: "moxie",
    batteryCost: 1,
    eligible: (s) => s.o2Broken,
    apply(s, r) {
      s.o2Broken = false;
      s.battery -= 1;
      r.line("🔧", "line.repair", "−1 🔋");
    },
  },
};
