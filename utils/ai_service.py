import os
import json
import httpx
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

async def get_ai_response(prompt, model=""):
    """
    Generate an AI response using one of several available LLM providers.
    Falls back to secondary providers if the primary one fails.
    
    Args:
        prompt (str): The prompt to send to the AI model
        model (str, optional): Specific model to use. Defaults to provider's recommended model.
        
    Returns:
        str: The generated text response
    """
    # Try different AI providers in order of preference
    response = None
    
    # First attempt: OpenAI (if key is available)
    if OPENAI_API_KEY and not response:
        try:
            response = await get_openai_response(prompt, model or "gpt-3.5-turbo")
        except Exception as e:
            print(f"OpenAI error: {str(e)}")
    
    # Second attempt: Groq (if key is available)
    if GROQ_API_KEY and not response:
        try:
            response = await get_groq_response(prompt, model or "llama2-70b-4096")
        except Exception as e:
            print(f"Groq error: {str(e)}")
    
    # Fallback: If all services fail, provide a generic response
    if not response:
        return generate_fallback_response(prompt)
    
    return response

async def get_openai_response(prompt, model="gpt-3.5-turbo"):
    """Get response from OpenAI API"""
    openai.api_key = OPENAI_API_KEY
    
    try:
        messages = [
            {"role": "system", "content": "You are a helpful women's health assistant providing accurate, factual information about menstrual cycles and reproductive health."},
            {"role": "user", "content": prompt}
        ]
        
        response = await openai.ChatCompletion.acreate(
            model=model,
            messages=messages,
            max_tokens=1000,
            temperature=0.5
        )
        
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI request failed: {str(e)}")
        raise

async def get_groq_response(prompt, model="llama2-70b-4096"):
    """Get response from Groq API"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful women's health assistant providing accurate, factual information about menstrual cycles and reproductive health."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.5,
                    "max_tokens": 1000
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                print(f"Groq API error: {response.status_code} - {response.text}")
                raise Exception(f"Groq API error: {response.status_code}")
    except Exception as e:
        print(f"Groq request failed: {str(e)}")
        raise

def generate_fallback_response(prompt):
    """Generate a generic response when all AI services fail"""
    # Extract key terms to tailor the generic response
    prompt_lower = prompt.lower()
    
    if "menstrual" in prompt_lower or "period" in prompt_lower:
        return "During your menstrual phase, focus on rest and self-care. Consider iron-rich foods to replenish what's lost during menstruation. Gentle exercise like walking or yoga can help with cramping. It's normal for energy levels to be lower during this time."
    
    elif "follicular" in prompt_lower:
        return "In the follicular phase, your body is preparing for ovulation. This is often a time of increasing energy as estrogen rises. It's a great time for starting new projects or challenging workout routines. Focus on B-vitamin rich foods to support this phase."
    
    elif "ovulation" in prompt_lower:
        return "During ovulation, you're at your most fertile. This is when an egg is released from the ovary. Many women experience peak energy and confidence during this phase. If you're not trying to conceive, be mindful of protection. Antioxidant-rich foods can support egg health."
    
    elif "luteal" in prompt_lower:
        return "In the luteal phase, your body prepares for possible pregnancy. If you're experiencing PMS symptoms, focus on self-care. Complex carbohydrates, calcium, and magnesium-rich foods may help stabilize mood and reduce bloating. This is a good time for more moderate exercise routines."
    
    else:
        return "Understanding your menstrual cycle can help you work with your body's natural rhythms. Each phase brings different energy levels and needs. Tracking your cycle, symptoms, and moods can provide valuable insights about your hormonal health and overall wellbeing." 