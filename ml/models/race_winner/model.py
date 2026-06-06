"""
Model A — Race Winner & Podium Prediction
Ensemble: XGBoost + LightGBM + CatBoost → Stacking Meta-Learner
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

import warnings
warnings.filterwarnings("ignore")

import logging
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Tuple, List
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, roc_auc_score, log_loss, f1_score,
    classification_report, top_k_accuracy_score
)
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier

from configs.settings import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Feature Columns
# ─────────────────────────────────────────────────────────────

FEATURE_COLS = [
    # Driver form
    "grid", "quali_position", "best_quali_ms",
    "reached_q2", "reached_q3",
    "rolling_3r_avg_pos", "rolling_5r_avg_pos", "rolling_10r_avg_pos",
    "rolling_3r_points", "rolling_5r_points", "rolling_10r_points",
    "rolling_3r_dnf_rate", "rolling_5r_dnf_rate",
    "rolling_3r_win_rate", "rolling_5r_win_rate",
    "momentum_score",
    # Career stats
    "win_rate", "podium_rate", "top10_rate", "dnf_rate",
    "avg_finish_position", "consistency_score",
    "avg_positions_gained", "overtake_efficiency",
    "avg_points_per_race", "total_races",
    "career_race_num", "season_experience",
    # Circuit specialization
    "circuit_win_rate", "circuit_avg_finish", "circuit_dnf_rate",
    "track_specialization_score", "circuit_races",
    # Constructor
    "ctor_win_rate", "ctor_reliability_score", "ctor_avg_pit_duration_s",
    "ctor_dnf_rate", "ctor_total_wins",
    # Circuit
    "avg_dnf_rate", "overtake_index", "circuit_chaos_index", "avg_pit_stops_per_race",
    # Lap time
    "clean_avg_lap_ms", "lap_cv", "pace_degradation_slope",
    # Context
    "round", "year",
    "championship_pressure",
    "grid_x_ctor_reliability",
    # Gap to best
    "q1_ms_gap_to_best", "q2_ms_gap_to_best", "q3_ms_gap_to_best",
]


def prepare_features(df: pd.DataFrame, target: str = "is_winner") -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare feature matrix from master dataframe."""
    available = [c for c in FEATURE_COLS if c in df.columns]
    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        logger.warning(f"Missing {len(missing)} feature columns: {missing[:5]}...")

    X = df[available].copy()
    y = df[target].copy()

    # Remove rows where target is NaN and force to int {0, 1}
    mask = y.notna()
    X = X[mask].reset_index(drop=True)
    y = y[mask].fillna(0).astype(int).clip(0, 1).reset_index(drop=True)

    return X, y


def build_model_pipeline(model_name: str = "xgb", scale_pos_weight: float = 1.0):
    """Build a clean ML pipeline with imputation."""
    imputer = SimpleImputer(strategy="median")

    if model_name == "xgb":
        clf = xgb.XGBClassifier(
            n_estimators=500,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=settings.RANDOM_STATE,
            n_jobs=-1,
            verbosity=0,
        )
    elif model_name == "lgb":
        clf = lgb.LGBMClassifier(
            n_estimators=500,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            random_state=settings.RANDOM_STATE,
            n_jobs=-1,
            verbose=-1,
        )
    elif model_name == "cat":
        clf = CatBoostClassifier(
            iterations=500,
            depth=6,
            learning_rate=0.05,
            random_seed=settings.RANDOM_STATE,
            verbose=0,
        )
    elif model_name == "rf":
        clf = RandomForestClassifier(
            n_estimators=300,
            max_depth=8,
            class_weight="balanced",
            random_state=settings.RANDOM_STATE,
            n_jobs=-1,
        )
    else:
        raise ValueError(f"Unknown model: {model_name}")

    return Pipeline([("imputer", imputer), ("clf", clf)])


def build_stacking_ensemble(X: pd.DataFrame, y: pd.Series) -> StackingClassifier:
    """Build a stacking meta-ensemble."""
    pos_weight = (y == 0).sum() / max((y == 1).sum(), 1)

    base_estimators = [
        ("xgb", build_model_pipeline("xgb", pos_weight)),
        ("lgb", build_model_pipeline("lgb", pos_weight)),
        ("cat", build_model_pipeline("cat")),
        ("rf", build_model_pipeline("rf")),
    ]

    meta_learner = LogisticRegression(C=1.0, max_iter=1000, random_state=settings.RANDOM_STATE)

    stack = StackingClassifier(
        estimators=base_estimators,
        final_estimator=meta_learner,
        cv=3,
        passthrough=False,
        n_jobs=1,
        verbose=0,
    )
    return stack


def train_split(df: pd.DataFrame, test_year: int = 2023) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Temporal train/test split — test on most recent seasons."""
    train = df[df["year"] < test_year].copy()
    test = df[df["year"] >= test_year].copy()
    return train, test


def evaluate_model(model, X_test: pd.DataFrame, y_test: pd.Series,
                   model_name: str = "") -> Dict[str, float]:
    """Evaluate binary classifier with F1, AUC, LogLoss."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "f1": f1_score(y_test, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_test, y_prob) if y_test.nunique() > 1 else 0.5,
        "log_loss": log_loss(y_test, y_prob, labels=[0, 1]) if y_test.nunique() > 1 else 1.0,
    }

    logger.info(f"\n{'='*40}")
    logger.info(f"Model: {model_name}")
    for k, v in metrics.items():
        logger.info(f"  {k:15s}: {v:.4f}")

    return metrics


def train_all_models(master_df: pd.DataFrame, mlflow_tracking: bool = True) -> Dict:
    """Train winner, podium, top10 prediction models + stacking ensemble."""
    import mlflow

    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
    mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)

    artifacts_dir = settings.ARTIFACTS_DIR
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    results = {}

    for target, target_name in [
        ("is_winner", "race_winner"),
        ("is_podium", "podium"),
        ("is_top10", "top10"),
        ("is_dnf", "dnf"),
    ]:
        logger.info(f"\n{'='*50}")
        logger.info(f"Training: {target_name}")

        X_all, y_all = prepare_features(master_df, target)
        train_mask = master_df.loc[y_all.index, "year"] < 2023
        X_train, y_train = X_all[train_mask], y_all[train_mask]
        X_test, y_test = X_all[~train_mask], y_all[~train_mask]

        logger.info(f"Train: {len(X_train):,} | Test: {len(X_test):,} | Positive rate: {y_train.mean():.3f}")

        pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

        model_results = {}

        with mlflow.start_run(run_name=f"{target_name}_full"):
            mlflow.log_param("target", target_name)
            mlflow.log_param("train_size", len(X_train))
            mlflow.log_param("test_size", len(X_test))
            mlflow.log_param("n_features", X_train.shape[1])
            mlflow.log_param("positive_rate", float(y_train.mean()))

            # Train individual models
            for model_name in ["xgb", "lgb", "cat"]:
                logger.info(f"  Training {model_name}...")
                pipe = build_model_pipeline(model_name, pos_weight)
                pipe.fit(X_train, y_train)
                metrics = evaluate_model(pipe, X_test, y_test, f"{target_name}_{model_name}")

                mlflow.log_metrics({f"{model_name}_{k}": v for k, v in metrics.items()})

                save_path = artifacts_dir / f"{target_name}_{model_name}.joblib"
                joblib.dump(pipe, save_path)
                model_results[model_name] = {"model": pipe, "metrics": metrics}

            # Best individual model (by AUC)
            best_name = max(model_results, key=lambda k: model_results[k]["metrics"]["roc_auc"])
            best_model = model_results[best_name]["model"]
            best_metrics = model_results[best_name]["metrics"]

            logger.info(f"  Best individual model: {best_name} (AUC={best_metrics['roc_auc']:.4f})")
            mlflow.log_param("best_individual_model", best_name)

            # Save best as primary
            primary_path = artifacts_dir / f"{target_name}_best.joblib"
            joblib.dump(best_model, primary_path)

            mlflow.log_artifact(str(primary_path))

        results[target_name] = {
            "models": model_results,
            "best": best_name,
            "metrics": best_metrics,
            "feature_cols": [c for c in FEATURE_COLS if c in X_all.columns],
        }

    return results


def get_race_predictions(model, X: pd.DataFrame, race_df: pd.DataFrame) -> pd.DataFrame:
    """Generate pre-race win/podium/top10 probability predictions."""
    probs = model.predict_proba(X)[:, 1]
    out = race_df[["driver_id", "race_id"]].copy()
    out["win_probability"] = probs
    out = out.sort_values("win_probability", ascending=False).reset_index(drop=True)
    out["predicted_rank"] = out.index + 1
    return out


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

    logger.info("Loading master feature set...")
    master_df = pd.read_parquet(settings.FEATURES_DIR / "master.parquet")
    logger.info(f"Master shape: {master_df.shape}")

    logger.info("Training all prediction models...")
    results = train_all_models(master_df, mlflow_tracking=True)

    logger.info("\nFinal Results Summary:")
    for target, info in results.items():
        m = info["metrics"]
        logger.info(f"  {target:15s} | AUC={m['roc_auc']:.4f} | F1={m['f1']:.4f} | LogLoss={m['log_loss']:.4f}")
