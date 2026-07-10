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
FREE_LIMIT = 1

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
                        "text": """You are a recycling assistant. Analyze this image and determine if the item shown can be recycled.

Respond with ONLY a JSON object, no markdown, no explanation, no code blocks:
{"recyclable": true or false, "item": "brief name of the item", "reason": "one sentence explanation"}"""
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

    increment_ip_usage(ip)
    result["analyses_remaining"] = FREE_LIMIT - analysis_count - 1
    return result

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