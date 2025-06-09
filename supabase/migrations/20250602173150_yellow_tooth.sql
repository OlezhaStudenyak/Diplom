/*
  # Enhance Inventory Management System

  1. New Tables
    - `inventory_transactions` - Track all inventory movements
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `source_warehouse_id` (uuid, references warehouses)
      - `destination_warehouse_id` (uuid, references warehouses)
      - `quantity` (numeric)
      - `transaction_type` (text: 'transfer', 'adjustment', 'receipt', 'shipment')
      - `reference_number` (text)
      - `notes` (text)
      - `performed_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
    
    - `inventory_counts` - Track physical inventory counts
      - `id` (uuid, primary key)
      - `warehouse_id` (uuid, references warehouses)
      - `status` (text: 'draft', 'in_progress', 'completed')
      - `count_date` (timestamptz)
      - `performed_by` (uuid, references auth.users)
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `inventory_count_items` - Individual items in inventory counts
      - `id` (uuid, primary key)
      - `count_id` (uuid, references inventory_counts)
      - `product_id` (uuid, references products)
      - `expected_quantity` (numeric)
      - `counted_quantity` (numeric)
      - `notes` (text)

  2. Modifications
    - Add `minimum_stock` and `maximum_stock` to products table
    - Add triggers for inventory alerts
    
  3. Security
    - Enable RLS on all new tables
    - Add policies for warehouse workers and managers
*/

-- Add new columns to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS minimum_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS maximum_stock numeric DEFAULT 0;

-- Create inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES products(id) NOT NULL,
    source_warehouse_id uuid REFERENCES warehouses(id),
    destination_warehouse_id uuid REFERENCES warehouses(id),
    quantity numeric NOT NULL,
    transaction_type text NOT NULL,
    reference_number text,
    notes text,
    performed_by uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT valid_transaction_type CHECK (
        transaction_type IN ('transfer', 'adjustment', 'receipt', 'shipment')
    ),
    CONSTRAINT valid_warehouse_combination CHECK (
        (transaction_type = 'transfer' AND source_warehouse_id IS NOT NULL AND destination_warehouse_id IS NOT NULL) OR
        (transaction_type = 'receipt' AND destination_warehouse_id IS NOT NULL AND source_warehouse_id IS NULL) OR
        (transaction_type = 'shipment' AND source_warehouse_id IS NOT NULL AND destination_warehouse_id IS NULL) OR
        (transaction_type = 'adjustment' AND 
         ((source_warehouse_id IS NOT NULL AND destination_warehouse_id IS NULL) OR 
          (source_warehouse_id IS NULL AND destination_warehouse_id IS NOT NULL)))
    )
);

-- Create inventory counts table
CREATE TABLE IF NOT EXISTS inventory_counts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id uuid REFERENCES warehouses(id) NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    count_date timestamptz NOT NULL DEFAULT now(),
    performed_by uuid REFERENCES auth.users(id) NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT valid_count_status CHECK (
        status IN ('draft', 'in_progress', 'completed')
    )
);

-- Create inventory count items table
CREATE TABLE IF NOT EXISTS inventory_count_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    count_id uuid REFERENCES inventory_counts(id) NOT NULL,
    product_id uuid REFERENCES products(id) NOT NULL,
    expected_quantity numeric NOT NULL DEFAULT 0,
    counted_quantity numeric NOT NULL DEFAULT 0,
    notes text,
    CONSTRAINT positive_quantities CHECK (
        expected_quantity >= 0 AND counted_quantity >= 0
    )
);

-- Enable RLS
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_items ENABLE ROW LEVEL SECURITY;

-- Policies for inventory transactions
CREATE POLICY "Allow read access to authenticated users" ON inventory_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for warehouse workers and managers" ON inventory_transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = performed_by AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('warehouse_worker', 'manager')
        )
    );

-- Policies for inventory counts
CREATE POLICY "Allow read access to authenticated users" ON inventory_counts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert/update for warehouse workers and managers" ON inventory_counts
    FOR ALL TO authenticated
    USING (
        auth.uid() = performed_by AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('warehouse_worker', 'manager')
        )
    )
    WITH CHECK (
        auth.uid() = performed_by AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('warehouse_worker', 'manager')
        )
    );

-- Policies for inventory count items
CREATE POLICY "Allow read access to authenticated users" ON inventory_count_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert/update for warehouse workers and managers" ON inventory_count_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM inventory_counts ic
            JOIN profiles p ON p.id = ic.performed_by
            WHERE ic.id = inventory_count_items.count_id
            AND p.role IN ('warehouse_worker', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM inventory_counts ic
            JOIN profiles p ON p.id = ic.performed_by
            WHERE ic.id = inventory_count_items.count_id
            AND p.role IN ('warehouse_worker', 'manager')
        )
    );

-- Create function to update inventory items on transaction
CREATE OR REPLACE FUNCTION process_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- For transfers
    IF NEW.transaction_type = 'transfer' THEN
        -- Decrease quantity at source
        UPDATE inventory_items
        SET quantity = quantity - NEW.quantity
        WHERE product_id = NEW.product_id
        AND warehouse_id = NEW.source_warehouse_id;
        
        -- Increase quantity at destination
        INSERT INTO inventory_items (product_id, warehouse_id, quantity)
        VALUES (NEW.product_id, NEW.destination_warehouse_id, NEW.quantity)
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = inventory_items.quantity + NEW.quantity;
    
    -- For receipts
    ELSIF NEW.transaction_type = 'receipt' THEN
        INSERT INTO inventory_items (product_id, warehouse_id, quantity)
        VALUES (NEW.product_id, NEW.destination_warehouse_id, NEW.quantity)
        ON CONFLICT (product_id, warehouse_id)
        DO UPDATE SET quantity = inventory_items.quantity + NEW.quantity;
    
    -- For shipments
    ELSIF NEW.transaction_type = 'shipment' THEN
        UPDATE inventory_items
        SET quantity = quantity - NEW.quantity
        WHERE product_id = NEW.product_id
        AND warehouse_id = NEW.source_warehouse_id;
    
    -- For adjustments
    ELSIF NEW.transaction_type = 'adjustment' THEN
        IF NEW.source_warehouse_id IS NOT NULL THEN
            -- Negative adjustment
            UPDATE inventory_items
            SET quantity = quantity - NEW.quantity
            WHERE product_id = NEW.product_id
            AND warehouse_id = NEW.source_warehouse_id;
        ELSE
            -- Positive adjustment
            INSERT INTO inventory_items (product_id, warehouse_id, quantity)
            VALUES (NEW.product_id, NEW.destination_warehouse_id, NEW.quantity)
            ON CONFLICT (product_id, warehouse_id)
            DO UPDATE SET quantity = inventory_items.quantity + NEW.quantity;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory transactions
CREATE TRIGGER process_inventory_transaction_trigger
    AFTER INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION process_inventory_transaction();

-- Create function to check stock levels
CREATE OR REPLACE FUNCTION check_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if stock is below minimum
    IF NEW.quantity <= (
        SELECT minimum_stock 
        FROM products 
        WHERE id = NEW.product_id
    ) THEN
        -- In a real system, this would trigger a notification
        -- For now, we'll just raise a notice
        RAISE NOTICE 'Low stock alert for product %', NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock level checks
CREATE TRIGGER check_stock_levels_trigger
    AFTER INSERT OR UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_levels();