"""
Advanced Statistical Analysis & Analytics Engine
Clustering, rivalry detection, anomaly detection, era comparison.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import warnings
warnings.filterwarnings("ignore")

import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.ensemble import IsolationForest
from scipy import stats

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Driver Clustering
# ─────────────────────────────────────────────────────────────

CLUSTER_FEATURES = [
    "win_rate", "podium_rate", "dnf_rate", "consistency_score",
    "avg_positions_gained", "overtake_efficiency",
    "avg_points_per_race", "total_races",
]


def cluster_drivers(driver_career: pd.DataFrame, n_clusters: int = 6) -> pd.DataFrame:
    """KMeans clustering of drivers by career profile."""
    df = driver_career.copy()
    feat_cols = [c for c in CLUSTER_FEATURES if c in df.columns]

    X = df[feat_cols].copy()
    X = X.fillna(X.median())

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df["cluster"] = km.fit_predict(X_scaled)

    # PCA for visualization
    pca = PCA(n_components=2, random_state=42)
    pca_coords = pca.fit_transform(X_scaled)
    df["pca_x"] = pca_coords[:, 0]
    df["pca_y"] = pca_coords[:, 1]

    # TSNE for visualization
    tsne = TSNE(n_components=2, random_state=42, perplexity=min(30, len(df) - 1))
    tsne_coords = tsne.fit_transform(X_scaled)
    df["tsne_x"] = tsne_coords[:, 0]
    df["tsne_y"] = tsne_coords[:, 1]

    # Label clusters by their dominant characteristic
    cluster_labels = {}
    for c in range(n_clusters):
        cdf = df[df["cluster"] == c]
        if cdf["win_rate"].mean() > 0.15:
            label = "Champions"
        elif cdf["consistency_score"].mean() > 0.7:
            label = "Consistent Performers"
        elif cdf["dnf_rate"].mean() > 0.25:
            label = "High Risk"
        elif cdf["total_races"].mean() < 30:
            label = "Short Career"
        elif cdf["avg_positions_gained"].mean() > 2:
            label = "Race Craft Masters"
        else:
            label = f"Cluster {c}"
        cluster_labels[c] = label

    df["cluster_label"] = df["cluster"].map(cluster_labels)

    logger.info(f"Driver clustering complete: {n_clusters} clusters")
    for c, label in cluster_labels.items():
        n = (df["cluster"] == c).sum()
        logger.info(f"  {label}: {n} drivers")

    return df


# ─────────────────────────────────────────────────────────────
# Constructor Dominance Cycles
# ─────────────────────────────────────────────────────────────

def compute_constructor_dominance(constructor_standings: pd.DataFrame,
                                  races: pd.DataFrame,
                                  constructors: pd.DataFrame) -> pd.DataFrame:
    """Compute per-season constructor dominance index."""
    df = constructor_standings.merge(
        races[["race_id", "year", "round"]], on="race_id", how="left"
    )

    # Season-end standings: last round of each season
    season_end = df.sort_values("round").groupby(["year", "constructor_id"]).last().reset_index()

    # Dominance = top constructor's points / total field points
    season_total_pts = season_end.groupby("year")["points"].sum().reset_index()
    season_total_pts.columns = ["year", "total_season_pts"]

    season_end = season_end.merge(season_total_pts, on="year")
    season_end["dominance_share"] = season_end["points"] / season_end["total_season_pts"].clip(1)

    # Add constructor names
    season_end = season_end.merge(
        constructors[["constructor_id", "name"]], on="constructor_id", how="left"
    )

    return season_end.sort_values(["year", "dominance_share"], ascending=[True, False])


# ─────────────────────────────────────────────────────────────
# Anomaly Detection
# ─────────────────────────────────────────────────────────────

def detect_race_anomalies(master_df: pd.DataFrame) -> pd.DataFrame:
    """Use Isolation Forest to detect statistically surprising race performances."""
    features = ["grid", "position", "positions_gained", "lap_cv", "clean_avg_lap_ms"]
    feat_cols = [c for c in features if c in master_df.columns]

    X = master_df[feat_cols].dropna()

    iso = IsolationForest(contamination=0.05, random_state=42, n_jobs=-1)
    anomaly_scores = iso.fit_predict(X)

    result = master_df.loc[X.index].copy()
    result["anomaly_score"] = iso.score_samples(X)
    result["is_anomaly"] = anomaly_scores == -1

    anomalies = result[result["is_anomaly"]].sort_values("anomaly_score")
    logger.info(f"Detected {len(anomalies)} anomalous performances ({len(anomalies)/len(master_df)*100:.1f}%)")

    return anomalies


# ─────────────────────────────────────────────────────────────
# Era Normalization Engine
# ─────────────────────────────────────────────────────────────

def normalize_across_eras(driver_career: pd.DataFrame,
                           master_df: pd.DataFrame) -> pd.DataFrame:
    """Adjust driver performance metrics for era competitiveness."""
    # Era competitive index: average points per race for top-10 drivers in each 5-year period
    master_df["era"] = (master_df["year"] // 5) * 5

    era_baseline = master_df.groupby("era").apply(
        lambda x: x.nsmallest(10, "position")["points"].mean(),
        include_groups=False,
    ).reset_index()
    era_baseline.columns = ["era", "era_top10_avg_points"]

    # Map drivers to their primary era
    driver_era = master_df.groupby("driver_id")["era"].agg(
        lambda x: x.value_counts().index[0]
    ).reset_index()

    result = driver_career.merge(driver_era, on="driver_id", how="left")
    result = result.merge(era_baseline, on="era", how="left")

    # Era-adjusted points: normalize relative to era baseline
    result["era_adjusted_points"] = (
        result["avg_points_per_race"] / result["era_top10_avg_points"].clip(1)
    )

    # Percentile rank within era
    result["era_percentile_rank"] = result.groupby("era")["avg_points_per_race"].rank(pct=True)

    return result


# ─────────────────────────────────────────────────────────────
# Rivalry Engine
# ─────────────────────────────────────────────────────────────

def compute_rivalries(master_df: pd.DataFrame,
                      drivers: pd.DataFrame,
                      min_shared_races: int = 10) -> pd.DataFrame:
    """Analyze head-to-head driver rivalries within same team."""
    results = master_df[["race_id", "driver_id", "constructor_id", "position",
                          "points", "grid", "year"]].copy()

    # Find pairs of teammates per race
    team_races = results.groupby(["race_id", "constructor_id"])
    rivalry_records = []

    for (race_id, ctor_id), grp in team_races:
        if len(grp) < 2:
            continue
        # Pairwise comparison
        drivers_in_race = grp.sort_values("driver_id").reset_index(drop=True)
        for i in range(len(drivers_in_race)):
            for j in range(i + 1, len(drivers_in_race)):
                d1 = drivers_in_race.iloc[i]
                d2 = drivers_in_race.iloc[j]

                d1_pos = d1["position"] if pd.notna(d1["position"]) else 25
                d2_pos = d2["position"] if pd.notna(d2["position"]) else 25

                rivalry_records.append({
                    "race_id": race_id,
                    "year": d1["year"],
                    "constructor_id": ctor_id,
                    "driver_id_1": min(d1["driver_id"], d2["driver_id"]),
                    "driver_id_2": max(d1["driver_id"], d2["driver_id"]),
                    "d1_ahead": d1_pos < d2_pos,
                    "d1_points": d1["points"],
                    "d2_points": d2["points"],
                })

    if not rivalry_records:
        return pd.DataFrame()

    rdf = pd.DataFrame(rivalry_records)

    agg = rdf.groupby(["driver_id_1", "driver_id_2"]).agg(
        shared_races=("race_id", "count"),
        d1_wins=("d1_ahead", "sum"),
        years_together=("year", "nunique"),
    ).reset_index()

    agg = agg[agg["shared_races"] >= min_shared_races].copy()
    agg["d2_wins"] = agg["shared_races"] - agg["d1_wins"]
    agg["d1_win_pct"] = agg["d1_wins"] / agg["shared_races"]

    # Add driver names
    driver_names = drivers.set_index("driver_id")["full_name"].to_dict()
    agg["driver_1_name"] = agg["driver_id_1"].map(driver_names)
    agg["driver_2_name"] = agg["driver_id_2"].map(driver_names)

    # Rivalry intensity: more races = more intense
    agg["rivalry_intensity"] = agg["shared_races"] / agg["shared_races"].max()

    return agg.sort_values("shared_races", ascending=False).reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# Insight Generation Engine
# ─────────────────────────────────────────────────────────────

def generate_insights(master_df: pd.DataFrame, driver_career: pd.DataFrame,
                      circuit_features: pd.DataFrame) -> List[Dict]:
    """Auto-generate statistical insights from the data."""
    insights = []

    # 1. Best wet weather driver (proxy: high performance gain vs grid)
    if "positions_gained" in master_df.columns and "circuit_chaos_index" in master_df.columns:
        chaotic_races = master_df[master_df["circuit_chaos_index"] > 0.5]
        if len(chaotic_races) > 0:
            best_chaos = chaotic_races.groupby("driver_id")["positions_gained"].mean()
            best_chaos_driver = best_chaos.idxmax()
            best_chaos_val = best_chaos.max()
            insights.append({
                "type": "driver_strength",
                "icon": "storm",
                "text": f"Driver #{best_chaos_driver} gains avg {best_chaos_val:.1f} positions in chaotic/wet-like races — highest chaos performance in history.",
                "metric": float(best_chaos_val),
                "category": "Driver Intelligence",
            })

    # 2. Qualifying-sensitive circuit
    if "quali_position" in master_df.columns:
        circuit_quali_corr = master_df.groupby("circuit_id").apply(
            lambda x: x["quali_position"].corr(x["position"].fillna(20)),
            include_groups=False,
        ).dropna()
        if len(circuit_quali_corr) > 0:
            best_quali_circuit = circuit_quali_corr.idxmax()
            corr_val = circuit_quali_corr.max()
            cf = circuit_features[circuit_features["circuit_id"] == best_quali_circuit]
            circuit_name = cf["name"].values[0] if len(cf) > 0 else f"Circuit #{best_quali_circuit}"
            insights.append({
                "type": "circuit_pattern",
                "icon": "track",
                "text": f"{circuit_name} has the strongest qualifying-to-race correlation (r={corr_val:.2f}) — pole position is critical here.",
                "metric": float(corr_val),
                "category": "Circuit Intelligence",
            })

    # 3. Best consistency performer
    if "consistency_score" in driver_career.columns and "total_races" in driver_career.columns:
        veterans = driver_career[driver_career["total_races"] >= 50]
        if len(veterans) > 0:
            most_consistent = veterans.loc[veterans["consistency_score"].idxmax()]
            insights.append({
                "type": "driver_profile",
                "icon": "medal",
                "text": f"Driver #{int(most_consistent['driver_id'])} has the highest consistency score ({most_consistent['consistency_score']:.3f}) among drivers with 50+ races.",
                "metric": float(most_consistent["consistency_score"]),
                "category": "Driver Intelligence",
            })

    # 4. High DNF circuit
    if "avg_dnf_rate" in circuit_features.columns:
        most_dangerous = circuit_features.loc[circuit_features["avg_dnf_rate"].idxmax()]
        insights.append({
            "type": "circuit_risk",
            "icon": "warning",
            "text": f"{most_dangerous.get('name', 'Unknown')} has the highest historical DNF rate ({most_dangerous['avg_dnf_rate']*100:.1f}%) — reliability is paramount here.",
            "metric": float(most_dangerous["avg_dnf_rate"]),
            "category": "Circuit Intelligence",
        })

    # 5. Constructor pit stop excellence
    if "ctor_avg_pit_duration_s" in master_df.columns:
        ctor_pit = master_df.groupby("constructor_id")["ctor_avg_pit_duration_s"].mean().dropna()
        if len(ctor_pit) > 0:
            fastest_ctor = ctor_pit.idxmin()
            fastest_val = ctor_pit.min()
            insights.append({
                "type": "constructor_strategy",
                "icon": "pit",
                "text": f"Constructor #{fastest_ctor} has the fastest average pit stop time ({fastest_val:.2f}s) — a significant strategic edge.",
                "metric": float(fastest_val),
                "category": "Constructor Intelligence",
            })

    logger.info(f"Generated {len(insights)} automated insights")
    return insights


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    from configs.settings import settings
    from sqlalchemy import text
    from backend.core.database import engine

    master_df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    driver_career = pd.read_parquet(settings.FEATURES_DIR / "driver_career.parquet")
    circuit_features = pd.read_parquet(settings.FEATURES_DIR / "circuit_features.parquet")

    with engine.connect() as conn:
        drivers = pd.read_sql("SELECT * FROM dim_drivers", conn)
        ctor_standings = pd.read_sql("SELECT * FROM fact_constructor_standings", conn)
        constructors = pd.read_sql("SELECT * FROM dim_constructors", conn)
        races = pd.read_sql("SELECT * FROM dim_races", conn)

    logger.info("Running driver clustering...")
    clustered = cluster_drivers(driver_career, n_clusters=6)
    clustered.to_parquet(settings.FEATURES_DIR / "driver_clusters.parquet", index=False)
    logger.info("Driver clustering saved")

    logger.info("Detecting anomalies...")
    anomalies = detect_race_anomalies(master_df)
    logger.info(f"Found {len(anomalies)} anomalies")

    logger.info("Computing rivalries...")
    rivalries = compute_rivalries(master_df, drivers)
    rivalries.to_parquet(settings.FEATURES_DIR / "rivalries.parquet", index=False)
    logger.info(f"Found {len(rivalries)} rivalries")

    logger.info("Generating insights...")
    insights = generate_insights(master_df, driver_career, circuit_features)
    for ins in insights:
        logger.info(f"  [{ins['category']}] {ins['text']}")

    logger.info("Statistical analysis complete!")
