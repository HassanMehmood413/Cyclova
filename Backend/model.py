from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, TIMESTAMP,Text
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
    # Relationship to pregnancy symptoms
    pregnancy_symptoms = relationship("PregnancySymptom", back_populates="user", cascade="all, delete-orphan")

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

class PregnancySymptom(Base):
    __tablename__ = "pregnancy_symptoms"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symptom = Column(String, nullable=False)
    severity = Column(Integer, nullable=False)  # 1-5 scale
    date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to user
    user = relationship("User", back_populates="pregnancy_symptoms")

class PeriodTracker(Base):
    __tablename__ = "period_trackers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=True)
    cycle_length = Column(Integer, nullable=True)  # in days
    period_length = Column(Integer, nullable=True)  # in days
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to user
    user = relationship("User", back_populates="period_tracker")
    # Relationship to symptoms
    symptoms = relationship("PeriodSymptom", back_populates="tracker", cascade="all, delete-orphan")
    # Relationship to moods
    moods = relationship("MoodEntry", back_populates="tracker", cascade="all, delete-orphan")
    # Relationship to reminders
    reminders = relationship("HealthReminder", back_populates="tracker", cascade="all, delete-orphan")
    # Relationship to appointments
    appointments = relationship("DoctorAppointment", back_populates="tracker", cascade="all, delete-orphan")

class PeriodSymptom(Base):
    __tablename__ = "period_symptoms"
    
    id = Column(Integer, primary_key=True, index=True)
    tracker_id = Column(Integer, ForeignKey("period_trackers.id"), nullable=False)
    date = Column(Date, nullable=False)
    symptom_type = Column(String, nullable=False)  # cramps, headache, fatigue, etc.
    severity = Column(Integer, nullable=False)  # 1-5 scale
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to tracker
    tracker = relationship("PeriodTracker", back_populates="symptoms")

class MoodEntry(Base):
    __tablename__ = "mood_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    tracker_id = Column(Integer, ForeignKey("period_trackers.id"), nullable=False)
    date = Column(Date, nullable=False)
    mood_type = Column(String, nullable=False)  # happy, sad, anxious, irritable, etc.
    intensity = Column(Integer, nullable=False)  # 1-5 scale
    notes = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to tracker
    tracker = relationship("PeriodTracker", back_populates="moods")

class HealthReminder(Base):
    __tablename__ = "health_reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    tracker_id = Column(Integer, ForeignKey("period_trackers.id"), nullable=False)
    reminder_type = Column(String, nullable=False)  # period, medication, checkup, etc.
    reminder_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to tracker
    tracker = relationship("PeriodTracker", back_populates="reminders")

class DoctorAppointment(Base):
    __tablename__ = "doctor_appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    tracker_id = Column(Integer, ForeignKey("period_trackers.id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(String, nullable=False)
    doctor_name = Column(String, nullable=False)
    doctor_email = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    calendar_event_id = Column(String, nullable=True)  # Google Calendar Event ID
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationship to tracker
    tracker = relationship("PeriodTracker", back_populates="appointments")

# Add relationship to User model
User.period_tracker = relationship("PeriodTracker", back_populates="user", uselist=False)