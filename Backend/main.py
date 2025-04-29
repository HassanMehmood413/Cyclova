from fastapi import FastAPI
import model
from database import engine 
from routes import users,authentication,pregnancy_tracker,appointment_agent,periodscare
# from .routes import authentication
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# model.Base.metadata.create_all(bind=engine)


origins = ["http://localhost:3000", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)
app.include_router(authentication.router)
app.include_router(users.router)
app.include_router(pregnancy_tracker.router)
app.include_router(periodscare.router)
app.include_router(appointment_agent.router)
