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
from datetime import datetime, timezone, timedelta
import httpx
from supabase import create_client, Client
import json
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase setup
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE')
supabase: Client = create_client(supabase_url, supabase_key)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings (using Supabase JWT secret for compatibility)
JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', 'm4soO9yIK7mCxM2LZYlFCmfoM5M95CX9HITEbRE+u016ceMuxdAxoaeZrvOO9rSKiRj2JqvhwLJCsKhrEj8R/A==')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

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
    conversation_history: Optional[List[Dict[str, str]]] = None

# ==================== AUTH HELPERS ====================

def create_access_token(user_id: str, email: str) -> str:
    """Create JWT access token"""
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expiration,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token = credentials.credentials
        # Decode our custom JWT
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Return a simple user object
        class UserObj:
            def __init__(self, id, email):
                self.id = id
                self.email = email
        
        return UserObj(user_id, payload.get("email"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        class UserObj:
            def __init__(self, id, email):
                self.id = id
                self.email = email
        
        return UserObj(user_id, payload.get("email"))
    except:
        return None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/signup")
async def signup(data: UserSignup):
    try:
        # Check if email already exists
        existing = supabase.table("profiles").select("id").eq("email", data.email).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user profile with hashed password
        user_id = str(uuid.uuid4())
        hashed_password = hash_password(data.password)
        
        profile_data = {
            "id": user_id,
            "email": data.email,
            "name": data.name,
            "password_hash": hashed_password,
            "bio": "",
            "location": "",
            "skills": [],
            "rating": 0,
            "total_reviews": 0,
            "is_freelancer": False,
            "show_phone": False,
            "show_email": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("profiles").insert(profile_data).execute()
        
        # Create access token
        access_token = create_access_token(user_id, data.email)
        
        # Remove password hash from response
        del profile_data["password_hash"]
        
        return {
            "success": True,
            "user": profile_data,
            "access_token": access_token
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auth/login")
async def login(data: UserLogin):
    try:
        # Find user by email
        result = supabase.table("profiles").select("*").eq("email", data.email).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user = result.data[0]
        
        # Verify password
        if not user.get("password_hash"):
            # User might have registered with Google only
            raise HTTPException(status_code=401, detail="Please use Google Sign-in for this account")
        
        if not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create access token
        access_token = create_access_token(user["id"], user["email"])
        
        # Remove password hash from response
        user_response = {k: v for k, v in user.items() if k != "password_hash"}
        
        return {
            "success": True,
            "user": user_response,
            "access_token": access_token
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/auth/google")
async def google_auth(data: GoogleAuthRequest):
    """Handle Google Sign-in - creates or updates user in database"""
    try:
        # Check if user already exists by email
        existing = supabase.table("profiles").select("*").eq("email", data.email).execute()
        
        if existing.data and len(existing.data) > 0:
            # User exists, update and return
            user_id = existing.data[0]["id"]
            update_data = {
                "avatar_url": data.avatar_url,
                "firebase_uid": data.firebase_uid,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            supabase.table("profiles").update(update_data).eq("id", user_id).execute()
            
            profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            
            # Create our JWT token
            access_token = create_access_token(user_id, data.email)
            
            # Remove password hash from response
            user_data = {k: v for k, v in profile.data.items() if k != "password_hash"}
            
            return {
                "success": True,
                "user": user_data,
                "access_token": access_token
            }
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            profile_data = {
                "id": user_id,
                "email": data.email,
                "name": data.name,
                "avatar_url": data.avatar_url,
                "firebase_uid": data.firebase_uid,
                "bio": "",
                "location": "",
                "skills": [],
                "rating": 0,
                "total_reviews": 0,
                "is_freelancer": False,
                "show_phone": False,
                "show_email": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            supabase.table("profiles").insert(profile_data).execute()
            
            # Create our JWT token
            access_token = create_access_token(user_id, data.email)
            
            return {
                "success": True,
                "user": profile_data,
                "access_token": access_token
            }
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auth/me")
async def get_me(user = Depends(get_current_user)):
    try:
        profile = supabase.table("profiles").select("*").eq("id", user.id).single().execute()
        # Remove password hash from response
        user_data = {k: v for k, v in profile.data.items() if k != "password_hash"}
        return {"success": True, "user": user_data}
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

# ==================== FREELANCERS ====================

@api_router.get("/freelancers")
async def list_freelancers(
    category: Optional[str] = None,
    location: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
):
    try:
        query = supabase.table("profiles").select("id, name, bio, location, skills, rating, total_reviews, hourly_rate, freelancer_categories, freelancer_availability, email, phone, show_email, show_phone, avatar_url").eq("is_freelancer", True)
        
        if category:
            query = query.contains("freelancer_categories", [category])
        if location:
            query = query.ilike("location", f"%{location}%")
            
        query = query.order("rating", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        # Filter out private contact info
        freelancers = []
        for f in result.data:
            freelancer = {**f}
            if not freelancer.get("show_email"):
                freelancer["email"] = None
            if not freelancer.get("show_phone"):
                freelancer["phone"] = None
            freelancers.append(freelancer)
        
        return {"success": True, "freelancers": freelancers, "count": len(freelancers)}
    except Exception as e:
        logger.error(f"List freelancers error: {e}")
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

SYSTEM_PROMPT = """You are Ishan, the Perfect Gigs AI Assistant - a smart, helpful, and adaptive guide for students and young professionals on our gig marketplace platform.

PERSONALITY & TONE:
- Adapt to the user's communication style automatically
- If user uses Gen-Z slang (yo, bet, fr, no cap, fire, slay), match their vibe
- If user is formal, be professional and polite
- If user is casual, be friendly and conversational
- Always be helpful, encouraging, and efficient

CAPABILITIES - What you CAN help with:
1. **Finding gigs** - Search and recommend gigs based on skills, location, preferences
2. **Posting gigs** - Guide users through creating job postings
3. **Profile setup** - Help users complete and improve their profiles
4. **Freelancer registration** - Help users register as freelancers
5. **Platform guidance** - Explain features, how matching works, ratings system
6. **Career advice** - Tips for freelancing, pricing, communication, portfolio building

Available gig categories: """ + ", ".join(GIG_CATEGORIES) + """

IMPORTANT BEHAVIORAL RULES:
1. REMEMBER the conversation context - if user was posting a gig, continue helping with that
2. Ask ONE question at a time to make it easy for users
3. Keep responses concise but helpful (2-4 sentences usually)
4. Be encouraging and supportive
5. If user says something unclear, ask for clarification politely
6. When user wants to take an action, help them do it step by step

ACTIONS FORMAT:
When the user wants to take an action, format it clearly:
[ACTION_TYPE]
Details...

Action types: SEARCH_GIGS, POST_GIG, UPDATE_PROFILE, APPLY_GIG, REGISTER_FREELANCER

CONTEXT AWARENESS:
- Remember what the user has said in previous messages
- Continue ongoing conversations naturally
- If user was in the middle of something, remind them and continue
- Be aware of user's authentication status and freelancer status

Example responses by tone:

Gen-Z user: "yo i wanna post a gig fr"
→ "bet! let's get your gig posted real quick 🔥 what's the title gonna be?"

Formal user: "I would like to post a job listing"
→ "I'd be happy to assist you with posting a job listing. What title would you like for your gig?"

Casual user: "hey can you help me find some work"
→ "Sure thing! What kind of work are you looking for? Any specific category or skill?"
"""

@api_router.post("/ai/chat")
async def ai_chat(data: AIMessage, user = Depends(get_optional_user)):
    try:
        # Build context
        context_info = "\n\nCURRENT CONTEXT:"
        if user:
            context_info += f"\n- User is logged in"
            if data.context and data.context.get("is_freelancer"):
                context_info += f"\n- User IS a freelancer (can browse and apply to gigs)"
            else:
                context_info += f"\n- User is NOT a freelancer yet"
        else:
            context_info += f"\n- User is NOT logged in"
        
        if data.context:
            if data.context.get("current_page"):
                context_info += f"\n- User is on page: {data.context.get('current_page')}"
            if data.context.get("user_tone"):
                context_info += f"\n- User's detected tone: {data.context.get('user_tone')}"
        
        # Build messages with conversation history
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + context_info}
        ]
        
        # Add conversation history (last 30 messages)
        if data.context and data.context.get("conversation_history"):
            history = data.context.get("conversation_history", [])[-30:]
            for msg in history:
                if msg.get("role") in ["user", "assistant"] and msg.get("content"):
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
        
        # Add current message
        messages.append({"role": "user", "content": data.message})
        
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
                    "max_tokens": 600
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
    return {"message": "Perfect Gigs API", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== TELEGRAM BOT ====================

# Store telegram user sessions (in production, use Redis or DB)
telegram_sessions: Dict[str, Dict] = {}

class TelegramMessage(BaseModel):
    chat_id: str
    message: str
    user_name: Optional[str] = None

class TelegramWebhook(BaseModel):
    update_id: int
    message: Optional[Dict[str, Any]] = None

# Telegram wizard steps
TELEGRAM_GIG_STEPS = [
    {"key": "title", "question": "What's the title of your gig?"},
    {"key": "description", "question": "Describe what you need done:"},
    {"key": "category", "question": f"What category? Choose from:\n{', '.join(GIG_CATEGORIES)}"},
    {"key": "location", "question": "Where is this gig based? (or 'Remote')"},
    {"key": "budget", "question": "What's your budget range? (e.g., 50-100)"},
    {"key": "duration", "question": "How many days until deadline? (e.g., 7, 14, 30)"},
]

TELEGRAM_FREELANCER_STEPS = [
    {"key": "categories", "question": f"What skills do you offer? (comma-separated)\nCategories: {', '.join(GIG_CATEGORIES[:8])}..."},
    {"key": "availability", "question": "Your availability? (Full-time, Part-time, Weekends, Flexible)"},
    {"key": "location", "question": "Where are you located?"},
    {"key": "bio", "question": "Tell me about yourself and your experience:"},
]

@api_router.post("/telegram/chat")
async def telegram_chat(data: TelegramMessage):
    """Handle Telegram chat - uses wizard for gig posting and freelancer registration"""
    try:
        chat_id = data.chat_id
        message = data.message.strip()
        
        # Get or create session
        if chat_id not in telegram_sessions:
            telegram_sessions[chat_id] = {
                "history": [],
                "wizard_mode": None,
                "wizard_step": 0,
                "wizard_data": {},
                "user_name": data.user_name or "User"
            }
        
        session = telegram_sessions[chat_id]
        session["user_name"] = data.user_name or session.get("user_name", "User")
        
        # Add to history
        session["history"].append({"role": "user", "content": message})
        session["history"] = session["history"][-30:]
        
        # Check if in wizard mode
        if session["wizard_mode"]:
            return await handle_telegram_wizard(session, message, chat_id)
        
        # Check for action intents
        lower_msg = message.lower()
        
        if any(word in lower_msg for word in ["post gig", "create gig", "new gig", "post a gig", "create a gig"]):
            session["wizard_mode"] = "post_gig"
            session["wizard_step"] = 0
            session["wizard_data"] = {}
            step = TELEGRAM_GIG_STEPS[0]
            response = f"Let's create your gig! 📝\n\n{step['question']}"
            session["history"].append({"role": "assistant", "content": response})
            return {"success": True, "response": response}
        
        if any(word in lower_msg for word in ["register freelancer", "become freelancer", "freelancer registration", "register as freelancer"]):
            session["wizard_mode"] = "register_freelancer"
            session["wizard_step"] = 0
            session["wizard_data"] = {}
            step = TELEGRAM_FREELANCER_STEPS[0]
            response = f"Let's set you up as a freelancer! 🚀\n\n{step['question']}"
            session["history"].append({"role": "assistant", "content": response})
            return {"success": True, "response": response}
        
        if any(word in lower_msg for word in ["find gig", "search gig", "find work", "search work", "find job", "browse gig"]):
            # Extract category if mentioned
            category = None
            for cat in GIG_CATEGORIES:
                if cat.lower() in lower_msg:
                    category = cat
                    break
            
            gigs = await search_gigs_for_telegram(category)
            if gigs:
                response = f"🔍 Found {len(gigs)} gigs:\n\n"
                for i, g in enumerate(gigs, 1):
                    response += f"{i}. **{g['title']}**\n   💰 ${g['budget_min']}-${g['budget_max']} | 📍 {g['location']}\n\n"
                response += "Want to apply? Visit: https://talentplus-3.preview.emergentagent.com/gigs"
            else:
                response = "No gigs found. Try different keywords or check back later!"
            
            session["history"].append({"role": "assistant", "content": response})
            return {"success": True, "response": response}
        
        # Default: Use AI for general conversation
        response = await get_telegram_ai_response(session, message)
        session["history"].append({"role": "assistant", "content": response})
        return {"success": True, "response": response}
        
    except Exception as e:
        logger.error(f"Telegram chat error: {e}")
        return {"success": False, "response": "Something went wrong. Try again!"}

async def handle_telegram_wizard(session: Dict, message: str, chat_id: str):
    """Handle wizard steps for Telegram"""
    try:
        mode = session["wizard_mode"]
        step_idx = session["wizard_step"]
        
        # Check for cancel
        if message.lower() in ["cancel", "stop", "quit", "exit"]:
            session["wizard_mode"] = None
            session["wizard_step"] = 0
            session["wizard_data"] = {}
            response = "Cancelled! What else can I help with?"
            session["history"].append({"role": "assistant", "content": response})
            return {"success": True, "response": response}
        
        if mode == "post_gig":
            steps = TELEGRAM_GIG_STEPS
            current_step = steps[step_idx]
            
            # Save current answer
            session["wizard_data"][current_step["key"]] = message
            
            # Move to next step or complete
            if step_idx + 1 < len(steps):
                session["wizard_step"] = step_idx + 1
                next_step = steps[step_idx + 1]
                response = f"Got it! ✅\n\n{next_step['question']}"
            else:
                # Complete - create gig
                result = await create_gig_from_telegram(session["wizard_data"], chat_id, session["user_name"])
                session["wizard_mode"] = None
                session["wizard_step"] = 0
                
                if result:
                    response = f"🎉 **Gig Posted Successfully!**\n\n"
                    response += f"**Title:** {result['title']}\n"
                    response += f"**Category:** {result['category']}\n"
                    response += f"**Budget:** ${result['budget_min']}-${result['budget_max']}\n"
                    response += f"**Location:** {result['location']}\n\n"
                    response += f"View it at: https://talentplus-3.preview.emergentagent.com/gigs/{result['id']}"
                    session["wizard_data"] = {}
                else:
                    response = "Failed to create gig. Please try again!"
                    session["wizard_data"] = {}
            
            session["history"].append({"role": "assistant", "content": response})
            return {"success": True, "response": response}
        
        elif mode == "register_freelancer":
            steps = TELEGRAM_FREELANCER_STEPS
            current_step = steps[step_idx]
            
            # Save current answer
            session["wizard_data"][current_step["key"]] = message
            
            # Move to next step or complete
            if step_idx + 1 < len(steps):
                session["wizard_step"] = step_idx + 1
                next_step = steps[step_idx + 1]
                response = f"Great! ✅\n\n{next_step['question']}"
            else:
                # Complete - register freelancer
                result = await register_freelancer_from_telegram(session["wizard_data"], chat_id, session["user_name"])
                session["wizard_mode"] = None
                session["wizard_step"] = 0
                
                if result:
                    response = f"🎉 **You're now a freelancer!**\n\n"
                    response += f"**Skills:** {', '.join(result['categories'])}\n"
                    response += f"**Availability:** {result['availability']}\n"
                    response += f"**Location:** {result['location']}\n\n"
                    response += "Start finding gigs by saying 'find gigs'!"
                    session["wizard_data"] = {}
                else:
                    response = "Failed to register. Please try again!"
                    session["wizard_data"] = {}
            
            session["history"].append({"role": "assistant", "content": response})
            return {"success": True, "response": response}
        
        # Unknown wizard mode
        session["wizard_mode"] = None
        return {"success": True, "response": "Something went wrong. Try again!"}
        
    except Exception as e:
        logger.error(f"Telegram wizard error: {e}")
        session["wizard_mode"] = None
        return {"success": False, "response": "Error processing. Try again!"}

async def create_gig_from_telegram(data: Dict, chat_id: str, user_name: str) -> Optional[Dict]:
    """Actually create a gig in the database from Telegram"""
    try:
        # Parse budget
        budget_str = data.get("budget", "50-100")
        budget_parts = budget_str.replace("$", "").replace(" ", "").split("-")
        budget_min = float(budget_parts[0]) if budget_parts else 50
        budget_max = float(budget_parts[-1]) if len(budget_parts) > 1 else budget_min * 2
        
        # Parse duration
        duration_days = int(data.get("duration", "30").split()[0])
        
        # First ensure telegram user exists in profiles
        user_id = f"telegram_{chat_id}"
        existing_user = supabase.table("profiles").select("id").eq("id", user_id).execute()
        
        if not existing_user.data:
            # Create profile for telegram user
            profile_data = {
                "id": user_id,
                "email": f"{user_id}@telegram.user",
                "name": user_name,
                "bio": "Telegram User",
                "location": "",
                "skills": [],
                "rating": 0,
                "total_reviews": 0,
                "is_freelancer": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            supabase.table("profiles").insert(profile_data).execute()
            logger.info(f"Created telegram user profile: {user_id}")
        
        gig_id = str(uuid.uuid4())
        gig_data = {
            "id": gig_id,
            "title": data.get("title", "Untitled"),
            "description": data.get("description", ""),
            "category": data.get("category", "Other"),
            "location": data.get("location", "Remote"),
            "budget_min": budget_min,
            "budget_max": budget_max,
            "duration_start": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "duration_end": (datetime.now(timezone.utc) + timedelta(days=duration_days)).strftime("%Y-%m-%d"),
            "people_needed": 1,
            "is_urgent": False,
            "status": "open",
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "applications_count": 0
        }
        
        result = supabase.table("gigs").insert(gig_data).execute()
        logger.info(f"Created gig from Telegram: {gig_id}")
        
        return gig_data
        
    except Exception as e:
        logger.error(f"Create gig from telegram error: {e}")
        return None

async def register_freelancer_from_telegram(data: Dict, chat_id: str, user_name: str) -> Optional[Dict]:
    """Actually register freelancer in database from Telegram"""
    try:
        user_id = f"telegram_{chat_id}"
        categories = [c.strip() for c in data.get("categories", "Other").split(",")]
        
        profile_data = {
            "is_freelancer": True,
            "freelancer_categories": categories,
            "freelancer_availability": data.get("availability", "Flexible"),
            "location": data.get("location", ""),
            "bio": data.get("bio", ""),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Check if user exists
        existing = supabase.table("profiles").select("id").eq("id", user_id).execute()
        
        if existing.data:
            supabase.table("profiles").update(profile_data).eq("id", user_id).execute()
        else:
            profile_data["id"] = user_id
            profile_data["email"] = f"{user_id}@telegram.user"
            profile_data["name"] = user_name
            profile_data["skills"] = []
            profile_data["rating"] = 0
            profile_data["total_reviews"] = 0
            profile_data["created_at"] = datetime.now(timezone.utc).isoformat()
            supabase.table("profiles").insert(profile_data).execute()
        
        logger.info(f"Registered freelancer from Telegram: {user_id}")
        
        return {
            "categories": categories,
            "availability": data.get("availability", "Flexible"),
            "location": data.get("location", "")
        }
        
    except Exception as e:
        logger.error(f"Register freelancer from telegram error: {e}")
        return None

async def search_gigs_for_telegram(category: Optional[str] = None) -> List[Dict]:
    """Search gigs for Telegram response"""
    try:
        query = supabase.table("gigs").select("id, title, budget_min, budget_max, location, category").eq("status", "open")
        
        if category:
            query = query.ilike("category", f"%{category}%")
        
        result = query.order("created_at", desc=True).limit(5).execute()
        return result.data or []
        
    except Exception as e:
        logger.error(f"Search gigs for telegram error: {e}")
        return []

async def get_telegram_ai_response(session: Dict, message: str) -> str:
    """Get AI response for general conversation"""
    try:
        system_prompt = f"""You are Ishan, the Perfect Gigs AI assistant on Telegram. Be helpful, friendly, and concise.

You help with:
- Post a gig (say "post a gig" or "create a gig")
- Register as freelancer (say "register as freelancer")  
- Find gigs (say "find gigs" or "search gigs")
- Answer questions about freelancing

Keep responses short for Telegram. Use emojis sparingly.
User's name: {session.get('user_name', 'User')}"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(session["history"][-10:])
        
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
                    "max_tokens": 300
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                return "I'm having trouble right now. Try: 'post a gig', 'register as freelancer', or 'find gigs'"
                
    except Exception as e:
        logger.error(f"Telegram AI response error: {e}")
        return "Hi! I can help you post gigs, register as a freelancer, or find work. What would you like to do?"

@api_router.post("/telegram/webhook")
async def telegram_webhook(update: TelegramWebhook):
    """Webhook endpoint for Telegram bot updates"""
    try:
        if not update.message:
            return {"ok": True}
        
        chat_id = str(update.message.get("chat", {}).get("id", ""))
        text = update.message.get("text", "")
        user_name = update.message.get("from", {}).get("first_name", "User")
        
        if not chat_id or not text:
            return {"ok": True}
        
        # Process through chat endpoint
        result = await telegram_chat(TelegramMessage(
            chat_id=chat_id,
            message=text,
            user_name=user_name
        ))
        
        return {"ok": True, "result": result}
    except Exception as e:
        logger.error(f"Telegram webhook error: {e}")
        return {"ok": False, "error": str(e)}

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
