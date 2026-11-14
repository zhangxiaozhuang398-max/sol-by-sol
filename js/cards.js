// Action cards. Every card has a gain AND a cost: there is no free choice.
// eligible(state) decides whether it can be drawn; apply(state, report) mutates.

export const CARDS = {
  eva: {
    icon: "🚶",
    name: "Crater EVA",
    gain: "+3 🔬",
    cost: "+1 ☢️  −1 🫁",
    hint: "Go outside to study a crater.",
    fact: "eva",
    eligible: () => true,
    apply(s, r) {
      s.science += 3;
      s.dose += 1;
      s.o2 -= 1;
      r.line("🚶", "Crater EVA: found great samples", "+3 🔬  +1 ☢️  −1 🫁");
    },
  },
  drill: {
    icon: "🪨",
    name: "Drill a Sample",
    gain: "+2 🔬",
    cost: "−1 🔋",
    hint: "Run the drill from inside the base.",
    fact: "sol",
    batteryCost: 1,
    eligible: () => true,
    apply(s, r) {
      s.science += 2;
      s.battery -= 1;
      r.line("🪨", "Drilled a rock sample", "+2 🔬  −1 🔋");
    },
  },
  berm: {
    icon: "🧱",
    name: "Regolith Wall",
    gain: "Every storm −1 ☢️ (forever)",
    cost: "−2 🔋",
    hint: "Pile Mars soil on the habitat.",
    fact: "regolith",
    batteryCost: 2,
    eligible: (s) => s.berm < s.cfg.bermMax,
    apply(s, r) {
      s.berm += 1;
      s.battery -= 2;
      r.line("🧱", `Built a regolith wall (level ${s.berm})`, "−2 🔋");
    },
  },
  clean: {
    icon: "🧹",
    name: "Clean Panels",
    gain: "+1 ⚡ on clear sols",
    cost: "−1 🫁",
    hint: "Brush dust off the solar panels.",
    fact: "dustStorm",
    eligible: (s) => !s.panelsClean,
    apply(s, r) {
      s.panelsClean = true;
      s.o2 -= 1;
      r.line("🧹", "Cleaned the solar panels", "−1 🫁");
    },
  },
  callEarth: {
    icon: "📡",
    name: "Call Earth",
    gain: "Exact forecast next sol",
    cost: "−1 🔬",
    hint: "Ask Mission Control. The answer takes time!",
    fact: "commDelay",
    eligible: (s) => s.science >= 1 && !s.earthCall && s.sol < s.cfg.maxSol - 1,
    apply(s, r) {
      s.science -= 1;
      s.earthCall = { arrives: s.sol + 1 };
      r.line("📡", "Message sent to Earth. Reply arrives next sol.", "−1 🔬");
    },
  },
  rest: {
    icon: "😴",
    name: "Rest Day",
    gain: "Tonight −1 🫁 used",
    cost: "Skip today's action",
    hint: "Resting crews breathe less.",
    fact: "radiationAddsUp",
    eligible: () => true,
    apply(s, r) {
      s.resting = true;
      r.line("😴", "Crew rested and breathed slowly", "");
    },
  },
  repair: {
    icon: "🔧",
    name: "Repair O₂ Maker",
    gain: "O₂ Maker fixed",
    cost: "−1 🔋",
    hint: "A part broke. Fix it!",
    fact: "moxie",
    batteryCost: 1,
    eligible: (s) => s.o2Broken,
    apply(s, r) {
      s.o2Broken = false;
      s.battery -= 1;
      r.line("🔧", "Repaired the O₂ Maker", "−1 🔋");
    },
  },
};
