from fastapi import APIRouter , HTTPException , status , Depends
from sqlalchemy.orm import Session
import database,model,schemas, oauth2
from database import engine  
from hashing import hash_password


get_db = database.get_db




def get_all_user(db:Session = Depends(get_db)):
    user = db.query(model.User).all()
    return user



def create_any_user(request: schemas.User, db: Session = Depends(get_db)):
    # Check if user with email already exists
    existing_user = db.query(model.User).filter(model.User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password and create user
    hashed_password = hash_password(request.password)
    request.password = hashed_password
    new_user = model.User(**request.dict()) 
    db.add(new_user)
    db.commit()
    db.refresh(new_user) 
    return new_user

def get_user(db:Session = Depends(get_db),id = int):
    user = db.query(model.User).filter(model.User.id== id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
