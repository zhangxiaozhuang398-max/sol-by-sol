// Kid-friendly layer: Pip the robot guide's one-line tips, one-sentence versions
// of the knowledge cards (the full text stays in facts.js behind "Learn more"),
// the rocks found when sampling, and the "Suggest a plan" helper for the night.
//
// Everything here only reads the game state; it never changes the rules.

import * as E from "./game.js";
import { CONFIG as C } from "./config.js";

// One short sentence per knowledge card (≈15 English words / 25 Chinese characters).
export const SHORT = {
  cme: { en: "The Sun can blast out a giant cloud of particles, faster than 1,000 km a second!", zh: "太阳会喷出一大团粒子，每秒能飞 1000 多公里！" },
  mars2017: { en: "A 2017 solar storm was so strong that rovers felt it on Mars.", zh: "2017 年的一场太阳风暴，强到在火星上都测到了！" },
  solar2024: { en: "In May 2024, Curiosity measured its biggest radiation jump ever on Mars.", zh: "2024 年 5 月，好奇号测到最大一次辐射猛增。" },
  radiationAddsUp: { en: "Radiation keeps adding up. Resting does not make it go away.", zh: "辐射会越积越多，休息也不会让它消失。" },
  marsRadiation: { en: "A day on Mars gives about 100 times more radiation than a day on Earth.", zh: "在火星待一天，受到的辐射约是地球的 100 倍。" },
  thinAir: { en: "Mars has no magnetic shield and very thin air, so radiation gets through.", zh: "火星没有磁场保护，空气又很稀薄，辐射容易照进来。" },
  forecast: { en: "Scientists watch the Sun to warn of storms, but forecasts can be wrong.", zh: "科学家盯着太阳预报风暴，但预报也会出错。" },
  regolith: { en: "A thick pile of Mars dirt makes a great radiation shield!", zh: "厚厚的火星土堆在基地上，就是很好的防护罩！" },
  dustStorm: { en: "In 2018 a huge dust storm hid the Sun, and Opportunity ran out of power.", zh: "2018 年一场大沙尘暴遮住太阳，机遇号没电了。" },
  dustDevil: { en: "Swirling winds once blew dust off rover solar panels: free power!", zh: "旋风曾把火星车的太阳能板吹干净，白白多了电！" },
  insightEnd: { en: "Nobody could wipe InSight's dusty panels, so it slowly ran out of power.", zh: "没人帮洞察号擦灰尘，它的电慢慢用光了。" },
  moxie: { en: "Perseverance's MOXIE used electricity to turn Mars air into real oxygen!", zh: "毅力号的 MOXIE 用电，把火星空气变成了氧气！" },
  veggie: { en: "In 2015, astronauts in space ate lettuce they grew themselves!", zh: "2015 年，宇航员在太空吃到了自己种的生菜！" },
  commDelay: { en: "A message to Earth takes 3 to 22 minutes to arrive.", zh: "发给地球的消息，要 3 到 22 分钟才能到。" },
  weatherFromOrbit: { en: "A spacecraft circling Mars photographs its weather every day.", zh: "绕着火星飞的卫星，每天给火星天气拍照。" },
  coldNights: { en: "Mars nights get colder than −70 °C, so heaters need power all night.", zh: "火星夜里低于零下 70 °C，暖气整晚都要用电。" },
  sol: { en: "A day on Mars is called a sol. It's 39 minutes longer than ours.", zh: "火星上的一天叫 sol，比地球的一天长 39 分钟。" },
  marsquake: { en: "Mars has quakes too! InSight felt more than 1,300 of them.", zh: "火星也会地震！洞察号测到了 1300 多次。" },
  layers: { en: "Rock layers are like the pages of a history book about Mars.", zh: "一层层岩石，就像记录火星历史的书页。" },
  gale: { en: "Round pebbles mean water once flowed here, long ago.", zh: "圆圆的鹅卵石，说明很久以前这里有水流过。" },
  jezero: { en: "Jezero crater was once a lake. Perseverance is looking for signs of ancient life.", zh: "杰泽罗撞击坑曾经是个湖，毅力号在找远古生命的痕迹。" },
  eva: { en: "Going outside finds the best science, but uses air and brings more radiation.", zh: "出舱能找到最好的发现，但要用氧气，辐射也更多。" },
};

// ---------- rocks found when sampling (just for fun; no effect on the rules) ----------
// Each site has its typical rock; sometimes you find something rare. All of these
// are real kinds of rock that rovers have found in Jezero or Gale crater.
export const ROCKS = {
  dune: { icon: "🏜️", en: "wind-blown sand", zh: "风吹来的细沙" },
  crater: { icon: "🪨", en: "impact-shattered rock", zh: "被撞碎的岩石" },
  cliff: { icon: "📚", en: "layered sedimentary rock", zh: "层层叠叠的沉积岩" },
  riverbed: { icon: "⚪", en: "a round river pebble", zh: "被水磨圆的鹅卵石" },
  canyon: { icon: "🌑", en: "dark volcanic basalt", zh: "黑色的火山玄武岩" },
  delta: { icon: "🟫", en: "lake-bottom mudstone", zh: "湖底的泥岩" },
  olivine: { icon: "💚", en: "olivine-rich rock with green crystals", zh: "含绿色橄榄石晶体的岩石", rare: true },
  carbonate: { icon: "💎", en: "carbonate rock that formed in water", zh: "在水里形成的碳酸盐岩", rare: true },
};
export function rockFor(siteId, rnd = Math.random) {
  if (rnd() < 0.15) return siteId === "delta" || siteId === "riverbed" ? "carbonate" : "olivine";
  return ROCKS[siteId] ? siteId : "crater";
}

// ---------- how worried should we be about each resource? ----------
// "ok" | "low" | "bad", used for the face under each gauge.
export function moodOf(s, key) {
  const nights = C.totalSols - s.sol + (s.phase === "settle" || s.phase === "end" ? 0 : 1);
  if (key === "oxygen") return s.oxygen < 25 ? "bad" : s.oxygen < 45 ? "low" : "ok";
  if (key === "battery") return s.battery < C.power.lifeSupport + 5 ? "bad" : s.battery < 50 ? "low" : "ok";
  if (key === "food") return s.food <= 2 && nights > s.food ? "bad" : s.food < nights ? "low" : "ok";
  if (key === "dose") return s.dose >= 70 ? "bad" : s.dose >= 40 ? "low" : "ok";
  return "ok";
}

// ---------- the robot guide ----------
// Returns { key, params, mood } where mood is "happy" | "think" | "worry" | "alarm".
// ctx: { walking, near, preview, suggested } (preview = E.previewNight result at night)
export function guideLine(s, ctx = {}) {
  const say = (key, mood = "happy", params = {}) => ({ key, mood, params });
  if (!s) return say("guide.hello");
  const sol = s.sol;
  const storm = E.solarStormOn(s, sol);
  const upcoming = E.activeWarnings(s).filter((x) => x.sol > sol);
  const w = E.weatherKey(s, sol);
  const tw = sol < C.totalSols ? E.weatherKey(s, sol + 1) : null;
  const nights = C.totalSols - sol + (s.phase === "settle" ? 0 : 1);

  if (s.phase === "briefing") {
    if (storm) return say("guide.brief.stormToday", "alarm");
    if (w === "dust") return say("guide.brief.dustToday", "worry");
    if (upcoming.length) return say("guide.brief.stormSoon", "worry", { n: upcoming[0].sol - sol });
    if (tw === "dust") return say("guide.brief.dustTomorrow", "worry");
    if (s.oxygen < 30) return say("guide.brief.lowO2", "worry");
    if (s.food < Math.min(nights, 4)) return say("guide.brief.lowFood", "worry");
    if (s.dose >= 70) return say("guide.brief.highDose", "worry");
    if (sol === 1) return say("guide.brief.first", "happy");
    if (sol === C.totalSols) return say("guide.brief.last", "happy");
    return say(w === "sunny" ? "guide.brief.sunny" : "guide.brief.hazy", "happy");
  }

  if (s.phase === "day") {
    if (!ctx.walking) return say("guide.day.map", "think");
    if (ctx.near) return null; // the action card speaks instead
    const todo = (s.today.tasks || []).filter((k) => !k.done && !(k.kind === "shelter" && s.today.evas.length)).length;
    if (s.ap <= 0) return say("guide.day.noAp", "think");
    if (storm) return say("guide.day.stormOutside", "alarm");
    if (sol === 1 && !s.today.log.length) return say("guide.day.first", "happy");
    if (!s.today.inspected) return say("guide.day.inspect", "think");
    if (s.panel <= 80 && !s.today.cleaned) return say("guide.day.dirty", "think");
    if (todo) return say("guide.day.tasks", "happy", { n: todo });
    if (!s.today.tended && s.food < nights) return say("guide.day.tend", "think");
    return say("guide.day.explore", "happy");
  }

  if (s.phase === "night") {
    const p = ctx.preview;
    const has = (k) => p && p.warnings.some((x) => x.key === k);
    if (p && p.overBudget) return say("guide.night.over", "alarm");
    if (has("warn.stormNoShield")) return say("guide.night.storm", "alarm");
    if (has("warn.noAir")) return say("guide.night.noAir", "alarm");
    if (has("warn.noFood")) return say("guide.night.noFood", "alarm");
    if (has("warn.tomorrowShort") || has("warn.stormComing")) return say("guide.night.save", "worry");
    if (has("warn.lowAir")) return say("guide.night.lowAir", "worry");
    if (has("warn.lowFood")) return say("guide.night.lowFood", "worry");
    return say(sol === 1 && !ctx.suggested ? "guide.night.first" : "guide.night.ok", "happy");
  }

  if (s.phase === "settle") {
    const h = s.history[s.history.length - 1];
    if (h && h.solarStorm) return h.alloc && h.alloc.shield ? say("guide.settle.shielded", "happy") : say("guide.settle.unshielded", "worry");
    if (h && h.dustDevil) return say("guide.settle.devil", "happy");
    if (s.tonightCards.length) return say("guide.settle.story", "happy");
    if (sol + 1 === C.totalSols) return say("guide.settle.lastNext", "happy");
    return say("guide.settle.night", "happy");
  }
  return null;
}

// ---------- a sensible power plan for tonight (the "Suggest a plan" button) ----------
// Battery to keep for the next few sols, using only what the player can see:
// known weather (tomorrow, replies from Earth) and the hint that a hazy day in
// dust-storm season often comes right before a dust storm.
export function reserveNeeded(s) {
  const N = C.totalSols, LS = C.power.lifeSupport;
  let need = 0, worst = 0;
  const stormSeen = s.history.some((h) => h.weather === "dust");
  for (let k = 1; k <= 4; k++) {
    const n = s.sol + k;
    if (n > N) break;
    let w;
    if (E.isKnown(s, n)) w = E.weatherKey(s, n);
    else if (!stormSeen && n >= C.weatherGen.seasonStartSol && E.isKnown(s, n - 1) && E.weatherKey(s, n - 1) !== "sunny") w = "dust";
    else break;
    need += LS - Math.round((C.weather[w].solar * s.panel) / 100) - E.bonusPower(s);
    worst = Math.max(worst, need);
  }
  const floor = !stormSeen && s.sol >= C.weatherGen.seasonStartSol - 2 ? 60 : 25;
  return s.sol >= N ? 0 : Math.max(floor, worst + 5);
}

// Tries every setting and keeps the safest one. It only suggests: the player
// still confirms, and can change anything.
export function suggestAlloc(s) {
  const storm = E.solarStormOn(s, s.sol);
  const reserve = reserveNeeded(s);
  let best = null;
  for (let o2 = 0; o2 <= C.oxygenGen.maxPower; o2 += C.oxygenGen.step) {
    for (const gh of [true, false]) {
      for (const shield of [false, true]) {
        const a = { o2, gh, shield };
        const p = E.previewNight(s, a);
        let score = 0;
        if (p.overBudget) score -= 10000;
        if (p.oxygenRaw < 0) score -= 3000;
        if (p.food < 0) score -= 3000;
        if (storm && !shield) score -= 400;
        if (!storm && shield) score -= 300;
        for (const w of p.warnings) score -= w.level === "danger" ? 150 : w.level === "warn" ? 40 : 0;
        score += Math.min(p.oxygen, 75) * 1.2; // keep the tank from slowly emptying
        score -= p.overflow * 0.5; // power that would be thrown away is better spent
        score += Math.min(p.battery, C.max.battery) * 1.0; // keep power for tomorrow (scripts/suggest-check.mjs)
        if (p.battery < reserve) score -= (reserve - p.battery) * 8; // dark days ahead: save up
        if (gh) score += s.food <= C.totalSols - s.sol + 1 ? 25 : 6; // food for later, if it is needed
        if (best === null || score > best.score) best = { score, a };
      }
    }
  }
  return best.a;
}
