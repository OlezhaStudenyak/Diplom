from rest_framework import serializers
from .models import CustomUser, Product, Batch, Transaction, Department, Warehouse, Request, RequestItem, Route, \
    RoutePoint, Inventory, InventoryItem, InventoryDiscrepancy, WarehouseLocation, Vehicle, GPSDevice, \
    GPSLocation, RouteGPSLog


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'is_staff', 'password']
        read_only_fields = ['is_staff']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        if 'password' not in validated_data:
            raise serializers.ValidationError({"password": "Пароль є обов'язковим полем"})
            
        password = validated_data.pop('password')
        user = super().create(validated_data)
        user.set_password(password)
        user.save()
        return user


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class WarehouseSerializer(serializers.ModelSerializer):
    manager_username = serializers.ReadOnlyField(source='manager.username')

    class Meta:
        model = Warehouse
        fields = '__all__'


class WarehouseLocationSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    parent_code = serializers.ReadOnlyField(source='parent.code', default=None)
    full_path = serializers.ReadOnlyField()
    
    class Meta:
        model = WarehouseLocation
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class BatchSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    product_unit = serializers.ReadOnlyField(source='product.unit')
    location_display = serializers.ReadOnlyField()

    class Meta:
        model = Batch
        fields = '__all__'


class TransactionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')
    product_name = serializers.ReadOnlyField(source='batch.product.name')
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    destination_name = serializers.ReadOnlyField(source='destination.name', default=None)

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['user', 'timestamp']


class RequestItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_unit = serializers.ReadOnlyField(source='product.unit')

    class Meta:
        model = RequestItem
        fields = '__all__'


class RequestSerializer(serializers.ModelSerializer):
    items = RequestItemSerializer(many=True, read_only=True)
    user_name = serializers.ReadOnlyField(source='user.username')
    department_name = serializers.ReadOnlyField(source='department.name')
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Request
        fields = '__all__'
        read_only_fields = ['user', 'status', 'rejection_note']


class RoutePointSerializer(serializers.ModelSerializer):
    request_info = serializers.SerializerMethodField()

    class Meta:
        model = RoutePoint
        fields = '__all__'

    def get_request_info(self, obj):
        if obj.request:
            return {
                'id': obj.request.id,
                'department': obj.request.department.name,
                'items_count': obj.request.items.count()
            }
        return None


class VehicleSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    driver_name = serializers.ReadOnlyField(source='driver.get_full_name', default=None)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_available = serializers.ReadOnlyField()
    maintenance_due = serializers.ReadOnlyField()
    
    class Meta:
        model = Vehicle
        fields = '__all__'


class GPSDeviceSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_online = serializers.ReadOnlyField()
    
    class Meta:
        model = GPSDevice
        fields = '__all__'
    
    def get_vehicle_info(self, obj):
        if obj.vehicle:
            return {
                'id': obj.vehicle.id,
                'name': obj.vehicle.name,
                'plate_number': obj.vehicle.plate_number,
                'type': obj.vehicle.get_type_display()
            }
        return None


class GPSLocationSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    coordinates = serializers.ReadOnlyField()
    google_maps_url = serializers.ReadOnlyField()
    
    class Meta:
        model = GPSLocation
        fields = '__all__'
    
    def get_vehicle_info(self, obj):
        if obj.vehicle:
            return {
                'id': obj.vehicle.id,
                'name': obj.vehicle.name,
                'plate_number': obj.vehicle.plate_number
            }
        return None


class RouteGPSLogSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    route_name = serializers.ReadOnlyField(source='route.name')
    duration = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    
    class Meta:
        model = RouteGPSLog
        fields = '__all__'
    
    def get_vehicle_info(self, obj):
        if obj.vehicle:
            return {
                'id': obj.vehicle.id,
                'name': obj.vehicle.name,
                'plate_number': obj.vehicle.plate_number
            }
        return None


class RouteSerializer(serializers.ModelSerializer):
    points = RoutePointSerializer(many=True, read_only=True)
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    driver_name = serializers.SerializerMethodField()
    vehicle_info = serializers.SerializerMethodField()
    is_late = serializers.ReadOnlyField()
    gps_log_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Route
        fields = '__all__'
    
    def get_driver_name(self, obj):
        if obj.driver:
            return f"{obj.driver.first_name} {obj.driver.last_name}".strip() or obj.driver.username
        return None
    
    def get_vehicle_info(self, obj):
        if obj.vehicle:
            return {
                'id': obj.vehicle.id,
                'name': obj.vehicle.name,
                'plate_number': obj.vehicle.plate_number,
                'type': obj.vehicle.get_type_display()
            }
        return None
    
    def get_gps_log_info(self, obj):
        try:
            log = obj.gps_log
            if log:
                return {
                    'id': log.id,
                    'distance': log.distance,
                    'avg_speed': log.avg_speed,
                    'start_time': log.start_time,
                    'end_time': log.end_time,
                    'is_completed': log.is_completed
                }
        except RouteGPSLog.DoesNotExist:
            pass
        return None


class InventoryItemSerializer(serializers.ModelSerializer):
    batch_info = serializers.SerializerMethodField()
    counted_by_username = serializers.ReadOnlyField(source='counted_by.username', default=None)
    is_counted = serializers.ReadOnlyField()
    has_discrepancy = serializers.ReadOnlyField()
    discrepancy_quantity = serializers.ReadOnlyField()
    
    class Meta:
        model = InventoryItem
        fields = '__all__'
    
    def get_batch_info(self, obj):
        if obj.batch:
            return {
                'id': obj.batch.id,
                'batch_number': obj.batch.batch_number,
                'product_name': obj.batch.product.name,
                'product_unit': obj.batch.product.unit,
                'location': obj.batch.location_display if obj.batch.location else None
            }
        return None


class InventoryDiscrepancySerializer(serializers.ModelSerializer):
    inventory_item_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    resolved_by_username = serializers.ReadOnlyField(source='resolved_by.username', default=None)
    is_resolved = serializers.ReadOnlyField()
    is_positive = serializers.ReadOnlyField()
    is_negative = serializers.ReadOnlyField()
    
    class Meta:
        model = InventoryDiscrepancy
        fields = '__all__'
    
    def get_inventory_item_info(self, obj):
        if obj.inventory_item:
            return {
                'id': obj.inventory_item.id,
                'expected_quantity': obj.inventory_item.expected_quantity,
                'actual_quantity': obj.inventory_item.actual_quantity,
                'batch_number': obj.inventory_item.batch.batch_number,
                'product_name': obj.inventory_item.batch.product.name
            }
        return None


class InventorySerializer(serializers.ModelSerializer):
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    created_by_username = serializers.ReadOnlyField(source='created_by.username')
    assigned_users = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    item_count = serializers.ReadOnlyField()
    has_discrepancies = serializers.ReadOnlyField()
    locations_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Inventory
        fields = '__all__'
    
    def get_assigned_users(self, obj):
        return [
            {
                'id': user.id,
                'username': user.username,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username
            }
            for user in obj.assigned_to.all()
        ]
    
    def get_locations_info(self, obj):
        return [
            {
                'id': location.id,
                'code': location.code,
                'name': location.name,
                'type': location.get_type_display()
            }
            for location in obj.locations.all()
        ]