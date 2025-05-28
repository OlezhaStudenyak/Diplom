from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class CustomUser(AbstractUser):
    ROLES = [
        ('admin', 'Адміністратор'),
        ('warehouse', 'Складський працівник'),
        ('logistician', 'Логіст'),
        ('manager', 'Менеджер'),
        ('driver', 'Водій'),
    ]
    role = models.CharField(max_length=20, choices=ROLES, default='manager')
    phone = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return self.username


class Warehouse(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField()
    manager = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='managed_warehouses')

    def __str__(self):
        return self.name

class WarehouseLocation(models.Model):
    LOCATION_TYPES = [
        ('zone', 'Зона'),
        ('rack', 'Стелаж'),
        ('shelf', 'Полиця'),
        ('bin', 'Комірка'),
        ('other', 'Інше'),
    ]
    
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=20, choices=LOCATION_TYPES, default='bin')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['warehouse', 'code']
        unique_together = ['warehouse', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_type_display()})"
    
    @property
    def full_path(self):
        path = [self.code]
        current = self.parent
        
        while current:
            path.insert(0, current.code)
            current = current.parent
            
        return ' > '.join(path)



class Department(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)  # напр., "шт.", "кг"
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Batch(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='batches')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='batches')
    location = models.ForeignKey(WarehouseLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='batches')
    batch_number = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField()
    production_date = models.DateField()
    expiry_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product.name} – {self.batch_number}"
        
    @property
    def location_display(self):
        if self.location:
            return self.location.full_path
        return "Не вказано"


class Transaction(models.Model):
    INCOMING = 'IN'
    OUTGOING = 'OUT'
    TRANSFER = 'TR'
    INVENTORY = 'IV'

    TYPE_CHOICES = [
        (INCOMING, 'Прийом'),
        (OUTGOING, 'Відпуск'),
        (TRANSFER, 'Переміщення'),
        (INVENTORY, 'Інвентаризація'),
    ]

    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='transactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    type = models.CharField(max_length=3, choices=TYPE_CHOICES)
    quantity = models.PositiveIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    destination = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    destination_warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True)
    note = models.TextField(blank=True)
    inventory = models.ForeignKey('Inventory', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')

    def __str__(self):
        return f"{self.get_type_display()} {self.quantity} од. {self.batch}"


class Request(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Очікує'),
        ('approved', 'Затверджено'),
        ('rejected', 'Відхилено'),
        ('fulfilled', 'Виконано'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    planned_date = models.DateField(null=True, blank=True)
    rejection_note = models.TextField(blank=True)

    def __str__(self):
        return f"Заявка #{self.id} від {self.user.username}"


class RequestItem(models.Model):
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.product.name} - {self.quantity} {self.product.unit}"


class Vehicle(models.Model):
    """
    Модель для транспортних засобів компанії, які використовуються для доставки товарів.
    """
    TYPE_CHOICES = [
        ('truck', 'Вантажівка'),
        ('van', 'Фургон'),
        ('car', 'Легковий автомобіль'),
        ('special', 'Спеціальний транспорт'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Активний'),
        ('inactive', 'Неактивний'),
        ('maintenance', 'На обслуговуванні'),
        ('repair', 'На ремонті'),
    ]
    
    name = models.CharField(max_length=100, verbose_name="Назва")
    plate_number = models.CharField(max_length=20, unique=True, verbose_name="Номерний знак")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Тип транспорту")
    model = models.CharField(max_length=100, verbose_name="Модель")
    year = models.PositiveIntegerField(verbose_name="Рік випуску")
    capacity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Вантажопідйомність (кг)")
    volume = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Об'єм вантажного відсіку (м³)")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, 
                                related_name='vehicles', verbose_name="Прикріплений до складу")
    driver = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, 
                             related_name='assigned_vehicles', verbose_name="Водій")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', 
                             verbose_name="Статус")
    last_maintenance = models.DateField(null=True, blank=True, verbose_name="Дата останнього ТО")
    next_maintenance = models.DateField(null=True, blank=True, verbose_name="Дата наступного ТО")
    notes = models.TextField(blank=True, verbose_name="Примітки")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Транспортний засіб"
        verbose_name_plural = "Транспортні засоби"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.plate_number})"
    
    @property
    def is_available(self):
        """Перевіряє, чи доступний транспортний засіб для використання"""
        return self.status == 'active'
    
    @property
    def maintenance_due(self):
        """Перевіряє, чи потрібне технічне обслуговування"""
        if not self.next_maintenance:
            return False
        from datetime import date
        return self.next_maintenance <= date.today()


class GPSDevice(models.Model):
    """
    Модель для GPS-трекерів, встановлених на транспортні засоби
    """
    STATUS_CHOICES = [
        ('active', 'Активний'),
        ('inactive', 'Неактивний'),
        ('malfunction', 'Несправний'),
    ]
    
    vehicle = models.OneToOneField(Vehicle, on_delete=models.CASCADE, related_name='gps_device', 
                                 verbose_name="Транспортний засіб")
    device_id = models.CharField(max_length=100, unique=True, verbose_name="ID пристрою")
    model = models.CharField(max_length=100, verbose_name="Модель пристрою")
    serial_number = models.CharField(max_length=100, unique=True, verbose_name="Серійний номер")
    installation_date = models.DateField(verbose_name="Дата встановлення")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', 
                             verbose_name="Статус")
    last_connection = models.DateTimeField(null=True, blank=True, verbose_name="Останнє з'єднання")
    notes = models.TextField(blank=True, verbose_name="Примітки")
    
    class Meta:
        verbose_name = "GPS-пристрій"
        verbose_name_plural = "GPS-пристрої"
    
    def __str__(self):
        return f"GPS-трекер {self.device_id} на {self.vehicle}"
    
    @property
    def is_online(self):
        """Перевіряє, чи пристрій в мережі на основі останнього з'єднання"""
        if not self.last_connection:
            return False
        from datetime import datetime, timedelta
        return datetime.now() - self.last_connection < timedelta(minutes=15)


class Route(models.Model):
    STATUS_CHOICES = [
        ('planned', 'Заплановано'),
        ('in_progress', 'Виконується'),
        ('completed', 'Завершено'),
    ]

    name = models.CharField(max_length=255)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='routes', null=True, blank=True)
    date = models.DateField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='planned')
    driver = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, 
                             related_name='assigned_routes', verbose_name="Водій")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, 
                              related_name='assigned_routes', verbose_name="Транспортний засіб")
    planned_start_time = models.TimeField(null=True, blank=True, verbose_name="Запланований час початку")
    planned_end_time = models.TimeField(null=True, blank=True, verbose_name="Запланований час закінчення")
    actual_start_time = models.DateTimeField(null=True, blank=True, verbose_name="Фактичний час початку")
    actual_end_time = models.DateTimeField(null=True, blank=True, verbose_name="Фактичний час закінчення")
    planned_distance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, 
                                         verbose_name="Запланована відстань (км)")
    notes = models.TextField(blank=True, verbose_name="Примітки")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.date})"
        
    @property
    def is_late(self):
        """Перевіряє, чи запізнюється маршрут"""
        if self.status == 'completed':
            return False
        if not self.planned_start_time or self.status == 'planned':
            return False
        from datetime import datetime, time
        current_time = datetime.now().time()
        return current_time > self.planned_start_time and self.status == 'planned'


class GPSLocation(models.Model):
    """
    Модель для зберігання GPS-координат транспортного засобу
    """
    device = models.ForeignKey(GPSDevice, on_delete=models.CASCADE, related_name='locations', 
                              verbose_name="GPS-пристрій")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='gps_locations', 
                               verbose_name="Транспортний засіб")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name="Широта")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, verbose_name="Довгота")
    altitude = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, 
                                  verbose_name="Висота (м)")
    speed = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, 
                               verbose_name="Швидкість (км/год)")
    direction = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, 
                                   verbose_name="Напрямок (градуси)")
    timestamp = models.DateTimeField(verbose_name="Час фіксації")
    route = models.ForeignKey(Route, on_delete=models.SET_NULL, null=True, blank=True, 
                             related_name='gps_path', verbose_name="Пов'язаний маршрут")
    
    class Meta:
        verbose_name = "GPS-локація"
        verbose_name_plural = "GPS-локації"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['vehicle', 'timestamp']),
            models.Index(fields=['route', 'timestamp']),
        ]
    
    def __str__(self):
        return f"Локація {self.vehicle} на {self.timestamp}"
    
    @property
    def coordinates(self):
        """Повертає координати у форматі (широта, довгота)"""
        return (self.latitude, self.longitude)
    
    @property
    def google_maps_url(self):
        """Повертає URL для відображення точки на Google Maps"""
        return f"https://maps.google.com/maps?q={self.latitude},{self.longitude}"


class RouteGPSLog(models.Model):
    """
    Модель для логування GPS-даних конкретного маршруту
    """
    route = models.OneToOneField(Route, on_delete=models.CASCADE, related_name='gps_log', 
                                verbose_name="Маршрут")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='route_logs', 
                               verbose_name="Транспортний засіб")
    start_location = models.ForeignKey(GPSLocation, on_delete=models.SET_NULL, null=True, blank=True, 
                                      related_name='route_starts', verbose_name="Початкова точка")
    end_location = models.ForeignKey(GPSLocation, on_delete=models.SET_NULL, null=True, blank=True, 
                                    related_name='route_ends', verbose_name="Кінцева точка")
    start_time = models.DateTimeField(null=True, blank=True, verbose_name="Час початку")
    end_time = models.DateTimeField(null=True, blank=True, verbose_name="Час закінчення")
    distance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, 
                                  verbose_name="Пройдена відстань (км)")
    avg_speed = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, 
                                   verbose_name="Середня швидкість (км/год)")
    max_speed = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, 
                                   verbose_name="Максимальна швидкість (км/год)")
    fuel_used = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, 
                                   verbose_name="Використано палива (л)")
    notes = models.TextField(blank=True, verbose_name="Примітки")
    
    class Meta:
        verbose_name = "GPS-лог маршруту"
        verbose_name_plural = "GPS-логи маршрутів"
    
    def __str__(self):
        return f"GPS-лог маршруту {self.route}"
    
    @property
    def duration(self):
        """Повертає тривалість маршруту"""
        if not self.start_time or not self.end_time:
            return None
        return self.end_time - self.start_time
    
    @property
    def is_completed(self):
        """Перевіряє, чи маршрут завершено"""
        return self.end_time is not None


class RoutePoint(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='points')
    request = models.ForeignKey(Request, on_delete=models.CASCADE, null=True, blank=True)
    address = models.TextField()
    order = models.PositiveSmallIntegerField()
    note = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Широта")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Довгота")
    planned_arrival_time = models.TimeField(null=True, blank=True, verbose_name="Запланований час прибуття")
    actual_arrival_time = models.DateTimeField(null=True, blank=True, verbose_name="Фактичний час прибуття")
    completed = models.BooleanField(default=False, verbose_name="Виконано")
    
    def __str__(self):
        return f"{self.route.name} - Точка #{self.order}"
        
    @property
    def coordinates(self):
        """Повертає координати у форматі (широта, довгота)"""
        if self.latitude is None or self.longitude is None:
            return None
        return (self.latitude, self.longitude)
        
    @property
    def is_late(self):
        """Перевіряє, чи запізнюється прибуття"""
        if self.completed or not self.planned_arrival_time:
            return False
        from datetime import datetime, time
        current_time = datetime.now().time()
        return current_time > self.planned_arrival_time and not self.completed


class Inventory(models.Model):
    """
    Модель для відстеження заходів інвентаризації складу або його частини.
    """
    STATUS_CHOICES = [
        ('planned', 'Заплановано'),
        ('in_progress', 'В процесі'),
        ('completed', 'Завершено'),
        ('canceled', 'Скасовано'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Назва інвентаризації")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='inventories')
    locations = models.ManyToManyField(WarehouseLocation, blank=True, related_name='inventories', 
                                      verbose_name="Складські локації")
    start_date = models.DateTimeField(verbose_name="Дата початку")
    end_date = models.DateTimeField(null=True, blank=True, verbose_name="Дата завершення")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, 
                                  related_name='created_inventories')
    assigned_to = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='assigned_inventories', 
                                        blank=True, verbose_name="Призначені користувачі")
    notes = models.TextField(blank=True, verbose_name="Примітки")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Інвентаризація"
        verbose_name_plural = "Інвентаризації"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Інвентаризація {self.name} ({self.get_status_display()})"
    
    @property
    def item_count(self):
        """Повертає кількість елементів інвентаризації"""
        return self.items.count()
    
    @property
    def has_discrepancies(self):
        """Повертає True, якщо є розбіжності в інвентаризації"""
        return self.discrepancies.exists()


class InventoryItem(models.Model):
    """
    Модель для запису результатів підрахунку окремих товарів при інвентаризації.
    """
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name='items')
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='inventory_items')
    expected_quantity = models.PositiveIntegerField(verbose_name="Очікувана кількість")
    actual_quantity = models.PositiveIntegerField(null=True, blank=True, verbose_name="Фактична кількість")
    counted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                  null=True, blank=True, related_name='counted_items')
    counted_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, verbose_name="Примітки")
    
    class Meta:
        verbose_name = "Елемент інвентаризації"
        verbose_name_plural = "Елементи інвентаризації"
        unique_together = ['inventory', 'batch']
    
    def __str__(self):
        return f"{self.batch} - Очікувано: {self.expected_quantity}, Фактично: {self.actual_quantity or 'не підраховано'}"
    
    @property
    def is_counted(self):
        """Повертає True, якщо товар був підрахований"""
        return self.actual_quantity is not None
    
    @property
    def has_discrepancy(self):
        """Повертає True, якщо є розбіжність між очікуваною та фактичною кількістю"""
        if self.actual_quantity is None:
            return False
        return self.expected_quantity != self.actual_quantity
    
    @property
    def discrepancy_quantity(self):
        """Повертає різницю між очікуваною та фактичною кількістю"""
        if self.actual_quantity is None:
            return 0
        return self.actual_quantity - self.expected_quantity


class InventoryDiscrepancy(models.Model):
    """
    Модель для запису та відстеження розбіжностей, виявлених під час інвентаризації.
    """
    STATUS_CHOICES = [
        ('pending', 'Очікує розгляду'),
        ('investigated', 'Розслідувано'),
        ('resolved', 'Вирішено'),
        ('ignored', 'Ігноровано'),
    ]
    
    REASON_CHOICES = [
        ('theft', 'Крадіжка'),
        ('damage', 'Пошкодження'),
        ('error', 'Помилка обліку'),
        ('expiration', 'Термін придатності минув'),
        ('miscounted', 'Помилка підрахунку'),
        ('unknown', 'Невідомо'),
        ('other', 'Інше'),
    ]
    
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='discrepancies')
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name='discrepancies')
    difference = models.IntegerField(verbose_name="Різниця (може бути від'ємною)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default='unknown', 
                             verbose_name="Причина розбіжності")
    resolution_note = models.TextField(blank=True, verbose_name="Примітка щодо вирішення")
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                   null=True, blank=True, related_name='resolved_discrepancies')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Розбіжність інвентаризації"
        verbose_name_plural = "Розбіжності інвентаризації"
    
    def __str__(self):
        return f"Розбіжність {self.inventory_item.batch}: {self.difference} од. ({self.get_status_display()})"
    
    @property
    def is_resolved(self):
        """Повертає True, якщо розбіжність була вирішена"""
        return self.status in ['resolved', 'ignored']
    
    @property
    def is_positive(self):
        """Повертає True, якщо фактична кількість більша за очікувану"""
        return self.difference > 0
    
    @property
    def is_negative(self):
        """Повертає True, якщо фактична кількість менша за очікувану"""
        return self.difference < 0