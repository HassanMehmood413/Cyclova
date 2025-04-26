from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

from pydantic.types import conint



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
