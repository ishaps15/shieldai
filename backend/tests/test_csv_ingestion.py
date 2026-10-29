import pytest
import pandas as pd
from app.services.ingestion_service import IngestionService

def test_valid_csv_validation():
    csv_data = b"""transaction_id,timestamp,amount,currency,sender_id,receiver_id,transaction_type
TX001,2026-03-01 10:00:00,150.00,USD,CUST_01,MERCH_01,payment
TX002,2026-03-01 10:05:00,250.50,USD,CUST_02,MERCH_02,transfer
"""
    result = IngestionService.validate_csv(csv_data)
    assert result["is_valid"] is True
    assert result["total_rows"] == 2
    assert result["duplicates_count"] == 0
    assert len(result["preview_rows"]) == 2

def test_malformed_csv_validation():
    csv_bad = b"this is not, a valid csv\x00\xff"
    result = IngestionService.validate_csv(csv_bad)
    # Either parsed or returns invalid
    assert "error" in result or result["is_valid"] is False

def test_missing_required_columns():
    csv_missing = b"""amount,sender_id
150.00,CUST_01
"""
    result = IngestionService.validate_csv(csv_missing)
    assert result["is_valid"] is False
    assert "transaction_id" in result["missing_required"]
    assert "timestamp" in result["missing_required"]

def test_duplicate_transaction_ids():
    csv_dup = b"""transaction_id,timestamp,amount,sender_id
TX001,2026-03-01 10:00:00,100,CUST_01
TX001,2026-03-01 10:05:00,200,CUST_01
"""
    result = IngestionService.validate_csv(csv_dup)
    assert result["duplicates_count"] == 1
