"""Driver endpoints."""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from backend.services.data_service import data_service

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get("/")
def list_drivers(
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(1000, le=2000),
):
    return data_service.get_drivers(limit=limit, search=search)


@router.get("/goat")
def goat_rankings(top_n: int = Query(50, le=100)):
    return data_service.get_goat_rankings(top_n=top_n)


@router.get("/clusters")
def driver_clusters():
    return data_service.get_driver_clusters()


@router.get("/{driver_id}")
def get_driver(driver_id: int):
    result = data_service.get_driver(driver_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Driver {driver_id} not found")
    return result


@router.get("/{driver_id}/history")
def driver_history(driver_id: int):
    return data_service.get_driver_race_history(driver_id)
