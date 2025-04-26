from fastapi import FastAPI
import model
from database import engine 
from routes import users,authentication
# from .routes import authentication
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

model.Base.metadata.create_all(bind=engine)


origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(authentication.router)
app.include_router(users.router)