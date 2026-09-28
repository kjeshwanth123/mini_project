from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.models.entities import User, UserRole
from app.security.deps import require_roles
from app.services.ml_runtime import get_runtime

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("/info")
def model_info(_admin: Annotated[User, Depends(require_roles(UserRole.ADMIN.value))]) -> dict:
    try:
        runtime = get_runtime()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "model_name": runtime.metadata.get("model_name"),
        "version": runtime.metadata.get("version"),
        "trained_at": runtime.metadata.get("trained_at"),
        "n_rows": runtime.metadata.get("n_rows"),
        "test_metrics": runtime.metadata.get("test_metrics"),
        "comparison": runtime.metadata.get("comparison"),
        "disclaimer": runtime.metadata.get("disclaimer"),
        "features": runtime.metadata.get("features"),
    }
