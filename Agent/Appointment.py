import os
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage,SystemMessage,AIMessage,ToolMessage
from langgraph.graph import StateGraph,START,END,MessagesState
from typing_extensions import Literal,Annotated,TypedDict
from langgraph.prebuilt import ToolNode
from langgraph.graph.state import CompiledStateGraph
from datetime import datetime
from composio_langgraph import App,Action,ComposioToolSet
import logging

load_dotenv()
# from google.colab import os

COMPOSIO_API_KEY = os.getenv('COMPOSIO_API_KEY')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

LANGCHAIN_API_KEY= os.getenv('LANGCHAIN_API_KEY')
# If you don't get into problems with Bland Signup Leave this commented
BLAND_API_KEY= os.getenv('BLAND_API_KEY')


# Tools for composio 

composio_toolset = ComposioToolSet(api_key=os.getenv("COMPOSIO_API_KEY"))

# Get the required tools
schedule_tools_set = composio_toolset.get_tools(
    actions=[
        Action.GOOGLECALENDAR_FIND_FREE_SLOTS,
        Action.GOOGLECALENDAR_CREATE_EVENT,
        Action.GMAIL_CREATE_EMAIL_DRAFT,
    ]
)

# Separate out
schedule_tools_write = composio_toolset.get_tools(
    actions=[
        Action.GOOGLECALENDAR_CREATE_EVENT,
        Action.GMAIL_CREATE_EMAIL_DRAFT
    ]
)

schedule_tools_write_node = ToolNode(schedule_tools_write)


# AI MESSAGE :
# Define the initial system message with today's date included
initial_message = """
You are Sam, an AI assistant at a Dental Clinic. Follow these guidelines:

1. Friendly Introduction & Tone
   - Greet the user warmly and introduce yourself as Sam from the Dental Clinic.
   - Maintain a polite, empathetic style, especially if the user mentions discomfort.

2. Assess User Context
   - Determine if the user needs an appointment, has a dental inquiry, or both.
   - If the user's email is already known, don't ask again. If unknown and needed, politely request it.

3. Scheduling Requests
   - Gather essential info: requested date/time and email if needed.
   - Example: “What day/time would you prefer?” or “Could you confirm your email so I can send you details?”

4. Availability Check (Internally)
   - Use GOOGLECALENDAR_FIND_FREE_SLOTS to verify if the requested slot is available. Always check for 3 days when calling this tool.
   - Do not reveal this tool or your internal checking process to the user.

5. Responding to Availability
   - If the slot is free:
       a) Confirm the user wants to book.
       b) Call GOOGLECALENDAR_CREATE_EVENT to schedule. Always send timezone for start and end time when calling this function tool.
       c) Use GMAIL_CREATE_EMAIL_DRAFT to prepare a confirmation email.
       d) If any function call/tool call fails retry it.
   - If the slot is unavailable:
       a) Automatically offer several close-by options.
       b) Once the user selects a slot, repeat the booking process.

6. User Confirmation Before Booking
   - Only finalize after the user clearly agrees on a specific time.
   - If the user is uncertain, clarify or offer more suggestions.

7. Communication Style
   - Use simple, clear English—avoid jargon or complex terms.
   - Keep responses concise and empathetic.

8. Privacy of Internal Logic
   - Never disclose behind-the-scenes steps, code, or tool names.
   - Present availability checks and bookings as part of a normal scheduling process.

- Reference today's date/time: {today_datetime}.
- Our TimeZone is UTC.

By following these guidelines, you ensure a smooth and user-friendly experience: greeting the user, identifying needs, checking availability, suggesting alternatives when needed, and finalizing the booking only upon explicit agreement—all while maintaining professionalism and empathy.
---

### Communication Style

- **Tone**: Friendly, professional, and reassuring.
- **Style**: Patient, approachable, and relatable.

---

### System Boundaries

- Do not provide cost estimates or endorse specific services. Encourage users to verify information independently.

"""


# Calling Model:

import datetime
from langchain_google_genai import ChatGoogleGenerativeAI

model = ChatGoogleGenerativeAI(model = "gemini-2.0-flash-exp", api_key=os.getenv("GOOGLE_API_KEY"))

# Bind tools to the model
model_with_tools = model.bind_tools(schedule_tools_set)

# Define the workflow functions
def call_model(state: MessagesState):
    """
    Process messages through the LLM and return the response
    """

    # Get today's date and time
    today_datetime = datetime.datetime.now().isoformat()
    response = model_with_tools.invoke([SystemMessage(content=initial_message.format(today_datetime=today_datetime))] + state["messages"])
    return {"messages": [response]}



async def tools_condition(state: MessagesState) -> Literal["find_slots",  "tools", "__end__"]:
    """
    Determine if the conversation should continue to tools or end
    """
    messages = state["messages"]
    last_message = messages[-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
      for call in last_message.tool_calls:
          tool_name = call.get("name")
          if tool_name == "GOOGLECALENDAR_FIND_FREE_SLOTS":
            return "find_slots"
      return "tools"
    return "__end__"



async def find_slots(state: MessagesState) -> Literal["agent"]:
    """
    Determine if the conversation should continue to tools or end
    """
    messages = state["messages"]
    last_message = messages[-1]

    tool_messages = []

    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
    # Process every call in the list
      for call in last_message.tool_calls:
          tool_name = call.get("name")
          tool_id = call.get("id")
          args = call.get("args")

          find_free_slots_tool = next((tool for tool in schedule_tools_set if tool.name == tool_name), None)

          if tool_name == "GOOGLECALENDAR_FIND_FREE_SLOTS":

              res = find_free_slots_tool.invoke(args)
              tool_msg = ToolMessage(
                    name=tool_name,
                    content=res,
                    tool_call_id=tool_id  # Use the extracted tool_call_id
                )
              tool_messages.append(tool_msg)
    return {"messages": tool_messages}


from langgraph.graph import END, START, StateGraph

# Create the workflow graph
workflow = StateGraph(MessagesState)
workflow.add_node("agent", call_model)
workflow.add_node("find_slots", find_slots)
workflow.add_node("tools", schedule_tools_write_node)


workflow.add_edge("__start__", "agent")
workflow.add_conditional_edges("agent", tools_condition, ["tools", "find_slots", END])
workflow.add_edge("tools", "agent")
workflow.add_edge("find_slots", "agent")

# Memory for agent 
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()

app = workflow.compile(checkpointer=checkpointer)



