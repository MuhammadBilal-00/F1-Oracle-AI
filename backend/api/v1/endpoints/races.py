"""Race endpoints."""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from backend.services.data_service import data_service

router = APIRouter(prefix="/races", tags=["Races"])


@router.get("/")
def list_races(year: Optional[int] = None, limit: int = 100):
    return data_service.get_races(year=year, limit=limit)


@router.get("/seasons")
def get_seasons():
    return data_service.get_seasons()


@router.get("/{race_id}")
def get_race(race_id: int):
    results = data_service.get_race_results(race_id)
    qualifying = data_service.get_qualifying(race_id)
    pit_stops = data_service.get_pit_stops(race_id)
    return {
        "race_id": race_id,
        "results": results,
        "qualifying": qualifying,
        "pit_stops": pit_stops,
    }


@router.get("/{race_id}/results")
def race_results(race_id: int):
    return data_service.get_race_results(race_id)


@router.get("/{race_id}/qualifying")
def race_qualifying(race_id: int):
    return data_service.get_qualifying(race_id)


@router.get("/{race_id}/pit_stops")
def race_pit_stops(race_id: int):
    return data_service.get_pit_stops(race_id)


@router.get("/{race_id}/lap_times")
def race_lap_times(race_id: int, driver_id: Optional[int] = None):
    return data_service.get_lap_times(race_id, driver_id=driver_id)
