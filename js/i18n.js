// Tiny translation helper: English (default) and Simplified Chinese.
// Language comes from ?lang=en|zh, then the viewer's saved choice, then English.

const DICT = {
  en: {
    "meta.title": "Sol by Sol: Mars Outpost Trainer",
    "lang.toggle": "中文",
    "lang.aria": "Switch language",

    "title.tagline": "Run a base on Mars for 20 sols. Every choice costs something.",
    "title.how1": "<b>Split your power</b> between oxygen, the radiation shield and science.",
    "title.how2": "<b>Pick one action</b> each sol. Every card has a gain <i>and</i> a cost.",
    "title.how3": "<b>Survive the night.</b> Real solar storms from NASA data can hit your base.",
    "title.start": "Start Mission 🚀",
    "title.badge": "Solar storms come from <b>real NASA DONKI records</b> (2017–2024).",
    "title.collection": "📚 Knowledge Cards",
    "title.loadError": "Couldn't load the NASA storm data. Please reload the page.",

    "game.sol": "Sol {n}",
    "meter.o2": "🫁 Oxygen",
    "meter.battery": "🔋 Battery",
    "meter.dose": "☢️ Radiation dose",
    "meter.science": "🔬 Science",
    "goal.next": "Next ⭐ at {n}",
    "goal.done": "⭐⭐⭐ reached!",

    "power.title": "1. Split today's power",
    "power.supply": "Solar power today:",
    "power.fromBattery": "from battery",
    "power.more": "More power",
    "power.less": "Less power",
    "slot.o2": "🫁 O₂ Maker",
    "slot.o2.effect": "+1 oxygen each",
    "slot.shield": "🛡️ Shield",
    "slot.shield.effect": "blocks 1 storm ☢️ each",
    "slot.lab": "🔬 Lab",
    "slot.lab.effect": "+1 science each",
    "note.broken": "⚙️ The O₂ Maker is broken: it can only use 2 power. Repair it!",
    "note.noShield": "⚠️ A storm is coming tonight and your shield is off!",
    "note.draw": "Using {n} 🔋 from your battery.",
    "note.spare": "{n} spare ⚡ will charge your battery.",

    "actions.title": "2. Pick one action",

    "weather.sunny": "Clear sky",
    "weather.hazy": "Dusty haze",
    "weather.dust": "Dust storm",
    "forecast.calm": "Space weather calm",
    "forecast.calm.detail": "No solar storm expected tonight.",
    "forecast.watch": "Storm watch",
    "forecast.watch.detail": "A solar storm might arrive in the next sol or two. Forecasts aren't perfect!",
    "forecast.warning": "Storm warning",
    "forecast.warning.detail": "A solar storm is arriving tonight. Power up the shield!",
    "strength.small": "small",
    "strength.medium": "medium",
    "strength.big": "big",

    "intel.title": "📡 Reply from Earth",
    "intel.sol": "Sol {n}:",
    "intel.storm": "☀️ <b>Solar storm</b> ({strength}, up to {dose} ☢️)",
    "intel.noStorm": "🟢 no solar storm",

    "preview.empty": "Split your power and pick an action to see what happens tonight.",
    "preview.pickFirst": "Pick an action first",
    "preview.intro": "By morning, if nothing surprising happens:",
    "preview.o2": "🫁 Oxygen",
    "preview.battery": "🔋 Battery",
    "preview.runOut": " 💀 run out!",
    "preview.tooCold": " 🥶 too cold!",
    "preview.stormTonight": "☀️ Storm tonight",
    "preview.shieldBlocks": "shield blocks {n} ☢️",
    "preview.stormSoon": "🟡 A storm might come soon",
    "preview.end": "End Sol {n} 🌙",

    "night.title": "🌙 Night of Sol {n}",
    "night.o2Made": "O₂ Maker made oxygen",
    "night.lab": "Lab experiments",
    "night.spare": "Spare solar power stored",
    "night.draw": "Used stored battery power",
    "night.breath": "Crew breathed through the night",
    "night.heat": "Heaters kept the base warm",
    "night.cold": "Battery empty! Cold night, life support struggled",
    "night.cosmic": "Cosmic rays from deep space",
    "night.storm": "Solar storm hit! Shield blocked {blocked} of {dose}",
    "night.noStorm": "Shield was ready, but no storm came tonight",
    "night.dustDevil": "A dust devil blew the solar panels clean!",
    "night.dustDevil.delta": "+1 ⚡ later",
    "night.broke": "A part in the O₂ Maker broke",
    "night.broke.delta": "O₂ Maker max 2",
    "night.quake": "Your seismometer felt a marsquake",
    "night.stormBox": "☀️ <b>This storm really happened!</b> On <b>{date}</b>, NASA's DONKI database recorded a coronal mass ejection racing away from the Sun at <b>{speed} km/s</b>, seen by {instrument}.{sep} It was observed near Earth; what it does to your Mars base is a simulation.",
    "night.stormSep": " It also sent a burst of fast particles through space.",
    "night.stormLink": "See the real record ↗",
    "night.didYouKnow": "Did you know?",
    "night.source": "Source:",
    "night.report": "See mission report 📋",
    "night.next": "Start Sol {n} ☀️",

    "line.eva": "Crater EVA: found great samples",
    "line.drill": "Drilled a rock sample",
    "line.berm": "Built a regolith wall (level {level})",
    "line.clean": "Cleaned the solar panels",
    "line.callEarth": "Message sent to Earth. Reply arrives next sol.",
    "line.rest": "Crew rested and breathed slowly",
    "line.repair": "Repaired the O₂ Maker",

    "card.eva.name": "Crater EVA",
    "card.eva.hint": "Go outside to study a crater.",
    "card.eva.gain": "+3 🔬",
    "card.eva.cost": "+1 ☢️  −1 🫁",
    "card.drill.name": "Drill a Sample",
    "card.drill.hint": "Run the drill from inside the base.",
    "card.drill.gain": "+2 🔬",
    "card.drill.cost": "−1 🔋",
    "card.berm.name": "Regolith Wall",
    "card.berm.hint": "Pile Mars soil on the habitat.",
    "card.berm.gain": "Every storm −1 ☢️ (forever)",
    "card.berm.cost": "−2 🔋",
    "card.clean.name": "Clean Panels",
    "card.clean.hint": "Brush dust off the solar panels.",
    "card.clean.gain": "+1 ⚡ until the next dust storm",
    "card.clean.cost": "−1 🫁",
    "card.callEarth.name": "Call Earth",
    "card.callEarth.hint": "Ask Mission Control. The answer takes time!",
    "card.callEarth.gain": "Exact forecast next sol",
    "card.callEarth.cost": "−1 🔬",
    "card.rest.name": "Rest Day",
    "card.rest.hint": "Resting crews breathe less.",
    "card.rest.gain": "Tonight −1 🫁 used",
    "card.rest.cost": "Skip today's action",
    "card.repair.name": "Repair O₂ Maker",
    "card.repair.hint": "A part broke. Fix it!",
    "card.repair.gain": "O₂ Maker fixed",
    "card.repair.cost": "−1 🔋",

    "end.win": "Mission Complete! 🎉",
    "end.win.why": "You kept your crew safe for {max} sols and collected {sci} science points.",
    "end.goals": "Science goals: {goals}.",
    "end.o2": "Out of Oxygen 😮‍💨",
    "end.o2.why": "On sol {sol} your crew ran out of oxygen. Give the O₂ Maker more power, keep the battery charged for cold nights, and rest when oxygen is low.",
    "end.dose": "Radiation Limit Reached ☢️",
    "end.dose.why": "On sol {sol} your crew's radiation dose hit the limit. Radiation never goes away, so power the shield when a storm warning appears and build regolith walls.",
    "end.tryAgain": "Every astronaut learns from failure. Try again!",
    "end.chart": "Your mission, sol by sol",
    "end.chartAria": "Oxygen, battery and radiation over the mission",
    "end.legendO2": "━ 🫁 Oxygen",
    "end.legendBattery": "━ 🔋 Battery",
    "end.legendDose": "━ ☢️ Radiation",
    "end.legendStorm": "☀️ = solar storm",
    "end.axis": "sol →",
    "end.storms": "☀️ Real solar storms you faced",
    "end.stormItem": "<b>Sol {sol}:</b> real CME on {date}, {speed} km/s. Shield blocked {blocked} of {dose} ☢️.",
    "end.stormLink": "DONKI record ↗",
    "end.noStorms": "No storms reached you this time. Lucky!",
    "end.cards": "📚 Knowledge cards unlocked",
    "end.noCards": "No new cards this time. You've seen them all before!",
    "end.again": "Try a new mission 🔁",
    "end.home": "Home",

    "info.gotIt": "Got it",
    "collection.title": "📚 Knowledge Cards",
    "collection.note": "Unlock cards by playing. Each one is a real science fact with its source.",
    "collection.locked": "Keep playing to unlock.",
    "collection.close": "Close",

    "footer": 'Data: <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener">NASA DONKI</a> real historical solar storms (not live) · <a href="https://osdr.nasa.gov/bio/repo/" target="_blank" rel="noopener">NASA OSDR</a> · Student project for NASA Space Apps 2026, not an official NASA product.',
  },

  zh: {
    "meta.title": "Sol by Sol：火星基地小指挥官",
    "lang.toggle": "English",
    "lang.aria": "切换语言",

    "title.tagline": "在火星上管理基地 20 个火星日（sol）。每个选择都有代价。",
    "title.how1": "<b>分配电力</b>：在氧气、辐射防护罩和科学实验之间分配。",
    "title.how2": "<b>每天选一个行动</b>。每张卡都有收益，<i>也</i>有代价。",
    "title.how3": "<b>熬过夜晚</b>。来自 NASA 数据的真实太阳风暴可能袭击你的基地。",
    "title.start": "开始任务 🚀",
    "title.badge": "太阳风暴来自 <b>NASA DONKI 的真实记录</b>（2017–2024 年）。",
    "title.collection": "📚 知识卡片",
    "title.loadError": "无法加载 NASA 风暴数据，请刷新页面。",

    "game.sol": "火星日 {n}",
    "meter.o2": "🫁 氧气",
    "meter.battery": "🔋 电池",
    "meter.dose": "☢️ 辐射剂量",
    "meter.science": "🔬 科学点",
    "goal.next": "下一颗 ⭐ 需要 {n}",
    "goal.done": "⭐⭐⭐ 全部达成！",

    "power.title": "1. 分配今天的电力",
    "power.supply": "今天的太阳能：",
    "power.fromBattery": "来自电池",
    "power.more": "加一格电",
    "power.less": "减一格电",
    "slot.o2": "🫁 制氧机",
    "slot.o2.effect": "每格 +1 氧气",
    "slot.shield": "🛡️ 防护罩",
    "slot.shield.effect": "每格挡住 1 点风暴辐射 ☢️",
    "slot.lab": "🔬 实验室",
    "slot.lab.effect": "每格 +1 科学点",
    "note.broken": "⚙️ 制氧机坏了：最多只能用 2 格电。快修好它！",
    "note.noShield": "⚠️ 今晚有风暴，可是防护罩没开！",
    "note.draw": "会用掉电池里的 {n} 🔋。",
    "note.spare": "多出的 {n} ⚡ 会存进电池。",

    "actions.title": "2. 选一个行动",

    "weather.sunny": "晴朗",
    "weather.hazy": "有尘雾",
    "weather.dust": "沙尘暴",
    "forecast.calm": "太空天气平静",
    "forecast.calm.detail": "今晚预计没有太阳风暴。",
    "forecast.watch": "风暴关注",
    "forecast.watch.detail": "接下来一两天可能有太阳风暴。预报不一定准！",
    "forecast.warning": "风暴警报",
    "forecast.warning.detail": "今晚太阳风暴就要来了，快给防护罩供电！",
    "strength.small": "小",
    "strength.medium": "中",
    "strength.big": "大",

    "intel.title": "📡 地球的回复",
    "intel.sol": "火星日 {n}：",
    "intel.storm": "☀️ <b>太阳风暴</b>（{strength}型，最多 {dose} ☢️）",
    "intel.noStorm": "🟢 没有太阳风暴",

    "preview.empty": "分配电力并选一个行动，就能看到今晚会发生什么。",
    "preview.pickFirst": "先选一个行动",
    "preview.intro": "如果没有意外，到明天早上：",
    "preview.o2": "🫁 氧气",
    "preview.battery": "🔋 电池",
    "preview.runOut": " 💀 会用完！",
    "preview.tooCold": " 🥶 会太冷！",
    "preview.stormTonight": "☀️ 今晚有风暴",
    "preview.shieldBlocks": "防护罩挡 {n} ☢️",
    "preview.stormSoon": "🟡 风暴可能快来了",
    "preview.end": "结束火星日 {n} 🌙",

    "night.title": "🌙 火星日 {n} 的夜晚",
    "night.o2Made": "制氧机制造了氧气",
    "night.lab": "实验室做了实验",
    "night.spare": "多余的太阳能存进了电池",
    "night.draw": "用了电池里存的电",
    "night.breath": "船员整夜呼吸",
    "night.heat": "暖气让基地保持温暖",
    "night.cold": "电池没电了！夜里太冷，生命维持系统很吃力",
    "night.cosmic": "来自深空的宇宙射线",
    "night.storm": "太阳风暴来袭！防护罩挡住了 {dose} 点中的 {blocked} 点",
    "night.noStorm": "防护罩准备好了，但今晚风暴没有来",
    "night.dustDevil": "一阵尘卷风把太阳能板吹干净了！",
    "night.dustDevil.delta": "之后 +1 ⚡",
    "night.broke": "制氧机的一个零件坏了",
    "night.broke.delta": "制氧机最多 2 格",
    "night.quake": "你的地震仪测到了一次火星地震",
    "night.stormBox": "☀️ <b>这场风暴是真的！</b><b>{date}</b>，NASA 的 DONKI 数据库记录到一次日冕物质抛射，以每秒 <b>{speed} 公里</b>的速度冲离太阳，由 {instrument} 观测到。{sep}它是在地球附近观测到的；它对你的火星基地造成的影响是模拟的。",
    "night.stormSep": "它还向太空喷出了一阵高速粒子。",
    "night.stormLink": "查看真实记录 ↗",
    "night.didYouKnow": "你知道吗？",
    "night.source": "来源：",
    "night.report": "查看任务报告 📋",
    "night.next": "开始火星日 {n} ☀️",

    "line.eva": "陨石坑考察：找到了很棒的样本",
    "line.drill": "钻取了一块岩石样本",
    "line.berm": "堆好了火星土墙（第 {level} 层）",
    "line.clean": "清理了太阳能板",
    "line.callEarth": "消息已发往地球，回复明天才到。",
    "line.rest": "船员休息，呼吸变慢了",
    "line.repair": "修好了制氧机",

    "card.eva.name": "陨石坑考察",
    "card.eva.hint": "出舱去研究一个陨石坑。",
    "card.eva.gain": "+3 🔬",
    "card.eva.cost": "+1 ☢️  −1 🫁",
    "card.drill.name": "钻取样本",
    "card.drill.hint": "在基地里操作钻机。",
    "card.drill.gain": "+2 🔬",
    "card.drill.cost": "−1 🔋",
    "card.berm.name": "火星土墙",
    "card.berm.hint": "把火星土壤堆在基地上。",
    "card.berm.gain": "以后每次风暴 −1 ☢️（永久）",
    "card.berm.cost": "−2 🔋",
    "card.clean.name": "清理太阳能板",
    "card.clean.hint": "把太阳能板上的灰尘刷掉。",
    "card.clean.gain": "+1 ⚡，直到下次沙尘暴",
    "card.clean.cost": "−1 🫁",
    "card.callEarth.name": "呼叫地球",
    "card.callEarth.hint": "问问任务控制中心，回复需要时间！",
    "card.callEarth.gain": "明天收到准确预报",
    "card.callEarth.cost": "−1 🔬",
    "card.rest.name": "休息日",
    "card.rest.hint": "休息时船员呼吸得更少。",
    "card.rest.gain": "今晚少用 1 🫁",
    "card.rest.cost": "今天不做别的事",
    "card.repair.name": "修理制氧机",
    "card.repair.hint": "零件坏了，快修好！",
    "card.repair.gain": "制氧机修好",
    "card.repair.cost": "−1 🔋",

    "end.win": "任务完成！🎉",
    "end.win.why": "你让船员安全度过了 {max} 个火星日，收集了 {sci} 个科学点。",
    "end.goals": "科学目标：{goals}。",
    "end.o2": "氧气用完了 😮‍💨",
    "end.o2.why": "第 {sol} 个火星日，船员的氧气用完了。多给制氧机供电，给寒冷的夜晚留够电池，氧气少的时候就休息。",
    "end.dose": "辐射剂量到达上限 ☢️",
    "end.dose.why": "第 {sol} 个火星日，船员的辐射剂量达到了上限。辐射不会消失，所以看到风暴警报时要给防护罩供电，还可以堆火星土墙。",
    "end.tryAgain": "每个宇航员都是从失败中学习的。再试一次！",
    "end.chart": "你的任务，一天一天回顾",
    "end.chartAria": "整个任务中氧气、电池和辐射的变化",
    "end.legendO2": "━ 🫁 氧气",
    "end.legendBattery": "━ 🔋 电池",
    "end.legendDose": "━ ☢️ 辐射",
    "end.legendStorm": "☀️ = 太阳风暴",
    "end.axis": "火星日 →",
    "end.storms": "☀️ 你遇到的真实太阳风暴",
    "end.stormItem": "<b>火星日 {sol}：</b>{date} 的真实日冕物质抛射，每秒 {speed} 公里。防护罩挡住了 {dose} 点中的 {blocked} 点 ☢️。",
    "end.stormLink": "DONKI 记录 ↗",
    "end.noStorms": "这次没有风暴袭击你。真幸运！",
    "end.cards": "📚 解锁的知识卡片",
    "end.noCards": "这次没有新卡片，你都见过啦！",
    "end.again": "再来一次新任务 🔁",
    "end.home": "回到首页",

    "info.gotIt": "知道了",
    "collection.title": "📚 知识卡片",
    "collection.note": "边玩边解锁卡片。每张都是真实的科学知识，并附上来源。",
    "collection.locked": "继续玩来解锁。",
    "collection.close": "关闭",

    "footer": '数据：<a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener">NASA DONKI</a> 真实历史太阳风暴（非实时）· <a href="https://osdr.nasa.gov/bio/repo/" target="_blank" rel="noopener">NASA OSDR</a> · NASA Space Apps 2026 学生作品，并非 NASA 官方产品。',
  },
};

export const LANGS = ["en", "zh"];
const KEY = "solbysol.lang";

function initialLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (LANGS.includes(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
  } catch { /* storage blocked */ }
  return "en";
}

let lang = initialLang();

export const getLang = () => lang;

export function setLang(next) {
  if (!LANGS.includes(next)) return;
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* storage blocked */ }
}

// t("game.sol", { n: 3 }) → "Sol 3"
export function t(key, params = {}) {
  const s = DICT[lang][key] ?? DICT.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ""));
}

// Pick the current language from a { en, zh } object (used by facts).
export const pick = (obj) => (typeof obj === "string" ? obj : obj[lang] ?? obj.en);

// Fill static HTML: data-i18n (text), data-i18n-html (markup), data-i18n-aria (aria-label).
export function applyStatic(root = document) {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = t("meta.title");
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}
