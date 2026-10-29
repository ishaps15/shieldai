import os
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.services.ingestion_service import IngestionService
from app.services.synthetic_data_generator import SyntheticDataGenerator
from app.services.ml_service import MLService

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

@router.post("/validate")
async def validate_file(file: UploadFile = File(...)):
    """Validates an uploaded CSV file, inspects duplicates, nulls, and gives a preview."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    content = await file.read()
    res = IngestionService.validate_csv(content)
    return res

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    auto_score: bool = Form(True),
    db: Session = Depends(get_db)
):
    """Uploads and ingests a CSV dataset, optionally triggering feature engineering & anomaly scoring."""
    content = await file.read()
    val_res = IngestionService.validate_csv(content)
    if not val_res["is_valid"]:
        raise HTTPException(status_code=400, detail=val_res["error"])

    import io
    df = pd.read_csv(io.BytesIO(content))
    count, batch_id = IngestionService.ingest_dataframe(df, db)

    ml_res = None
    if auto_score and count > 0:
        ml_res = MLService.score_all_transactions(db)

    return {
        "status": "success",
        "ingested_count": count,
        "batch_id": batch_id,
        "ml_result": ml_res
    }

@router.post("/demo")
def load_demo_data(
    mode: str = "labelled", # labelled, unlabelled, drifted
    count: int = 1500,
    auto_score: bool = True,
    db: Session = Depends(get_db)
):
    """
    Generates clearly labelled synthetic test data and loads it into ShieldAI.
    Modes:
      - 'labelled': Includes ground truth fraud labels for supervised evaluation & PR curves
      - 'unlabelled': Pure realistic transaction stream for unsupervised anomaly monitoring
      - 'drifted': Injected distribution shifts (amount inflation, abnormal hour surges)
    """
    gen = SyntheticDataGenerator(random_seed=42)
    is_drifted = mode == "drifted"
    include_labels = mode != "unlabelled"
    anomaly_rate = 0.12 if is_drifted else 0.05

    df = gen.generate_dataset(
        num_transactions=count,
        anomaly_rate=anomaly_rate,
        include_labels=include_labels,
        is_drifted=is_drifted
    )

    ingested_count, batch_id = IngestionService.ingest_dataframe(df, db, batch_id=f"demo_{mode}")

    ml_res = None
    if auto_score:
        ml_res = MLService.score_all_transactions(db)

    return {
        "status": "success",
        "demo_mode": mode,
        "is_synthetic": True,
        "ingested_count": ingested_count,
        "batch_id": batch_id,
        "ml_result": ml_res
    }
