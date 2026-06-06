"""Data cleaning and transformation — produces clean analytical dataframes."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

import logging
import pandas as pd
import numpy as np
from typing import Dict

logger = logging.getLogger(__name__)


def _parse_lap_time(t: str) -> float | None:
    """Convert 'M:SS.mmm' string to milliseconds float."""
    if pd.isna(t) or not isinstance(t, str):
        return None
    try:
        t = t.strip()
        if ":" in t:
            parts = t.split(":")
            minutes = float(parts[0])
            seconds = float(parts[1])
            return (minutes * 60 + seconds) * 1000
        return float(t) * 1000
    except Exception:
        return None


def clean_circuits(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
    df["lng"] = pd.to_numeric(df["lng"], errors="coerce")
    df["alt"] = pd.to_numeric(df.get("alt", pd.Series(dtype=float)), errors="coerce")
    return df.drop_duplicates(subset=["circuitid"])


def clean_drivers(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["dob"] = pd.to_datetime(df["dob"], errors="coerce")
    df["number"] = pd.to_numeric(df["number"], errors="coerce").astype("Int64")
    df["full_name"] = df["forename"].str.strip() + " " + df["surname"].str.strip()
    df["code"] = df["code"].where(df["code"].notna(), other=None)
    return df.drop_duplicates(subset=["driverid"])


def clean_constructors(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    return df.drop_duplicates(subset=["constructorid"])


def clean_races(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    date_cols = ["fp1_date", "fp2_date", "fp3_date", "quali_date", "sprint_date"]
    for col in date_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce").astype("Int64")
    df["round"] = pd.to_numeric(df["round"], errors="coerce").astype("Int64")
    return df.drop_duplicates(subset=["raceid"])


def clean_results(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["position"] = pd.to_numeric(df["position"], errors="coerce").astype("Int64")
    df["grid"] = pd.to_numeric(df["grid"], errors="coerce").astype("Int64")
    df["laps"] = pd.to_numeric(df["laps"], errors="coerce").astype("Int64")
    df["milliseconds"] = pd.to_numeric(df["milliseconds"], errors="coerce").astype("Int64")
    df["points"] = pd.to_numeric(df["points"], errors="coerce").fillna(0)
    df["fastestlap"] = pd.to_numeric(df.get("fastestlap", pd.Series(dtype=float)), errors="coerce").astype("Int64")
    df["rank"] = pd.to_numeric(df.get("rank", pd.Series(dtype=float)), errors="coerce").astype("Int64")
    df["fastestlapspeed"] = pd.to_numeric(df.get("fastestlapspeed", pd.Series(dtype=float)), errors="coerce")
    # finished = position is numeric
    df["finished"] = df["position"].notna()
    df["positions_gained"] = (df["grid"] - df["position"]).where(df["finished"])
    return df.drop_duplicates(subset=["resultid"])


def clean_lap_times(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["milliseconds"] = pd.to_numeric(df["milliseconds"], errors="coerce").astype("Int64")
    df["position"] = pd.to_numeric(df["position"], errors="coerce").astype("Int64")
    df["lap"] = pd.to_numeric(df["lap"], errors="coerce").astype("Int64")
    # Remove impossible lap times (< 50s or > 10min)
    mask = (df["milliseconds"] >= 50_000) & (df["milliseconds"] <= 600_000)
    removed = (~mask).sum()
    if removed > 0:
        logger.info(f"Removed {removed} impossible lap times")
    return df[mask].reset_index(drop=True)


def clean_pit_stops(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["milliseconds"] = pd.to_numeric(df["milliseconds"], errors="coerce").astype("Int64")
    df["stop"] = pd.to_numeric(df["stop"], errors="coerce").astype("Int64")
    df["lap"] = pd.to_numeric(df["lap"], errors="coerce").astype("Int64")
    # Remove impossibly fast/slow pit stops (< 15s or > 120s)
    mask = (df["milliseconds"] >= 15_000) & (df["milliseconds"] <= 120_000)
    return df[mask].reset_index(drop=True)


def clean_qualifying(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["position"] = pd.to_numeric(df["position"], errors="coerce").astype("Int64")
    for q in ["q1", "q2", "q3"]:
        if q in df.columns:
            df[f"{q}_ms"] = df[q].apply(_parse_lap_time)
    df["best_quali_ms"] = df[["q1_ms", "q2_ms", "q3_ms"]].min(axis=1)
    return df.drop_duplicates(subset=["qualifyid"])


def clean_standings(df: pd.DataFrame, id_col: str) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["points"] = pd.to_numeric(df["points"], errors="coerce").fillna(0)
    df["position"] = pd.to_numeric(df["position"], errors="coerce").astype("Int64")
    df["wins"] = pd.to_numeric(df["wins"], errors="coerce").fillna(0).astype(int)
    return df


def clean_sprint_results(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.lower() for c in df.columns]
    df["position"] = pd.to_numeric(df["position"], errors="coerce").astype("Int64")
    df["grid"] = pd.to_numeric(df["grid"], errors="coerce").astype("Int64")
    df["points"] = pd.to_numeric(df["points"], errors="coerce").fillna(0)
    df["milliseconds"] = pd.to_numeric(df["milliseconds"], errors="coerce").astype("Int64")
    return df


def clean_all(raw: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
    """Apply cleaning to all raw dataframes."""
    cleaned = {}
    cleaned["circuits"] = clean_circuits(raw["circuits"])
    cleaned["drivers"] = clean_drivers(raw["drivers"])
    cleaned["constructors"] = clean_constructors(raw["constructors"])
    cleaned["races"] = clean_races(raw["races"])
    cleaned["results"] = clean_results(raw["results"])
    cleaned["lap_times"] = clean_lap_times(raw["lap_times"])
    cleaned["pit_stops"] = clean_pit_stops(raw["pit_stops"])
    cleaned["qualifying"] = clean_qualifying(raw["qualifying"])
    cleaned["driver_standings"] = clean_standings(raw["driver_standings"], "driverstandingsid")
    cleaned["constructor_standings"] = clean_standings(raw["constructor_standings"], "constructorstandingsid")
    cleaned["sprint_results"] = clean_sprint_results(raw["sprint_results"])
    cleaned["seasons"] = raw["seasons"].copy()
    cleaned["seasons"].columns = [c.lower() for c in cleaned["seasons"].columns]
    cleaned["status"] = raw["status"].copy()
    cleaned["status"].columns = [c.lower() for c in cleaned["status"].columns]

    for name, df in cleaned.items():
        logger.info(f"Cleaned [{name}]: {len(df):,} rows")

    return cleaned
