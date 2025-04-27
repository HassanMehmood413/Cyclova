from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, TIMESTAMP, Float, Text
from sqlalchemy.sql import text
from sqlalchemy.orm import relationship
from typing import List, Optional
from datetime import datetime, timedelta
import os,schemas
from model import User, PeriodTracker, PeriodSymptom, MoodEntry, HealthReminder, DoctorAppointment
from schemas import PeriodTrackerCreate, SymptomCreate, MoodCreate, ReminderCreate, AppointmentCreate
from database import Base, get_db
from langgraph.prebuilt import ToolNode
from model import User
from composio_langgraph import App,Action,ComposioToolSet


from pydantic import BaseModel



# Initialize PeriodCare service
composio_toolset = ComposioToolSet(api_key=os.getenv("COMPOSIO_API_KEY"))
schedule_tools = composio_toolset.get_tools(
    actions=[
        Action.GOOGLECALENDAR_FIND_FREE_SLOTS,
        Action.GOOGLECALENDAR_CREATE_EVENT,
        Action.GMAIL_CREATE_EMAIL_DRAFT,
    ]
)

schedule_tools_write_node = ToolNode(schedule_tools)

# API router
router = APIRouter(
    prefix="/periodcare",
    tags=["periodcare"],
    responses={404: {"description": "Not found"}},
)

def get_current_user_id():
    # Replace with your actual authentication logic
    return 1  # Placeholder for demo

@router.post("/tracker/", response_model=schemas.PeriodTrackerResponse, status_code=status.HTTP_201_CREATED)
def create_period_tracker(
    tracker: PeriodTrackerCreate, 
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert string dates to Date objects
    start_date = datetime.strptime(tracker.start_date, "%Y-%m-%d").date()
    end_date = datetime.strptime(tracker.end_date, "%Y-%m-%d").date() if tracker.end_date else None
    
    # Check if user already has a tracker
    existing_tracker = db.query(PeriodTracker).filter(PeriodTracker.user_id == user_id).first()
    if existing_tracker:
        # Update existing tracker
        existing_tracker.start_date = start_date
        existing_tracker.end_date = end_date
        existing_tracker.cycle_length = tracker.cycle_length
        existing_tracker.period_length = tracker.period_length
        existing_tracker.updated_at = datetime.now()
        db.commit()
        db.refresh(existing_tracker)
        return existing_tracker
    
    # Create new tracker
    db_tracker = PeriodTracker(
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        cycle_length=tracker.cycle_length,
        period_length=tracker.period_length
    )
    db.add(db_tracker)
    db.commit()
    db.refresh(db_tracker)
    return db_tracker

@router.get("/tracker/", response_model=schemas.PeriodTrackerResponse)
def get_period_tracker(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tracker = db.query(PeriodTracker).filter(PeriodTracker.user_id == user_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Period tracker not found")
    return tracker

@router.post("/symptoms/")
def add_symptom(
    symptom: SymptomCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tracker = db.query(PeriodTracker).filter(PeriodTracker.user_id == user_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Period tracker not found")
    
    symptom_date = datetime.strptime(symptom.date, "%Y-%m-%d").date()
    
    db_symptom = PeriodSymptom(
        tracker_id=tracker.id,
        date=symptom_date,
        symptom_type=symptom.symptom_type,
        severity=symptom.severity,
        notes=symptom.notes
    )
    db.add(db_symptom)
    db.commit()
    return {"message": "Symptom added successfully"}

@router.post("/moods/")
def add_mood(
    mood: MoodCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tracker = db.query(PeriodTracker).filter(PeriodTracker.user_id == user_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Period tracker not found")
    
    mood_date = datetime.strptime(mood.date, "%Y-%m-%d").date()
    
    db_mood = MoodEntry(
        tracker_id=tracker.id,
        date=mood_date,
        mood_type=mood.mood_type,
        intensity=mood.intensity,
        notes=mood.notes
    )
    db.add(db_mood)
    db.commit()
    return {"message": "Mood entry added successfully"}

@router.post("/reminders/")
def create_reminder(
    reminder: ReminderCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tracker = db.query(PeriodTracker).filter(PeriodTracker.user_id == user_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Period tracker not found")
    
    reminder_date = datetime.strptime(reminder.reminder_date, "%Y-%m-%d").date()
    
    db_reminder = HealthReminder(
        tracker_id=tracker.id,
        reminder_type=reminder.reminder_type,
        reminder_date=reminder_date,
        description=reminder.description
    )
    db.add(db_reminder)
    db.commit()
    return {"message": "Health reminder created successfully"}



@router.post("/appointments/")
async def schedule_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    try:
        # Ensure the tracker exists
        tracker = db.query(PeriodTracker).filter(PeriodTracker.user_id == user_id).first()
        if not tracker:
            # If tracker doesn't exist, create one with default values
            start_date = datetime.now().date()
            db_tracker = PeriodTracker(
                user_id=user_id,
                start_date=start_date,
                cycle_length=28,  # Default value
            )
            db.add(db_tracker)
            db.commit()
            db.refresh(db_tracker)
            tracker = db_tracker
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert string to datetime
        appointment_date = datetime.strptime(appointment.appointment_date, "%Y-%m-%d").date()
        
        # Save appointment to database first
        db_appointment = DoctorAppointment(
            tracker_id=tracker.id,
            appointment_date=appointment_date,
            appointment_time=appointment.appointment_time,
            doctor_name=appointment.doctor_name,
            doctor_email=appointment.doctor_email,
            reason=appointment.reason,
            location=appointment.location
        )
        
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        
        # Google Calendar integration
        try:
            # Format the event times properly for Google Calendar
            event_start = f"{appointment.appointment_date}T{appointment.appointment_time}:00"
            event_end_time = (datetime.strptime(appointment.appointment_time, "%H:%M") + timedelta(hours=1)).strftime("%H:%M")
            event_end = f"{appointment.appointment_date}T{event_end_time}:00"
            
            # Create calendar event using Composio directly
            calendar_tool = schedule_tools.tools[0]  # Get the calendar tool
            
            # Create event data
            event_data = {
                "summary": f"Doctor's Appointment: {appointment.doctor_name}",
                "location": appointment.location or "Doctor's Office",
                "description": appointment.reason or "Regular checkup",
                "start": {"dateTime": event_start, "timeZone": "America/New_York"},
                "end": {"dateTime": event_end, "timeZone": "America/New_York"},
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": 30},
                        {"method": "email", "minutes": 60}
                    ]
                }
            }
            
            
            # Call the calendar tool directly
            calendar_response = await calendar_tool.invoke(
                tool=Action.GOOGLECALENDAR_CREATE_EVENT,
                input=event_data
            )
            
            
            # Update appointment with calendar event ID
            if calendar_response and "id" in calendar_response:
                db_appointment.calendar_event_id = calendar_response["id"]
                db.commit()
            
            # Send email notification if doctor email is provided
            if appointment.doctor_email:
                email_tool = schedule_tools.tools[2]  # Get the Gmail tool
                
                email_content = {
                    "to": appointment.doctor_email,
                    "subject": f"Appointment Request on {appointment.appointment_date}",
                    "body": f"Hello Dr. {appointment.doctor_name},\n\nI would like to schedule an appointment on {appointment.appointment_date} at {appointment.appointment_time}.\n\nReason: {appointment.reason or 'Regular checkup'}\n\nThank you,\n{user.username}"
                }
                
                
                # Call the email tool directly
                email_response = await email_tool.invoke(
                    tool=Action.GMAIL_CREATE_EMAIL_DRAFT.value,
                    input=email_content
                )
                
                
        except Exception as e:
            print(f"Composio integration error: {str(e)}")  # Log the error
            # Don't fail the entire request if Composio fails
        
        return {
            "message": "Appointment scheduled successfully", 
            "appointment_id": db_appointment.id,
            "calendar_integration_status": "success" if db_appointment.calendar_event_id else "failed"
        }
        
    except Exception as e:
        # Roll back the transaction if anything fails
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to schedule appointment: {str(e)}")
    


@router.get("/predict-next-period/")
def predict_next_period(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tracker = db.query(PeriodTracker).filter(PeriodTracker.user_id == user_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Period tracker not found")
    
    if not tracker.cycle_length:
        raise HTTPException(status_code=400, detail="Cycle length not set, cannot predict next period")
    
    # Calculate next period start date based on last start date and cycle length
    next_start = tracker.start_date + timedelta(days=tracker.cycle_length)
    
    # Calculate period end date if period length is known
    next_end = next_start + timedelta(days=tracker.period_length) if tracker.period_length else None
    
    return {
        "next_period_start": next_start.strftime("%Y-%m-%d"),
        "next_period_end": next_end.strftime("%Y-%m-%d") if next_end else None
    }

@router.get("/history/")
def get_period_history(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    tracker = db.query(PeriodTracker).filter(PeriodTracker.user_id == user_id).first()
    if not tracker:
        raise HTTPException(status_code=404, detail="Period tracker not found")
    
    # Get symptoms
    symptoms = db.query(PeriodSymptom).filter(PeriodSymptom.tracker_id == tracker.id).all()
    
    # Get moods
    moods = db.query(MoodEntry).filter(MoodEntry.tracker_id == tracker.id).all()
    
    # Format response
    symptom_data = [
        {
            "date": s.date.strftime("%Y-%m-%d"),
            "symptom_type": s.symptom_type,
            "severity": s.severity,
            "notes": s.notes
        } for s in symptoms
    ]
    
    mood_data = [
        {
            "date": m.date.strftime("%Y-%m-%d"),
            "mood_type": m.mood_type,
            "intensity": m.intensity,
            "notes": m.notes
        } for m in moods
    ]
    
    return {
        "symptoms": symptom_data,
        "moods": mood_data,
        "period_details": {
            "cycle_length": tracker.cycle_length,
            "period_length": tracker.period_length
        }
    }