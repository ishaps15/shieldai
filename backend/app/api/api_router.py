from fastapi import APIRouter
from app.api.endpoints import (
    ingestion,
    transactions,
    alerts,
    thresholds,
    drift,
    models_ml,
    dashboard
)

api_router = APIRouter()

api_router.include_router(dashboard.router)
api_router.include_router(ingestion.router)
api_router.include_router(transactions.router)
api_router.include_router(alerts.router)
api_router.include_router(thresholds.router)
api_router.include_router(drift.router)
api_router.include_router(models_ml.router)
