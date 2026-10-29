from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.schemas import TransactionModel, ThresholdConfigModel
from app.api.api_router import api_router
from app.services.synthetic_data_generator import SyntheticDataGenerator
from app.services.ingestion_service import IngestionService
from app.services.ml_service import MLService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Initialize default thresholds & demo dataset if empty
    db = SessionLocal()
    try:
        # Check if thresholds exist
        cfg = db.query(ThresholdConfigModel).first()
        if not cfg:
            default_cfg = ThresholdConfigModel(
                strategy="fixed",
                low_threshold=settings.DEFAULT_THRESHOLD_LOW,
                medium_threshold=settings.DEFAULT_THRESHOLD_MEDIUM,
                high_threshold=settings.DEFAULT_THRESHOLD_HIGH,
                critical_threshold=settings.DEFAULT_THRESHOLD_CRITICAL,
                max_alerts_per_day=settings.DEFAULT_MAX_ALERTS_PER_DAY,
                amount_rule_threshold=settings.DEFAULT_AMOUNT_RULE_THRESHOLD,
                rapid_tx_velocity_seconds=settings.DEFAULT_RAPID_TX_SECONDS,
                customer_deviation_sigma=settings.DEFAULT_CUSTOMER_SIGMA,
                is_active=True
            )
            db.add(default_cfg)
            db.commit()

        # Check if transactions exist; if empty, initialize with synthetic dataset
        tx_count = db.query(TransactionModel).count()
        if tx_count == 0:
            print("ShieldAI: Initializing database with demo transactions...")
            gen = SyntheticDataGenerator(random_seed=42)
            gen.generate_standard_files(str(settings.DATA_DIR))
            
            # Load initial labelled dataset
            df_init = gen.generate_dataset(num_transactions=1200, anomaly_rate=0.06, include_labels=True)
            IngestionService.ingest_dataframe(df_init, db, batch_id="initial_demo_batch")
            
            # Score and train initial model
            MLService.score_all_transactions(db)
            print("ShieldAI: Initialization complete.")
    finally:
        db.close()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Intelligent Fraud & Anomaly Detection System with ML, Alerting Engine, and Drift Monitoring",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "api_version": "1.0.0"
    }

@app.get("/")
def root():
    return {
        "service": "ShieldAI API",
        "docs_url": "/docs",
        "status": "online"
    }
