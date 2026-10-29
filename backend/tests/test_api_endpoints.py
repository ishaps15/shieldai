import pytest

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_dashboard_stats(client):
    res = client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_transactions" in data
    assert "risk_breakdown" in data
    assert "score_distribution" in data

def test_transactions_listing(client):
    res = client.get("/api/v1/transactions?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data

def test_alerts_listing_and_triage(client):
    res = client.get("/api/v1/alerts")
    assert res.status_code == 200
    alerts = res.json()["items"]
    if alerts:
        target_id = alerts[0]["alert_id"]
        # Update status to Under Review
        patch_res = client.patch(f"/api/v1/alerts/{target_id}", json={
            "status": "Under Review",
            "note": "Analyst investigating anomaly signal",
            "actor": "Lead Analyst"
        })
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "Under Review"

def test_threshold_preview(client):
    res = client.post("/api/v1/thresholds/preview", json={
        "strategy": "fixed",
        "low_threshold": 0.3,
        "medium_threshold": 0.5,
        "high_threshold": 0.7,
        "critical_threshold": 0.85
    })
    assert res.status_code == 200
    data = res.json()
    assert "total_evaluated" in data
    assert "flagged_count" in data

def test_drift_analysis_endpoint(client):
    res = client.post("/api/v1/drift/run", json={"split_method": "chronological"})
    assert res.status_code == 200
    data = res.json()
    assert "overall_status" in data
    assert "score_psi" in data
