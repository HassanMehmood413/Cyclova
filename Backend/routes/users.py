from typing import List
from fastapi import APIRouter , HTTPException , status , Depends
from sqlalchemy.orm import Session
import model,schemas,database
from respository import users
import oauth2


router = APIRouter(
    tags=['User'],
    prefix="/user"
)


get_db = database.get_db

@router.get('/',status_code=status.HTTP_200_OK,response_model=List[schemas.ShowUser])
def get_user(db:Session = Depends(get_db)):
    return users.get_all_user(db)

@router.post('/',status_code=status.HTTP_201_CREATED,response_model=schemas.User)
def create_user(request:schemas.User , db: Session = Depends(get_db)):
    return users.create_any_user(request,db)

@router.get('/{id}',response_model=schemas.ShowUser)
def get_user_by_id(db:Session = Depends(get_db),id = int,user_id :int = Depends(oauth2.get_current_user)):
    return users.get_user(db,id)
    




    