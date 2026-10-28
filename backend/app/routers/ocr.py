from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.models.entities import User
from app.security.deps import get_current_user
from app.services.ocr import analyze_medical_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["ocr_reports"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class OcrExtractionResponse(BaseModel):
    filename: str
    file_size: int
    text_length: int
    extracted_features: dict[str, int | float]
    confidence: dict[str, float]
    flags: list[str]
    summary: str
    raw_text_snippet: str


@router.post("/ocr-extract", response_model=OcrExtractionResponse)
async def extract_report_parameters(
    file: Annotated[UploadFile, File(description="Medical report in PDF, PNG, JPG, or JPEG format")],
    current_user: Annotated[User, Depends(get_current_user)],
) -> OcrExtractionResponse:
    filename = file.filename or "uploaded_report"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum permitted limit of 10 MB.")

    try:
        result = analyze_medical_report(content, filename)
        return OcrExtractionResponse(**result)
    except Exception as exc:
        logger.exception("OCR analysis error for file %s: %s", filename, exc)
        raise HTTPException(status_code=500, detail=f"Failed to process medical report: {exc}") from exc
