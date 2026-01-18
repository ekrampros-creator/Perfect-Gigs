# Perfect Gigs - Gig Marketplace Platform

## Overview
Perfect Gigs is a student-friendly gig marketplace platform similar to Upwork/Fiverr, featuring an AI-powered assistant "Ishan" to help users navigate the platform.

## Tech Stack
- **Frontend**: React with Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom JWT auth with bcrypt password hashing + Firebase Google Sign-in
- **AI Integration**: OpenAI GPT-4o-mini
- **Realtime**: Supabase Realtime for chat

## User Personas
1. **Gig Posters**: Students/professionals looking to hire freelancers for small tasks
2. **Freelancers**: Students/professionals offering their skills for gig work
3. **Dual Users**: Users who both post gigs and apply to gigs

## Core Requirements (Static)
- User authentication (signup/login with email + Google Sign-in)
- Profile management with skills, bio, location
- Gig posting with category, budget, duration, urgency
- Gig browsing with filters (category, location, search, urgent)
- Application system for gigs
- AI Assistant "Ishan" for platform guidance
- Real-time messaging between users
- Rating and review system

## What's Been Implemented (January 2025)

### Authentication
- [x] Custom JWT-based email/password signup and login
- [x] Password hashing with bcrypt
- [x] Firebase Google Sign-in integration (UI complete, requires domain authorization)

### AI Assistant "Ishan"
- [x] Conversational AI powered by GPT-4o-mini
- [x] 30+ message conversation history for context
- [x] Adaptive tone (Gen-Z, casual, formal)
- [x] In-chat gig posting wizard (10 steps)
- [x] In-chat freelancer registration wizard (6 steps)
- [x] Custom "Other" category support
- [x] Quick action buttons

### Pages & Features
- [x] Homepage with hero, categories, features, stats
- [x] Gigs page with search and filters
- [x] Gig detail page with apply functionality
- [x] Post gig page with all fields
- [x] Dashboard with my gigs and applications
- [x] Profile page with edit functionality
- [x] Freelancer registration flow
- [x] Messages page with conversation list
- [x] Browse Freelancers page with filters
- [x] Professional dark theme with Space Grotesk + Inter fonts

### Telegram Bot Integration
- [x] Same Ishan AI for Telegram with proper wizard system
- [x] POST /api/telegram/chat endpoint
- [x] Session-based conversation history (30 messages)
- [x] **Gig posting through chat - ACTUALLY CREATES IN DATABASE** ✅
- [x] **Freelancer registration through chat - ACTUALLY SAVES TO DATABASE** ✅
- [x] **Gig search through chat - RETURNS REAL GIGS** ✅
- [x] n8n workflow JSON provided

## Database Schema

### Tables
- `profiles` - User data with skills, bio, freelancer status
- `gigs` - Job postings with budget, duration, category
- `applications` - Freelancer applications to gigs
- `messages` - Real-time chat messages
- `reviews` - User ratings and feedback

### Custom Columns Added
- `password_hash` - For custom JWT auth
- `firebase_uid` - For Google Sign-in
- `show_phone`, `show_email` - Privacy settings
- `phone` - Contact info

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Email/password signup
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/google` - Google Sign-in
- `GET /api/auth/me` - Get current user

### Gigs
- `GET /api/gigs` - List gigs with filters
- `POST /api/gigs` - Create gig (auth required)
- `GET /api/gigs/{id}` - Get gig details
- `POST /api/gigs/{id}/apply` - Apply to gig

### Freelancers
- `GET /api/freelancers` - List freelancers
- `POST /api/freelancer/register` - Register as freelancer

### AI & Telegram
- `POST /api/ai/chat` - Web AI chat with history
- `POST /api/telegram/chat` - Telegram bot chat
- `POST /api/telegram/webhook` - Telegram webhook

## Prioritized Backlog

### P0 (Critical - Completed)
- [x] Fix signup bug - DONE (custom JWT auth)
- [x] AI conversation memory - DONE (30 messages)
- [x] In-chat freelancer registration - DONE

### P1 (Important - Next)
- [ ] Firebase domain authorization for Google Sign-in
- [ ] Test full gig completion flow
- [ ] Add more sample data

### P2 (Nice to Have)
- [ ] Payment integration (Stripe)
- [ ] Email notifications
- [ ] SMS/WhatsApp notifications
- [ ] File attachments in messages

### P3 (Future)
- [ ] Advanced ML matching algorithm
- [ ] Blockchain features
- [ ] Mobile app

## Files Reference

### Backend
- `/app/backend/server.py` - Main FastAPI application
- `/app/backend/.env` - Environment variables
- `/app/backend/supabase_schema.sql` - Database schema
- `/app/backend/supabase_migration.sql` - Migration script

### Frontend
- `/app/frontend/src/App.js` - Router and main app
- `/app/frontend/src/components/AIChat.jsx` - Ishan AI chat
- `/app/frontend/src/components/Layout.jsx` - Navigation layout
- `/app/frontend/src/context/AuthContext.js` - Auth state
- `/app/frontend/src/lib/firebase.js` - Firebase config
- `/app/frontend/src/pages/*.jsx` - All page components

### Integration
- `/app/n8n_telegram_workflow.json` - n8n workflow for Telegram bot

## n8n Telegram Bot Setup

1. Create Telegram Bot via @BotFather
2. In n8n: Settings > Credentials > Add Telegram API
3. Import workflow from `/app/n8n_telegram_workflow.json`
4. Replace `YOUR_TELEGRAM_CREDENTIAL_ID` with your credential
5. Activate workflow

The bot uses the same Ishan AI - full conversation support, gig posting, freelancer registration, and gig search.
