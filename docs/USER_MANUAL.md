# F1 Oracle AI — User & Maintenance Manual

1. [Project overview](#1-project-overview)
2. [Folder structure](#2-folder-structure)
3. [How the ML models work](#3-how-the-ml-models-work)
4. [How the race simulator works](#4-how-the-race-simulator-works)
5. [How to add new datasets](#5-how-to-add-new-datasets)
6. [How to retrain models](#6-how-to-retrain-models)
7. [How to run locally](#7-how-to-run-locally)
8. [How to deploy](#8-how-to-deploy)
9. [How to maintain the project](#9-how-to-maintain-the-project)
10. [Future improvements](#10-future-improvements)

---

## 1. Project overview

F1 Oracle AI is a Formula 1 machine-learning platform with eight focused pages:

| Page | What you do |
| --- | --- |
| **Overview** | Platform snapshot — dataset size, model accuracy, AI insights, current title race. |
| **AI Predictions** | Pick a season + Grand Prix → winner/podium/points/DNF probabilities, per-team performance, and SHAP explanations (toggle the target model). |
| **Race Simulator** | Pick a race + iteration count → run Monte Carlo simulations → animated outcome leaderboard with confidence intervals. |
| **Drivers** | Search any of 861 drivers; view career stats, Oracle Rating, GOAT rank, trends; switch to **Compare** for a head-to-head radar. |
| **Constructors** | Titles, reliability, pit efficiency and championship evolution per team. |
| **Circuits** | Overtaking/DNF/chaos gauges, recent winners, and an AI track profile. |
| **Historical Analytics** | Season standings, championship battles and rivalries. |
| **Research Lab** | PCA/t-SNE driver clustering, SHAP feature importance, correlation heatmap. |

Tips: **⌘K / Ctrl+K** opens the command palette (jump to any page or driver). The season selector in the top bar is shared across pages. The sidebar collapses to icons (hover to peek, pin to lock).

## 2. Folder structure

See the tree in the [README](../README.md#project-structure) and the deep dive in [ARCHITECTURE.md](ARCHITECTURE.md). In short: `backend/` (FastAPI), `ml/` (pipeline + models), `data/` (raw CSVs + generated warehouse/features), `frontend/` (Next.js), `docs/`, `scripts/`, `tests/`.

## 3. How the ML models work

Four binary classifiers predict, per driver per race: **win**, **podium**, **points (top-10)** and **DNF**. For each target, three gradient-boosting models (XGBoost, LightGBM, CatBoost) are trained in a scikit-learn `Pipeline` (median imputation → classifier) on the engineered `master` feature matrix (~27k rows). The best model by held-out ROC AUC is saved as `ml/artifacts/{target}_best.joblib`. Top predictive signals include qualifying pace/position, circuit-specific win history, grid slot, constructor reliability and rolling form. SHAP values explain each model's drivers and are surfaced in the **AI Predictions** and **Research Lab** pages.

## 4. How the race simulator works

`ml/models/simulation/monte_carlo.py` builds a per-driver performance profile (pace, variance, reliability) from the feature store for the selected race, then simulates the race **N** times with stochastic lap performance and retirements. Aggregating the outcomes yields win/podium/top-5/top-10/DNF probabilities, the average finishing position and its standard deviation (the confidence interval shown in the leaderboard). Iteration count is selectable from 500 to 10,000.

## 5. How to add new datasets

1. Drop updated/extended Ergast-format CSVs into `data/raw/` (keep the same filenames/columns).
2. Rebuild everything:
   ```bash
   python scripts/setup_all.py
   ```
   This re-runs the ETL into the warehouse, rebuilds the Parquet feature store and retrains the models.
3. Restart the API. New seasons/drivers/circuits appear automatically across the UI (the frontend reads counts and lists from the API).

To add a **new engineered feature**, extend the feature builder in `ml/` (e.g. `feature_engineering/`), add the column to `FEATURE_COLS` used by the models, then retrain (step 2).

## 6. How to retrain models

```bash
python scripts/run_pipeline.py     # full ETL + feature build + training
# or the all-in-one
python scripts/setup_all.py
```

Training is tracked in MLflow under `ml/experiments/`. Inspect runs with `mlflow ui`. The best model per target overwrites `ml/artifacts/{target}_best.joblib`, and `ml/artifacts/metrics.json` is the summary the API serves. Models are **not** retrained on API startup — they are loaded lazily from disk, so retraining is an explicit, offline step.

## 7. How to run locally

```bash
pip install -r requirements.txt
python scripts/setup_all.py
python -m uvicorn backend.main:app --reload --port 8000

cd frontend
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

## 8. How to deploy

Frontend → Vercel, backend → Railway/Render, optional Postgres → Neon. Full steps and environment variables are in [DEPLOYMENT.md](DEPLOYMENT.md).

## 9. How to maintain the project

- **Tests / quality gates before committing:**
  ```bash
  python -m pytest tests/ -v      # backend (26 tests)
  cd frontend && npm run lint     # ESLint
  cd frontend && npm run build    # production build
  ```
- **Dependencies:** Python in `requirements.txt`, JS in `frontend/package.json`. Re-test after upgrades (Next.js 16 ships bundled docs under `frontend/node_modules/next/dist/docs/`).
- **Data refresh:** re-run `scripts/setup_all.py` when new races are available.
- **Generated artifacts** (`data/f1_oracle.db`, `ml/experiments/`, build outputs) are git-ignored; never commit them.

## 10. Future improvements

- Live timing / current-season auto-ingestion from a live F1 data source.
- Per-prediction (local) SHAP force plots in addition to global importance.
- Weather and tyre-strategy inputs in the simulator.
- User accounts with saved simulations and comparisons.
- Postgres + Redis caching for multi-instance production scale.
- Model monitoring (drift, calibration) and scheduled retraining via the existing MLflow setup.
