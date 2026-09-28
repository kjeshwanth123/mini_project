from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import AuditLog, DoctorPatientAssignment, ModelVersion, Prediction, User, UserRole
from app.security.deps import require_roles
from app.security.passwords import hash_password
from app.services.ml_runtime import get_runtime
from app.services.seed import ensure_patient_profile, write_audit

router = APIRouter(prefix="/api/admin", tags=["admin"])


class CreateUserBody(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(pattern="^(patient|doctor|admin)$")


class AssignmentBody(BaseModel):
    doctor_id: int
    patient_user_id: int


@router.get("/stats")
def stats(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_roles(UserRole.ADMIN.value))],
) -> dict:
    users = db.query(User).count()
    patients = db.query(User).filter(User.role == UserRole.PATIENT.value).count()
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR.value).count()
    assessments = db.query(Prediction).count()
    model_row = db.query(ModelVersion).filter(ModelVersion.active == True).first()  # noqa: E712
    metrics = None
    try:
        metrics = get_runtime().metadata.get("test_metrics")
    except FileNotFoundError:
        metrics = model_row.metrics if model_row else None
    return {
        "total_users": users,
        "total_patients": patients,
        "total_doctors": doctors,
        "total_assessments": assessments,
        "active_model": model_row.model_name if model_row else None,
        "model_version": model_row.version if model_row else None,
        "model_metrics": metrics,
    }


@router.get("/users")
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_roles(UserRole.ADMIN.value))],
) -> dict:
    rows = db.query(User).order_by(User.id).all()
    return {
        "items": [
            {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "is_active": u.is_active}
            for u in rows
        ]
    }


@router.post("/users")
def create_user(
    body: CreateUserBody,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN.value))],
) -> dict:
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password), role=body.role)
    db.add(user)
    db.flush()
    if body.role == UserRole.PATIENT.value:
        ensure_patient_profile(db, user)
    write_audit(db, "admin_create_user", admin.id, {"email": email, "role": body.role})
    db.commit()
    return {"id": user.id, "email": user.email, "role": user.role}


@router.post("/assignments")
def assign_patient(
    body: AssignmentBody,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN.value))],
) -> dict:
    doctor = db.get(User, body.doctor_id)
    patient = db.get(User, body.patient_user_id)
    if doctor is None or doctor.role != UserRole.DOCTOR.value:
        raise HTTPException(status_code=400, detail="doctor_id must be a doctor user")
    if patient is None or patient.role != UserRole.PATIENT.value:
        raise HTTPException(status_code=400, detail="patient_user_id must be a patient user")
    existing = (
        db.query(DoctorPatientAssignment)
        .filter(
            DoctorPatientAssignment.doctor_id == doctor.id,
            DoctorPatientAssignment.patient_user_id == patient.id,
        )
        .first()
    )
    if existing:
        return {"id": existing.id, "status": "already_assigned"}
    link = DoctorPatientAssignment(doctor_id=doctor.id, patient_user_id=patient.id)
    db.add(link)
    write_audit(db, "assign_patient", admin.id, {"doctor_id": doctor.id, "patient_user_id": patient.id})
    db.commit()
    db.refresh(link)
    return {"id": link.id, "status": "assigned"}


@router.get("/audit-logs")
def audit_logs(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_roles(UserRole.ADMIN.value))],
) -> dict:
    rows = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200).all()
    return {
        "items": [
            {
                "id": row.id,
                "user_id": row.user_id,
                "action": row.action,
                "timestamp": row.timestamp.isoformat() if row.timestamp else "",
                "details": row.details,
            }
            for row in rows
        ]
    }
