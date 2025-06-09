/*
  # Fix order status history RLS policies

  1. Changes
    - Update RLS policies for order_status_history table to allow customers to create initial status entries
    - Add policy for customers to create status history when they own the order
    - Keep existing policy for staff to create status history

  2. Security
    - Customers can only create status history for their own orders
    - Staff (admin, manager, logistician) can create status history for any order
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can create status history" ON order_status_history;

-- Create new policies
CREATE POLICY "Allow status history creation for order owners"
  ON order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND orders.customer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'logistician')
    )
  );