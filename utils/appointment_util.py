from langchain_core.messages import HumanMessage
from Agent import Appointment
import uuid

async def get_appointment_response(user_input: str):
    inputs = {"messages": [HumanMessage(content=user_input)]}
    
    # Generate unique or session-based ID
    thread_id = str(uuid.uuid4())  # Or pull from user/session context

    # Add `configurable` with `thread_id`
    async for step in Appointment.app.astream(inputs,config={"configurable": {"thread_id": thread_id}},stream_mode='values'):  # Use the generated UUID):
        print(step)
        final_step = step

    final_messages = final_step.get("messages", [])
    print(final_messages)
    return final_messages[-1].content if final_messages else "Something went wrong."
