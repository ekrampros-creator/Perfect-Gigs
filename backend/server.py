from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
from supabase import create_client, Client
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase setup
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE')
supabase: Client = create_client(supabase_url, supabase_key)

# OpenAI setup
openai_api_key = os.environ.get('OPENAI_API_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserSignup(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    email: str
    name: str
    avatar_url: Optional[str] = None
    firebase_uid: str
    id_token: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[List[str]] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    show_phone: Optional[bool] = None
    show_email: Optional[bool] = None

class FreelancerRegistration(BaseModel):
    categories: List[str]
    availability: str
    location: str
    bio: str
    hourly_rate: Optional[float] = None

class GigCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    budget_min: float
    budget_max: float
    duration_start: str
    duration_end: str
    people_needed: int = 1
    is_urgent: bool = False

class GigApplication(BaseModel):
    gig_id: str
    cover_letter: Optional[str] = None

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    gig_id: Optional[str] = None

class ReviewCreate(BaseModel):
    reviewed_user_id: str
    gig_id: str
    rating: int
    comment: Optional[str] = None

class AIMessage(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

# ==================== AUTH HELPERS ====================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token = credentials.credentials
        user = supabase.auth.get_user(token)
        return user.user
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        token = credentials.credentials
        user = supabase.auth.get_user(token)
        return user.user
    except:
        return None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/signup")
async def signup(data: UserSignup):
    try:
        # Create auth user
        auth_response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password
        })
        
        if auth_response.user:
            # Create profile
            profile_data = {
                "id": auth_response.user.id,
                "email": data.email,
                "name": data.name,
                "bio": "",
                "location": "",
                "skills": [],
                "rating": 0,
                "total_reviews": 0,
                "is_freelancer": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            supabase.table("profiles").insert(profile_data).execute()
            
            return {
                "success": True,
                "user": {
                    "id": auth_response.user.id,
                    "email": data.email,
                    "name": data.name
                },
                "access_token": auth_response.session.access_token if auth_response.session else None
            }
        raise HTTPException(status_code=400, detail="Signup failed")
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auth/login")
async def login(data: UserLogin):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        
        if auth_response.user:
            # Get profile
            profile = supabase.table("profiles").select("*").eq("id", auth_response.user.id).single().execute()
            
            return {
                "success": True,
                "user": profile.data,
                "access_token": auth_response.session.access_token
            }
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/auth/me")
async def get_me(user = Depends(get_current_user)):
    try:
        profile = supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        return {"success": True, "user": profile.data}
    except Exception as e:
        logger.error(f"Get me error: {e}")
        raise HTTPException(status_code=404, detail="Profile not found")

# ==================== PROFILE ROUTES ====================

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, user = Depends(get_current_user)):
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = supabase.table("profiles").update(update_data).eq("id", user.id).execute()
        return {"success": True, "profile": result.data[0] if result.data else None}
    except Exception as e:
        logger.error(f"Update profile error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    try:
        profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        return {"success": True, "profile": profile.data}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Profile not found")

@api_router.post("/freelancer/register")
async def register_freelancer(data: FreelancerRegistration, user = Depends(get_current_user)):
    try:
        # Update profile
        profile_update = {
            "is_freelancer": True,
            "freelancer_categories": data.categories,
            "freelancer_availability": data.availability,
            "location": data.location,
            "bio": data.bio,
            "hourly_rate": data.hourly_rate,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table("profiles").update(profile_update).eq("id", user.id).execute()
        return {"success": True, "profile": result.data[0] if result.data else None}
    except Exception as e:
        logger.error(f"Freelancer registration error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== GIG ROUTES ====================

@api_router.post("/gigs")
async def create_gig(data: GigCreate, user = Depends(get_current_user)):
    try:
        gig_data = {
            "id": str(uuid.uuid4()),
            "title": data.title,
            "description": data.description,
            "category": data.category,
            "location": data.location,
            "budget_min": data.budget_min,
            "budget_max": data.budget_max,
            "duration_start": data.duration_start,
            "duration_end": data.duration_end,
            "people_needed": data.people_needed,
            "is_urgent": data.is_urgent,
            "status": "open",
            "created_by": user.id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "applications_count": 0
        }
        
        result = supabase.table("gigs").insert(gig_data).execute()
        return {"success": True, "gig": result.data[0] if result.data else None}
    except Exception as e:
        logger.error(f"Create gig error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/gigs")
async def list_gigs(
    category: Optional[str] = None,
    location: Optional[str] = None,
    is_urgent: Optional[bool] = None,
    status: str = "open",
    limit: int = 20,
    offset: int = 0
):
    try:
        query = supabase.table("gigs").select("*, profiles!gigs_created_by_fkey(name, avatar_url, rating)")
        
        if category:
            query = query.eq("category", category)
        if location:
            query = query.ilike("location", f"%{location}%")
        if is_urgent is not None:
            query = query.eq("is_urgent", is_urgent)
        if status:
            query = query.eq("status", status)
            
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        return {"success": True, "gigs": result.data, "count": len(result.data)}
    except Exception as e:
        logger.error(f"List gigs error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/gigs/{gig_id}")
async def get_gig(gig_id: str):
    try:
        result = supabase.table("gigs").select("*, profiles!gigs_created_by_fkey(name, avatar_url, rating, bio)").eq("id", gig_id).single().execute()
        return {"success": True, "gig": result.data}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Gig not found")

@api_router.post("/gigs/{gig_id}/apply")
async def apply_to_gig(gig_id: str, data: GigApplication, user = Depends(get_current_user)):
    try:
        # Check if already applied
        existing = supabase.table("applications").select("id").eq("gig_id", gig_id).eq("applicant_id", user.id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Already applied")
        
        application_data = {
            "id": str(uuid.uuid4()),
            "gig_id": gig_id,
            "applicant_id": user.id,
            "cover_letter": data.cover_letter,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table("applications").insert(application_data).execute()
        
        # Update applications count
        supabase.rpc("increment_applications_count", {"gig_id_param": gig_id}).execute()
        
        return {"success": True, "application": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apply to gig error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/gigs/{gig_id}/applications")
async def get_gig_applications(gig_id: str, user = Depends(get_current_user)):
    try:
        # Check if user owns this gig
        gig = supabase.table("gigs").select("created_by").eq("id", gig_id).single().execute()
        if gig.data["created_by"] != user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        result = supabase.table("applications").select("*, profiles!applications_applicant_id_fkey(name, avatar_url, rating, bio, skills)").eq("gig_id", gig_id).execute()
        return {"success": True, "applications": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get applications error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/applications/{application_id}/accept")
async def accept_application(application_id: str, user = Depends(get_current_user)):
    try:
        # Get application and gig
        app = supabase.table("applications").select("*, gigs!applications_gig_id_fkey(created_by)").eq("id", application_id).single().execute()
        
        if app.data["gigs"]["created_by"] != user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update application status
        supabase.table("applications").update({"status": "accepted"}).eq("id", application_id).execute()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Accept application error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/my-gigs")
async def get_my_gigs(user = Depends(get_current_user)):
    try:
        result = supabase.table("gigs").select("*").eq("created_by", user.id).order("created_at", desc=True).execute()
        return {"success": True, "gigs": result.data}
    except Exception as e:
        logger.error(f"Get my gigs error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/my-applications")
async def get_my_applications(user = Depends(get_current_user)):
    try:
        result = supabase.table("applications").select("*, gigs!applications_gig_id_fkey(*)").eq("applicant_id", user.id).order("created_at", desc=True).execute()
        return {"success": True, "applications": result.data}
    except Exception as e:
        logger.error(f"Get my applications error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== MATCHING ====================

@api_router.get("/match/gigs")
async def get_matched_gigs(user = Depends(get_current_user)):
    """Get recommended gigs for a freelancer"""
    try:
        # Get user profile
        profile = supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        
        if not profile.data.get("is_freelancer"):
            return {"success": True, "gigs": [], "message": "Register as freelancer to see matches"}
        
        # Get gigs matching categories and location
        categories = profile.data.get("freelancer_categories", [])
        location = profile.data.get("location", "")
        
        query = supabase.table("gigs").select("*, profiles!gigs_created_by_fkey(name, avatar_url, rating)").eq("status", "open")
        
        if categories:
            query = query.in_("category", categories)
        
        result = query.order("is_urgent", desc=True).order("created_at", desc=True).limit(20).execute()
        
        return {"success": True, "gigs": result.data}
    except Exception as e:
        logger.error(f"Match gigs error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/match/freelancers/{gig_id}")
async def get_matched_freelancers(gig_id: str, user = Depends(get_current_user)):
    """Get recommended freelancers for a gig"""
    try:
        # Get gig
        gig = supabase.table("gigs").select("*").eq("id", gig_id).single().execute()
        
        if gig.data["created_by"] != user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get freelancers matching category
        category = gig.data.get("category")
        
        result = supabase.table("profiles").select("*").eq("is_freelancer", True).contains("freelancer_categories", [category]).order("rating", desc=True).limit(20).execute()
        
        return {"success": True, "freelancers": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Match freelancers error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== CHAT/MESSAGES ====================

@api_router.post("/messages")
async def send_message(data: MessageCreate, user = Depends(get_current_user)):
    try:
        message_data = {
            "id": str(uuid.uuid4()),
            "sender_id": user.id,
            "receiver_id": data.receiver_id,
            "content": data.content,
            "gig_id": data.gig_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table("messages").insert(message_data).execute()
        return {"success": True, "message": result.data[0] if result.data else None}
    except Exception as e:
        logger.error(f"Send message error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/messages/{other_user_id}")
async def get_conversation(other_user_id: str, user = Depends(get_current_user)):
    try:
        # Get messages between two users
        result = supabase.table("messages").select("*").or_(
            f"and(sender_id.eq.{user.id},receiver_id.eq.{other_user_id}),and(sender_id.eq.{other_user_id},receiver_id.eq.{user.id})"
        ).order("created_at", desc=False).execute()
        
        # Mark as read
        supabase.table("messages").update({"is_read": True}).eq("receiver_id", user.id).eq("sender_id", other_user_id).execute()
        
        return {"success": True, "messages": result.data}
    except Exception as e:
        logger.error(f"Get conversation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/conversations")
async def get_conversations(user = Depends(get_current_user)):
    try:
        # Get unique conversations
        result = supabase.rpc("get_user_conversations", {"user_id_param": user.id}).execute()
        return {"success": True, "conversations": result.data}
    except Exception as e:
        logger.error(f"Get conversations error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== REVIEWS ====================

@api_router.post("/reviews")
async def create_review(data: ReviewCreate, user = Depends(get_current_user)):
    try:
        review_data = {
            "id": str(uuid.uuid4()),
            "reviewer_id": user.id,
            "reviewed_user_id": data.reviewed_user_id,
            "gig_id": data.gig_id,
            "rating": data.rating,
            "comment": data.comment,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table("reviews").insert(review_data).execute()
        
        # Update user's average rating
        reviews = supabase.table("reviews").select("rating").eq("reviewed_user_id", data.reviewed_user_id).execute()
        avg_rating = sum(r["rating"] for r in reviews.data) / len(reviews.data)
        supabase.table("profiles").update({
            "rating": round(avg_rating, 1),
            "total_reviews": len(reviews.data)
        }).eq("id", data.reviewed_user_id).execute()
        
        return {"success": True, "review": result.data[0] if result.data else None}
    except Exception as e:
        logger.error(f"Create review error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/reviews/{user_id}")
async def get_user_reviews(user_id: str):
    try:
        result = supabase.table("reviews").select("*, profiles!reviews_reviewer_id_fkey(name, avatar_url)").eq("reviewed_user_id", user_id).order("created_at", desc=True).execute()
        return {"success": True, "reviews": result.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== AI ASSISTANT ====================

GIG_CATEGORIES = [
    "Web Development", "Mobile Development", "UI/UX Design", "Graphic Design",
    "Content Writing", "Video Editing", "Social Media", "Data Entry",
    "Virtual Assistant", "Translation", "Tutoring", "Photography",
    "Music & Audio", "Marketing", "Delivery", "Other"
]

SYSTEM_PROMPT = """You are the Career Plus AI Assistant - a helpful, friendly guide for students and young professionals on our gig marketplace platform.

Your personality: Energetic, supportive, and efficient. Use casual but professional language. Be encouraging!

What you can help with:
1. Finding gigs - Ask about skills, location, availability
2. Posting gigs - Guide through title, description, budget, duration
3. Profile setup - Help users complete their profiles
4. Understanding the platform - Explain features, matching, ratings
5. General career advice - Tips for freelancing, pricing, communication

Available gig categories: """ + ", ".join(GIG_CATEGORIES) + """

IMPORTANT RULES:
- Never directly modify the database. Always suggest actions for the user to confirm.
- When helping post a gig, collect: title, description, category, location, budget range, duration, people needed, urgency
- When helping find gigs, ask about: preferred categories, location, budget expectations
- Keep responses concise but helpful
- Use emojis sparingly for friendliness
- If user wants to do something, respond with a structured action suggestion

When suggesting actions, format them as:
[ACTION_TYPE] followed by details the user should confirm.

Action types: SEARCH_GIGS, POST_GIG, UPDATE_PROFILE, APPLY_GIG, REGISTER_FREELANCER

Example:
User: "I want to find web dev gigs in Dhaka"
You: "I'll search for web development gigs in Dhaka for you! 🔍

[SEARCH_GIGS]
Category: Web Development
Location: Dhaka

Should I search with these filters?"
"""

@api_router.post("/ai/chat")
async def ai_chat(data: AIMessage, user = Depends(get_optional_user)):
    try:
        # Build context
        context_info = ""
        if user and data.context:
            if data.context.get("current_page"):
                context_info += f"\nUser is on: {data.context.get('current_page')}"
            if data.context.get("gig_id"):
                context_info += f"\nViewing gig: {data.context.get('gig_id')}"
        
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + context_info},
            {"role": "user", "content": data.message}
        ]
        
        # Call OpenAI
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 500
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI error: {response.text}")
                raise HTTPException(status_code=500, detail="AI service error")
            
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            
            # Parse for actions
            action = None
            if "[SEARCH_GIGS]" in ai_response:
                action = {"type": "SEARCH_GIGS", "data": parse_action_data(ai_response, "SEARCH_GIGS")}
            elif "[POST_GIG]" in ai_response:
                action = {"type": "POST_GIG", "data": parse_action_data(ai_response, "POST_GIG")}
            elif "[UPDATE_PROFILE]" in ai_response:
                action = {"type": "UPDATE_PROFILE", "data": parse_action_data(ai_response, "UPDATE_PROFILE")}
            elif "[APPLY_GIG]" in ai_response:
                action = {"type": "APPLY_GIG", "data": parse_action_data(ai_response, "APPLY_GIG")}
            elif "[REGISTER_FREELANCER]" in ai_response:
                action = {"type": "REGISTER_FREELANCER", "data": parse_action_data(ai_response, "REGISTER_FREELANCER")}
            
            return {
                "success": True,
                "response": ai_response,
                "action": action
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def parse_action_data(text: str, action_type: str) -> Dict[str, Any]:
    """Parse action data from AI response"""
    data = {}
    try:
        # Find text after action marker
        marker = f"[{action_type}]"
        start = text.find(marker) + len(marker)
        end = text.find("[", start) if "[" in text[start:] else len(text)
        action_text = text[start:end].strip()
        
        # Parse key: value pairs
        for line in action_text.split("\n"):
            if ":" in line:
                key, value = line.split(":", 1)
                key = key.strip().lower().replace(" ", "_")
                value = value.strip()
                if value:
                    data[key] = value
    except:
        pass
    return data

# ==================== QUICK ACTIONS ====================

@api_router.get("/categories")
async def get_categories():
    return {"success": True, "categories": GIG_CATEGORIES}

@api_router.get("/stats")
async def get_stats():
    try:
        gigs_count = supabase.table("gigs").select("id", count="exact").eq("status", "open").execute()
        freelancers_count = supabase.table("profiles").select("id", count="exact").eq("is_freelancer", True).execute()
        
        return {
            "success": True,
            "stats": {
                "open_gigs": gigs_count.count or 0,
                "freelancers": freelancers_count.count or 0
            }
        }
    except Exception as e:
        return {"success": True, "stats": {"open_gigs": 0, "freelancers": 0}}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Career Plus API", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down...")
