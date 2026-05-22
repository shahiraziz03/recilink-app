from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    """Base class for all database models."""
    pass

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # One-to-one relationship with Profile
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    bio = Column(String(500), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    
    # Store dietary preferences as JSON, e.g., ["halal", "vegetarian"] or {"halal": true}
    dietary_preferences = Column(JSON, nullable=True, default=list)
    frequently_used_ingredients = Column(JSON, nullable=True, default=list)
    cooking_streak = Column(Integer, default=0)
    
    user = relationship("User", back_populates="profile")
