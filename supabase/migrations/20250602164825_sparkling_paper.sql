/*
  # Add unit type to products table
  
  1. Changes
    - Add unit_type column to products table with enum constraint
    - Add unit_value column to products table for quantity tracking
  
  2. Notes
    - unit_type can be 'piece', 'kilogram', or 'liter'
    - unit_value stores the quantity in the selected unit
*/

ALTER TABLE products 
ADD COLUMN unit_type text NOT NULL DEFAULT 'piece' 
CHECK (unit_type IN ('piece', 'kilogram', 'liter')),
ADD COLUMN unit_value numeric NOT NULL DEFAULT 1;

COMMENT ON COLUMN products.unit_type IS 'Type of unit measurement (piece, kilogram, or liter)';
COMMENT ON COLUMN products.unit_value IS 'Quantity value in the selected unit type';