# Portfolio & Showcase Pack

Ready-to-use copy for showcasing **F1 Oracle AI**.

---

## Elevator pitch (30 seconds)

> F1 Oracle AI is a full-stack Formula 1 machine-learning platform. It ingests 75 seasons of Grand Prix data into a warehouse and feature store, trains a gradient-boosting ensemble that predicts race winners at 0.987 ROC AUC, runs Monte Carlo race simulations, and serves it all through a premium Next.js dashboard with SHAP-based explanations. It's the kind of product you'd expect from a sports-analytics startup — end to end, built solo.

---

## GitHub repository description (short)

> 🏁 Premium Formula 1 ML platform — race-outcome predictions (0.987 AUC), Monte Carlo simulation, and 75 seasons of analytics. FastAPI + XGBoost/LightGBM/CatBoost + SHAP backend, Next.js 16 dashboard.

**Topics:** `machine-learning` `formula1` `fastapi` `nextjs` `xgboost` `data-science` `monte-carlo` `shap` `typescript` `sports-analytics`

---

## LinkedIn post

> 🏁 I built **F1 Oracle AI** — a premium Formula 1 machine-learning platform, end to end.
>
> It turns 75 seasons of Grand Prix data (1950–2024) into:
> 🎯 Race predictions — winner, podium, points & DNF, at **0.987 ROC AUC**
> 🎲 A Monte Carlo race simulator — thousands of iterations with confidence intervals
> 🔬 A research lab — driver clustering (PCA/t-SNE), SHAP feature attribution, correlations
> 📈 Deep driver, constructor & circuit analytics across 861 drivers and 77 circuits
>
> Under the hood:
> • **ML** — an XGBoost / LightGBM / CatBoost ensemble with SHAP explainability, tracked in MLflow
> • **Backend** — FastAPI over a star-schema warehouse + Parquet feature store
> • **Frontend** — Next.js 16, React 19, TypeScript and Tailwind v4, designed to feel like Linear meets a Bloomberg Terminal
>
> The hardest — and most satisfying — part wasn't the modelling; it was the product. I rebuilt the entire UI from scratch to make something genuinely calm and intuitive to use, where every control maps to a real model capability.
>
> Built with #MachineLearning #DataScience #NextJS #FastAPI #Python #TypeScript #Formula1
>
> 👉 [repo link]

---

## Resume bullet points

- Built a full-stack Formula 1 ML platform (FastAPI + Next.js 16) over a 27k-row engineered feature store spanning 1950–2024, serving predictions, simulations and analytics through a typed REST API.
- Trained and selected a gradient-boosting ensemble (XGBoost / LightGBM / CatBoost) achieving **0.987 ROC AUC** for race-winner prediction and 0.94–0.96 for podium, points and DNF, with **SHAP** explainability and MLflow experiment tracking.
- Engineered a Monte Carlo race-simulation engine producing win/podium/DNF probability distributions and finishing-position confidence intervals over thousands of iterations.
- Designed and shipped a premium, fully responsive dashboard (React 19, TypeScript, Tailwind v4, Radix, Recharts, Framer Motion, TanStack Query) with a command palette, collapsible navigation and eight purpose-built analytics pages.
- Architected a star-schema SQLite/Parquet data layer (Neon Postgres-ready) with an idempotent one-command ETL + training pipeline; 26 passing tests, clean lint and build gates.

---

## Portfolio project summary

**F1 Oracle AI** — *Full-stack ML platform · Solo project*

A production-grade Formula 1 intelligence platform combining data engineering, machine learning and product design. A one-command pipeline ingests the complete Ergast dataset into a star-schema warehouse and Parquet feature store, then trains four gradient-boosting classifiers (winner, podium, points, DNF) selected by held-out ROC AUC and explained with SHAP. A FastAPI service exposes predictions, a Monte Carlo simulation engine and rich analytics; a Next.js 16 dashboard — rebuilt from the ground up for a calm, premium feel — turns it into an effortless product across eight pages. **Stack:** Python, FastAPI, scikit-learn, XGBoost/LightGBM/CatBoost, SHAP, MLflow, Next.js 16, React 19, TypeScript, Tailwind v4.

---

## Interview talking points

- **Model selection & honesty** — why three boosters per target and best-by-AUC selection; how SHAP turns a black box into an explainable product feature rather than a buzzword.
- **Leakage & validation** — using a proper train/test split and features known *before* a race (qualifying, grid, rolling form, circuit history) so the 0.987 AUC is credible, not leaked.
- **Monte Carlo design** — modelling per-driver pace, variance and reliability to produce calibrated probability distributions and confidence intervals instead of a single point prediction.
- **Product over dashboard** — the deliberate rebuild from a cluttered cyberpunk UI to a restrained, whitespace-first design; mapping every UI control to a real backend capability (no fake knobs).
- **Architecture trade-offs** — SQLite + Parquet for zero-config local dev with a clean swap path to Neon Postgres; absolute-URL API consumption so the frontend deploys to Vercel with no proxy.
- **Engineering rigor** — typed end-to-end (Pydantic ↔ TypeScript), React Query caching tuned to immutable historical data, 26 tests, and clean lint/build gates enforced before every commit.

---

## Suggested screenshots to capture

1. **Overview** — hero + model-accuracy scoreboard + AI insights.
2. **Race Simulator** — animated outcome leaderboard after a 5,000-iteration run.
3. **AI Predictions** — podium cards + SHAP feature-importance chart.
4. **Research Lab** — PCA driver-clustering scatter.
5. **Drivers — Compare** — head-to-head radar.

Place exported images in `docs/screenshots/` and embed them at the top of the README.
