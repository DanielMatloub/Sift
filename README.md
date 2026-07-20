# Sift

Take a photo of any item to instantly find out how to dispose of it.

**Live demo:** https://sift-tawny.vercel.app

![Sift UI](screenshots/desktop.png)

## What it does

Point your camera at any item or upload a photo to get an instant disposal decision powered by Claude's vision AI. Sift identifies every item in the photo, tells you whether each one is recyclable, compostable, or trash, and draws bounding boxes around each item.

## Features

- Multi-item detection — identifies every distinct item in a photo
- Bounding box overlays — highlights each item directly on the image
- Three-category sorting — recycle, compost, or trash
- 10 free analyses per user, then $3 for unlimited via Stripe

## Tech stack

- **Frontend:** React
- **Backend:** FastAPI (Python)
- **AI:** Anthropic Claude API (vision)
- **Payments:** Stripe
- **Deployment:** Railway (backend), Vercel (frontend)

## How it works

1. User takes or uploads a photo
2. Image is converted to base64 and sent to the FastAPI backend
3. Backend sends the image to Claude with a disposal analysis prompt
4. Claude identifies each item, assigns a disposal category, and returns bounding box coordinates
5. Results are displayed as labeled boxes on the image with item cards below

## Running locally

**Prerequisites:** Python 3.11+, Node.js

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm start
```

Add a `.env` file in `backend/` with:
```bash
ANTHROPIC_API_KEY=your-key-here
STRIPE_SECRET_KEY=your-key-here
DATABASE_URL=your-supabase-url-here
```

## Roadmap

- Improved bounding box accuracy
- Location-aware disposal rules (rules vary by city)
- Browser extension for scanning items on shopping sites

