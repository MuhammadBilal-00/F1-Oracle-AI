"""Data access service — reads from warehouse and feature store."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pandas as pd
import numpy as np
from functools import lru_cache
from typing import Optional, List, Dict
from sqlalchemy import text

from backend.core.database import engine
from configs.settings import settings


class DataService:
    """Cached data access layer for the API."""

    def __init__(self):
        self._cache: Dict[str, pd.DataFrame] = {}

    def _load_parquet(self, name: str) -> pd.DataFrame:
        if name not in self._cache:
            path = settings.FEATURES_DIR / f"{name}.parquet"
            if path.exists():
                self._cache[name] = pd.read_parquet(path)
            else:
                self._cache[name] = pd.DataFrame()
        return self._cache[name]

    def _query(self, sql: str) -> pd.DataFrame:
        with engine.connect() as conn:
            return pd.read_sql(sql, conn)

    # ─── Drivers ───────────────────────────────────────────
    def get_drivers(self, limit: int = 1000, search: Optional[str] = None) -> List[Dict]:
        # Load the full roster, then filter — so modern drivers (high IDs) stay searchable.
        df = self._query("SELECT * FROM dim_drivers ORDER BY surname, forename")
        if search:
            mask = df["full_name"].str.contains(search, case=False, na=False)
            df = df[mask]
        return df.head(limit).replace({np.nan: None}).to_dict(orient="records")

    def get_driver(self, driver_id: int) -> Optional[Dict]:
        df = self._query(f"SELECT * FROM dim_drivers WHERE driver_id = {driver_id}")
        if len(df) == 0:
            return None
        career = self._load_parquet("driver_career")
        goat = self._load_parquet("goat_rankings")
        archetypes = self._load_parquet("driver_archetypes")

        row = df.iloc[0].replace({np.nan: None}).to_dict()

        career_row = career[career["driver_id"] == driver_id]
        if len(career_row) > 0:
            row["career_stats"] = career_row.iloc[0].replace({np.nan: None}).to_dict()

        goat_row = goat[goat["driver_id"] == driver_id]
        if len(goat_row) > 0:
            row["goat_rank"] = int(goat_row.iloc[0]["goat_rank"])
            row["goat_score"] = float(goat_row.iloc[0]["goat_score"])

        arch_row = archetypes[archetypes["driver_id"] == driver_id]
        if len(arch_row) > 0:
            row["archetype"] = arch_row.iloc[0]["archetype"]

        return row

    def get_driver_race_history(self, driver_id: int) -> List[Dict]:
        df = self._query(f"""
            SELECT r.race_id, r.year, r.round, r.name as race_name, rc.name as circuit_name,
                   rc.country, fr.position, fr.grid, fr.points, fr.laps,
                   fr.positions_gained, fr.finished, s.status
            FROM fact_race_results fr
            JOIN dim_races r ON fr.race_id = r.race_id
            JOIN dim_circuits rc ON r.circuit_id = rc.circuit_id
            LEFT JOIN dim_status s ON fr.status_id = s.status_id
            WHERE fr.driver_id = {driver_id}
            ORDER BY r.year, r.round
        """)
        return df.replace({np.nan: None}).to_dict(orient="records")

    # ─── Constructors ─────────────────────────────────────
    def get_constructors(self, limit: int = 50) -> List[Dict]:
        df = self._query("SELECT * FROM dim_constructors ORDER BY constructor_id LIMIT 300")
        return df.head(limit).replace({np.nan: None}).to_dict(orient="records")

    def get_constructor(self, constructor_id: int) -> Optional[Dict]:
        df = self._query(f"SELECT * FROM dim_constructors WHERE constructor_id = {constructor_id}")
        if len(df) == 0:
            return None
        ctor_feats = self._load_parquet("constructor_features")
        row = df.iloc[0].replace({np.nan: None}).to_dict()
        feat_row = ctor_feats[ctor_feats["constructor_id"] == constructor_id]
        if len(feat_row) > 0:
            row["performance"] = feat_row.iloc[0].replace({np.nan: None}).to_dict()
        return row

    # ─── Races ────────────────────────────────────────────
    def get_races(self, year: Optional[int] = None, limit: int = 100) -> List[Dict]:
        where = f"WHERE r.year = {year}" if year else ""
        df = self._query(f"""
            SELECT r.race_id, r.year, r.round, r.name, r.date, rc.name as circuit_name,
                   rc.country, rc.lat, rc.lng
            FROM dim_races r
            JOIN dim_circuits rc ON r.circuit_id = rc.circuit_id
            {where}
            ORDER BY r.year DESC, r.round
            LIMIT {limit}
        """)
        return df.replace({np.nan: None}).to_dict(orient="records")

    def get_race_results(self, race_id: int) -> List[Dict]:
        df = self._query(f"""
            SELECT fr.result_id, fr.driver_id, d.full_name, d.nationality,
                   fr.constructor_id, c.name as constructor_name,
                   fr.position, fr.grid, fr.points, fr.laps,
                   fr.time_text, fr.fastest_lap_time, fr.fastest_lap_speed,
                   fr.positions_gained, fr.finished, s.status
            FROM fact_race_results fr
            JOIN dim_drivers d ON fr.driver_id = d.driver_id
            JOIN dim_constructors c ON fr.constructor_id = c.constructor_id
            LEFT JOIN dim_status s ON fr.status_id = s.status_id
            WHERE fr.race_id = {race_id}
            ORDER BY fr.position_order
        """)
        return df.replace({np.nan: None}).to_dict(orient="records")

    # ─── GOAT Rankings ────────────────────────────────────
    def get_goat_rankings(self, top_n: int = 50) -> List[Dict]:
        goat = self._load_parquet("goat_rankings")
        drivers = self._query("SELECT driver_id, full_name, nationality FROM dim_drivers")
        df = goat.merge(drivers, on="driver_id", how="left")
        cols = ["goat_rank", "driver_id", "full_name", "nationality",
                "goat_score", "total_wins", "win_rate", "podium_rate",
                "consistency_score", "total_races", "career_length"]
        cols = [c for c in cols if c in df.columns]
        return df.head(top_n)[cols].replace({np.nan: None}).to_dict(orient="records")

    # ─── Qualifying ───────────────────────────────────────
    def get_qualifying(self, race_id: int) -> List[Dict]:
        df = self._query(f"""
            SELECT fq.qualify_id, fq.driver_id, d.full_name, fq.constructor_id,
                   c.name as constructor_name, fq.position, fq.q1, fq.q2, fq.q3,
                   fq.best_quali_ms
            FROM fact_qualifying fq
            JOIN dim_drivers d ON fq.driver_id = d.driver_id
            JOIN dim_constructors c ON fq.constructor_id = c.constructor_id
            WHERE fq.race_id = {race_id}
            ORDER BY fq.position
        """)
        return df.replace({np.nan: None}).to_dict(orient="records")

    # ─── Pit Stops ────────────────────────────────────────
    def get_pit_stops(self, race_id: int) -> List[Dict]:
        df = self._query(f"""
            SELECT fp.driver_id, d.full_name, fp.stop, fp.lap,
                   fp.duration_text, fp.duration_ms
            FROM fact_pit_stops fp
            JOIN dim_drivers d ON fp.driver_id = d.driver_id
            WHERE fp.race_id = {race_id}
            ORDER BY fp.lap, fp.stop
        """)
        return df.replace({np.nan: None}).to_dict(orient="records")

    # ─── Standings ────────────────────────────────────────
    def get_driver_standings(self, year: int, after_round: Optional[int] = None) -> List[Dict]:
        # Get last race of the year (or specific round)
        race_filter = f"AND r.round <= {after_round}" if after_round else ""
        df = self._query(f"""
            SELECT fds.driver_id, d.full_name, d.nationality,
                   fds.points, fds.position, fds.wins
            FROM fact_driver_standings fds
            JOIN dim_drivers d ON fds.driver_id = d.driver_id
            JOIN dim_races r ON fds.race_id = r.race_id
            WHERE r.year = {year} {race_filter}
            AND fds.race_id = (
                SELECT MAX(r2.race_id) FROM dim_races r2
                WHERE r2.year = {year} {race_filter.replace("r.", "r2.")}
            )
            ORDER BY fds.position
        """)
        return df.replace({np.nan: None}).to_dict(orient="records")

    def get_constructor_standings(self, year: int) -> List[Dict]:
        df = self._query(f"""
            SELECT fcs.constructor_id, c.name, c.nationality,
                   fcs.points, fcs.position, fcs.wins
            FROM fact_constructor_standings fcs
            JOIN dim_constructors c ON fcs.constructor_id = c.constructor_id
            JOIN dim_races r ON fcs.race_id = r.race_id
            WHERE r.year = {year}
            AND fcs.race_id = (SELECT MAX(r2.race_id) FROM dim_races r2 WHERE r2.year = {year})
            ORDER BY fcs.position
        """)
        return df.replace({np.nan: None}).to_dict(orient="records")

    # ─── Circuits ─────────────────────────────────────────
    def get_circuits(self) -> List[Dict]:
        circ = self._query("SELECT * FROM dim_circuits")
        feats = self._load_parquet("circuit_features")
        df = circ.merge(feats, on="circuit_id", how="left", suffixes=("", "_feat"))
        return df.replace({np.nan: None}).to_dict(orient="records")

    # ─── Analytics ────────────────────────────────────────
    def get_driver_clusters(self) -> List[Dict]:
        clusters = self._load_parquet("driver_clusters")
        if len(clusters) == 0:
            return []
        drivers = self._query("SELECT driver_id, full_name, nationality FROM dim_drivers")
        df = clusters.merge(drivers, on="driver_id", how="left")
        return df.replace({np.nan: None}).to_dict(orient="records")

    def get_rivalries(self, top_n: int = 20) -> List[Dict]:
        rivalries = self._load_parquet("rivalries")
        if len(rivalries) == 0:
            return []
        return rivalries.head(top_n).replace({np.nan: None}).to_dict(orient="records")

    def get_lap_times(self, race_id: int, driver_id: Optional[int] = None) -> List[Dict]:
        where = f"AND flt.driver_id = {driver_id}" if driver_id else ""
        df = self._query(f"""
            SELECT flt.driver_id, d.full_name, flt.lap, flt.position,
                   flt.time_text, flt.milliseconds
            FROM fact_lap_times flt
            JOIN dim_drivers d ON flt.driver_id = d.driver_id
            WHERE flt.race_id = {race_id} {where}
            ORDER BY flt.driver_id, flt.lap
        """)
        return df.replace({np.nan: None}).to_dict(orient="records")

    def get_seasons(self) -> List[int]:
        df = self._query("SELECT DISTINCT year FROM dim_races ORDER BY year DESC")
        return df["year"].tolist()

    # ─── Platform overview ────────────────────────────────
    def get_overview(self) -> Dict:
        """Aggregate counts + model metrics for the Overview dashboard."""
        import json

        counts = self._query("""
            SELECT
                (SELECT COUNT(*) FROM dim_races)               AS total_races,
                (SELECT COUNT(*) FROM dim_drivers)             AS total_drivers,
                (SELECT COUNT(*) FROM dim_circuits)            AS total_circuits,
                (SELECT COUNT(*) FROM dim_constructors)        AS total_constructors,
                (SELECT COUNT(DISTINCT year) FROM dim_races)   AS total_seasons,
                (SELECT MIN(year) FROM dim_races)              AS first_year,
                (SELECT MAX(year) FROM dim_races)              AS last_year,
                (SELECT COUNT(*) FROM fact_race_results)       AS total_results
        """)
        stats = {k: int(v) for k, v in counts.iloc[0].to_dict().items()}

        metrics_path = settings.ARTIFACTS_DIR / "metrics.json"
        if metrics_path.exists():
            with open(metrics_path) as fh:
                stats["model_metrics"] = json.load(fh)
        else:
            stats["model_metrics"] = {}

        return stats


# Singleton instance
data_service = DataService()
