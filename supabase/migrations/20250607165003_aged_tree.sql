/*
  # Автоматичне оновлення статусів замовлень та система відстеження

  1. Функції
    - Автоматичне створення маршрутів при підтвердженні замовлення
    - Симуляція руху транспорту в реальному часі
    - Автоматичне оновлення статусів замовлень
    - Система сповіщень для клієнтів

  2. Таблиці
    - notifications - сповіщення для користувачів
    - Додаткові поля для delivery_routes (симуляція)
    - Додаткові поля для vehicle_locations (прогрес маршруту)

  3. Представлення
    - customer_order_tracking - відстеження замовлень клієнтами

  4. Безпека
    - RLS політики для сповіщень
    - Доступ до відстеження тільки для власників замовлень
*/

-- Додаємо поля для симуляції до delivery_routes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_routes' AND column_name = 'simulation_active'
  ) THEN
    ALTER TABLE delivery_routes 
    ADD COLUMN simulation_active boolean DEFAULT false,
    ADD COLUMN simulation_start_time timestamptz,
    ADD COLUMN simulation_end_time timestamptz,
    ADD COLUMN route_geometry jsonb;
  END IF;
END $$;

-- Додаємо поле для прогресу маршруту до vehicle_locations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_locations' AND column_name = 'route_progress'
  ) THEN
    ALTER TABLE vehicle_locations 
    ADD COLUMN route_progress numeric DEFAULT 0 CHECK (route_progress >= 0 AND route_progress <= 1);
  END IF;
END $$;

-- Створюємо індекси для нових полів
CREATE INDEX IF NOT EXISTS idx_delivery_routes_simulation_active ON delivery_routes(simulation_active);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_updated_at ON vehicle_locations(updated_at);

-- Додаємо унікальний індекс для vehicle_locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'vehicle_locations_vehicle_id_unique'
  ) THEN
    CREATE UNIQUE INDEX vehicle_locations_vehicle_id_unique ON vehicle_locations(vehicle_id);
  END IF;
END $$;

-- Функція для пошуку найближчого доступного транспорту
CREATE OR REPLACE FUNCTION find_nearest_available_vehicle(
    warehouse_lat numeric,
    warehouse_lng numeric
) RETURNS uuid AS $$
DECLARE
    vehicle_id uuid;
BEGIN
    SELECT v.id INTO vehicle_id
    FROM vehicles v
    WHERE v.status = 'available'
    ORDER BY random() -- Для простоти беремо випадковий доступний транспорт
    LIMIT 1;
    
    RETURN vehicle_id;
END;
$$ LANGUAGE plpgsql;

-- Оновлюємо функцію створення автоматичного маршруту
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
        
        -- АВТОМАТИЧНО ОНОВЛЮЄМО СТАТУС ЗАМОВЛЕННЯ НА "SHIPPED"
        UPDATE orders 
        SET status = 'shipped'
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Створено автоматичний маршрут % для замовлення % з транспортом %', 
            new_route_id, NEW.id, selected_vehicle_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Створюємо тригер для автоматичного створення маршрутів
DROP TRIGGER IF EXISTS create_automatic_delivery_route_trigger ON orders;
CREATE TRIGGER create_automatic_delivery_route_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_automatic_delivery_route();

-- Оновлюємо функцію симуляції руху транспорту
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
    order_ids uuid[];
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
                -- Отримуємо ID замовлень для цього маршруту
                SELECT array_agg(ds.order_id) INTO order_ids
                FROM delivery_stops ds
                WHERE ds.route_id = route_record.id;
                
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
                
                -- АВТОМАТИЧНО ОНОВЛЮЄМО СТАТУС ЗАМОВЛЕННЯ НА "DELIVERED"
                UPDATE orders
                SET status = 'delivered'
                WHERE id = ANY(order_ids);
                
                RAISE NOTICE 'Маршрут % завершено, замовлення % доставлено', route_record.id, order_ids;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Створюємо таблицю сповіщень
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    order_id uuid REFERENCES orders(id),
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Індекси для сповіщень
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- RLS для сповіщень
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
    ON notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Функція для відправки сповіщення про зміну статусу замовлення
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Відправляємо сповіщення тільки при зміні статусу
    IF OLD.status <> NEW.status THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            order_id
        ) VALUES (
            NEW.customer_id,
            'order_status_change',
            'Статус замовлення змінено',
            CASE NEW.status
                WHEN 'confirmed' THEN 'Ваше замовлення #' || NEW.id || ' підтверджено та готується до відправки'
                WHEN 'shipped' THEN 'Ваше замовлення #' || NEW.id || ' відправлено! Відстежуйте доставку в реальному часі'
                WHEN 'delivered' THEN 'Ваше замовлення #' || NEW.id || ' успішно доставлено!'
                WHEN 'cancelled' THEN 'Ваше замовлення #' || NEW.id || ' скасовано'
                ELSE 'Статус вашого замовлення #' || NEW.id || ' змінено на: ' || NEW.status
            END,
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Тригер для сповіщень про зміну статусу
DROP TRIGGER IF EXISTS notify_order_status_change_trigger ON orders;
CREATE TRIGGER notify_order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_status_change();

-- Представлення для відстеження замовлень клієнтами
CREATE OR REPLACE VIEW customer_order_tracking AS
SELECT 
    o.id as order_id,
    o.status as order_status,
    o.created_at as order_date,
    o.shipping_address,
    o.shipping_city,
    o.total_amount,
    dr.id as route_id,
    dr.status as delivery_status,
    dr.start_time as delivery_start,
    dr.simulation_end_time as estimated_delivery,
    v.license_plate as vehicle_plate,
    v.make || ' ' || v.model as vehicle_info,
    vl.latitude as current_latitude,
    vl.longitude as current_longitude,
    vl.route_progress,
    vl.speed as current_speed,
    vl.updated_at as last_location_update,
    ds.planned_arrival,
    ds.actual_arrival,
    ds.status as stop_status
FROM orders o
LEFT JOIN delivery_stops ds ON ds.order_id = o.id
LEFT JOIN delivery_routes dr ON dr.id = ds.route_id
LEFT JOIN vehicles v ON v.id = dr.vehicle_id
LEFT JOIN vehicle_locations vl ON vl.vehicle_id = v.id
WHERE o.status IN ('confirmed', 'shipped', 'delivered');

-- Надаємо доступ до представлення
GRANT SELECT ON customer_order_tracking TO authenticated;