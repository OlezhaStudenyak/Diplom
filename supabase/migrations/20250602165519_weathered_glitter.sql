/*
  # Fix products table schema

  1. Changes
    - Remove stock_threshold column as it's not used
    - Ensure category_id is using the correct name
    - Add missing indexes and constraints

  2. Security
    - Keep existing RLS policies
*/

-- Drop the stock_threshold column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock_threshold'
  ) THEN
    ALTER TABLE products DROP COLUMN stock_threshold;
  END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Add missing constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_unit_type_check'
  ) THEN
    ALTER TABLE products 
    ADD CONSTRAINT products_unit_type_check 
    CHECK (unit_type IN ('piece', 'kilogram', 'liter'));
  END IF;
END $$;