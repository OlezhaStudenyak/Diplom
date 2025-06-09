/*
  # Add foreign key relationship for delivery routes driver

  1. Changes
    - Update delivery_routes.driver_id foreign key to reference profiles table instead of users
    - Drop existing foreign key constraint
    - Add new foreign key constraint to profiles table

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing foreign key if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'delivery_routes_driver_id_fkey'
  ) THEN
    ALTER TABLE delivery_routes DROP CONSTRAINT delivery_routes_driver_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraint to profiles table
ALTER TABLE delivery_routes
ADD CONSTRAINT delivery_routes_driver_id_fkey
FOREIGN KEY (driver_id) REFERENCES profiles(id);