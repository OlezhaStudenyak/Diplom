/*
  # Fix recursive RLS policies for profiles table

  1. Changes
    - Remove recursive policies that check profiles table within itself
    - Implement simplified policies for:
      - Admin access based on user metadata
      - User access to their own profile
      - Read access for authenticated users
  
  2. Security
    - Maintains row-level security
    - Prevents infinite recursion
    - Preserves access control requirements
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new, non-recursive policies
CREATE POLICY "Enable read access for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for users based on user_id"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for admins only"
ON profiles FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'role')::text = 'admin');

CREATE POLICY "Enable full access for admins"
ON profiles FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role')::text = 'admin')
WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');