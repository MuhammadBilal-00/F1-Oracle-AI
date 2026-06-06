"""ML inference service — loads models and generates predictions."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import logging
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from functools import lru_cache

from configs.settings import settings
from ml.models.race_winner.model import FEATURE_COLS, prepare_features
from ml.models.simulation.monte_carlo import (
    build_driver_profiles_from_features, run_monte_carlo, RaceConfig
)

logger = logging.getLogger(__name__)


class MLService:
    """Lazy-loading ML inference engine."""

    def __init__(self):
        self._models: Dict[str, object] = {}
        self._master_df: Optional[pd.DataFrame] = None

    def _get_model(self, name: str):
        if name not in self._models:
            path = settings.ARTIFACTS_DIR / f"{name}_best.joblib"
            if path.exists():
                self._models[name] = joblib.load(path)
                logger.info(f"Loaded model: {name}")
            else:
                logger.warning(f"Model not found: {path}")
                return None
        return self._models[name]

    def _get_master(self) -> pd.DataFrame:
        if self._master_df is None:
            path = settings.FEATURES_DIR / "master.parquet"
            if path.exists():
                self._master_df = pd.read_parquet(path)
        return self._master_df

    def predict_race(self, race_id: int) -> Dict:
        """Generate full prediction suite for a race."""
        master = self._get_master()
        if master is None:
            return {"error": "Feature store not available"}

        race_data = master[master["race_id"] == race_id].copy()
        if len(race_data) == 0:
            return {"error": f"No data for race_id {race_id}"}

        results = {"race_id": race_id, "drivers": []}

        available_feat_cols = [c for c in FEATURE_COLS if c in race_data.columns]
        X = race_data[available_feat_cols].fillna(0)

        # Load all models
        model_targets = [
            ("race_winner", "win_probability"),
            ("podium", "podium_probability"),
            ("top10", "top10_probability"),
            ("dnf", "dnf_probability"),
        ]

        probs = {}
        for model_name, prob_key in model_targets:
            model = self._get_model(model_name)
            if model:
                try:
                    probs[prob_key] = model.predict_proba(X)[:, 1]
                except Exception as e:
                    logger.error(f"Prediction error for {model_name}: {e}")
                    probs[prob_key] = np.zeros(len(X))
            else:
                probs[prob_key] = np.zeros(len(X))

        for i, (_, row) in enumerate(race_data.iterrows()):
            driver_pred = {
                "driver_id": int(row["driver_id"]),
                "grid_position": int(row["grid"]) if pd.notna(row.get("grid")) else None,
                "win_probability": float(probs["win_probability"][i]),
                "podium_probability": float(probs["podium_probability"][i]),
                "top10_probability": float(probs["top10_probability"][i]),
                "dnf_probability": float(probs["dnf_probability"][i]),
            }
            results["drivers"].append(driver_pred)

        # Sort by win probability
        results["drivers"] = sorted(results["drivers"], key=lambda x: x["win_probability"], reverse=True)
        for i, d in enumerate(results["drivers"]):
            d["predicted_position"] = i + 1

        return results

    def simulate_race(self, race_id: int, n_simulations: int = 1000) -> Dict:
        """Run Monte Carlo simulation for a race."""
        master = self._get_master()
        if master is None:
            return {"error": "Feature store not available"}

        profiles = build_driver_profiles_from_features(master, race_id)
        if not profiles:
            return {"error": f"No driver profiles for race_id {race_id}"}

        config = RaceConfig(n_laps=57)
        sim_results = run_monte_carlo(profiles, config, n_simulations=n_simulations)

        return {
            "race_id": race_id,
            "n_simulations": n_simulations,
            "results": sim_results.replace({np.nan: None}).to_dict(orient="records"),
        }

    def predict_custom(self, circuit_id: int, entries: List[Dict]) -> Dict:
        """Predict a hypothetical race: a user-chosen circuit + grid of drivers.

        Each driver's most recent feature row is used as their form baseline, then
        the grid slot and the chosen circuit's characteristics (and the driver's
        record at that circuit, if any) are overridden before inference.
        """
        master = self._get_master()
        if master is None:
            return {"error": "Feature store not available"}

        circ_rows = master[master["circuit_id"] == circuit_id]
        if len(circ_rows) == 0:
            return {"error": f"No data for circuit_id {circuit_id}"}

        circ_ref = circ_rows.sort_values(["year", "round"]).iloc[-1]
        circuit_level = ["avg_dnf_rate", "overtake_index", "circuit_chaos_index", "avg_pit_stops_per_race"]
        driver_circuit = ["circuit_win_rate", "circuit_avg_finish", "circuit_dnf_rate", "circuit_races", "track_specialization_score"]
        available = [c for c in FEATURE_COLS if c in master.columns]

        rows, meta = [], []
        for e in entries:
            d, grid = int(e["driver_id"]), int(e["grid"])
            dm = master[master["driver_id"] == d]
            if len(dm) == 0:
                continue
            base = dm.sort_values(["year", "round"]).iloc[-1].copy()

            for c in circuit_level:
                if c in master.columns:
                    base[c] = circ_ref[c]

            dcirc = dm[dm["circuit_id"] == circuit_id]
            if len(dcirc):
                cb = dcirc.sort_values(["year", "round"]).iloc[-1]
                for c in driver_circuit:
                    if c in master.columns:
                        base[c] = cb[c]
            else:
                if "circuit_races" in master.columns:
                    base["circuit_races"] = 0
                if "circuit_win_rate" in master.columns:
                    base["circuit_win_rate"] = 0.0

            base["grid"] = grid
            if "quali_position" in master.columns:
                base["quali_position"] = grid
            if "grid_x_ctor_reliability" in master.columns:
                rel = base.get("ctor_reliability_score", np.nan)
                base["grid_x_ctor_reliability"] = grid * (rel if pd.notna(rel) else 0.0)

            rows.append(base[available])
            meta.append({"driver_id": d, "grid": grid})

        if not rows:
            return {"error": "None of the selected drivers exist in the dataset"}

        X = pd.DataFrame(rows)[available]
        probs = {}
        for name, key in [
            ("race_winner", "win_probability"), ("podium", "podium_probability"),
            ("top10", "top10_probability"), ("dnf", "dnf_probability"),
        ]:
            model = self._get_model(name)
            probs[key] = model.predict_proba(X)[:, 1] if model else np.zeros(len(X))

        drivers = []
        for i, m in enumerate(meta):
            drivers.append({
                "driver_id": m["driver_id"],
                "grid_position": m["grid"],
                "win_probability": float(probs["win_probability"][i]),
                "podium_probability": float(probs["podium_probability"][i]),
                "top10_probability": float(probs["top10_probability"][i]),
                "dnf_probability": float(probs["dnf_probability"][i]),
            })
        drivers.sort(key=lambda x: x["win_probability"], reverse=True)
        for i, dd in enumerate(drivers):
            dd["predicted_position"] = i + 1
        return {"circuit_id": circuit_id, "drivers": drivers}

    def get_feature_importance(self, target: str = "race_winner") -> List[Dict]:
        """Get feature importance from the best model."""
        import shap

        model = self._get_model(target)
        if model is None:
            return []

        master = self._get_master()
        if master is None:
            return []

        available_feat_cols = [c for c in FEATURE_COLS if c in master.columns]
        X_sample = master[available_feat_cols].fillna(0).sample(
            n=min(1000, len(master)), random_state=42
        )

        try:
            clf = model.named_steps["clf"]
            X_imp = model.named_steps["imputer"].transform(X_sample)

            explainer = shap.TreeExplainer(clf)
            shap_values = explainer.shap_values(X_imp)

            if isinstance(shap_values, list):
                shap_values = shap_values[1]

            mean_abs_shap = np.abs(shap_values).mean(axis=0)
            feature_names = available_feat_cols

            importance = [
                {"feature": feat, "importance": float(imp)}
                for feat, imp in zip(feature_names, mean_abs_shap)
            ]
            importance.sort(key=lambda x: x["importance"], reverse=True)
            return importance[:30]

        except Exception as e:
            logger.error(f"SHAP computation failed: {e}")
            # Fallback to model's built-in importance
            try:
                clf = model.named_steps["clf"]
                if hasattr(clf, "feature_importances_"):
                    importances = clf.feature_importances_
                    return [
                        {"feature": feat, "importance": float(imp)}
                        for feat, imp in sorted(
                            zip(available_feat_cols, importances),
                            key=lambda x: x[1], reverse=True
                        )
                    ][:30]
            except Exception:
                pass
            return []


ml_service = MLService()
