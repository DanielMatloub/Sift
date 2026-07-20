from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import psycopg2
import stripe
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = FastAPI()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
FREE_LIMIT = 10

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)
    return psycopg2.connect(
        host="localhost", dbname="zoning", user="postgres", password="pass"
    )

def get_ip_usage(ip: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT analysis_count, paid FROM sift_rate_limits WHERE ip = %s", (ip,))
    row = cur.fetchone()
    conn.close()
    return row if row else (0, False)

def increment_ip_usage(ip: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO sift_rate_limits (ip, analysis_count)
        VALUES (%s, 1)
        ON CONFLICT (ip) DO UPDATE
        SET analysis_count = sift_rate_limits.analysis_count + 1,
            updated_at = NOW()
    """, (ip,))
    conn.commit()
    conn.close()

class ImageRequest(BaseModel):
    image: str
    media_type: str

@app.post("/analyze")
def analyze_image(request: Request, req: ImageRequest):
    ip = request.headers.get("x-forwarded-for", request.client.host)

    analysis_count, paid = get_ip_usage(ip)
    if analysis_count >= FREE_LIMIT and not paid:
        return {
            "error": "limit_reached",
            "message": f"You've used all {FREE_LIMIT} free analyses. Unlock unlimited for $3."
        }

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
                        "text": """You are a recycling and composting assistant. Analyze this image and identify all visible items that can be sorted for disposal.

Respond with ONLY a JSON array, no markdown, no explanation, no code blocks. For each item include a bounding box as percentages of the image dimensions (0-100):
[{"disposal": "recycle", "compost", or "trash", "item": "brief name", "reason": "one sentence explanation", "bbox": {"top": 0-100, "left": 0-100, "width": 0-100, "height": 0-100}}, ...]

If only one item is visible, return an array with one object. Include every distinct item you can identify."""
                    }
                ],
            }
        ],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    result = json.loads(text)
    if isinstance(result, dict):
        result = [result]
    
    increment_ip_usage(ip)
    return {"items": result, "analyses_remaining": FREE_LIMIT - analysis_count - 1}

@app.post("/create-checkout-session")
async def create_checkout_session(request: Request):
    ip = request.headers.get("x-forwarded-for", request.client.host)
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": "Sift — Unlimited Analyses"},
                "unit_amount": 300,
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url="https://sift-tawny.vercel.app?payment=success&ip=" + ip,
        cancel_url="https://sift-tawny.vercel.app?payment=cancelled",
    )
    return {"url": session.url}