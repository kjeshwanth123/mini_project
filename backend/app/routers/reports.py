from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import PatientProfile, Prediction, User, UserRole
from app.routers.predictions import _can_view
from app.security.deps import get_current_user
from app.services.reports import write_prediction_pdf
from app.services.seed import write_audit

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{prediction_id}")
def download_report(
    prediction_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    pred = db.get(Prediction, prediction_id)
    if pred is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    if not _can_view(db, user, pred):
        raise HTTPException(status_code=403, detail="Not authorized for this report")
    patient = db.get(PatientProfile, pred.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient profile missing")
    path = write_prediction_pdf(pred, patient)
    write_audit(db, "report_downloaded", user.id, {"prediction_id": prediction_id})
    db.commit()
    return FileResponse(path, media_type="application/pdf", filename=path.name)
