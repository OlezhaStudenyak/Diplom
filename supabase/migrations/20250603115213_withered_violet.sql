/*
  # Add inventory levels tracking
  
  1. Changes
    - Create inventory_levels table for tracking stock levels per warehouse
    - Add triggers and functions for inventory management
    - Set up RLS policies for access control
    
  2. Security
    - Enable RLS on inventory_levels table
    - Allow read access to all authenticated users
    - Allow modifications only for warehouse workers
*/

-- Drop existing objects with CASCADE to handle dependencies
DROP POLICY IF EXISTS "inventory_levels_select_policy" ON inventory_levels;
DROP POLICY IF EXISTS "inventory_levels_modify_policy" ON inventory_levels;
DROP TRIGGER IF EXISTS update_inventory_levels_updated_at ON inventory_levels;
DROP TRIGGER IF EXISTS handle_product_changes_trigger ON products;
DROP TRIGGER IF EXISTS check_stock_levels_trigger ON inventory_levels;
DROP FUNCTION IF EXISTS handle_product_changes() CASCADE;
DROP FUNCTION IF EXISTS check_stock_levels() CASCADE;

-- Create inventory_levels table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id),
  quantity numeric NOT NULL DEFAULT 0,
  minimum_quantity numeric NOT NULL DEFAULT 0,
  maximum_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

-- Enable RLS
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "inventory_levels_select_policy" 
ON inventory_levels FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "inventory_levels_modify_policy" 
ON inventory_levels FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'warehouse_worker'
);

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_levels_updated_at
  BEFORE UPDATE ON inventory_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle product changes
CREATE OR REPLACE FUNCTION handle_product_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- For new products or updates
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Create inventory level records for each warehouse
    INSERT INTO inventory_levels (
      product_id,
      warehouse_id,
      quantity,
      minimum_quantity,
      maximum_quantity
    )
    SELECT
      NEW.id,
      w.id,
      0, -- Initial quantity
      NEW.minimum_stock,
      NEW.maximum_stock
    FROM warehouses w
    ON CONFLICT (product_id, warehouse_id) 
    DO UPDATE SET
      minimum_quantity = NEW.minimum_stock,
      maximum_quantity = NEW.maximum_stock;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for product changes
CREATE TRIGGER handle_product_changes_trigger
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION handle_product_changes();

-- Function to check stock levels
CREATE OR REPLACE FUNCTION check_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock is below minimum
  IF NEW.quantity <= NEW.minimum_quantity THEN
    -- In a real system, this would trigger a notification
    RAISE NOTICE 'Low stock alert for product % in warehouse %', NEW.product_id, NEW.warehouse_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock level checks
CREATE TRIGGER check_stock_levels_trigger
  AFTER INSERT OR UPDATE ON inventory_levels
  FOR EACH ROW
  EXECUTE FUNCTION check_stock_levels();