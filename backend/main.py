from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from datetime import datetime, date, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
import json
import os
from collections import defaultdict
import uuid

# In-memory password reset token store (token -> {user_id, exp})
PASSWORD_RESET_TOKENS: Dict[str, Dict[str, str]] = {}

app = FastAPI(title="PieTracker - Elegant Finance App")

# =====================
# Auth Configuration
# =====================
SECRET_KEY = os.environ.get("PIETRACKER_SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

"""Password hashing context.
Using pbkdf2_sha256 to avoid bcrypt Windows backend issues & 72-byte truncation.
If you later prefer bcrypt, change schemes=["bcrypt"]."""
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Very small in-file user store; in production use a database
USERS_FILE = "users.json"
users_db: Dict[str, Dict[str, str]] = {}

def load_users():
    global users_db
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    users_db = data
        except Exception:
            users_db = {}

def save_users():
    with open(USERS_FILE, 'w') as f:
        json.dump(users_db, f, indent=2)

load_users()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(password, hashed)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_email(email: str) -> Optional[Dict[str, str]]:
    email_l = email.lower().strip()
    return next((u for u in users_db.values() if u.get("email") == email_l), None)

def authenticate_user(email: str, password: str) -> Optional[Dict[str, str]]:
    user = get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.get("password_hash", "")):
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
    user = users_db.get(user_id)
    if user is None:
        raise credentials_exception
    return user

# CORS middleware to allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now - will restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint for deployment monitoring
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "PieTracker API is running"}

@app.get("/")
async def root():
    return {"message": "Welcome to PieTracker API", "docs": "/docs"}

# In-memory storage (in production, use a database)
expenses_db = []  # list of expense dicts; new entries will include user_id
categories_db: Dict[str, Dict[str, str]] = {}  # { user_id: {category_name: color} }
DATA_FILE = "expenses.json"
CATEGORIES_FILE = "categories.json"

# Load existing data
def load_expenses():
    global expenses_db
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                expenses_db = json.load(f)
        except:
            expenses_db = []

def load_categories():
    """Load categories. Legacy format was a flat dict of category->color.
    We now store per-user: { user_id: {category: color} }. Legacy will be nested under '__legacy__'."""
    global categories_db
    if os.path.exists(CATEGORIES_FILE):
        try:
            with open(CATEGORIES_FILE, 'r') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    # If values look like colors (hex strings), treat as legacy flat dict
                    if all(isinstance(v, str) and v.startswith('#') for v in data.values()):
                        categories_db = {"__legacy__": data}
                    else:
                        categories_db = data  # assume new format
                else:
                    categories_db = {}
        except Exception:
            categories_db = {}
    else:
        categories_db = {}

# Save data to file
def save_expenses():
    with open(DATA_FILE, 'w') as f:
        json.dump(expenses_db, f, indent=2)

def save_categories():
    with open(CATEGORIES_FILE, 'w') as f:
        json.dump(categories_db, f, indent=2)

# Load expenses on startup
load_expenses()
load_categories()

# Ensure categories_db is a dict of dicts
if not isinstance(categories_db, dict):
    categories_db = {}

DEFAULT_CATEGORIES = ["Food", "Transportation", "Shopping", "Entertainment"]

def get_user_id(x_user_id: Optional[str] = Header(default=None), token_user: Optional[Dict[str, str]] = Depends(lambda: None)) -> str:
    """Resolve user id preferentially from JWT, fallback to header legacy id.
    This keeps old behavior working while new auth rolls out."""
    # If request included Authorization header, FastAPI dependency (not used yet) would parse; we manually decode if header present
    # Simpler: try reading bearer token from environment of request path? For minimal intrusion we leave as legacy unless updated flows call protected endpoints.
    # For now we'll keep header-based until endpoints start requiring auth.
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()
    return "public-anon-user"

def get_user_custom_categories(user_id: str) -> Dict[str, str]:
    return categories_db.get(user_id, {})

def set_user_category(user_id: str, name: str, color: str):
    if user_id not in categories_db:
        categories_db[user_id] = {}
    categories_db[user_id][name] = color
    save_categories()

def delete_user_category(user_id: str, name: str):
    if user_id in categories_db and name in categories_db[user_id]:
        del categories_db[user_id][name]
        save_categories()

@app.get("/")
async def root():
    return {"message": "Welcome to PieTracker!"}

@app.get("/expenses")
async def get_expenses(user_id: str = Depends(get_user_id)):
    # Return only this user's expenses (legacy ones without user_id excluded)
    return [e for e in expenses_db if e.get("user_id") == user_id]

@app.get("/expenses/month/{year}/{month}")
async def get_expenses_by_month(year: int, month: int, user_id: str = Depends(get_user_id)):
    month_str = f"{year:04d}-{month:02d}"
    return [
        expense for expense in expenses_db
        if expense.get("user_id") == user_id and expense["date"].startswith(month_str)
    ]

@app.get("/expenses/summary/{year}/{month}")
async def get_monthly_summary(year: int, month: int, user_id: str = Depends(get_user_id)):
    month_str = f"{year:04d}-{month:02d}"
    monthly_expenses = [
        expense for expense in expenses_db
        if expense.get("user_id") == user_id and expense["date"].startswith(month_str)
    ]
    category_totals = defaultdict(float)
    total_amount = 0.0
    for expense in monthly_expenses:
        category_totals[expense["category"]] += float(expense["amount"])
        total_amount += float(expense["amount"])
    return {
        "month": f"{year}-{month:02d}",
        "total": total_amount,
        "categories": dict(category_totals),
        "expense_count": len(monthly_expenses)
    }

@app.post("/expenses")
async def create_expense(expense: dict, user_id: str = Depends(get_user_id)):
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
    expenses_db.append(new_expense)
    save_expenses()
    return new_expense

@app.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user_id: str = Depends(get_user_id)):
    global expenses_db
    before = len(expenses_db)
    expenses_db = [exp for exp in expenses_db if not (exp.get("user_id") == user_id and exp["id"] == expense_id)]
    if len(expenses_db) != before:
        save_expenses()
    return {"message": "Expense deleted successfully"}

@app.get("/expenses/available-months")
async def get_available_months(user_id: str = Depends(get_user_id)):
    """Get all year-month combos for this user's expenses."""
    months = set()
    for expense in expenses_db:
        if expense.get("user_id") != user_id:
            continue
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
    used_categories = {exp["category"] for exp in expenses_db if exp.get("user_id") == user_id and exp.get("category")}
    custom = set(get_user_custom_categories(user_id).keys())
    # Include legacy custom categories only if user has none yet
    if user_id not in categories_db and "__legacy__" in categories_db:
        custom |= set(categories_db.get("__legacy__", {}).keys())
    all_categories = sorted(set(DEFAULT_CATEGORIES) | used_categories | custom)
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
    # Merge legacy colors (if present) only for users without custom categories defined
    colors = {}
    if user_id not in categories_db and "__legacy__" in categories_db:
        colors.update(categories_db.get("__legacy__", {}))
    colors.update(get_user_custom_categories(user_id))
    return colors

@app.delete("/categories/{category_name}")
async def delete_category(category_name: str, user_id: str = Depends(get_user_id)):
    if category_name in DEFAULT_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Cannot delete default category: {category_name}")
    # Remove custom category for this user only
    delete_user_category(user_id, category_name)
    global expenses_db
    before = len(expenses_db)
    expenses_db = [exp for exp in expenses_db if not (exp.get("user_id") == user_id and exp.get("category") == category_name)]
    removed = before - len(expenses_db)
    if removed:
        save_expenses()
    return {"message": f"Category '{category_name}' deleted successfully. {removed} associated expenses were also removed."}

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
    email: EmailStr
    password: str = Field(min_length=6, max_length=256)
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
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

@app.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    email = req.email.lower().strip()
    if get_user_by_email(email):
        raise HTTPException(status_code=400, detail="Email already registered")
    password = req.password
    if len(password) > 256:
        raise HTTPException(status_code=400, detail="Password must be 256 characters or fewer")
    name = (req.name or email.split("@")[0]).strip()
    import uuid
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": email,
        "name": name,
        "password_hash": hash_password(password),
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    users_db[user_id] = new_user
    save_users()
    token = create_access_token({"sub": user_id})
    return AuthResponse(
        user=UserOut(**{k: new_user[k] for k in ["id", "email", "name", "created_at"]}),
        token=token,
        message="Signup successful"
    )

@app.post("/auth/login", response_model=AuthResponse)
async def login(credentials: LoginRequest):
    email = credentials.email.lower().strip()
    password = credentials.password
    if len(password) > 256:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user = authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user["id"]})
    return AuthResponse(
        user=UserOut(**{k: user[k] for k in ["id", "email", "name", "created_at"]}),
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
        user = users_db.get(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"user": {k: user[k] for k in ["id", "email", "name", "created_at"]}}
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
    user = users_db.get(user_id)
    if not user:
        del PASSWORD_RESET_TOKENS[req.token]
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    if len(req.new_password) > 256:
        raise HTTPException(status_code=400, detail="Password must be 256 characters or fewer")
    user["password_hash"] = hash_password(req.new_password)
    save_users()
    del PASSWORD_RESET_TOKENS[req.token]
    return {"message": "Password reset successful. You may now log in."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
