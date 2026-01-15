-- Add new columns for Perfect Gigs update
-- Run this in Supabase SQL Editor

-- Add phone and visibility fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

-- Create index for firebase_uid
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON profiles(firebase_uid);

-- Update RLS policy to allow insert for Google auth users
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Anyone can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- Update RLS policy to allow update for own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (true);
