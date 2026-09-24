from collections import defaultdict
from time import time
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.entities import User
from app.security.jwt import decode_access_token

bearer = HTTPBearer(auto_error=False)
_failed_logins: dict[str, list[float]] = defaultdict(list)


def record_failed_login(email: str) -> None:
    _failed_logins[email.lower()].append(time())


def clear_failed_logins(email: str) -> None:
    _failed_logins.pop(email.lower(), None)


def is_login_locked(email: str) -> bool:
    settings = get_settings()
    window = 15 * 60
    now = time()
    attempts = [t for t in _failed_logins[email.lower()] if now - t < window]
    _failed_logins[email.lower()] = attempts
    return len(attempts) >= settings.max_login_attempts


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_access_token(creds.credentials)
        email = payload.get("sub")
        if not email:
            raise ValueError("missing subject")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: str):
    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker
