import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_register_login_me() -> None:
    email = "patient_test_flow@example.com"
    client.post("/api/auth/register", json={"name": "Test Patient", "email": email, "password": "password12"})
    login = client.post("/api/auth/login", json={"email": email, "password": "password12"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user"]["email"] == email


def test_prediction_rejects_invalid_age() -> None:
    email = "patient_invalid@example.com"
    client.post("/api/auth/register", json={"name": "Invalid", "email": email, "password": "password12"})
    token = client.post("/api/auth/login", json={"email": email, "password": "password12"}).json()["access_token"]
    payload = {
        "age": 500,
        "sex": 1,
        "chest_pain_type": 2,
        "resting_bp": 130,
        "cholesterol": 220,
        "fasting_blood_sugar": 0,
        "resting_ecg": 1,
        "max_heart_rate": 150,
        "exercise_angina": 0,
        "oldpeak": 1.2,
        "st_slope": 2,
    }
    res = client.post("/api/predictions", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 422


def test_prediction_scores_valid_input() -> None:
    email = "patient_valid@example.com"
    client.post("/api/auth/register", json={"name": "Valid", "email": email, "password": "password12"})
    token = client.post("/api/auth/login", json={"email": email, "password": "password12"}).json()["access_token"]
    payload = {
        "age": 45,
        "sex": 1,
        "chest_pain_type": 2,
        "resting_bp": 130,
        "cholesterol": 220,
        "fasting_blood_sugar": 0,
        "resting_ecg": 1,
        "max_heart_rate": 150,
        "exercise_angina": 0,
        "oldpeak": 1.2,
        "st_slope": 2,
        "emergency_symptoms": {"severe_chest_pain": True, "difficulty_breathing": False, "fainting": False, "sudden_weakness": False},
    }
    res = client.post("/api/predictions", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["risk_level"] in {"low", "moderate", "high"}
    assert 0 <= body["probability"] <= 1
    assert body["emergency_warning"] is True
    assert body["model_version"]
    hist = client.get("/api/predictions/history", headers={"Authorization": f"Bearer {token}"})
    assert hist.status_code == 200
    assert len(hist.json()["items"]) >= 1
    pdf = client.get(f"/api/reports/{body['id']}", headers={"Authorization": f"Bearer {token}"})
    assert pdf.status_code == 200
    assert pdf.headers["content-type"].startswith("application/pdf")
