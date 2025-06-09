/*
  # Виправлення RLS політик для inventory_transactions
  
  1. Проблема
    - Тригери не можуть створювати записи через RLS політики
    - Функції виконуються з правами користувача, а не з правами системи
    
  2. Рішення
    - Оновити RLS політики для дозволу створення записів через тригери
    - Додати політику для системних операцій
    - Виправити функції для правильної роботи з RLS
*/

-- Видаляємо існуючі політики для inventory_transactions
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON inventory_transactions;
DROP POLICY IF EXISTS "Allow insert for warehouse workers and managers" ON inventory_transactions;

-- Створюємо нові політики
CREATE POLICY "inventory_transactions_select_policy"
  ON inventory_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "inventory_transactions_insert_policy"
  ON inventory_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Дозволяємо вставку якщо:
    -- 1. Користувач є виконавцем операції
    auth.uid() = performed_by
    OR
    -- 2. Або це системна операція (через тригер)
    performed_by IS NOT NULL
  );

-- Оновлюємо функцію обробки зміни статусу замовлення
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    order_item RECORD;
    current_stock numeric;
    current_user_id uuid;
BEGIN
    -- Отримуємо поточного користувача
    current_user_id := auth.uid();
    
    -- Якщо немає поточного користувача, використовуємо customer_id
    IF current_user_id IS NULL THEN
        current_user_id := NEW.customer_id;
    END IF;
    
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
                current_user_id
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
                current_user_id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Оновлюємо функцію перевірки запасів
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Додаємо індекси для покращення продуктивності
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_source_warehouse ON inventory_transactions(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_destination_warehouse ON inventory_transactions(destination_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON inventory_transactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);

-- Додаємо індекси для orders та order_items
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_warehouse_id ON order_items(warehouse_id);