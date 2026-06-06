"""Analytics and insights endpoints."""
from fastapi import APIRouter, Query
from typing import Optional

from backend.services.data_service import data_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/circuits")
def circuit_analytics():
    return data_service.get_circuits()


@router.get("/standings/drivers/{year}")
def driver_standings(year: int, after_round: Optional[int] = None):
    return data_service.get_driver_standings(year, after_round=after_round)


@router.get("/standings/constructors/{year}")
def constructor_standings(year: int):
    return data_service.get_constructor_standings(year)


@router.get("/rivalries")
def top_rivalries(top_n: int = Query(20, le=50)):
    return data_service.get_rivalries(top_n=top_n)


@router.get("/constructors")
def list_constructors():
    return data_service.get_constructors()


@router.get("/constructors/{constructor_id}")
def get_constructor(constructor_id: int):
    return data_service.get_constructor(constructor_id)
