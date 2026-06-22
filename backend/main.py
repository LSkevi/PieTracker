from fastapi import FastAPI, HTTPException, Header, Depends, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Dict, Optional
from datetime import datetime, date, timedelta
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
import json
import os
import shutil
import tempfile
import uuid
import logging
import base64
import io
from PIL import Image
import google.generativeai as genai

from security import (
    SECRET_KEY,
    ALGORITHM,
    hash_password,
    verify_password,
    create_access_token,
    resolve_user_id,
    is_admin_user,
    prepare_user_for_output,
)
from parsing import parse_ocr_json, summarize_expenses

# Set up logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load .env file if it exists
    logger.info("Environment variables loaded from .env file")
except ImportError:
    logger.info("python-dotenv not installed, using system environment variables")

# Try to import database service
try:
    from simple_db import db_service
    if db_service and db_service.use_db:
        logger.info("✅ Database service initialized - PostgreSQL mode")
    else:
        logger.warning("⚠️  DATABASE_URL not configured - database features unavailable")
        logger.info("To enable database mode, set DATABASE_URL environment variable")
except ImportError as e:
    logger.error(f"❌ Database service import failed: {e}")
    db_service = None

# In-memory password reset token store (token -> {user_id, exp})
PASSWORD_RESET_TOKENS: Dict[str, Dict[str, str]] = {}

app = FastAPI(title="PieTracker - Elegant Finance App")

# Auth configuration (SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES) and the
# password hashing context are defined in security.py. main.py imports the subset
# it uses directly (SECRET_KEY/ALGORITHM for jwt.decode) above.

# =====================
# Gemini AI Configuration
# =====================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("✅ Gemini AI configured for OCR functionality")
else:
    logger.warning("⚠️  GEMINI_API_KEY not configured - OCR features unavailable")

# Password hashing lives in security.py (hash_password/verify_password, imported above).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Users are now stored only in database - no in-memory storage
# Keeping empty users_db for admin functions compatibility (will be removed later)
users_db: Dict[str, Dict[str, str]] = {}

# All user data operations now use database only

BACKUP_DIR = "backups"
os.makedirs(BACKUP_DIR, exist_ok=True)
BACKUP_RETENTION = 20  # keep last N backups per file

def _rotate_backups(original_path: str):
    """Ensure only the most recent BACKUP_RETENTION backups are kept for a given file base name."""
    base = os.path.basename(original_path)
    prefix = base + "."
    backups = [f for f in os.listdir(BACKUP_DIR) if f.startswith(prefix)]
    # Sort newest first (timestamp is part of filename, we used ISO so lexical works)
    backups.sort(reverse=True)
    for old in backups[BACKUP_RETENTION:]:
        try:
            os.remove(os.path.join(BACKUP_DIR, old))
        except Exception:
            pass

def _safe_write_json(path: str, data):
    """Atomically write JSON with simple timestamped backup of previous version.
    This reduces the risk of data loss from partial writes or accidental overwrites."""
    try:
        if os.path.exists(path):
            # Backup current file before overwrite
            ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S')
            backup_name = f"{os.path.basename(path)}.{ts}.bak"
            shutil.copy2(path, os.path.join(BACKUP_DIR, backup_name))
            _rotate_backups(path)
        # Write to temp then replace
        dir_name = os.path.dirname(path) or "."
        fd, tmp_path = tempfile.mkstemp(dir=dir_name, prefix="._tmp_", suffix=".json")
        try:
            with os.fdopen(fd, 'w') as tmp_f:
                json.dump(data, tmp_f, indent=2)
            os.replace(tmp_path, path)  # atomic on same filesystem
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
    except Exception as e:
        print(f"[WARN] Failed safe write for {path}: {e}")

# All user operations now use database only - no separate save function needed

# All data loading removed - database is the single source of truth

# Remove legacy migration since everything is now database-only

# hash_password, verify_password and create_access_token are defined in
# security.py and imported above.

def get_user_by_email(email: str) -> Optional[Dict[str, str]]:
    """Get user by email from database"""
    email_l = email.lower().strip()
    if db_service and db_service.use_db:
        return db_service.get_user_by_email(email_l)
    return None

def get_user_by_username(username: str) -> Optional[Dict[str, str]]:
    """Get user by username from database"""
    username_l = username.lower().strip()
    if db_service and db_service.use_db:
        return db_service.get_user_by_username(username_l)
    return None

def authenticate_user(username: str, password: str) -> Optional[Dict[str, str]]:
    # Try to find user by email first, then by username
    user = get_user_by_email(username)
    if not user:
        user = get_user_by_username(username)
    
    if not user:
        return None
    
    password_hash = user.get("password_hash", "")
    if not password_hash:
        return None
        
    if not verify_password(password, password_hash):
        return None
    return user

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")  # subject is the user id
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get user from database instead of users_db
    user = None
    if db_service and db_service.use_db:
        user = db_service.get_user_by_id(user_id)
    
    if user is None:
        raise credentials_exception
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    return user

# CORS — allowed origins are configurable via the ALLOWED_ORIGINS env var
# (comma-separated). Defaults to local dev origins; set it to the deployed
# frontend URL(s) in production.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]
_allow_all_origins = ALLOWED_ORIGINS == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Credentialed requests cannot use a wildcard origin, so only enable
    # credentials when origins are explicitly listed.
    allow_credentials=not _allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint for deployment monitoring
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "PieTracker API is running"}

# Database status endpoint for testing
@app.get("/db-status")
async def database_status():
    db_connected = db_service and db_service.use_db
    return {
        "database_connected": db_connected,
        "storage_type": "PostgreSQL" if db_connected else "File Storage",
        "message": "Database connection successful" if db_connected else "Using file storage fallback"
    }

@app.get("/")
async def root():
    db_status = "connected" if (db_service and db_service.use_db) else "not_configured"
    return {
        "message": "Welcome to PieTracker API", 
        "docs": "/docs",
        "database_status": db_status,
        "database_required": True,
        "setup_help": "Set DATABASE_URL environment variable to enable database features" if db_status == "not_configured" else None
    }

@app.get("/health")
async def health_check():
    """Health check endpoint with detailed database status"""
    db_available = db_service is not None
    db_configured = db_service.use_db if db_available else False
    
    # Test database connection if available
    db_connection_ok = False
    if db_available and db_configured:
        try:
            session = db_service.get_session()
            if session:
                session.close()
                db_connection_ok = True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
    
    return {
        "status": "ok" if (db_available and db_configured and db_connection_ok) else "degraded",
        "database": {
            "service_available": db_available,
            "configured": db_configured,
            "connection_ok": db_connection_ok,
            "url_set": bool(os.environ.get("DATABASE_URL"))
        },
        "message": "All systems operational" if (db_available and db_configured and db_connection_ok) else "Database configuration required"
    }

# In-memory storage removed - all data now stored in database only
# All data operations will use the database service exclusively

# All data loading removed - database is the single source of truth

# All migration removed - database is the single source of truth

DEFAULT_CATEGORIES = ["Food", "Transportation", "Shopping", "Entertainment"]

def get_user_id(
    x_user_id: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None)
) -> str:
    """FastAPI dependency wrapping security.resolve_user_id.

    Resolve user id from JWT if provided, else from X-User-Id header, else public
    anon. This prevents a client from spoofing a different user's id via header
    when authenticated."""
    return resolve_user_id(x_user_id, authorization)

# Database-only category functions
def get_user_custom_categories(user_id: str) -> Dict[str, str]:
    """Get user's custom categories from database"""
    if db_service and db_service.use_db:
        return db_service.get_user_categories(user_id)
    return {}

def set_user_category(user_id: str, name: str, color: str):
    """Add/update a user category in database"""
    if db_service and db_service.use_db:
        db_service.add_user_category(user_id, name, color)

def delete_user_category(user_id: str, name: str):
    """Delete a user category from database"""
    if db_service and db_service.use_db:
        db_service.delete_user_category(user_id, name)

@app.get("/")
async def root():
    return {"message": "Welcome to PieTracker!"}

@app.get("/expenses")
async def get_expenses(user_id: str = Depends(get_user_id)):
    """Get all expenses for user from database"""
    if db_service and db_service.use_db:
        return db_service.get_user_expenses(user_id)
    return []

@app.get("/expenses/month/{year}/{month}")
async def get_expenses_by_month(year: int, month: int, user_id: str = Depends(get_user_id)):
    """Get expenses for a specific month from database"""
    month_str = f"{year:04d}-{month:02d}"
    
    if db_service and db_service.use_db:
        db_expenses = db_service.get_user_expenses(user_id)
        return [
            expense for expense in db_expenses
            if expense["date"].startswith(month_str)
        ]
    return []

@app.get("/expenses/year/{year}")
async def get_expenses_by_year(year: int, user_id: str = Depends(get_user_id)):
    """Get all expenses for a specific year from database"""
    year_str = f"{year:04d}"
    
    if db_service and db_service.use_db:
        db_expenses = db_service.get_user_expenses(user_id)
        return [
            expense for expense in db_expenses
            if expense["date"].startswith(year_str)
        ]
    return []

@app.get("/expenses/summary/{year}/{month}")
async def get_monthly_summary(year: int, month: int, user_id: str = Depends(get_user_id)):
    """Get monthly expense summary from database"""
    month_str = f"{year:04d}-{month:02d}"
    
    if db_service and db_service.use_db:
        db_expenses = db_service.get_user_expenses(user_id)
        monthly_expenses = [
            expense for expense in db_expenses
            if expense["date"].startswith(month_str)
        ]
    else:
        monthly_expenses = []

    return summarize_expenses(monthly_expenses, year, month)

@app.post("/expenses")
async def create_expense(expense: dict, user_id: str = Depends(get_user_id)):
    """Create new expense in database"""
    import uuid
    new_expense = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "amount": float(expense["amount"]),
        "category": expense["category"],
        "description": expense["description"],
        "date": expense["date"],
        "currency": expense.get("currency", "CAD"),
        "created_at": datetime.now().isoformat()
    }
    
    # Save to database only
    if db_service and db_service.use_db:
        db_service.save_expense(new_expense)
        return new_expense
    else:
        raise HTTPException(status_code=500, detail="Database service not available")

@app.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user_id: str = Depends(get_user_id)):
    """Delete expense from database"""
    if db_service and db_service.use_db:
        deleted = db_service.delete_expense(expense_id, user_id)
        if deleted:
            return {"message": "Expense deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Expense not found")
    else:
        raise HTTPException(status_code=500, detail="Database service not available")

@app.get("/expenses/available-months")
async def get_available_months(user_id: str = Depends(get_user_id)):
    """Get all year-month combos for this user's expenses from database."""
    months = set()
    
    if db_service and db_service.use_db:
        db_expenses = db_service.get_user_expenses(user_id)
        for expense in db_expenses:
            parts = expense["date"].split("-")
            if len(parts) >= 2:
                months.add(f"{parts[0]}-{parts[1]}")
    
    result = []
    for ym in sorted(months):
        y, m = ym.split("-")
        result.append({"year": int(y), "month": int(m), "year_month": ym})
    return result

@app.get("/categories")
async def get_categories(user_id: str = Depends(get_user_id)):
    """Get all categories for user from database"""
    # Get used categories from database
    used_categories = set()
    if db_service and db_service.use_db:
        db_expenses = db_service.get_user_expenses(user_id)
        used_categories = {exp["category"] for exp in db_expenses if exp.get("category")}
    
    # Get custom categories from database
    custom_categories = get_user_custom_categories(user_id)
    
    # Get hidden categories list
    hidden_key = "__hidden_categories__"
    hidden_categories = set()
    if hidden_key in custom_categories:
        hidden_list = custom_categories[hidden_key].split(",")
        hidden_categories = {cat.strip() for cat in hidden_list if cat.strip()}
    
    # Remove hidden categories and system keys from custom categories
    custom = set()
    for key, value in custom_categories.items():
        if not key.startswith("__"):  # Skip system keys
            custom.add(key)
    
    # Start with default categories, but remove hidden ones
    visible_defaults = set(DEFAULT_CATEGORIES) - hidden_categories
    
    # Combine all visible categories
    all_categories = sorted(visible_defaults | used_categories | custom)
    return all_categories

@app.post("/categories")
async def add_category(category_data: dict, user_id: str = Depends(get_user_id)):
    name = category_data.get("name", "").strip()
    color = category_data.get("color", "#a8b5a0")
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    existing = await get_categories(user_id)
    if name in existing:
        raise HTTPException(status_code=400, detail=f"Category '{name}' already exists")
    set_user_category(user_id, name, color)
    return {"message": f"Category '{name}' added successfully", "category": name, "color": color}

@app.get("/categories/colors")
async def get_category_colors(user_id: str = Depends(get_user_id)):
    """Get category colors for user from database"""
    return get_user_custom_categories(user_id)

@app.delete("/categories/{category_name}")
async def delete_category(category_name: str, user_id: str = Depends(get_user_id)):
    """Delete a category for user from database"""
    # Get all current categories (default + custom + used)
    all_categories = await get_categories(user_id)
    
    if category_name not in all_categories:
        return {"message": f"Category '{category_name}' not found for user"}
    
    existing_custom = get_user_custom_categories(user_id)
    
    # If it's a default category, mark it as hidden by adding to hidden list
    if category_name in DEFAULT_CATEGORIES:
        # Create or update the hidden categories list
        hidden_key = "__hidden_categories__"
        current_hidden = existing_custom.get(hidden_key, "").split(",") if existing_custom.get(hidden_key) else []
        if category_name not in current_hidden:
            current_hidden.append(category_name)
        set_user_category(user_id, hidden_key, ",".join(current_hidden))
    else:
        # For custom categories, actually delete them
        if category_name in existing_custom:
            delete_user_category(user_id, category_name)
    
    # Delete associated expenses from database
    if db_service and db_service.use_db:
        user_expenses = db_service.get_user_expenses(user_id)
        removed = 0
        for expense in user_expenses:
            if expense.get("category") == category_name:
                db_service.delete_expense(expense["id"], user_id)
                removed += 1
        
        return {"message": f"Category '{category_name}' deleted for user. {removed} associated expenses removed."}
    
    return {"message": f"Category '{category_name}' deleted for user."}

@app.get("/currencies")
async def get_currencies():
    # Supported currencies with their symbols and names
    return [
        {"code": "CAD", "symbol": "CA$", "name": "Canadian Dollar"},
        {"code": "USD", "symbol": "US$", "name": "US Dollar"},
        {"code": "EUR", "symbol": "€", "name": "Euro"},
        {"code": "GBP", "symbol": "£", "name": "British Pound"},
        {"code": "JPY", "symbol": "¥", "name": "Japanese Yen"},
        {"code": "AUD", "symbol": "A$", "name": "Australian Dollar"},
        {"code": "CHF", "symbol": "Fr", "name": "Swiss Franc"},
        {"code": "CNY", "symbol": "¥", "name": "Chinese Yuan"},
        {"code": "INR", "symbol": "₹", "name": "Indian Rupee"},
        {"code": "BRL", "symbol": "R$", "name": "Brazilian Real"}
    ]

# =====================
# AUTH ENDPOINTS
# =====================

class SignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=256)

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=256)

class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    created_at: str

class AuthResponse(BaseModel):
    user: UserOut
    token: str
    message: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=256)

class OCRResponse(BaseModel):
    success: bool
    amount: Optional[float] = None
    date: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    confidence: Optional[str] = None
    error: Optional[str] = None

# prepare_user_for_output is defined in security.py and imported above.

@app.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    """Register new user in database"""
    # Check if database is available
    if not db_service or not db_service.use_db:
        raise HTTPException(
            status_code=503, 
            detail="Database not configured. Please set DATABASE_URL environment variable."
        )
    
    email = req.email.lower().strip()
    username = req.username.lower().strip()
    
    # Check if email already exists
    if get_user_by_email(email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists
    if get_user_by_username(username):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    password = req.password
    if len(password) > 256:
        raise HTTPException(status_code=400, detail="Password must be 256 characters or fewer")
    
    import uuid
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "role": "admin" if email == "admin@pietracker.com" else "user",
        "is_active": True,
        "last_login": None
    }
    
    # Save to database
    try:
        db_service.save_user(user_id, new_user)
    except Exception as e:
        logger.error(f"Failed to save user: {e}")
        raise HTTPException(status_code=500, detail="Database operation failed")
    
    token = create_access_token({"sub": user_id})
    return AuthResponse(
        user=UserOut(**prepare_user_for_output(new_user)),
        token=token,
        message="Signup successful"
    )

@app.post("/auth/login", response_model=AuthResponse)
async def login(credentials: LoginRequest):
    """Login user using database only"""
    # Check if database is available
    if not db_service or not db_service.use_db:
        raise HTTPException(
            status_code=503, 
            detail="Database not configured. Please set DATABASE_URL environment variable."
        )
    
    username = credentials.username.lower().strip()
    password = credentials.password
    if len(password) > 256:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Check if user is active
    user_active = user.get("is_active", True)
    if isinstance(user_active, str):
        user_active = user_active.lower() == "true"
    if not user_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Update last login in database only
    current_time = datetime.utcnow().isoformat() + "Z"
    if db_service and db_service.use_db:
        db_service.update_user(user["id"], {"last_login": current_time})

    token = create_access_token({"sub": user["id"]})
    
    return AuthResponse(
        user=UserOut(**prepare_user_for_output(user)),
        token=token,
        message="Login successful"
    )

@app.post("/auth/logout")
async def logout():
    # Stateless JWT: client just discards token
    return {"message": "Logged out"}

@app.get("/auth/me")
async def me(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        # Get user from database instead of users_db
        user = None
        if db_service and db_service.use_db:
            user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # Normalize: always return username to frontend; support legacy records that only had 'name'
        normalized = {
            "id": user.get("id"),
            "username": user.get("username") or user.get("name"),
            "email": user.get("email"),
            "created_at": user.get("created_at"),
        }
        return {"user": normalized}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Generate a password reset token and (simulate) email sending.
    For security, always return 200 generic message regardless of user existence."""
    email = req.email.lower().strip()
    user = get_user_by_email(email)
    if user:
        token = str(uuid.uuid4())
        expires = (datetime.utcnow() + timedelta(minutes=15)).isoformat() + "Z"
        PASSWORD_RESET_TOKENS[token] = {"user_id": user["id"], "exp": expires}
        # Simulate email by logging token (in production, send an email with link)
        print(f"[Password Reset] Token for {email}: {token}")
    return {"message": "If the email exists, a reset link has been sent."}

@app.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    record = PASSWORD_RESET_TOKENS.get(req.token)
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    # Check expiry
    try:
        exp_dt = datetime.fromisoformat(record["exp"].replace("Z", ""))
        if datetime.utcnow() > exp_dt:
            del PASSWORD_RESET_TOKENS[req.token]
            raise HTTPException(status_code=400, detail="Invalid or expired token")
    except Exception:
        del PASSWORD_RESET_TOKENS[req.token]
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user_id = record["user_id"]
    # Get user from database instead of users_db
    user = None
    if db_service and db_service.use_db:
        user = db_service.get_user_by_id(user_id)
    if not user:
        del PASSWORD_RESET_TOKENS[req.token]
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    if len(req.new_password) > 256:
        raise HTTPException(status_code=400, detail="Password must be 256 characters or fewer")
    
    # Update password in database
    new_password_hash = hash_password(req.new_password)
    if db_service and db_service.use_db:
        db_service.update_user(user_id, {"password_hash": new_password_hash})
    del PASSWORD_RESET_TOKENS[req.token]
    return {"message": "Password reset successful. You may now log in."}

# =====================
# Admin User Management Endpoints
# =====================

# is_admin_user is defined in security.py and imported above.

@app.get("/admin/users", dependencies=[Depends(get_current_user)])
async def list_all_users(current_user: dict = Depends(get_current_user)):
    """List all users - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users_list = []
    
    if db_service and db_service.use_db:
        # Get users from PostgreSQL database
        db_users = db_service.get_all_users()
        for user_id, user in db_users.items():
            expense_count = db_service.get_user_expense_count(user_id)
            users_list.append({
                "id": user_id,
                "email": user.get("email"),
                "username": user.get("username") or user.get("email", "").split("@")[0],
                "password_hash": user.get("password_hash"),  # Include for admin view
                "role": user.get("role", "user"),
                "created_at": user.get("created_at"),
                "last_login": user.get("last_login"),
                "is_active": user.get("is_active", "true") == "true",
                "expense_count": expense_count
            })
    else:
        return {"error": "Database not configured", "users": [], "total": 0}
    
    return {"users": users_list, "total": len(users_list)}

class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

@app.put("/admin/users/{user_id}", dependencies=[Depends(get_current_user)])
async def update_user(user_id: str, update_data: UpdateUserRequest, current_user: dict = Depends(get_current_user)):
    """Update user data - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db_service and db_service.use_db:
        # Use database service
        user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare update data
        update_dict = {}
        
        if update_data.username is not None:
            # Check if username already exists
            new_username = update_data.username.lower().strip()
            if db_service.check_username_exists(new_username, exclude_user_id=user_id):
                raise HTTPException(status_code=400, detail="Username already exists")
            update_dict["username"] = new_username
        
        if update_data.email is not None:
            # Check if email already exists
            new_email = update_data.email.lower().strip()
            if db_service.check_email_exists(new_email, exclude_user_id=user_id):
                raise HTTPException(status_code=400, detail="Email already exists")
            update_dict["email"] = new_email
        
        if update_data.password is not None:
            update_dict["password_hash"] = hash_password(update_data.password)
        
        if update_data.role is not None:
            update_dict["role"] = update_data.role
        
        if update_data.is_active is not None:
            update_dict["is_active"] = str(update_data.is_active).lower()
        
        # Update in database
        if db_service.update_user(user_id, update_dict):
            return {"message": f"User {user.get('username', user['email'])} updated successfully", "user": {**user, **update_dict}}
        else:
            raise HTTPException(status_code=500, detail="Failed to update user")
    else:
        raise HTTPException(status_code=500, detail="Database service not available")

@app.post("/admin/users/{user_id}/deactivate", dependencies=[Depends(get_current_user)])
async def deactivate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Deactivate a user account - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db_service and db_service.use_db:
        # Use database service
        user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if db_service.update_user(user_id, {"is_active": "false"}):
            return {"message": f"User {user['email']} deactivated"}
        else:
            raise HTTPException(status_code=500, detail="Failed to deactivate user")
    else:
        raise HTTPException(status_code=500, detail="Database service not available")

@app.post("/admin/users/{user_id}/activate", dependencies=[Depends(get_current_user)])
async def activate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Activate a user account - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db_service and db_service.use_db:
        # Use database service
        user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if db_service.update_user(user_id, {"is_active": "true"}):
            return {"message": f"User {user['email']} activated"}
        else:
            raise HTTPException(status_code=500, detail="Failed to activate user")
    else:
        raise HTTPException(status_code=500, detail="Database service not available")

@app.delete("/admin/users/{user_id}", dependencies=[Depends(get_current_user)])
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a user account - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db_service and db_service.use_db:
        # Use database service
        user = db_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_email = user.get("email", "Unknown")
        
        # Delete from database
        if db_service.delete_user(user_id):
            return {"message": f"User {user_email} and all associated data deleted"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete user")
    else:
        raise HTTPException(status_code=500, detail="Database service not available")

@app.get("/admin/stats", dependencies=[Depends(get_current_user)])
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get admin statistics - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if db_service and db_service.use_db:
        all_users = db_service.get_all_users()
        total_users = len(all_users)
        active_users = len([u for u in all_users.values() if u.get("is_active") == "true" or u.get("is_active") == True])
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "users_with_expense_data": total_users  # All database users can have expenses
        }
    else:
        raise HTTPException(status_code=500, detail="Database service not available")

# =====================
# Backup & Export Endpoints
# =====================

@app.post("/admin/backup/trigger", dependencies=[Depends(get_current_user)])
async def trigger_backup(current_user: dict = Depends(get_current_user)):
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    # Database operations handled by individual update calls
    # Note: Backup now handled by database system, not file-based
    return {"message": "Database backup should be handled at infrastructure level"}

@app.get("/admin/backup/list", dependencies=[Depends(get_current_user)])
async def list_backups(current_user: dict = Depends(get_current_user)):
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "message": "Database backup should be configured at infrastructure level",
        "recommendation": "Use pg_dump for PostgreSQL backups or Render's backup features",
        "note": "File-based backups no longer available - all data now in database"
    }

@app.get("/admin/backup/download", dependencies=[Depends(get_current_user)])
async def download_backup(name: str, current_user: dict = Depends(get_current_user)):
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    path = os.path.join(BACKUP_DIR, name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Backup not found")
    def iterfile():
        with open(path, 'rb') as f:
            yield from f
    return StreamingResponse(iterfile(), media_type='application/json', headers={'Content-Disposition': f'attachment; filename={name}'})

@app.get("/export/expenses", dependencies=[Depends(get_current_user)])
async def export_expenses(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    if db_service and db_service.use_db:
        data = db_service.get_user_expenses(user_id)
    else:
        data = []
    return JSONResponse(content=data)

# =====================
# OCR Receipt Processing
# =====================

@app.get("/ocr/test")
async def test_ocr_system():
    """Test endpoint to verify OCR system is ready"""
    try:
        # Test Gemini configuration
        if not GEMINI_API_KEY:
            return {"status": "error", "message": "Gemini API key not configured"}
        
        # Test if we can create the model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        return {
            "status": "ready", 
            "message": "OCR system is configured and ready",
            "gemini_configured": True,
            "model": "gemini-2.5-flash"
        }
    except Exception as e:
        return {"status": "error", "message": f"OCR system error: {str(e)}"}

@app.post("/ocr/receipt", response_model=OCRResponse, dependencies=[Depends(get_current_user)])
async def process_receipt(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Process a receipt image using Gemini Flash API to extract expense data.
    Supports French and English receipts.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            return OCRResponse(
                success=False,
                error="Please upload a valid image file (PNG, JPG, JPEG, WEBP)"
            )
        
        # Read and validate image
        image_data = await file.read()
        if len(image_data) > 10 * 1024 * 1024:  # 10MB limit
            return OCRResponse(
                success=False,
                error="Image file too large. Please use an image smaller than 10MB."
            )
        
        try:
            # Open and validate image with PIL
            image = Image.open(io.BytesIO(image_data))
            
            # Handle all possible image formats including JFIF
            if image.format not in ['JPEG', 'PNG', 'WEBP', 'TIFF', 'BMP']:
                # Try to convert unsupported formats
                if image.mode != 'RGB':
                    image = image.convert('RGB')
            else:
                # Convert to RGB if needed for better processing
                if image.mode in ('RGBA', 'LA', 'P', 'CMYK'):
                    image = image.convert('RGB')
            
            # Verify image is not corrupted by getting its size
            width, height = image.size
            if width < 10 or height < 10:
                raise ValueError("Image too small")
                
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            return OCRResponse(
                success=False,
                error=f"Invalid or corrupted image file. Please try a different image. (Format: {file.content_type})"
            )
        
        # Configure Gemini model for Flash
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Create comprehensive prompt for French and English receipts
        prompt = """
        Analyze this receipt image and extract the following information in JSON format:
        
        1. **amount**: The total amount paid (as a number, no currency symbols)
        2. **date**: The date of purchase (in YYYY-MM-DD format if possible, or the original format if unclear)
        3. **merchant**: The store/restaurant/business name
        4. **category**: Suggest ONE category from: Food, Transportation, Shopping, Entertainment, Healthcare, Utilities, Other
        
        Instructions:
        - Look for total amount, final price, "TOTAL", "MONTANT", "À PAYER", etc.
        - For dates, check for "DATE", format like DD/MM/YYYY, DD-MM-YYYY, etc.
        - For merchant, look at the top of receipt for business name
        - Choose the most appropriate category based on the merchant/items
        - Handle both French and English receipts
        - If any field cannot be determined, set it to null
        - Be confident but accurate
        
        Return ONLY a JSON object with this exact structure:
        {
            "amount": number_or_null,
            "date": "string_or_null",
            "merchant": "string_or_null", 
            "category": "string_or_null",
            "confidence": "high|medium|low"
        }
        """
        
        # Process with Gemini
        response = model.generate_content([prompt, image])
        
        if not response.text:
            return OCRResponse(
                success=False,
                error="Unable to process receipt. Please try with a clearer image."
            )
        
        # Parse the response
        try:
            parsed = parse_ocr_json(response.text)
            return OCRResponse(
                success=True,
                amount=parsed["amount"],
                date=parsed["date"],
                merchant=parsed["merchant"],
                category=parsed["category"],
                confidence=parsed["confidence"]
            )

        except json.JSONDecodeError:
            # If JSON parsing fails, return a basic response
            return OCRResponse(
                success=False,
                error="Unable to parse receipt data. Please try with a clearer image or different angle."
            )
        
    except Exception as e:
        logger.error(f"OCR processing error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return OCRResponse(
            success=False,
            error=f"An error occurred while processing the receipt: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
