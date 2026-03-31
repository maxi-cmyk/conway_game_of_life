# Analysis Workspace

This folder is the handoff point between Phase 5 data collection and Phase 6 notebook analysis.

## Folder layout

```text
analysis/
├── README.md
├── requirements.txt
├── game_of_life.ipynb
├── data/
└── models/
```

## Phase 5 workflow

1. Run a focused batch on the dashboard.
2. Export CSV with a filename in the format `runX_YYYY_MM_DD`.
3. Move the downloaded CSV into `analysis/data/`.
4. Clear stored history before starting the next collection block if you want a clean export.

Recommended filename pattern:

```text
run1_2026_04_01.csv
run2_2026_04_01.csv
run3_2026_04_02.csv
run4_2026_04_02.csv
```

## Phase 6 workflow

1. Create a Python environment in `analysis/`.
2. Install dependencies:

```bash
cd analysis
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Put all exported CSV files into `analysis/data/`.
4. Launch Jupyter:

```bash
jupyter notebook game_of_life.ipynb
```

The starter notebook already:
- loads every CSV in `analysis/data/`
- validates the expected export columns
- maps `endReason` labels to numeric codes for plotting/modeling
- guards statistical/modeling cells when there is not enough data yet

## Notes

- CSV is the main analysis input for Phase 6.
- JSON exports are still useful as an archival copy of the raw session payload.
- `models/` is where trained notebooks can save `.pkl` artifacts later.
