# nextSteps1 — Conway's Game of Life

A prioritised roadmap of all improvements discussed, with implementation detail for each phase.

---

## Phase 1 — Firmware Polish
*Estimated time: 1–2 days. All changes in `main.cpp` and `web.cpp`.*

### 1.1 Non-Blocking Transition Timer

**Problem:** `delay(500)` between sessions blocks the entire ESP32 — the web server stops responding, button presses are ignored, the buzzer can't be silenced mid-delay.

**Fix:** Replace with a `millis()` timer, same pattern as the generation timer.

**Changes to `main.cpp`:**

```cpp
// Add to globals
unsigned long transitionStart = 0;
bool inTransition = false;

// In loop() — replace the delay(500) + seedGrid() block with:
if (isStagnant()) {
    ledcWriteTone(BUZZER_CH, 0);
    finaliseSession(END_STAGNANT);
    sessionCount++;

    if (sessionCount >= 5 || historyCount >= 30) {
        simState = PAUSED;
        mx.clear();
    } else {
        inTransition    = true;
        transitionStart = millis();
        simState        = PAUSED;   // pause during transition
        mx.clear();
    }
}

// Add this block BEFORE the simState != RUNNING early return:
if (inTransition && millis() - transitionStart >= 500) {
    inTransition = false;
    simState     = RUNNING;
    seedGrid();
}
```

The web server keeps handling requests throughout the 500ms gap. Pause/resume/clear all work immediately.

---

### 1.2 True Session End Reasons

**Problem:** `endReason` is always `0` (stagnant). A grid that goes completely dark is not stagnant — it died. A session cut off by a generation cap is a third distinct outcome. These are meaningfully different for analysis.

**Add to `main.cpp` defines:**

```cpp
#define END_STAGNANT  0
#define END_DIED      1
#define END_MAX_GENS  2
#define MAX_GENS      500   // expose in settings panel later
```

**Replace the stagnation check in `loop()` with:**

```cpp
if (millis() - lastGen >= genDelay) {
    stepGeneration();
    render();

    // Check population after step
    uint8_t pop = 0;
    for (int r = 0; r < ROWS; r++)
        pop += __builtin_popcount(grid[r]);

    if (pop == 0) {
        // Grid went completely dark — died out
        ledcWriteTone(BUZZER_CH, 0);
        finaliseSession(END_DIED);
        handleSessionEnd();

    } else if (genCount >= MAX_GENS) {
        // Hit the generation cap
        ledcWriteTone(BUZZER_CH, 0);
        finaliseSession(END_MAX_GENS);
        handleSessionEnd();

    } else if (isStagnant()) {
        // Stable or oscillating state
        ledcWriteTone(BUZZER_CH, 0);
        finaliseSession(END_STAGNANT);
        handleSessionEnd();
    }

    lastGen = millis();
}
```

**Extract session end logic into a helper to avoid repetition:**

```cpp
void handleSessionEnd() {
    sessionCount++;
    if (sessionCount >= 5 || historyCount >= 30) {
        simState = PAUSED;
        mx.clear();
    } else {
        inTransition    = true;
        transitionStart = millis();
        simState        = PAUSED;
        mx.clear();
    }
}
```

**Update the frontend session table** — `endReason` now maps to three values:

```javascript
// In SessionTable.jsx
const endReasonLabel = {
    0: 'stagnant',
    1: 'died',
    2: 'max gens',
};

<td>{endReasonLabel[s.endReason] ?? '—'}</td>
```

---

### 1.3 Export CSV / JSON

**Problem:** Session data disappears on page refresh or ESP32 reboot. Export lets you accumulate data across multiple runs for analysis.

**This is pure frontend — no ESP32 changes needed.**

**Add to `useSimData.js`:**

```javascript
const exportCSV = useCallback(() => {
    if (sessions.length === 0) return;

    const runId  = new Date().toISOString().slice(0, 10);
    const header = 'run_id,session,density,peakPop,avgEntropy,avgPBirth,avgPDeath,generations,endReason,autocorr';

    const endReasonLabel = { 0: 'stagnant', 1: 'died', 2: 'max_gens' };

    const rows = sessions.map((s, i) => [
        runId,
        i + 1,
        s.density,
        s.peakPop,
        (s.avgEntropy / 100).toFixed(2),
        (s.avgPBirth  / 100).toFixed(3),
        (s.avgPDeath  / 100).toFixed(3),
        s.generations,
        endReasonLabel[s.endReason] ?? s.endReason,
        (s.autocorr   / 100).toFixed(3),
    ].join(','));

    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `game_of_life_${runId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}, [sessions]);

// Add to return object
return { ...snap, /* existing */, exportCSV };
```

**Add export button to `Controls.jsx` or alongside the Clear button in `Header.jsx`:**

```jsx
<button
    className={styles.exportBtn}
    onClick={exportCSV}
    disabled={sessions.length === 0}
>
    Export CSV
</button>
```

**CSS:**
```css
.exportBtn {
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border-light);
    transition: color var(--transition), border-color var(--transition);
}

.exportBtn:hover {
    color: var(--color-pop);
    border-color: var(--color-pop);
}

.exportBtn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
```

Include the date in the filename yourself so multiple runs do not overwrite each other. Use `runX_YYYY_MM_DD`, for example `run1_2026_04_01.csv`.

---

## Phase 2 — Frontend Enrichment
*All changes in `frontend/src/`.*

### 2.1 Additional Analysis Views

Two new scatter plots in `AnalysisPanel` — no new ESP32 data needed, both derived from existing `sessions[]`.

**Entropy vs Generation Count**

Tests whether longer-lived sessions have higher entropy — a direct empirical check of the edge of chaos hypothesis. If the relationship is positive, high-entropy sessions genuinely live longer.

```jsx
// EntropyVsGenerations.jsx
export function EntropyVsGenerations({ sessions }) {
    const data = {
        datasets: [{
            label: 'Sessions',
            data: sessions.map(s => ({
                x: s.generations,
                y: s.avgEntropy / 100,
            })),
            backgroundColor: 'rgba(255, 213, 79, 0.7)',
            pointRadius: 5,
        }]
    };

    const options = {
        scales: {
            x: { title: { display: true, text: 'Generations' } },
            y: { min: 0, max: 1, title: { display: true, text: 'Avg Entropy' } }
        }
    };

    return <Scatter data={data} options={options} />;
}
```

**Peak Population vs Density**

Shows whether the population ceiling is density-dependent. Expect an inverted U — too sparse and few cells survive, too dense and everything dies, mid-range supports the largest stable populations.

```jsx
// PeakPopVsDensity.jsx
export function PeakPopVsDensity({ sessions }) {
    const data = {
        datasets: [{
            label: 'Sessions',
            data: sessions.map(s => ({
                x: s.density,
                y: s.peakPop,
            })),
            backgroundColor: 'rgba(100, 181, 246, 0.7)',
            pointRadius: 5,
        }]
    };
    // ...
}
```

Register `ScatterController` and `PointElement` in `main.jsx` if not already registered:

```javascript
import { ScatterController } from 'chart.js';
ChartJS.register(ScatterController, PointElement /* existing */);
```

---

### 2.2 Settings Panel

A collapsible Tier 3 panel exposing four tunable parameters. Three require new ESP32 endpoints, one is frontend-only.

**Frontend-only (no ESP32 change):**
- Poll interval — read from `config.js`, update the `setInterval` dynamically

**Requires new ESP32 endpoints:**
- Matrix brightness (`/settings/brightness`) — calls `mx.control(MD_MAX72XX::INTENSITY, value)`
- Max generations (`/settings/maxgens`) — updates `MAX_GENS` at runtime
- Stagnation window (`/settings/hashhistory`) — updates `HASH_HISTORY` at runtime

**ESP32 `/settings` endpoints:**

```cpp
// GET /settings — returns current values
server.on("/settings", HTTP_GET, []() {
    String json = "{";
    json += "\"brightness\":"  + String(s_brightness)  + ",";
    json += "\"maxGens\":"     + String(s_maxGens)      + ",";
    json += "\"hashHistory\":" + String(s_hashHistory);
    json += "}";
    server.send(200, "application/json", json);
});

// POST /settings — accepts JSON body with any subset of fields
server.on("/settings", HTTP_POST, []() {
    // parse body and update values
    server.send(200, "text/plain", "ok");
});
```

**React settings panel (Tier 3 — hidden behind expander, same pattern as AnalysisPanel):**

```jsx
export function SettingsPanel({ onApply }) {
    const [brightness, setBrightness] = useState(4);
    const [maxGens,    setMaxGens]    = useState(500);

    const apply = () => {
        fetch('/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brightness, maxGens }),
        });
        onApply?.();
    };

    return (
        <CollapsiblePanel title="Settings">
            <label>Brightness (0–15)
                <input type="range" min={0} max={15}
                    value={brightness}
                    onChange={e => setBrightness(+e.target.value)} />
            </label>
            <label>Max generations
                <input type="number" min={50} max={2000}
                    value={maxGens}
                    onChange={e => setMaxGens(+e.target.value)} />
            </label>
            <button onClick={apply}>Apply</button>
        </CollapsiblePanel>
    );
}
```

---

## Phase 3 — Persistence
*Changes in `web.cpp` and `main.cpp`.*

### 3.1 NVS Session History

**Why NVS over SPIFFS:** NVS (Non-Volatile Storage) is the right tool for small structured data. SPIFFS is a filesystem — better suited for large files like HTML. Session history is 180 bytes at 30 sessions; NVS handles this natively with no filesystem overhead.

**Critical — versioning:** If `SessionSummary` changes structure (adding a field), the bytes stored under the old layout will be misread as the new struct silently. Always store a version key and wipe on mismatch.

```cpp
#include <Preferences.h>

#define NVS_VERSION 2   // increment whenever SessionSummary changes

Preferences prefs;

void loadHistory() {
    prefs.begin("gol", false);
    uint8_t storedVersion = prefs.getUChar("version", 0);

    if (storedVersion != NVS_VERSION) {
        // Schema changed — wipe stale data
        prefs.clear();
        prefs.putUChar("version", NVS_VERSION);
        historyCount = 0;
    } else {
        historyCount = prefs.getInt("count", 0);
        prefs.getBytes("history", history,
            historyCount * sizeof(SessionSummary));
    }
    prefs.end();
}

void saveHistory() {
    prefs.begin("gol", false);
    prefs.putUChar("version", NVS_VERSION);
    prefs.putInt("count", historyCount);
    prefs.putBytes("history", history,
        historyCount * sizeof(SessionSummary));
    prefs.end();
}
```

Call `loadHistory()` in `setup()` after `webSetup()`. Call `saveHistory()` inside `finaliseSession()` after `historyCount++`. Call `prefs.clear()` inside the clear handler in `loop()`.

**Impact:** The hardware becomes an experiment logger. Power it off overnight, power it back on, all sessions are still there. Multiple days of data accumulate without needing to export between runs.

---

## Phase 4 — Architecture Upgrades
*Significant changes to both firmware and frontend.*

### 4.1 Server-Sent Events (SSE)

**Why SSE over WebSockets:** Your data flow is one-directional — ESP32 pushes to browser. WebSockets are bidirectional and add unnecessary handshake complexity. SSE is simpler, HTTP-native, and perfectly matched to this use case.

**Why SSE over polling:** At 150ms intervals the browser sends ~7 HTTP requests per second even when nothing has changed. SSE opens one persistent connection and the ESP32 pushes exactly when a new generation is ready — lower latency, lower overhead, more responsive feel.

**Hidden complexity:** `ESPAsyncWebServer` is required for SSE — it's non-blocking by design. The synchronous `WebServer` you currently use cannot hold connections open. Migrating requires rewriting all endpoint registrations to the async API, which is different syntax but the same logic.

```cpp
#include <ESPAsyncWebServer.h>

AsyncWebServer   server(80);
AsyncEventSource events("/events");

// In webSetup():
server.addHandler(&events);

// Push each generation:
void pushEvent(String json) {
    events.send(json.c_str(), "generation", millis());
}
```

```javascript
// In useSimData.js — replace setInterval with:
useEffect(() => {
    const es = new EventSource(`${config.apiBase}/events`);
    es.addEventListener('generation', e => {
        const d = JSON.parse(e.data);
        // same processing as before
    });
    return () => es.close();
}, []);
```

Plan this as a dedicated migration — don't mix the async and sync servers.

---

## Phase 5 — Data Collection Protocol
*Before running experiments for modelling.*

### 5.1 Systematic Density Sweep

Random pot positions produce unbalanced datasets. For machine learning you want roughly equal representation across the density range.

**Recommended protocol:**

```
Run 1 — low density focus
  3 sessions at each of: 15%, 20%, 25%, 30%, 35%
  = 15 sessions, but max is 30 so run two blocks of 5

Run 2 — mid density focus  
  3 sessions at each of: 28%, 32%, 36%, 40%, 44%
  = overlaps with Run 1 for replicate measurements

Run 3 — high density focus
  3 sessions at each of: 38%, 42%, 46%, 50%, 55%

Run 4 — edge of chaos focus
  6 sessions at each of: 30%, 35%, 40%
  = denser sampling where the interesting behaviour lives
```

Total: ~90 sessions across 4 runs. Enough for meaningful models.

**Name exports to match:**
```
run1_2026_04_01.csv
run2_2026_04_01.csv
run3_2026_04_02.csv
run4_2026_04_02.csv
```

---

## Phase 6 — Analysis Notebook
*After data collection is complete.*

### 6.1 Folder Structure

```
game_of_life/
├── analysis/
│   ├── requirements.txt
│   ├── game_of_life.ipynb
│   └── data/
│       ├── run1_2026_04_01.csv
│       ├── run2_2026_04_01.csv
│       └── ...
```

### 6.2 Requirements

```
numpy
pandas
matplotlib
seaborn
scipy
scikit-learn
statsmodels
jupyter
```

### 6.3 Notebook Structure

**Section 1 — Data loading and cleaning**
```python
import pandas as pd
import glob

files = glob.glob('data/*.csv')
df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)

# Sanity checks
print(df.dtypes)
print(df.describe())
print(f"Sessions per density:\n{df['density'].value_counts().sort_index()}")
```

**Section 2 — Exploratory analysis**
```python
import matplotlib.pyplot as plt
import seaborn as sns

# Phase diagram
fig, axes = plt.subplots(1, 2, figsize=(12, 5))
axes[0].scatter(df['density'], df['avgEntropy'],
                c=df['endReason'], cmap='viridis', alpha=0.7)
axes[0].set(xlabel='Density %', ylabel='Avg Entropy',
            title='Entropy vs Density')

axes[1].scatter(df['density'], df['autocorr'],
                c=df['endReason'], cmap='viridis', alpha=0.7)
axes[1].set(xlabel='Density %', ylabel='Autocorrelation',
            title='Autocorrelation vs Density')
plt.tight_layout()
plt.show()
```

**Section 3 — Statistical tests**
```python
from scipy import stats

# Does autocorrelation peak at mid density?
r, p = stats.pearsonr(df['density'], df['autocorr'])
print(f"Pearson r={r:.3f}, p={p:.4f}")

# Is P(birth) distribution normal at mid density?
mid = df[(df['density'] >= 30) & (df['density'] <= 40)]
stat, p = stats.shapiro(mid['avgPBirth'])
print(f"Shapiro-Wilk W={stat:.3f}, p={p:.4f}")
print(f"Distribution is {'normal' if p > 0.05 else 'non-normal'} at α=0.05")

# KS test — do low and high density P(death) come from same distribution?
low  = df[df['density'] <= 25]['avgPDeath']
high = df[df['density'] >= 45]['avgPDeath']
stat, p = stats.ks_2samp(low, high)
print(f"KS statistic={stat:.3f}, p={p:.4f}")
```

**Section 4 — Classification models**
```python
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing   import LabelEncoder
from sklearn.tree            import DecisionTreeClassifier
from sklearn.linear_model    import LogisticRegression
from sklearn.neighbors       import KNeighborsClassifier

features = ['density', 'avgEntropy', 'avgPBirth', 'avgPDeath', 'autocorr']
X = df[features]
y = df['endReason']

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for name, model in [
    ('Decision Tree',      DecisionTreeClassifier(max_depth=3)),
    ('Logistic Regression', LogisticRegression(max_iter=1000)),
    ('k-NN',               KNeighborsClassifier(n_neighbors=5)),
]:
    scores = cross_val_score(model, X, y, cv=cv, scoring='accuracy')
    print(f"{name}: {scores.mean():.3f} ± {scores.std():.3f}")
```

**Section 5 — Regression models**
```python
from sklearn.linear_model  import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline      import Pipeline
from sklearn.metrics       import r2_score

# Predict session lifespan from density
X = df[['density']]
y = df['generations']

# Polynomial regression — expect non-linear relationship
poly_model = Pipeline([
    ('poly', PolynomialFeatures(degree=3)),
    ('reg',  LinearRegression()),
])

scores = cross_val_score(poly_model, X, y, cv=5, scoring='r2')
print(f"Polynomial R² = {scores.mean():.3f} ± {scores.std():.3f}")

# Plot fitted curve
poly_model.fit(X, y)
density_range = pd.DataFrame({'density': range(15, 56)})
y_pred = poly_model.predict(density_range)

plt.scatter(df['density'], df['generations'], alpha=0.5, label='Observed')
plt.plot(density_range, y_pred, 'r-', label='Polynomial fit')
plt.xlabel('Density %')
plt.ylabel('Generations')
plt.title('Session lifespan vs density')
plt.legend()
plt.show()
```

**Section 6 — Live prediction integration (future)**

Once models are trained, export them with `joblib` and load them in the React frontend via a lightweight Python inference server, or reimplement the decision boundary in JavaScript for browser-side prediction.

```python
import joblib
joblib.dump(poly_model, 'models/lifespan_regressor.pkl')
```

---

## Summary Roadmap

| Phase | What | Effort | Prerequisites |
|---|---|---|---|
| 1.1 | Non-blocking timer | 30 min | Nothing |
| 1.2 | True end reasons | 1 hour | 1.1 |
| 1.3 | CSV export | 1 hour | Nothing |
| 2.1 | Extra analysis views | 2 hours | Nothing |
| 2.2 | Settings panel | 3 hours | Nothing |
| 3.1 | NVS persistence | 4 hours | 1.2 |
| 4.1 | SSE push updates | 1 day | All Phase 1–3 |
| 5.1 | Data collection | Hardware time | Phase 1–3 complete |
| 6.x | Analysis notebook | 1–2 days | Phase 5 data |


