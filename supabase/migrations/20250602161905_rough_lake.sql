/*
  # Create products and inventory management tables
  
  1. New Tables
    - product_categories
    - products (references product_categories)
    - inventory_items (references products, warehouses, and warehouse_zones)
    
  2. Security
    - Enable RLS on all tables
    - Add policies for different user roles
    
  3. Indexes
    - Add indexes for frequently queried columns
    
  4. Triggers
    - Add updated_at triggers for all tables
*/

-- Create product categories table first
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Then create products table that references categories
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  description text,
  category_id uuid REFERENCES product_categories(id),
  price numeric NOT NULL CHECK (price >= 0),
  cost numeric NOT NULL CHECK (cost >= 0),
  stock_threshold integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Finally create inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) NOT NULL,
  zone_id uuid REFERENCES warehouse_zones(id) NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  batch_number text,
  expiry_date timestamptz,
  status text NOT NULL DEFAULT 'available',
  last_count_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('available', 'reserved', 'damaged'))
);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_zone ON inventory_items(zone_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);

-- Create policies for product categories
CREATE POLICY "product_categories_read_policy"
ON product_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "product_categories_write_policy"
ON product_categories FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Create policies for products
CREATE POLICY "products_read_policy"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "products_write_policy"
ON products FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'warehouse_worker', 'manager')
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'warehouse_worker', 'manager')
);

-- Create policies for inventory items
CREATE POLICY "inventory_items_read_policy"
ON inventory_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "inventory_items_write_policy"
ON inventory_items FOR ALL
TO authenticated
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'warehouse_worker', 'manager')
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'warehouse_worker', 'manager')
);

-- Create triggers for updated_at
CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();