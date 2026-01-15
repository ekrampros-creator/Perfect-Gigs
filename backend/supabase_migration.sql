-- Perfect Gigs Database Migration - REQUIRED
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard -> SQL Editor)

-- Step 1: Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firebase_uid TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Drop the foreign key constraint on profiles.id (if it exists)
-- This allows us to use custom auth instead of Supabase Auth
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON profiles(firebase_uid);

-- Done! You can now use email/password signup
SELECT 'Migration completed!' as status;
