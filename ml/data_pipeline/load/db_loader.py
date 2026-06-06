"""Bulk-load cleaned dataframes into the SQLite/PostgreSQL warehouse."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

import logging
import pandas as pd
import numpy as np
from sqlalchemy import text
from typing import Dict

from backend.core.database import engine, Base
from backend.models.orm import *  # registers all ORM classes

logger = logging.getLogger(__name__)


def _safe_int(val):
    try:
        if pd.isna(val):
            return None
        return int(val)
    except Exception:
        return None


def _safe_float(val):
    try:
        if pd.isna(val):
            return None
        return float(val)
    except Exception:
        return None


def _safe_str(val):
    if pd.isna(val) if isinstance(val, float) else val is None:
        return None
    return str(val).strip() if val else None


def create_schema():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)
    logger.info("Schema created / verified")


def truncate_all():
    """Clear all tables in safe order."""
    tables = [
        "fact_sprint_results", "fact_constructor_standings", "fact_driver_standings",
        "fact_qualifying", "fact_pit_stops", "fact_lap_times", "fact_race_results",
        "dim_races", "dim_status", "dim_drivers", "dim_constructors", "dim_circuits", "dim_seasons",
    ]
    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys = OFF"))
        for t in tables:
            conn.execute(text(f"DELETE FROM {t}"))
        conn.execute(text("PRAGMA foreign_keys = ON"))
        conn.commit()
    logger.info("All tables truncated")


def load_dimensions(clean: Dict[str, pd.DataFrame]):
    records_loaded = {}

    with engine.connect() as conn:
        # Seasons
        rows = [{"year": int(r.year), "url": _safe_str(r.url)}
                for r in clean["seasons"].itertuples(index=False)]
        if rows:
            conn.execute(DimSeason.__table__.insert(), rows)
        records_loaded["seasons"] = len(rows)

        # Circuits
        rows = []
        for r in clean["circuits"].itertuples(index=False):
            rows.append({
                "circuit_id": int(r.circuitid),
                "circuit_ref": str(r.circuitref),
                "name": str(r.name),
                "location": _safe_str(r.location),
                "country": _safe_str(r.country),
                "lat": _safe_float(r.lat),
                "lng": _safe_float(r.lng),
                "alt": _safe_float(r.alt),
                "url": _safe_str(r.url),
            })
        if rows:
            conn.execute(DimCircuit.__table__.insert(), rows)
        records_loaded["circuits"] = len(rows)

        # Constructors
        rows = []
        for r in clean["constructors"].itertuples(index=False):
            rows.append({
                "constructor_id": int(r.constructorid),
                "constructor_ref": str(r.constructorref),
                "name": str(r.name),
                "nationality": _safe_str(r.nationality),
                "url": _safe_str(r.url),
            })
        if rows:
            conn.execute(DimConstructor.__table__.insert(), rows)
        records_loaded["constructors"] = len(rows)

        # Status
        rows = [{"status_id": int(r.statusid), "status": str(r.status)}
                for r in clean["status"].itertuples(index=False)]
        if rows:
            conn.execute(DimStatus.__table__.insert(), rows)
        records_loaded["status"] = len(rows)

        # Drivers
        rows = []
        for r in clean["drivers"].itertuples(index=False):
            dob = None
            if hasattr(r, "dob") and pd.notna(r.dob):
                try:
                    dob = pd.to_datetime(r.dob).date()
                except Exception:
                    pass
            rows.append({
                "driver_id": int(r.driverid),
                "driver_ref": str(r.driverref),
                "number": _safe_int(r.number),
                "code": _safe_str(r.code),
                "forename": str(r.forename),
                "surname": str(r.surname),
                "full_name": str(r.full_name),
                "dob": dob,
                "nationality": _safe_str(r.nationality),
                "url": _safe_str(r.url),
            })
        if rows:
            conn.execute(DimDriver.__table__.insert(), rows)
        records_loaded["drivers"] = len(rows)

        # Races
        rows = []
        for r in clean["races"].itertuples(index=False):
            def _d(v):
                if pd.notna(v):
                    try:
                        return pd.to_datetime(v).date()
                    except Exception:
                        pass
                return None
            rows.append({
                "race_id": int(r.raceid),
                "year": int(r.year),
                "round": int(r.round),
                "circuit_id": int(r.circuitid),
                "name": str(r.name),
                "date": _d(r.date),
                "time": _safe_str(r.time),
                "url": _safe_str(r.url),
                "fp1_date": _d(r.fp1_date) if hasattr(r, "fp1_date") else None,
                "fp2_date": _d(r.fp2_date) if hasattr(r, "fp2_date") else None,
                "fp3_date": _d(r.fp3_date) if hasattr(r, "fp3_date") else None,
                "quali_date": _d(r.quali_date) if hasattr(r, "quali_date") else None,
                "sprint_date": _d(r.sprint_date) if hasattr(r, "sprint_date") else None,
            })
        if rows:
            conn.execute(DimRace.__table__.insert(), rows)
        records_loaded["races"] = len(rows)

        conn.commit()

    for table, count in records_loaded.items():
        logger.info(f"Loaded dim_{table}: {count:,} records")

    return records_loaded


def load_facts(clean: Dict[str, pd.DataFrame]):
    records_loaded = {}

    # Results — chunk to avoid memory issues
    results_df = clean["results"]
    chunk_size = 5000
    total = 0
    with engine.connect() as conn:
        for i in range(0, len(results_df), chunk_size):
            chunk = results_df.iloc[i:i + chunk_size]
            rows = []
            for r in chunk.itertuples(index=False):
                rows.append({
                    "result_id": int(r.resultid),
                    "race_id": int(r.raceid),
                    "driver_id": int(r.driverid),
                    "constructor_id": int(r.constructorid),
                    "status_id": _safe_int(r.statusid),
                    "number": _safe_int(r.number),
                    "grid": _safe_int(r.grid),
                    "position": _safe_int(r.position),
                    "position_text": _safe_str(r.positiontext),
                    "position_order": _safe_int(r.positionorder),
                    "points": _safe_float(r.points) or 0,
                    "laps": _safe_int(r.laps),
                    "time_text": _safe_str(r.time),
                    "milliseconds": _safe_int(r.milliseconds),
                    "fastest_lap": _safe_int(r.fastestlap),
                    "rank": _safe_int(r.rank),
                    "fastest_lap_time": _safe_str(r.fastestlaptime),
                    "fastest_lap_speed": _safe_float(r.fastestlapspeed),
                    "finished": bool(r.finished),
                    "positions_gained": _safe_int(r.positions_gained),
                })
            if rows:
                conn.execute(FactRaceResult.__table__.insert(), rows)
                total += len(rows)
        conn.commit()
    records_loaded["results"] = total
    logger.info(f"Loaded fact_race_results: {total:,} records")

    # Lap times — large table, chunk heavily
    lt_df = clean["lap_times"]
    total = 0
    with engine.connect() as conn:
        for i in range(0, len(lt_df), chunk_size):
            chunk = lt_df.iloc[i:i + chunk_size]
            rows = []
            for r in chunk.itertuples(index=False):
                rows.append({
                    "race_id": int(r.raceid),
                    "driver_id": int(r.driverid),
                    "lap": int(r.lap),
                    "position": _safe_int(r.position),
                    "time_text": _safe_str(r.time),
                    "milliseconds": _safe_int(r.milliseconds),
                })
            if rows:
                conn.execute(FactLapTime.__table__.insert(), rows)
                total += len(rows)
        conn.commit()
    records_loaded["lap_times"] = total
    logger.info(f"Loaded fact_lap_times: {total:,} records")

    # Pit stops
    ps_df = clean["pit_stops"]
    with engine.connect() as conn:
        rows = []
        for r in ps_df.itertuples(index=False):
            rows.append({
                "race_id": int(r.raceid),
                "driver_id": int(r.driverid),
                "stop": _safe_int(r.stop),
                "lap": _safe_int(r.lap),
                "time_text": _safe_str(r.time),
                "duration_text": _safe_str(r.duration),
                "duration_ms": _safe_int(r.milliseconds),
            })
        if rows:
            conn.execute(FactPitStop.__table__.insert(), rows)
        conn.commit()
    records_loaded["pit_stops"] = len(rows)
    logger.info(f"Loaded fact_pit_stops: {len(rows):,} records")

    # Qualifying
    q_df = clean["qualifying"]
    with engine.connect() as conn:
        rows = []
        for r in q_df.itertuples(index=False):
            rows.append({
                "qualify_id": int(r.qualifyid),
                "race_id": int(r.raceid),
                "driver_id": int(r.driverid),
                "constructor_id": int(r.constructorid),
                "number": _safe_int(r.number),
                "position": _safe_int(r.position),
                "q1": _safe_str(r.q1),
                "q2": _safe_str(r.q2),
                "q3": _safe_str(r.q3),
                "q1_ms": _safe_int(r.q1_ms) if hasattr(r, "q1_ms") else None,
                "q2_ms": _safe_int(r.q2_ms) if hasattr(r, "q2_ms") else None,
                "q3_ms": _safe_int(r.q3_ms) if hasattr(r, "q3_ms") else None,
                "best_quali_ms": _safe_int(r.best_quali_ms) if hasattr(r, "best_quali_ms") else None,
            })
        if rows:
            conn.execute(FactQualifying.__table__.insert(), rows)
        conn.commit()
    records_loaded["qualifying"] = len(rows)
    logger.info(f"Loaded fact_qualifying: {len(rows):,} records")

    # Driver standings
    ds_df = clean["driver_standings"]
    with engine.connect() as conn:
        rows = []
        for r in ds_df.itertuples(index=False):
            rows.append({
                "standing_id": int(r.driverstandingsid),
                "race_id": int(r.raceid),
                "driver_id": int(r.driverid),
                "points": _safe_float(r.points) or 0,
                "position": _safe_int(r.position),
                "position_text": _safe_str(r.positiontext),
                "wins": int(r.wins) if pd.notna(r.wins) else 0,
            })
        if rows:
            conn.execute(FactDriverStanding.__table__.insert(), rows)
        conn.commit()
    records_loaded["driver_standings"] = len(rows)
    logger.info(f"Loaded fact_driver_standings: {len(rows):,} records")

    # Constructor standings
    cs_df = clean["constructor_standings"]
    with engine.connect() as conn:
        rows = []
        for r in cs_df.itertuples(index=False):
            rows.append({
                "standing_id": int(r.constructorstandingsid),
                "race_id": int(r.raceid),
                "constructor_id": int(r.constructorid),
                "points": _safe_float(r.points) or 0,
                "position": _safe_int(r.position),
                "position_text": _safe_str(r.positiontext),
                "wins": int(r.wins) if pd.notna(r.wins) else 0,
            })
        if rows:
            conn.execute(FactConstructorStanding.__table__.insert(), rows)
        conn.commit()
    records_loaded["constructor_standings"] = len(rows)
    logger.info(f"Loaded fact_constructor_standings: {len(rows):,} records")

    return records_loaded
