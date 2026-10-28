import io
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _get_patient_token() -> str:
    email = "test_features_patient@example.com"
    client.post("/api/auth/register", json={"name": "Feature Test Patient", "email": email, "password": "password12"})
    login = client.post("/api/auth/login", json={"email": email, "password": "password12"})
    return login.json()["access_token"]


def test_simulation_endpoint() -> None:
    token = _get_patient_token()
    payload = {
        "age": 55,
        "sex": 1,
        "chest_pain_type": 2,
        "resting_bp": 145,
        "cholesterol": 240,
        "fasting_blood_sugar": 0,
        "resting_ecg": 1,
        "max_heart_rate": 130,
        "exercise_angina": 1,
        "oldpeak": 1.8,
        "st_slope": 1,
    }
    res = client.post("/api/predictions/simulate", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "current_probability" in data
    assert "scenarios" in data
    assert len(data["scenarios"]) >= 4
    assert "forecast_timeline" in data
    assert len(data["forecast_timeline"]) == 5


def test_assistant_rag_chat() -> None:
    token = _get_patient_token()
    res = client.post(
        "/api/assistant/chat",
        json={"message": "What does resting blood pressure mean for heart risk?"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "Blood Pressure" in data["reply"] or "AHA/ACC" in data["reply"] or "hypertension" in data["reply"].lower()
    assert data["emergency"] is False


def test_ocr_extraction() -> None:
    token = _get_patient_token()
    sample_report_text = (
        "CARDIOLOGY CLINIC REPORT\n"
        "Patient: John Doe, Age: 58, Sex: Male\n"
        "Resting Blood Pressure: 142/88 mmHg\n"
        "Total Cholesterol: 235 mg/dL\n"
        "Fasting Blood Sugar: 110 mg/dL\n"
        "Max Heart Rate achieved: 145 bpm\n"
        "Resting ECG: Normal sinus rhythm\n"
        "Impression: Mild hypertension, borderline hyperlipidemia."
    )

    # Use a dummy text/file upload
    file_bytes = io.BytesIO(sample_report_text.encode("utf-8"))
    res = client.post(
        "/api/reports/ocr-extract",
        files={"file": ("lab_report.png", file_bytes, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "extracted_features" in data
    assert "summary" in data
    assert data["filename"] == "lab_report.png"
