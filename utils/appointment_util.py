from langchain_core.messages import HumanMessage, AIMessage
from Agent import Appointment
import uuid

async def get_appointment_response(user_input: str, thread_id: str):
    inputs = {"messages": [HumanMessage(content=user_input)]}

    async for step in Appointment.app.astream(inputs, config={"configurable": {"thread_id": thread_id}}, stream_mode='values'):
        # Inspect the current step's messages
        messages = step.get("messages", [])
        
        for message in messages:
            if isinstance(message, AIMessage) and hasattr(message, "tool_calls") and message.tool_calls:
                for tool_call in message.tool_calls:
                    tool_name = tool_call.get("name")
                    print(f"🔧 Calling Tool: {tool_name}")
        
        final_step = step

    final_messages = final_step.get("messages", [])
    return final_messages[-1].content if final_messages else "Something went wrong."
