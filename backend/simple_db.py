"""
Simple PostgreSQL integration for PieTracker
"""
import os
import json
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Try to import SQLAlchemy
try:
    from sqlalchemy import create_engine, Column, String, Float, DateTime, JSON, Integer, Text
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker
    from datetime import datetime
    import uuid
    
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False
    logger.warning("SQLAlchemy not available, using file storage")

# Database setup
Base = declarative_base() if SQLALCHEMY_AVAILABLE else None
engine = None
SessionLocal = None

def init_database():
    global engine, SessionLocal
    
    if not SQLALCHEMY_AVAILABLE:
        return False
        
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return False
    
    # Fix postgres:// to postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    try:
        engine = create_engine(database_url, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

# Database Models
if SQLALCHEMY_AVAILABLE:
    class User(Base):
        __tablename__ = "users"
        
        id = Column(String, primary_key=True)
        email = Column(String, unique=True, index=True)
        username = Column(String, index=True)
        hashed_password = Column(String)
        password_hash = Column(String)  # Alias for compatibility
        role = Column(String, default="user")
        is_active = Column(String, default="true")
        last_login = Column(DateTime)
        created_at = Column(DateTime, default=datetime.utcnow)

    class Expense(Base):
        __tablename__ = "expenses"
        
        id = Column(String, primary_key=True)
        user_id = Column(String, index=True)
        amount = Column(Float)
        currency = Column(String)
        category = Column(String)
        description = Column(Text)
        date = Column(String)
        created_at = Column(DateTime, default=datetime.utcnow)

    class UserCategories(Base):
        __tablename__ = "user_categories"
        
        id = Column(Integer, primary_key=True)
        user_id = Column(String, index=True, unique=True)
        categories = Column(JSON)

# Simple database service
class SimpleDBService:
    def __init__(self):
        self.use_db = init_database()
    
    def get_session(self):
        if self.use_db and SessionLocal:
            return SessionLocal()
        return None
    
    def save_user(self, user_id: str, user_data: dict):
        if not self.use_db:
            return False
        
        session = self.get_session()
        if not session:
            return False
            
        try:
            # Check if user exists
            existing = session.query(User).filter(User.id == user_id).first()
            if existing:
                # Update existing user
                existing.email = user_data.get("email", existing.email)
                existing.username = user_data.get("username", existing.username)
                existing.hashed_password = user_data.get("hashed_password", existing.hashed_password)
                existing.password_hash = user_data.get("password_hash", existing.password_hash)
                existing.role = user_data.get("role", existing.role)
                existing.is_active = user_data.get("is_active", existing.is_active)
                existing.last_login = user_data.get("last_login", existing.last_login)
            else:
                # Check if email already exists (different user_id)
                existing_email = session.query(User).filter(User.email == user_data.get("email", "")).first()
                if existing_email:
                    # User exists with different ID, skip to avoid duplicate email error
                    logger.info(f"User with email {user_data.get('email')} already exists, skipping")
                    return True
                
                # Create new user
                new_user = User(
                    id=user_id,
                    email=user_data.get("email", ""),
                    username=user_data.get("username", ""),
                    hashed_password=user_data.get("hashed_password", ""),
                    password_hash=user_data.get("password_hash", ""),
                    role=user_data.get("role", "user"),
                    is_active=user_data.get("is_active", "true"),
                    last_login=user_data.get("last_login")
                )
                session.add(new_user)
            
            session.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving user: {e}")
            session.rollback()
            return False
        finally:
            session.close()
    
    def save_expense(self, expense_data: dict):
        if not self.use_db:
            return False
        
        session = self.get_session()
        if not session:
            return False
            
        try:
            expense_id = expense_data.get("id", str(uuid.uuid4()))
            
            # Check if expense exists
            existing = session.query(Expense).filter(Expense.id == expense_id).first()
            if not existing:
                new_expense = Expense(
                    id=expense_id,
                    user_id=expense_data.get("user_id", ""),
                    amount=float(expense_data.get("amount", 0)),
                    currency=expense_data.get("currency", "USD"),
                    category=expense_data.get("category", ""),
                    description=expense_data.get("description", ""),
                    date=expense_data.get("date", "")
                )
                session.add(new_expense)
                session.commit()
            return True
        except Exception as e:
            logger.error(f"Error saving expense: {e}")
            session.rollback()
            return False
        finally:
            session.close()
    
    def get_all_users(self):
        """Get all users from database for admin panel"""
        if not self.use_db:
            return {}
        
        session = self.get_session()
        if not session:
            return {}
            
        try:
            users = session.query(User).all()
            result = {}
            for user in users:
                result[user.id] = {
                    "email": user.email,
                    "username": getattr(user, 'username', None) or user.email.split("@")[0],
                    "hashed_password": getattr(user, 'hashed_password', None),
                    "password_hash": getattr(user, 'password_hash', None) or getattr(user, 'hashed_password', None),
                    "role": getattr(user, 'role', 'user'),
                    "is_active": user.is_active,
                    "last_login": getattr(user, 'last_login', None),
                    "created_at": user.created_at.isoformat() if user.created_at else None
                }
            return result
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return {}
        finally:
            session.close()
    
    def get_user_expense_count(self, user_id):
        """Get the count of expenses for a specific user"""
        if not self.use_db:
            return 0
            
        session = self.get_session()
        if not session:
            return 0
            
        try:
            count = session.query(Expense).filter(Expense.user_id == user_id).count()
            return count
        except Exception as e:
            logger.error(f"Error getting expense count for user {user_id}: {e}")
            return 0
        finally:
            session.close()
    
    def get_user_by_id(self, user_id):
        """Get a specific user by ID"""
        if not self.use_db:
            return None
            
        session = self.get_session()
        if not session:
            return None
            
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if user:
                return {
                    "id": user.id,
                    "email": user.email,
                    "username": getattr(user, 'username', None) or user.email.split("@")[0],
                    "password_hash": getattr(user, 'password_hash', None) or getattr(user, 'hashed_password', None),
                    "role": getattr(user, 'role', 'user'),
                    "is_active": user.is_active,
                    "created_at": getattr(user, 'created_at', None),
                    "last_login": getattr(user, 'last_login', None)
                }
            return None
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None
        finally:
            session.close()
    
    def update_user(self, user_id, update_data):
        """Update a user's information"""
        if not self.use_db:
            return False
            
        session = self.get_session()
        if not session:
            return False
            
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return False
                
            # Update fields if provided
            if "username" in update_data:
                user.username = update_data["username"]
            if "email" in update_data:
                user.email = update_data["email"]
            if "password_hash" in update_data:
                user.password_hash = update_data["password_hash"]
            if "role" in update_data:
                user.role = update_data["role"]
            if "is_active" in update_data:
                user.is_active = update_data["is_active"]
                
            session.commit()
            return True
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            session.rollback()
            return False
        finally:
            session.close()
    
    def check_username_exists(self, username, exclude_user_id=None):
        """Check if username already exists (excluding a specific user)"""
        if not self.use_db:
            return False
            
        session = self.get_session()
        if not session:
            return False
            
        try:
            query = session.query(User).filter(User.username == username.lower())
            if exclude_user_id:
                query = query.filter(User.id != exclude_user_id)
            return query.first() is not None
        except Exception as e:
            logger.error(f"Error checking username exists: {e}")
            return False
        finally:
            session.close()
    
    def check_email_exists(self, email, exclude_user_id=None):
        """Check if email already exists (excluding a specific user)"""
        if not self.use_db:
            return False
            
        session = self.get_session()
        if not session:
            return False
            
        try:
            query = session.query(User).filter(User.email == email.lower())
            if exclude_user_id:
                query = query.filter(User.id != exclude_user_id)
            return query.first() is not None
        except Exception as e:
            logger.error(f"Error checking email exists: {e}")
            return False
        finally:
            session.close()

# Global instance
db_service = SimpleDBService()