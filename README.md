# Sol by Sol: Mars Outpost Trainer

A browser game for kids aged 7–12. You run a small base on Mars for 20 sols (Mars days). Every sol you split a limited amount of solar power between **oxygen**, a **radiation shield** and **science**, then pick one action card. At night, **real historical solar storms from NASA's DONKI database** can hit your base.

Built for the **NASA Space Apps Challenge 2026** challenge *Build a Junior Astronaut Mission Trainer*.

**▶ Play:** https://zhangxiaozhuang398-max.github.io/sol-by-sol/ (no download, no account)

**Languages:** English and Simplified Chinese (中文). Use the 🌐 button on any screen, or open the game with `?lang=zh` / `?lang=en`. The choice is remembered in the browser.

## The problem

Space content for kids is usually either too simple (posters and fun facts) or too technical. Few tools let a young player *feel* the engineering trade-offs mission planners face: power spent on a shield tonight is power not spent making oxygen tomorrow.

## How it plays

Each sol has five steps:

1. **Morning report.** Mars weather sets today's solar power (clear 6, haze 4, dust storm 2). A space-weather forecast says *calm*, *watch* or *warning*. Forecasts are not perfect, just like real ones.
2. **Split the power** between three systems (max 3 each). Spare power charges the battery; spending more than the sun gives drains the battery.
   - 🫁 **O₂ Maker:** +1 oxygen per power
   - 🛡️ **Shield:** blocks 1 storm radiation point per power
   - 🔬 **Lab:** +1 science per power
3. **Pick one action card** from three. Every card has a gain *and* a cost (for example, *Crater EVA*: +3 science, but +1 radiation and −1 oxygen).
4. **Night.** The crew breathes (−2 oxygen), heaters use battery (an empty battery means a cold night and extra oxygen loss), cosmic rays add radiation, and solar storms may arrive.
5. **Did you know?** Each night ends with a short science fact and its source.

**Lose** if oxygen reaches 0 or radiation dose reaches 10. **Win** by surviving 20 sols; earn up to 3 stars for science (20 / 35 / 50). A debrief chart shows how your resources changed, lists the real storms you faced with links to their NASA records, and unlocks collectible knowledge cards.

### Designed around trade-offs

- **No free choice.** Every power slot and card has an opportunity cost or a direct cost.
- **Radiation never goes down.** Resting doesn't heal dose, which teaches that dose accumulates over a mission.
- **Only three core resources** (oxygen, battery, radiation dose) so young players aren't overwhelmed.
- **Replayable.** Weather, storm timing, real storm selection and cards change every mission.
- **A preview panel** shows the expected oxygen and battery by morning before you commit, so kids can see the cost of a plan.

## NASA data used

| Data | How it's used |
|---|---|
| [NASA DONKI: Space Weather Database Of Notifications, Knowledge, Information](https://ccmc.gsfc.nasa.gov/tools/DONKI/) via the [NASA Open APIs](https://api.nasa.gov/) `DONKI/CME` endpoint | 119 real coronal mass ejections (CMEs) from 2017–2024 drive the in-game solar storms. Each storm's strength comes from the CME's measured speed (< 700 km/s small, 700–999 medium, ≥ 1000 big). When a storm hits, the game shows its real date, speed, observing instrument, whether it was linked to a solar energetic particle event, and a link to the original DONKI record. |
| [NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/bio/repo/), including its RadLab radiation dosimetry collection | Background for the radiation facts and the dose mechanic. |
| NASA mission information (Curiosity RAD, Perseverance MOXIE, InSight, Spirit/Opportunity, MAVEN) | Short, sourced facts shown as nightly tips and knowledge cards. |

**Honesty about the data.** The storm events are real but historical, not live. They were observed by spacecraft near Earth (SOHO, STEREO-A); the game says so on screen and states that their effect on a Mars base is simulated. In-game resource numbers are abstract game units; real-world figures appear only in the sourced facts.

To refresh the storm data:

```bash
NASA_API_KEY=your_key node scripts/fetch_donki.mjs
```

## Balance testing

`scripts/simulate.mjs` plays thousands of missions with bot strategies to tune the numbers:

```bash
node scripts/simulate.mjs 5000                 # win rates per strategy
node scripts/simulate.mjs --trace careful 1003 # one mission, turn by turn
```

Current results (5,000 missions each): a careful planner wins ~81%; a first-time "novice" who only remembers to make oxygen wins ~24% (most losses are radiation, which teaches them to use the shield); greedy "all science" play and random clicking almost never survive.

## Tech

Plain HTML, CSS and JavaScript (ES modules), no framework, no build step. Hosted on GitHub Pages.

```
index.html, css/style.css
js/game.js     pure game logic (seeded, testable)
js/cards.js    action cards
js/facts.js    sourced science facts (English + Chinese)
js/i18n.js     interface text (English + Chinese)
js/main.js     user interface
data/space_weather_events.json   curated NASA DONKI events
scripts/       data fetch + balance simulation
```

Run locally with any static server, for example `npx serve .` or `python -m http.server`, then open http://localhost:8000.

## Use of AI tools

Code, data scripts and documentation in this repository were written with help from an AI coding assistant (Claude by Anthropic). The team chose the challenge, the game concept direction (roguelike-style survival management) and reviewed the results. No AI-generated images, audio or video are used.

## Credits

Student project for NASA Space Apps Challenge 2026 (Singapore). Not an official NASA product, and not endorsed by NASA. Data courtesy of NASA. Fonts: Baloo 2 and Nunito (Google Fonts, SIL Open Font License).
