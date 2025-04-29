from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from utils.pregnancy_tracker import calculate_due_date, calculate_current_week, get_trimester, find_closest_week_info, initialize_default_milestones, get_ai_response
from utils.pregnancy_tracker import PREGNANCY_WEEKS
from model import User, PregnancyTracker, Milestone, PregnancyTracker
from schemas import PregnancyInput,MilestoneUpdate,MilestoneInput,PregnancyData,AIInsightResponse
from database import get_db
from model import User, PregnancyTracker, Milestone

from oauth2 import get_current_user



# Create a router
router = APIRouter(
    prefix="/pregnancy",
    tags=["pregnancy"],
    responses={404: {"description": "Not found"}},
)


# Routes
@router.post("/calculate", response_model=PregnancyData)
async def calculate_pregnancy_data(
    input_data: PregnancyInput, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        last_period_date = datetime.strptime(input_data.last_period, "%Y-%m-%d").date()
        due_date = calculate_due_date(last_period_date)
        
        # Check if user already has a tracker
        tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
        
        if tracker:
            # Update existing tracker
            tracker.last_period = last_period_date
            tracker.due_date = due_date
            tracker.updated_at = datetime.now()
        else:
            # Create new tracker
            tracker = PregnancyTracker(
                user_id=current_user.id,
                last_period=last_period_date,
                due_date=due_date
            )
            db.add(tracker)
            db.commit()
            
            # Initialize default milestones
            initialize_default_milestones(db, tracker.id)
        
        db.commit()
        
        # Calculate current pregnancy data
        current_week = calculate_current_week(last_period_date)
        
        # Get baby size info for the current week
        baby_size_info = None
        if current_week in PREGNANCY_WEEKS:
            baby_size_info = PREGNANCY_WEEKS[current_week]
        else:
            baby_size_info = find_closest_week_info(current_week)
        
        return PregnancyData(
            current_week=current_week,
            due_date=due_date.strftime("%Y-%m-%d"),
            baby_size_info=baby_size_info,
            progress_percentage=min(current_week / 40, 1) * 100,
            trimester=get_trimester(current_week)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error calculating pregnancy data: {str(e)}")

@router.get("/tracker")
async def get_pregnancy_tracker(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the user's tracker
    tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
    
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pregnancy tracker found. Please set up your tracker first."
        )
    
    # Calculate current pregnancy data
    current_week = calculate_current_week(tracker.last_period)
    
    # Get baby size info
    baby_size_info = None
    if current_week in PREGNANCY_WEEKS:
        baby_size_info = PREGNANCY_WEEKS[current_week]
    else:
        baby_size_info = find_closest_week_info(current_week)
    
    return {
        "current_week": current_week,
        "due_date": tracker.due_date.strftime("%Y-%m-%d"),
        "last_period": tracker.last_period.strftime("%Y-%m-%d"),
        "baby_size_info": baby_size_info,
        "progress_percentage": min(current_week / 40, 1) * 100,
        "trimester": get_trimester(current_week)
    }

@router.get("/milestones")
async def get_milestones(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the user's tracker
    tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
    
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pregnancy tracker found. Please set up your tracker first."
        )
    
    # Get milestones from database
    milestones_query = db.query(Milestone).filter(Milestone.tracker_id == tracker.id).all()
    
    # Organize milestones by trimester
    result = {}
    for milestone in milestones_query:
        if milestone.trimester not in result:
            result[milestone.trimester] = []
        
        result[milestone.trimester].append({
            "id": milestone.id,
            "name": milestone.name,
            "completed": milestone.completed
        })
    
    return result

@router.post("/milestones/update")
async def update_milestones(
    milestone_data: MilestoneInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the user's tracker
    tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
    
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pregnancy tracker found. Please set up your tracker first."
        )
    
    # Update the milestones
    for update in milestone_data.milestone_updates:
        trimester = update.trimester
        milestone_name = update.milestone
        completed = update.completed
        
        # Find the milestone in the database
        milestone = db.query(Milestone).filter(
            Milestone.tracker_id == tracker.id,
            Milestone.trimester == trimester,
            Milestone.name == milestone_name
        ).first()
        
        if milestone:
            # Update existing milestone
            milestone.completed = completed
            milestone.updated_at = datetime.now()
        else:
            # Create new milestone
            new_milestone = Milestone(
                tracker_id=tracker.id,
                trimester=trimester,
                name=milestone_name,
                completed=completed
            )
            db.add(new_milestone)
    
    db.commit()
    
    # Get updated milestones
    return await get_milestones(current_user, db)



from pydantic import BaseModel
from typing import Optional
from datetime import date

class SetupData(BaseModel):
    last_period: date
    known_due_date: Optional[date] = None
    first_pregnancy: bool
    pre_pregnancy_weight: float
    height: float

class SymptomData(BaseModel):
    date: date
    symptom: str
    severity: int
    notes: Optional[str] = None


class InsightRequest(BaseModel):
    setup_data: SetupData
    symptom_data: SymptomData

@router.post("/insights", response_model=AIInsightResponse)
async def get_pregnancy_insights(
    request: InsightRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    setup_data = request.setup_data
    symptom_data = request.symptom_data

    print(f"Received insight request with data: {setup_data}, {symptom_data}")

    """Get personalized AI insights based on the user's pregnancy stage"""
    # Get the user's pregnancy tracker
    tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
    
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pregnancy tracker found. Please set up your tracker first."
        )
    
    # Calculate current week
    today = datetime.now().date()
    pregnancy_start = tracker.last_period
    days_pregnant = (today - pregnancy_start)
    current_week =  days_pregnant
    current_week = current_week  # Cap at 40 weeks
    
    # Determine trimester
    # if current_week <= 13:
        # trimester = "first trimester"
    # elif current_week <= 26:
        # trimester = "second trimester"
    # else:
    trimester = "third trimester"

    # Create prompt for the LLM
    prompt = f"""
        I am currently in week {current_week} of pregnancy ({trimester}).
        Here is some information about me:
        - First pregnancy: {'Yes' if setup_data.first_pregnancy else 'No'}
        - Pre-pregnancy weight: {setup_data.pre_pregnancy_weight} kg
        - Height: {setup_data.height} cm

        Today, I'm experiencing the following symptom: {symptom_data.symptom} (severity: {symptom_data.severity}).
        Notes: {symptom_data.notes or 'None'}

        Please provide:
        1. Baby's development this week
        2. Expected physical symptoms
        3. Health considerations and tips
        4. Self-care suggestions for this week

        Keep it concise, accurate, and supportive.
        """

    
    # Get response from Groq
    try:
        insights = get_ai_response(prompt)
        return AIInsightResponse(insights=insights)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting AI insights: {str(e)}"
        )

@router.get("/nutrition-tips", response_model=AIInsightResponse)
async def get_nutrition_tips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized nutrition advice based on pregnancy stage"""
    # Get the user's pregnancy tracker
    tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
    
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pregnancy tracker found. Please set up your tracker first."
        )
    
    # Calculate current week
    today = datetime.now().date()
    pregnancy_start = tracker.last_period
    days_pregnant = (today - pregnancy_start).days
    current_week = max(1, days_pregnant // 7)
    current_week = min(current_week, 40)  # Cap at 40 weeks
    
    # Create prompt for the LLM
    prompt = f"""
    I am currently in week {current_week} of pregnancy. Please provide specific nutrition advice for this stage, including:
    
    1. Key nutrients I need right now and why they're important
    2. Food suggestions that are rich in these nutrients
    3. Foods to avoid at this stage
    4. A simple meal idea that would be nutritious for this week of pregnancy
    
    Keep it practical and concise.
    """
    
    # Get response from Groq
    try:
        insights = get_ai_response(prompt)
        return AIInsightResponse(insights=insights)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting nutrition tips: {str(e)}"
        )

@router.get("/exercise-tips", response_model=AIInsightResponse)
async def get_exercise_tips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized exercise recommendations based on pregnancy stage"""
    # Get the user's pregnancy tracker
    tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
    
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pregnancy tracker found. Please set up your tracker first."
        )
    
    # Calculate current week
    today = datetime.now().date()
    pregnancy_start = tracker.last_period
    days_pregnant = (today - pregnancy_start).days
    current_week = max(1, days_pregnant // 7)
    current_week = min(current_week, 40)  # Cap at 40 weeks
    
    # Determine trimester
    if current_week <= 13:
        trimester = "first trimester"
    elif current_week <= 26:
        trimester = "second trimester"
    else:
        trimester = "third trimester"
    
    # Create prompt for the LLM
    prompt = f"""
    I am currently in week {current_week} of pregnancy ({trimester}). Please provide safe exercise recommendations, including:
    
    1. Types of exercises that are safe and beneficial at this stage
    2. Exercises to avoid
    3. Recommended duration and frequency
    4. Signs that indicate I should stop exercising
    
    Keep the advice practical and focused on safety.
    """
    
    # Get response from Groq
    try:
        insights = get_ai_response(prompt)
        return AIInsightResponse(insights=insights)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting exercise tips: {str(e)}"
        )

@router.get("/symptom-check", response_model=AIInsightResponse)
async def symptom_check(
    symptom: str = Query(..., description="Describe the symptom you're experiencing"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get information about a specific pregnancy symptom"""
    # Get the user's pregnancy tracker
    tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
    
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pregnancy tracker found. Please set up your tracker first."
        )
    
    # Calculate current week
    today = datetime.now().date()
    pregnancy_start = tracker.last_period
    days_pregnant = (today - pregnancy_start).days
    current_week = max(1, days_pregnant // 7)
    current_week = min(current_week, 40)  # Cap at 40 weeks
    
    # Create prompt for the LLM
    prompt = f"""
    I am currently in week {current_week} of pregnancy and experiencing this symptom: {symptom}. Please provide:
    
    1. Is this common during this stage of pregnancy?
    2. What might be causing it?
    3. Safe home remedies or management strategies
    4. When should I contact my healthcare provider about this symptom?
    
    IMPORTANT: Begin your response with a disclaimer that this is not medical advice and that the person should consult with their healthcare provider for proper diagnosis and treatment.
    """
    
    # Get response from Groq
    try:
        insights = get_ai_response(prompt)
        return AIInsightResponse(insights=insights)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error checking symptom: {str(e)}"
        )
    

@router.get("/data")
async def get_all_pregnancy_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pregnancy-related data in a single request"""
    # Get the user's tracker
    tracker = db.query(PregnancyTracker).filter(PregnancyTracker.user_id == current_user.id).first()
    
    if not tracker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pregnancy tracker found. Please set up your tracker first."
        )
    
    # Calculate current pregnancy data
    current_week = calculate_current_week(tracker.last_period)
    
    # Get baby size info
    baby_size_info = None
    if current_week in PREGNANCY_WEEKS:
        baby_size_info = PREGNANCY_WEEKS[current_week]
    else:
        baby_size_info = find_closest_week_info(current_week)
    
    # Get milestones
    milestones = await get_milestones(current_user, db)
    
    return {
        "current_week": current_week,
        "due_date": tracker.due_date.strftime("%Y-%m-%d"),
        "last_period": tracker.last_period.strftime("%Y-%m-%d"),
        "baby_size_info": baby_size_info,
        "progress_percentage": min(current_week / 40, 1) * 100,
        "trimester": get_trimester(current_week),
        "milestones": milestones
    }