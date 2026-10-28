from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.security.deps import get_current_user
from app.services.assistant import answer_health_question

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class ChatBody(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    patient_context: Optional[dict[str, Any]] = None
    report_text: Optional[str] = None


@router.post("/chat")
def chat(body: ChatBody, _user: Annotated[object, Depends(get_current_user)]) -> dict:
    return answer_health_question(
        message=body.message,
        patient_context=body.patient_context,
        report_text=body.report_text,
    )
