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

  // ---- talking to Earth ----
  dsn: {
    icon: "📡",
    title: { en: "The Deep Space Network", zh: "深空网络" },
    text: {
      en: "NASA talks to faraway spacecraft through three giant dish stations: in California, Spain and Australia. They are spread around the world so that one of them can always see Mars as the Earth turns.",
      zh: "NASA 靠三处巨型天线站和远方的航天器通话：分别在美国加州、西班牙和澳大利亚。它们分布在地球的不同位置，所以地球转动时，总有一处能“看见”火星。",
    },
    lesson: {
      en: "Earth sees what the base cannot: the Sun, the weather from orbit and worn-out parts in your data. But each call costs an action point.",
      zh: "地球能看到基地看不到的东西：太阳、轨道上看到的天气、你数据里快坏的零件。但每次呼叫都要花一个行动点。",
    },
    source: { label: { en: "NASA Deep Space Network", zh: "NASA 深空网络" }, url: "https://www.nasa.gov/communicating-with-missions/dsn/" },
  },

  blackout: {
    icon: "📻",
    title: { en: "Radio Blackout", zh: "无线电中断" },
    text: {
      en: "When a solar storm hits, its fast particles fill the air high above Mars and can block radio signals. That is why the crew has to ask Earth before the storm arrives, not on the day itself.",
      zh: "太阳风暴来的时候，高速粒子会充满火星高空，挡住无线电信号。所以宇航员必须在风暴到来之前问地球，而不是等到风暴当天。",
    },
    lesson: { en: "Call Earth a day or two ahead: on the storm day itself, the radio only hisses.", zh: "提前一两天呼叫地球：风暴当天，收音机里只有沙沙声。" },
    source: MARS,
  },
  aurora: {
    icon: "🌌",
    title: { en: "A Green Aurora on Mars", zh: "火星上的绿色极光" },
    text: {
      en: "On 18 March 2024, after a solar storm, Perseverance photographed a faint green glow in the night sky: the first aurora ever seen from the surface of another planet. Mars has no global magnetic field, so its aurora can spread across the whole sky.",
      zh: "2024 年 3 月 18 日，一场太阳风暴过后，毅力号拍到夜空里有一层淡淡的绿光：这是人类第一次从另一颗行星的地面上看到极光。火星没有全球磁场，所以它的极光能铺满整个天空。",
    },
    source: { label: { en: "NASA JPL: First visible-light auroras at Mars", zh: "NASA JPL：首次在火星观测到可见光极光" }, url: "https://www.jpl.nasa.gov/news/nasa-observes-first-visible-light-auroras-at-mars/" },
  },

  // ---- the new places on the map ----
  meteorite: {
    icon: "☄️",
    title: { en: "Meteorites on Mars", zh: "火星上的陨石" },
    text: {
      en: "In 2005 the Opportunity rover found a basketball-sized lump of iron and nickel: the first meteorite ever found on another planet. Curiosity has found several more since.",
      zh: "2005 年，机遇号火星车发现了一块篮球大小的铁镍块：这是人类第一次在另一颗行星上发现陨石。后来好奇号又发现了好几块。",
    },
    source: MARS,
  },
  igneous: {
    icon: "🌋",
    title: { en: "A Lake Floor Made of Lava", zh: "湖底竟是熔岩" },
    text: {
      en: "Scientists expected the floor of Jezero crater to be lake mud. Perseverance found something else: rocks that formed from hot, melted rock. Rocks like these keep a clock inside them, so in a lab they can tell exactly how old they are.",
      zh: "科学家原以为杰泽罗撞击坑的地面是湖底的泥。毅力号却发现，这里的岩石是滚烫的熔岩冷却形成的。这种岩石里藏着一只“时钟”，放进实验室就能测出它的准确年龄。",
    },
    source: PERSEVERANCE,
  },
  openLake: {
    icon: "🌊",
    title: { en: "A Lake With a Way Out", zh: "有出口的湖" },
    text: {
      en: "Two rivers flowed into the Jezero lake, from the west and from the north, and each left a fan of sand where it entered. On the east side, a valley shows where the full lake spilled over the crater rim.",
      zh: "曾有两条河从西边和北边流进杰泽罗湖，每条河在入口处都留下了一片扇形的沙。在东边，有一条河谷记录着湖水满了以后漫过撞击坑边缘流出去的地方。",
    },
    lesson: { en: "Far sites need a whole day: go when the battery is full and Earth says the Sun is quiet.", zh: "远征要用一整天：电池满了、地球说太阳很平静的时候再去。" },
    source: MRO,
  },
  craterAges: {
    icon: "🌑",
    title: { en: "Counting Craters", zh: "数撞击坑" },
    text: {
      en: "Space rocks have hit Mars all through its history. So ground with many craters is old, and ground with few craters is young. Scientists date whole regions this way, using pictures from orbit.",
      zh: "太空岩石在火星的整个历史里一直在撞击它。所以撞击坑多的地面很古老，坑少的地面比较年轻。科学家就用轨道器拍的照片这样给整片地区“算年龄”。",
    },
    source: MRO,
  },
};

// ---- field discoveries: shown the first time the crew collects a sample at a survey site ----
// Each has four short parts: what went into the sample tube, what it tells us (science), why it
// matters for future explorers, and the real missions behind it (history). Every one names its source.
export const SITE_STORIES = {
  dune: {
    sample: { en: "Dark, fine sand scooped from the sunlit side of a dune.", zh: "从沙丘向阳面铲来的深色细沙。" },
    science: {
      en: "Dunes are shaped by wind. The size of the grains and the way a dune points show how hard the wind blows and where it comes from. Mars's air is less than 1% as thick as Earth's, yet it still moves sand.",
      zh: "沙丘是风堆出来的。沙粒有多大、沙丘朝哪边，能告诉我们风有多强、从哪儿吹来。火星的大气还不到地球的 1%，却照样吹得动沙子。",
    },
    future: {
      en: "Dust and sand cover solar panels and wear out spacesuit joints and wheels. Knowing the winds helps engineers design tougher gear, and helps future crews choose where to land and build.",
      zh: "沙尘会盖住太阳能板，还会磨坏宇航服的关节和车轮。摸清了风的脾气，工程师就能设计出更耐用的装备，未来的宇航员也能选好在哪儿降落、在哪儿建基地。",
    },
    history: {
      en: "In 2015 NASA's Curiosity rover drove up to the Bagnold Dunes in Gale crater. It was the first time anyone had studied active sand dunes on another planet up close.",
      zh: "2015 年，NASA 的好奇号火星车开到了盖尔撞击坑的巴格诺尔德沙丘旁。这是人类第一次在另一颗行星上近距离研究还在移动的沙丘。",
    },
    source: MSL,
  },
  crater: {
    sample: { en: "Broken rock that the impact threw out from deep underground.", zh: "撞击时从地下深处抛出来的碎岩石。" },
    science: {
      en: "A crater is a natural drill hole. The impact dug up rock from far below and spread it around the rim, so scientists can study layers they could never dig down to. Counting craters also tells how old the ground is: more craters means older ground.",
      zh: "撞击坑就像大自然打的钻孔。撞击把很深的岩石挖出来，撒在坑边上，科学家就能研究原本挖不到的地层。数一数撞击坑还能知道地面有多老：坑越多，地面越古老。",
    },
    future: {
      en: "Some fresh craters uncover ice hidden under the soil. Future astronauts could melt ice like that for drinking water, and split it to make oxygen and rocket fuel, instead of carrying it all from Earth.",
      zh: "有些新撞出来的坑会露出藏在土里的冰。未来的宇航员可以把这样的冰化成饮用水，还能分解成氧气和火箭燃料，不用什么都从地球带。",
    },
    history: {
      en: "On 24 December 2021 NASA's InSight lander felt Mars shake: a space rock had dug a crater about 150 metres wide. The Mars Reconnaissance Orbiter photographed it and saw blocks of ice thrown out around it.",
      zh: "2021 年 12 月 24 日，NASA 的洞察号着陆器感觉到火星在震动：一块太空岩石砸出了一个约 150 米宽的坑。火星勘测轨道飞行器拍下了它，还看到坑边散落着被抛出来的冰块。",
    },
    source: INSIGHT,
  },
  cliff: {
    sample: { en: "A thin core of rock drilled from one layer of the cliff.", zh: "从岩壁的一层里钻出来的细长岩芯。" },
    science: {
      en: "Rock layers pile up over time, so the lowest layer is the oldest. Reading them from bottom to top is like turning the pages of a diary: it shows how Mars changed from a world with lakes and rivers into a cold desert.",
      zh: "岩层是一层层慢慢堆起来的，所以最下面的最老。从下往上读，就像翻一本日记：它记下了火星怎样从有湖有河的世界，变成寒冷的沙漠。",
    },
    future: {
      en: "Layers tell explorers where water once stood and which rocks hold useful minerals. They also show how a planet can lose its water and air, which helps us understand and look after Earth's climate.",
      zh: "岩层能告诉探险者哪里曾经有水、哪些岩石里有用得上的矿物。它们还记录了一颗行星怎样失去水和空气，这能帮我们读懂并爱护地球的气候。",
    },
    history: {
      en: "Curiosity has been climbing Mount Sharp, a mountain of layered rock about 5 km high in Gale crater, since 2014. Here in Jezero, Perseverance photographed a layered hill called Kodiak that shows how the ancient lake rose and fell.",
      zh: "从 2014 年起，好奇号就在盖尔撞击坑里攀登夏普山，那是一座约 5 公里高、由层层岩石组成的山。在杰泽罗这里，毅力号拍下了一座叫“科迪亚克”的层状小山，它记录了古湖水位的涨落。",
    },
    source: MSL,
  },
  riverbed: {
    sample: { en: "Smooth, round pebbles picked from the old stream bed.", zh: "从古河床里捡来的光滑圆卵石。" },
    science: {
      en: "Sharp rocks turn round only when water tumbles them along for a long time. The size of the pebbles shows how fast and how deep the stream was.",
      zh: "有棱有角的石头，只有被水冲着滚上很久才会变圆。卵石的大小能告诉我们当年的水流有多急、有多深。",
    },
    future: {
      en: "\"Follow the water\" has guided Mars exploration for decades. Where water once flowed is the best place to look for signs of life, and for the water that future crews will need.",
      zh: "“跟着水走”几十年来一直是火星探测的指南。水流过的地方，最有希望找到生命的痕迹，也最有希望找到未来宇航员需要的水。",
    },
    history: {
      en: "In 2012, only weeks after landing, Curiosity found rocks made of round pebbles stuck together. Scientists worked out that a stream once flowed there, somewhere between ankle-deep and hip-deep.",
      zh: "2012 年，好奇号着陆才几个星期，就发现了由圆卵石粘在一起形成的岩石。科学家推算出那里曾经有一条小溪，水深大约在脚踝到腰之间。",
    },
    source: MSL,
  },
  canyon: {
    sample: { en: "A chip of fine mudstone from the valley wall.", zh: "从谷壁上取下的一小块细腻泥岩。" },
    science: {
      en: "This valley, Neretva Vallis, was cut by a river that broke through the crater's rim and filled Jezero with a lake more than 3 billion years ago.",
      zh: "这条河谷叫内雷特瓦河谷。30 多亿年前，一条河冲破了撞击坑的边缘，从这里流进来，把杰泽罗灌成了一个湖。",
    },
    future: {
      en: "To be certain about what a Mars rock holds, scientists want to study it in laboratories on Earth. Bringing Mars samples home, by robot or by future astronauts, is one of the big goals of Mars exploration.",
      zh: "想确定一块火星岩石里到底有什么，科学家需要把它放进地球上的实验室里研究。把火星样本带回家（靠机器人，或者靠未来的宇航员）是火星探测的大目标之一。",
    },
    history: {
      en: "In 2024 Perseverance drove through this valley and found a rock, nicknamed Cheyava Falls, covered in tiny spots like a leopard's. In 2025 NASA scientists reported that its sample may hold a possible sign of ancient microbes. More study is needed to be sure.",
      zh: "2024 年，毅力号开进这条河谷，发现了一块绰号“切亚瓦瀑布”的岩石，上面布满像豹纹一样的小斑点。2025 年，NASA 的科学家报告说，从它身上取的样本里可能有远古微生物留下的痕迹。要确定这一点，还需要更多研究。",
    },
    source: PERSEVERANCE,
  },
  delta: {
    sample: { en: "Fine mud and sand from the edge of the delta fan.", zh: "从三角洲扇形边缘取来的细泥和细沙。" },
    science: {
      en: "When a river runs into a lake it slows down and drops its mud and sand in the shape of a fan: a delta. Fine mud buries things quickly and keeps them safe, so deltas are some of the best places to find traces of ancient life.",
      zh: "河水流进湖里就会慢下来，把带来的泥沙铺成一把扇子的形状，这就是三角洲。细泥能很快把东西埋起来、保存好，所以三角洲是最有希望找到远古生命痕迹的地方之一。",
    },
    future: {
      en: "The sealed tubes Perseverance has filled are the first samples collected on another planet in the hope of bringing them back to Earth one day. The sample case you are filling works the same way.",
      zh: "毅力号装满并密封的样本管，是人类第一次在另一颗行星上采集、并希望有一天能带回地球的样本。你正在装的样本箱，用的就是同样的办法。",
    },
    history: {
      en: "NASA chose Jezero crater as Perseverance's landing site in 2018 because of this delta. The rover landed on 18 February 2021, and by January 2023 it had laid ten sealed sample tubes on the ground at a spot called Three Forks.",
      zh: "2018 年，NASA 正是因为这片三角洲，才把杰泽罗撞击坑选为毅力号的着陆点。毅力号于 2021 年 2 月 18 日着陆；到 2023 年 1 月，它已经在一个叫“三岔口”的地方，把十支密封的样本管摆在了地面上。",
    },
    source: PERSEVERANCE,
  },

  // ---- the five places further out ----
  meteorite: {
    sample: { en: "A chip of shiny metal, filed off the edge of the meteorite.", zh: "从陨石边上锉下来的一小片闪亮金属。" },
    science: {
      en: "Iron meteorites are pieces of the metal core of a small world that broke apart long ago. How rusty the outside is tells how much water has been around since it landed.",
      zh: "铁陨石是一颗很久以前碎掉的小天体的金属内核碎片。它表面锈了多少，能告诉我们它落地以后周围出现过多少水。",
    },
    future: {
      en: "Metal lying on the surface could one day be a building material for explorers, without carrying it all the way from Earth.",
      zh: "躺在地面上的金属，将来也许能成为探险者的建筑材料，不用千里迢迢从地球运来。",
    },
    history: {
      en: "In January 2005 Opportunity found \"Heat Shield Rock\", an iron meteorite lying next to the rover's own discarded heat shield. It was the first meteorite ever found on another planet.",
      zh: "2005 年 1 月，机遇号在自己丢下的隔热罩旁边发现了一块铁陨石，取名“隔热罩石”。这是人类第一次在另一颗行星上找到陨石。",
    },
    source: MARS,
  },
  lava: {
    sample: { en: "A core of dark rock, from under a patch the drill first ground smooth.", zh: "一段深色岩芯，钻之前先把表面磨平了一小块。" },
    science: {
      en: "This rock cooled from lava. Rocks like it contain tiny radioactive clocks, so a lab on Earth could measure exactly when it formed and give the whole crater a date.",
      zh: "这块岩石是熔岩冷却形成的。这种岩石里有微小的放射性“时钟”，地球上的实验室能精确测出它形成的时间，给整个撞击坑定出年代。",
    },
    future: {
      en: "Knowing the exact age of Mars rocks helps fix the timeline of the whole Solar System, including when Mars lost its water.",
      zh: "知道了火星岩石的准确年龄，就能校准整个太阳系的时间线，包括火星是什么时候失去水的。",
    },
    history: {
      en: "In 2021 Perseverance ground small round patches into the crater floor to look under the dust. To everyone's surprise, the rocks named Máaz and Séítah turned out to be volcanic, not lake mud.",
      zh: "2021 年，毅力号在撞击坑地面上磨出一个个小圆块，看看灰尘下面是什么。出乎所有人意料，叫做“马兹”和“塞伊塔”的岩石原来是火山岩，而不是湖泥。",
    },
    source: PERSEVERANCE,
  },
  northfan: {
    sample: { en: "Pale, layered sand that a second river brought from the north.", zh: "第二条河从北边带来的浅色层状沙子。" },
    science: {
      en: "Jezero had two rivers flowing in. Sand from the north came from different hills than sand from the west, so comparing them shows what rocks lay far beyond the crater.",
      zh: "杰泽罗有两条河流入。北边的沙和西边的沙来自不同的山丘，比一比，就知道撞击坑外很远的地方有什么岩石。",
    },
    future: {
      en: "Flying scouts can look ahead for rovers and astronauts, finding safe paths and the most interesting rocks before anyone drives there.",
      zh: "会飞的侦察兵可以替火星车和宇航员先探路，在出发前找到安全的路线和最值得研究的岩石。",
    },
    history: {
      en: "The little helicopter Ingenuity rode to Jezero under Perseverance. In April 2021 it made the first powered flight on another planet, and it went on to fly 72 times before a damaged rotor ended its mission in January 2024.",
      zh: "小直升机“机智号”挂在毅力号肚子下面来到杰泽罗。2021 年 4 月，它完成了人类在另一颗行星上的第一次动力飞行，后来一共飞了 72 次，直到 2024 年 1 月旋翼损坏才结束任务。",
    },
    source: PERSEVERANCE,
  },
  outlet: {
    sample: { en: "Bedrock from the valley floor, scoured smooth by water that rushed out of the lake.", zh: "河谷底部的基岩，被冲出湖的水流磨得光溜溜的。" },
    science: {
      en: "The teardrop-shaped islands point downstream, like stones in a stream. They show which way the water ran: out of the lake, over the crater rim.",
      zh: "这些泪滴形的小岛都指向下游，就像小溪里的石头。它们说明了水往哪儿流：从湖里出来，越过撞击坑的边缘。",
    },
    future: {
      en: "Long trips like this one will need pressurized rovers, where astronauts can drive for days without spacesuits. Japan's space agency and Toyota are designing one for the Moon.",
      zh: "这样的长途旅行需要加压火星车，宇航员不穿宇航服也能连续开好几天。日本宇宙航空研究开发机构正在和丰田公司一起为月球设计这样的车。",
    },
    history: {
      en: "Scientists studying pictures from orbit in 2005 noticed that Jezero had valleys coming in and a valley going out. That made it an \"open lake\" that once overflowed, one reason it was chosen for Perseverance.",
      zh: "2005 年，科学家研究轨道照片时发现，杰泽罗既有流进来的河谷，也有流出去的河谷。这说明它是一个曾经满溢出去的“开放湖”，这也是毅力号选择这里的原因之一。",
    },
    source: MRO,
  },
  eastcrater: {
    sample: { en: "Rock that a big impact threw up from deep under the crater floor.", zh: "一次大撞击从坑底深处抛上来的岩石。" },
    science: {
      en: "A big impact digs deep. The rocks it throws out come from far below the surface, so one trip here samples layers no drill could reach.",
      zh: "大撞击挖得很深。它抛出来的岩石来自地表下很深的地方，所以来这里一趟，就能采到任何钻头都够不着的地层。",
    },
    future: {
      en: "The insides of deep craters are sheltered from wind, and some hold ice in their shadows. Future explorers will look for places like this to camp and to find water.",
      zh: "深坑里面能挡风，有些坑的阴影里还藏着冰。将来的探险者会找这样的地方扎营、找水。",
    },
    history: {
      en: "Mars orbiters have photographed almost the whole planet. By counting the craters in those pictures, scientists made a timeline of Mars without ever landing at most of the places they dated.",
      zh: "火星轨道器几乎拍遍了整颗星球。科学家数照片里的撞击坑，就给火星排出了一条时间线，而他们测年的大多数地方，从来没有探测器降落过。",
    },
    source: MRO,
  },
};

// ---- the technology line: research unlocks these (thresholds in config.tech) ----
// Each is a real NASA project. `effect` is what it does in the game; `story` is
// the real history, written for 7–12 year olds.
const EDS = { label: { en: "NASA: Electrodynamic Dust Shield on the Moon", zh: "NASA：月球上的电动除尘装置" }, url: "https://www.nasa.gov/image-article/nasas-dust-shield-successfully-repels-lunar-regolith-on-moon/" };
const HABITAT_CHALLENGE = { label: { en: "NASA 3D-Printed Habitat Challenge", zh: "NASA 3D 打印栖息地挑战赛" }, url: "https://www.nasa.gov/prizes-challenges-and-crowdsourcing/centennial-challenges/3d-printed-habitat-challenge/" };
const KILOPOWER = { label: { en: "NASA: Kilopower", zh: "NASA：千瓦级电源项目" }, url: "https://www.nasa.gov/directorates/spacetech/Kilopower" };
const MSR = { label: { en: "NASA Mars Sample Return", zh: "NASA 火星采样返回" }, url: "https://science.nasa.gov/mission/mars-sample-return/" };

export const TECH_INFO = {
  dustShield: {
    icon: "🧲",
    name: { en: "Dust-shedding panels", zh: "电动除尘太阳能板" },
    effect: { en: "Dust settles on the solar panels half as fast.", zh: "太阳能板积灰速度减半。" },
    story: {
      en: "NASA's Electrodynamic Dust Shield uses electric fields to lift dust off a surface, with no brushes and no water. In March 2025 it flew to the Moon on Firefly's Blue Ghost lander and cleared lunar dust from glass and a radiator.",
      zh: "NASA 的电动除尘装置用电场把灰尘从表面“推”走，不用刷子也不用水。2025 年 3 月，它搭乘萤火虫公司的“蓝色幽灵”着陆器登上月球，成功清掉了玻璃和散热板上的月尘。",
    },
    source: EDS,
  },
  moxie2: {
    icon: "🫁",
    name: { en: "Bigger MOXIE oxygen maker", zh: "升级版 MOXIE 制氧机" },
    effect: { en: "The O₂ Maker makes 5 oxygen for every 5 power (it used to make 4).", zh: "制氧机每 5 电能产 5 氧（原来只有 4）。" },
    story: {
      en: "From 2021 to 2023, MOXIE on the Perseverance rover made oxygen out of Mars's carbon-dioxide air 16 times: 122 grams in all, about what a small dog breathes in 10 hours. A bigger version could one day make air for astronauts and fuel for the rocket home.",
      zh: "2021 到 2023 年，毅力号上的 MOXIE 用火星大气里的二氧化碳造了 16 次氧气，一共 122 克，大约是一只小狗 10 小时呼吸的量。将来更大的版本可以给宇航员造空气，还能给回家的火箭造燃料。",
    },
    source: { label: { en: "NASA Mars 2020 Perseverance mission", zh: "NASA 毅力号任务" }, url: "https://science.nasa.gov/mission/mars-2020-perseverance/" },
  },
  shelter: {
    icon: "🧱",
    name: { en: "Mars-soil storm shelter", zh: "火星土壤防护舱" },
    effect: { en: "The shield room needs only 10 power a night (it used to need 20).", zh: "护盾舱每晚只要 10 电（原来要 20）。" },
    story: {
      en: "Heavy walls are expensive to fly from Earth, so engineers want to build with Mars soil instead. From 2015 to 2019 NASA's 3D-Printed Habitat Challenge asked teams to design and print shelters from materials like those found on Mars. A thick layer of soil overhead also blocks much of the space radiation.",
      zh: "从地球运厚重的墙太贵了，所以工程师想直接用火星土来盖房子。2015 到 2019 年，NASA 举办了“3D 打印栖息地挑战赛”，请各队用类似火星上的材料设计并打印房屋。头顶上铺一层厚厚的土，还能挡住大部分太空辐射。",
    },
    source: HABITAT_CHALLENGE,
  },
  fission: {
    icon: "⚛️",
    name: { en: "Small fission power plant", zh: "小型核裂变电站" },
    effect: { en: "+10 power every sunset, even in a dust storm.", zh: "每天日落额外 +10 电，沙尘暴天也照样有。" },
    story: {
      en: "Dust storms hide the Sun, but a small nuclear reactor makes power day and night. In 2018 NASA and the US Department of Energy tested a small reactor called KRUSTY, part of the Kilopower project, in Nevada. NASA is now working on fission power for bases on the Moon and Mars.",
      zh: "沙尘暴会遮住太阳，但小型核反应堆白天黑夜都能发电。2018 年，NASA 和美国能源部在内华达州测试了一座叫 KRUSTY 的小反应堆，它属于“千瓦级电源”项目。现在 NASA 正在为月球和火星基地研制核裂变电源。",
    },
    source: KILOPOWER,
  },

  // ---- tools: the terrain needs them (sites.js `needs`) ----
  drill: {
    icon: "🔩",
    name: { en: "Hard-rock drill bit", zh: "硬岩钻头" },
    effect: { en: "A tougher bit that can grind and core hard volcanic rock. Opens the Lava Floor.", zh: "更结实的钻头，能打磨、钻取坚硬的火山岩。可以去熔岩地面了。" },
    story: {
      en: "Rocks can be tricky. In August 2021 Perseverance drilled its first sample, but the rock was so crumbly that it fell apart into powder and the tube came up empty. Engineers tested look-alike rocks on Earth, picked a harder target, and got the first core a month later.",
      zh: "岩石可不好对付。2021 年 8 月，毅力号钻第一份样本时，那块岩石太松了，一钻就碎成粉末，样本管空空如也。工程师在地球上找来相似的岩石反复测试，换了一块更硬的目标，一个月后终于取到了第一段岩芯。",
    },
    source: { label: { en: "NASA: Assessing Perseverance's first sample attempt", zh: "NASA：分析毅力号的第一次采样" }, url: "https://science.nasa.gov/blog/assessing-perseverances-first-sample-attempt/" },
  },
  rope: {
    icon: "🪢",
    name: { en: "Rope and winch", zh: "绳索与绞盘" },
    effect: { en: "Lets the crew climb cliffs and go down steep crater walls safely. Opens the Layered Cliff, the Canyon Rim and (with the rover) the Deep East Crater.", zh: "让宇航员能安全地攀上岩壁、下到陡峭的坑壁。可以去层状岩壁、峡谷边缘，有了火星车还能去东部深坑。" },
    story: {
      en: "The most interesting rock layers are often on walls too steep to drive down. NASA's JPL built Axel, a two-wheeled robot that rappels down cliffs on a tether, like a climber on a rope. In 2020 a two-part version called DuAxel was tested in California's Mojave Desert.",
      zh: "最有意思的岩层，常常长在车开不下去的陡壁上。NASA 喷气推进实验室造了一台叫 Axel 的两轮机器人，它能像攀岩者那样拴着缆绳从崖壁上滑降。2020 年，它的“双体版” DuAxel 在美国加州的莫哈韦沙漠做了测试。",
    },
    source: { label: { en: "NASA JPL: This transforming rover can explore the toughest terrain", zh: "NASA JPL：能探索最难地形的变形火星车" }, url: "https://www.jpl.nasa.gov/news/this-transforming-rover-can-explore-the-toughest-terrain/" },
  },
  heli: {
    icon: "🚁",
    name: { en: "Scout helicopter", zh: "侦察直升机" },
    effect: { en: "Flies ahead to find a safe way up the steep delta front. Opens the Ancient Lake Delta and the North Fan.", zh: "先飞过去，在陡峭的三角洲前缘找到一条安全的路。可以去古湖三角洲和北部扇形沙地了。" },
    story: {
      en: "Ingenuity rode to Mars under Perseverance and made the first powered flight on another planet in April 2021. It was only meant to fly five times, but it flew 72, scouting routes and interesting places ahead of the rover.",
      zh: "“机智号”挂在毅力号下面来到火星，2021 年 4 月完成了人类在另一颗行星上的第一次动力飞行。它原本只打算飞 5 次，最后飞了 72 次，一直在火星车前面侦察路线、寻找有意思的地方。",
    },
    source: { label: { en: "NASA Ingenuity Mars Helicopter", zh: "NASA 机智号火星直升机" }, url: "https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/" },
  },
  rover: {
    icon: "🚙",
    name: { en: "Pressurised rover", zh: "加压火星车" },
    effect: { en: "A rover with air inside, so the crew can drive all day without spacesuits. Opens the expeditions to the east side.", zh: "车里有空气，宇航员不用穿宇航服也能开一整天。可以远征东边了。" },
    story: {
      en: "A spacesuit only carries air for a few hours, so far trips need a vehicle you can live in. In October 2022 NASA and Japan's space agency tested a pressurised rover in the Arizona desert: crews of two lived, worked and drove in it for three days at a time.",
      zh: "一套宇航服里的空气只够用几个小时，所以远行需要一辆能住人的车。2022 年 10 月，NASA 和日本宇宙航空研究开发机构在美国亚利桑那州的沙漠里测试了一辆加压火星车：每次两名宇航员在车里生活、工作、驾驶，一住就是三天。",
    },
    source: { label: { en: "NASA: Practising rover operations in a simulated lunar environment", zh: "NASA：在模拟月面环境中练习驾驶火星车" }, url: "https://www.nasa.gov/humans-in-space/nasa-practices-rover-operations-in-simulated-lunar-environment/" },
  },

  sampleReturn: {
    icon: "🚀",
    name: { en: "Samples ready to fly home", zh: "样本返航就绪" },
    effect: { en: "The research goal: your science is ready to launch with the samples. Full marks!", zh: "研究目标达成：你的科研成果和样本一起准备发射。满分！" },
    story: {
      en: "Since 2021 Perseverance has sealed rock and soil in tubes so scientists can one day study them in labs on Earth. NASA and the European Space Agency have studied bringing them home with a lander, a small rocket called the Mars Ascent Vehicle and a return orbiter. Exactly how and when is still being worked out.",
      zh: "从 2021 年起，毅力号就把岩石和土壤封进样本管，好让科学家将来在地球实验室里研究。NASA 和欧洲航天局研究过用着陆器、一枚叫“火星上升器”的小火箭和返回轨道器把它们带回家。具体怎么做、什么时候做，还在规划中。",
    },
    source: MSR,
  },
};
