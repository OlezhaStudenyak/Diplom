/*
  # Update warehouse and product management permissions

  1. Changes
    - Modify warehouse policies to allow only warehouse workers to manage warehouses
    - Update product policies to restrict management to warehouse workers
    - Remove manager access from both warehouses and products
  
  2. Security
    - All authenticated users can still view warehouses and products
    - Only warehouse workers can create/update/delete warehouses and products
    - Maintains existing RLS enforcement
*/

-- Drop existing warehouse policies
DROP POLICY IF EXISTS "warehouses_insert_policy" ON warehouses;
DROP POLICY IF EXISTS "warehouses_update_policy" ON warehouses;
DROP POLICY IF EXISTS "warehouses_delete_policy" ON warehouses;

-- Create new warehouse policies for warehouse workers
CREATE POLICY "warehouses_insert_policy" 
ON warehouses FOR INSERT 
TO authenticated 
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
);

CREATE POLICY "warehouses_update_policy" 
ON warehouses FOR UPDATE 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
);

CREATE POLICY "warehouses_delete_policy" 
ON warehouses FOR DELETE 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
);

-- Drop existing product policies
DROP POLICY IF EXISTS "products_write_policy" ON products;

-- Create new product policies for warehouse workers
CREATE POLICY "products_write_policy"
ON products FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
);

-- Drop existing inventory policies
DROP POLICY IF EXISTS "inventory_items_write_policy" ON inventory_items;

-- Create new inventory policies for warehouse workers
CREATE POLICY "inventory_items_write_policy"
ON inventory_items FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
);