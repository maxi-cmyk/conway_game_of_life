# Conway's Game of Life — 32×8 LED Matrix

A hardware implementation of Conway's Game of Life on a 4-in-1 MAX7219 LED matrix, powered by an ESP32. Features a potentiometer for real-time density and speed control, a passive buzzer for birth/death audio feedback, automatic stagnation detection, and a live web dashboard served over WiFi for statistical analysis of emergent complexity.

---

## What It Does

The simulation runs Conway's Game of Life across a 32×8 grid of LEDs. Each LED is a cell — alive (lit) or dead (off). Every generation, the four rules of Life are applied simultaneously to all 256 cells, producing emergent patterns from simple logic.

A potentiometer controls both seed density and generation speed. When the simulation stabilises or dies out, it automatically reseeds. After every 5 sessions the simulation pauses — you review the dashboard, adjust the pot to a new density, then manually restart. Up to 30 sessions accumulate before a full clear.

A passive buzzer ticks at different pitches depending on whether births or deaths dominate each generation. A WiFi access point serves a live dashboard on your phone or laptop — no router needed.

---

## Hardware

| Component | Purpose |
|---|---|
| ESP32 dev board | Microcontroller |
| 4-in-1 MAX7219 LED matrix (FC-16) | 32×8 display |
| 10kΩ potentiometer | Density and speed control |
| Passive buzzer | Birth/death audio feedback |
| Breadboard + jumper wires | Connections |

### Wiring

**MAX7219 → ESP32**

| Matrix pin | ESP32 pin |
|---|---|
| VCC | 5V |
| GND | GND |
| DIN | GPIO 23 |
| CLK | GPIO 18 |
| CS | GPIO 5 |

**Potentiometer → ESP32**

| Pot pin | ESP32 pin |
|---|---|
| Pin 1 (left leg) | 3.3V |
| Pin 2 (wiper / middle) | GPIO 34 |
| Pin 3 (right leg) | GND |

**Passive buzzer → ESP32**

| Buzzer pin | ESP32 pin |
|---|---|
| + (positive) | GPIO 19 |
| - (negative) | GND |

> **Important:** Wire the potentiometer between 3.3V and GND only. The ESP32 ADC is not 5V tolerant — connecting to 5V will damage the pin permanently.

---

## Building with PlatformIO

### Project Structure

```
game_of_life/
├── platformio.ini
└── src/
    ├── main.cpp          — hardware: Game of Life, MAX7219, buzzer, pot
    ├── web.cpp           — web server: WiFi AP, endpoints, dashboard HTML
    ├── web.h             — shared interface between main.cpp and web.cpp
    └── credentials.h     — WiFi AP name and password (gitignored this file)
```

### platformio.ini

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps =
    majicdesigns/MD_MAX72XX @ ^3.3.1
```

### credentials.h

```cpp
#pragma once
#define AP_SSID     "your_network_name"
#define AP_PASSWORD "set_your_own"
```

Make and add `src/credentials.h` to your `.gitignore` before committing.

### Steps

1. Install [VS Code](https://code.visualstudio.com/) and the [PlatformIO extension](https://platformio.org/install/ide?install=vscode)
2. Create a new project: **PlatformIO Home → New Project**, select `Espressif ESP32 Dev Module`, framework `Arduino`
3. Replace `platformio.ini` with the config above
4. Create all four source files in `src/`
5. Build and upload: `Ctrl+Alt+U`

PlatformIO will automatically download the MD_MAX72XX library on first build.

### Connecting to the Dashboard

1. Power on the ESP32
2. On your phone or laptop, connect to the WiFi network `your_network_name`
3. Open a browser and navigate to `http://192.168.4.1`
4. The dashboard loads — tap **Restart** to begin the first session

The ESP32 runs its own access point. No router or internet connection is needed. Your phone will show a "no internet" warning — this is normal, the dashboard is served locally.

---

## How It Works

### The Four Rules

Every generation, all 256 cells are evaluated simultaneously against their 8 neighbours:

| Condition | Result |
|---|---|
| Live cell with fewer than 2 live neighbours | Dies (underpopulation) |
| Live cell with 2 or 3 live neighbours | Survives |
| Live cell with more than 3 live neighbours | Dies (overpopulation) |
| Dead cell with exactly 3 live neighbours | Born |

No cell is updated until all cells have been evaluated — a technique called double buffering. This guarantees every cell sees the state from the previous generation, not a mix of old and new.

### Grid Representation

The 32×8 grid is stored as eight `uint32_t` integers — one per row, with each of the 32 bits representing one cell. This allows bitwise operations to efficiently check, set, and clear individual cells:

```cpp
bool alive = (grid[r] >> c) & 1;       // check cell
grid[r] |=  (1UL << c);                // birth a cell
grid[r] &= ~(1UL << c);               // kill a cell
```

Death requires no explicit operation — `next[]` is zeroed at the start of every generation. A cell only exists in `next[]` if it earns survival or birth. Omission equals death by default.

### Toroidal Wrapping

The grid wraps at all four edges — left connects to right, top connects to bottom — forming a torus. This prevents boundary cells from having fewer than 8 neighbours and avoids premature die-off at the edges:

```cpp
int above = (r - 1 + ROWS) % ROWS;
int below = (r + 1) % ROWS;
int lc_   = (c - 1 + COLS) % COLS;
int rc_   = (c + 1) % COLS;
```

### Double Buffering

Results are written to a separate `next[]` array while `grid[]` stays frozen. Once all cells are evaluated, `next[]` is copied into `grid[]`. Without this, cells processed early in the loop would influence cells processed later in the same generation, corrupting the simulation.

### Stagnation Detection

The simulation hashes the grid state each generation and compares it against the six most recent hashes stored in a circular buffer. A match means the simulation has entered a stable or oscillating state and triggers an automatic reseed. Six hashes back catches oscillators up to period 6, covering the vast majority of patterns seen on a 32×8 grid.

### Potentiometer

`analogRead()` on GPIO 34 returns a 12-bit value (0–4095) mapped simultaneously to two parameters. Seed density maps to 15–55%. Generation delay maps to 50–300ms. Turning the pot toward one end produces sparse slow evolution; toward the other produces dense fast collapse.

At low density, cells are sparse and small stable clusters form easily — sessions run long. At high density, most cells have too many neighbours and die from overpopulation — sessions are short. The interesting zone sits around 30–40%, where interacting patterns have enough room to evolve without suffocating.

### Buzzer

Each generation, births and deaths are counted using `__builtin_popcount()` on bitwise comparisons of `grid[]` and `next[]`:

```cpp
totalBorn = __builtin_popcount(next[r] & ~grid[r]);  // dead → alive
totalDied = __builtin_popcount(grid[r] & ~next[r]);  // alive → dead
```

If births dominate, a high-pitched tone (1800Hz) plays for 40ms. If deaths dominate, a low-pitched tone (250Hz) plays. Equal generations are silent. At high density the buzzer produces rapid low crackling as overpopulation collapses the grid. At mid density it alternates irregularly — the audio signature of the edge of chaos.

---

## Session System

Sessions are blocks of 5 simulation runs. After each run ends (stagnation detected), the session is finalised and its statistics stored. After 5 runs the simulation pauses and the dashboard shows a comparison. Tap **Restart** on the dashboard to begin the next block of 5.

Up to 30 sessions accumulate in RAM. Boot clears all history. The dashboard's **Clear History** button resets everything at runtime and returns to a paused state, letting you set the pot to a desired starting density before restarting.

Each session stores:

| Field | Description |
|---|---|
| Density | Potentiometer (density) reading at seed time, 15–55% |
| Peak population | Maximum live cells this session |
| Avg entropy | Mean Shannon entropy × 100 |
| Avg P(birth) | Mean birth probability × 100 |
| Avg P(death) | Mean death probability × 100 |
| Generations | How many generations this session lasted |
| End reason | 0 = stagnant, 1 = died out |

---

## Web Dashboard

The dashboard is served directly from the ESP32 at `192.168.4.1`. The browser polls `/data` every 150ms. No internet connection or external server is required.

### Charts

**Population over time** — rolling 100-generation line chart showing live cell count (0–256). Flatlines when stable, drops sharply on collapse.

**Birth / death probability** — P(birth) and P(death) as rolling probability lines with 95% confidence interval bands computed using the t-distribution. Two window modes available via toggle:

- **Rolling 20** — last 20 generations only, resets each session. Shows per-session behaviour. With only 20 samples the t-distribution uses fat tails (t-critical ≈ 2.093) reflecting genuine uncertainty.
- **Persistent** — accumulates across all sessions up to 200 points. As the window fills, the t-distribution converges toward the normal distribution and the CI band visibly narrows — the convergence itself is observable on the chart.

**Entropy over time** — rolling 100-generation line chart of Shannon entropy (0–1). Peaks during active phases, drops to 0 on still lifes.

**Density function** — scatter plot of average P(birth) and P(death) per session against seed density, built up across all sessions. Over 30 sessions this traces the phase diagram of Life — showing the transition between ordered and chaotic behaviour.

**Autocorrelation vs density** — scatter plot of lag-1 autocorrelation of P(birth) against seed density, computed at session end from the persistent window. Values near 0 indicate randomness; values near 0.5 indicate deterministic chaos — structured memory without full predictability.

**Session history table** — all recorded sessions with per-session statistics.

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/` | GET | Serves dashboard HTML |
| `/data` | GET | Current generation JSON snapshot |
| `/history` | GET | All session summaries as JSON |
| `/restart` | POST | Resume from paused state |
| `/clear` | POST | Wipe all history and pause |

---

## Emergent Complexity - inspiration behind this project 

Conway's Game of Life is one of the most studied examples of emergence — complex structured behaviour arising from simple local rules. No pattern is explicitly programmed. Still lifes, oscillators, and gliders are not special cases in the code — they are simply the configurations that happen to satisfy the four rules indefinitely or cyclically.

Life is classified as a **Class IV cellular automaton** by Stephen Wolfram — the only class that produces a mix of stable structures, oscillators, and unpredictable long-range behaviour simultaneously. Most rule sets fall into Class I (dies immediately) or Class II (stable patterns only). Life's rules sit in the narrow band that produces genuine complexity.

Life is also **Turing complete** — patterns such as glider guns and logic gates have been constructed entirely within the ruleset, capable of performing arbitrary computation. The 32×8 grid here is far too small to demonstrate this, but the underlying engine is the same.

### Common Patterns

**Still lifes** — perfectly stable configurations. Every live cell has exactly 2–3 neighbours and no dead neighbour has exactly 3. They never change. The block (2×2 square) is the simplest example.

**Oscillators** — patterns that cycle between two or more states repeatedly. The blinker (three cells in a line) is the most common on this grid, alternating between horizontal and vertical every generation.

**Gliders** — five-cell patterns that translate diagonally across the grid over four generations. Rare on a 32×8 grid but possible. The simplest example of a pattern that carries information across space.

### Statistical Signatures of Chaos

The dashboard measures four statistical signatures that together constitute evidence of deterministic chaos at the phase transition density (~30–40%):

**Entropy peak** — Shannon entropy reaches its maximum at mid density. The interesting zone sits just below the peak where complexity is maximised.

**CI band width** — the width of the 95% confidence interval around P(birth) and P(death) reflects variance in birth/death pressure. Wide bands indicate high unpredictability. Narrow bands at density extremes indicate deterministic behaviour.

**Bimodal distribution** — at mid density, P(birth) tends toward a bimodal distribution with peaks corresponding to quiet and active generations. This is the statistical fingerprint of emergent structure. Random systems do not produce bimodality.

**Autocorrelation** — lag-1 autocorrelation measures how much the current generation predicts the next. Values of 0.3–0.6 at mid density indicate deterministic chaos. The autocorrelation scatter over 30 sessions should trace an inverted U shape peaking at the edge of chaos density.

### Shannon Entropy

The entropy metric uses the binary Shannon entropy formula:

```
H = -(p × log₂(p) + q × log₂(q))
```

where p is the probability a cell is alive (live cells / 256) and q = 1 − p. Base 2 is used because the system is binary — one cell carries exactly 1 bit of information at maximum uncertainty. Returns 0 when the grid is uniform and 1.0 when exactly half the cells are alive.

For an n-state generalisation (e.g. 3-state or 8-state Life), the formula extends to:

```
H = -∑ pᵢ × log₂(pᵢ)
```

with maximum entropy of log₂(n), normalised to 0–1 by dividing by log₂(n).

---

## Tuning

| Parameter | Location | Effect |
|---|---|---|
| Density range | `map()` in `seedGrid()` | Change `15, 55` to widen or narrow pot range |
| `HASH_HISTORY` | `#define` | Higher catches longer oscillators before reseeding |
| `INTENSITY` | `setup()` | LED brightness 0–15 |
| Birth tone | `playTone(1800, 40)` | Frequency and duration of birth tick |
| Death tone | `playTone(250, 40)` | Frequency and duration of death tick |
| Sessions per block | `>= 5` in `loop()` | Runs before pause checkpoint |
| Max sessions | `history[30]` and `>= 30` | Total sessions before hard cap |
| Poll interval | `setInterval(poll, 150)` | Dashboard refresh rate in ms |
| Rolling window | `ROLLING_SIZE = 20` | Probability CI window size |
| Persistent window | `PERSISTENT_SIZE = 200` | Max persistent probability history |

---

## Possible Extensions

- **SPIFFS** — store the dashboard HTML as a separate file on ESP32 flash, allowing edits without reflashing firmware.
- **WebSockets** — replace HTTP polling with a persistent push connection, eliminating polling lag entirely.
- **MQTT** — switch to station mode and push data to a cloud broker. Dashboard accessible from anywhere, not just the local AP network.
- **3-state or 8-state Life** — extend cells to multiple states using 2–3 bits per cell. Entropy formula generalises naturally across any number of states.
- **Pong** — the render pipeline, timing structure, and MD_MAX72XX familiarity built here transfers directly to a Pong implementation on the same hardware.