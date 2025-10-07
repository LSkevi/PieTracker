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

def get_user_by_username(username: str) -> Optional[Dict[str, str]]:
    username_l = username.lower().strip()
    return next((u for u in users_db.values() if u.get("username", "").lower() == username_l), None)

def authenticate_user(username: str, password: str) -> Optional[Dict[str, str]]:
    user = get_user_by_username(username)
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
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
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

def get_user_id(
    x_user_id: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None)
) -> str:
    """Resolve user id from JWT if provided, else from X-User-Id header, else public anon.
    This prevents a client from spoofing a different user's id via header when authenticated."""
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

def ensure_user_category_init(user_id: str):
    """If legacy categories exist and user has none yet, clone them into user's own space.
    This avoids shared mutations and enables true per-user customization."""
    if user_id in categories_db:
        return
    if "__legacy__" in categories_db:
        legacy = categories_db.get("__legacy__", {})
        if isinstance(legacy, dict):
            categories_db[user_id] = dict(legacy)  # copy
            save_categories()

def get_user_custom_categories(user_id: str) -> Dict[str, str]:
    ensure_user_category_init(user_id)
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
    # No longer merge legacy directly; they are cloned on first access via ensure_user_category_init
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
    # After initialization legacy colors copied, just return user's custom map
    return get_user_custom_categories(user_id)

@app.delete("/categories/{category_name}")
async def delete_category(category_name: str, user_id: str = Depends(get_user_id)):
    if category_name in DEFAULT_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Cannot delete default category: {category_name}")
    # Only operate within user's custom categories
    existing_custom = get_user_custom_categories(user_id)
    if category_name not in existing_custom:
        # Silently succeed to avoid information leakage
        return {"message": f"Category '{category_name}' not found for user"}
    delete_user_category(user_id, category_name)
    global expenses_db
    before = len(expenses_db)
    expenses_db = [exp for exp in expenses_db if not (exp.get("user_id") == user_id and exp.get("category") == category_name)]
    removed = before - len(expenses_db)
    if removed:
        save_expenses()
    return {"message": f"Category '{category_name}' deleted for user. {removed} associated expenses removed."}

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

@app.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
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
    users_db[user_id] = new_user
    save_users()
    token = create_access_token({"sub": user_id})
    return AuthResponse(
        user=UserOut(**{k: new_user[k] for k in ["id", "username", "email", "created_at"]}),
        token=token,
        message="Signup successful"
    )

@app.post("/auth/login", response_model=AuthResponse)
async def login(credentials: LoginRequest):
    username = credentials.username.lower().strip()
    password = credentials.password
    if len(password) > 256:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Special admin login
    if username == "admin" and password == "admin123":
        # Create/update admin user if doesn't exist
        admin_user_id = "admin-super-user"
        admin_user = {
            "id": admin_user_id,
            "username": "admin",
            "email": "admin@pietracker.com",
            "password_hash": hash_password("admin123"),
            "created_at": datetime.utcnow().isoformat() + "Z",
            "role": "super_admin",
            "is_active": True,
            "last_login": datetime.utcnow().isoformat() + "Z"
        }
        users_db[admin_user_id] = admin_user
        save_users()
        
        token = create_access_token({"sub": admin_user_id})
        return AuthResponse(
            user=UserOut(**{k: admin_user[k] for k in ["id", "username", "email", "created_at"]}),
            token=token,
            message="Admin login successful"
        )
    
    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Update last login
    user["last_login"] = datetime.utcnow().isoformat() + "Z"
    save_users()
    
    token = create_access_token({"sub": user["id"]})
    return AuthResponse(
        user=UserOut(**{k: user[k] for k in ["id", "username", "email", "created_at"]}),
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

# =====================
# Admin User Management Endpoints
# =====================

def is_admin_user(user: dict) -> bool:
    """Check if user has admin privileges. You can customize this logic."""
    return (user.get("role") == "admin" or 
            user.get("role") == "super_admin" or 
            user.get("email") == "admin@pietracker.com" or
            user.get("id") == "admin-super-user")

@app.get("/admin/users", dependencies=[Depends(get_current_user)])
async def list_all_users(current_user: dict = Depends(get_current_user)):
    """List all users - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Return user info with ALL data for admin
    users_list = []
    for user_id, user in users_db.items():
        # Count user's expense data
        user_expense_file = f"{user_id}_expenses.json"
        expense_count = 0
        if os.path.exists(user_expense_file):
            try:
                with open(user_expense_file, 'r') as f:
                    expenses = json.load(f)
                    expense_count = len(expenses) if isinstance(expenses, list) else 0
            except:
                expense_count = 0
        
        users_list.append({
            "id": user_id,
            "email": user.get("email"),
            "name": user.get("name"),
            "password_hash": user.get("password_hash"),  # Include for admin view
            "role": user.get("role", "user"),
            "created_at": user.get("created_at"),
            "last_login": user.get("last_login"),
            "is_active": user.get("is_active", True),
            "expense_count": expense_count
        })
    
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
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = users_db[user_id]
    
    # Update fields if provided
    if update_data.username is not None:
        # Check if username already exists
        new_username = update_data.username.lower().strip()
        if any(u.get("username", "").lower() == new_username for uid, u in users_db.items() if uid != user_id):
            raise HTTPException(status_code=400, detail="Username already exists")
        user["username"] = new_username
    
    if update_data.email is not None:
        # Check if email already exists
        new_email = update_data.email.lower().strip()
        if any(u.get("email") == new_email for uid, u in users_db.items() if uid != user_id):
            raise HTTPException(status_code=400, detail="Email already exists")
        user["email"] = new_email
    
    if update_data.password is not None:
        user["password_hash"] = hash_password(update_data.password)
    
    if update_data.role is not None:
        user["role"] = update_data.role
    
    if update_data.is_active is not None:
        user["is_active"] = update_data.is_active
    
    save_users()
    return {"message": f"User {user.get('username', user['email'])} updated successfully", "user": user}

@app.post("/admin/users/{user_id}/deactivate", dependencies=[Depends(get_current_user)])
async def deactivate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Deactivate a user account - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    users_db[user_id]["is_active"] = False
    save_users()
    return {"message": f"User {users_db[user_id]['email']} deactivated"}

@app.post("/admin/users/{user_id}/activate", dependencies=[Depends(get_current_user)])
async def activate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Activate a user account - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    users_db[user_id]["is_active"] = True
    save_users()
    return {"message": f"User {users_db[user_id]['email']} activated"}

@app.delete("/admin/users/{user_id}", dependencies=[Depends(get_current_user)])
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a user account - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also delete user's expense data
    user_expense_file = f"{user_id}_expenses.json"
    if os.path.exists(user_expense_file):
        os.remove(user_expense_file)
    
    user_categories_file = f"{user_id}_categories.json"
    if os.path.exists(user_categories_file):
        os.remove(user_categories_file)
    
    email = users_db[user_id]["email"]
    del users_db[user_id]
    save_users()
    return {"message": f"User {email} and all associated data deleted"}

@app.get("/admin/stats", dependencies=[Depends(get_current_user)])
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get admin statistics - Admin only"""
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = len(users_db)
    active_users = len([u for u in users_db.values() if u.get("is_active", True)])
    
    # Count expense files to estimate active users
    expense_files = [f for f in os.listdir(".") if f.endswith("_expenses.json")]
    users_with_data = len(expense_files)
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "users_with_expense_data": users_with_data
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
