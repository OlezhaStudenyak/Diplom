/*
  # Fix Warehouse RLS Policies

  1. Changes
    - Drop existing RLS policies for warehouses table
    - Add new simplified RLS policies:
      - Allow all authenticated users to read warehouses
      - Allow admin users to perform all operations based on JWT claims
  
  2. Security
    - Maintains RLS protection
    - Simplifies access control using JWT claims directly
    - Removes dependency on users table lookup
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow full access to admin users" ON warehouses;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON warehouses;

-- Create new policies
CREATE POLICY "Enable read access for all authenticated users"
ON warehouses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable full access for admin users"
ON warehouses
USING ((auth.jwt() ->> 'role')::text = 'admin')
WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');