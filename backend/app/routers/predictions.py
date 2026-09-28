from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import (
    DoctorPatientAssignment,
    HealthRecord,
    MedicationInformation,
    ModelVersion,
    PatientProfile,
    Prediction,
    Recommendation,
    User,
    UserRole,
)
from app.schemas.prediction import AssessmentRequest, PredictionResponse
from app.security.deps import get_current_user
from app.services.ml_runtime import get_runtime, predict_features
from app.services.precautions import DISCLAIMER, EMERGENCY_TEXT, build_precautions, emergency_triggered
from app.services.seed import ensure_patient_profile, write_audit

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


def _ensure_model_version(db: Session, runtime) -> ModelVersion:
    version = runtime.metadata.get("version", "unknown")
    row = db.query(ModelVersion).filter(ModelVersion.version == version).first()
    if row:
        return row
    db.query(ModelVersion).update({ModelVersion.active: False})
    row = ModelVersion(
        version=version,
        model_name=runtime.metadata.get("model_name", "unknown"),
        metrics=runtime.metadata.get("test_metrics"),
        active=True,
    )
    db.add(row)
    db.flush()
    return row


def serialize_prediction(pred: Prediction, meds: list[MedicationInformation]) -> PredictionResponse:
    version = pred.model_version.version if pred.model_version else "unknown"
    name = pred.model_version.model_name if pred.model_version else "unknown"
    return PredictionResponse(
        id=pred.id,
        health_record_id=pred.health_record_id,
        prediction=pred.prediction,
        probability=float(pred.probability or 0),
        risk_level=pred.risk_level,
        model_version=version,
        model_name=name,
        explanation=pred.explanation or [],
        precautions=[{"category": r.category, "recommendation": r.recommendation} for r in pred.recommendations],
        medication_information=[
            {
                "id": m.id,
                "medication_name": m.medication_name,
                "purpose": m.purpose,
                "warnings": m.warnings,
                "source": m.source,
                "condition": m.condition,
            }
            for m in meds
        ],
        emergency_warning=pred.emergency_warning,
        emergency_message=EMERGENCY_TEXT if pred.emergency_warning else None,
        disclaimer=DISCLAIMER,
        created_at=pred.created_at.isoformat() if pred.created_at else "",
    )


@router.post("", response_model=PredictionResponse)
def create_prediction(
    body: AssessmentRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PredictionResponse:
    if user.role != UserRole.PATIENT.value:
        raise HTTPException(status_code=403, detail="Only patient accounts can submit this assessment form")
    try:
        runtime = get_runtime()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    profile = ensure_patient_profile(db, user)
    symptoms = body.emergency_symptoms.model_dump() if body.emergency_symptoms else {}
    features = body.model_dump(exclude={"emergency_symptoms"})
    result = predict_features(runtime, features)
    warning = emergency_triggered(symptoms)

    record = HealthRecord(patient_id=profile.id, emergency_symptoms=symptoms or None, **features)
    db.add(record)
    db.flush()
    model_version = _ensure_model_version(db, runtime)
    pred = Prediction(
        patient_id=profile.id,
        health_record_id=record.id,
        model_version_id=model_version.id,
        prediction=result["prediction"],
        probability=result["probability"],
        risk_level=result["risk_level"],
        explanation=result["explanation"],
        emergency_warning=warning,
    )
    db.add(pred)
    db.flush()
    for item in build_precautions(features, result["risk_level"]):
        db.add(Recommendation(prediction_id=pred.id, category=item["category"], recommendation=item["recommendation"]))
    write_audit(db, "prediction_created", user.id, {"prediction_id": pred.id, "risk_level": result["risk_level"]})
    db.commit()
    db.refresh(pred)
    meds = db.query(MedicationInformation).order_by(MedicationInformation.medication_name).all()
    return serialize_prediction(pred, meds)


def _can_view(db: Session, user: User, pred: Prediction) -> bool:
    if user.role == UserRole.ADMIN.value:
        return True
    if user.role == UserRole.PATIENT.value:
        return bool(user.patient_profile and pred.patient_id == user.patient_profile.id)
    if user.role == UserRole.DOCTOR.value:
        patient = db.get(PatientProfile, pred.patient_id)
        if not patient:
            return False
        return (
            db.query(DoctorPatientAssignment)
            .filter(
                DoctorPatientAssignment.doctor_id == user.id,
                DoctorPatientAssignment.patient_user_id == patient.user_id,
            )
            .first()
            is not None
        )
    return False


@router.get("/history")
def history(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    patient_id: Optional[int] = None,
) -> dict:
    query = db.query(Prediction).order_by(Prediction.created_at.desc())
    if user.role == UserRole.PATIENT.value:
        profile = ensure_patient_profile(db, user)
        query = query.filter(Prediction.patient_id == profile.id)
    elif user.role == UserRole.DOCTOR.value:
        assigned = (
            db.query(DoctorPatientAssignment.patient_user_id)
            .filter(DoctorPatientAssignment.doctor_id == user.id)
            .subquery()
        )
        profiles = db.query(PatientProfile.id).filter(PatientProfile.user_id.in_(assigned))
        query = query.filter(Prediction.patient_id.in_(profiles))
        if patient_id:
            query = query.filter(Prediction.patient_id == patient_id)
    elif user.role == UserRole.ADMIN.value:
        if patient_id:
            query = query.filter(Prediction.patient_id == patient_id)
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    rows = query.limit(100).all()
    return {
        "items": [
            {
                "id": row.id,
                "created_at": row.created_at.isoformat() if row.created_at else "",
                "prediction": row.prediction,
                "probability": row.probability,
                "risk_level": row.risk_level,
                "model_version": row.model_version.version if row.model_version else None,
                "age": row.health_record.age if row.health_record else None,
                "resting_bp": row.health_record.resting_bp if row.health_record else None,
                "cholesterol": row.health_record.cholesterol if row.health_record else None,
                "max_heart_rate": row.health_record.max_heart_rate if row.health_record else None,
            }
            for row in rows
        ]
    }


@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction(
    prediction_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PredictionResponse:
    pred = db.get(Prediction, prediction_id)
    if pred is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    if not _can_view(db, user, pred):
        raise HTTPException(status_code=403, detail="Not authorized for this record")
    meds = db.query(MedicationInformation).order_by(MedicationInformation.medication_name).all()
    return serialize_prediction(pred, meds)
