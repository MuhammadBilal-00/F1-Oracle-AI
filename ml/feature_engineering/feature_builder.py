"""
Advanced Feature Engineering — F1 Oracle AI
Generates 60+ racing intelligence features from the data warehouse.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import logging
import numpy as np
import pandas as pd
from typing import Dict, Tuple
from sqlalchemy import text

from backend.core.database import engine

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Data Loading from Warehouse
# ─────────────────────────────────────────────────────────────

def load_warehouse() -> Dict[str, pd.DataFrame]:
    """Pull all fact + dimension tables from the warehouse."""
    tables = [
        "fact_race_results", "fact_lap_times", "fact_pit_stops",
        "fact_qualifying", "fact_driver_standings", "fact_constructor_standings",
        "dim_drivers", "dim_constructors", "dim_circuits", "dim_races", "dim_status",
    ]
    data = {}
    with engine.connect() as conn:
        for t in tables:
            data[t] = pd.read_sql(f"SELECT * FROM {t}", conn)
    logger.info(f"Loaded {len(data)} tables from warehouse")
    return data


# ─────────────────────────────────────────────────────────────
# Helper Utilities
# ─────────────────────────────────────────────────────────────

def rolling_mean(series: pd.Series, window: int, min_periods: int = 1) -> pd.Series:
    return series.rolling(window=window, min_periods=min_periods).mean()


def z_score(series: pd.Series) -> pd.Series:
    std = series.std()
    if std == 0 or pd.isna(std):
        return pd.Series(0.0, index=series.index)
    return (series - series.mean()) / std


def safe_ratio(num: pd.Series, den: pd.Series, fill: float = 0.0) -> pd.Series:
    return num.div(den.replace(0, np.nan)).fillna(fill)


# ─────────────────────────────────────────────────────────────
# Driver-Level Feature Engineering
# ─────────────────────────────────────────────────────────────

def build_driver_career_features(results: pd.DataFrame, races: pd.DataFrame) -> pd.DataFrame:
    """Compute per-driver historical performance features."""
    df = results.merge(races[["race_id", "year", "round", "circuit_id"]], on="race_id", how="left")
    df = df.sort_values(["driver_id", "year", "round"])

    driver_stats = []

    for driver_id, grp in df.groupby("driver_id"):
        grp = grp.copy().reset_index(drop=True)
        n = len(grp)

        # Core metrics
        finished = grp[grp["finished"].astype(bool)]["position"]
        total_races = n
        total_wins = (grp["position"] == 1).sum()
        total_podiums = (grp["position"] <= 3).sum()
        total_top10 = (grp["position"] <= 10).sum()
        dnf_count = (~grp["finished"].astype(bool)).sum()

        avg_finish = finished.mean() if len(finished) > 0 else np.nan
        finish_std = finished.std() if len(finished) > 1 else 0
        win_rate = total_wins / total_races if total_races > 0 else 0
        podium_rate = total_podiums / total_races if total_races > 0 else 0
        dnf_rate = dnf_count / total_races if total_races > 0 else 0

        # Position gain analysis
        pg = grp["positions_gained"].dropna()
        avg_positions_gained = pg.mean() if len(pg) > 0 else 0
        overtake_efficiency = (pg > 0).sum() / len(pg) if len(pg) > 0 else 0

        # Points
        total_points = grp["points"].sum()
        avg_points_per_race = total_points / total_races if total_races > 0 else 0

        # Qualifying
        if "grid" in grp.columns:
            avg_grid = grp["grid"].dropna().mean()
            quali_race_delta = avg_grid - avg_finish if pd.notna(avg_grid) and pd.notna(avg_finish) else np.nan
        else:
            avg_grid, quali_race_delta = np.nan, np.nan

        # Consistency score: inverse of std dev normalized by mean
        consistency_score = 1 / (1 + finish_std / avg_finish) if pd.notna(avg_finish) and avg_finish > 0 else 0

        # Season span & activity
        years_active = grp["year"].nunique()
        first_year = grp["year"].min()
        last_year = grp["year"].max()
        career_length = last_year - first_year + 1

        driver_stats.append({
            "driver_id": driver_id,
            "total_races": total_races,
            "total_wins": total_wins,
            "total_podiums": total_podiums,
            "total_top10": total_top10,
            "total_points": total_points,
            "total_dnf": dnf_count,
            "avg_finish_position": avg_finish,
            "finish_std": finish_std,
            "win_rate": win_rate,
            "podium_rate": podium_rate,
            "top10_rate": total_top10 / total_races if total_races > 0 else 0,
            "dnf_rate": dnf_rate,
            "avg_positions_gained": avg_positions_gained,
            "overtake_efficiency": overtake_efficiency,
            "avg_points_per_race": avg_points_per_race,
            "avg_grid_position": avg_grid,
            "quali_race_delta": quali_race_delta,
            "consistency_score": consistency_score,
            "years_active": years_active,
            "first_year": first_year,
            "last_year": last_year,
            "career_length": career_length,
        })

    return pd.DataFrame(driver_stats)


def build_driver_circuit_features(results: pd.DataFrame, races: pd.DataFrame) -> pd.DataFrame:
    """Per-driver × circuit historical performance (track specialization)."""
    df = results.merge(races[["race_id", "circuit_id"]], on="race_id", how="left")

    stats = []
    for (driver_id, circuit_id), grp in df.groupby(["driver_id", "circuit_id"]):
        finished = grp[grp["finished"].astype(bool)]["position"]
        n = len(grp)
        stats.append({
            "driver_id": driver_id,
            "circuit_id": circuit_id,
            "circuit_races": n,
            "circuit_wins": (grp["position"] == 1).sum(),
            "circuit_podiums": (grp["position"] <= 3).sum(),
            "circuit_avg_finish": finished.mean() if len(finished) > 0 else np.nan,
            "circuit_win_rate": (grp["position"] == 1).sum() / n,
            "circuit_dnf_rate": (~grp["finished"].astype(bool)).sum() / n,
        })

    circuit_df = pd.DataFrame(stats)
    # Track specialization: performance relative to driver's overall average
    career = build_driver_career_features(results, races)[["driver_id", "avg_finish_position"]]
    circuit_df = circuit_df.merge(career, on="driver_id", how="left")
    circuit_df["track_specialization_score"] = (
        circuit_df["avg_finish_position"] - circuit_df["circuit_avg_finish"]
    ).clip(-10, 10)

    return circuit_df


def build_driver_rolling_features(results: pd.DataFrame, races: pd.DataFrame,
                                   windows: list = [3, 5, 10]) -> pd.DataFrame:
    """Rolling window features — recent form, momentum."""
    df = results.merge(races[["race_id", "year", "round"]], on="race_id", how="left")
    df = df.sort_values(["driver_id", "year", "round"]).copy()

    feature_dfs = []

    for driver_id, grp in df.groupby("driver_id"):
        grp = grp.copy().reset_index(drop=True)

        for w in windows:
            # Shift by 1 so features don't include current race (avoid leakage)
            grp[f"rolling_{w}r_avg_pos"] = grp["position"].shift(1).rolling(w, min_periods=1).mean()
            grp[f"rolling_{w}r_points"] = grp["points"].shift(1).rolling(w, min_periods=1).sum()
            grp[f"rolling_{w}r_dnf_rate"] = (~grp["finished"]).astype(float).shift(1).rolling(w, min_periods=1).mean()
            grp[f"rolling_{w}r_win_rate"] = (grp["position"] == 1).astype(float).shift(1).rolling(w, min_periods=1).mean()

        # Momentum: slope of recent position trend
        def compute_momentum(pos_series, w=5):
            pos = pos_series.fillna(20)
            slopes = []
            for i in range(len(pos)):
                if i < 2:
                    slopes.append(0.0)
                    continue
                start = max(0, i - w)
                window_vals = pos.iloc[start:i].values
                if len(window_vals) < 2:
                    slopes.append(0.0)
                    continue
                x = np.arange(len(window_vals))
                slope = np.polyfit(x, window_vals, 1)[0]
                slopes.append(-slope)  # negative = improving
            return pd.Series(slopes, index=pos_series.index)

        grp["momentum_score"] = compute_momentum(grp["position"])

        # Season momentum: cumulative points within season vs prior year
        grp["season_race_num"] = grp.groupby("year").cumcount() + 1
        grp["season_cum_points"] = grp.groupby("year")["points"].cumsum()

        feature_dfs.append(grp)

    return pd.concat(feature_dfs, ignore_index=True)


# ─────────────────────────────────────────────────────────────
# Constructor Feature Engineering
# ─────────────────────────────────────────────────────────────

def build_constructor_features(results: pd.DataFrame, races: pd.DataFrame,
                                pit_stops: pd.DataFrame) -> pd.DataFrame:
    df = results.merge(races[["race_id", "year", "round"]], on="race_id", how="left")
    df = df.sort_values(["constructor_id", "year", "round"])

    constructor_stats = []

    for ctor_id, grp in df.groupby("constructor_id"):
        n = len(grp)
        finished = grp[grp["finished"].astype(bool)]

        # Pit stop efficiency
        ps = pit_stops[pit_stops["driver_id"].isin(
            grp["driver_id"].unique()
        )].copy()
        avg_pit_duration = ps["duration_ms"].mean() / 1000 if len(ps) > 0 else np.nan
        pit_consistency = ps["duration_ms"].std() / 1000 if len(ps) > 1 else 0

        constructor_stats.append({
            "constructor_id": ctor_id,
            "total_race_entries": n,
            "total_wins": (grp["position"] == 1).sum(),
            "total_podiums": (grp["position"] <= 3).sum(),
            "total_points": grp["points"].sum(),
            "avg_finish_position": finished["position"].mean() if len(finished) > 0 else np.nan,
            "reliability_score": len(finished) / n if n > 0 else 0,
            "dnf_rate": (~grp["finished"].astype(bool)).sum() / n if n > 0 else 0,
            "avg_pit_duration_s": avg_pit_duration,
            "pit_consistency_s": pit_consistency,
            "win_rate": (grp["position"] == 1).sum() / n if n > 0 else 0,
            "podium_rate": (grp["position"] <= 3).sum() / n if n > 0 else 0,
            "avg_positions_gained": grp["positions_gained"].mean(),
            "years_active": grp["year"].nunique(),
            "first_year": grp["year"].min(),
            "last_year": grp["year"].max(),
        })

    return pd.DataFrame(constructor_stats)


# ─────────────────────────────────────────────────────────────
# Lap Time Feature Engineering
# ─────────────────────────────────────────────────────────────

def build_lap_features(lap_times: pd.DataFrame) -> pd.DataFrame:
    """Per race × driver lap time analytics."""
    stats = []

    for (race_id, driver_id), grp in lap_times.groupby(["race_id", "driver_id"]):
        laps = grp.sort_values("lap")
        ms = laps["milliseconds"].dropna()

        if len(ms) < 3:
            continue

        # Basic stats
        avg_lap_ms = ms.mean()
        fastest_lap_ms = ms.min()
        slowest_lap_ms = ms.max()
        lap_std = ms.std()

        # Pace consistency (CV)
        lap_cv = lap_std / avg_lap_ms if avg_lap_ms > 0 else 0

        # Degradation: slope of pace over stint
        x = np.arange(len(ms))
        try:
            slope, _ = np.polyfit(x, ms.values, 1)
        except Exception:
            slope = 0

        # Identify probable pit laps (lap times > 1.5× median = pit/SC lap)
        median_lap = ms.median()
        clean_laps = ms[ms < 1.5 * median_lap]

        # Stint analysis
        n_stints = (ms > 1.5 * median_lap).sum() + 1  # rough stint count

        stats.append({
            "race_id": race_id,
            "driver_id": driver_id,
            "n_laps": len(ms),
            "avg_lap_ms": avg_lap_ms,
            "fastest_lap_ms": fastest_lap_ms,
            "slowest_lap_ms": slowest_lap_ms,
            "lap_std_ms": lap_std,
            "lap_cv": lap_cv,
            "pace_degradation_slope": slope,
            "clean_avg_lap_ms": clean_laps.mean() if len(clean_laps) > 0 else avg_lap_ms,
            "n_slow_laps": (ms > 1.5 * median_lap).sum(),
            "estimated_stints": n_stints,
        })

    return pd.DataFrame(stats)


# ─────────────────────────────────────────────────────────────
# Qualifying Feature Engineering
# ─────────────────────────────────────────────────────────────

def build_qualifying_features(qualifying: pd.DataFrame, results: pd.DataFrame,
                               races: pd.DataFrame) -> pd.DataFrame:
    """Qualifying → race performance delta and improvement rates."""
    q = qualifying.copy()
    r = results[["race_id", "driver_id", "position", "finished"]].copy()
    races_info = races[["race_id", "year", "circuit_id"]].copy()

    merged = q.merge(r, on=["race_id", "driver_id"], how="left")
    merged = merged.merge(races_info, on="race_id", how="left")

    # Qualifying–race position delta (positive = gained positions)
    merged["quali_to_race_delta"] = merged["position_x"] - merged["position_y"]
    merged.rename(columns={"position_x": "quali_position", "position_y": "race_position"}, inplace=True)

    # Qualify session participation (indicates team's setup pace)
    merged["reached_q2"] = merged["q2_ms"].notna().astype(int)
    merged["reached_q3"] = merged["q3_ms"].notna().astype(int)

    # Gap to pole (best Q3 or Q1 time as reference)
    for session in ["q1_ms", "q2_ms", "q3_ms"]:
        if session in merged.columns:
            session_best = merged.groupby("race_id")[session].transform("min")
            merged[f"{session}_gap_to_best"] = merged[session] - session_best

    return merged


# ─────────────────────────────────────────────────────────────
# Circuit Feature Engineering
# ─────────────────────────────────────────────────────────────

def build_circuit_features(circuits: pd.DataFrame, results: pd.DataFrame,
                            races: pd.DataFrame, pit_stops: pd.DataFrame) -> pd.DataFrame:
    """Circuit-level analytics: difficulty, overtaking, chaos index."""
    df = results.merge(races[["race_id", "circuit_id", "year"]], on="race_id", how="left")

    circuit_stats = []

    for circuit_id, grp in df.groupby("circuit_id"):
        races_at_circuit = grp["race_id"].nunique()
        avg_dnf_rate = (~grp["finished"].astype(bool)).sum() / len(grp) if len(grp) > 0 else 0
        position_changes = grp["positions_gained"].abs().mean()

        # Overtake index: races where the winner did NOT start from pole
        race_results = grp.groupby("race_id").apply(
            lambda x: (x.loc[x["position"] == 1, "grid"] != 1).any(),
            include_groups=False,
        )
        overtake_index = race_results.mean() if len(race_results) > 0 else 0.5

        # Average field spread (std of finishing positions)
        avg_field_spread = grp.groupby("race_id")["position"].std().mean()

        # Pit stop count per race
        race_ids = grp["race_id"].unique()
        circuit_ps = pit_stops[pit_stops["race_id"].isin(race_ids)]
        avg_stops_per_race = circuit_ps.groupby("race_id")["stop"].max().mean() if len(circuit_ps) > 0 else np.nan

        circ_col = "circuit_id" if "circuit_id" in circuits.columns else "circuitid"
        circuit_info = circuits[circuits[circ_col] == circuit_id].iloc[0] if len(
            circuits[circuits[circ_col] == circuit_id]) > 0 else None

        circuit_stats.append({
            "circuit_id": circuit_id,
            "name": circuit_info["name"] if circuit_info is not None else "Unknown",
            "country": circuit_info["country"] if circuit_info is not None else "Unknown",
            "total_races_hosted": races_at_circuit,
            "avg_dnf_rate": avg_dnf_rate,
            "avg_positions_changed": position_changes,
            "overtake_index": overtake_index,
            "avg_field_spread": avg_field_spread,
            "avg_pit_stops_per_race": avg_stops_per_race,
            "circuit_chaos_index": avg_dnf_rate * 0.4 + (1 - overtake_index) * 0.3 + (avg_field_spread / 10) * 0.3,
        })

    return pd.DataFrame(circuit_stats)


# ─────────────────────────────────────────────────────────────
# Master Feature Matrix for ML
# ─────────────────────────────────────────────────────────────

def build_master_feature_matrix(data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Build the master ML feature matrix:
    One row per (race × driver) with all engineered features attached.
    """
    results = data["fact_race_results"]
    races = data["dim_races"]
    circuits = data["dim_circuits"].rename(columns={"circuit_id": "circuitid"})
    drivers = data["dim_drivers"]
    constructors = data["dim_constructors"]
    qualifying = data["fact_qualifying"]
    pit_stops = data["fact_pit_stops"]
    lap_times = data["fact_lap_times"]

    logger.info("Building master feature matrix...")

    # Base: results with race info
    races_small = races[["race_id", "year", "round", "circuit_id"]].copy()
    df = results.merge(races_small, on="race_id", how="left")
    df = df.sort_values(["driver_id", "year", "round"]).reset_index(drop=True)

    # 1. Driver career features
    logger.info("  Computing driver career features...")
    driver_career = build_driver_career_features(results, races_small)
    df = df.merge(driver_career, on="driver_id", how="left", suffixes=("", "_career"))

    # 2. Rolling features (pre-race form)
    logger.info("  Computing rolling form features...")
    rolling = build_driver_rolling_features(results, races_small)
    rolling_cols = [c for c in rolling.columns if "rolling_" in c or "momentum" in c or "season_" in c]
    rolling_keep = ["race_id", "driver_id"] + rolling_cols
    df = df.merge(rolling[rolling_keep], on=["race_id", "driver_id"], how="left")

    # 3. Constructor features
    logger.info("  Computing constructor features...")
    ctor_features = build_constructor_features(results, races_small, pit_stops)
    ctor_rename = {c: f"ctor_{c}" for c in ctor_features.columns if c != "constructor_id"}
    ctor_features = ctor_features.rename(columns=ctor_rename)
    df = df.merge(ctor_features, on="constructor_id", how="left")

    # 4. Qualifying features
    logger.info("  Computing qualifying features...")
    quali_feats = build_qualifying_features(qualifying, results, races_small)
    quali_keep = ["race_id", "driver_id", "quali_position", "best_quali_ms",
                  "reached_q2", "reached_q3", "q1_ms_gap_to_best",
                  "q2_ms_gap_to_best", "q3_ms_gap_to_best"]
    quali_keep = [c for c in quali_keep if c in quali_feats.columns]
    df = df.merge(quali_feats[quali_keep], on=["race_id", "driver_id"], how="left")

    # 5. Circuit features
    logger.info("  Computing circuit features...")
    circuit_feats = build_circuit_features(circuits, results, races_small, pit_stops)
    circuit_keep = ["circuit_id", "avg_dnf_rate", "overtake_index", "circuit_chaos_index",
                    "avg_pit_stops_per_race", "avg_positions_changed"]
    df = df.merge(circuit_feats[circuit_keep], on="circuit_id", how="left")

    # 6. Driver × circuit specialization
    logger.info("  Computing circuit specialization features...")
    circ_spec = build_driver_circuit_features(results, races_small)
    circ_spec_keep = ["driver_id", "circuit_id", "circuit_races", "circuit_win_rate",
                      "circuit_avg_finish", "circuit_dnf_rate", "track_specialization_score"]
    df = df.merge(circ_spec[circ_spec_keep], on=["driver_id", "circuit_id"], how="left")

    # 7. Lap time features (aggregate per race)
    logger.info("  Computing lap time features...")
    lap_feats = build_lap_features(lap_times)
    df = df.merge(lap_feats, on=["race_id", "driver_id"], how="left")

    # 8. Driver metadata
    driver_meta = drivers[["driver_id", "nationality", "dob"]].copy()
    df = df.merge(driver_meta, on="driver_id", how="left")

    # 9. Constructor metadata
    ctor_meta = constructors[["constructor_id", "nationality"]].rename(
        columns={"nationality": "ctor_nationality"})
    df = df.merge(ctor_meta, on="constructor_id", how="left")

    # 10. Derived target & classification features
    df["is_winner"] = (df["position"] == 1).astype(int)
    df["is_podium"] = (df["position"] <= 3).astype(int)
    df["is_top10"] = (df["position"] <= 10).astype(int)
    df["is_dnf"] = (df["finished"].astype(int) == 0).astype(int)

    # 11. Championship pressure index
    # Normalize standing position at race time
    df["championship_pressure"] = df["rolling_5r_points"].rank(pct=True, ascending=False).fillna(0.5)

    # 12. Experience features
    df["career_race_num"] = df.groupby("driver_id").cumcount()
    df["season_experience"] = df.groupby(["driver_id", "year"]).cumcount()

    # 13. Grid × team performance interaction
    df["grid_x_ctor_reliability"] = (
        df["grid"].fillna(20) * df["ctor_reliability_score"].fillna(0.5)
    )

    logger.info(f"Master feature matrix shape: {df.shape}")
    return df


# ─────────────────────────────────────────────────────────────
# GOAT Index Computation
# ─────────────────────────────────────────────────────────────

def compute_goat_index(driver_career: pd.DataFrame, drivers: pd.DataFrame) -> pd.DataFrame:
    """
    Mathematically justified GOAT ranking.
    Composite of: wins, championships implied, consistency, DNF resilience, career length.
    """
    df = driver_career.merge(drivers[["driver_id", "full_name", "nationality"]], on="driver_id", how="left")

    # Era-normalize: divide by era average at their time
    # Simplified: normalize each metric to [0,1] range
    def normalize(s: pd.Series) -> pd.Series:
        rng = s.max() - s.min()
        return (s - s.min()) / rng if rng > 0 else s * 0

    df["norm_wins"] = normalize(df["total_wins"])
    df["norm_podium_rate"] = normalize(df["podium_rate"])
    df["norm_points_per_race"] = normalize(df["avg_points_per_race"])
    df["norm_consistency"] = normalize(df["consistency_score"])
    df["norm_overtake"] = normalize(df["overtake_efficiency"])
    df["norm_reliability"] = 1 - normalize(df["dnf_rate"])

    # Weighted composite GOAT score
    weights = {
        "norm_wins": 0.30,
        "norm_podium_rate": 0.20,
        "norm_points_per_race": 0.20,
        "norm_consistency": 0.15,
        "norm_overtake": 0.10,
        "norm_reliability": 0.05,
    }

    df["goat_score"] = sum(df[k] * v for k, v in weights.items())
    df["goat_rank"] = df["goat_score"].rank(ascending=False).astype(int)

    return df.sort_values("goat_rank").reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# Driver DNA / Archetype Classification
# ─────────────────────────────────────────────────────────────

def classify_driver_archetype(driver_career: pd.DataFrame) -> pd.DataFrame:
    """Classify drivers into racing archetypes using their stats profile."""
    df = driver_career.copy()

    conditions = [
        (df["overtake_efficiency"] > 0.6) & (df["dnf_rate"] > 0.15),   # Aggressive
        (df["consistency_score"] > 0.7) & (df["dnf_rate"] < 0.10),      # Consistent
        (df["avg_positions_gained"] > 2) & (df["win_rate"] < 0.05),     # Strategic
        (df["win_rate"] > 0.15),                                          # Dominant
        (df["total_races"] < 20),                                         # Newcomer
    ]
    archetypes = ["Aggressive", "Consistent", "Strategic", "Dominant", "Newcomer"]

    df["archetype"] = "Adaptive"  # default
    for cond, label in zip(reversed(conditions), reversed(archetypes)):
        df.loc[cond, "archetype"] = label

    return df


# ─────────────────────────────────────────────────────────────
# Main entry point
# ─────────────────────────────────────────────────────────────

def build_all_features(save: bool = True) -> Dict[str, pd.DataFrame]:
    from configs.settings import settings

    data = load_warehouse()

    # Rename dimension column names for consistency
    data["dim_circuits"] = data["dim_circuits"]
    data["dim_drivers"] = data["dim_drivers"]

    logger.info("Building master feature matrix...")
    master_df = build_master_feature_matrix(data)

    logger.info("Computing driver career features...")
    driver_career = build_driver_career_features(
        data["fact_race_results"], data["dim_races"]
    )

    logger.info("Computing GOAT index...")
    goat_df = compute_goat_index(driver_career, data["dim_drivers"])

    logger.info("Classifying driver archetypes...")
    archetype_df = classify_driver_archetype(driver_career)

    logger.info("Computing constructor features...")
    ctor_features = build_constructor_features(
        data["fact_race_results"], data["dim_races"], data["fact_pit_stops"]
    )

    logger.info("Computing circuit features...")
    circuit_feats = build_circuit_features(
        data["dim_circuits"], data["fact_race_results"],
        data["dim_races"], data["fact_pit_stops"]
    )

    features = {
        "master": master_df,
        "driver_career": driver_career,
        "goat_rankings": goat_df,
        "driver_archetypes": archetype_df,
        "constructor_features": ctor_features,
        "circuit_features": circuit_feats,
    }

    if save:
        out_dir = settings.FEATURES_DIR
        out_dir.mkdir(parents=True, exist_ok=True)
        for name, df in features.items():
            out_path = out_dir / f"{name}.parquet"
            df.to_parquet(out_path, index=False)
            logger.info(f"Saved {name}: {df.shape} → {out_path}")

    return features


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    features = build_all_features(save=True)
    logger.info("Feature engineering complete!")
    for name, df in features.items():
        logger.info(f"  {name}: {df.shape}")
