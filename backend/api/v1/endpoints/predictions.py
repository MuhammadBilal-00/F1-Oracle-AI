"""Prediction & simulation endpoints."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from backend.services.ml_service import ml_service

router = APIRouter(prefix="/predictions", tags=["Predictions & AI"])


@router.get("/race/{race_id}")
def predict_race(race_id: int):
    """Get AI predictions for a specific race."""
    result = ml_service.predict_race(race_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/race/{race_id}/simulate")
def simulate_race(
    race_id: int,
    n_simulations: int = Query(1000, ge=100, le=10000, description="Number of Monte Carlo simulations"),
):
    """Run Monte Carlo race simulation."""
    result = ml_service.simulate_race(race_id, n_simulations=n_simulations)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/feature-importance/{target}")
def feature_importance(
    target: str = "race_winner",
):
    """Get SHAP feature importance for a prediction model."""
    valid_targets = ["race_winner", "podium", "top10", "dnf"]
    if target not in valid_targets:
        raise HTTPException(status_code=400, detail=f"Target must be one of {valid_targets}")

    importance = ml_service.get_feature_importance(target)
    return {"target": target, "features": importance}
