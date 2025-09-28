-- Comprehensive Clerk + Supabase Integration Setup
-- This migration creates a clean, secure profile system with proper RLS

-- Drop existing profiles table if it exists (clean slate)
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table optimized for Clerk integration
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (REQUIRED for security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Clerk integration
-- Policy 1: Authenticated users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT TO authenticated
    USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy 2: Authenticated users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy 3: Service role can manage all profiles (for API operations)
-- This allows our API routes to create/update profiles using service role
CREATE POLICY "Service role can manage profiles" ON profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 4: Allow profile creation for authenticated users
-- This handles the case where Clerk JWT is properly validated
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Add helpful comments
COMMENT ON TABLE profiles IS 'User profiles linked to Clerk authentication';
COMMENT ON COLUMN profiles.clerk_user_id IS 'Clerk user ID - primary identifier from Clerk';
COMMENT ON COLUMN profiles.metadata IS 'Additional user data and preferences';
