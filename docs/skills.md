---
name: frontend-dashboard
description: >
  Use this skill when building React + Vite dashboard frontends that consume
  a hardware API (ESP32 or similar). Covers project scaffold, component
  architecture, custom hooks for polling, Chart.js integration, CSS Modules
  with design tokens, and responsive layout. Apply whenever the user asks to
  build, extend, or refactor the Game of Life dashboard or any similar
  hardware-driven web frontend.
---

# Frontend Dashboard Skill
## React + Vite · CSS Modules · Chart.js · Hardware API

---

## Design Philosophy

Every element earns its place by passing three questions:
1. Does the user need this to complete their primary task?
2. Can it be inferred or defaulted instead of asked?
3. Would a first-time user understand this in under 3 seconds?

Apply the **Tier system** to every screen before writing any code:

| Tier | Description | Execution |
|---|---|---|
| **1 — Core** | The 1–3 things the user came here to do | Full visual weight, prominent placement |
| **2 — Supporting** | Metrics and charts that inform the primary task | Visible but subdued, secondary weight |
| **3 — Edge case** | Analysis, history, destructive actions | Hidden behind progressive disclosure |

If an element cannot be classified, it does not belong on the screen.

---

## Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | React 18 | Component model, hooks, good ecosystem |
| Build tool | Vite | Near-instant dev server, fast HMR, replaces CRA |
| Charts | react-chartjs-2 + chart.js | Declarative Chart.js wrappers for React |
| Styling | CSS Modules + design tokens | Scoped styles, no runtime overhead, no framework lock-in |
| State | Custom hooks only | No Redux/Zustand needed for this data shape |
| Fonts | System font stack + monospace for live values | Performance, no FOIT, native feel |

---

## Project Structure

```
frontend/
├── .env                          — REACT_APP_API_URL=http://192.168.1.100
├── .env.example                  — committed, shows required vars without values
├── vite.config.js                — proxy config for dev
├── index.html
├── package.json
└── src/
    ├── main.jsx                  — React root, imports tokens.css globally
    ├── App.jsx                   — top-level layout only, no logic
    ├── tokens.css                — all design tokens as CSS variables
    ├── config.js                 — API base URL, poll interval, window sizes
    ├── hooks/
    │   └── useSimData.js         — ALL fetch logic and data state lives here
    ├── lib/
    │   └── stats.js              — pure functions: tCritical, ciStats, autocorrelation
    └── components/
        ├── Header/
        │   ├── Header.jsx
        │   └── Header.module.css
        ├── StatusBar/
        │   ├── StatusBar.jsx
        │   └── StatusBar.module.css
        ├── ChartGrid/
        │   ├── ChartGrid.jsx     — responsive side-by-side / stacked layout
        │   └── ChartGrid.module.css
        ├── charts/
        │   ├── PopulationChart.jsx
        │   ├── EntropyChart.jsx
        │   └── ProbabilityChart.jsx   — includes window toggle
        ├── AnalysisPanel/
        │   ├── AnalysisPanel.jsx — collapsible Tier 3 wrapper
        │   ├── AnalysisPanel.module.css
        │   ├── DensityScatter.jsx
        │   ├── AutocorrScatter.jsx
        │   └── SessionTable.jsx
        └── Controls/
            ├── Controls.jsx      — clear history button only
            └── Controls.module.css
```

Every component lives in its own folder with a co-located CSS Module. No global styles except `tokens.css` and a minimal `main.css` reset.

---

## Scaffold Commands

```bash
# From the project root (game_of_life/)
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-chartjs-2 chart.js

# Create folder structure
mkdir -p src/hooks src/lib
mkdir -p src/components/Header
mkdir -p src/components/StatusBar
mkdir -p src/components/ChartGrid
mkdir -p src/components/charts
mkdir -p src/components/AnalysisPanel
mkdir -p src/components/Controls

# Create files
touch src/tokens.css src/config.js
touch src/hooks/useSimData.js
touch src/lib/stats.js
```

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-chartjs-2": "^5.0.0",
    "chart.js": "^4.4.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

No other runtime dependencies. CSS Modules are built into Vite — no install needed.

---

## vite.config.js

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/data':    { target: 'http://192.168.1.100', changeOrigin: true },
      '/history': { target: 'http://192.168.1.100', changeOrigin: true },
      '/restart': { target: 'http://192.168.1.100', changeOrigin: true },
      '/clear':   { target: 'http://192.168.1.100', changeOrigin: true },
    }
  }
});
```

The proxy means all fetch calls use relative paths (`fetch('/data')`) in development. The IP only lives in `vite.config.js` and `.env`. In production, set `VITE_API_URL` and prefix all fetch calls with it.

---

## config.js

```javascript
const config = {
    apiBase:         import.meta.env.VITE_API_URL || '',
    pollInterval:    150,
    rollingSize:     20,
    persistentSize:  200,
    timePoints:      100,
    maxSessions:     30,
    sessionsPerBlock: 5,
};

export default config;
```

Note: Vite uses `import.meta.env.VITE_*` not `process.env.REACT_APP_*`.

---

## tokens.css

All design decisions live here. Components never use raw hex values or magic numbers.

```css
:root {
    /* Surfaces */
    --bg-base:      #0a0a0a;
    --bg-surface:   #111111;
    --bg-elevated:  #1a1a1a;
    --bg-hover:     #222222;

    /* Borders */
    --border:       #222222;
    --border-light: #2a2a2a;

    /* Text */
    --text-primary:   #ffffff;
    --text-secondary: #888888;
    --text-muted:     #444444;

    /* Semantic colours — each colour means exactly one thing */
    --color-birth:    #4CAF50;   /* births, growth, running state */
    --color-death:    #F44336;   /* deaths, destructive actions */
    --color-paused:   #FFB300;   /* paused state */
    --color-pop:      #64B5F6;   /* population — neutral metric */
    --color-entropy:  #FFD54F;   /* entropy */
    --color-autocorr: #B388FF;   /* autocorrelation — derived metric */

    /* Typography */
    --font-ui:   system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-mono: "SF Mono", "Fira Code", "Cascadia Code", monospace;

    /* Type scale */
    --text-xs:  11px;
    --text-sm:  13px;
    --text-md:  15px;
    --text-lg:  18px;
    --text-xl:  24px;

    /* Spacing — 4px baseline */
    --space-1:  4px;
    --space-2:  8px;
    --space-3:  12px;
    --space-4:  16px;
    --space-6:  24px;
    --space-8:  32px;
    --space-12: 48px;

    /* Radii */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;

    /* Transitions */
    --transition: 150ms ease;
}
```

---

## lib/stats.js

Pure functions — no React imports, no side effects. Fully testable in isolation.

```javascript
// t critical values for 95% CI (two-tailed, alpha=0.025)
const T_CRIT = {
    1:12.706, 2:4.303,  3:3.182,  4:2.776,  5:2.571,
    6:2.447,  7:2.365,  8:2.306,  9:2.262,  10:2.228,
    11:2.201, 12:2.179, 13:2.160, 14:2.145, 15:2.131,
    16:2.120, 17:2.110, 18:2.101, 19:2.093, 20:2.086,
    30:2.042, 40:2.021, 60:2.000, 120:1.980
};

export function tCritical(n) {
    if (n <= 1) return 12.706;
    const df   = n - 1;
    const keys = Object.keys(T_CRIT).map(Number).sort((a, b) => a - b);
    return T_CRIT[keys.reduce((p, c) =>
        Math.abs(c - df) < Math.abs(p - df) ? c : p
    )];
}

export function ciStats(values) {
    const n = values.length;
    if (n < 2) return { mean: values[0] || 0, upper: 1, lower: 0 };
    const mean   = values.reduce((a, b) => a + b) / n;
    const std    = Math.sqrt(
        values.map(x => (x - mean) ** 2).reduce((a, b) => a + b) / (n - 1)
    );
    const margin = tCritical(n) * (std / Math.sqrt(n));
    return {
        mean,
        upper: Math.min(1, mean + margin),
        lower: Math.max(0, mean - margin),
    };
}

export function autocorrelation(values, lag = 1) {
    const n = values.length;
    if (n < lag + 2) return 0;
    const mean = values.reduce((a, b) => a + b) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n - lag; i++)
        num += (values[i] - mean) * (values[i + lag] - mean);
    for (let i = 0; i < n; i++)
        den += (values[i] - mean) ** 2;
    return den === 0 ? 0 : num / den;
}
```

---

## hooks/useSimData.js

All fetch logic, all data state. Components never call fetch directly.

```javascript
import { useState, useEffect, useRef, useCallback } from 'react';
import config from '../config';
import { autocorrelation } from '../lib/stats';

const EMPTY_WINDOW = [];

export function useSimData() {
    // Live snapshot
    const [snap, setSnap] = useState({
        pop: 0, born: 0, died: 0, entropy: 0,
        pBirth: 0, pDeath: 0, density: 0,
        session: 0, totalSessions: 0, state: 'PAUSED'
    });

    // Rolling time series (last N points)
    const [popHistory,     setPopHistory]     = useState([]);
    const [entropyHistory, setEntropyHistory] = useState([]);

    // Probability windows
    const [pBirthRolling,    setPBirthRolling]    = useState([]);
    const [pDeathRolling,    setPDeathRolling]    = useState([]);
    const [pBirthPersistent, setPBirthPersistent] = useState([]);
    const [pDeathPersistent, setPDeathPersistent] = useState([]);

    // Session history from /history
    const [sessions, setSessions] = useState([]);

    // Autocorrelation scatter — built client side at session end
    const [autocorrPoints, setAutocorrPoints] = useState([]);

    // UI state
    const [windowMode, setWindowMode] = useState('rolling');

    // Internal refs — don't need to trigger re-renders
    const genCountRef         = useRef(0);
    const lastTotalSessionsRef = useRef(0);

    const fetchHistory = useCallback(() => {
        fetch(`${config.apiBase}/history`)
            .then(r => r.json())
            .then(data => setSessions(data.sessions || []))
            .catch(() => {});
    }, []);

    const push = useCallback((arr, setter, value, maxLen) => {
        setter(prev => {
            const next = [...prev, value];
            return next.length > maxLen ? next.slice(1) : next;
        });
    }, []);

    useEffect(() => {
        fetchHistory();

        const id = setInterval(() => {
            fetch(`${config.apiBase}/data`)
                .then(r => r.json())
                .then(d => {
                    genCountRef.current++;
                    setSnap(d);

                    push(null, setPopHistory,     d.pop,     config.timePoints);
                    push(null, setEntropyHistory, d.entropy, config.timePoints);

                    push(null, setPBirthRolling,    d.pBirth, config.rollingSize);
                    push(null, setPDeathRolling,    d.pDeath, config.rollingSize);
                    push(null, setPBirthPersistent, d.pBirth, config.persistentSize);
                    push(null, setPDeathPersistent, d.pDeath, config.persistentSize);

                    // Session ended
                    if (d.totalSessions > lastTotalSessionsRef.current) {
                        lastTotalSessionsRef.current = d.totalSessions;
                        fetchHistory();

                        // Compute autocorrelation from persistent window
                        setPBirthPersistent(prev => {
                            const ac = autocorrelation(prev);
                            setAutocorrPoints(pts => [
                                ...pts,
                                { x: d.density, y: parseFloat(ac.toFixed(3)) }
                            ]);
                            return prev;
                        });

                        // Reset time series for new session
                        setPopHistory([]);
                        setEntropyHistory([]);
                        setPBirthRolling([]);
                        setPDeathRolling([]);
                    }
                })
                .catch(() => {});
        }, config.pollInterval);

        return () => clearInterval(id);
    }, [fetchHistory, push]);

    const restart = useCallback(() => {
        fetch(`${config.apiBase}/restart`, { method: 'POST' })
            .then(() => {
                setPopHistory([]);
                setEntropyHistory([]);
                setPBirthRolling([]);
                setPDeathRolling([]);
                genCountRef.current = 0;
            })
            .catch(() => {});
    }, []);

    const clearHistory = useCallback(() => {
        fetch(`${config.apiBase}/clear`, { method: 'POST' })
            .then(() => {
                setPopHistory([]);
                setEntropyHistory([]);
                setPBirthRolling([]);
                setPDeathRolling([]);
                setPBirthPersistent([]);
                setPDeathPersistent([]);
                setAutocorrPoints([]);
                setSessions([]);
                genCountRef.current = 0;
                lastTotalSessionsRef.current = 0;
            })
            .catch(() => {});
    }, []);

    return {
        ...snap,
        popHistory,
        entropyHistory,
        pBirthRolling,
        pDeathRolling,
        pBirthPersistent,
        pDeathPersistent,
        sessions,
        autocorrPoints,
        windowMode,
        setWindowMode,
        restart,
        clearHistory,
    };
}
```

**Key pattern — `push` with functional update:** Each window update uses `prev => [...]` to avoid stale closure bugs. Never read state inside `setInterval` directly — always use the functional updater form or a ref.

---

## Chart Registration

Chart.js 4 requires explicit component registration. Do this once in `main.jsx`:

```javascript
import {
    Chart as ChartJS,
    CategoryScale, LinearScale,
    PointElement, LineElement,
    Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale, LinearScale,
    PointElement, LineElement,
    Title, Tooltip, Legend, Filler
);
```

Forgetting `Filler` is the most common cause of CI band renders failing silently.

---

## Chart Defaults

Set once, inherited by all charts. Put this in `main.jsx` after registration:

```javascript
ChartJS.defaults.animation         = false;   // live data — never animate
ChartJS.defaults.color             = '#888888';
ChartJS.defaults.borderColor       = '#222222';
ChartJS.defaults.font.family       = 'system-ui, sans-serif';
ChartJS.defaults.font.size         = 11;
ChartJS.defaults.plugins.legend.display = false;  // each chart controls its own
```

`animation: false` is mandatory. At 150ms poll intervals, animations start before the previous one finishes — the chart never looks stable and burns CPU.

---

## Responsive Layout — ChartGrid

CSS Grid with `auto-fit` and `minmax` handles the responsive breakpoint without any JavaScript:

```css
/* ChartGrid.module.css */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--space-4);
}
```

Three charts at 320px minimum — on a desktop (1200px+) all three sit side by side. On mobile (375px) they stack. No `@media` query needed.

---

## Collapsible AnalysisPanel Pattern

```jsx
// AnalysisPanel.jsx
import { useState } from 'react';
import styles from './AnalysisPanel.module.css';

export function AnalysisPanel({ children }) {
    const [open, setOpen] = useState(false);

    return (
        <section className={styles.panel}>
            <button
                className={styles.trigger}
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                Analysis
                <span className={`${styles.chevron} ${open ? styles.open : ''}`}>
                    ↓
                </span>
            </button>
            {open && (
                <div className={styles.content}>
                    {children}
                </div>
            )}
        </section>
    );
}
```

`aria-expanded` keeps it accessible. The chevron rotates via CSS class toggle — `transform: rotate(180deg)` only, which is GPU-accelerated per the performance rules below.

---

## Performance Rules

Only animate `transform` and `opacity` — these are GPU accelerated and never trigger layout recalculation:

```css
/* CORRECT — GPU layer, no reflow */
.chevron { transition: transform var(--transition); }
.chevron.open { transform: rotate(180deg); }

/* WRONG — triggers layout recalculation every frame */
.panel { transition: height var(--transition); }
```

Never animate `width`, `height`, `top`, `left`, `margin`, `padding`, or `box-shadow`.

---

## Styling Rules

**CSS Modules — one file per component, scoped automatically:**

```css
/* Header.module.css */
.header { ... }        /* becomes Header_header__abc123 in output */
.meta   { ... }
```

```jsx
/* Header.jsx */
import styles from './Header.module.css';
<div className={styles.header}>
```

**No global class names except tokens.** If you find yourself writing a class in `main.css` that isn't a reset or token, it belongs in a component module.

**Semantic colour only.** Never use raw hex in a component. Always reference a token:

```css
/* CORRECT */
color: var(--color-birth);

/* WRONG */
color: #4CAF50;
```

**Monospace only for live numeric values:**

```css
.liveValue {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;  /* prevents layout shift as digits change */
}
```

`tabular-nums` is critical for live dashboards — it makes all digits the same width so the layout doesn't jump when `84` becomes `100`.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why | Fix |
|---|---|---|
| Fetching in a component | Creates duplicate requests, hard to test | Always fetch in `useSimData` |
| Raw hex in component CSS | Can't theme, easy to diverge | Always use CSS variables |
| `useEffect` reading stale state | Silent bugs in polling | Use functional updater `setState(prev => ...)` |
| Animating `height` for collapse | Triggers reflow, jank | Use `display: none` toggle or `max-height` trick |
| Chart.js without `animation: false` | Perpetually mid-animation at 150ms | Set globally in `main.jsx` |
| Forgetting `Filler` registration | CI bands silently fail | Register in `main.jsx` with all other components |
| Hardcoding ESP32 IP in components | Breaks on IP change | Use `config.js` and `.env` |
| `process.env.REACT_APP_*` | CRA syntax, broken in Vite | Use `import.meta.env.VITE_*` |

---

## ESP32 Firmware Changes for Station Mode

When moving from AP mode to station mode, only `web.cpp` and `credentials.h` change. `main.cpp` is untouched.

**credentials.h:**
```cpp
#pragma once
#define WIFI_SSID     "YourHomeWiFi"
#define WIFI_PASSWORD "YourPassword"
```

**web.cpp — replace `WiFi.softAP(...)` with:**
```cpp
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
Serial.print("Connecting");
while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
}
Serial.println();
Serial.print("ESP32 IP: ");
Serial.println(WiFi.localIP());  // read this, set as static on router
```

**Remove from web.cpp:**
- `DASHBOARD_HTML` string (entire raw string literal)
- `server.on("/", ...)` route
- `#include "credentials.h"` stays, just with different defines

**Set static IP on router:**
1. Boot ESP32, read IP from Serial Monitor
2. Router admin panel → DHCP reservations → add ESP32 MAC → assign fixed IP
3. Update `vite.config.js` proxy target and `.env` with that IP

---

## Checklist Before Running

- [ ] `vite.config.js` proxy target matches ESP32 static IP
- [ ] `.env` has `VITE_API_URL` set (or left empty to use proxy)
- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` is committed showing required variable names without values
- [ ] `credentials.h` is in `.gitignore`
- [ ] Chart.js components registered in `main.jsx` including `Filler`
- [ ] `ChartJS.defaults.animation = false` set in `main.jsx`
- [ ] All colours reference CSS variables, no raw hex in components
- [ ] `tabular-nums` on all live numeric displays
- [ ] `aria-expanded` on collapsible AnalysisPanel trigger