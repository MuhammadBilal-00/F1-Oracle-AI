"""Raw CSV data loader with schema validation and quality checks."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

import logging
import pandas as pd
import numpy as np
from typing import Dict, Tuple
from dataclasses import dataclass, field

from configs.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class DataQualityReport:
    table_name: str
    total_rows: int
    null_counts: Dict[str, int] = field(default_factory=dict)
    duplicate_count: int = 0
    issues: list = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"[{self.table_name}] rows={self.total_rows}, "
            f"dupes={self.duplicate_count}, "
            f"issues={len(self.issues)}"
        )


NA_VALUES = ["\\N", "\\\\N", "NA", "N/A", "", "NULL", "null"]


def load_csv(filename: str) -> pd.DataFrame:
    path = settings.RAW_DATA_DIR / filename
    df = pd.read_csv(path, na_values=NA_VALUES, low_memory=False)
    logger.info(f"Loaded {filename}: {len(df):,} rows × {len(df.columns)} cols")
    return df


def validate_dataframe(df: pd.DataFrame, name: str) -> DataQualityReport:
    report = DataQualityReport(
        table_name=name,
        total_rows=len(df),
        null_counts={col: int(df[col].isna().sum()) for col in df.columns if df[col].isna().any()},
        duplicate_count=int(df.duplicated().sum()),
    )
    if report.duplicate_count > 0:
        report.issues.append(f"{report.duplicate_count} duplicate rows")
    for col, cnt in report.null_counts.items():
        pct = cnt / report.total_rows * 100
        if pct > 50:
            report.issues.append(f"Column '{col}' has {pct:.1f}% nulls")
    logger.info(report.summary())
    return report


def load_all_raw() -> Tuple[Dict[str, pd.DataFrame], Dict[str, DataQualityReport]]:
    """Load every source CSV, return data dict + quality reports."""
    file_map = {
        "circuits": "circuits.csv",
        "constructors": "constructors.csv",
        "drivers": "drivers.csv",
        "races": "races.csv",
        "results": "results.csv",
        "lap_times": "lap_times.csv",
        "pit_stops": "pit_stops.csv",
        "qualifying": "qualifying.csv",
        "driver_standings": "driver_standings.csv",
        "constructor_standings": "constructor_standings.csv",
        "constructor_results": "constructor_results.csv",
        "sprint_results": "sprint_results.csv",
        "seasons": "seasons.csv",
        "status": "status.csv",
    }

    data: Dict[str, pd.DataFrame] = {}
    reports: Dict[str, DataQualityReport] = {}

    for key, filename in file_map.items():
        try:
            df = load_csv(filename)
            report = validate_dataframe(df, key)
            data[key] = df
            reports[key] = report
        except FileNotFoundError:
            logger.error(f"Missing file: {filename}")

    logger.info(f"Loaded {len(data)}/{len(file_map)} tables")
    return data, reports
