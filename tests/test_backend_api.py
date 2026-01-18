"""
Backend API Tests for Perfect Gigs Marketplace
Tests: Auth (signup/login), Gigs, Freelancers, AI Chat
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://talentplus-3.preview.emergentagent.com')

# Test user credentials
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@perfectgigs.com"
TEST_PASSWORD = "test123456"
TEST_NAME = "Test User"

class TestHealthEndpoints:
    """Health check endpoints"""
    
    def test_api_health(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_api_root(self):
        """Test /api/ root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Perfect Gigs API" in data.get("message", "")
        print(f"✓ API root check passed: {data}")


class TestCategories:
    """Categories endpoint tests"""
    
    def test_get_categories(self):
        """Test /api/categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "categories" in data
        assert len(data["categories"]) > 0
        assert "Web Development" in data["categories"]
        print(f"✓ Categories: {len(data['categories'])} categories found")


class TestStats:
    """Stats endpoint tests"""
    
    def test_get_stats(self):
        """Test /api/stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        print(f"✓ Stats: {data['stats']}")


class TestAuthSignup:
    """Authentication signup tests"""
    
    def test_signup_new_user(self):
        """Test user signup with email/password"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@perfectgigs.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "user" in data
        assert "access_token" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == TEST_NAME
        print(f"✓ Signup successful for: {unique_email}")
        return data
    
    def test_signup_duplicate_email(self):
        """Test signup with duplicate email fails"""
        # First signup
        unique_email = f"test_{uuid.uuid4().hex[:8]}@perfectgigs.com"
        response1 = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        assert response1.status_code == 200
        
        # Second signup with same email should fail
        response2 = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": "Another User"
        })
        assert response2.status_code == 400
        print(f"✓ Duplicate email correctly rejected")


class TestAuthLogin:
    """Authentication login tests"""
    
    def test_login_with_valid_credentials(self):
        """Test login with valid email/password"""
        # First create a user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@perfectgigs.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        assert signup_response.status_code == 200
        
        # Now login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        data = login_response.json()
        assert data["success"] == True
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        print(f"✓ Login successful for: {unique_email}")
        return data
    
    def test_login_with_invalid_credentials(self):
        """Test login with wrong password fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials correctly rejected")


class TestAuthMe:
    """Auth /me endpoint tests"""
    
    def test_get_me_authenticated(self):
        """Test /api/auth/me with valid token"""
        # Create and login user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@perfectgigs.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        token = signup_response.json()["access_token"]
        
        # Get me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["user"]["email"] == unique_email
        print(f"✓ Get me successful for: {unique_email}")
    
    def test_get_me_unauthenticated(self):
        """Test /api/auth/me without token fails"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print(f"✓ Unauthenticated /me correctly rejected")


class TestGigs:
    """Gigs CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@perfectgigs.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        return response.json()["access_token"]
    
    def test_list_gigs(self):
        """Test listing gigs (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/gigs")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "gigs" in data
        print(f"✓ List gigs: {len(data['gigs'])} gigs found")
    
    def test_create_gig_authenticated(self, auth_token):
        """Test creating a gig with authentication"""
        gig_data = {
            "title": f"TEST_Gig_{uuid.uuid4().hex[:6]}",
            "description": "Test gig description for automated testing",
            "category": "Web Development",
            "location": "Remote",
            "budget_min": 100,
            "budget_max": 500,
            "duration_start": datetime.now().strftime("%Y-%m-%d"),
            "duration_end": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "people_needed": 1,
            "is_urgent": False
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", 
            json=gig_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "gig" in data
        assert data["gig"]["title"] == gig_data["title"]
        print(f"✓ Gig created: {data['gig']['title']}")
        return data["gig"]
    
    def test_create_gig_unauthenticated(self):
        """Test creating a gig without auth fails"""
        gig_data = {
            "title": "Test Gig",
            "description": "Test description",
            "category": "Web Development",
            "location": "Remote",
            "budget_min": 100,
            "budget_max": 500,
            "duration_start": datetime.now().strftime("%Y-%m-%d"),
            "duration_end": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "people_needed": 1,
            "is_urgent": False
        }
        
        response = requests.post(f"{BASE_URL}/api/gigs", json=gig_data)
        assert response.status_code == 401
        print(f"✓ Unauthenticated gig creation correctly rejected")


class TestFreelancers:
    """Freelancers endpoint tests"""
    
    def test_list_freelancers(self):
        """Test listing freelancers (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/freelancers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "freelancers" in data
        print(f"✓ List freelancers: {len(data['freelancers'])} freelancers found")
    
    def test_list_freelancers_with_category_filter(self):
        """Test filtering freelancers by category"""
        response = requests.get(f"{BASE_URL}/api/freelancers", params={
            "category": "Web Development"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Filtered freelancers: {len(data['freelancers'])} found for Web Development")


class TestFreelancerRegistration:
    """Freelancer registration tests"""
    
    def test_register_as_freelancer(self):
        """Test registering as a freelancer"""
        # Create user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@perfectgigs.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        token = signup_response.json()["access_token"]
        
        # Register as freelancer
        freelancer_data = {
            "categories": ["Web Development", "Mobile Development"],
            "availability": "Full-time",
            "location": "Remote",
            "bio": "Test freelancer bio for automated testing",
            "hourly_rate": 50
        }
        
        response = requests.post(f"{BASE_URL}/api/freelancer/register",
            json=freelancer_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["profile"]["is_freelancer"] == True
        print(f"✓ Freelancer registration successful")
    
    def test_register_freelancer_unauthenticated(self):
        """Test freelancer registration without auth fails"""
        freelancer_data = {
            "categories": ["Web Development"],
            "availability": "Full-time",
            "location": "Remote",
            "bio": "Test bio"
        }
        
        response = requests.post(f"{BASE_URL}/api/freelancer/register", json=freelancer_data)
        assert response.status_code == 401
        print(f"✓ Unauthenticated freelancer registration correctly rejected")


class TestAIChat:
    """AI Chat endpoint tests"""
    
    def test_ai_chat_unauthenticated(self):
        """Test AI chat without authentication (should work)"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Hello, what can you help me with?",
            "context": {}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "response" in data
        assert len(data["response"]) > 0
        print(f"✓ AI chat response received (unauthenticated)")
    
    def test_ai_chat_authenticated(self):
        """Test AI chat with authentication"""
        # Create user
        unique_email = f"test_{uuid.uuid4().hex[:8]}@perfectgigs.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        token = signup_response.json()["access_token"]
        
        response = requests.post(f"{BASE_URL}/api/ai/chat",
            json={
                "message": "I want to post a gig",
                "context": {"is_authenticated": True}
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "response" in data
        print(f"✓ AI chat response received (authenticated)")
    
    def test_ai_chat_with_conversation_history(self):
        """Test AI chat with conversation history for memory"""
        conversation_history = [
            {"role": "user", "content": "Hi, I'm looking for web development work"},
            {"role": "assistant", "content": "Great! I can help you find web development gigs."},
            {"role": "user", "content": "What categories are available?"}
        ]
        
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Can you remember what I was looking for?",
            "context": {
                "conversation_history": conversation_history
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "response" in data
        # The AI should remember the context
        print(f"✓ AI chat with conversation history works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
