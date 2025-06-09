/*
  # Logistics Management Schema

  1. New Tables
    - vehicles
      - Basic vehicle information
      - Status tracking
      - Maintenance records
    - vehicle_locations
      - Real-time location tracking
      - Last update timestamp
    - delivery_routes
      - Route planning
      - Status tracking
      - Vehicle assignment
    - delivery_stops
      - Individual stops in a route
      - Order references
      - Sequence management

  2. Security
    - Enable RLS on all tables
    - Add policies for different user roles
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate text NOT NULL UNIQUE,
  model text NOT NULL,
  make text NOT NULL,
  year integer NOT NULL,
  capacity numeric NOT NULL,
  status text NOT NULL DEFAULT 'available',
  last_maintenance_date timestamptz,
  next_maintenance_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_vehicle_status CHECK (
    status = ANY (ARRAY['available', 'in_delivery', 'maintenance', 'out_of_service'])
  )
);

-- Create vehicle locations table
CREATE TABLE IF NOT EXISTS vehicle_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  heading numeric,
  speed numeric,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  )
);

-- Create delivery routes table
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  driver_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'planned',
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  total_distance numeric DEFAULT 0,
  total_stops integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_route_status CHECK (
    status = ANY (ARRAY['planned', 'in_progress', 'completed', 'cancelled'])
  )
);

-- Create delivery stops table
CREATE TABLE IF NOT EXISTS delivery_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES delivery_routes(id) NOT NULL,
  order_id uuid REFERENCES orders(id),
  sequence_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  planned_arrival timestamptz,
  actual_arrival timestamptz,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  address text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_stop_status CHECK (
    status = ANY (ARRAY['pending', 'completed', 'failed', 'skipped'])
  ),
  CONSTRAINT valid_stop_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  )
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stops ENABLE ROW LEVEL SECURITY;

-- Policies for vehicles
CREATE POLICY "Allow read access to authenticated users"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow full access to logistics staff"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'logistician')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'logistician')
    )
  );

-- Policies for vehicle locations
CREATE POLICY "Allow read access to authenticated users"
  ON vehicle_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow update for logistics staff and drivers"
  ON vehicle_locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'logistician', 'driver')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'logistician', 'driver')
    )
  );

-- Policies for delivery routes
CREATE POLICY "Allow read access to authenticated users"
  ON delivery_routes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow management for logistics staff"
  ON delivery_routes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'logistician')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'logistician')
    )
  );

CREATE POLICY "Allow updates for assigned drivers"
  ON delivery_routes
  FOR UPDATE
  TO authenticated
  USING (
    driver_id = auth.uid()
  )
  WITH CHECK (
    driver_id = auth.uid()
  );

-- Policies for delivery stops
CREATE POLICY "Allow read access to authenticated users"
  ON delivery_stops
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow management for logistics staff"
  ON delivery_stops
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'logistician')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'logistician')
    )
  );

CREATE POLICY "Allow updates for route drivers"
  ON delivery_stops
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_routes
      WHERE delivery_routes.id = delivery_stops.route_id
      AND delivery_routes.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_routes
      WHERE delivery_routes.id = delivery_stops.route_id
      AND delivery_routes.driver_id = auth.uid()
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_routes_updated_at
  BEFORE UPDATE ON delivery_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_stops_updated_at
  BEFORE UPDATE ON delivery_stops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();