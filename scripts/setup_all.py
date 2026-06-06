"""
F1 Oracle AI — Master Setup Script
Runs the complete pipeline from raw CSVs to a fully operational platform.
"""
import sys
import time
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("f1_setup")


def run_phase(phase_num: int, phase_name: str, func):
    logger.info(f"\n{'='*60}")
    logger.info(f"PHASE {phase_num}: {phase_name}")
    logger.info(f"{'='*60}")
    start = time.time()
    result = func()
    elapsed = time.time() - start
    logger.info(f"Phase {phase_num} complete in {elapsed:.1f}s\n")
    return result


def phase1_etl():
    from ml.data_pipeline.extract.loader import load_all_raw
    from ml.data_pipeline.transform.cleaner import clean_all
    from ml.data_pipeline.load.db_loader import create_schema, truncate_all, load_dimensions, load_facts

    raw, reports = load_all_raw()
    clean = clean_all(raw)
    create_schema()
    truncate_all()
    load_dimensions(clean)
    load_facts(clean)
    return clean


def phase2_features():
    from ml.feature_engineering.feature_builder import build_all_features
    return build_all_features(save=True)


def phase3_models():
    import pandas as pd
    from configs.settings import settings
    from ml.models.race_winner.model import train_all_models
    master_df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    return train_all_models(master_df)


def phase4_analytics():
    import pandas as pd
    from configs.settings import settings
    from ml.analytics.statistical_analysis import (
        cluster_drivers, compute_rivalries, generate_insights, detect_race_anomalies
    )
    from sqlalchemy import text
    from backend.core.database import engine

    master_df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    driver_career = pd.read_parquet(settings.FEATURES_DIR / "driver_career.parquet")
    circuit_features = pd.read_parquet(settings.FEATURES_DIR / "circuit_features.parquet")

    with engine.connect() as conn:
        drivers = pd.read_sql("SELECT * FROM dim_drivers", conn)

    clustered = cluster_drivers(driver_career)
    clustered.to_parquet(settings.FEATURES_DIR / "driver_clusters.parquet", index=False)

    rivalries = compute_rivalries(master_df, drivers)
    rivalries.to_parquet(settings.FEATURES_DIR / "rivalries.parquet", index=False)

    insights = generate_insights(master_df, driver_career, circuit_features)

    logger.info(f"Generated {len(insights)} insights:")
    for ins in insights:
        logger.info(f"  {ins['text']}")

    return {"clusters": clustered, "rivalries": rivalries, "insights": insights}


def phase5_simulation():
    import pandas as pd
    from configs.settings import settings
    from ml.models.simulation.monte_carlo import (
        build_driver_profiles_from_features, run_monte_carlo, RaceConfig
    )

    master_df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    last_race = master_df["race_id"].max()
    profiles = build_driver_profiles_from_features(master_df, last_race)

    logger.info(f"Running 1,000 Monte Carlo simulations for race {last_race}...")
    config = RaceConfig(n_laps=57)
    sim_results = run_monte_carlo(profiles, config, n_simulations=1000)

    sim_results.to_parquet(settings.ARTIFACTS_DIR / "simulation_results.parquet", index=False)
    logger.info(f"Top 5 predicted winners:")
    for _, row in sim_results.head(5).iterrows():
        logger.info(f"  {row['name']}: Win={row['win_probability']*100:.1f}%, Podium={row['podium_probability']*100:.1f}%")

    return sim_results


if __name__ == "__main__":
    total_start = time.time()
    logger.info("\n" + "🏎️ " * 20)
    logger.info("F1 ORACLE AI — COMPLETE SETUP")
    logger.info("🏎️ " * 20 + "\n")

    run_phase(1, "Data Pipeline (ETL)", phase1_etl)
    run_phase(2, "Feature Engineering (113 features)", phase2_features)
    run_phase(3, "ML Model Training (XGB + LGB + CatBoost)", phase3_models)
    run_phase(4, "Analytics (Clustering, Rivalries, Insights)", phase4_analytics)
    run_phase(5, "Monte Carlo Simulation (1,000 races)", phase5_simulation)

    total = time.time() - total_start
    logger.info(f"\n{'='*60}")
    logger.info(f"SETUP COMPLETE in {total:.0f}s")
    logger.info(f"{'='*60}")
    logger.info("\nNext steps:")
    logger.info("  API:      uvicorn backend.main:app --host 0.0.0.0 --port 8000")
    logger.info("  Frontend: cd frontend && npm run dev")
    logger.info("  Tests:    python -m pytest tests/ -v")
    logger.info("  Docs:     http://localhost:8000/docs")
    logger.info("  App:      http://localhost:3000")
