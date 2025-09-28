-- Update RLS policies to work with Clerk JWT tokens
-- Drop existing policies that were designed for Supabase auth
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Create new policies that work with Clerk JWT tokens
-- These policies check the JWT token's 'sub' claim (Clerk user ID)

-- Policy 1: Users can view their own profile using Clerk JWT
CREATE POLICY "Users can view own profile with Clerk JWT" ON profiles
    FOR SELECT TO authenticated
    USING (
        clerk_user_id = (
            SELECT COALESCE(
                current_setting('request.jwt.claims', true)::json->>'sub',
                current_setting('request.jwt.claims', true)::json->>'user_id'
            )
        )
    );

-- Policy 2: Users can update their own profile using Clerk JWT
CREATE POLICY "Users can update own profile with Clerk JWT" ON profiles
    FOR UPDATE TO authenticated
    USING (
        clerk_user_id = (
            SELECT COALESCE(
                current_setting('request.jwt.claims', true)::json->>'sub',
                current_setting('request.jwt.claims', true)::json->>'user_id'
            )
        )
    )
    WITH CHECK (
        clerk_user_id = (
            SELECT COALESCE(
                current_setting('request.jwt.claims', true)::json->>'sub',
                current_setting('request.jwt.claims', true)::json->>'user_id'
            )
        )
    );

-- Policy 3: Users can create their own profile using Clerk JWT
CREATE POLICY "Users can create own profile with Clerk JWT" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        clerk_user_id = (
            SELECT COALESCE(
                current_setting('request.jwt.claims', true)::json->>'sub',
                current_setting('request.jwt.claims', true)::json->>'user_id'
            )
        )
    );

-- Service role policy already exists from previous migration
