from fastapi import APIRouter, Request,Depends
from pydantic import BaseModel
from utils import appointment_util
from schemas import MessageInput
from oauth2 import get_current_user


router = APIRouter(
    prefix="/appointment",
    tags=["appointment"]
)


@router.post("/chat_with_agent")
async def chat_with_sam(message: MessageInput, user=Depends(get_current_user)):
    # Get user's unique identifier
    user_id = user.id  # or user.email, depending on what your token gives

    # Build a thread ID based on the user ID
    thread_id = f"appointment-thread-{user_id}"

    # Now call appointment agent
    response = await appointment_util.get_appointment_response(message.user_input, thread_id)
    return {"response": response}