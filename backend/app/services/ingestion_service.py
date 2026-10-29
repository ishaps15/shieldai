import io
import uuid
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.schemas import TransactionModel

class IngestionService:
    """
    Validates, maps columns, and ingests CSV transaction files into the database.
    Performs schema checking, duplicate inspection, missing value profiling, and batching.
    """

    REQUIRED_COLUMNS = ["transaction_id", "timestamp", "amount", "sender_id"]
    RECOMMENDED_COLUMNS = ["receiver_id", "transaction_type", "merchant_category", "location", "device_channel"]
    OPTIONAL_COLUMNS = ["is_fraud_ground_truth"]

    @classmethod
    def validate_csv(cls, file_content: bytes) -> Dict[str, Any]:
        """
        Validates CSV content, profiles data quality, inspects duplicates and null values,
        and generates a preview of the first 10 rows.
        """
        try:
            df = pd.read_csv(io.BytesIO(file_content))
        except Exception as e:
            return {
                "is_valid": False,
                "error": f"Failed to parse CSV file: {str(e)}",
                "columns": [],
                "preview_rows": [],
                "total_rows": 0,
                "duplicates_count": 0,
                "missing_values": {}
            }

        if df.empty:
            return {
                "is_valid": False,
                "error": "CSV file is empty.",
                "columns": [],
                "preview_rows": [],
                "total_rows": 0,
                "duplicates_count": 0,
                "missing_values": {}
            }

        columns = list(df.columns)
        total_rows = len(df)

        # Check duplicate transaction_id if present
        duplicates_count = 0
        if "transaction_id" in df.columns:
            duplicates_count = int(df["transaction_id"].duplicated().sum())

        # Check missing values per column
        missing_values = {col: int(df[col].isna().sum()) for col in columns}

        # Check column presence against required
        missing_required = [c for c in cls.REQUIRED_COLUMNS if c not in columns]

        # Check timestamp parseability
        timestamp_valid = True
        if "timestamp" in df.columns:
            try:
                pd.to_datetime(df["timestamp"].dropna().iloc[:50])
            except Exception:
                timestamp_valid = False

        # Check amount numeric validity
        amount_valid = True
        if "amount" in df.columns:
            amount_numeric = pd.to_numeric(df["amount"], errors="coerce")
            if amount_numeric.isna().sum() > (0.1 * total_rows): # >10% invalid
                amount_valid = False

        preview_rows = df.head(10).replace({np.nan: None}).to_dict(orient="records")

        is_valid = (len(missing_required) == 0) and timestamp_valid and amount_valid
        error_msg = None
        if missing_required:
            error_msg = f"Missing required columns: {', '.join(missing_required)}. Available columns: {', '.join(columns)}"
        elif not timestamp_valid:
            error_msg = "Timestamp column contains unparseable datetime values."
        elif not amount_valid:
            error_msg = "Amount column contains non-numeric or invalid currency entries."

        return {
            "is_valid": is_valid,
            "error": error_msg,
            "columns": columns,
            "missing_required": missing_required,
            "total_rows": total_rows,
            "duplicates_count": duplicates_count,
            "missing_values": missing_values,
            "has_fraud_labels": "is_fraud_ground_truth" in columns,
            "preview_rows": preview_rows
        }

    @classmethod
    def ingest_dataframe(
        cls,
        df: pd.DataFrame,
        db: Session,
        column_mapping: Optional[Dict[str, str]] = None,
        batch_id: Optional[str] = None
    ) -> Tuple[int, str]:
        """
        Maps columns, casts types, and writes transactions to database.
        Returns count of ingested rows and the assigned batch_id.
        """
        if column_mapping:
            df = df.rename(columns=column_mapping)

        if not batch_id:
            batch_id = f"batch_{uuid.uuid4().hex[:8]}"

        # Standardize columns
        if "transaction_id" not in df.columns:
            df["transaction_id"] = [f"TX_{uuid.uuid4().hex[:12].upper()}" for _ in range(len(df))]
        
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce").fillna(pd.Timestamp.now())
        else:
            df["timestamp"] = pd.date_range(end=pd.Timestamp.now(), periods=len(df), freq="min")

        if "amount" in df.columns:
            df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(50.0).abs()
        else:
            df["amount"] = 50.0

        if "sender_id" not in df.columns:
            df["sender_id"] = "ANON_SENDER"
        if "receiver_id" not in df.columns:
            df["receiver_id"] = "ANON_MERCHANT"
        if "transaction_type" not in df.columns:
            df["transaction_type"] = "transfer"
        if "merchant_category" not in df.columns:
            df["merchant_category"] = "general"
        if "location" not in df.columns:
            df["location"] = "US"
        if "device_channel" not in df.columns:
            df["device_channel"] = "web"

        has_labels = "is_fraud_ground_truth" in df.columns

        # Drop duplicates within batch by transaction_id
        df = df.drop_duplicates(subset=["transaction_id"], keep="first")

        # Check existing transaction_ids to avoid SQLite unique constraint errors
        existing_ids = set(
            row[0] for row in db.query(TransactionModel.transaction_id).filter(
                TransactionModel.transaction_id.in_(df["transaction_id"].tolist())
            ).all()
        )
        if existing_ids:
            df = df[~df["transaction_id"].isin(existing_ids)]

        transactions_to_add = []
        for _, row in df.iterrows():
            tx = TransactionModel(
                transaction_id=str(row["transaction_id"]),
                timestamp=row["timestamp"].to_pydatetime() if isinstance(row["timestamp"], pd.Timestamp) else row["timestamp"],
                amount=float(row["amount"]),
                currency=str(row.get("currency", "USD")),
                sender_id=str(row["sender_id"]),
                receiver_id=str(row["receiver_id"]),
                transaction_type=str(row["transaction_type"]),
                merchant_category=str(row["merchant_category"]),
                location=str(row["location"]),
                device_channel=str(row["device_channel"]),
                is_fraud_ground_truth=int(row["is_fraud_ground_truth"]) if has_labels and pd.notna(row["is_fraud_ground_truth"]) else None,
                is_synthetic=bool(row.get("is_synthetic", True)),
                batch_id=batch_id,
                is_anomaly=False,
                risk_band="low"
            )
            transactions_to_add.append(tx)

        if transactions_to_add:
            db.bulk_save_objects(transactions_to_add)
            db.commit()

        return len(transactions_to_add), batch_id
