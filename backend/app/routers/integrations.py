from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.integrations.ehr_fhir import WearableTelemetrySync, convert_prediction_to_fhir
from app.integrations.notifications import NotificationPayload, dispatch_notification
from app.models.entities import Prediction, User
from app.security.deps import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("/fhir/predictions/{prediction_id}")
def export_fhir_risk_assessment(
    prediction_id: int,
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    pred = db.get(Prediction, prediction_id)
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction record not found")

    return convert_prediction_to_fhir(
        prediction_id=pred.id,
        patient_id=pred.patient_id,
        probability=float(pred.probability or 0),
        risk_level=pred.risk_level,
    )


@router.post("/wearables/sync")
def sync_wearable_telemetry(
    payload: WearableTelemetrySync,
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    return {
        "status": "synchronized",
        "user_id": user.id,
        "device_id": payload.device_id,
        "device_type": payload.device_type,
        "metrics_received": {
            "heart_rate_bpm": payload.heart_rate_bpm,
            "resting_heart_rate": payload.resting_heart_rate,
            "blood_pressure": f"{payload.blood_pressure_systolic}/{payload.blood_pressure_diastolic}" if payload.blood_pressure_systolic else None,
            "ecg_rhythm": payload.ecg_rhythm_classification,
        },
    }


@router.post("/notify")
def send_notification_endpoint(
    payload: NotificationPayload,
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    return dispatch_notification(payload)
