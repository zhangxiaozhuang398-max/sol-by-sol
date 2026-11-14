// Short, kid-friendly science facts shown as nightly tips and collectible
// knowledge cards. Every fact names where it comes from.

const DONKI = { label: "NASA DONKI space weather database", url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" };
const RADLAB = { label: "NASA Open Science Data Repository (OSDR)", url: "https://osdr.nasa.gov/bio/repo/" };
const MARS = { label: "NASA Mars science", url: "https://science.nasa.gov/mars/" };
const PERSEVERANCE = { label: "NASA Mars 2020 Perseverance mission", url: "https://science.nasa.gov/mission/mars-2020-perseverance/" };
const INSIGHT = { label: "NASA InSight mission", url: "https://science.nasa.gov/mission/insight/" };
const MSL = { label: "NASA Curiosity rover mission", url: "https://science.nasa.gov/mission/msl-curiosity/" };

export const FACTS = {
  cme: {
    icon: "☀️",
    title: "Solar Storms",
    text: "Sometimes the Sun throws out a giant cloud of charged particles called a coronal mass ejection (CME). Fast ones travel more than 1,000 km every second!",
    source: DONKI,
  },
  mars2017: {
    icon: "🔴",
    title: "A Storm Seen at Mars",
    text: "In September 2017 a solar storm was so strong that NASA's Curiosity rover and MAVEN orbiter both detected it at Mars.",
    source: MSL,
  },
  radiationAddsUp: {
    icon: "☢️",
    title: "Radiation Adds Up",
    text: "Radiation dose builds up over a whole mission and does not go away when you rest. That's why NASA sets a lifetime limit for every astronaut.",
    source: RADLAB,
  },
  marsRadiation: {
    icon: "📟",
    title: "Measuring Mars Radiation",
    text: "Curiosity's RAD instrument measures radiation on the surface of Mars. A day there gives roughly a hundred times more radiation than a day on Earth's surface.",
    source: RADLAB,
  },
  thinAir: {
    icon: "🌬️",
    title: "No Magnetic Shield",
    text: "Earth's magnetic field and thick air protect us from space radiation. Mars has no global magnetic field and its air is less than 1% as thick as Earth's.",
    source: MARS,
  },
  forecast: {
    icon: "🔭",
    title: "Space Weather Forecasts",
    text: "Scientists watch the Sun with spacecraft to predict when a solar storm will arrive, but forecasts can be hours off, or miss a storm completely.",
    source: DONKI,
  },
  regolith: {
    icon: "🧱",
    title: "Shield Made of Dirt",
    text: "Mission planners study piling Martian soil, called regolith, on top of a habitat. A thick layer of soil blocks a lot of radiation and costs nothing to ship from Earth.",
    source: MARS,
  },
  dustStorm: {
    icon: "🌪️",
    title: "Dust Storms",
    text: "Mars dust storms can block sunlight for weeks. In 2018 a planet-wide dust storm covered the Opportunity rover's solar panels and its mission ended.",
    source: MARS,
  },
  dustDevil: {
    icon: "🌀",
    title: "Helpful Dust Devils",
    text: "Spinning winds called dust devils sometimes blew dust off the solar panels of the Spirit and Opportunity rovers, giving them a surprise power boost.",
    source: MARS,
  },
  moxie: {
    icon: "🫁",
    title: "Making Oxygen on Mars",
    text: "Perseverance carried an experiment called MOXIE that made real oxygen out of the carbon dioxide in Mars's air. It needs electricity to work.",
    source: PERSEVERANCE,
  },
  commDelay: {
    icon: "📡",
    title: "Waiting for Earth",
    text: "Radio messages take between about 3 and 22 minutes to travel one way between Earth and Mars, so astronauts can't always wait for Mission Control to answer.",
    source: MARS,
  },
  coldNights: {
    icon: "🥶",
    title: "Freezing Nights",
    text: "Nights on Mars often fall below -70 °C. A base needs power for heaters all night, even when the solar panels are dark.",
    source: MARS,
  },
  sol: {
    icon: "🕰️",
    title: "What is a Sol?",
    text: "A day on Mars is called a sol. It lasts about 24 hours and 39 minutes, a little longer than a day on Earth.",
    source: MARS,
  },
  marsquake: {
    icon: "🌋",
    title: "Marsquakes",
    text: "NASA's InSight lander listened to the inside of Mars and detected more than 1,300 marsquakes.",
    source: INSIGHT,
  },
  eva: {
    icon: "🚶",
    title: "Spacewalks Cost Something",
    text: "Going outside (an EVA) is where astronauts find the best science, but outside the habitat there is less shielding and every breath comes from a tank.",
    source: RADLAB,
  },
};
