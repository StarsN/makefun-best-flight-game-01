# Sky Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/StarsN/makefun-best-flight-game-01/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/StarsN/makefun-best-flight-game-01/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A small original courier flight game. You are the valley's mail pilot: take off from runway 36 in a little yellow prop plane, thread six glowing rings over hills and a lake, then bring her home and land her gently. Fuel is limited, the valley is not flat, and a hard touchdown ends the run.

## How to play

- **1** — Courier Run: take off, fly all six rings in order, land on runway 36.
- **2** — Free Flight: no rings, just fly the valley and land when you like.
- **↑ ↓ ← →** or **W A S D** — pitch and bank; or steer with the **mouse**.
- **Shift** — more throttle, **Ctrl** — less throttle, **Space** — brake on the ground.
- **P** pauses, **M** mutes, **R** restarts.

Score: +250 per ring, plus a landing bonus for a soft, centred touchdown and a fast time. Crash on the terrain or land too hard or too fast and the run is over.

## Run it

No build step, no network requests, no libraries — plain static files, with sounds synthesised by WebAudio.

```sh
# from the repository root, serve the game directory
node serve.ts
# then open http://localhost:8080/ in desktop Chrome
```

Add `?demo=1` to the URL to watch the autopilot fly a full courier run.

## Files

- `game/index.html` — the page; `game/src/` holds the game, one job per file:
  - `main.js` — boot, loop and state machine
  - `flight.js` — flight model, rings, landing, fuel and the autopilot
  - `render.js` — chase camera and everything it sees
  - `terrain.js` — the valley heightfield, sky and clouds
  - `course.js` — runway, ring route and scenery
  - `hud.js` — lit instruments and screens
  - `input.js` — keyboard and mouse steering
  - `audio.js` — synthesised engine, chime and touchdown sounds
  - `shots.js` — frozen states for the screenshots
- `main.ts` — the make.fun hand-in program (Node 22, stdlib only)
- `screenshots/` — real renders of the game, taken in headless Chrome
