from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
from app.core.database import get_db
from app.models.schemas import (
    AlertModel, AlertAuditLogModel, AlertResponse, AlertUpdate, AlertAuditLogResponse
)

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=100),
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    group_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("timestamp"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db)
):
    """Lists alerts with filtering by triage status, risk tier, and deduplicated groups."""
    query = db.query(AlertModel)

    if status and status.lower() != "all":
        query = query.filter(AlertModel.status == status)

    if risk_level and risk_level.lower() != "all":
        query = query.filter(AlertModel.risk_level == risk_level.lower())

    if group_id:
        query = query.filter(AlertModel.group_id == group_id)

    if search:
        query = query.filter(
            (AlertModel.alert_id.ilike(f"%{search}%")) |
            (AlertModel.sender_id.ilike(f"%{search}%")) |
            (AlertModel.transaction_id.ilike(f"%{search}%"))
        )

    total = query.count()

    sort_col = getattr(AlertModel, sort_by, AlertModel.timestamp)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "items": [AlertResponse.model_validate(a) for a in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

@router.get("/groups/summary")
def get_alert_groups(db: Session = Depends(get_db)):
    """Returns grouped alert summary for deduplicated incident management."""
    groups = db.query(
        AlertModel.group_id,
        func.count(AlertModel.id).label("alert_count"),
        func.max(AlertModel.risk_level).label("highest_risk"),
        func.max(AlertModel.timestamp).label("last_activity"),
        func.min(AlertModel.sender_id).label("sender_id")
    ).group_by(AlertModel.group_id).order_by(desc("last_activity")).limit(50).all()

    return [{
        "group_id": g.group_id or "Ungrouped",
        "alert_count": g.alert_count,
        "highest_risk": g.highest_risk,
        "last_activity": g.last_activity,
        "sender_id": g.sender_id
    } for g in groups]

@router.get("/{alert_id}")
def get_alert_detail(alert_id: str, db: Session = Depends(get_db)):
    """Retrieves full alert incident, linked transaction, and audit timeline."""
    alert = db.query(AlertModel).filter(AlertModel.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    
    return AlertResponse.model_validate(alert)

@router.patch("/{alert_id}")
def update_alert(alert_id: str, payload: AlertUpdate, db: Session = Depends(get_db)):
    """
    Updates alert status (New, Under Review, Escalated, Resolved, False Positive),
    assigns analyst, modifies severity, and records audit trail.
    """
    alert = db.query(AlertModel).filter(AlertModel.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    audit_entries = []

    if payload.status and payload.status != alert.status:
        old_st = alert.status
        alert.status = payload.status
        audit_entries.append(AlertAuditLogModel(
            alert_id=alert.alert_id,
            action="status_change",
            old_value=old_st,
            new_value=payload.status,
            note=payload.note or f"Status transitioned from '{old_st}' to '{payload.status}'",
            actor=payload.actor,
            timestamp=datetime.utcnow()
        ))

    if payload.risk_level and payload.risk_level != alert.risk_level:
        old_rl = alert.risk_level
        alert.risk_level = payload.risk_level
        audit_entries.append(AlertAuditLogModel(
            alert_id=alert.alert_id,
            action="severity_change",
            old_value=old_rl,
            new_value=payload.risk_level,
            note=payload.note or f"Risk level modified from '{old_rl}' to '{payload.risk_level}'",
            actor=payload.actor,
            timestamp=datetime.utcnow()
        ))

    if payload.assigned_analyst:
        alert.assigned_analyst = payload.assigned_analyst

    # If pure note without status change
    if payload.note and not audit_entries:
        audit_entries.append(AlertAuditLogModel(
            alert_id=alert.alert_id,
            action="note_added",
            note=payload.note,
            actor=payload.actor,
            timestamp=datetime.utcnow()
        ))

    alert.updated_at = datetime.utcnow()
    for entry in audit_entries:
        db.add(entry)

    db.commit()
    db.refresh(alert)
    return AlertResponse.model_validate(alert)
