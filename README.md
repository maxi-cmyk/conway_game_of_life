# Conway's Game of Life on ESP32

An ESP32 drives a 32×8 MAX7219 LED matrix, reads a potentiometer for seed density and simulation speed, and exposes a tiny local HTTP API. A React + Vite dashboard subscribes to a live SSE stream for metrics, charts, and per-session analysis.

## What The Project Does

- Runs Conway's Game of Life on a 32×8 toroidal grid.
- Uses the potentiometer to control both seed density and generation delay.
- Plays short buzzer tones when births or deaths dominate a generation.
- Ends sessions on stagnation, total death, or a configurable generation cap.
- Lets the dashboard control three states:
  - `IDLE` -> `Start`
  - `RUNNING` -> `Pause`
  - `PAUSED` -> `Resume` or `Restart`
- Prompts for a batch size of `5` to `30` sessions when you press `Start`.
- Stores up to `30` completed session summaries for scatter plots and the session table.
- Persists those completed session summaries across ESP32 reboots until you clear them.
- Lets you tune matrix brightness, the per-session generation cap, and the stagnation window from the dashboard.
- Adds four analysis views: density, autocorrelation, entropy vs generations, and peak population vs density.
- Exports session history as CSV or JSON.

`Start` begins a fresh batch and seeds a new grid. `Resume` continues the exact paused grid without reseeding. `Restart` reseeds the current session immediately. Live updates stream into the dashboard over Server-Sent Events, so the charts only move when the board actually publishes a new snapshot.

## Repo Layout

```text
.
├── platformio.ini
├── README.md
├── analysis/
│   ├── README.md
│   ├── requirements.txt
│   ├── game_of_life.ipynb
│   ├── data/
│   └── models/
├── docs/
│   └── skills.md
├── src/
│   ├── main.cpp
│   ├── web.cpp
│   ├── web.h
│   └── credentials.h        # local only, gitignored
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.module.css
        ├── config.js
        ├── index.css
        ├── tokens.css
        ├── hooks/
        ├── lib/
        └── components/
```

## Hardware

| Component | Purpose |
|---|---|
| ESP32 dev board | Main controller |
| 4-in-1 MAX7219 FC-16 matrix | 32×8 LED display |
| 10k potentiometer | Density + speed input |
| Passive buzzer | Birth/death audio feedback |
| Breadboard + jumper wires | Wiring |

### Wiring

**MAX7219 -> ESP32**

| Matrix pin | ESP32 pin |
|---|---|
| VCC | 5V |
| GND | GND |
| DIN | GPIO 23 |
| CLK | GPIO 18 |
| CS | GPIO 5 |

**Potentiometer -> ESP32**

| Pot pin | ESP32 pin |
|---|---|
| Left leg | 3.3V |
| Middle / wiper | GPIO 34 |
| Right leg | GND |

**Buzzer -> ESP32**

| Buzzer pin | ESP32 pin |
|---|---|
| + | GPIO 19 |
| - | GND |

Use `3.3V`, not `5V`, for the potentiometer. GPIO 34 is not 5V tolerant.

## Firmware Setup

### 1. Create `src/credentials.h`

This file is intentionally local and should not be committed.

```cpp
#pragma once

#define WIFI_SSID "your_wifi_name"
#define WIFI_PASSWORD "your_wifi_password"
```

Do not put `WiFi.begin(...)` or `WiFi.config(...)` in `credentials.h`. It should only contain the credential macros.

### 2. PlatformIO

The repo already contains a working `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_port = /dev/cu.usbserial-110
upload_port = /dev/cu.usbserial-110
monitor_speed = 115200
lib_deps =
    bblanchon/ArduinoJson @ ^7.1.0
    ESP32Async/AsyncTCP @ ^3.3.2
    ESP32Async/ESPAsyncWebServer @ ^3.6.0
    majicdesigns/MD_MAX72XX @ ^3.3.1
```

If your serial device is different, update `monitor_port` and `upload_port`.

### How to check the ESP32 port next time

On macOS, the USB serial suffix can change after you unplug/replug the board. The fastest way to check it is:

```bash
ls /dev/cu.usbserial* /dev/tty.usbserial* 2>/dev/null
```

You will usually see something like:

```bash
/dev/cu.usbserial-110
/dev/tty.usbserial-110
```

Use the `/dev/cu.usbserial-*` path for `monitor_port` and `upload_port`.

If you are not sure which device is the ESP32:

1. unplug the board
2. run the `ls /dev/cu.usbserial* /dev/tty.usbserial* 2>/dev/null` command
3. plug the board back in
4. run the command again
5. the new `/dev/cu.usbserial-*` entry is the one to use

If upload still says the port is busy, close any Serial Monitor that already has the board open and try again.

### 3. Build / Upload

```bash
pio run
pio run --target upload
pio device monitor -b 115200
```

On boot, the board connects in station mode and prints its IP:

```text
ESP32 IP: 192.168.50.100
```

The current firmware is configured for a static IP in `src/web.cpp`. If your router uses a different subnet or that address is unavailable, update the `IPAddress` values there.

## Frontend Setup

### Install

```bash
cd frontend
npm install
```

### Environment

Copy `frontend/.env.example` to `frontend/.env` and set your board IP:

```env
VITE_API_URL=http://192.168.50.100
```

### Development

```bash
cd frontend
npm run dev
```

The Vite dev server proxies the dashboard API routes to the ESP32 IP configured in `frontend/vite.config.js`.

### Production Build

```bash
cd frontend
npm run build
```

## Dashboard Behavior

The dashboard opens one `/events` Server-Sent Events stream for live snapshots. History and settings still use regular HTTP fetches, but the charts and live metrics now update only when the ESP32 publishes a changed snapshot.

### State Machine

| State | Header buttons | Behavior |
|---|---|---|
| `IDLE` | `Start`, `Settings` | Prompts for a batch size from 5 to 30, then seeds a fresh run |
| `RUNNING` | `Pause`, `Settings` | Advances generations continuously |
| `PAUSED` | `Resume`, `Restart`, `Settings` | `Resume` keeps the same grid, `Restart` reseeds |

### Sessions

- `Start` asks how many sessions to run: `5` to `30`.
- The header shows `session / batchTarget`.
- A session ends when the grid stagnates, dies out completely, or hits the configured generation cap.
- Finished sessions are pushed into the table and scatter plots immediately.
- `Clear History` wipes session history and returns the firmware to `IDLE`.
- The header gear opens a dedicated settings section where you can change brightness, `maxGens`, and the stagnation window, then export the current session history as date-stamped CSV or JSON files.
- The export section includes an optional `Export Label` field so Phase 5 runs can be named consistently, for example `run1_low` or `run4_edge`.
- Session history now survives ESP32 reboots until you clear it.

## API

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/events` | `GET` | Server-Sent Events stream for live snapshots and settings updates |
| `/data` | `GET` | Current live snapshot |
| `/history` | `GET` | Completed session summaries |
| `/run?count=N` | `POST` | Start a fresh batch of `5` to `30` sessions |
| `/restart` | `POST` | Reseed the current session immediately |
| `/pause` | `POST` | Pause mid-session |
| `/resume` | `POST` | Resume the paused session |
| `/settings` | `GET` | Current runtime settings |
| `/settings` | `POST` | Update any subset of `brightness`, `maxGens`, and `hashHistory` with a JSON body |
| `/clear` | `POST` | Clear history and return to idle |

### `/data` shape

```json
{
  "pop": 84,
  "born": 12,
  "died": 9,
  "entropy": 0.73,
  "pBirth": 0.045,
  "pDeath": 0.127,
  "density": 38,
  "session": 3,
  "batchTarget": 10,
  "totalSessions": 12,
  "maxGens": 400,
  "state": "RUNNING"
}
```

### `/history` shape

```json
{
  "sessions": [
    {
      "density": 38,
      "peakPop": 97,
      "avgEntropy": 71,
      "avgPBirth": 12,
      "avgPDeath": 34,
      "autocorr": 45,
      "generations": 84,
      "endReason": 0
    }
  ]
}
```

### `/settings` shape

```json
{
  "brightness": 4,
  "maxGens": 400,
  "hashHistory": 6
}
```

## Frontend Architecture

- `frontend/src/hooks/useSimData.js`
  - owns the SSE stream, action POSTs, chart history, and session history
- `frontend/src/components/Header/`
  - live metrics, state badge, and action buttons
- `frontend/src/components/ChartGrid/`
  - population, entropy, and probability charts
- `frontend/src/components/AnalysisPanel/`
  - collapsible runtime settings, export controls, four scatter plots, and session table
- `frontend/src/tokens.css`
  - global design tokens
- `frontend/src/index.css`
  - minimal global reset

Only `tokens.css` and `index.css` are global. Everything else is component-scoped CSS Modules.

## Phase 5 And 6 Prep

The repo now includes an `analysis/` workspace so data collection and notebook work can start immediately:

- [analysis/README.md](/Users/maxi/Desktop/conway_game_of_life/analysis/README.md) explains the export and analysis workflow
- [analysis/requirements.txt](/Users/maxi/Desktop/conway_game_of_life/analysis/requirements.txt) contains the Python dependencies
- [analysis/game_of_life.ipynb](/Users/maxi/Desktop/conway_game_of_life/analysis/game_of_life.ipynb) is a starter notebook for loading, cleaning, plotting, and modeling the CSV exports
- `analysis/data/` is where exported CSV files should be placed
- `analysis/models/` is reserved for trained model artifacts later

## Simulation Notes

- Grid storage uses eight `uint32_t` rows for compact bitwise operations.
- The board uses double buffering with `grid[]` and `next[]`.
- Edge wrapping is toroidal.
- Stagnation detection compares the current hash against the last `6` hashes.
- Sessions can end from stagnation, full extinction, or hitting `maxGens`.
- Entropy uses binary Shannon entropy across all `256` cells.
- The potentiometer maps to:
  - density: `15%` to `55%`
  - generation delay: `50ms` to `300ms`

## Inspiration

Conway's Game of Life is compelling because the code stays simple while the behavior does not. There is no special-case logic for gliders, oscillators, or still lifes anywhere in the firmware. Those patterns emerge on their own from the repeated application of a tiny deterministic ruleset.

On this 32×8 matrix, the project becomes a physical version of that idea. You are not just watching a simulation in a browser tab. You are turning a knob, changing initial conditions, hearing births and deaths through the buzzer, and watching order, collapse, and chaotic transitions appear in real time on hardware.

### The Logic Engine

At the center of the project is a compact logic engine:

- each cell checks its 8 neighbours
- the current generation stays frozen in `grid[]`
- the next generation is written into `next[]`
- once every cell is evaluated, `next[]` replaces `grid[]`

That double-buffered update model is what keeps the simulation honest. Every cell sees the same previous state, so the result comes from the rules themselves rather than from loop order or partial updates.

Because the grid wraps on all sides, the engine behaves like a torus rather than a bounded rectangle. That keeps edge cells from behaving like a special case and makes the system feel more like a continuous world than a box with dead borders.

### The Four Rules

Every generation follows the same four rules:

| Condition | Result |
|---|---|
| Live cell with fewer than 2 live neighbours | Dies from underpopulation |
| Live cell with 2 or 3 live neighbours | Survives |
| Live cell with more than 3 live neighbours | Dies from overpopulation |
| Dead cell with exactly 3 live neighbours | Becomes alive |

Those four rules are the whole game. The interesting part is that they are enough. Repeating them across 256 cells is what produces stability, oscillation, collapse, and the edge-of-chaos behavior the dashboard is designed to measure.

### Why This Game Matters

Game of Life is one of the clearest examples of emergence in computing. Complex structures appear even though the engine itself only knows how to count neighbours and apply the same local rules everywhere. Nothing in the code explicitly says "make a glider" or "create an oscillator." Those behaviors are discovered by the system rather than authored line by line.

That is part of why Life is so widely studied. It sits in the narrow middle ground between systems that collapse immediately and systems that freeze into trivial order. In Wolfram's terms, it is often discussed as a Class IV cellular automaton: structured enough to form persistent patterns, but unpredictable enough to keep generating new interactions.

Life is also famous for being Turing complete. On large enough grids, people have built logic gates, memory, and computation out of nothing but moving patterns. This project is much smaller and more tactile, but it runs on that same underlying ruleset.

### Common Patterns

Even on a 32×8 display, a few recurring structures show up often:

- still lifes
  - stable shapes that never change once formed
- oscillators
  - patterns that flip between two or more repeating states
- glider-like movement
  - rare on this grid size, but the same traveling-pattern logic can still appear

The dashboard exists partly to help make those qualitative behaviors measurable. A still life pushes entropy and birth/death pressure down. An active oscillator keeps local structure alive. A chaotic interaction zone widens the probability bands and keeps the population trace moving.

### Why The Dashboard Is Interesting

The hardware gives you the visual and audio experience of the simulation, but the dashboard makes the invisible structure legible:

- entropy shows how ordered or mixed the grid is
- `P(birth)` and `P(death)` show the pressure of change generation to generation
- density links initial conditions to session outcomes
- autocorrelation hints at how much one generation predicts the next
- entropy vs generations checks whether longer-lived runs also stay more disordered
- peak population vs density shows where the grid supports the largest live-cell bursts
- the settings/export controls make it easy to tune run length and keep the raw session data

That is the real motivation behind the project. It is not only an LED-matrix demo. It is a small physical lab for exploring how simple deterministic rules can produce order, collapse, oscillation, and a narrow edge-of-chaos regime that feels surprisingly alive.

## Performance Notes

- Frontend charts disable animation globally in `frontend/src/main.jsx`.
- Polling is sequential, not overlapping, so slow requests do not pile up.
- Action buttons do a one-off sync instead of waiting for the background loop.
- Firmware sends compact JSON snapshots and keeps history capped at `30` sessions.
- The probability chart uses rolling and persistent windows instead of unbounded arrays.

## Verification

Checked locally:

- `npm run build` in `frontend/` passes cleanly.
- The dashboard code path now reflects the current `IDLE / RUNNING / PAUSED` flow.
- The README, `.env.example`, and API docs now match the current codebase.

Manual test guide after flashing:

### Phase 1

- press `Start`, choose `5`, and confirm the header shows `1 / 5`
- let one session finish and confirm the header advances to `2 / 5`
- during the short between-session transition, press `Clear History` and confirm the dashboard responds immediately instead of waiting for a blocking delay
- press `Pause`, then `Resume`, and confirm the same grid continues
- press `Restart` and confirm the grid reseeds immediately
- export CSV or JSON and confirm the saved file contains the finished session records
- confirm end reasons are represented in the session table:
  - `stagnant` from a naturally repeating/stable run
  - `max gens` by lowering `maxGens` and finishing a run at the cap
  - `died` from a run that collapses completely dark

### Phase 2

- open the header gear and confirm the settings section appears as its own top-level area
- change brightness and confirm the LED matrix updates immediately
- change `maxGens`, start a fresh run, and confirm only the next freshly seeded session uses the new cap
- change the stagnation window, start a fresh run, and confirm only the next freshly seeded session uses the new window
- open `Session Analysis` and confirm:
  - with no sessions, the charts show empty-state guidance instead of blank canvases
  - with saved sessions, the four analysis charts and session table render correctly

### Phase 3.1

- finish a few sessions, then refresh the page and confirm the same session history still appears
- power-cycle the ESP32, reopen the dashboard, and confirm the session history is still present
- after reboot, confirm the dashboard returns in `IDLE` rather than resuming a partially completed batch
- press `Clear History`, refresh the page, and confirm the history is empty
- reboot once more after clearing and confirm the history stays empty
- if you reach the `30`-session cap, export first, then clear before collecting more data

### Phase 4.1

- load the dashboard and confirm the live-link indicator moves from connecting to connected without needing a manual refresh
- start a run and confirm the live metrics and charts only change when generations advance, not on a fixed timer
- pause the session and turn the potentiometer; confirm density still updates while paused
- finish a session and confirm the session table refreshes as soon as the total session count increases
- keep the dashboard open, reboot the ESP32, and confirm the live-link indicator drops to reconnecting/offline and then recovers once the board is back
- open a second dashboard tab and confirm both tabs receive live updates without breaking the first one

Not verified in this environment:

- `pio run` / `pio run --target upload`
- live ESP32 hardware behavior after flashing

`pio` is not installed in this environment, so firmware compilation still needs to be run on your machine.
