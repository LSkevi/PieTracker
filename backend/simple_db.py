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
        hashed_password = Column(String)
        is_active = Column(String, default="true")
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
                # Update
                existing.email = user_data.get("email", existing.email)
                existing.hashed_password = user_data.get("hashed_password", existing.hashed_password)
                existing.is_active = user_data.get("is_active", existing.is_active)
            else:
                # Create new
                new_user = User(
                    id=user_id,
                    email=user_data.get("email", ""),
                    hashed_password=user_data.get("hashed_password", ""),
                    is_active=user_data.get("is_active", "true")
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

# Global instance
db_service = SimpleDBService()