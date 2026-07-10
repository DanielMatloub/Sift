# Sift

Take a photo of any item to instantly find out if it can be recycled.

**Live demo:** https://sift-tawny.vercel.app

## What it does

Point your camera at any item or upload a photo to get an instant recycling decision powered by Claude's vision AI. Sift identifies the item, tells you whether it's recyclable, and explains why in plain English.

## Tech stack

- **Frontend:** React
- **Backend:** FastAPI (Python)
- **AI:** Anthropic Claude API (vision)
- **Deployment:** Railway (backend), Vercel (frontend)

## How it works

1. User takes or uploads a photo
2. Image is converted to base64 and sent to the FastAPI backend
3. Backend sends the image to Claude with a recycling analysis prompt
4. Claude identifies the item and returns a recyclable/not recyclable verdict with a reason
5. Result is displayed with a clear visual indicator

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
```

## Roadmap

- Highlight recyclable parts of an image with bounding boxes
- Compost detection
- Multi-item analysis

