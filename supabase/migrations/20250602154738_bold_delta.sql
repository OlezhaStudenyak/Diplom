/*
  # Warehouse Management System Schema

  1. New Tables
    - `warehouses`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `address` (text, required)
      - `city` (text, required)
      - `state` (text, required)
      - `country` (text, required)
      - `postal_code` (text, required)
      - `latitude` (numeric, required)
      - `longitude` (numeric, required)
      - `total_capacity` (integer, required)
      - `status` (text, required)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

    - `warehouse_zones`
      - `id` (uuid, primary key)
      - `warehouse_id` (uuid, foreign key to warehouses)
      - `name` (text, required)
      - `zone_type` (text, required)
      - `capacity` (integer, required)
      - `current_utilization` (integer)
      - `temperature` (numeric)
      - `humidity` (numeric)
      - `status` (text, required)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to:
      - Read all warehouse data
      - Manage warehouses if they have admin role
      - Manage warehouse zones if they have admin role
*/

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country text NOT NULL,
  postal_code text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  total_capacity integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create warehouse_zones table
CREATE TABLE IF NOT EXISTS warehouse_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  zone_type text NOT NULL,
  capacity integer NOT NULL,
  current_utilization integer DEFAULT 0,
  temperature numeric,
  humidity numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_zones ENABLE ROW LEVEL SECURITY;

-- Create policies for warehouses
CREATE POLICY "Allow read access to authenticated users"
  ON warehouses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow full access to admin users"
  ON warehouses
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create policies for warehouse_zones
CREATE POLICY "Allow read access to authenticated users"
  ON warehouse_zones
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow full access to admin users"
  ON warehouse_zones
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_warehouse_id ON warehouse_zones(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_status ON warehouse_zones(status);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_zones_updated_at
    BEFORE UPDATE ON warehouse_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();