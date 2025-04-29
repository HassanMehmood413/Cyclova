from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional,List,Dict
from pydantic import BaseModel, validator
from typing import List, Dict, Optional
from datetime import date, datetime


# User schema to show user details (used in Post)
class ShowUser(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        orm_mode = True 




# User schema
class User(BaseModel):
    username: str
    password: str
    email: EmailStr



# Login schema
class Login(BaseModel):
    email: EmailStr
    password: str


# Token schema for authentication
class Token(BaseModel):
    access_token: str
    token_type: str


# TokenData schema to hold data related to the user (usually after token verification)
class TokenData(BaseModel):
    id: Optional[int] = None


# ////////////////////////
# Appintment design 
# ////////////////////////



class MessageInput(BaseModel):
    user_input: str



# ////////////////////////
# Pregnancy tracker 
# ////////////////////////


class PregnancyInput(BaseModel):
    last_period: str  # Format: YYYY-MM-DD

class MilestoneUpdate(BaseModel):
    trimester: str
    milestone: str
    completed: bool

class MilestoneInput(BaseModel):
    milestone_updates: List[MilestoneUpdate]

class PregnancyData(BaseModel):
    current_week: int
    due_date: str
    baby_size_info: Optional[str] = None
    progress_percentage: float
    trimester: str

class AIInsightResponse(BaseModel):
    insights: str

# Pydantic models for request and response

class PregnancyTrackerBase(BaseModel):
    last_period: str
    
    @validator('last_period')
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError("Date must be in the format YYYY-MM-DD")

class PregnancyTrackerCreate(PregnancyTrackerBase):
    pass

class PregnancyTrackerResponse(BaseModel):
    id: int
    user_id: int
    last_period: date
    due_date: date
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class MilestoneBase(BaseModel):
    trimester: str
    name: str
    completed: bool = False
    
    @validator('trimester')
    def validate_trimester(cls, v):
        valid_trimesters = ["First Trimester", "Second Trimester", "Third Trimester"]
        if v not in valid_trimesters:
            raise ValueError(f"Trimester must be one of: {', '.join(valid_trimesters)}")
        return v

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneUpdate(BaseModel):
    trimester: str
    milestone: str  # Using 'milestone' instead of 'name' for consistency with the router
    completed: bool
    
    @validator('trimester')
    def validate_trimester(cls, v):
        valid_trimesters = ["First Trimester", "Second Trimester", "Third Trimester"]
        if v not in valid_trimesters:
            raise ValueError(f"Trimester must be one of: {', '.join(valid_trimesters)}")
        return v

class MilestoneResponse(BaseModel):
    id: int
    tracker_id: int
    trimester: str
    name: str
    completed: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class MilestoneInputList(BaseModel):
    milestone_updates: List[MilestoneUpdate]

class PregnancyDataResponse(BaseModel):
    current_week: int
    due_date: str
    baby_size_info: Optional[str] = None
    progress_percentage: float
    trimester: str

class AIInsightResponse(BaseModel):
    insights: str

class CompletePregnancyDataResponse(PregnancyDataResponse):
    last_period: str
    milestones: Dict[str, List[dict]]




# ////////////////////////
# Period care 
# ////////////////////////
class PeriodTrackerCreate(BaseModel):
    start_date: str
    end_date: Optional[str] = None
    cycle_length: Optional[int] = None
    period_length: Optional[int] = None

class PeriodTrackerResponse(BaseModel):
    id: int
    user_id: int
    start_date: str
    end_date: Optional[str] = None
    cycle_length: Optional[int] = None
    period_length: Optional[int] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class SymptomCreate(BaseModel):
    date: str
    symptom_type: str
    severity: int
    notes: Optional[str] = None

class MoodCreate(BaseModel):
    date: str
    mood_type: str
    intensity: int
    notes: Optional[str] = None

class ReminderCreate(BaseModel):
    reminder_type: str
    reminder_date: str
    description: Optional[str] = None

class AppointmentCreate(BaseModel):
    appointment_date: str
    appointment_time: str
    doctor_name: str
    doctor_email: Optional[str] = None
    reason: Optional[str] = None
    location: Optional[str] = None

# Add the PeriodInsightResponse schema
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class InsightItem(BaseModel):
    type: str
    title: str
    description: str
    recommendation: Optional[str] = None

class PeriodInsightResponse(BaseModel):
    insights: str
    advanced_insights: Optional[List[InsightItem]] = None