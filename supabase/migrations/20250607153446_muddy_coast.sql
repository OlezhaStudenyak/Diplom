/*
  # Fix warehouse zones RLS policies

  1. Changes
    - Drop existing policies that reference users table
    - Create new policies that reference profiles table
    - Ensure proper access control for warehouse workers

  2. Security
    - Maintain RLS protection
    - Allow warehouse workers to manage warehouse zones
    - Allow all authenticated users to read warehouse zones
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow full access to admin users" ON warehouse_zones;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON warehouse_zones;

-- Create new policies that reference profiles table
CREATE POLICY "Allow read access to authenticated users"
  ON warehouse_zones
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow full access to warehouse workers"
  ON warehouse_zones
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
  );