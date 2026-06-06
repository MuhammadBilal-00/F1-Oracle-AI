"""API v1 router — aggregates all endpoint modules."""
from fastapi import APIRouter
from backend.api.v1.endpoints import drivers, races, predictions, analytics

api_router = APIRouter()

api_router.include_router(drivers.router)
api_router.include_router(races.router)
api_router.include_router(predictions.router)
api_router.include_router(analytics.router)
