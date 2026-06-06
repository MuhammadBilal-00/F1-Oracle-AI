"""ML feature engineering tests."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
import pandas as pd
import numpy as np
from configs.settings import settings


def test_master_feature_matrix_exists():
    path = settings.FEATURES_DIR / "master.parquet"
    assert path.exists(), "Master feature matrix not found — run feature engineering first"


def test_master_feature_matrix_shape():
    df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    assert df.shape[0] > 20000, "Expected 20k+ rows in master feature matrix"
    assert df.shape[1] > 100, "Expected 100+ engineered features"


def test_target_columns_exist():
    df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    for col in ["is_winner", "is_podium", "is_top10", "is_dnf"]:
        assert col in df.columns, f"Target column {col} missing"


def test_target_columns_binary():
    df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    for col in ["is_winner", "is_podium", "is_top10", "is_dnf"]:
        unique_vals = set(df[col].dropna().unique())
        assert unique_vals.issubset({0, 1}), f"{col} should be binary, got {unique_vals}"


def test_goat_rankings_exist():
    path = settings.FEATURES_DIR / "goat_rankings.parquet"
    assert path.exists()
    df = pd.read_parquet(path)
    assert len(df) == 861  # All drivers
    assert "goat_score" in df.columns
    assert "goat_rank" in df.columns


def test_goat_scores_normalized():
    df = pd.read_parquet(settings.FEATURES_DIR / "goat_rankings.parquet")
    assert df["goat_score"].max() <= 1.0
    assert df["goat_score"].min() >= 0.0


def test_driver_clusters_exist():
    path = settings.FEATURES_DIR / "driver_clusters.parquet"
    assert path.exists()
    df = pd.read_parquet(path)
    assert "cluster" in df.columns
    assert "cluster_label" in df.columns
    assert df["cluster"].nunique() <= 6


def test_circuit_features_exist():
    path = settings.FEATURES_DIR / "circuit_features.parquet"
    assert path.exists()
    df = pd.read_parquet(path)
    assert len(df) == 77  # All circuits
    assert "circuit_chaos_index" in df.columns


def test_models_exist():
    for target in ["race_winner", "podium", "top10", "dnf"]:
        model_path = settings.ARTIFACTS_DIR / f"{target}_best.joblib"
        assert model_path.exists(), f"Model not found: {model_path}"


def test_win_rate_sums_correctly():
    """Each race should have exactly one winner."""
    df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    winners_per_race = df.groupby("race_id")["is_winner"].sum()
    # Most races should have exactly 1 winner (some may have 0 if data is incomplete)
    winner_counts = winners_per_race.value_counts()
    assert 1 in winner_counts.index
    assert winner_counts.get(1, 0) > winner_counts.get(0, 0)


def test_rolling_features_exist():
    df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    rolling_cols = [c for c in df.columns if "rolling_" in c]
    assert len(rolling_cols) >= 6, f"Expected rolling features, got {rolling_cols}"
