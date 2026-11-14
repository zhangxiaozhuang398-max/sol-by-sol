// Short, kid-friendly science facts shown as nightly tips and collectible
// knowledge cards, in English and Simplified Chinese. Every fact names its source.

const DONKI = { label: { en: "NASA DONKI space weather database", zh: "NASA DONKI 太空天气数据库" }, url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" };
const OSDR = { label: { en: "NASA Open Science Data Repository (OSDR)", zh: "NASA 开放科学数据库（OSDR）" }, url: "https://osdr.nasa.gov/bio/repo/" };
const MARS = { label: { en: "NASA Mars science", zh: "NASA 火星科学" }, url: "https://science.nasa.gov/mars/" };
const PERSEVERANCE = { label: { en: "NASA Mars 2020 Perseverance mission", zh: "NASA 毅力号任务" }, url: "https://science.nasa.gov/mission/mars-2020-perseverance/" };
const INSIGHT = { label: { en: "NASA InSight mission", zh: "NASA 洞察号任务" }, url: "https://science.nasa.gov/mission/insight/" };
const MSL = { label: { en: "NASA Curiosity rover mission", zh: "NASA 好奇号任务" }, url: "https://science.nasa.gov/mission/msl-curiosity/" };

export const FACTS = {
  cme: {
    icon: "☀️",
    title: { en: "Solar Storms", zh: "太阳风暴" },
    text: {
      en: "Sometimes the Sun throws out a giant cloud of charged particles called a coronal mass ejection (CME). Fast ones travel more than 1,000 km every second!",
      zh: "太阳有时会抛出一大团带电粒子，叫做日冕物质抛射（CME）。快的每秒能飞 1000 多公里！",
    },
    source: DONKI,
  },
  mars2017: {
    icon: "🔴",
    title: { en: "A Storm Seen at Mars", zh: "在火星上看到的风暴" },
    text: {
      en: "In September 2017 a solar storm was so strong that NASA's Curiosity rover and MAVEN orbiter both detected it at Mars.",
      zh: "2017 年 9 月，一场太阳风暴强到连 NASA 的好奇号火星车和 MAVEN 轨道器都在火星上探测到了它。",
    },
    source: MSL,
  },
  radiationAddsUp: {
    icon: "☢️",
    title: { en: "Radiation Adds Up", zh: "辐射会累积" },
    text: {
      en: "Radiation dose builds up over a whole mission and does not go away when you rest. That's why NASA sets a lifetime limit for every astronaut.",
      zh: "辐射剂量会在整个任务中一点点累积，休息也不会让它消失。所以 NASA 给每位宇航员都设定了终生剂量上限。",
    },
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
      en: "Earth's magnetic field and thick air protect us from space radiation. Mars has no global magnetic field and its air is less than 1% as thick as Earth's.",
      zh: "地球的磁场和厚厚的大气保护我们不受太空辐射伤害。火星没有全球磁场，大气也稀薄得不到地球的 1%。",
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
    source: MARS,
  },
  dustStorm: {
    icon: "🌪️",
    title: { en: "Dust Storms", zh: "沙尘暴" },
    text: {
      en: "Mars dust storms can block sunlight for weeks. In 2018 a planet-wide dust storm covered the Opportunity rover's solar panels and its mission ended.",
      zh: "火星沙尘暴能遮住阳光好几个星期。2018 年，一场覆盖整个火星的沙尘暴盖住了机遇号火星车的太阳能板，它的任务也因此结束了。",
    },
    source: MARS,
  },
  dustDevil: {
    icon: "🌀",
    title: { en: "Helpful Dust Devils", zh: "帮忙的尘卷风" },
    text: {
      en: "Spinning winds called dust devils sometimes blew dust off the solar panels of the Spirit and Opportunity rovers, giving them a surprise power boost.",
      zh: "旋转的风叫做尘卷风。它有时会把勇气号和机遇号火星车太阳能板上的灰尘吹走，让它们突然多了不少电。",
    },
    source: MARS,
  },
  moxie: {
    icon: "🫁",
    title: { en: "Making Oxygen on Mars", zh: "在火星上制造氧气" },
    text: {
      en: "Perseverance carried an experiment called MOXIE that made real oxygen out of the carbon dioxide in Mars's air. It needs electricity to work.",
      zh: "毅力号火星车带着一个叫 MOXIE 的实验装置，它用火星空气里的二氧化碳制造出了真正的氧气。它需要电才能工作。",
    },
    source: PERSEVERANCE,
  },
  commDelay: {
    icon: "📡",
    title: { en: "Waiting for Earth", zh: "等待地球回复" },
    text: {
      en: "Radio messages take between about 3 and 22 minutes to travel one way between Earth and Mars, so astronauts can't always wait for Mission Control to answer.",
      zh: "无线电信号在地球和火星之间单程要走大约 3 到 22 分钟，所以宇航员不能总是等任务控制中心回答。",
    },
    source: MARS,
  },
  coldNights: {
    icon: "🥶",
    title: { en: "Freezing Nights", zh: "冰冷的夜晚" },
    text: {
      en: "Nights on Mars often fall below -70 °C. A base needs power for heaters all night, even when the solar panels are dark.",
      zh: "火星的夜晚常常低于零下 70 °C。即使太阳能板不发电，基地整晚都需要电来开暖气。",
    },
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
  marsquake: {
    icon: "🌋",
    title: { en: "Marsquakes", zh: "火星地震" },
    text: {
      en: "NASA's InSight lander listened to the inside of Mars and detected more than 1,300 marsquakes.",
      zh: "NASA 的洞察号着陆器聆听火星内部的声音，探测到了 1300 多次火星地震。",
    },
    source: INSIGHT,
  },
  eva: {
    icon: "🚶",
    title: { en: "Spacewalks Cost Something", zh: "出舱是有代价的" },
    text: {
      en: "Going outside (an EVA) is where astronauts find the best science, but outside the habitat there is less shielding and every breath comes from a tank.",
      zh: "走出舱外（出舱活动，EVA）能找到最好的科学发现，但舱外的防护更少，每一口呼吸都来自氧气罐。",
    },
    source: OSDR,
  },
};
