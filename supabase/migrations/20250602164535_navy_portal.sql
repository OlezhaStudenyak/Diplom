-- Drop existing policies
DROP POLICY IF EXISTS "product_categories_write_policy" ON product_categories;
DROP POLICY IF EXISTS "products_write_policy" ON products;

-- Create new policy for product categories that allows warehouse workers to manage them
CREATE POLICY "product_categories_write_policy"
ON product_categories FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
);

-- Create new policy for products that allows warehouse workers to manage them
CREATE POLICY "products_write_policy"
ON products FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
);

-- Keep the read policies as they are since they allow all authenticated users to read