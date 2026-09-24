from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import MedicationInformation
from app.security.deps import get_current_user

router = APIRouter(prefix="/api/medications", tags=["medications"])


@router.get("")
def list_medications(
    db: Annotated[Session, Depends(get_db)],
    _user=Depends(get_current_user),
) -> dict:
    rows = db.query(MedicationInformation).order_by(MedicationInformation.medication_name).all()
    return {
        "disclaimer": (
            "Educational information only. This module does not prescribe medication, "
            "calculate doses, or tell you to start or stop any drug. Consult a qualified clinician."
        ),
        "items": [
            {
                "id": row.id,
                "condition": row.condition,
                "medication_name": row.medication_name,
                "purpose": row.purpose,
                "general_information": row.general_information,
                "warnings": row.warnings,
                "source": row.source,
            }
            for row in rows
        ],
    }
