from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import HealthRecord, User, UserRole
from app.security.deps import get_current_user
from app.services.seed import ensure_patient_profile

router = APIRouter(prefix="/api/health-records", tags=["health-records"])


@router.get("")
def list_records(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if user.role != UserRole.PATIENT.value:
        raise HTTPException(status_code=403, detail="Patients can list their own health records here")
    profile = ensure_patient_profile(db, user)
    rows = (
        db.query(HealthRecord)
        .filter(HealthRecord.patient_id == profile.id)
        .order_by(HealthRecord.created_at.desc())
        .all()
    )
    return {
        "items": [
            {
                "id": row.id,
                "created_at": row.created_at.isoformat() if row.created_at else "",
                "age": row.age,
                "sex": row.sex,
                "chest_pain_type": row.chest_pain_type,
                "resting_bp": row.resting_bp,
                "cholesterol": row.cholesterol,
                "fasting_blood_sugar": row.fasting_blood_sugar,
                "resting_ecg": row.resting_ecg,
                "max_heart_rate": row.max_heart_rate,
                "exercise_angina": row.exercise_angina,
                "oldpeak": row.oldpeak,
                "st_slope": row.st_slope,
            }
            for row in rows
        ]
    }


@router.get("/{record_id}")
def get_record(
    record_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    row = db.get(HealthRecord, record_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Health record not found")
    if user.role == UserRole.PATIENT.value:
        profile = ensure_patient_profile(db, user)
        if row.patient_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized for this record")
    elif user.role not in (UserRole.ADMIN.value, UserRole.DOCTOR.value):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return {
        "id": row.id,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "age": row.age,
        "sex": row.sex,
        "chest_pain_type": row.chest_pain_type,
        "resting_bp": row.resting_bp,
        "cholesterol": row.cholesterol,
        "fasting_blood_sugar": row.fasting_blood_sugar,
        "resting_ecg": row.resting_ecg,
        "max_heart_rate": row.max_heart_rate,
        "exercise_angina": row.exercise_angina,
        "oldpeak": row.oldpeak,
        "st_slope": row.st_slope,
        "emergency_symptoms": row.emergency_symptoms,
    }
