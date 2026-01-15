-- Perfect Gigs Database Migration
-- Run this in your Supabase SQL Editor to update the schema

-- Drop the foreign key constraint on profiles.id since we're using custom auth now
-- First, check if the constraint exists and drop it
DO $$ 
BEGIN
    -- Drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
END $$;

-- Alter profiles.id to just be UUID (no longer references auth.users)
ALTER TABLE profiles ALTER COLUMN id TYPE UUID USING id::UUID;

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add password_hash column for custom auth
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'password_hash') THEN
        ALTER TABLE profiles ADD COLUMN password_hash TEXT;
    END IF;
    
    -- Add firebase_uid column for Google Auth
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'firebase_uid') THEN
        ALTER TABLE profiles ADD COLUMN firebase_uid TEXT;
    END IF;
    
    -- Add show_phone column for privacy settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_phone') THEN
        ALTER TABLE profiles ADD COLUMN show_phone BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add show_email column for privacy settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_email') THEN
        ALTER TABLE profiles ADD COLUMN show_email BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Update RLS policies for the new auth model
-- First drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new policies that allow all operations via service role
-- The backend uses service_role key so it bypasses RLS
-- We just need a basic read policy for public access
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Profiles can be inserted"
    ON profiles FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Profiles can be updated"
    ON profiles FOR UPDATE
    USING (true);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON profiles(firebase_uid);

-- Output success message
SELECT 'Migration completed successfully!' as status;
