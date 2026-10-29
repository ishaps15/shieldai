import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.main import app
from app.models.schemas import ThresholdConfigModel
from app.services.synthetic_data_generator import SyntheticDataGenerator
from app.services.ingestion_service import IngestionService
from app.services.ml_service import MLService

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Add initial threshold config
    cfg = ThresholdConfigModel(
        strategy="fixed",
        low_threshold=0.35,
        medium_threshold=0.55,
        high_threshold=0.75,
        critical_threshold=0.90,
        max_alerts_per_day=250,
        amount_rule_threshold=10000.0,
        rapid_tx_velocity_seconds=120,
        customer_deviation_sigma=3.5,
        is_active=True
    )
    db.add(cfg)
    db.commit()

    # Ingest synthetic dataset for testing
    gen = SyntheticDataGenerator(random_seed=42)
    df = gen.generate_dataset(num_transactions=100, anomaly_rate=0.1, include_labels=True)
    IngestionService.ingest_dataframe(df, db, batch_id="test_batch")
    MLService.score_all_transactions(db)

    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
