-- Career Plus Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    location TEXT DEFAULT '',
    skills TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    is_freelancer BOOLEAN DEFAULT FALSE,
    freelancer_categories TEXT[] DEFAULT '{}',
    freelancer_availability TEXT,
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gigs table
CREATE TABLE IF NOT EXISTS gigs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    budget_min DECIMAL(10,2) NOT NULL,
    budget_max DECIMAL(10,2) NOT NULL,
    duration_start DATE NOT NULL,
    duration_end DATE NOT NULL,
    people_needed INTEGER DEFAULT 1,
    is_urgent BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    applications_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    cover_letter TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(gig_id, applicant_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reviewer_id, gig_id)
);

-- Function to increment applications count
CREATE OR REPLACE FUNCTION increment_applications_count(gig_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE gigs SET applications_count = applications_count + 1 WHERE id = gig_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get user conversations
CREATE OR REPLACE FUNCTION get_user_conversations(user_id_param UUID)
RETURNS TABLE (
    other_user_id UUID,
    other_user_name TEXT,
    other_user_avatar TEXT,
    last_message TEXT,
    last_message_time TIMESTAMPTZ,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH conversation_partners AS (
        SELECT DISTINCT
            CASE 
                WHEN sender_id = user_id_param THEN receiver_id
                ELSE sender_id
            END as partner_id
        FROM messages
        WHERE sender_id = user_id_param OR receiver_id = user_id_param
    ),
    latest_messages AS (
        SELECT DISTINCT ON (cp.partner_id)
            cp.partner_id,
            m.content as last_msg,
            m.created_at as msg_time
        FROM conversation_partners cp
        JOIN messages m ON 
            (m.sender_id = cp.partner_id AND m.receiver_id = user_id_param) OR
            (m.sender_id = user_id_param AND m.receiver_id = cp.partner_id)
        ORDER BY cp.partner_id, m.created_at DESC
    ),
    unread_counts AS (
        SELECT 
            sender_id as partner_id,
            COUNT(*) as unread
        FROM messages
        WHERE receiver_id = user_id_param AND is_read = FALSE
        GROUP BY sender_id
    )
    SELECT 
        lm.partner_id as other_user_id,
        p.name as other_user_name,
        p.avatar_url as other_user_avatar,
        lm.last_msg as last_message,
        lm.msg_time as last_message_time,
        COALESCE(uc.unread, 0) as unread_count
    FROM latest_messages lm
    JOIN profiles p ON p.id = lm.partner_id
    LEFT JOIN unread_counts uc ON uc.partner_id = lm.partner_id
    ORDER BY lm.msg_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Gigs policies
CREATE POLICY "Gigs are viewable by everyone"
    ON gigs FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create gigs"
    ON gigs FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own gigs"
    ON gigs FOR UPDATE
    USING (auth.uid() = created_by);

-- Applications policies
CREATE POLICY "Users can view their own applications"
    ON applications FOR SELECT
    USING (auth.uid() = applicant_id OR auth.uid() IN (
        SELECT created_by FROM gigs WHERE id = applications.gig_id
    ));

CREATE POLICY "Authenticated users can apply to gigs"
    ON applications FOR INSERT
    WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Gig owners can update applications"
    ON applications FOR UPDATE
    USING (auth.uid() IN (
        SELECT created_by FROM gigs WHERE id = applications.gig_id
    ));

-- Messages policies
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can send messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
    ON messages FOR UPDATE
    USING (auth.uid() = receiver_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
    ON reviews FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create reviews"
    ON reviews FOR INSERT
    WITH CHECK (auth.uid() = reviewer_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_gigs_location ON gigs(location);
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_created_by ON gigs(created_by);
CREATE INDEX IF NOT EXISTS idx_applications_gig_id ON applications(gig_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_freelancer ON profiles(is_freelancer);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
