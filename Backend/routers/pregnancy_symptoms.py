from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user

router = APIRouter(
    prefix="/pregnancy-symptoms",
    tags=["Pregnancy Symptoms"]
)

@router.post("/", response_model=schemas.PregnancySymptomResponse)
def create_pregnancy_symptom(
    symptom: schemas.PregnancySymptomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new pregnancy symptom entry"""
    db_symptom = models.PregnancySymptom(
        user_id=current_user.id,
        **symptom.dict()
    )
    db.add(db_symptom)
    db.commit()
    db.refresh(db_symptom)
    return db_symptom

@router.get("/", response_model=List[schemas.PregnancySymptomResponse])
def get_pregnancy_symptoms(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all pregnancy symptoms for the current user"""
    return db.query(models.PregnancySymptom).filter(
        models.PregnancySymptom.user_id == current_user.id
    ).all()

@router.get("/{symptom_id}", response_model=schemas.PregnancySymptomResponse)
def get_pregnancy_symptom(
    symptom_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific pregnancy symptom by ID"""
    symptom = db.query(models.PregnancySymptom).filter(
        models.PregnancySymptom.id == symptom_id,
        models.PregnancySymptom.user_id == current_user.id
    ).first()
    
    if not symptom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pregnancy symptom not found"
        )
    return symptom

@router.put("/{symptom_id}", response_model=schemas.PregnancySymptomResponse)
def update_pregnancy_symptom(
    symptom_id: int,
    symptom_update: schemas.PregnancySymptomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a pregnancy symptom"""
    symptom = db.query(models.PregnancySymptom).filter(
        models.PregnancySymptom.id == symptom_id,
        models.PregnancySymptom.user_id == current_user.id
    ).first()
    
    if not symptom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pregnancy symptom not found"
        )
    
    for key, value in symptom_update.dict().items():
        setattr(symptom, key, value)
    
    db.commit()
    db.refresh(symptom)
    return symptom

@router.delete("/{symptom_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pregnancy_symptom(
    symptom_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a pregnancy symptom"""
    symptom = db.query(models.PregnancySymptom).filter(
        models.PregnancySymptom.id == symptom_id,
        models.PregnancySymptom.user_id == current_user.id
    ).first()
    
    if not symptom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pregnancy symptom not found"
        )
    
    db.delete(symptom)
    db.commit()
    return None 