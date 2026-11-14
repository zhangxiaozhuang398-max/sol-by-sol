# Sol by Sol: Mars Outpost Trainer

A browser game for kids aged 7–12. You run a small base on Mars for 15 sols (Mars days). Every sol you read the morning report, **drive the rover to explore the map**, then split a limited amount of power between life support, **oxygen**, a **greenhouse** and a **radiation shield**. At night, **real historical solar storms from NASA's DONKI database** can hit your base.

Built for the **NASA Space Apps Challenge 2026** challenge *Build a Junior Astronaut Mission Trainer*.

**▶ Play:** https://zhangxiaozhuang398-max.github.io/sol-by-sol/ (no download, no account)

**Languages:** English and Simplified Chinese (中文). Use the 🌐 button on any screen, or open the game with `?lang=zh` / `?lang=en`. The choice is remembered in the browser.

## The problem

Space content for kids is usually either too simple (posters and fun facts) or too technical. Few tools let a young player *feel* the engineering trade-offs mission planners face: power spent on a shield tonight is power not spent making oxygen tomorrow, and a trip to a far-away rock costs air, battery and radiation.

## How it plays

Each sol has four phases, shown as a stepper at the top:

1. **Morning report.** Today's and tomorrow's Mars weather decide how much solar power the panels make (clear 80, haze 45, dust storm 10, scaled by how clean the panels are). A space-weather card shows any solar storm warning, and a letter from Earth can reveal the weather for the next few days.
2. **Daytime (3 action points).** Pick a place on the **exploration map**. Near, medium and far sites give more science the farther they are, but cost more battery, oxygen, action points and radiation. Or clean the solar panels, tend the greenhouse, or call Earth (the reply only arrives tomorrow morning, because radio takes minutes each way).
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

## NASA data used

| Data | How it's used |
|---|---|
| [NASA DONKI: Space Weather Database Of Notifications, Knowledge, Information](https://ccmc.gsfc.nasa.gov/tools/DONKI/) via the [NASA Open APIs](https://api.nasa.gov/) `DONKI/CME` endpoint | 119 real coronal mass ejections (CMEs) from 2017–2024 drive the two in-game solar storms. Each CME is classed by its measured speed (< 700 km/s small, 700–999 medium, ≥ 1000 big). A big CME makes a *strong* storm; small and medium ones make a *medium* storm. When a storm hits, the game shows its real date, speed, observing instrument, whether it was linked to a solar energetic particle event, and a link to the original DONKI record. Storms from September 2017 and May 2024 unlock their own story cards. |
| [NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/bio/repo/), including its RadLab radiation dosimetry collection | Background for the radiation facts and the dose mechanic. |
| NASA mission information (Curiosity, Perseverance, InSight, Opportunity, Mars Reconnaissance Orbiter, MAVEN, the Veggie plant garden) | Short, sourced story and knowledge cards, each with a link to a NASA page. 22 cards in English and Chinese; places on the map unlock their own cards. |

**Honesty about the data.** The storm events are real but historical, not live. They were observed by spacecraft near Earth (SOHO, STEREO-A); the game says so on screen and states that their effect on a Mars base is simulated. In-game resource numbers are abstract game units on a 0–100 scale (loosely anchored to real facts, such as sunlight at Mars being about 43% of Earth's); real-world figures appear only in the sourced facts.

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
js/sites.js    places on the exploration map
js/facts.js    sourced story and knowledge cards (English + Chinese)
js/i18n.js     interface text (English + Chinese)
js/main.js     user interface (map, power sliders, report, end screen)
data/space_weather_events.json   curated NASA DONKI events
scripts/       data fetch + balance simulation
```

Run locally with any static server, for example `npx serve .` or `python -m http.server`, then open http://localhost:8000. Add `?seed=123` to fix the weather and storms (handy for demos and testing). Progress is saved in the browser, and a "Continue mission" button appears on the title screen.

## Use of AI tools

Code, data scripts and documentation in this repository were written with help from an AI coding assistant (Claude by Anthropic). The team chose the challenge and the game concept direction (survival management with trade-offs), the exploration-map idea and the four-phase day came from a teammate's prototype, and the team reviewed the results. No AI-generated images, audio or video are used.

## Credits

Student project for NASA Space Apps Challenge 2026 (Singapore). Not an official NASA product, and not endorsed by NASA. Data courtesy of NASA. Fonts: Baloo 2 and Nunito (Google Fonts, SIL Open Font License).
