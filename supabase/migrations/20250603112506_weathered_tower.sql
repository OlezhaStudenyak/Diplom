/*
  # Add inventory tracking for products in warehouses
  
  1. Changes
    - Add inventory_levels table to track product quantities per warehouse
    - Add triggers to maintain inventory levels
    - Add functions to handle inventory operations
    
  2. Security
    - Enable RLS on new tables
    - Add policies for warehouse workers
*/

-- Create inventory_levels table
CREATE TABLE IF NOT EXISTS inventory_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) NOT NULL,
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

-- Create function to check and maintain inventory levels
CREATE OR REPLACE FUNCTION maintain_inventory_levels()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we need to create or update inventory level
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Insert or update inventory level
    INSERT INTO inventory_levels (
      product_id,
      warehouse_id,
      quantity,
      minimum_quantity,
      maximum_quantity
    )
    VALUES (
      NEW.id,
      (SELECT id FROM warehouses ORDER BY created_at LIMIT 1), -- Default to first warehouse
      0, -- Initial quantity
      NEW.minimum_stock,
      NEW.maximum_stock
    )
    ON CONFLICT (product_id, warehouse_id) 
    DO UPDATE SET
      minimum_quantity = NEW.minimum_stock,
      maximum_quantity = NEW.maximum_stock;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products
CREATE TRIGGER maintain_inventory_levels_trigger
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION maintain_inventory_levels();

-- Add some test data
INSERT INTO inventory_levels (product_id, warehouse_id, quantity)
SELECT 
  p.id,
  w.id,
  floor(random() * 100)::numeric
FROM 
  products p
CROSS JOIN 
  warehouses w
ON CONFLICT DO NOTHING;