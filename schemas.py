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