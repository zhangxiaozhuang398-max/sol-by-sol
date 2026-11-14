// Short, kid-friendly science facts shown as story cards and collectible knowledge
// cards, in English and Simplified Chinese. Every fact names its source.
// Optional `lesson` says what the card means for the player's next decision.

const DONKI = { label: { en: "NASA DONKI space weather database", zh: "NASA DONKI 太空天气数据库" }, url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" };
const OSDR = { label: { en: "NASA Open Science Data Repository (OSDR)", zh: "NASA 开放科学数据库（OSDR）" }, url: "https://osdr.nasa.gov/bio/repo/" };
const MARS = { label: { en: "NASA Mars science", zh: "NASA 火星科学" }, url: "https://science.nasa.gov/mars/" };
const PERSEVERANCE = { label: { en: "NASA Mars 2020 Perseverance mission", zh: "NASA 毅力号任务" }, url: "https://science.nasa.gov/mission/mars-2020-perseverance/" };
const INSIGHT = { label: { en: "NASA InSight mission", zh: "NASA 洞察号任务" }, url: "https://science.nasa.gov/mission/insight/" };
const MSL = { label: { en: "NASA Curiosity rover mission", zh: "NASA 好奇号任务" }, url: "https://science.nasa.gov/mission/msl-curiosity/" };
const MRO = { label: { en: "NASA Mars Reconnaissance Orbiter", zh: "NASA 火星勘测轨道飞行器" }, url: "https://science.nasa.gov/mission/mars-reconnaissance-orbiter/" };
const OPPORTUNITY = { label: { en: "NASA: Opportunity rover mission ends", zh: "NASA：机遇号任务结束" }, url: "https://www.nasa.gov/news-release/nasas-record-setting-opportunity-rover-mission-on-mars-comes-to-end" };
const STORM2024 = { label: { en: "NASA: Curiosity sees streaks and specks during 2024 solar storm", zh: "NASA：好奇号在 2024 年太阳风暴中看到的条纹和亮点" }, url: "https://science.nasa.gov/resource/curiosity-sees-streaks-and-specks-during-2024-solar-storm" };
const VEGGIE = { label: { en: "NASA: Growing plants in space (Veggie)", zh: "NASA：在太空种植物（Veggie）" }, url: "https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/" };

export const FACTS = {
  // ---- solar storms (event cards: they appear the night a real storm hits) ----
  cme: {
    icon: "☀️",
    title: { en: "Solar Storms", zh: "太阳风暴" },
    text: {
      en: "Sometimes the Sun throws out a giant cloud of charged particles called a coronal mass ejection (CME). Fast ones travel more than 1,000 km every second!",
      zh: "太阳有时会抛出一大团带电粒子，叫做日冕物质抛射（CME）。快的每秒能飞 1000 多公里！",
    },
    lesson: {
      en: "Storm warnings give you a day or two. Skip the spacewalk and power the shield.",
      zh: "风暴警报会提前一两天。别出舱，给护盾舱供电。",
    },
    source: DONKI,
  },
  mars2017: {
    icon: "🔴",
    title: { en: "September 2017: A Storm Seen at Mars", zh: "2017 年 9 月：在火星上看到的风暴" },
    text: {
      en: "In September 2017 a solar storm was so strong that NASA's Curiosity rover and MAVEN orbiter both detected it at Mars.",
      zh: "2017 年 9 月，一场太阳风暴强到连 NASA 的好奇号火星车和 MAVEN 轨道器都在火星上探测到了它。",
    },
    lesson: {
      en: "On storm days, staying inside a shielded place is much safer than going out.",
      zh: "风暴来的那天，待在有屏蔽的地方比出门安全得多。",
    },
    source: MSL,
  },
  solar2024: {
    icon: "🌞",
    title: { en: "May 2024: Curiosity's Biggest Radiation Surge", zh: "2024 年 5 月：好奇号遇到的最大辐射浪涌" },
    text: {
      en: "In May 2024 a huge solar storm hit Mars. Curiosity's radiation detector (RAD) measured the biggest radiation surge since the rover landed in 2012. Scientists said astronauts would have been safest sheltering in a place with extra shielding.",
      zh: "2024 年 5 月，一场巨大的太阳风暴袭击了火星。好奇号的辐射探测器（RAD）测到了自 2012 年着陆以来最大的一次辐射浪涌。科学家说，宇航员躲进有额外屏蔽的地方最安全。",
    },
    lesson: {
      en: "When a warning comes, plan ahead: no spacewalk that day, and keep power for the shield.",
      zh: "预警来了就提前计划：那天别出舱，给护盾舱留好电。",
    },
    source: STORM2024,
  },
  radiationAddsUp: {
    icon: "☢️",
    title: { en: "Radiation Adds Up", zh: "辐射会累积" },
    text: {
      en: "Radiation dose builds up over a whole mission and does not go away when you rest. That's why NASA sets a lifetime limit for every astronaut.",
      zh: "辐射剂量会在整个任务中一点点累积，休息也不会让它消失。所以 NASA 给每位宇航员都设定了终生剂量上限。",
    },
    lesson: { en: "Every spacewalk adds to your dose. At 100 the mission must end.", zh: "每次出舱都会让剂量上涨。到 100，任务就必须结束。" },
    source: OSDR,
  },
  marsRadiation: {
    icon: "📟",
    title: { en: "Measuring Mars Radiation", zh: "测量火星辐射" },
    text: {
      en: "Curiosity's RAD instrument measures radiation on the surface of Mars. A day there gives roughly a hundred times more radiation than a day on Earth's surface.",
      zh: "好奇号上的 RAD 仪器在火星表面测量辐射。在火星待一天受到的辐射，大约是在地球表面一天的一百倍。",
    },
    source: OSDR,
  },
  thinAir: {
    icon: "🌬️",
    title: { en: "No Magnetic Shield", zh: "没有磁场保护" },
    text: {
      en: "Earth's magnetic field and thick air protect us from space radiation. Mars has no global magnetic field and its air is less than 1% as thick as Earth's. Its thin air can still push sand into dunes.",
      zh: "地球的磁场和厚厚的大气保护我们不受太空辐射伤害。火星没有全球磁场，大气也稀薄得不到地球的 1%。不过稀薄的风照样能把沙子堆成沙丘。",
    },
    source: MARS,
  },
  forecast: {
    icon: "🔭",
    title: { en: "Space Weather Forecasts", zh: "太空天气预报" },
    text: {
      en: "Scientists watch the Sun with spacecraft to predict when a solar storm will arrive, but forecasts can be hours off, or miss a storm completely.",
      zh: "科学家用航天器观察太阳，预测太阳风暴什么时候到达。但预报可能差好几个小时，甚至完全漏掉一场风暴。",
    },
    source: DONKI,
  },
  regolith: {
    icon: "🧱",
    title: { en: "Shield Made of Dirt", zh: "用土做的盾牌" },
    text: {
      en: "Mission planners study piling Martian soil, called regolith, on top of a habitat. A thick layer of soil blocks a lot of radiation and costs nothing to ship from Earth.",
      zh: "任务规划师在研究把火星土壤（叫做风化层）堆在基地上。厚厚的土层能挡住很多辐射，而且不用从地球运过来。",
    },
    lesson: { en: "Your shield room works like a storm shelter: it costs power, but it saves dose.", zh: "你的护盾舱就像风暴避难所：要花电，但能省下剂量。" },
    source: MARS,
  },

  // ---- dust, power and the rovers that ran out of it ----
  dustStorm: {
    icon: "🌪️",
    title: { en: "Opportunity and the 2018 Dust Storm", zh: "机遇号与 2018 年沙尘暴" },
    text: {
      en: "In 2018 a dust storm covered the whole planet and hid the Sun for months. The solar-powered Opportunity rover went silent in June 2018 and never woke up. It was built for 90 days and worked for more than 14 years.",
      zh: "2018 年，一场沙尘暴覆盖了整个火星，把太阳遮了好几个月。靠太阳能的机遇号在 2018 年 6 月失去联系，再也没有醒来。它设计寿命只有 90 天，却工作了 14 年多。",
    },
    lesson: { en: "Fill the battery before a dust storm, and switch off what you don't need.", zh: "沙尘暴来之前要把电池充满，风暴期间先关掉不是必需的设备。" },
    source: OPPORTUNITY,
  },
  dustDevil: {
    icon: "🌀",
    title: { en: "Helpful Dust Devils", zh: "帮忙的尘卷风" },
    text: {
      en: "Spinning winds called dust devils sometimes blew dust off the solar panels of the Spirit and Opportunity rovers, giving them a surprise power boost.",
      zh: "旋转的风叫做尘卷风。它有时会把勇气号和机遇号火星车太阳能板上的灰尘吹走，让它们突然多了不少电。",
    },
    lesson: { en: "A dust devil cleaned your panels tonight. Tomorrow you'll make more power!", zh: "尘卷风帮你把太阳能板吹干净了！明天发电恢复。" },
    source: MARS,
  },
  insightEnd: {
    icon: "🧽",
    title: { en: "InSight: Nobody to Wipe the Panels", zh: "洞察号：没人帮它擦板子" },
    text: {
      en: "The InSight lander had no way to clean its solar panels, so dust slowly piled up. In December 2022 NASA declared its mission over after it ran out of power. Its last message said its power was really low.",
      zh: "洞察号着陆器没有办法擦它的太阳能板，灰尘越积越多。2022 年 12 月，它的电量耗尽，NASA 宣布任务结束。它最后的消息说，电量真的很低了。",
    },
    lesson: { en: "You're astronauts. You can go outside and wipe the panels: 1 action point.", zh: "你们是宇航员，可以出去擦板子！用 1 个行动点就行。" },
    source: INSIGHT,
  },
  moxie: {
    icon: "🫁",
    title: { en: "Making Oxygen on Mars", zh: "在火星上制造氧气" },
    text: {
      en: "Perseverance carried an experiment called MOXIE that made real oxygen out of the carbon dioxide in Mars's air. It needs electricity to work.",
      zh: "毅力号火星车带着一个叫 MOXIE 的实验装置，它用火星空气里的二氧化碳制造出了真正的氧气。它需要电才能工作。",
    },
    lesson: { en: "The O₂ Maker is hungry: every 5 power makes only 4 oxygen.", zh: "制氧机很耗电：每 5 电只能换 4 氧气。" },
    source: PERSEVERANCE,
  },
  veggie: {
    icon: "🥬",
    title: { en: "The First Lettuce Grown in Space", zh: "太空里种出的第一口生菜" },
    text: {
      en: "In 2015 astronauts on the International Space Station ate red romaine lettuce they had grown themselves in a garden called Veggie. Future Mars bases will need greenhouses for fresh food too.",
      zh: "2015 年，国际空间站的宇航员第一次吃到了自己在“Veggie”小花园里种出的红叶生菜。未来的火星基地也需要温室来提供新鲜食物。",
    },
    lesson: { en: "Tend the greenhouse by day and power it at night to harvest an extra day of food.", zh: "白天照料温室、晚上又给温室供电，就能多收 1 天的食物。" },
    source: VEGGIE,
  },
  commDelay: {
    icon: "📡",
    title: { en: "Waiting for Earth", zh: "等待地球回复" },
    text: {
      en: "Radio messages take between about 3 and 22 minutes to travel one way between Earth and Mars, so astronauts can't always wait for Mission Control to answer.",
      zh: "无线电信号在地球和火星之间单程要走大约 3 到 22 分钟，所以宇航员不能总是等任务控制中心回答。",
    },
    lesson: { en: "Earth's reply arrives tomorrow morning. In an emergency, the crew decides alone.", zh: "地球的回复明天早上才到。紧急情况下，宇航员只能自己做决定。" },
    source: MARS,
  },
  weatherFromOrbit: {
    icon: "🛰️",
    title: { en: "How Does Earth Know Mars's Weather?", zh: "地球怎么知道火星的天气？" },
    text: {
      en: "The Mars Reconnaissance Orbiter circles Mars every day and takes pictures that become a global weather map. Scientists on Earth use them to spot dust storms as they grow.",
      zh: "火星勘测轨道飞行器每天绕着火星拍照，拼成一张全球天气图。地球上的科学家看着这些照片，就能发现正在变大的沙尘暴。",
    },
    lesson: { en: "Earth's weather forecast lets you prepare days ahead.", zh: "地球回信里的天气预报能让你提前好几天做准备。" },
    source: MRO,
  },
  coldNights: {
    icon: "🥶",
    title: { en: "Freezing Nights", zh: "冰冷的夜晚" },
    text: {
      en: "Nights on Mars often fall below -70 °C. A base needs power for heaters all night, even when the solar panels are dark.",
      zh: "火星的夜晚常常低于零下 70 °C。即使太阳能板不发电，基地整晚都需要电来开暖气。",
    },
    lesson: { en: "Life support (heat, air, water) always takes its power first.", zh: "生命维持（暖气、空气、水）永远优先用电。" },
    source: MARS,
  },
  sol: {
    icon: "🕰️",
    title: { en: "What is a Sol?", zh: "什么是 sol？" },
    text: {
      en: "A day on Mars is called a sol. It lasts about 24 hours and 39 minutes, a little longer than a day on Earth.",
      zh: "火星上的一天叫做 sol（火星日）。它大约有 24 小时 39 分钟，比地球上的一天长一点。",
    },
    source: MARS,
  },

  // ---- places on the map: each is unlocked by visiting ----
  marsquake: {
    icon: "🌋",
    title: { en: "Marsquakes", zh: "火星地震" },
    text: {
      en: "NASA's InSight lander listened to the inside of Mars and detected more than 1,300 marsquakes. It also heard rocks hitting Mars and making craters.",
      zh: "NASA 的洞察号着陆器聆听火星内部的声音，探测到了 1300 多次火星地震。它也听到过陨石撞上火星、砸出陨石坑的声音。",
    },
    source: INSIGHT,
  },
  layers: {
    icon: "📚",
    title: { en: "Rock Layers Are History Books", zh: "岩层是历史书" },
    text: {
      en: "Curiosity is climbing a mountain in Gale crater made of layers of rock. Each layer is like a page that records what Mars was like long ago.",
      zh: "好奇号正在盖尔撞击坑里攀登一座由层层岩石组成的山。每一层岩石就像一页纸，记录着很久以前火星的样子。",
    },
    source: MSL,
  },
  gale: {
    icon: "🪨",
    title: { en: "Pebbles from an Ancient Stream", zh: "古老溪流留下的鹅卵石" },
    text: {
      en: "Soon after landing in 2012, Curiosity found smooth, round pebbles. Rocks like these form when water flows over them for a long time, so a stream once ran here.",
      zh: "2012 年着陆后不久，好奇号就发现了光滑圆润的鹅卵石。这样的石头是被水长时间冲刷出来的，说明这里曾经有溪流流过。",
    },
    source: MSL,
  },
  jezero: {
    icon: "🏞️",
    title: { en: "An Ancient River Delta", zh: "远古河流三角洲" },
    text: {
      en: "Perseverance is exploring Jezero crater, where a river once flowed into a lake and built a fan-shaped delta. It collects rock samples that may hold signs of ancient life.",
      zh: "毅力号正在探索杰泽罗撞击坑。很久以前，一条河流注入湖泊，在这里堆出了扇形的三角洲。它收集的岩石样本里，可能藏着远古生命的痕迹。",
    },
    source: PERSEVERANCE,
  },
  eva: {
    icon: "🚶",
    title: { en: "Spacewalks Cost Something", zh: "出舱是有代价的" },
    text: {
      en: "Going outside (an EVA) is where astronauts find the best science, but outside the habitat there is less shielding and every breath comes from a tank.",
      zh: "走出舱外（出舱活动，EVA）能找到最好的科学发现，但舱外的防护更少，每一口呼吸都来自氧气罐。",
    },
    lesson: { en: "Farther sites give more science but cost more power, oxygen and radiation.", zh: "越远的地方科学收获越多，但也更费电、费氧气、剂量更高。" },
    source: OSDR,
  },
};
