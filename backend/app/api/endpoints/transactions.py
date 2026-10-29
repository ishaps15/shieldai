from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.core.database import get_db
from app.models.schemas import TransactionModel, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("")
def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=200),
    search: Optional[str] = None,
    risk_band: Optional[str] = None,
    is_anomaly: Optional[bool] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = Query("timestamp"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db)
):
    """Lists transactions with multi-criteria filtering, search, and pagination."""
    query = db.query(TransactionModel)

    if search:
        query = query.filter(
            (TransactionModel.transaction_id.ilike(f"%{search}%")) |
            (TransactionModel.sender_id.ilike(f"%{search}%")) |
            (TransactionModel.receiver_id.ilike(f"%{search}%"))
        )

    if risk_band and risk_band.lower() != "all":
        query = query.filter(TransactionModel.risk_band == risk_band.lower())

    if is_anomaly is not None:
        query = query.filter(TransactionModel.is_anomaly == is_anomaly)

    if min_amount is not None:
        query = query.filter(TransactionModel.amount >= min_amount)

    if max_amount is not None:
        query = query.filter(TransactionModel.amount <= max_amount)

    if start_date:
        try:
            s_dt = datetime.fromisoformat(start_date)
            query = query.filter(TransactionModel.timestamp >= s_dt)
        except Exception:
            pass

    if end_date:
        try:
            e_dt = datetime.fromisoformat(end_date)
            query = query.filter(TransactionModel.timestamp <= e_dt)
        except Exception:
            pass

    total = query.count()

    # Sorting
    sort_col = getattr(TransactionModel, sort_by, TransactionModel.timestamp)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "items": [TransactionResponse.model_validate(t) for t in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.get("/{transaction_id}")
def get_transaction_detail(transaction_id: str, db: Session = Depends(get_db)):
    """Retrieves single transaction detail, contributing signals, and sender timeline."""
    tx = db.query(TransactionModel).filter(TransactionModel.transaction_id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    # Fetch sender's preceding 10 transactions to inspect historical behavior
    sender_history = db.query(TransactionModel).filter(
        TransactionModel.sender_id == tx.sender_id,
        TransactionModel.timestamp <= tx.timestamp
    ).order_by(desc(TransactionModel.timestamp)).limit(10).all()

    return {
        "transaction": TransactionResponse.model_validate(tx),
        "sender_history": [TransactionResponse.model_validate(h) for h in sender_history],
        "contributing_signals": tx.contributing_signals or []
    }
