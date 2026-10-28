from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field


class FHIRQuantity(BaseModel):
    value: float
    unit: str
    system: str = "http://unitsofmeasure.org"
    code: str


class FHIRObservation(BaseModel):
    resourceType: str = "Observation"
    id: str
    status: str = "final"
    code: dict[str, Any]
    subject: dict[str, str]
    effectiveDateTime: str
    valueQuantity: Optional[FHIRQuantity] = None
    component: Optional[list[dict[str, Any]]] = None


class WearableTelemetrySync(BaseModel):
    device_id: str
    device_type: str = Field(description="e.g. apple_watch, fitbit, garmin, ecg_patch")
    timestamp: str
    heart_rate_bpm: Optional[int] = None
    resting_heart_rate: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    steps: Optional[int] = None
    hrv_rmssd: Optional[float] = None
    ecg_rhythm_classification: Optional[str] = "normal_sinus"


def convert_prediction_to_fhir(prediction_id: int, patient_id: int, probability: float, risk_level: str) -> dict[str, Any]:
    """Convert cardiac prediction outcome into standard HL7/FHIR RiskAssessment resource."""
    return {
        "resourceType": "RiskAssessment",
        "id": f"cardio-risk-{prediction_id}",
        "status": "final",
        "subject": {"reference": f"Patient/{patient_id}"},
        "occurrenceDateTime": datetime.now(timezone.utc).isoformat(),
        "method": {
            "coding": [
                {
                    "system": "http://cardiohealth.ai/clinical-models",
                    "code": "ML-ENSEMBLE-V1",
                    "display": "Supervised Ensemble Cardiac Risk Assessment",
                }
            ]
        },
        "prediction": [
            {
                "outcome": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "53741008",
                            "display": "Coronary arteriosclerosis",
                        }
                    ]
                },
                "probabilityDecimal": round(probability, 4),
                "qualitativeRisk": {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/risk-probability",
                            "code": risk_level.lower(),
                            "display": f"{risk_level.capitalize()} Risk",
                        }
                    ]
                },
            }
        ],
    }


def convert_vitals_to_fhir_observations(record_id: int, patient_id: int, systolic: float, cholesterol: float) -> list[dict[str, Any]]:
    """Convert vitals to FHIR standard observation resources."""
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "resourceType": "Observation",
            "id": f"obs-bp-{record_id}",
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure"}]},
            "subject": {"reference": f"Patient/{patient_id}"},
            "effectiveDateTime": now,
            "valueQuantity": {"value": systolic, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]"},
        },
        {
            "resourceType": "Observation",
            "id": f"obs-chol-{record_id}",
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "laboratory"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "2093-3", "display": "Total Cholesterol"}]},
            "subject": {"reference": f"Patient/{patient_id}"},
            "effectiveDateTime": now,
            "valueQuantity": {"value": cholesterol, "unit": "mg/dL", "system": "http://unitsofmeasure.org", "code": "mg/dL"},
        },
    ]
