# Sol by Sol: Mars Outpost Trainer

A browser game for kids aged 7–12. You run a small base on Mars for 15 sols (Mars days) until the return rocket launches. Every sol you read the morning report, **walk around a real orbital photo of Jezero crater** to explore and work, then split a limited amount of power between life support, **oxygen**, a **greenhouse** and a **radiation shield**. Solar storms, dust storms and wearing-out parts are hidden: the only way to see them coming is to **call Earth**, just like a real crew depends on mission control. The storms themselves are **real historical solar storms from NASA's DONKI database**.

Built for the **NASA Space Apps Challenge 2026** challenge *Build a Junior Astronaut Mission Trainer*.

**▶ Play:** https://zhangxiaozhuang398-max.github.io/sol-by-sol/ (no download, no account; works on computers and phones)

**Languages:** English and Simplified Chinese (中文). Use the 🌐 button on any screen, or open the game with `?lang=zh` / `?lang=en`. The game always opens in English; a language picked with 🌐 is kept while the tab stays open.

## The problem

Space content for kids is usually either too simple (posters and fun facts) or too technical. Few tools let a young player *feel* the trade-offs mission planners face: power spent on a shield tonight is power not spent making oxygen tomorrow, a trip to a far-away rock costs air, battery and radiation, and an hour spent talking to Earth is an hour not spent exploring, but it may be the only warning of a storm.

## How it plays

Each sol has four phases, shown at the top of the screen:

1. **Morning report.** Today's weather sets how much solar power the panels make (clear 62, haze 36, dust storm 14, scaled by how clean the panels are). Tomorrow's weather and the Sun are **unknown** unless Earth has sent a report. Mission Control's orders for the day, any reply from Earth and any newly unlocked blueprint are shown here.
2. **Daytime (3 action points).** You control an astronaut and **walk freely across a real picture of Jezero crater taken by NASA's Mars Reconnaissance Orbiter** (W A S D or arrow keys, click the ground, or an on-screen stick on phones; E to use). Gold arrows lead to today's orders.
   - **Survey sites:** 11 places in six regions of the crater (base plain, lava plains, west delta, crater rim, north fan, far east side). Farther sites give more research but cost more battery, oxygen, action points and radiation. Every sample adds a real kind of Mars rock to the player's collection.
   - **The base:** check and clean the solar panels, tend the greenhouse (no tending, no food), repair a worn part, or **call Earth at the antenna** (1 action point; the reply arrives next morning, because radio takes minutes each way). A report brings the weather from orbit for the next 3 sols, the Sun for the next 2 sols (solar storms), and a check of the base's data for parts that are wearing out.
   - **Hidden dangers:** without a report the crew only gets unreliable hints (radio static before a solar storm, odd readings when a part wears out). On the day a solar storm hits, the radio is blocked, so the call has to come before it. A part that is not fixed in time breaks and costs more to repair.
   - **Equipment:** research unlocks eight NASA-inspired blueprints that the crew builds with action points and power. Tools open new terrain (a drill for lava rock, rope for cliffs and crater walls, a helicopter for the delta front and north fan, a pressurised rover for whole-day expeditions to the east); upgrades improve the base (dust-shedding panels, a better O₂ Maker, a cheaper shield room, a small fission reactor). At **40 research** the crew earns a free extra action point every day, from the next morning.
   - A readout shows the **real latitude, longitude and elevation** of the spot you are standing on. A rover stands at Perseverance's actual landing coordinates. A "simple map" button switches to a click-only map for players who can't or don't want to steer.
3. **Night power.** Share the day's power between life support (always on), the O₂ Maker, the greenhouse and the shield room. A live bar and preview show tomorrow's battery, oxygen, food and dose with plain-language warnings. **"Suggest a plan"** sets a safe split using only what the crew knows; the player can still change anything.
4. **Night report.** See why each number changed, what happened in the night (a windy night, a cold snap, a marsquake, a meteor, an aurora during a solar storm), any real solar storm that hit (with a link to the NASA record), and a **real-story card** about a mission such as Opportunity, InSight, Curiosity or the Veggie garden.

The mission has **three stages**: landing and first steps (sols 1–3), exploring further (4–10), and storm season and launch (11–15, with one big dust storm before launch). Each stage has bonus goals.

### Things to watch

| Supply | You lose if… |
|---|---|
| 🫁 Oxygen | it runs out |
| ⚡ Power | life support can't be powered |
| 🥫 Food | it runs out (only a tended greenhouse grows food) |
| ☢️ Radiation dose | it reaches 100 (it never goes down) |
| 🔬 Research | your score: ⭐ for surviving 15 sols, ⭐⭐ at 80, ⭐⭐⭐ at 120 |

### Made for young players

- **Pip the robot guide** says one short, useful sentence at a time ("A solar storm is coming in 2 sols. Save power for the shield!").
- **Big ring gauges with faces** (😊 good, 😟 getting low, 😱 danger) instead of bare numbers, with an alarm when a supply turns dangerous.
- **One-sentence knowledge cards**, with the full text behind "Learn more".
- **A bouncing arrow** points at the next button on the first sol; **"Look outside"** folds a panel away to see the base, the night sky or the storm.
- **Learning from failure:** when a mission ends, the debrief explains why using the player's own numbers, with tips for the next try and a chart of the whole mission.

### Designed around trade-offs

- **No free choice.** Every trip, switch, slider, call and build costs something.
- **Information has a price.** Calling Earth costs an action point today but is the only reliable warning of storms and failing parts.
- **Radiation never goes down.** Resting doesn't heal dose; going outside during a solar storm adds 20–30 instead of 2–5.
- **Replayable.** Weather, storms, failing parts and which real CMEs hit change every mission; "same weather again" replays the same map.

## Look and sound

- **Four looks**, chosen in **Settings (⚙️)**: *jazz title card* (default: bold colour blocks and a title card that wipes across the screen at each new phase), *mission control 1969*, *cozy outpost* and *classic*.
- **Cartoon drawings** of the base, the survey sites and the rover, seen at an angle so kids recognise each building, standing on the real orbital photo.
- **Music:** a small jazz combo synthesized live in the browser (no audio files). It follows the game: bright swing in the morning, a softer version by day, bass and long chords at night, a tense beat on storm days.
- **Real sounds from Mars:** the wind heard by Perseverance's microphone plays softly by day, sampling plays the real sound of Perseverance's laser zapping rock, and rover trips play the rover driving in Jezero crater.
- Settings has separate volume sliders for music, Mars sounds and effects.

## NASA data used

| Data | How it's used |
|---|---|
| MRO Context Camera (CTX) mosaics of Jezero from [NASA Mars Trek](https://trek.nasa.gov/mars/) (WMTS layers `Jezero_CTX_BlockAdj_dd` and `JEZ_ctx_B_soc_008_orthoMosaic_6m`) | The ground you walk on: a real black-and-white orbital photo of the crater, 17.88–18.88°N, 77.16–78.16°E. The whole map is about 19 m per pixel; the west half uses the Mars 2020 controlled mosaic at about 9.5 m per pixel. Craters, lava-flow edges and the channels on the delta are all real. |
| [MGS MOLA gridded topography (MEGDR, 128 pixels/degree)](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html) from NASA's Planetary Data System | The elevation readout while you walk (about 463 m per cell), so players can see that the delta sits higher than the crater floor. Also defines the map grid. |
| Viking MDIM 2.1 colour mosaic, also from [NASA Mars Trek](https://trek.nasa.gov/mars/) | Colour. CTX has no colour, so each pixel keeps its real CTX brightness and is tinted a natural Mars tone, nudged by the Viking colour at that spot. |
| [NASA DONKI: Space Weather Database Of Notifications, Knowledge, Information](https://ccmc.gsfc.nasa.gov/tools/DONKI/) via the [NASA Open APIs](https://api.nasa.gov/) `DONKI/CME` endpoint | 119 real coronal mass ejections (CMEs) from 2017–2024 drive the two in-game solar storms. Each CME is classed by its measured speed (< 700 km/s small, 700–999 medium, ≥ 1000 big); a big CME makes a *strong* storm, others a *moderate* one. When a storm hits, the game shows its real date, speed, observing instrument, whether it was linked to a solar energetic particle event, and a link to the original DONKI record. |
| Perseverance microphone recordings from NASA's [Sounds of Mars](https://science.nasa.gov/mission/mars-2020-perseverance/sounds-of-mars/) | Real Mars wind, laser shots and rover driving, used as ambience (see Credits). |
| [NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/bio/repo/), including its RadLab radiation dosimetry collection | Background for the radiation facts and the dose mechanic. |
| NASA mission and technology information (Curiosity, Perseverance, MOXIE, Ingenuity, InSight, Opportunity, MRO, MAVEN, the Deep Space Network, Veggie, Kilopower and more) | 29 short, sourced story and knowledge cards and 9 technology cards, each with a link to a NASA page, in English and Chinese. |

**Honesty about the map.** The ground picture is real, but three things are not: (1) the colour is a tint added to a black-and-white photo; (2) the base, rover, astronaut and survey sites are drawings, shown far larger than life so they can be seen at this scale (one map cell is about 463 m, so a real habitat would be a dot); (3) the base and site names such as "Red Dunes" are game elements placed on the real picture, not mapped features. The delta, the Neretva Vallis notch and Perseverance's landing coordinates are real places, and the latitude, longitude and elevation readout is real.

**Honesty about the storm data.** The storm events are real but historical, not live. They were observed by spacecraft near Earth (SOHO, STEREO-A); the game says so on screen and states that their effect on a Mars base is simulated. Resource numbers are abstract game units on a 0–100 scale, loosely anchored to real facts (each anchor is noted in `js/config.js`); real-world figures appear only in the sourced cards.

To rebuild the ground picture (no key needed): `node scripts/fetch_mars_terrain.mjs` (elevation and Viking colour), then `npm install` and `node scripts/build_mars_map.mjs` (downloads about 1,200 CTX tiles, cached in `.cache/`).

To refresh the storm data, get a free key at https://api.nasa.gov/, put it in a `.env` file in the project root (this file is git-ignored, so never commit it), then run:

```bash
echo "NASA_API_KEY=your_key" > .env
npm run fetch-data
```

The key is only used by this offline script. The game itself reads the saved JSON file and never calls the API, so no key is exposed in the browser.

## Balance testing

`scripts/balance.html` plays hundreds of missions with bot players and prints how often each wins. Open it from the local server, for example http://localhost:8000/scripts/balance.html?games=600 (`?apb=…` and `?start=…` try other research rewards and starting supplies).

Current results (600 missions each):

| Bot | Win rate | What it shows |
|---|---|---|
| idle (does nothing) | 0% | the greenhouse needs tending, so the food runs out |
| reckless (farthest sites, ignores warnings) | 11% | lots of research, but power and food run out |
| orders (does Mission Control's orders, nothing more) | 46% | most losses are power in the dust storm |
| ordersPip (also follows Pip's tips) | 54% | |
| ordersCall (also calls Earth regularly) | 74% | calling Earth is the biggest single lever; about 1 in 6 reach ⭐⭐⭐ |
| planner (calls Earth, repairs, saves power before storms) | 83% | nearly all ⭐⭐ |

`node scripts/simulate.mjs` is the older Node version; its bots do not know the newer rules (calling Earth, repairs, building).

## Tech

Plain HTML, CSS and JavaScript (ES modules), no framework, no build step. Hosted on GitHub Pages.

```
index.html, css/style.css, css/layout.css
css/themes/    the looks: jazz.css (default), mission.css, cozy.css, or classic (no theme file)
js/config.js   every tunable number, with the real-world fact it is anchored to
js/game.js     pure game logic (seeded, testable): the four phases and all rules
js/report.js   failure / success debrief built from the player's own run
js/sites.js    survey sites, regions and base stations, placed on the real terrain grid
js/world2d.js  the walkable Mars surface (canvas): real ground picture, drawings, astronaut, minimap
js/facts.js    sourced story, knowledge and technology cards (English + Chinese)
js/i18n.js     interface text (English + Chinese)
js/main.js     user interface (world prompts, power sliders, reports, settings, end screen)
js/kid.js      kid-friendly layer: Pip the robot guide, one-sentence cards, rocks, "Suggest a plan"
js/audio.js    sound effects, the real Mars recordings, and the volume groups
js/music.js    background music: a small jazz combo synthesized live, with moods for morning, day, night and storms
assets/        cartoon drawings of the base, survey sites and rover (from scripts/draw_buildings.mjs and scripts/draw_sites.mjs), and the astronaut (SVG)
assets/audio/  real sounds recorded on Mars by NASA's Perseverance rover (see Credits)
data/space_weather_events.json   curated NASA DONKI events
data/mars/     Jezero ground picture (CTX, tinted) as JPEG chunks, MOLA elevation grid, Viking tiles
scripts/       data fetch, map building, drawings, balance testing
```

Run locally with any static server, for example `npx serve .` or `python -m http.server`, then open http://localhost:8000. Add `?seed=123` to fix the weather and storms (handy for demos and testing), or `?theme=mission` to try a look. Progress is saved in the browser, and a "Continue mission" button appears on the title screen.

## Use of AI tools

Code, data scripts and documentation in this repository were written with help from an AI coding assistant (Claude by Anthropic). The team chose the challenge and the game concept direction (survival management with trade-offs); the exploration map, the four-phase day, the daily orders, the technology line, calling Earth and the crater regions came from the team's own designs and prototypes, and the team reviewed and play-tested the results. The cartoon drawings of the base buildings, the survey sites and the rover (drawn by code in `scripts/draw_buildings.mjs` and `scripts/draw_sites.mjs`) and the astronaut drawing (`assets/*.svg`) are AI-generated vector art; the game labels them as such on screen and in the footer. The ground picture is real NASA imagery, not AI-generated. The music and most sound effects are synthesized live by code (`js/audio.js`, `js/music.js`): original, and the code was written with AI help. The Mars wind, laser and driving sounds are real recordings by NASA's Perseverance rover. No AI-generated audio or video is used.

## Credits

Student project for NASA Space Apps Challenge 2026 (Singapore). Not an official NASA product, and not endorsed by NASA. Data courtesy of NASA. Fonts: Baloo 2, Nunito, Bebas Neue, Oswald, IBM Plex Mono, IBM Plex Sans Condensed and Fredoka (Google Fonts, SIL Open Font License).

Sounds from Mars (`assets/audio`), recorded by NASA's Perseverance rover, from NASA's [Sounds of Mars](https://science.nasa.gov/mission/mars-2020-perseverance/sounds-of-mars/) pages:

- `mars_wind_sol1.mp3`: [First Audio Recording of Sounds on Mars](https://science.nasa.gov/resource/first-audio-recording-of-sounds-on-mars), SuperCam microphone, sol 1. Credit: NASA/JPL-Caltech/LANL/CNES/CNRS/ISAE-Supaero.
- `mars_laser_sol12.mp3`: [First Acoustic Recording of Laser Shots on Mars](https://science.nasa.gov/resource/first-acoustic-recording-of-laser-shots-on-mars/), SuperCam, sol 12. Credit: NASA/JPL-Caltech/LANL/CNES/CNRS/ISAE-Supaero.
- `mars_drive_sol16.mp3`: [Sounds of Perseverance Mars Rover Driving, Sol 16 (90-second highlights)](https://science.nasa.gov/resource/sounds-of-perseverance-mars-rover-driving-sol-16-90-second-highlights/). Credit: NASA/JPL-Caltech.

The files are used unchanged; the game only loops, fades and sets their volume.
