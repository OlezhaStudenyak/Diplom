/*
  # Add foreign key relationship between orders and profiles

  1. Changes
    - Add foreign key constraint between orders.customer_id and profiles.id
    - Update existing orders table relationship

  2. Security
    - No changes to RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_customer_id_fkey_profiles'
  ) THEN
    ALTER TABLE orders 
    DROP CONSTRAINT IF EXISTS orders_customer_id_fkey,
    ADD CONSTRAINT orders_customer_id_fkey_profiles 
    FOREIGN KEY (customer_id) 
    REFERENCES profiles(id);
  END IF;
END $$;