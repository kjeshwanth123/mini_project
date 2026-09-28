from typing import Optional

from pydantic import BaseModel, Field


class EmergencySymptoms(BaseModel):
    severe_chest_pain: bool = False
    difficulty_breathing: bool = False
    fainting: bool = False
    sudden_weakness: bool = False


class AssessmentRequest(BaseModel):
    age: int = Field(ge=1, le=120)
    sex: int = Field(ge=0, le=1)
    chest_pain_type: int = Field(ge=0, le=3)
    resting_bp: float = Field(gt=50, lt=260)
    cholesterol: float = Field(ge=50, le=700)
    fasting_blood_sugar: int = Field(ge=0, le=1)
    resting_ecg: int = Field(ge=0, le=2)
    max_heart_rate: int = Field(ge=50, le=250)
    exercise_angina: int = Field(ge=0, le=1)
    oldpeak: float = Field(ge=-3, le=8)
    st_slope: int = Field(ge=0, le=2)
    emergency_symptoms: Optional[EmergencySymptoms] = None


class ExplanationItem(BaseModel):
    feature: str
    contribution: float
    direction: str
    text: str
    kind: str = "MODEL_CONTRIBUTION"


class PredictionResponse(BaseModel):
    id: int
    health_record_id: int
    prediction: str
    probability: float
    risk_level: str
    model_version: str
    model_name: str
    explanation: list[ExplanationItem]
    precautions: list[dict]
    medication_information: list[dict]
    emergency_warning: bool
    emergency_message: Optional[str] = None
    disclaimer: str
    created_at: str
