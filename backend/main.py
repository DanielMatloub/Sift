from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv
import os
import base64
import json

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageRequest(BaseModel):
    image: str
    media_type: str

@app.post("/analyze")
def analyze_image(req: ImageRequest):
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": req.media_type,
                            "data": req.image,
                        },
                    },
                    {
                        "type": "text",
                        "text": """You are a recycling assistant. Analyze this image and determine if the item shown can be recycled.

Respond with ONLY a JSON object, no markdown, no explanation, no code blocks:
{"recyclable": true or false, "item": "brief name of the item", "reason": "one sentence explanation"}"""
                    }
                ],
            }
        ],
    )

    text = message.content[0].text.strip()
    # Strip markdown code blocks if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    result = json.loads(text)
    return result