"""Authentication / authorization helpers.

Pure, dependency-light functions extracted from main.py so they can be unit
tested without importing the full FastAPI app (which pulls in Pillow, the Gemini
SDK and the database layer at import time). Behavior here is intended to be
identical to the original inline implementations in main.py.
"""
from datetime import datetime, timedelta
from typing import Optional
import os

from jose import JWTError, jwt
from passlib.context import CryptContext

# =====================
# Configuration
# =====================
SECRET_KEY = os.environ.get("PIETRACKER_SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing context.
# Using pbkdf2_sha256 to avoid bcrypt Windows backend issues & 72-byte truncation.
# If you later prefer bcrypt, change schemes=["bcrypt"].
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(password, hashed)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def resolve_user_id(x_user_id: Optional[str], authorization: Optional[str]) -> str:
    """Resolve user id from JWT if provided, else from X-User-Id header, else public anon.

    Prefers the verified JWT subject so an authenticated client cannot spoof a
    different user's id via the X-User-Id header.
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            sub = payload.get("sub")
            if isinstance(sub, str) and sub.strip():
                return sub.strip()
        except JWTError:
            # fall back to header/public if token invalid
            pass
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()
    return "public-anon-user"


def is_admin_user(user: dict) -> bool:
    """Check if user has admin privileges."""
    return (user.get("role") == "admin" or
            user.get("role") == "super_admin" or
            user.get("email") == "admin@pietracker.com" or
            user.get("id") == "admin-super-user")


def prepare_user_for_output(user: dict) -> dict:
    """Convert user data to format suitable for the UserOut model."""
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else str(user["created_at"])
    }
