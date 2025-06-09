/*
  # Fix Product Management System

  1. Changes
    - Add trigger to handle product deletion
    - Add notification function for product changes
    - Update inventory levels management
    - Add cascade delete for inventory levels

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS maintain_inventory_levels_trigger ON products;

-- Create function to handle product changes
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

  -- For deletions
  IF (TG_OP = 'DELETE') THEN
    -- Delete related inventory levels
    DELETE FROM inventory_levels WHERE product_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger for product changes
CREATE TRIGGER handle_product_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION handle_product_changes();

-- Add cascade delete to inventory_levels foreign key
ALTER TABLE inventory_levels
DROP CONSTRAINT IF EXISTS inventory_levels_product_id_fkey,
ADD CONSTRAINT inventory_levels_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE CASCADE;

-- Create function to notify about product changes
CREATE OR REPLACE FUNCTION notify_product_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification into a notification table or handle through your notification system
  -- For now, we'll just use RAISE NOTICE
  IF TG_OP = 'DELETE' THEN
    RAISE NOTICE 'Product % has been deleted', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for product change notifications
CREATE TRIGGER notify_product_changes_trigger
  AFTER DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_product_changes();