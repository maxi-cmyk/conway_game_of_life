# Conway's Game of Life on ESP32

An ESP32 drives a 32×8 MAX7219 LED matrix, reads a potentiometer for seed density and simulation speed, and exposes a tiny local HTTP API. A React + Vite dashboard polls that API for live metrics, charts, and per-session analysis.

## What The Project Does

- Runs Conway's Game of Life on a 32×8 toroidal grid.
- Uses the potentiometer to control both seed density and generation delay.
- Plays short buzzer tones when births or deaths dominate a generation.
- Detects stagnation and rolls into the next session automatically.
- Lets the dashboard control three states:
  - `IDLE` -> `Start`
  - `RUNNING` -> `Pause`
  - `PAUSED` -> `Resume` or `Restart`
- Prompts for a batch size of `5` to `30` sessions when you press `Start`.
- Stores up to `30` completed session summaries for scatter plots and the session table.

`Start` begins a fresh batch and seeds a new grid. `Resume` continues the exact paused grid without reseeding. `Restart` reseeds the current session immediately.

## Repo Layout

```text
.
├── platformio.ini
├── README.md
├── skills/
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
monitor_port = /dev/cu.usbserial-310
upload_port = /dev/cu.usbserial-310
monitor_speed = 115200
lib_deps =
    majicdesigns/MD_MAX72XX @ ^3.3.1
```

If your serial device is different, update `monitor_port` and `upload_port`.

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

The dashboard polls `/data` every `150ms`. Action buttons also trigger an immediate follow-up snapshot so state swaps feel instant instead of waiting on the next passive poll.

### State Machine

| State | Header buttons | Behavior |
|---|---|---|
| `IDLE` | `Start`, `Clear` | Prompts for a batch size from 5 to 30, then seeds a fresh run |
| `RUNNING` | `Pause`, `Clear` | Advances generations continuously |
| `PAUSED` | `Resume`, `Restart`, `Clear` | `Resume` keeps the same grid, `Restart` reseeds |

### Sessions

- `Start` asks how many sessions to run: `5` to `30`.
- The header shows `session / batchTarget`.
- A session ends when the grid stagnates.
- Finished sessions are pushed into the table and scatter plots immediately.
- `Clear` wipes session history and returns the firmware to `IDLE`.

## API

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/data` | `GET` | Current live snapshot |
| `/history` | `GET` | Completed session summaries |
| `/run?count=N` | `POST` | Start a fresh batch of `5` to `30` sessions |
| `/restart` | `POST` | Reseed the current session immediately |
| `/pause` | `POST` | Pause mid-session |
| `/resume` | `POST` | Resume the paused session |
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

## Frontend Architecture

- `frontend/src/hooks/useSimData.js`
  - owns all polling, action POSTs, chart history, and session history
- `frontend/src/components/Header/`
  - live metrics, state badge, and action buttons
- `frontend/src/components/ChartGrid/`
  - population, entropy, and probability charts
- `frontend/src/components/AnalysisPanel/`
  - collapsible density scatter, autocorrelation scatter, and session table
- `frontend/src/tokens.css`
  - global design tokens
- `frontend/src/index.css`
  - minimal global reset

Only `tokens.css` and `index.css` are global. Everything else is component-scoped CSS Modules.

## Simulation Notes

- Grid storage uses eight `uint32_t` rows for compact bitwise operations.
- The board uses double buffering with `grid[]` and `next[]`.
- Edge wrapping is toroidal.
- Stagnation detection compares the current hash against the last `6` hashes.
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

Manual smoke test after flashing:

- press `Start`, choose `5`, and confirm the header shows `1 / 5`
- let one session finish and confirm the header advances to `2 / 5`
- press `Pause`, then `Resume`, and confirm the same grid continues
- press `Restart` and confirm the grid reseeds immediately
- press `Clear` and confirm the header returns to `0 / 0`

Not verified in this environment:

- `pio run` / `pio run --target upload`
- live ESP32 hardware behavior after flashing

`pio` is not installed in this environment, so firmware compilation still needs to be run on your machine.
