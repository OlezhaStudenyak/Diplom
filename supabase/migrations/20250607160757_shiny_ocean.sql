/*
  # Виправлення інтеграції замовлень та запасів
  
  1. Функції
    - Функція для автоматичного списання товарів при підтвердженні замовлення
    - Функція для перевірки наявності товарів перед створенням замовлення
    - Функція для повернення товарів при скасуванні замовлення
    
  2. Тригери
    - Тригер для обробки зміни статусу замовлення
    - Тригер для перевірки наявності при додаванні товарів
    
  3. Представлення
    - Представлення для відображення інформації про замовлення з запасами
*/

-- Функція для обробки зміни статусу замовлення
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    current_stock numeric;
BEGIN
    -- Обробляємо тільки зміни статусу
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Якщо замовлення підтверджується (pending -> confirmed)
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
        -- Перевіряємо наявність товарів та списуємо їх
        FOR order_item IN 
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = NEW.id
        LOOP
            -- Перевіряємо поточний запас
            SELECT COALESCE(quantity, 0) INTO current_stock
            FROM inventory_levels
            WHERE product_id = order_item.product_id 
            AND warehouse_id = order_item.warehouse_id;
            
            -- Якщо недостатньо товару, скасовуємо операцію
            IF current_stock < order_item.quantity THEN
                RAISE EXCEPTION 'Недостатньо товару % на складі. Доступно: %, потрібно: %', 
                    order_item.product_name, current_stock, order_item.quantity;
            END IF;
            
            -- Списуємо товар зі складу
            UPDATE inventory_levels
            SET quantity = quantity - order_item.quantity,
                updated_at = now()
            WHERE product_id = order_item.product_id 
            AND warehouse_id = order_item.warehouse_id;
            
            -- Створюємо запис про транзакцію
            INSERT INTO inventory_transactions (
                product_id,
                source_warehouse_id,
                quantity,
                transaction_type,
                reference_number,
                notes,
                performed_by
            ) VALUES (
                order_item.product_id,
                order_item.warehouse_id,
                order_item.quantity,
                'shipment',
                'ORDER-' || NEW.id,
                'Автоматичне списання для замовлення #' || NEW.id,
                NEW.customer_id
            );
        END LOOP;
    END IF;
    
    -- Якщо замовлення скасовується після підтвердження
    IF OLD.status IN ('confirmed', 'processing', 'shipped') AND NEW.status = 'cancelled' THEN
        -- Повертаємо товари на склад
        FOR order_item IN 
            SELECT * FROM order_items WHERE order_id = NEW.id
        LOOP
            -- Повертаємо товар на склад
            UPDATE inventory_levels
            SET quantity = quantity + order_item.quantity,
                updated_at = now()
            WHERE product_id = order_item.product_id 
            AND warehouse_id = order_item.warehouse_id;
            
            -- Створюємо запис про транзакцію повернення
            INSERT INTO inventory_transactions (
                product_id,
                destination_warehouse_id,
                quantity,
                transaction_type,
                reference_number,
                notes,
                performed_by
            ) VALUES (
                order_item.product_id,
                order_item.warehouse_id,
                order_item.quantity,
                'receipt',
                'RETURN-' || NEW.id,
                'Повернення товару через скасування замовлення #' || NEW.id,
                COALESCE(auth.uid(), NEW.customer_id)
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Створюємо тригер для обробки зміни статусу замовлення
DROP TRIGGER IF EXISTS handle_order_status_change_trigger ON orders;
CREATE TRIGGER handle_order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_status_change();

-- Функція для перевірки наявності товарів перед створенням замовлення
CREATE OR REPLACE FUNCTION check_inventory_before_order()
RETURNS TRIGGER AS $$
DECLARE
    current_stock numeric;
    product_name text;
BEGIN
    -- Перевіряємо наявність товару
    SELECT COALESCE(il.quantity, 0), p.name 
    INTO current_stock, product_name
    FROM inventory_levels il
    RIGHT JOIN products p ON p.id = NEW.product_id
    WHERE il.product_id = NEW.product_id 
    AND il.warehouse_id = NEW.warehouse_id;
    
    -- Якщо товару немає або недостатньо
    IF current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Недостатньо товару "%" на складі. Доступно: %, потрібно: %', 
            product_name, COALESCE(current_stock, 0), NEW.quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Створюємо тригер для перевірки наявності при додаванні товарів до замовлення
DROP TRIGGER IF EXISTS check_inventory_before_order_trigger ON order_items;
CREATE TRIGGER check_inventory_before_order_trigger
    BEFORE INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION check_inventory_before_order();

-- Створюємо представлення для відображення інформації про замовлення з запасами
DROP VIEW IF EXISTS order_inventory_summary;
CREATE VIEW order_inventory_summary AS
SELECT 
    o.id as order_id,
    o.status as order_status,
    o.created_at as order_date,
    o.customer_id,
    p.first_name || ' ' || p.last_name as customer_name,
    oi.id as order_item_id,
    oi.product_id,
    pr.name as product_name,
    pr.sku as product_sku,
    oi.quantity as ordered_quantity,
    oi.unit_price,
    oi.total_price,
    w.name as warehouse_name,
    COALESCE(il.quantity, 0) as current_stock,
    CASE 
        WHEN o.status IN ('confirmed', 'processing', 'shipped') THEN oi.quantity
        ELSE 0
    END as reserved_quantity,
    COALESCE(it.quantity, 0) as shipped_quantity,
    it.created_at as shipped_date
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products pr ON pr.id = oi.product_id
JOIN warehouses w ON w.id = oi.warehouse_id
LEFT JOIN profiles p ON p.id = o.customer_id
LEFT JOIN inventory_levels il ON il.product_id = oi.product_id AND il.warehouse_id = oi.warehouse_id
LEFT JOIN inventory_transactions it ON it.product_id = oi.product_id 
    AND it.source_warehouse_id = oi.warehouse_id 
    AND it.reference_number = 'ORDER-' || o.id
    AND it.transaction_type = 'shipment'
ORDER BY o.created_at DESC, oi.id;

-- Надаємо доступ до представлення
GRANT SELECT ON order_inventory_summary TO authenticated;

-- Додаємо тестові дані для демонстрації
DO $$
DECLARE
    test_warehouse_id uuid;
    test_product_id uuid;
    test_category_id uuid;
BEGIN
    -- Створюємо тестову категорію
    INSERT INTO product_categories (name, description)
    VALUES ('Тестова категорія', 'Категорія для тестування')
    RETURNING id INTO test_category_id;
    
    -- Створюємо тестовий товар
    INSERT INTO products (
        name, sku, description, category_id, price, cost, 
        unit_type, unit_value, minimum_stock, maximum_stock
    )
    VALUES (
        'Тестовий товар', 'TEST-001', 'Товар для тестування', 
        test_category_id, 100.00, 50.00, 'piece', 1, 10, 100
    )
    RETURNING id INTO test_product_id;
    
    -- Знаходимо перший склад
    SELECT id INTO test_warehouse_id FROM warehouses LIMIT 1;
    
    -- Якщо немає складів, створюємо тестовий
    IF test_warehouse_id IS NULL THEN
        INSERT INTO warehouses (
            name, address, city, state, country, postal_code,
            latitude, longitude, total_capacity, status
        )
        VALUES (
            'Тестовий склад', 'вул. Тестова, 1', 'Київ', 'Київська область', 
            'Україна', '01001', 50.4501, 30.5234, 1000, 'active'
        )
        RETURNING id INTO test_warehouse_id;
    END IF;
    
    -- Додаємо запаси товару на склад
    INSERT INTO inventory_levels (
        product_id, warehouse_id, quantity, minimum_quantity, maximum_quantity
    )
    VALUES (
        test_product_id, test_warehouse_id, 50, 10, 100
    )
    ON CONFLICT (product_id, warehouse_id) 
    DO UPDATE SET quantity = 50;
    
END $$;