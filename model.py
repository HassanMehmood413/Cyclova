from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, TIMESTAMP
from sqlalchemy.sql import text
from sqlalchemy.orm import relationship
from database import Base

# User model (existing)
class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to pregnancy tracker
    pregnancy_tracker = relationship("PregnancyTracker", back_populates="user", uselist=False)

# Pregnancy Tracker model
class PregnancyTracker(Base):
    __tablename__ = "pregnancy_trackers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    last_period = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to user
    user = relationship("User", back_populates="pregnancy_tracker")
    
    # Relationship to milestones
    milestones = relationship("Milestone", back_populates="tracker", cascade="all, delete-orphan")

# Milestone model
class Milestone(Base):
    __tablename__ = "milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    tracker_id = Column(Integer, ForeignKey("pregnancy_trackers.id"), nullable=False)
    trimester = Column(String, nullable=False)
    name = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to tracker
    tracker = relationship("PregnancyTracker", back_populates="milestones")