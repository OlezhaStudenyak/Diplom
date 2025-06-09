/*
  # Add test data for logistics management
  
  1. Test Data
    - Add test vehicles
    - Add test vehicle locations
    - Add test delivery routes
    - Add test delivery stops
  
  2. Notes
    - All data is for testing purposes only
    - Uses realistic Ukrainian cities and addresses
*/

-- Add test vehicles
INSERT INTO vehicles (id, license_plate, model, make, year, capacity, status)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'AA1234BB', 'Sprinter', 'Mercedes-Benz', 2022, 3500, 'available'),
  ('550e8400-e29b-41d4-a716-446655440000', 'BC5678AA', 'Daily', 'IVECO', 2021, 5000, 'in_delivery'),
  ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'KA9012BC', 'Master', 'Renault', 2023, 2800, 'available');

-- Add test vehicle locations (for vehicles in delivery)
INSERT INTO vehicle_locations (vehicle_id, latitude, longitude, heading, speed)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 50.4501, 30.5234, 45, 60);

-- Add test delivery routes
INSERT INTO delivery_routes (
  id,
  vehicle_id,
  status,
  start_time,
  total_distance,
  total_stops
)
VALUES
  (
    'c9d9943e-88c1-4c1b-b9e2-3892b0c7e897',
    '550e8400-e29b-41d4-a716-446655440000',
    'in_progress',
    NOW(),
    150.5,
    3
  );

-- Add test delivery stops
INSERT INTO delivery_stops (
  route_id,
  sequence_number,
  status,
  latitude,
  longitude,
  address,
  planned_arrival
)
VALUES
  (
    'c9d9943e-88c1-4c1b-b9e2-3892b0c7e897',
    1,
    'completed',
    50.4547, 
    30.5238,
    'вул. Хрещатик, 22, Київ, 01001',
    NOW() + INTERVAL '1 hour'
  ),
  (
    'c9d9943e-88c1-4c1b-b9e2-3892b0c7e897',
    2,
    'pending',
    50.4420,
    30.5104,
    'вул. Велика Васильківська, 100, Київ, 03150',
    NOW() + INTERVAL '2 hours'
  ),
  (
    'c9d9943e-88c1-4c1b-b9e2-3892b0c7e897',
    3,
    'pending',
    50.4615,
    30.4942,
    'просп. Перемоги, 37, Київ, 03056',
    NOW() + INTERVAL '3 hours'
  );