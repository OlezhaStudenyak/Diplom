/*
  # Виправлення неоднозначного посилання на колонку vehicle_id
  
  1. Зміни
    - Виправлення функції find_nearest_available_vehicle
    - Додавання явних псевдонімів таблиць
    - Виправлення всіх неоднозначних посилань на колонки
*/

-- Виправляємо функцію для знаходження найближчого вільного транспорту
CREATE OR REPLACE FUNCTION find_nearest_available_vehicle(warehouse_lat numeric, warehouse_lng numeric)
RETURNS uuid AS $$
DECLARE
    result_vehicle_id uuid;
BEGIN
    -- Знаходимо найближчий вільний транспорт з явними псевдонімами
    SELECT v.id INTO result_vehicle_id
    FROM vehicles v
    LEFT JOIN vehicle_locations vl ON vl.vehicle_id = v.id
    WHERE v.status = 'available'
    ORDER BY 
        CASE 
            WHEN vl.latitude IS NOT NULL AND vl.longitude IS NOT NULL THEN
                -- Розраховуємо відстань за формулою гаверсинуса
                6371 * acos(
                    cos(radians(warehouse_lat)) * 
                    cos(radians(vl.latitude)) * 
                    cos(radians(vl.longitude) - radians(warehouse_lng)) + 
                    sin(radians(warehouse_lat)) * 
                    sin(radians(vl.latitude))
                )
            ELSE 999999 -- Якщо немає координат, ставимо в кінець
        END
    LIMIT 1;
    
    RETURN result_vehicle_id;
END;
$$ LANGUAGE plpgsql;

-- Виправляємо функцію створення автоматичного маршруту
CREATE OR REPLACE FUNCTION create_automatic_delivery_route()
RETURNS TRIGGER AS $$
DECLARE
    warehouse_record RECORD;
    selected_vehicle_id uuid;
    new_route_id uuid;
    estimated_duration integer;
    route_geometry jsonb;
BEGIN
    -- Створюємо маршрут тільки при підтвердженні замовлення
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
        
        -- Отримуємо інформацію про склад (беремо перший товар з замовлення)
        SELECT w.* INTO warehouse_record
        FROM warehouses w
        JOIN order_items oi ON oi.warehouse_id = w.id
        WHERE oi.order_id = NEW.id
        LIMIT 1;
        
        IF warehouse_record IS NULL THEN
            RAISE EXCEPTION 'Не знайдено склад для замовлення %', NEW.id;
        END IF;
        
        -- Знаходимо найближчий вільний транспорт
        selected_vehicle_id := find_nearest_available_vehicle(
            warehouse_record.latitude, 
            warehouse_record.longitude
        );
        
        IF selected_vehicle_id IS NULL THEN
            RAISE EXCEPTION 'Немає доступного транспорту для доставки';
        END IF;
        
        -- Розраховуємо приблизний час доставки (30-60 хвилин)
        estimated_duration := 30 + floor(random() * 30)::integer;
        
        -- Створюємо простий маршрут (пряма лінія від складу до клієнта)
        route_geometry := json_build_object(
            'type', 'LineString',
            'coordinates', json_build_array(
                json_build_array(warehouse_record.longitude, warehouse_record.latitude),
                json_build_array(
                    -- Використовуємо координати з адреси (якщо є) або генеруємо випадкові поблизу складу
                    warehouse_record.longitude + (random() - 0.5) * 0.1,
                    warehouse_record.latitude + (random() - 0.5) * 0.1
                )
            )
        );
        
        -- Створюємо маршрут доставки
        INSERT INTO delivery_routes (
            vehicle_id,
            status,
            start_time,
            end_time,
            total_distance,
            total_stops,
            notes,
            simulation_active,
            simulation_start_time,
            simulation_end_time,
            route_geometry
        ) VALUES (
            selected_vehicle_id,
            'planned',
            now(),
            now() + (estimated_duration || ' minutes')::interval,
            5 + random() * 20, -- Випадкова відстань 5-25 км
            1,
            'Автоматично створений маршрут для замовлення #' || NEW.id,
            true,
            now(),
            now() + (estimated_duration || ' minutes')::interval,
            route_geometry
        ) RETURNING id INTO new_route_id;
        
        -- Створюємо зупинку доставки
        INSERT INTO delivery_stops (
            route_id,
            order_id,
            sequence_number,
            status,
            planned_arrival,
            latitude,
            longitude,
            address
        ) VALUES (
            new_route_id,
            NEW.id,
            1,
            'pending',
            now() + (estimated_duration || ' minutes')::interval,
            warehouse_record.latitude + (random() - 0.5) * 0.1,
            warehouse_record.longitude + (random() - 0.5) * 0.1,
            NEW.shipping_address || ', ' || NEW.shipping_city
        );
        
        -- Оновлюємо статус транспорту
        UPDATE vehicles 
        SET status = 'in_delivery' 
        WHERE id = selected_vehicle_id;
        
        -- Встановлюємо початкову позицію транспорту на складі
        INSERT INTO vehicle_locations (
            vehicle_id,
            latitude,
            longitude,
            route_progress,
            updated_at
        ) VALUES (
            selected_vehicle_id,
            warehouse_record.latitude,
            warehouse_record.longitude,
            0,
            now()
        ) ON CONFLICT (vehicle_id) 
        DO UPDATE SET
            latitude = warehouse_record.latitude,
            longitude = warehouse_record.longitude,
            route_progress = 0,
            updated_at = now();
        
        -- Оновлюємо статус маршруту на 'in_progress'
        UPDATE delivery_routes 
        SET status = 'in_progress' 
        WHERE id = new_route_id;
        
        RAISE NOTICE 'Створено автоматичний маршрут % для замовлення % з транспортом %', 
            new_route_id, NEW.id, selected_vehicle_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Виправляємо функцію симуляції руху транспорту
CREATE OR REPLACE FUNCTION simulate_vehicle_movement()
RETURNS void AS $$
DECLARE
    route_record RECORD;
    current_location RECORD;
    start_coords numeric[];
    end_coords numeric[];
    progress numeric;
    new_lat numeric;
    new_lng numeric;
    elapsed_seconds numeric;
    total_duration_seconds numeric;
BEGIN
    -- Обробляємо всі активні симуляції
    FOR route_record IN 
        SELECT dr.* FROM delivery_routes dr
        WHERE dr.simulation_active = true 
        AND dr.status = 'in_progress'
        AND dr.simulation_end_time > now()
    LOOP
        -- Отримуємо поточну локацію транспорту
        SELECT vl.* INTO current_location
        FROM vehicle_locations vl
        WHERE vl.vehicle_id = route_record.vehicle_id;
        
        IF current_location IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Розраховуємо прогрес маршруту
        elapsed_seconds := EXTRACT(EPOCH FROM (now() - route_record.simulation_start_time));
        total_duration_seconds := EXTRACT(EPOCH FROM (route_record.simulation_end_time - route_record.simulation_start_time));
        progress := LEAST(elapsed_seconds / total_duration_seconds, 1.0);
        
        -- Отримуємо координати початку та кінця маршруту
        IF route_record.route_geometry IS NOT NULL THEN
            start_coords := ARRAY[
                (route_record.route_geometry->'coordinates'->0->>0)::numeric,
                (route_record.route_geometry->'coordinates'->0->>1)::numeric
            ];
            end_coords := ARRAY[
                (route_record.route_geometry->'coordinates'->1->>0)::numeric,
                (route_record.route_geometry->'coordinates'->1->>1)::numeric
            ];
            
            -- Розраховуємо нові координати (лінійна інтерполяція)
            new_lng := start_coords[1] + (end_coords[1] - start_coords[1]) * progress;
            new_lat := start_coords[2] + (end_coords[2] - start_coords[2]) * progress;
            
            -- Додаємо невеликі випадкові відхилення для реалістичності
            new_lng := new_lng + (random() - 0.5) * 0.001;
            new_lat := new_lat + (random() - 0.5) * 0.001;
            
            -- Оновлюємо позицію транспорту
            UPDATE vehicle_locations
            SET 
                latitude = new_lat,
                longitude = new_lng,
                route_progress = progress,
                speed = 40 + random() * 20, -- Швидкість 40-60 км/год
                heading = degrees(atan2(
                    end_coords[1] - start_coords[1],
                    end_coords[2] - start_coords[2]
                )),
                updated_at = now()
            WHERE vehicle_id = route_record.vehicle_id;
            
            -- Якщо маршрут завершено
            IF progress >= 1.0 THEN
                -- Оновлюємо статус маршруту
                UPDATE delivery_routes
                SET 
                    status = 'completed',
                    simulation_active = false,
                    end_time = now()
                WHERE id = route_record.id;
                
                -- Оновлюємо статус зупинки
                UPDATE delivery_stops
                SET 
                    status = 'completed',
                    actual_arrival = now()
                WHERE route_id = route_record.id;
                
                -- Оновлюємо статус транспорту
                UPDATE vehicles
                SET status = 'available'
                WHERE id = route_record.vehicle_id;
                
                -- Оновлюємо статус замовлення
                UPDATE orders
                SET status = 'delivered'
                WHERE id IN (
                    SELECT ds.order_id 
                    FROM delivery_stops ds
                    WHERE ds.route_id = route_record.id
                );
                
                RAISE NOTICE 'Маршрут % завершено', route_record.id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;