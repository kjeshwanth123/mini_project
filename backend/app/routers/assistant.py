from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.security.deps import get_current_user
from app.services.assistant import answer_health_question

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class ChatBody(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


@router.post("/chat")
def chat(body: ChatBody, _user: Annotated[object, Depends(get_current_user)]) -> dict:
    return answer_health_question(body.message)
