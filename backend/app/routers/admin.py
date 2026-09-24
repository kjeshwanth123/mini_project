from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Prediction, User, UserRole
from app.security.deps import require_roles

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def stats(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_roles(UserRole.ADMIN.value))],
) -> dict:
    users = db.query(User).count()
    patients = db.query(User).filter(User.role == UserRole.PATIENT.value).count()
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR.value).count()
    assessments = db.query(Prediction).count()
    return {
        "total_users": users,
        "total_patients": patients,
        "total_doctors": doctors,
        "total_assessments": assessments,
        "note": "Prediction metrics appear after a model is trained (NOT IMPLEMENTED YET if zero).",
    }
