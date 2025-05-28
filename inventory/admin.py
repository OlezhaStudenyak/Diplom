from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    CustomUser,
    Product,
    Batch,
    Transaction,
    Department,
    Warehouse,
    Request,
    RequestItem,
    Route,
    RoutePoint,
    Vehicle,
    GPSDevice,
    GPSLocation,
    RouteGPSLog
)

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'groups')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Персональна інформація', {'fields': ('first_name', 'last_name', 'email', 'phone')}),
        ('Права та роль', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Важливі дати', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role'),
        }),
    )
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)

    def save_model(self, request, obj, form, change):
        """
        Перевизначений метод для збереження моделі користувача,
        щоб забезпечити правильне хешування паролів.
        """
        if not change:  # Якщо це новий користувач
            # Встановлюємо пароль через метод set_password для правильного хешування
            obj.set_password(form.cleaned_data.get('password1'))
        elif 'password' in form.changed_data:  # Якщо пароль був змінений
            # Якщо змінюємо існуючий пароль, теж хешуємо
            obj.set_password(form.cleaned_data.get('password'))
        super().save_model(request, obj, form, change)

@admin.register(CustomUser)
class CustomUserAdmin(CustomUserAdmin):
    pass

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'unit', 'category')
    list_filter = ('category',)
    search_fields = ('name', 'description')

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'manager')
    search_fields = ('name', 'address', 'manager__username')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "manager":
            # Фільтрує менеджерів складів - лише користувачі з роллю "warehouse" або адміни
            kwargs["queryset"] = CustomUser.objects.filter(role="warehouse") | CustomUser.objects.filter(is_staff=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'contact_phone')
    search_fields = ('name', 'contact_person')

class TransactionInline(admin.TabularInline):
    model = Transaction
    extra = 0
    readonly_fields = ('timestamp',)

@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('batch_number', 'product', 'warehouse', 'quantity', 'expiry_date')
    list_filter = ('warehouse', 'product__category', 'expiry_date')
    search_fields = ('batch_number', 'product__name')
    date_hierarchy = 'expiry_date'
    inlines = [TransactionInline]

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'batch', 'type', 'quantity', 'user')
    list_filter = ('type', 'timestamp', 'user')
    search_fields = ('batch__batch_number', 'user__username', 'note')
    date_hierarchy = 'timestamp'

class RequestItemInline(admin.TabularInline):
    model = RequestItem
    extra = 0

@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'department', 'status', 'created_at', 'planned_date')
    list_filter = ('status', 'department')
    search_fields = ('user__username', 'department__name')
    date_hierarchy = 'created_at'
    inlines = [RequestItemInline]

@admin.register(RequestItem)
class RequestItemAdmin(admin.ModelAdmin):
    list_display = ('request', 'product', 'quantity')
    list_filter = ('product__category',)
    search_fields = ('product__name', 'request__user__username')

class RoutePointInline(admin.TabularInline):
    model = RoutePoint
    extra = 0
    ordering = ('order',)

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'warehouse', 'date', 'status', 'driver', 'vehicle')
    list_filter = ('status', 'warehouse', 'date')
    search_fields = ('name', 'driver', 'vehicle')
    date_hierarchy = 'date'
    inlines = [RoutePointInline]
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "driver":
            # Фільтруємо водіїв - користувачі з роллю "logistician" або "driver"
            kwargs["queryset"] = CustomUser.objects.filter(role__in=["logistician", "driver"])
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(RoutePoint)
class RoutePointAdmin(admin.ModelAdmin):
    list_display = ('route', 'order', 'request', 'address', 'completed')
    list_filter = ('route__date', 'completed')
    search_fields = ('request__department__name', 'address')


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('name', 'plate_number', 'type', 'status', 'warehouse', 'driver')
    list_filter = ('type', 'status', 'warehouse')
    search_fields = ('name', 'plate_number', 'model', 'driver__username')
    date_hierarchy = 'next_maintenance'
    fieldsets = (
        (None, {
            'fields': ('name', 'plate_number', 'model', 'type', 'year')
        }),
        ('Характеристики', {
            'fields': ('capacity', 'volume')
        }),
        ('Призначення', {
            'fields': ('warehouse', 'driver', 'status')
        }),
        ('Обслуговування', {
            'fields': ('last_maintenance', 'next_maintenance', 'notes')
        }),
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "driver":
            # Фільтруємо водіїв - користувачі з роллю "logistician" або "driver"
            kwargs["queryset"] = CustomUser.objects.filter(role__in=["logistician", "driver"])
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(GPSDevice)
class GPSDeviceAdmin(admin.ModelAdmin):
    list_display = ('device_id', 'model', 'vehicle', 'status', 'installation_date', 'last_connection')
    list_filter = ('status', 'model')
    search_fields = ('device_id', 'serial_number', 'vehicle__name', 'vehicle__plate_number')
    date_hierarchy = 'installation_date'


@admin.register(GPSLocation)
class GPSLocationAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'timestamp', 'latitude', 'longitude', 'speed')
    list_filter = ('vehicle', 'route')
    search_fields = ('vehicle__name', 'vehicle__plate_number')
    date_hierarchy = 'timestamp'
    
    # Обмежуємо кількість записів, оскільки їх може бути дуже багато
    list_per_page = 50


@admin.register(RouteGPSLog)
class RouteGPSLogAdmin(admin.ModelAdmin):
    list_display = ('route', 'vehicle', 'start_time', 'end_time', 'distance', 'avg_speed')
    list_filter = ('route__status',)
    search_fields = ('route__name', 'vehicle__name', 'vehicle__plate_number')
    date_hierarchy = 'start_time'
    readonly_fields = ('start_time', 'end_time', 'distance', 'avg_speed', 'max_speed', 'fuel_used')
    
    def has_add_permission(self, request):
        # Забороняємо додавання логів вручну - вони повинні створюватися автоматично
        return False