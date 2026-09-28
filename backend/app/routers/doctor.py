from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import DoctorNote, DoctorPatientAssignment, PatientProfile, Prediction, User, UserRole
from app.security.deps import require_roles

router = APIRouter(prefix="/api/doctor", tags=["doctor"])


class NoteBody(BaseModel):
    note: str = Field(min_length=3, max_length=4000)


def _assigned_profile(db: Session, doctor: User, patient_user_id: int) -> PatientProfile:
    link = (
        db.query(DoctorPatientAssignment)
        .filter(
            DoctorPatientAssignment.doctor_id == doctor.id,
            DoctorPatientAssignment.patient_user_id == patient_user_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=403, detail="This patient is not assigned to you")
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return profile


@router.get("/patients")
def list_patients(
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_roles(UserRole.DOCTOR.value))],
) -> dict:
    links = db.query(DoctorPatientAssignment).filter(DoctorPatientAssignment.doctor_id == doctor.id).all()
    items = []
    for link in links:
        patient = db.get(User, link.patient_user_id)
        if not patient:
            continue
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient.id).first()
        latest = None
        if profile:
            latest = (
                db.query(Prediction)
                .filter(Prediction.patient_id == profile.id)
                .order_by(Prediction.created_at.desc())
                .first()
            )
        items.append(
            {
                "user_id": patient.id,
                "name": patient.name,
                "email": patient.email,
                "patient_profile_id": profile.id if profile else None,
                "latest_risk": latest.risk_level if latest else None,
            }
        )
    return {"items": items}


@router.get("/patients/{patient_user_id}")
def patient_detail(
    patient_user_id: int,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_roles(UserRole.DOCTOR.value))],
) -> dict:
    profile = _assigned_profile(db, doctor, patient_user_id)
    patient = db.get(User, patient_user_id)
    preds = (
        db.query(Prediction)
        .filter(Prediction.patient_id == profile.id)
        .order_by(Prediction.created_at.desc())
        .all()
    )
    notes = (
        db.query(DoctorNote)
        .filter(DoctorNote.patient_id == profile.id)
        .order_by(DoctorNote.created_at.desc())
        .all()
    )
    return {
        "user": {"id": patient.id, "name": patient.name, "email": patient.email},
        "predictions": [
            {
                "id": p.id,
                "created_at": p.created_at.isoformat() if p.created_at else "",
                "risk_level": p.risk_level,
                "probability": p.probability,
                "prediction": p.prediction,
            }
            for p in preds
        ],
        "notes": [
            {"id": n.id, "note": n.note, "created_at": n.created_at.isoformat() if n.created_at else ""}
            for n in notes
        ],
    }


@router.post("/patients/{patient_user_id}/notes")
def add_note(
    patient_user_id: int,
    body: NoteBody,
    db: Annotated[Session, Depends(get_db)],
    doctor: Annotated[User, Depends(require_roles(UserRole.DOCTOR.value))],
) -> dict:
    profile = _assigned_profile(db, doctor, patient_user_id)
    note = DoctorNote(patient_id=profile.id, doctor_id=doctor.id, note=body.note.strip())
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "note": note.note, "created_at": note.created_at.isoformat() if note.created_at else ""}
