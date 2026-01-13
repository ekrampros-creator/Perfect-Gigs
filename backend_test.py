import requests
import sys
import json
from datetime import datetime, timedelta

class CareerPlusAPITester:
    def __init__(self, base_url="https://careerplus-gigs.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"success": True}
            return {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        self.run_test("Health Check", "GET", "", 200)
        self.run_test("API Health", "GET", "health", 200)

    def test_categories_and_stats(self):
        """Test public endpoints"""
        print("\n🔍 Testing Public Endpoints...")
        self.run_test("Get Categories", "GET", "categories", 200)
        self.run_test("Get Stats", "GET", "stats", 200)

    def test_auth_signup(self):
        """Test user signup"""
        print("\n🔍 Testing Authentication - Signup...")
        
        # Generate unique test user with more standard email
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "email": f"testuser{timestamp}@gmail.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data=test_user
        )
        
        print(f"   Signup response: {response}")
        
        if response and response.get('success'):
            self.token = response.get('access_token')
            self.user_id = response.get('user', {}).get('id')
            self.test_email = test_user['email']
            self.test_password = test_user['password']
            
            # If we got a token from signup, we can skip login
            if self.token:
                print(f"   Got token from signup, user_id: {self.user_id}")
                return True
            else:
                print("   No token from signup, will need to login")
            return True
        return False

    def test_auth_login(self):
        """Test user login"""
        print("\n🔍 Testing Authentication - Login...")
        
        # If we already have a token from signup, skip login
        if self.token:
            print("   Skipping login - already have token from signup")
            return True
        
        if not hasattr(self, 'test_email'):
            self.log_test("Login Test", False, "No test user created")
            return False
        
        # Try login - this may fail if email confirmation is required
        response = self.run_test(
            "User Login (may require email confirmation)",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_email, "password": self.test_password}
        )
        
        if response and response.get('success'):
            self.token = response.get('access_token')
            return True
        else:
            # If login fails, it's likely due to email confirmation requirement
            print("   Login failed - likely requires email confirmation (expected for Supabase)")
            # For testing purposes, let's try with a pre-existing confirmed user
            return self.try_existing_user_login()
    
    def try_existing_user_login(self):
        """Try to login with a potentially existing confirmed user"""
        print("   Trying login with test credentials...")
        
        # Try with common test credentials that might exist
        test_credentials = [
            {"email": "test@careerplus.com", "password": "password123"},
            {"email": "admin@test.com", "password": "admin123"},
            {"email": "demo@demo.com", "password": "demo123"}
        ]
        
        for creds in test_credentials:
            response = self.run_test(
                f"Login attempt with {creds['email']}",
                "POST", 
                "auth/login",
                200,
                data=creds
            )
            
            if response and response.get('success'):
                self.token = response.get('access_token')
                self.user_id = response.get('user', {}).get('id')
                print(f"   Successfully logged in with {creds['email']}")
                return True
        
        print("   No existing test users found - will test public endpoints only")
        return False

    def test_auth_me(self):
        """Test get current user"""
        print("\n🔍 Testing Get Current User...")
        self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_profile_operations(self):
        """Test profile operations"""
        print("\n🔍 Testing Profile Operations...")
        
        # Update profile
        profile_data = {
            "name": "Updated Test User",
            "bio": "Test bio for Career Plus",
            "location": "Dhaka, Bangladesh",
            "skills": ["Python", "React", "Node.js"]
        }
        
        self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data=profile_data
        )
        
        # Get profile
        if self.user_id:
            self.run_test(
                "Get Profile by ID",
                "GET",
                f"profile/{self.user_id}",
                200
            )

    def test_freelancer_registration(self):
        """Test freelancer registration"""
        print("\n🔍 Testing Freelancer Registration...")
        
        freelancer_data = {
            "categories": ["Web Development", "Mobile Development"],
            "availability": "Full-time",
            "location": "Dhaka, Bangladesh",
            "bio": "Experienced full-stack developer",
            "hourly_rate": 25.0
        }
        
        self.run_test(
            "Register as Freelancer",
            "POST",
            "freelancer/register",
            200,
            data=freelancer_data
        )

    def test_gig_operations(self):
        """Test gig CRUD operations"""
        print("\n🔍 Testing Gig Operations...")
        
        # Create gig
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        next_week = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        
        gig_data = {
            "title": "Build a React Dashboard",
            "description": "Need a modern React dashboard with charts and analytics",
            "category": "Web Development",
            "location": "Remote",
            "budget_min": 500.0,
            "budget_max": 1000.0,
            "duration_start": tomorrow,
            "duration_end": next_week,
            "people_needed": 1,
            "is_urgent": False
        }
        
        response = self.run_test(
            "Create Gig",
            "POST",
            "gigs",
            200,
            data=gig_data
        )
        
        gig_id = None
        if response and response.get('success'):
            gig_id = response.get('gig', {}).get('id')
        
        # List gigs
        self.run_test("List All Gigs", "GET", "gigs", 200)
        
        # List gigs with filters
        self.run_test("List Gigs by Category", "GET", "gigs?category=Web Development", 200)
        self.run_test("List Urgent Gigs", "GET", "gigs?is_urgent=true", 200)
        
        # Get specific gig
        if gig_id:
            self.run_test(
                "Get Gig Details",
                "GET",
                f"gigs/{gig_id}",
                200
            )
            
            # Test gig applications
            self.run_test(
                "Get Gig Applications",
                "GET",
                f"gigs/{gig_id}/applications",
                200
            )
        
        # Get my gigs
        self.run_test("Get My Gigs", "GET", "my-gigs", 200)
        
        return gig_id

    def test_application_operations(self, gig_id):
        """Test gig application operations"""
        print("\n🔍 Testing Application Operations...")
        
        if not gig_id:
            self.log_test("Application Tests", False, "No gig ID available")
            return
        
        # Apply to gig
        application_data = {
            "gig_id": gig_id,
            "cover_letter": "I'm interested in this project and have relevant experience."
        }
        
        response = self.run_test(
            "Apply to Gig",
            "POST",
            f"gigs/{gig_id}/apply",
            200,
            data=application_data
        )
        
        # Get my applications
        self.run_test("Get My Applications", "GET", "my-applications", 200)

    def test_matching_system(self):
        """Test matching system"""
        print("\n🔍 Testing Matching System...")
        
        self.run_test("Get Matched Gigs", "GET", "match/gigs", 200)

    def test_ai_chat(self):
        """Test AI chat functionality"""
        print("\n🔍 Testing AI Chat...")
        
        chat_data = {
            "message": "Help me find web development gigs",
            "context": {"current_page": "/dashboard"}
        }
        
        # Note: This might take longer due to OpenAI API call
        print("⏳ Testing AI chat (this may take a few seconds)...")
        response = self.run_test(
            "AI Chat Response",
            "POST",
            "ai/chat",
            200,
            data=chat_data
        )
        
        if response and response.get('success'):
            print(f"   AI Response: {response.get('response', '')[:100]}...")

    def test_message_operations(self):
        """Test messaging system"""
        print("\n🔍 Testing Messaging System...")
        
        # Get conversations (should be empty for new user)
        self.run_test("Get Conversations", "GET", "conversations", 200)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Career Plus API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Basic health checks
        self.test_health_check()
        self.test_categories_and_stats()
        
        # Authentication flow
        if not self.test_auth_signup():
            print("❌ Signup failed, stopping tests")
            return False
            
        if not self.test_auth_login():
            print("❌ Login failed, stopping tests") 
            return False
            
        self.test_auth_me()
        
        # Profile operations
        self.test_profile_operations()
        self.test_freelancer_registration()
        
        # Gig operations
        gig_id = self.test_gig_operations()
        self.test_application_operations(gig_id)
        
        # Advanced features
        self.test_matching_system()
        self.test_message_operations()
        
        # AI functionality (test last as it's slower)
        self.test_ai_chat()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed < self.tests_run:
            print(f"\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")

def main():
    tester = CareerPlusAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        
        # Return appropriate exit code
        if tester.tests_passed == tester.tests_run:
            print("\n🎉 All tests passed!")
            return 0
        else:
            print(f"\n⚠️  {tester.tests_run - tester.tests_passed} tests failed")
            return 1
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test suite crashed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())