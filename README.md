# F1 Oracle AI — Formula 1 Predictive Intelligence Platform

> Advanced Racing Analytics, Strategy Simulation & AI Predictions

---

## Overview

**F1 Oracle AI** is a production-grade Formula 1 intelligence platform combining enterprise data engineering, advanced machine learning, Monte Carlo simulation, and a premium Next.js dashboard.

Built on 16 years of historical F1 data (2009–2024), it delivers:

- **Race winner prediction** with **AUC = 0.987** (XGBoost + LightGBM + CatBoost ensemble)
- **Monte Carlo race simulation** — 1,000 scenarios per race with probability distributions
- **GOAT Rankings** — mathematically justified all-time driver rankings
- **Driver DNA Profiling** — archetype classification (Dominant, Consistent, Aggressive, Strategic)
- **663 rivalry analyses** across 861 drivers and 212 constructors
- **Automated insight generation** — AI-detected statistical patterns
- **Premium dark-mode dashboard** — Bloomberg Terminal meets Formula 1

---

## Architecture

```
f1-oracle/
├── backend/           # FastAPI REST API (27 endpoints)
│   ├── api/v1/        # Versioned route handlers
│   ├── core/          # Database engine & session
│   ├── models/orm/    # SQLAlchemy star-schema ORM
│   └── services/      # Data & ML inference services
│
├── ml/                # Machine Learning systems
│   ├── data_pipeline/ # ETL: Extract → Transform → Load
│   │   ├── extract/   # CSV loading + schema validation
│   │   ├── transform/ # Cleaning + type correction
│   │   └── load/      # Star-schema warehouse load
│   ├── feature_engineering/  # 113-feature engineering pipeline
│   ├── models/
│   │   ├── race_winner/      # Model A: Winner prediction
│   │   ├── simulation/       # Model E: Monte Carlo engine
│   │   ├── timeseries/       # Model F: Prophet + LSTM forecasting
│   │   └── deep_learning/    # LSTM sequence models
│   └── analytics/            # Clustering, anomaly detection, insights
│
├── frontend/          # Next.js 16 + TypeScript dashboard
│   ├── src/app/       # App router pages (8 dashboards)
│   └── src/components/# Glassmorphism UI components
│
├── data/
│   ├── raw/           # Source CSV files (14 tables)
│   ├── features/      # Engineered feature store (Parquet)
│   └── models/        # Serialized ML artifacts
│
├── tests/             # 26 automated tests (100% passing)
│   ├── backend/       # API integration tests
│   └── ml/            # Feature & model validation tests
│
├── configs/           # Centralized settings
└── deployment/        # Docker + Compose
```

---

## Data Warehouse — Star Schema

**Fact Tables**
| Table | Records | Description |
|-------|---------|-------------|
| fact_race_results | 26,759 | Race finishing data |
| fact_lap_times | 588,455 | Per-lap timing data |
| fact_pit_stops | 10,834 | Pit stop events |
| fact_qualifying | 10,494 | Qualifying session data |
| fact_driver_standings | 34,863 | Championship standings |
| fact_constructor_standings | 13,391 | Constructor standings |

**Dimension Tables**
| Table | Records |
|-------|---------|
| dim_drivers | 861 |
| dim_constructors | 212 |
| dim_circuits | 77 |
| dim_races | 1,125 |
| dim_seasons | 75 |
| dim_status | 139 |

---

## Machine Learning Performance

| Model | Target | Algorithm | AUC | F1 |
|-------|--------|-----------|-----|-----|
| Model A | Race Winner | XGBoost | **0.987** | 0.750 |
| Model B | Podium | LightGBM | 0.942 | 0.640 |
| Model C | Top 10 | XGBoost | 0.942 | 0.876 |
| Model D | DNF | CatBoost | 0.957 | 0.793 |

**Feature Engineering — 113 Features:**
- Driver rolling form (3/5/10 race windows)
- Circuit specialization score
- Qualifying gap to pole
- Constructor reliability index
- Momentum score (pace trend slope)
- Championship pressure index
- Tire degradation proxy
- Pit stop efficiency metrics
- Era-normalized performance

---

## Simulation Engine

Monte Carlo race simulation runs **1,000 race scenarios** per prediction:

- Probabilistic lap time generation (normal distribution)
- Tire degradation modeling (linear slope)
- DNF events (per-driver historical probability)
- Safety car events (circuit-specific probability)
- Pit stop strategy (1-stop vs 2-stop optimization)
- Grid position advantage (0.5s/position)

Outputs: Win%, Podium%, Top10%, DNF%, average finishing position with confidence intervals.

---

## Feature Engineering Highlights

**GOAT Index** — Weighted composite score:
```
GOAT = 0.30 × win_rate_normalized
     + 0.20 × podium_rate_normalized
     + 0.20 × points_per_race_normalized
     + 0.15 × consistency_score
     + 0.10 × overtake_efficiency
     + 0.05 × reliability_score
```

**Circuit Chaos Index:**
```
Chaos = 0.4 × avg_dnf_rate
      + 0.3 × (1 - overtake_difficulty)
      + 0.3 × (avg_field_spread / 10)
```

**Consistency Score:**
```
Consistency = 1 / (1 + std_finish / mean_finish)
```

---

## API Reference

**Base URL:** `http://localhost:8000/api/v1`

| Endpoint | Description |
|----------|-------------|
| `GET /drivers/` | List all drivers (searchable) |
| `GET /drivers/goat` | GOAT rankings (top N) |
| `GET /drivers/clusters` | Driver archetypes (KMeans) |
| `GET /drivers/{id}` | Driver profile + career stats |
| `GET /drivers/{id}/history` | Full race history |
| `GET /races/` | Race list (filterable by year) |
| `GET /races/{id}/results` | Race finishing order |
| `GET /races/{id}/lap_times` | Per-lap telemetry |
| `GET /races/{id}/pit_stops` | Pit stop events |
| `GET /predictions/race/{id}` | AI win/podium/DNF probabilities |
| `GET /predictions/race/{id}/simulate` | Monte Carlo simulation |
| `GET /predictions/feature-importance/{target}` | SHAP values |
| `GET /analytics/circuits` | Circuit analytics |
| `GET /analytics/standings/drivers/{year}` | Championship table |
| `GET /analytics/rivalries` | Top teammate rivalries |

Interactive docs: `http://localhost:8000/docs`

---

## Dashboard Pages

| Page | Description |
|------|-------------|
| `/` | Executive Dashboard — KPIs, GOAT rankings, AI model performance |
| `/drivers` | Driver Analytics — profiles, archetypes, performance radar |
| `/races` | Race Center — results, lap times, pit stop analysis |
| `/predictions` | AI Prediction Center — win probabilities, Monte Carlo |
| `/analytics` | Circuit Intelligence + Rivalry Engine |
| `/goat` | GOAT Rankings — all-time greatness index |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the ETL pipeline (loads 688K+ records)
python scripts/run_pipeline.py

# Build feature engineering (113 features)
python ml/feature_engineering/feature_builder.py

# Train ML models (XGB + LGB + CatBoost)
python ml/models/race_winner/model.py

# Run analytics (clustering, rivalries, insights)
python ml/analytics/statistical_analysis.py

# Start API server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Run Tests
```bash
python -m pytest tests/ -v
# → 26/26 passed
```

---

## Technology Stack

**Backend:** Python 3.11, FastAPI, SQLAlchemy, SQLite/PostgreSQL  
**ML:** XGBoost, LightGBM, CatBoost, scikit-learn, SHAP, MLflow  
**Simulation:** NumPy, SciPy Monte Carlo engine  
**Analytics:** KMeans, DBSCAN, Isolation Forest, PCA, t-SNE  
**Frontend:** Next.js 16, TypeScript, Tailwind CSS, Recharts, Framer Motion  
**Storage:** Parquet feature store, SQLite warehouse  
**Testing:** pytest, FastAPI TestClient (26 tests, 100% pass rate)  
**MLOps:** MLflow experiment tracking, joblib model serialization  

---

## Key Findings

1. **Lewis Hamilton** has the highest GOAT score (era-normalized), driven by exceptional win rate, consistency, and longevity
2. **Fair Park circuit** has the highest historical DNF rate (69.2%) — extreme reliability demands
3. **Autódromo Internacional do Algarve** shows the strongest qualifying → race correlation (r=0.83)
4. **Grid position** is the single most important feature for race winner prediction (SHAP analysis)
5. **Rolling 5-race win rate** captures form better than career statistics for short-term predictions
6. **Constructor reliability** interacts strongly with grid position — the interaction term `grid × ctor_reliability` ranks top-5 in importance

---

*Built with advanced AI engineering principles — research-grade analytics, production-grade architecture.*
