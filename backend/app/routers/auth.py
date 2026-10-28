from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.entities import User, UserRole
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from app.security.deps import (
    clear_failed_logins,
    get_current_user,
    is_login_locked,
    record_failed_login,
)
from app.security.jwt import create_access_token, create_refresh_token, decode_refresh_token
from app.security.passwords import hash_password, verify_password
from app.services.seed import ensure_patient_profile, write_audit

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    settings = get_settings()
    if len(body.password) < settings.password_min_length:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {settings.password_min_length} characters",
        )
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    # Map requested role
    role_val = UserRole.PATIENT.value
    if body.role:
        norm_role = body.role.lower()
        if norm_role == "doctor":
            role_val = UserRole.DOCTOR.value
        elif norm_role == "admin":
            role_val = UserRole.ADMIN.value

    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=hash_password(body.password),
        role=role_val,
    )
    db.add(user)
    db.flush()
    if role_val == UserRole.PATIENT.value:
        ensure_patient_profile(db, user)
    write_audit(db, "register", user.id, {"email": email, "role": role_val})
    db.commit()

    access_token = create_access_token(user.email, user.role)
    refresh_token = create_refresh_token(user.email, user.role)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        name=user.name,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    email = body.email.lower()
    if is_login_locked(email):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 15 minutes.")
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(body.password, user.password_hash) or not user.is_active:
        record_failed_login(email)
        write_audit(db, "login_failed", user.id if user else None, {"email": email})
        db.commit()
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    clear_failed_logins(email)
    write_audit(db, "login", user.id, {"email": email})
    db.commit()

    access_token = create_access_token(user.email, user.role)
    refresh_token = create_refresh_token(user.email, user.role)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        name=user.name,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshTokenRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    try:
        payload = decode_refresh_token(body.refresh_token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid refresh token: {exc}") from exc

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User account not found or inactive")

    new_access = create_access_token(user.email, user.role)
    new_refresh = create_refresh_token(user.email, user.role)
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        role=user.role,
        name=user.name,
    )


@router.get("/me", response_model=MeResponse)
def me(user: Annotated[User, Depends(get_current_user)]) -> MeResponse:
    profile_id = user.patient_profile.id if user.patient_profile else None
    return MeResponse(user=UserPublic.model_validate(user), patient_profile_id=profile_id)
