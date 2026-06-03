from app.models.post import Post
from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    cuisine = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)       # Easy, Medium, Hard
    prep_time = Column(Integer, nullable=True)        # minutes
    cook_time = Column(Integer, nullable=True)        # minutes
    servings = Column(Integer, default=4)
    ingredients = Column(JSON, nullable=False)        # list of strings
    steps = Column(JSON, nullable=False)              # list of strings
    tags = Column(JSON, nullable=True)                # list of strings
    image_url = Column(String, nullable=True)
    source = Column(String, default="dataset")        # "dataset" or "user"
    contributor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    contributor = relationship("User", backref="recipes")
    posts = relationship("Post", back_populates="recipe")