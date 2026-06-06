"""
Model E — Monte Carlo Race Simulation Engine
Simulates full races: lap times, pit stops, DNFs, strategy variations.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from scipy import stats

logger = logging.getLogger(__name__)


@dataclass
class DriverProfile:
    driver_id: int
    name: str
    base_pace: float        # milliseconds per lap (lower = faster)
    pace_std: float         # lap-to-lap variability
    dnf_prob: float         # per-race DNF probability
    pit_penalty_ms: float   # average pit stop duration
    pit_std_ms: float       # pit stop variance
    grid_position: int
    tire_deg_rate: float    # pace degradation per lap (ms/lap)


@dataclass
class RaceConfig:
    n_laps: int = 57
    safety_car_prob: float = 0.3
    vsc_prob: float = 0.2
    safety_car_laps: int = 5
    strategy_options: List[int] = field(default_factory=lambda: [15, 20, 25, 30, 35])


@dataclass
class SimulationResult:
    driver_id: int
    name: str
    finish_position: int
    total_time_ms: float
    n_pit_stops: int
    dnf: bool
    pit_laps: List[int]


def simulate_single_race(
    drivers: List[DriverProfile],
    config: RaceConfig,
    seed: Optional[int] = None,
) -> List[SimulationResult]:
    """Simulate one full race."""
    rng = np.random.RandomState(seed)

    # Safety car event
    sc_active = rng.random() < config.safety_car_prob
    sc_start_lap = rng.randint(10, max(11, config.n_laps - 10)) if sc_active else -1
    sc_end_lap = sc_start_lap + config.safety_car_laps if sc_active else -1

    results = []

    for drv in drivers:
        if rng.random() < drv.dnf_prob:
            # DNF — happens at random lap
            dnf_lap = rng.randint(1, config.n_laps + 1)
            results.append(SimulationResult(
                driver_id=drv.driver_id,
                name=drv.name,
                finish_position=99,
                total_time_ms=float("inf"),
                n_pit_stops=0,
                dnf=True,
                pit_laps=[],
            ))
            continue

        # Determine pit strategy
        n_stops = rng.choice([1, 2], p=[0.6, 0.4])
        if n_stops == 1:
            pit_laps = [rng.choice(config.strategy_options)]
        else:
            p1 = rng.randint(10, 25)
            p2 = rng.randint(p1 + 10, config.n_laps - 5)
            pit_laps = [p1, p2]

        total_time_ms = 0.0
        tire_age = 0

        for lap in range(1, config.n_laps + 1):
            # Base lap pace with degradation
            lap_pace = drv.base_pace + drv.tire_deg_rate * tire_age
            tire_age += 1

            # Random lap variation
            lap_time = rng.normal(lap_pace, drv.pace_std)

            # Safety car effect
            if sc_start_lap <= lap <= sc_end_lap:
                lap_time = max(lap_time, drv.base_pace * 1.25)

            # Pit stop
            if lap in pit_laps:
                pit_dur = max(15000, rng.normal(drv.pit_penalty_ms, drv.pit_std_ms))
                lap_time += pit_dur
                tire_age = 0  # fresh tires

            total_time_ms += max(lap_time, drv.base_pace * 0.85)

        # Starting grid offset (each position ~0.5s)
        total_time_ms += (drv.grid_position - 1) * 500

        results.append(SimulationResult(
            driver_id=drv.driver_id,
            name=drv.name,
            finish_position=0,  # assigned after sort
            total_time_ms=total_time_ms,
            n_pit_stops=n_stops,
            dnf=False,
            pit_laps=pit_laps,
        ))

    # Assign finishing positions
    results_sorted = sorted(results, key=lambda r: r.total_time_ms)
    pos = 1
    for r in results_sorted:
        if not r.dnf:
            r.finish_position = pos
            pos += 1
        else:
            r.finish_position = pos + 10

    return results_sorted


def run_monte_carlo(
    drivers: List[DriverProfile],
    config: RaceConfig,
    n_simulations: int = 1000,
) -> pd.DataFrame:
    """Run N Monte Carlo race simulations and aggregate statistics."""
    all_results = []

    for sim_id in range(n_simulations):
        race_results = simulate_single_race(drivers, config, seed=sim_id)
        for r in race_results:
            all_results.append({
                "sim_id": sim_id,
                "driver_id": r.driver_id,
                "name": r.name,
                "finish_position": r.finish_position,
                "total_time_ms": r.total_time_ms,
                "n_pit_stops": r.n_pit_stops,
                "dnf": r.dnf,
            })

    df = pd.DataFrame(all_results)

    # Aggregate win/podium probabilities
    agg = df.groupby(["driver_id", "name"]).agg(
        win_probability=("finish_position", lambda x: (x == 1).mean()),
        podium_probability=("finish_position", lambda x: (x <= 3).mean()),
        top5_probability=("finish_position", lambda x: (x <= 5).mean()),
        top10_probability=("finish_position", lambda x: (x <= 10).mean()),
        dnf_probability=("dnf", "mean"),
        avg_finish=("finish_position", lambda x: x[x < 90].mean()),
        finish_std=("finish_position", lambda x: x[x < 90].std()),
        avg_pit_stops=("n_pit_stops", "mean"),
        simulations=("sim_id", "count"),
    ).reset_index()

    agg = agg.sort_values("win_probability", ascending=False).reset_index(drop=True)
    agg["predicted_rank"] = agg.index + 1

    return agg


def build_driver_profiles_from_features(
    master_df: pd.DataFrame,
    race_id: int,
    lap_times_df: Optional[pd.DataFrame] = None,
) -> List[DriverProfile]:
    """Extract driver profiles for a specific race from feature data."""
    race_data = master_df[master_df["race_id"] == race_id].copy()

    if len(race_data) == 0:
        logger.warning(f"No data for race_id {race_id}")
        return []

    profiles = []

    for _, row in race_data.iterrows():
        # Base pace from clean lap average or qualifying time
        base_pace = row.get("clean_avg_lap_ms", 90_000)
        if pd.isna(base_pace):
            base_pace = row.get("best_quali_ms", 90_000)
        if pd.isna(base_pace):
            base_pace = 90_000

        # Consistency → pace_std
        lap_cv = row.get("lap_cv", 0.02)
        if pd.isna(lap_cv):
            lap_cv = 0.02
        pace_std = base_pace * lap_cv

        # DNF probability from historical rate
        dnf_prob = row.get("dnf_rate", 0.1)
        if pd.isna(dnf_prob):
            dnf_prob = 0.1

        # Pit stop from constructor performance
        pit_dur = row.get("ctor_avg_pit_duration_s", 25)
        if pd.isna(pit_dur):
            pit_dur = 25
        pit_dur_ms = float(pit_dur) * 1000

        # Tire degradation from pace slope
        deg_slope = row.get("pace_degradation_slope", 100)
        if pd.isna(deg_slope):
            deg_slope = 100

        profiles.append(DriverProfile(
            driver_id=int(row["driver_id"]),
            name=str(row.get("full_name", f"Driver {row['driver_id']}")),
            base_pace=float(base_pace),
            pace_std=float(max(pace_std, 500)),
            dnf_prob=float(np.clip(dnf_prob, 0.01, 0.40)),
            pit_penalty_ms=float(pit_dur_ms),
            pit_std_ms=2000,
            grid_position=int(row.get("grid", 10)) if pd.notna(row.get("grid")) else 10,
            tire_deg_rate=float(deg_slope),
        ))

    return profiles


def championship_simulation(
    master_df: pd.DataFrame,
    season_year: int,
    n_simulations: int = 500,
) -> pd.DataFrame:
    """
    Simulate remaining races in a season and project championship standings.
    """
    season_races = master_df[master_df["year"] == season_year]["race_id"].unique()
    logger.info(f"Simulating {len(season_races)} races for {season_year} season...")

    all_sim_standings = []

    config = RaceConfig(n_laps=57)

    for sim_id in range(n_simulations):
        sim_points: Dict[int, float] = {}

        for race_id in season_races:
            profiles = build_driver_profiles_from_features(master_df, race_id)
            if not profiles:
                continue

            race_results = simulate_single_race(profiles, config, seed=sim_id * 1000 + race_id)

            # F1 points system
            points_map = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
            for r in race_results:
                pts = points_map.get(r.finish_position, 0)
                sim_points[r.driver_id] = sim_points.get(r.driver_id, 0) + pts

        for drv_id, pts in sim_points.items():
            all_sim_standings.append({
                "sim_id": sim_id,
                "driver_id": drv_id,
                "total_points": pts,
            })

    df = pd.DataFrame(all_sim_standings)
    championship_agg = df.groupby("driver_id").agg(
        avg_points=("total_points", "mean"),
        championship_win_prob=("total_points", lambda x: (x == x.groupby(
            df.loc[x.index, "sim_id"])["total_points"].transform("max")).mean()),
        p25_points=("total_points", lambda x: np.percentile(x, 25)),
        p75_points=("total_points", lambda x: np.percentile(x, 75)),
    ).reset_index()

    return championship_agg.sort_values("avg_points", ascending=False).reset_index(drop=True)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

    from configs.settings import settings

    logger.info("Loading feature data...")
    master_df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")

    # Quick test: simulate last race in dataset
    last_race_id = master_df["race_id"].max()
    logger.info(f"Simulating race_id={last_race_id} with 1000 Monte Carlo runs...")

    profiles = build_driver_profiles_from_features(master_df, last_race_id)
    logger.info(f"Drivers in race: {len(profiles)}")

    if profiles:
        config = RaceConfig(n_laps=57)
        sim_results = run_monte_carlo(profiles, config, n_simulations=1000)

        logger.info("\nSimulation Results (Top 10):")
        logger.info(sim_results[["name", "win_probability", "podium_probability", "avg_finish"]].head(10).to_string())

        sim_results.to_parquet(settings.ARTIFACTS_DIR / "simulation_results.parquet", index=False)
        logger.info("Saved simulation results")
