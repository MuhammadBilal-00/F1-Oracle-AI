# Architecture

F1 Oracle AI is a three-tier system: a data + ML layer that turns raw Formula 1 CSVs into a warehouse, a feature store and trained models; a FastAPI service that exposes that intelligence over a clean REST API; and a Next.js 16 dashboard that consumes it.

```
Ergast CSVs ──▶ ETL ──▶ SQLite warehouse ──┐
                  └────▶ Parquet feature store ─┼─▶ FastAPI (/api/v1) ─▶ Next.js 16 dashboard
                            └─▶ ML training ─▶ .joblib artifacts ─┘
```

## 1. Data layer

- **Source** — the public [Ergast](http://ergast.com/mrd/) dataset (1950–2024) as 14 CSVs in `data/raw/`.
- **ETL** (`ml/data_pipeline/`) — extract → clean/transform → load into a **star-schema SQLite warehouse** (`data/f1_oracle.db`): dimension tables (`dim_drivers`, `dim_constructors`, `dim_circuits`, `dim_races`, `dim_status`) and fact tables (`fact_race_results`, `fact_qualifying`, `fact_pit_stops`, `fact_lap_times`, `fact_driver_standings`, `fact_constructor_standings`).
- **Feature store** (`data/features/*.parquet`) — engineered, analysis-ready tables: `master` (the 26k-row training matrix), `driver_career`, `driver_clusters` (with PCA/t-SNE coordinates), `driver_archetypes`, `goat_rankings`, `constructor_features`, `circuit_features`, `rivalries`.

The warehouse and feature store are **generated artifacts** (git-ignored). `python scripts/setup_all.py` rebuilds everything from `data/raw/` and is idempotent.

## 2. ML layer (`ml/`)

| Model | Target | Algorithm (best) | ROC AUC |
| --- | --- | --- | --- |
| Race winner | P1 finish | CatBoost | **0.987** |
| DNF | retirement | CatBoost | **0.957** |
| Podium | top-3 finish | CatBoost | **0.942** |
| Points | top-10 finish | XGBoost | **0.942** |

- **Training** — for each target, three gradient-boosting models (XGBoost, LightGBM, CatBoost) are trained inside a scikit-learn `Pipeline` (`imputer` → `clf`) with a proper train/test split; the best by held-out ROC AUC is persisted as `{target}_best.joblib`. Runs are tracked in **MLflow** (`ml/experiments/`). Metrics are summarised in `ml/artifacts/metrics.json` and served by the API.
- **Explainability** — `MLService.get_feature_importance()` computes **SHAP** values over a 1,000-row sample of the feature store and returns the top features per target.
- **Monte Carlo simulation** (`ml/models/simulation/monte_carlo.py`) — builds per-driver performance profiles from the feature store for a given race and runs N stochastic race simulations, aggregating win/podium/top-10/DNF probabilities, mean finishing position and its standard deviation.

## 3. Backend (`backend/`, FastAPI)

```
backend/
├── main.py                     app + CORS + lifespan
├── api/v1/
│   ├── router.py               aggregates endpoint modules
│   └── endpoints/              drivers, races, predictions, analytics
├── services/
│   ├── data_service.py         cached warehouse + feature-store access
│   └── ml_service.py           lazy-loaded models, prediction, simulation, SHAP
├── models/orm/                 SQLAlchemy dimension & fact models
└── core/database.py            engine/session
```

`DataService` and `MLService` are singletons with in-memory caching (Parquet frames are loaded once; models are lazy-loaded on first use). Key endpoints under `/api/v1`:

| Group | Endpoints |
| --- | --- |
| Drivers | `GET /drivers`, `/drivers/{id}`, `/drivers/{id}/history`, `/drivers/goat`, `/drivers/clusters` |
| Races | `GET /races`, `/races/seasons`, `/races/{id}/results` (+ qualifying, pit stops, lap times) |
| Predictions | `GET /predictions/race/{id}`, `/predictions/race/{id}/simulate`, `/predictions/feature-importance/{target}` |
| Analytics | `GET /analytics/overview`, `/circuits`, `/circuits/{id}/winners`, `/constructors`, `/constructors/{id}`, `/constructors/{id}/history`, `/standings/{drivers\|constructors}/{year}`, `/rivalries` |

Interactive docs are auto-generated at `/docs` (Swagger) and `/redoc`.

## 4. Frontend (`frontend/`, Next.js 16 App Router)

```
src/
├── app/                 root layout + 8 route pages (Overview, Predictions,
│                        Simulator, Drivers, Constructors, Circuits, Analytics,
│                        Research, Settings)
├── components/
│   ├── ui/              shadcn-style primitives on Radix (card, button, badge,
│   │                    select, tabs, tooltip, combobox, progress, skeleton)
│   ├── layout/          app-shell, sidebar (+ mobile drawer), top bar,
│   │                    command palette (⌘K), AI status
│   ├── charts/          Recharts theme + ChartBox wrapper
│   └── shared/          page header, stat card, insight, states, motion
├── hooks/use-f1.ts      typed TanStack Query hooks (one per endpoint)
├── lib/                 api client, types, formatters, nav config
└── store/ui-store.ts    Zustand (sidebar pin, season) with persistence
```

**Design system** (`app/globals.css`) — Tailwind v4 `@theme` tokens: a near-black surface scale, ~8% white borders, soft layered shadows, a single restrained F1-red accent, and a semantic data palette. Inter + JetBrains Mono via `next/font`. Dark-first.

**Data flow** — pages are client components that call typed hooks (`useDrivers`, `usePrediction`, `useSimulation`, …) backed by TanStack Query (5-minute stale time, since historical F1 data is immutable). The API client (`lib/api.ts`) funnels every request through one `request()` helper with typed responses and consistent error handling. Prediction and simulation responses carry only `driver_id`, so a `useDriverMap()` hook resolves names client-side.

## Key design decisions

- **Keep the proven backend, rebuild the frontend.** The ML/data layer was solid; the value-add was a complete UI/UX redesign from a cluttered cyberpunk dashboard to a calm, premium product.
- **SQLite + Parquet, Postgres-ready.** Zero-config locally; the warehouse is swappable to Neon/Postgres via `DATABASE_URL` for production.
- **Absolute API URL over rewrites.** The frontend talks to the backend via `NEXT_PUBLIC_API_URL`, so it deploys to Vercel with no same-origin proxy.
- **Honest UI.** Every control maps to real backend capability (e.g. the simulator runs on real historical race grids); no fake knobs.
