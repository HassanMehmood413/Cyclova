from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import database, model, schemas, oauth2
from hashing import verify_password

router = APIRouter()

@router.post('/login', response_model=schemas.Token)
def login(request: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # Fetch user by email (username in OAuth2PasswordRequestForm is email)
    user = db.query(model.User).filter(model.User.email == request.username).first()

    # Check if user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Verify password
    if not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Create a token with user ID
    access_token = oauth2.create_access_token(data={"sub": str(user.id)})

    # Return the token
    return {"access_token": access_token, "token_type": "bearer"}
