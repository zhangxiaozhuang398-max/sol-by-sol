# Sol by Sol: Mars Outpost Trainer

A browser game for kids aged 7–12. You run a small base on Mars for 15 sols (Mars days). Every sol you read the morning report, **walk around your 3D base on Mars, travel to 3D survey sites in Jezero crater, and collect samples on foot**, then split a limited amount of power between life support, **oxygen**, a **greenhouse** and a **radiation shield**. At night, **real historical solar storms from NASA's DONKI database** can hit your base.

Built for the **NASA Space Apps Challenge 2026** challenge *Build a Junior Astronaut Mission Trainer*.

**▶ Play:** https://zhangxiaozhuang398-max.github.io/sol-by-sol/ (no download, no account)

**Languages:** English and Simplified Chinese (中文). Use the 🌐 button on any screen, or open the game with `?lang=zh` / `?lang=en`. The choice is remembered in the browser.

## The problem

Space content for kids is usually either too simple (posters and fun facts) or too technical. Few tools let a young player *feel* the engineering trade-offs mission planners face: power spent on a shield tonight is power not spent making oxygen tomorrow, and a trip to a far-away rock costs air, battery and radiation.

## How it plays

Each sol has four phases, shown as a stepper at the top:

1. **Morning report.** Today's and tomorrow's Mars weather decide how much solar power the panels make (clear 80, haze 45, dust storm 10, scaled by how clean the panels are). A space-weather card shows any solar storm warning, and a letter from Earth can reveal the weather for the next few days.
2. **Daytime (3 action points).** You control a **3D astronaut**, on a real HiRISE/CTX surface of Jezero crater (W A S D or arrow keys to walk, drag to look around; an on-screen stick on phones; E to use). At the base, walk to the solar panels to clean them, the greenhouse to tend it, or the antenna to call Earth (the reply only arrives tomorrow morning, because radio takes minutes each way). To survey a site, open the **rover map**, pick one of the ringed sites along the crater's ancient river system, and travel there; you then walk across that site's own 3D surface to the sample ring and press E. Each site has its own low-poly landform and field camp — dunes, a crater rim, a layered cliff, canyon walls, a dry riverbed, delta terraces. Near, medium and far sites give more science the farther they are, but cost more battery, oxygen, action points and radiation. At each site, **Field notes** opens the real science card, the coordinates and the source. Walking back into the habitat airlock ends the day; at a site, use **Return to base**. A readout shows the **real latitude, longitude and elevation** of wherever you are, and the rover map is always one tap away. The same 2D map is the fallback for devices without WebGL.
3. **Night power.** Share the day's power between life support (always on), the O₂ Maker, the greenhouse and the shield room. A live bar and preview show tomorrow's battery, oxygen, food and dose, with plain-language warnings such as *"Dust storm starts tomorrow: keep at least 45 power."*
4. **Night report.** See exactly why each number changed, any real solar storm that hit (with a link to the NASA record), and a **real-story card** about a mission such as Opportunity, InSight, Curiosity or the Veggie garden, with a "what it means for your next decision" line.

### Six things to watch

| Resource | You lose if… |
|---|---|
| 🔋 Battery | life support can't be powered |
| 🫁 Oxygen | it runs out |
| ☢️ Radiation dose | it reaches 100 (it never goes down) |
| 🥫 Food | it runs out (the greenhouse feeds you) |
| 🔆 Panel cleanliness | (no direct loss, but dust means less power) |
| 🔬 Science | (your score: ⭐ for surviving 15 sols, ⭐⭐ at 60, ⭐⭐⭐ at 100) |

### Learning from failure

When a mission ends, the **debrief explains why, using the player's own numbers**, for example *"Sols 4, 6–7: the sunlight was weak but the greenhouse stayed on, using 45 extra power"* or *"Sol 9: you went outside during a solar storm and the dose jumped by 18."* Each of the four ways to lose (power, oxygen, food, radiation) has its own analysis and two tips for the next try. A chart of battery, oxygen and dose (with dust storms and solar storms marked) and a data table complete the report.

### Designed around trade-offs

- **No free choice.** Every trip, switch and slider costs something.
- **Radiation never goes down.** Resting doesn't heal dose, which teaches that dose accumulates over a mission.
- **Going outside during a solar storm is much worse** (+12 or +18 dose instead of +2 to +4), and the shield room only helps if you pay for it at night.
- **Replayable.** Weather, dust-storm timing and which real storms hit change every mission; "same weather again" replays the same map.
- **Hints, not hand-holding.** Hazy days warn of dust storms; the game never says "you must do X".

### Made for young players

- **Pip the robot** says one short sentence for right now ("A solar storm hits today! Stay inside and turn on the shield tonight."), picked from the game state by `js/kid.js`. Longer explanations are folded under "More details" or "Learn more".
- **Big picture gauges** for air, power and food, each with a face (😊 / 😟 / 😱), a radiation badge, and the numbers kept small.
- **One-sentence knowledge cards.** Every card leads with a single kid-level sentence; the full text, the game lesson and the NASA source sit behind "Learn more".
- **Suggest a plan** at night tries every power setting and picks the safest one, keeping a battery reserve when dark days are forecast. It only suggests: the player can change anything before confirming. In 400 simulated missions, a player who always took the suggestion and did simple daytime jobs survived about 91–95% of the time.

## NASA data used

| Data | How it's used |
|---|---|
| MRO Context Camera (CTX) mosaics of Jezero from [NASA Mars Trek](https://trek.nasa.gov/mars/) (WMTS layers `Jezero_CTX_BlockAdj_dd` and `JEZ_ctx_B_soc_008_orthoMosaic_6m`) | The 2D rover map's ground picture: a real black-and-white orbital photo of the crater, 17.88–18.88°N, 77.16–78.16°E. The whole map is about 19 m per pixel; the west half, where the base and every survey site are, uses the Mars 2020 controlled mosaic at about 9.5 m per pixel. Craters, lava-flow edges and the channels on the delta are all real. |
| HiRISE/CTX mosaic of Jezero, also from [NASA Mars Trek](https://trek.nasa.gov/mars/) (layer `NES_JEZ_MID_Visible_Mosaic_HiRISE_CTX_HRSC_GCS_MARS_07-10-2018`) | The 3D ground around the base and each of the six survey sites: 384 m squares rendered at 1536 px (0.25 m/px), plus 3 km far images. The Mars Trek mosaic tops out at about 0.32 m/px (z17), so the final ~1.3× is resampling, not new detail. Real craters, dunes and the delta are visible underfoot. |
| [NASA 3D Resources](https://nasa3d.arc.nasa.gov/) models | The habitat and dish at the base, and the Perseverance model as the field rover at each site. All are scaled and simplified for the browser; the astronaut is built in code so it can walk. |
| [MGS MOLA gridded topography (MEGDR, 128 pixels/degree)](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html) from NASA's Planetary Data System | The elevation readout while you walk (about 463 m per cell), so players can see that the delta sits higher than the crater floor; also the real skyline around each 3D place, in 120 compass directions. Also defines the map grid. |
| Viking MDIM 2.1 colour mosaic, also from [NASA Mars Trek](https://trek.nasa.gov/mars/) | Colour. CTX has no colour, so each pixel keeps its real CTX brightness and is tinted a natural Mars tone, nudged by the Viking colour at that spot. |
| [NASA DONKI: Space Weather Database Of Notifications, Knowledge, Information](https://ccmc.gsfc.nasa.gov/tools/DONKI/) via the [NASA Open APIs](https://api.nasa.gov/) `DONKI/CME` endpoint | 119 real coronal mass ejections (CMEs) from 2017–2024 drive the two in-game solar storms. Each CME is classed by its measured speed (< 700 km/s small, 700–999 medium, ≥ 1000 big). A big CME makes a *strong* storm; small and medium ones make a *medium* storm. When a storm hits, the game shows its real date, speed, observing instrument, whether it was linked to a solar energetic particle event, and a link to the original DONKI record. Storms from September 2017 and May 2024 unlock their own story cards. |
| [NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/bio/repo/), including its RadLab radiation dosimetry collection | Background for the radiation facts and the dose mechanic. |
| NASA mission information (Curiosity, Perseverance, InSight, Opportunity, Mars Reconnaissance Orbiter, MAVEN, the Veggie plant garden) | Short, sourced story and knowledge cards, each with a link to a NASA page. 22 cards in English and Chinese; places on the map unlock their own cards. |

**Honesty about the map and models.** The ground pictures are real, but several things are not: (1) the colour is a tint added to black-and-white imagery, as described above; (2) the 3D models are NASA 3D Resources models and code-built models, scaled and simplified for the browser; the astronaut is built in code so it can walk, and the field camp is a game set, not a real base; (3) the base and site names such as "Red Dunes" are game elements placed on the real picture, not mapped features; (4) each 3D place (the base and six sites) is a local 384 m patch, not a continuous walkable crater — the rover map abstracts the real distances between sites, and travelling there is a game transition, not a simulation of driving; (5) the dunes, crater rim, cliff, canyon walls and delta terraces around each site are low-poly game geometry, placed for play, not a terrain reconstruction; (6) the ground texture is 1536 px over 384 m from a ~0.32 m/px orbital mosaic, so the last ~1.3× is upsampling and the ground cannot show true ground-level detail. The delta, the Neretva Vallis notch and Perseverance's landing coordinates are real places, and the latitude, longitude and elevation readout is real.

**Honesty about the storm data.** The storm events are real but historical, not live. They were observed by spacecraft near Earth (SOHO, STEREO-A); the game says so on screen and states that their effect on a Mars base is simulated. In-game resource numbers are abstract game units on a 0–100 scale (loosely anchored to real facts, such as sunlight at Mars being about 43% of Earth's); real-world figures appear only in the sourced facts.

To rebuild the ground picture (no key needed): `node scripts/fetch_mars_terrain.mjs` (elevation and Viking colour), then `npm install` and `node scripts/build_mars_map.mjs` (downloads about 1,200 CTX tiles, cached in `.cache/`).

To rebuild the 3D scenes: `npm install`, then `node scripts/build_scenes.mjs` (downloads HiRISE/CTX tiles, cached in `.cache/`).

To refresh the storm data, get a free key at https://api.nasa.gov/, put it in a `.env` file in the project root (this file is git-ignored, so never commit it), then run:

```bash
echo "NASA_API_KEY=your_key" > .env
npm run fetch-data
```

The key is only used by this offline script. The game itself reads the saved JSON file and never calls the API, so no key is exposed in the browser.

## Balance testing

`scripts/simulate.mjs` plays thousands of missions with bot strategies to tune the numbers:

```bash
node scripts/simulate.mjs 3000                 # win rates per strategy
node scripts/simulate.mjs --trace careful 1003 # one mission, sol by sol, plus its debrief
```

Current results (3,000 missions each):

| Bot | Win rate | What it shows |
|---|---|---|
| careful (saves power before dust storms, shields on warnings) | 98% | about two thirds reach ⭐⭐⭐ |
| average (follows on-screen hints, doesn't plan ahead) | 74% | all ⭐⭐ |
| homebody (never leaves the base) | 88% | safe, but only ⭐ |
| novice (ignores warnings and the weather forecast) | 10% | nearly all lose to the first dust storm, which the debrief explains |
| greedy (farthest site every day) | 0% | runs out of power or hits the radiation limit |
| random clicks | 0% | |

## Tech

Plain HTML, CSS and JavaScript (ES modules), no framework, no build step. Hosted on GitHub Pages.

```
index.html, css/style.css
js/config.js   every tunable number, with the real-world fact it is anchored to
js/game.js     pure game logic (seeded, testable): the four phases and all rules
js/report.js   failure / success debrief built from the player's own run
js/sites.js    base + survey sites: 2D terrain-grid positions and the 3D base layout
js/world3d.js  the walkable 3D base and survey sites (three.js): real ground photos, MOLA skyline, NASA models, procedural astronaut
js/world2d.js  fallback top-down Mars surface (canvas): real ground picture, astronaut, minimap
js/audio.js    tiny Web Audio sound bed: clicks, footsteps, wind, chimes, travel whoosh (no audio files)
js/vendor/     three.js, GLTFLoader and DRACOLoader, served locally (no CDN)
assets/models/ NASA 3D Resources models: habitat, dish, Perseverance
assets/*.svg   top-down drawings for the 2D map / fallback
js/facts.js    sourced story and knowledge cards (English + Chinese)
js/i18n.js     interface text (English + Chinese)
js/kid.js      Pip the robot guide, one-sentence cards, resource moods, the night "Suggest a plan"
js/main.js     user interface (world prompts, power sliders, report, end screen)
data/space_weather_events.json   curated NASA DONKI events
data/mars/scenes/  384 m real ground photos + 3 km far photos for the 3D scenes
data/mars/     Jezero ground picture (CTX, tinted) as JPEG chunks, MOLA elevation grid, Viking tiles
scripts/       data fetch, 3D scene builder + balance simulation
```

Run locally with any static server, for example `npx serve .` or `python -m http.server`, then open http://localhost:8000. Add `?world=2d` to force the 2D fallback (the game also falls back automatically if WebGL or the 3D assets fail), and `?seed=123` to fix the weather and storms (handy for demos and testing). Progress is saved in the browser, and a "Continue mission" button appears on the title screen.

## Use of AI tools

Code, data scripts and documentation in this repository were written with help from an AI coding assistant (Claude by Anthropic). The team chose the challenge and the game concept direction (survival management with trade-offs), the exploration-map idea and the four-phase day came from a teammate's prototype, and the team reviewed the results. The 3D base and sites (`js/world3d.js`), the procedural astronaut and the scene pipeline (`scripts/build_scenes.mjs`) were written with AI assistance. The NASA 3D models are from NASA 3D Resources, and the ground imagery is real NASA data, not AI-generated. The code-built 3D models (astronaut, greenhouse, solar panels, field camp and landforms in `js/world3d.js`) and the top-down drawings used by the 2D fallback (`assets/*.svg`) are AI-generated; the game labels them as such in the sidebar credit and the footer. All sound is synthesised at runtime by `js/audio.js`; no recorded or AI-generated audio files are used, and there is a sound toggle in the top bar.

## Credits

Student project for NASA Space Apps Challenge 2026 (Singapore). Not an official NASA product, and not endorsed by NASA. Data and 3D models courtesy of NASA (NASA 3D Resources). Jezero imagery courtesy of NASA/JPL/MSSS and NASA Mars Trek. Fonts: Baloo 2 and Nunito (Google Fonts, SIL Open Font License).
