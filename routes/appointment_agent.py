from fastapi import APIRouter, Request
from pydantic import BaseModel
from utils import appointment_util
from schemas import MessageInput



router = APIRouter(
    prefix="/appointment",
    tags=["appointment"]
)



@router.post("/chat_with_agent")
async def chat_with_sam(message: MessageInput):
    response = await appointment_util.get_appointment_response(message.user_input)
    return {"response": response}
