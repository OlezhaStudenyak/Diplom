from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from inventory.models import (
    Warehouse, Department, Product, Batch, Transaction,
    Request, RequestItem, Vehicle, GPSDevice, Route,
    RoutePoint, WarehouseLocation, RouteGPSLog, GPSLocation
)
import random
from datetime import timedelta, datetime

User = get_user_model()


class Command(BaseCommand):
    help = 'Створює тестові дані для системи управління складом'

    def handle(self, *args, **kwargs):
        self.stdout.write('Створення тестових даних...')

        # 1. Створюємо користувачів з різними ролями
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='admin123',
                first_name='Адмін',
                last_name='Системний',
                role='admin'
            )
            self.stdout.write(self.style.SUCCESS(f'Створено адміністратора: {admin_user.username}'))

        if not User.objects.filter(username='warehouse_user').exists():
            warehouse_user = User.objects.create_user(
                username='warehouse_user',
                email='warehouse@example.com',
                password='warehouse123',
                first_name='Сергій',
                last_name='Логістичний',
                role='warehouse'
            )
            self.stdout.write(self.style.SUCCESS(f'Створено користувача: {warehouse_user.username}'))
        else:
            warehouse_user = User.objects.get(username='warehouse_user')
            self.stdout.write(f'Користувач warehouse_user вже існує')
        
        if not User.objects.filter(username='logistician').exists():
            logistician = User.objects.create_user(
                username='logistician',
                email='logistician@example.com',
                password='logistician123',
                first_name='Марія',
                last_name='Транспортна',
                role='logistician'
            )
            self.stdout.write(self.style.SUCCESS(f'Створено користувача: {logistician.username}'))
        else:
            logistician = User.objects.get(username='logistician')
            self.stdout.write(f'Користувач logistician вже існує')
        
        if not User.objects.filter(username='manager').exists():
            manager = User.objects.create_user(
                username='manager',
                email='manager@example.com',
                password='manager123',
                first_name='Олександр',
                last_name='Командний',
                role='manager'
            )
            self.stdout.write(self.style.SUCCESS(f'Створено користувача: {manager.username}'))
        else:
            manager = User.objects.get(username='manager')
            self.stdout.write(f'Користувач manager вже існує')
        
        if not User.objects.filter(username='driver').exists():
            driver_user = User.objects.create_user(
                username='driver',
                email='driver@example.com',
                password='driver123',
                first_name='Іван',
                last_name='Водійчук',
                role='driver'
            )
            self.stdout.write(self.style.SUCCESS(f'Створено користувача: {driver_user.username}'))
        else:
            driver_user = User.objects.get(username='driver')
            self.stdout.write(f'Користувач driver вже існує')

        # 2. Створюємо склади
        if not Warehouse.objects.filter(name='Центральний логістичний склад').exists():
            main_warehouse = Warehouse.objects.create(
                name='Центральний логістичний склад',
                address='м. Київ, військова частина А-0001',
                manager=warehouse_user
            )
            self.stdout.write(self.style.SUCCESS(f'Створено склад: {main_warehouse.name}'))
        else:
            main_warehouse = Warehouse.objects.get(name='Центральний логістичний склад')
            main_warehouse.manager = warehouse_user
            main_warehouse.save()
            self.stdout.write(f'Склад Центральний логістичний склад вже існує, оновлено менеджера')
        
        if not Warehouse.objects.filter(name='Фронтовий склад').exists():
            regional_warehouse = Warehouse.objects.create(
                name='Фронтовий склад',
                address='м. Запоріжжя, військова частина А-0002',
                manager=warehouse_user
            )
            self.stdout.write(self.style.SUCCESS(f'Створено склад: {regional_warehouse.name}'))
        else:
            regional_warehouse = Warehouse.objects.get(name='Фронтовий склад')

        # 3. Створюємо локації на складі
        warehouse_location_types = ['zone', 'rack', 'shelf']
        warehouse_locations = {}

        # Спочатку отримаємо всі існуючі локації для цього складу
        existing_locations = {loc.code: loc for loc in 
                              WarehouseLocation.objects.filter(warehouse=main_warehouse)}
        self.stdout.write(f'Знайдено існуючих локацій на складі: {len(existing_locations)}')
        
        # Створюємо зони
        for zone_num in range(1, 4):
            zone_code = f'Z{zone_num}'
            
            # Спочатку перевіряємо, чи є ця локація в існуючих
            if zone_code in existing_locations:
                zone = existing_locations[zone_code]
                self.stdout.write(f'Локація {zone_code} вже існує')
            else:
                try:
                    zone = WarehouseLocation.objects.create(
                        warehouse=main_warehouse,
                        code=zone_code,
                        name=f'Сектор {zone_num}',
                        type='zone',
                        parent=None
                    )
                    self.stdout.write(self.style.SUCCESS(f'Створено локацію: {zone.code} - {zone.name}'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Помилка створення локації {zone_code}: {str(e)}'))
                    # Спробуємо отримати існуючу локацію, якщо вона є
                    zone = WarehouseLocation.objects.filter(code=zone_code).first()
                    if not zone:
                        continue
            
            warehouse_locations[zone_code] = zone
        
            # Створюємо стелажі в кожній зоні
            for rack_num in range(1, 4):
                rack_code = f'{zone_code}-R{rack_num}'
                
                if rack_code in existing_locations:
                    rack = existing_locations[rack_code]
                    self.stdout.write(f'Локація {rack_code} вже існує')
                else:
                    try:
                        rack = WarehouseLocation.objects.create(
                            warehouse=main_warehouse,
                            code=rack_code,
                            name=f'Стелаж {rack_num} в {zone.name}',
                            type='rack',
                            parent=zone
                        )
                        self.stdout.write(self.style.SUCCESS(f'Створено локацію: {rack.code} - {rack.name}'))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Помилка створення локації {rack_code}: {str(e)}'))
                        # Спробуємо отримати існуючу локацію, якщо вона є
                        rack = WarehouseLocation.objects.filter(code=rack_code).first()
                        if not rack:
                            continue
                
                warehouse_locations[rack_code] = rack
        
                # Створюємо полиці в кожному стелажі
                for shelf_num in range(1, 4):
                    shelf_code = f'{rack_code}-S{shelf_num}'
                    
                    if shelf_code in existing_locations:
                        shelf = existing_locations[shelf_code]
                        self.stdout.write(f'Локація {shelf_code} вже існує')
                    else:
                        try:
                            shelf = WarehouseLocation.objects.create(
                                warehouse=main_warehouse,
                                code=shelf_code,
                                name=f'Полиця {shelf_num} в {rack.name}',
                                type='shelf',
                                parent=rack
                            )
                            self.stdout.write(self.style.SUCCESS(f'Створено локацію: {shelf.code} - {shelf.name}'))
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'Помилка створення локації {shelf_code}: {str(e)}'))
                            # Спробуємо отримати існуючу локацію, якщо вона є
                            shelf = WarehouseLocation.objects.filter(code=shelf_code).first()
                            if not shelf:
                                continue
                    
                    warehouse_locations[shelf_code] = shelf

        # 4. Створюємо військові підрозділи
        if not Department.objects.filter(name='72 ОМБр').exists():
            unit_72 = Department.objects.create(
                name='72 ОМБр',
                contact_person='Майор Петренко',
                contact_phone='+380991234567'
            )
            self.stdout.write(self.style.SUCCESS(f'Створено підрозділ: {unit_72.name}'))
        else:
            unit_72 = Department.objects.get(name='72 ОМБр')
        
        if not Department.objects.filter(name='24 ОШБ').exists():
            unit_24 = Department.objects.create(
                name='24 ОШБ',
                contact_person='Капітан Марченко',
                contact_phone='+380997654321'
            )
            self.stdout.write(self.style.SUCCESS(f'Створено підрозділ: {unit_24.name}'))
        else:
            unit_24 = Department.objects.get(name='24 ОШБ')
        
        if not Department.objects.filter(name='95 ОДШБр').exists():
            unit_95 = Department.objects.create(
                name='95 ОДШБр',
                contact_person='Полковник Коваленко',
                contact_phone='+380932223333'
            )
            self.stdout.write(self.style.SUCCESS(f'Створено підрозділ: {unit_95.name}'))
        else:
            unit_95 = Department.objects.get(name='95 ОДШБр')

        # 5. Створюємо продукти
        product_categories = ['Продовольство', 'Медикаменти', 'Спорядження', 'Дрони']
        product_data = [
            {'name': 'Сухий пайок', 'unit': 'шт', 'category': 'Продовольство',
             'description': 'МРЕ, калорійність 3200 ккал, термін зберігання 24 місяці'},
            {'name': 'Тушонка яловича', 'unit': 'шт', 'category': 'Продовольство', 
             'description': 'Вищий сорт, вага 338г'},
            {'name': 'Аптечка тактична', 'unit': 'шт', 'category': 'Медикаменти',
             'description': 'IFAK, повна комплектація, відповідність стандартам НАТО'},
            {'name': 'Кровоспинний джгут', 'unit': 'шт', 'category': 'Медикаменти',
             'description': 'CAT-7, військовий турнікет, синій колір'},
            {'name': 'Розвантажувальний жилет', 'unit': 'шт', 'category': 'Спорядження',
             'description': 'Plate Carrier, розмір M/L, мультикам'},
            {'name': 'Тактичні рукавиці', 'unit': 'пара', 'category': 'Спорядження',
             'description': 'Захисні, з посиленими вставками, розмір L'},
            {'name': 'Дрон DJI Mavic 3', 'unit': 'шт', 'category': 'Дрони',
             'description': 'Розвідувальний БПЛА, дальність польоту до 30 км'},
            {'name': 'FPV дрон', 'unit': 'шт', 'category': 'Дрони', 
             'description': 'Ударний БПЛА, корпус посилений, радіус дії до 10 км'},
        ]

        products = []
        for product_info in product_data:
            product, created = Product.objects.get_or_create(
                name=product_info['name'],
                defaults={
                    'unit': product_info['unit'],
                    'category': product_info['category'],
                    'description': product_info['description']
                }
            )
            products.append(product)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Створено продукт: {product.name}'))
            else:
                self.stdout.write(f'Продукт {product.name} вже існує')

        # 6. Створюємо партії товарів
        batch_numbers = ['B001', 'B002', 'B003', 'B004', 'B005', 'B006', 'B007', 'B008']

        for i, product in enumerate(products):
            batch_number = batch_numbers[i % len(batch_numbers)]
            shelf_location = random.choice(list(warehouse_locations.values()))

            # Перевіряємо, чи існує вже така партія
            if not Batch.objects.filter(product=product, batch_number=batch_number, warehouse=main_warehouse).exists():
                batch = Batch.objects.create(
                    product=product,
                    batch_number=batch_number,
                    warehouse=main_warehouse,
                    location=shelf_location if shelf_location.type == 'shelf' else None,
                    quantity=random.randint(10, 100),
                    production_date=timezone.now() - timedelta(days=random.randint(10, 100)),
                    expiry_date=timezone.now() + timedelta(days=random.randint(100, 500))
                )
                self.stdout.write(self.style.SUCCESS(f'Створено партію: {batch.batch_number} для {product.name}'))

                # Створюємо транзакцію надходження
                Transaction.objects.create(
                    batch=batch,
                    user=warehouse_user,
                    type=Transaction.INCOMING,
                    quantity=batch.quantity,
                    note=f'Початкове надходження партії {batch.batch_number}'
                )
                self.stdout.write(self.style.SUCCESS('Створено транзакцію надходження'))

        # 7. Створюємо заявки
        # Створюємо одну заявку зі статусом "pending"
        if not Request.objects.filter(user=manager, status='pending').exists():
            pending_request = Request.objects.create(
                user=manager,
                department=unit_72,
                status='pending',
                planned_date=timezone.now().date() + timedelta(days=7)
            )
            self.stdout.write(self.style.SUCCESS(f'Створено заявку: #{pending_request.id} (pending)'))
        
            # Додаємо кілька товарів до заявки
            for i in range(2):
                product = random.choice(products)
                RequestItem.objects.create(
                    request=pending_request,
                    product=product,
                    quantity=random.randint(1, 5)
                )
                self.stdout.write(self.style.SUCCESS(f'Додано товар {product.name} до заявки #{pending_request.id}'))
        
        # Створюємо одну заявку зі статусом "approved"
        if not Request.objects.filter(user=manager, status='approved').exists():
            approved_request = Request.objects.create(
                user=manager,
                department=unit_24,
                status='approved',
                planned_date=timezone.now().date() + timedelta(days=3)
            )
            self.stdout.write(self.style.SUCCESS(f'Створено заявку: #{approved_request.id} (approved)'))
        
            # Додаємо кілька товарів до заявки
            for i in range(3):
                product = random.choice(products)
                RequestItem.objects.create(
                    request=approved_request,
                    product=product,
                    quantity=random.randint(1, 10)
                )
                self.stdout.write(self.style.SUCCESS(f'Додано товар {product.name} до заявки #{approved_request.id}'))
        
        # Створюємо одну заявку зі статусом "fulfilled"
        if not Request.objects.filter(user=manager, status='fulfilled').exists():
            fulfilled_request = Request.objects.create(
                user=manager,
                department=unit_95,
                status='fulfilled',
                planned_date=timezone.now().date() - timedelta(days=5)
            )
            self.stdout.write(self.style.SUCCESS(f'Створено заявку: #{fulfilled_request.id} (fulfilled)'))

            # Додаємо кілька товарів до заявки
            for i in range(2):
                product = random.choice(products)
                RequestItem.objects.create(
                    request=fulfilled_request,
                    product=product,
                    quantity=random.randint(1, 8)
                )
                self.stdout.write(self.style.SUCCESS(f'Додано товар {product.name} до заявки #{fulfilled_request.id}'))

        # 8. Створюємо автомобілі
        vehicle_types = ['truck', 'van', 'car']
        vehicle_statuses = ['available', 'in_use', 'maintenance']


        vehicle_data = [
            {'name': 'КрАЗ-6322', 'plate_number': 'ЗСУ1234', 'type': 'truck', 'status': 'available',
             'year': 2018, 'capacity': 12000, 'volume': 20},
            {'name': 'Ford F-350', 'plate_number': 'ЗСУ5678', 'type': 'van', 'status': 'available',
             'year': 2021, 'capacity': 3500, 'volume': 10},
            {'name': 'Mitsubishi L200', 'plate_number': 'ЗСУ9012', 'type': 'car', 'status': 'available',
             'year': 2022, 'capacity': 1000, 'volume': 2.5, 'driver_user': driver_user},
            {'name': 'MAN TGS', 'plate_number': 'ЗСУ3456', 'type': 'truck', 'status': 'in_use',
             'year': 2019, 'capacity': 10000, 'volume': 30},
            {'name': 'Mercedes Sprinter', 'plate_number': 'ЗСУ7890', 'type': 'van', 'status': 'maintenance',
             'year': 2020, 'capacity': 2500, 'volume': 12},
        ]

        vehicles = []
        for vehicle_info in vehicle_data:
            driver = None
            if vehicle_info['status'] == 'in_use':
                driver = logistician
            elif 'driver_user' in vehicle_info:
                driver = vehicle_info['driver_user']
                
            vehicle, created = Vehicle.objects.get_or_create(
                plate_number=vehicle_info['plate_number'],
                defaults={
                    'name': vehicle_info['name'],
                    'warehouse': main_warehouse,
                    'type': vehicle_info['type'],
                    'status': vehicle_info['status'],
                    'driver': driver,
                    'last_maintenance': timezone.now() - timedelta(days=random.randint(10, 90)),
                    'year': vehicle_info['year'],
                    'capacity': vehicle_info['capacity'],
                    'volume': vehicle_info['volume'],
                    'model': f"Модель {random.randint(100, 999)}"  # Додаємо випадкову модель
                }
            )
            vehicles.append(vehicle)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Створено транспортний засіб: {vehicle.name}'))
            else:
                self.stdout.write(f'Транспортний засіб {vehicle.name} вже існує')

        # 9. Створюємо GPS-пристрої
        # Створюємо список для перевірки успішного створення GPS-пристроїв
        created_gps_devices = []
        
        for i, vehicle in enumerate(vehicles):
            if not GPSDevice.objects.filter(serial_number=f'GPS-{1000 + i}').exists():
                try:
                    gps_device = GPSDevice.objects.create(
                        device_id=f'DEV-{2000 + i}',  # Додаємо device_id, який є обов'язковим
                        serial_number=f'GPS-{1000 + i}',
                        model=f'GPS Tracker {random.choice(["Pro", "Lite", "Max"])}',
                        vehicle=vehicle,
                        installation_date=timezone.now() - timedelta(days=random.randint(30, 180)),
                        last_connection=timezone.now() - timedelta(minutes=random.randint(5, 120)),
                        # Змінюємо last_update на last_connection
                        status='active' if vehicle.status != 'maintenance' else 'inactive'
                    )
                    created_gps_devices.append(gps_device)
                    self.stdout.write(self.style.SUCCESS(f'Створено GPS-пристрій: {gps_device.serial_number}'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Помилка створення GPS-пристрою для {vehicle.name}: {str(e)}'))
            else:
                existing_device = GPSDevice.objects.filter(serial_number=f'GPS-{1000 + i}').first()
                created_gps_devices.append(existing_device)
                self.stdout.write(f'GPS-пристрій з серійним номером GPS-{1000 + i} вже існує')
        
        self.stdout.write(f'Успішно створено або знайдено {len(created_gps_devices)} GPS-пристроїв з {len(vehicles)} транспортних засобів')

        # 10. Створюємо маршрути і точки маршруту
        route_statuses = ['planned', 'in_progress', 'completed']

        for i in range(3):
            status = route_statuses[i]
            if not Route.objects.filter(name=f'Логістичний маршрут {i + 1}').exists():
                route = Route.objects.create(
                    name=f'Логістичний маршрут {i + 1}',
                    warehouse=main_warehouse,
                    status=status,
                    date=timezone.now().date(),  # Додаємо обов'язкове поле date
                    vehicle=vehicles[i] if i < len(vehicles) else None,
                    driver=logistician if status in ['in_progress', 'completed'] else None,
                    planned_start_time=timezone.now() + timedelta(
                        days=1) if status == 'planned' else timezone.now() - timedelta(days=1),
                    planned_end_time=timezone.now() + timedelta(days=1,
                                                                hours=4) if status == 'planned' else timezone.now() - timedelta(
                        hours=20),
                    actual_start_time=None if status == 'planned' else timezone.now() - timedelta(days=1, hours=1),
                    actual_end_time=None if status in ['planned', 'in_progress'] else timezone.now() - timedelta(
                        hours=21)
                )
                self.stdout.write(self.style.SUCCESS(f'Створено маршрут: {route.name} ({status})'))

                # Додаємо точки маршруту
                requests = Request.objects.all()[:2]  # Беремо дві перші заявки
                for j, req in enumerate(requests):
                    point = RoutePoint.objects.create(
                        route=route,
                        order=j + 1,
                        address=f'Адреса {j + 1}',
                        request=req,
                        completed=True if status == 'completed' else False,
                        actual_arrival_time=None if status == 'planned' else timezone.now() - timedelta(hours=23 - j)
                    )
                    self.stdout.write(self.style.SUCCESS(f'Додано точку {point.order} до маршруту {route.name}'))

                # Створюємо GPS-логи для маршруту
                if status in ['in_progress', 'completed'] and route.vehicle:  # Перевіряємо наявність транспортного засобу
                    # Додатково перевіряємо наявність GPS-пристрою для цього транспортного засобу
                    gps_device_exists = GPSDevice.objects.filter(vehicle=route.vehicle).exists()
                    if gps_device_exists:
                        gps_log = RouteGPSLog.objects.create(
                            route=route,
                            vehicle=route.vehicle,
                            start_time=route.actual_start_time,
                            end_time=route.actual_end_time,
                            distance=random.randint(10, 100),
                            avg_speed=random.randint(30, 70)
                        )
                        self.stdout.write(self.style.SUCCESS(f'Створено GPS-лог для маршруту {route.name}'))
                    else:
                        self.stdout.write(self.style.WARNING(f'Для транспортного засобу {route.vehicle} не знайдено GPS-пристрою, пропускаємо створення GPS-логу'))
                elif status in ['in_progress', 'completed']:
                    self.stdout.write(self.style.WARNING(f'Маршрут {route.name} не має привʼязаного транспортного засобу, пропускаємо створення GPS-логу'))

                    # Додаємо GPS-локації, тільки якщо маршрут має транспортний засіб
                    if route.vehicle:
                        for k in range(5):
                            # Знаходимо GPS-пристрій для автомобіля
                            device = GPSDevice.objects.filter(vehicle=route.vehicle).first()
                            if device:  # Перевіряємо, чи є пристрій
                                time_offset = timedelta(minutes=k * 30)
                                location = GPSLocation.objects.create(
                                    vehicle=route.vehicle,
                                    device=device,  # Використовуємо знайдений пристрій
                                    latitude=50.4 + random.random() / 10,
                                    longitude=30.5 + random.random() / 10,
                                    timestamp=route.actual_start_time + time_offset if route.actual_start_time else timezone.now() - timedelta(
                                        hours=24 - k),
                                    speed=random.randint(0, 90),
                                    route=route  # Змінюємо route_log на route
                                )
                                self.stdout.write(self.style.SUCCESS(f'Додано GPS-локацію #{k + 1} для маршруту {route.name}'))
                            else:
                                self.stdout.write(self.style.WARNING(f'Не знайдено GPS-пристрій для автомобіля {route.vehicle}, пропускаємо створення локації'))
                    else:
                        self.stdout.write(self.style.WARNING(f'Маршрут {route.name} не має привʼязаного транспортного засобу, пропускаємо створення GPS-локацій'))
                        self.stdout.write(self.style.SUCCESS(f'Додано GPS-локацію #{k + 1} для маршруту {route.name}'))

        self.stdout.write(self.style.SUCCESS('Успішно створено всі тестові дані!'))
        self.stdout.write(
            self.style.WARNING(
                'Логіни та паролі тестових користувачів:\n'
                '- admin / admin123 (роль: admin)\n'
                '- warehouse_user / warehouse123 (роль: warehouse)\n'
                '- logistician / logistician123 (роль: logistician)\n'
                '- manager / manager123 (роль: manager)\n'
                '- driver / driver123 (роль: driver)'
            )
        )