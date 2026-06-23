"""Authentication / authorization helpers.

Pure, dependency-light functions extracted from main.py so they can be unit
tested without importing the full FastAPI app (which pulls in Pillow, the Gemini
SDK and the database layer at import time). Behavior here is intended to be
identical to the original inline implementations in main.py.
"""
from datetime import datetime, timedelta
from typing import Optional
import os

from jose import jwt
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


def is_admin_user(user: dict) -> bool:
    """Check if user has admin privileges."""
    return user.get("role") in {"admin", "super_admin"}


def prepare_user_for_output(user: dict) -> dict:
    """Convert user data to format suitable for the UserOut model."""
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else str(user["created_at"]),
        "role": user.get("role", "user")
    }
