/*
  # Update Warehouse RLS Policies
  
  1. Changes
    - Update RLS policies for warehouses table to allow proper management
    - Add policies for INSERT, UPDATE, and DELETE operations
    - Maintain existing SELECT policy
  
  2. Security
    - Allow admin and manager roles to perform all operations
    - Maintain read access for all authenticated users
    - Ensure proper access control based on user roles
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Enable full access for admin users" ON warehouses;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON warehouses;

-- Create comprehensive policies for warehouse management
CREATE POLICY "warehouses_select_policy" 
ON warehouses FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "warehouses_insert_policy" 
ON warehouses FOR INSERT 
TO authenticated 
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

CREATE POLICY "warehouses_update_policy" 
ON warehouses FOR UPDATE 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

CREATE POLICY "warehouses_delete_policy" 
ON warehouses FOR DELETE 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);