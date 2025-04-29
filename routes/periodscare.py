from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os,schemas
from model import User, PeriodTracker, PeriodSymptom, MoodEntry, HealthReminder, DoctorAppointment
from schemas import PeriodTrackerCreate, SymptomCreate, MoodCreate, ReminderCreate, AppointmentCreate
from database import get_db
from langgraph.prebuilt import ToolNode
from model import User
from composio_langgraph import Action,ComposioToolSet
from oauth2 import get_current_user


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
    return  get_current_user() 

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

@router.post("/insights/", response_model=schemas.PeriodInsightResponse)
async def generate_period_insights(
    data: dict,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    """Generate AI-powered insights based on user's period and symptom data"""
    try:
        # Validate that we received period history
        if not data.get("period_history") or not isinstance(data["period_history"], list):
            raise HTTPException(status_code=400, detail="Period history data is required")
            
        period_history = data["period_history"]
        symptoms = data.get("symptoms", [])
        analysis = data.get("analysis", {})
        
        # Calculate current cycle phase
        current_phase = "unknown"
        day_of_cycle = None
        
        if period_history:
            # Sort by most recent first
            sorted_history = sorted(
                period_history, 
                key=lambda x: datetime.strptime(x["start_date"], "%Y-%m-%d").date() if isinstance(x["start_date"], str) else x["start_date"],
                reverse=True
            )
            
            # Calculate the current cycle phase
            last_period_start = datetime.strptime(sorted_history[0]["start_date"], "%Y-%m-%d").date() if isinstance(sorted_history[0]["start_date"], str) else sorted_history[0]["start_date"]
            today = datetime.now().date()
            days_since_period = (today - last_period_start).days
            day_of_cycle = days_since_period + 1
            
            avg_cycle_length = sum(p.get("cycle_length", 28) for p in sorted_history) / len(sorted_history)
            avg_period_length = sum(p.get("period_length", 5) for p in sorted_history) / len(sorted_history)
            
            # Determine cycle phase
            if days_since_period < avg_period_length:
                current_phase = "menstrual"
            elif days_since_period < (avg_cycle_length * 0.45):
                current_phase = "follicular"
            elif days_since_period < (avg_cycle_length * 0.5):
                current_phase = "ovulation"
            else:
                current_phase = "luteal"
        
        # Calculate average cycle length and period length
        avg_cycle_length = None
        avg_period_length = None
        cycle_regularity = "unknown"
        
        if len(period_history) >= 3:
            cycle_lengths = []
            period_lengths = []
            
            for i in range(1, len(period_history)):
                current = datetime.strptime(period_history[i]["start_date"], "%Y-%m-%d").date() if isinstance(period_history[i]["start_date"], str) else period_history[i]["start_date"]
                previous = datetime.strptime(period_history[i-1]["start_date"], "%Y-%m-%d").date() if isinstance(period_history[i-1]["start_date"], str) else period_history[i-1]["start_date"]
                days_diff = abs((previous - current).days)
                if days_diff > 0 and days_diff < 60:  # Skip outliers
                    cycle_lengths.append(days_diff)
                
                period_lengths.append(period_history[i].get("period_length", 5))
            
            if cycle_lengths:
                avg_cycle_length = sum(cycle_lengths) / len(cycle_lengths)
                avg_cycle_variation = max(cycle_lengths) - min(cycle_lengths)
                
                if avg_cycle_variation <= 2:
                    cycle_regularity = "very regular"
                elif avg_cycle_variation <= 5:
                    cycle_regularity = "regular"
                elif avg_cycle_variation <= 10:
                    cycle_regularity = "somewhat irregular"
                else:
                    cycle_regularity = "irregular"
                
            if period_lengths:
                avg_period_length = sum(period_lengths) / len(period_lengths)
        
        # Analyze common symptoms
        frequent_symptoms = {}
        for symptom in symptoms:
            symptom_type = symptom.get("symptom_type", "")
            if symptom_type:
                frequent_symptoms[symptom_type] = frequent_symptoms.get(symptom_type, 0) + 1
        
        top_symptoms = sorted(frequent_symptoms.items(), key=lambda x: x[1], reverse=True)[:3]
        symptoms_list = [s[0].replace("_", " ") for s in top_symptoms]
        
        # Get additional analysis from the client
        cycle_regularity_analysis = analysis.get("cycleRegularity", {})
        symptom_patterns = analysis.get("symptomPatterns", {})
        recent_trends = analysis.get("recentTrends", {})
        
        # Prepare variables for the prompt
        cycle_info = f"""
            - Average cycle length: {round(avg_cycle_length) if avg_cycle_length else 'Unknown'} days
            - Average period length: {round(avg_period_length) if avg_period_length else 'Unknown'} days
            - Cycle regularity: {cycle_regularity}
            - Current cycle phase: {current_phase}
            - Current day of cycle: {day_of_cycle}
        """
        
        symptom_info = f"""
            - Most frequent symptoms: {', '.join(symptoms_list) if symptoms_list else 'No symptoms recorded'}
        """
        
        # Format symptom patterns if available
        symptom_pattern_info = ""
        for symptom_type, pattern in symptom_patterns.items():
            if isinstance(pattern, dict) and "mostCommon" in pattern:
                symptom_pattern_info += f"- {symptom_type.replace('_', ' ')} typically occurs {pattern['mostCommon']} period ({pattern.get(pattern['mostCommon'] + 'Period', 0)}%)\n"
        
        # Create prompt for the LLM
        prompt = f"""
        You are a women's health expert providing personalized insights about menstrual cycles. 
        
        The user has the following cycle data:
        {cycle_info}
        
        Symptom information:
        {symptom_info}
        
        Symptom patterns:
        {symptom_pattern_info}
        
        Based on this information, please provide:
        
        1. A personalized insight about their cycle pattern and what it might mean for their reproductive health
        2. Information about their current cycle phase and what's happening in their body
        3. Potential symptoms they might experience in this phase and how to manage them
        4. Diet and exercise recommendations for their current phase
        5. Self-care tips tailored to their specific cycle patterns
        
        Format the response as a single paragraph of comprehensive but concise insights. Be informative, accurate, and supportive in tone. Avoid making any medical diagnoses.
        """
        
        # Get AI response
        try:
            from utils.ai_service import get_ai_response
            
            # Get the response from the AI service
            ai_insight = await get_ai_response(prompt)
            
            # Generate more structured advanced insights
            advanced_insights = [
                {
                    "type": "cycle",
                    "title": "Your Cycle Pattern",
                    "description": f"Your cycles appear to be {cycle_regularity} with an average length of {round(avg_cycle_length) if avg_cycle_length else 'unknown'} days.",
                    "recommendation": "Regular cycles generally indicate good hormonal balance, though some variation is normal."
                },
                {
                    "type": "phase",
                    "title": f"Current {current_phase.capitalize()} Phase",
                    "description": get_phase_description(current_phase, day_of_cycle),
                    "recommendation": get_phase_recommendation(current_phase)
                }
            ]
            
            # Add symptom insight if available
            if symptoms_list:
                advanced_insights.append({
                    "type": "symptom",
                    "title": "Your Common Symptoms",
                    "description": f"Your most frequently tracked symptoms are {', '.join(symptoms_list)}.",
                    "recommendation": "Consider tracking the severity and timing of these symptoms to identify patterns."
                })
            
            # Add nutrition insight
            advanced_insights.append({
                "type": "nutrition",
                "title": f"Nutrition for {current_phase.capitalize()} Phase",
                "description": get_nutrition_recommendation(current_phase),
                "recommendation": "Adjusting your diet according to your cycle phases may help manage symptoms."
            })
            
            # Add exercise insight
            advanced_insights.append({
                "type": "exercise",
                "title": f"Exercise for {current_phase.capitalize()} Phase",
                "description": get_exercise_recommendation(current_phase),
                "recommendation": "Listen to your body and adjust exercise intensity based on your energy levels."
            })
            
            return {
                "insights": ai_insight,
                "advanced_insights": advanced_insights
            }
        
        except Exception as e:
            print(f"AI service error: {str(e)}")
            # Generate fallback insights if AI service fails
            return {
                "insights": generate_fallback_insight(current_phase, day_of_cycle, cycle_regularity, avg_cycle_length, avg_period_length, symptoms_list),
                "advanced_insights": generate_fallback_advanced_insights(current_phase, day_of_cycle, cycle_regularity, avg_cycle_length, avg_period_length, symptoms_list)
            }
    
    except Exception as e:
        print(f"Error generating insights: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

# Helper functions for insights generation

def get_phase_description(phase, day_of_cycle):
    """Get description for the current menstrual cycle phase"""
    if phase == "menstrual":
        return f"You're currently on day {day_of_cycle} of your cycle, in your menstrual phase. Your body is shedding the uterine lining as your period."
    elif phase == "follicular":
        return f"You're on day {day_of_cycle} of your cycle, in the follicular phase. Your body is preparing eggs for possible release and rebuilding the uterine lining."
    elif phase == "ovulation":
        return f"You're on day {day_of_cycle} of your cycle, in your ovulation phase. An egg is being released from the ovary, making this your most fertile time."
    elif phase == "luteal":
        return f"You're on day {day_of_cycle} of your cycle, in the luteal phase. Your body is preparing for possible pregnancy, and if the egg isn't fertilized, you'll begin your period."
    else:
        return f"You're on day {day_of_cycle} of your cycle."

def get_phase_recommendation(phase):
    """Get recommendations based on cycle phase"""
    if phase == "menstrual":
        return "Focus on rest and gentle activities. Iron-rich foods can help replenish what's lost during menstruation."
    elif phase == "follicular":
        return "This is a great time for new projects and higher intensity workouts as energy levels rise with estrogen."
    elif phase == "ovulation":
        return "If you're trying to conceive, this is your most fertile time. If not, be mindful of protection during sexual activity."
    elif phase == "luteal":
        return "Self-care is important as PMS symptoms may appear. Complex carbs can help with mood stability."
    else:
        return "Pay attention to how your body feels and adjust activities accordingly."

def get_nutrition_recommendation(phase):
    """Get nutrition recommendations based on cycle phase"""
    if phase == "menstrual":
        return "Focus on iron-rich foods like leafy greens, lentils, and grass-fed red meat to replenish what's lost during bleeding."
    elif phase == "follicular":
        return "Emphasize foods high in B vitamins and zinc such as eggs, legumes, and whole grains to support follicle development."
    elif phase == "ovulation":
        return "Incorporate antioxidant-rich fruits and vegetables, healthy fats from avocados and olive oil, and fermented foods."
    elif phase == "luteal":
        return "Choose complex carbs like sweet potatoes, calcium-rich foods, and magnesium-rich foods like dark chocolate to help manage PMS symptoms."
    else:
        return "Maintain a balanced diet with plenty of fruits, vegetables, lean proteins, and whole grains."

def get_exercise_recommendation(phase):
    """Get exercise recommendations based on cycle phase"""
    if phase == "menstrual":
        return "Gentle activities like walking, light yoga, or swimming can help relieve cramps and boost mood without overtaxing your body."
    elif phase == "follicular":
        return "Take advantage of increasing energy with high-intensity workouts, strength training, or cardio activities that challenge you."
    elif phase == "ovulation":
        return "Your body is at peak performance with higher testosterone levels. Great time for strength training, HIIT, or group fitness classes."
    elif phase == "luteal":
        return "As energy decreases, moderate activities like pilates, light strength training, or hiking can help manage mood changes and bloating."
    else:
        return "Listen to your body and choose activities that match your energy levels while maintaining consistency."

def generate_fallback_insight(phase, day_of_cycle, regularity, avg_cycle_length, avg_period_length, symptoms):
    """Generate a fallback insight if AI service is unavailable"""
    phase_text = {
        "menstrual": "shedding your uterine lining",
        "follicular": "building up your uterine lining as estrogen rises",
        "ovulation": "likely releasing an egg and at your most fertile",
        "luteal": "in the post-ovulation phase where progesterone rises"
    }.get(phase, "going through your cycle")
    
    cycle_text = f"Your cycles appear to be {regularity}" if regularity != "unknown" else "As you track more cycles, we'll be able to analyze your cycle regularity"
    
    if avg_cycle_length:
        cycle_text += f" with an average length of {round(avg_cycle_length)} days"
    
    symptoms_text = ""
    if symptoms:
        symptoms_text = f" You commonly experience {', '.join(symptoms[:2])}"
        if len(symptoms) > 2:
            symptoms_text += f" and {symptoms[2]}"
        symptoms_text += "."
    
    return f"You're currently on day {day_of_cycle} of your cycle in the {phase} phase, where your body is {phase_text}. {cycle_text}. {symptoms_text} During this phase, focus on {get_phase_recommendation(phase).lower()} Pay attention to how your body feels, as this can provide valuable insights about your hormonal health."

def generate_fallback_advanced_insights(phase, day_of_cycle, regularity, avg_cycle_length, avg_period_length, symptoms):
    """Generate fallback advanced insights if AI service is unavailable"""
    insights = [
        {
            "type": "cycle",
            "title": "Your Cycle Pattern",
            "description": f"Your cycles appear to be {regularity} with an average length of {round(avg_cycle_length) if avg_cycle_length else 'unknown'} days.",
            "recommendation": "Regular cycles generally indicate good hormonal balance, though some variation is normal."
        },
        {
            "type": "phase",
            "title": f"Current {phase.capitalize()} Phase",
            "description": get_phase_description(phase, day_of_cycle),
            "recommendation": get_phase_recommendation(phase)
        }
    ]
    
    # Add symptom insight if available
    if symptoms:
        insights.append({
            "type": "symptom",
            "title": "Your Common Symptoms",
            "description": f"Your most frequently tracked symptoms are {', '.join(symptoms)}.",
            "recommendation": "Consider tracking the severity and timing of these symptoms to identify patterns."
        })
    
    # Add nutrition insight
    insights.append({
        "type": "nutrition",
        "title": f"Nutrition for {phase.capitalize()} Phase",
        "description": get_nutrition_recommendation(phase),
        "recommendation": "Adjusting your diet according to your cycle phases may help manage symptoms."
    })
    
    # Add exercise insight
    insights.append({
        "type": "exercise",
        "title": f"Exercise for {phase.capitalize()} Phase",
        "description": get_exercise_recommendation(phase),
        "recommendation": "Listen to your body and adjust exercise intensity based on your energy levels."
    })
    
    return insights