from fastapi import HTTPException
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import requests
from model import Milestone
# Create a dictionary with pregnancy week information (simplified version)



GROQ_API_KEY = "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"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-70b-8192"




PREGNANCY_WEEKS = {
    1: "Your baby is about the size of a poppy seed. The fertilized egg is developing into a blastocyst.",
    4: "Your baby is about the size of a poppy seed. Major organs and external features begin to form.",
    8: "Your baby is about the size of a kidney bean. The embryo is now developing into a fetus.",
    12: "Your baby is about the size of a lime. The fetal period begins, and the gender can often be seen.",
    16: "Your baby is about the size of an avocado. The baby can make facial expressions.",
    20: "Your baby is about the size of a banana. You might feel the baby move for the first time.",
    24: "Your baby is about the size of an ear of corn. The baby has a chance of survival if born now.",
    28: "Your baby is about the size of an eggplant. The baby's eyes can open and close.",
    32: "Your baby is about the size of a squash. The baby is gaining weight rapidly.",
    36: "Your baby is about the size of a honeydew melon. The baby is considered full term by the end of this week.",
    40: "Your baby is about the size of a watermelon. The baby is ready to be born."
}

# Functions
def calculate_due_date(last_period_date):
    return last_period_date + timedelta(days=280)

def calculate_current_week(last_period_date):
    today = datetime.now().date()
    pregnancy_start = last_period_date
    days_pregnant = (today - pregnancy_start).days
    weeks_pregnant = days_pregnant // 7
    return min(max(1, weeks_pregnant), 40)

def get_trimester(week):
    if week <= 13:
        return "First Trimester"
    elif week <= 26:
        return "Second Trimester"
    else:
        return "Third Trimester"

def find_closest_week_info(week):
    """Find the closest week that has information available"""
    available_weeks = sorted(list(PREGNANCY_WEEKS.keys()))
    closest = min(available_weeks, key=lambda x: abs(x - week))
    return PREGNANCY_WEEKS[closest]

def initialize_default_milestones(db: Session, tracker_id: int):
    """Initialize default milestones for a new pregnancy tracker"""
    default_milestones = {
        "First Trimester": [
            "First ultrasound", 
            "Morning sickness subsides", 
            "End of embryonic period"
        ],
        "Second Trimester": [
            "Gender reveal possible", 
            "Baby's first movements", 
            "Glucose screening test"
        ],
        "Third Trimester": [
            "Baby shower", 
            "Birth plan creation", 
            "Pack hospital bag"
        ]
    }
    
    for trimester, milestones in default_milestones.items():
        for milestone_name in milestones:
            milestone = Milestone(
                tracker_id=tracker_id,
                trimester=trimester,
                name=milestone_name,
                completed=False
            )
            db.add(milestone)
    
    db.commit()


def get_ai_response(prompt: str) -> str:
    """Get a response from the Groq LLM API"""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are a knowledgeable and compassionate pregnancy assistant. Provide helpful, accurate, and supportive information for pregnant individuals."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }
    
    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Raise exception for 4XX/5XX responses
        
        response_data = response.json()
        if "choices" in response_data and len(response_data["choices"]) > 0:
            return response_data["choices"][0]["message"]["content"].strip()
        else:
            return "Sorry, I couldn't generate insights at this time."
    except requests.exceptions.RequestException as e:
        # Log the error (in a production app)
        print(f"Error calling Groq API: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get AI insights. Please try again later."
        )