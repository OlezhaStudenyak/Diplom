from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView

from .models import Product, Batch, Transaction, Department, Warehouse, Request, RequestItem, Route, RoutePoint, \
    CustomUser, Vehicle
from .serializers import (
    ProductSerializer,
    BatchSerializer,
    TransactionSerializer,
    RequestSerializer,
    RequestItemSerializer,
    RouteSerializer,
    RoutePointSerializer,
    UserSerializer,
    WarehouseSerializer,
    DepartmentSerializer,
    VehicleSerializer
)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'role': request.user.role,
            'is_staff': request.user.is_staff,
            'groups': list(request.user.groups.values_list('name', flat=True)),
        })


class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD для користувачів
    """
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['username', 'first_name', 'last_name', 'email']

class VehicleViewSet(viewsets.ModelViewSet):
    """
    API ендпоінт для управління транспортними засобами
    """
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'plate_number', 'model', 'type']
    ordering_fields = ['name', 'status', 'type', 'year']
    
    def get_queryset(self):
        queryset = Vehicle.objects.all()
        
        # Додаємо фільтрацію за статусом
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
            
        # Додаємо фільтрацію за типом транспорту
        vehicle_type = self.request.query_params.get('type', None)
        if vehicle_type:
            queryset = queryset.filter(type=vehicle_type)
            
        # Додаємо фільтрацію за складом
        warehouse = self.request.query_params.get('warehouse', None)
        if warehouse:
            queryset = queryset.filter(warehouse=warehouse)
            
        # Додаємо фільтрацію за водієм (включаючи незайняті авто)
        driver = self.request.query_params.get('driver', None)
        if driver:
            if driver.lower() == 'null':
                queryset = queryset.filter(driver__isnull=True)
            else:
                queryset = queryset.filter(driver=driver)
        
        return queryset


class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD для товарів.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['category']
    search_fields = ['name', 'description']


class WarehouseViewSet(viewsets.ModelViewSet):
    """
    CRUD для складів
    """
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['name', 'address']


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    CRUD для підрозділів
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['name', 'contact_person']


class BatchViewSet(viewsets.ModelViewSet):
    """
    CRUD для партій + пошук/фільтрація + операції receive/dispense.
    """
    queryset = Batch.objects.select_related('product', 'warehouse').all()
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]

    # пошук, фільтрація, сортування
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'warehouse': ['exact'],
        'product': ['exact'],
        'expiry_date': ['lte', 'gte'],
        'product__category': ['exact'],
    }
    search_fields = ['product__name', 'batch_number']
    ordering_fields = ['expiry_date', 'quantity', 'product__name']

    @action(detail=True, methods=['post'], url_path='receive')
    def receive(self, request, pk=None):
        """
        Прийом партії: додає quantity, логування Transaction(INCOMING).
        POST /api/batches/{pk}/receive/ { "quantity": <int> }
        """
        batch = self.get_object()
        try:
            qty = int(request.data.get('quantity', 0))
        except (TypeError, ValueError):
            return Response({"detail": "Неправильна кількість"}, status=status.HTTP_400_BAD_REQUEST)

        if qty <= 0:
            return Response({"detail": "Кількість має бути більше 0"}, status=status.HTTP_400_BAD_REQUEST)

        batch.quantity += qty
        batch.save()

        Transaction.objects.create(
            batch=batch,
            user=request.user,
            type=Transaction.INCOMING,
            quantity=qty,
            note=request.data.get('note', '')
        )
        return Response(self.get_serializer(batch).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='dispense')
    def dispense(self, request, pk=None):
        """
        Відпуск партії: віднімає quantity, логування Transaction(OUTGOING).
        POST /api/batches/{pk}/dispense/ { "quantity": <int>, "destination": <id>, "note": <string> }
        """
        batch = self.get_object()
        try:
            qty = int(request.data.get('quantity', 0))
        except (TypeError, ValueError):
            return Response({"detail": "Неправильна кількість"}, status=status.HTTP_400_BAD_REQUEST)

        if qty <= 0 or qty > batch.quantity:
            return Response({"detail": "Неправильна кількість"}, status=status.HTTP_400_BAD_REQUEST)

        batch.quantity -= qty
        batch.save()

        destination_id = request.data.get('destination')
        destination = None
        if destination_id:
            try:
                destination = Department.objects.get(pk=destination_id)
            except Department.DoesNotExist:
                pass

        Transaction.objects.create(
            batch=batch,
            user=request.user,
            type=Transaction.OUTGOING,
            quantity=qty,
            destination=destination,
            note=request.data.get('note', '')
        )
        return Response(self.get_serializer(batch).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        """
        Переміщення партії на інший склад: віднімає quantity, логування Transaction(TRANSFER).
        POST /api/batches/{pk}/transfer/ { "quantity": <int>, "warehouse": <id>, "note": <string> }
        """
        batch = self.get_object()

        try:
            qty = int(request.data.get('quantity', 0))
        except (TypeError, ValueError):
            return Response({"detail": "Неправильна кількість"}, status=status.HTTP_400_BAD_REQUEST)

        if qty <= 0 or qty > batch.quantity:
            return Response({"detail": "Неправильна кількість"}, status=status.HTTP_400_BAD_REQUEST)

        warehouse_id = request.data.get('warehouse')
        if not warehouse_id:
            return Response({"detail": "Необхідно вказати склад призначення"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_warehouse = Warehouse.objects.get(pk=warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"detail": "Склад не знайдено"}, status=status.HTTP_400_BAD_REQUEST)

        if batch.warehouse.id == target_warehouse.id:
            return Response({"detail": "Неможливо перемістити на той самий склад"}, status=status.HTTP_400_BAD_REQUEST)

        # Створюємо нову партію на цільовому складі або збільшуємо існуючу
        try:
            target_batch = Batch.objects.get(
                product=batch.product,
                warehouse=target_warehouse,
                batch_number=batch.batch_number,
                expiry_date=batch.expiry_date
            )
            target_batch.quantity += qty
            target_batch.save()
        except Batch.DoesNotExist:
            # Створюємо нову партію на цільовому складі
            target_batch = Batch.objects.create(
                product=batch.product,
                warehouse=target_warehouse,
                batch_number=batch.batch_number,
                quantity=qty,
                expiry_date=batch.expiry_date,
                production_date=batch.production_date
            )

        # Зменшуємо кількість у вихідній партії
        batch.quantity -= qty
        batch.save()

        # Створюємо транзакцію
        Transaction.objects.create(
            batch=batch,
            user=request.user,
            type=Transaction.TRANSFER,
            quantity=qty,
            destination_warehouse=target_warehouse,
            note=request.data.get('note', '')
        )

        return Response({"detail": "Партію успішно переміщено"})

    @action(detail=True, methods=['post'])
    def inventory(self, request, pk=None):
        """
        Інвентаризація партії: встановлює actual_quantity, логування Transaction(INVENTORY).
        POST /api/batches/{pk}/inventory/ { "actual_quantity": <int>, "note": <string> }
        """
        batch = self.get_object()

        try:
            actual_qty = int(request.data.get('actual_quantity', 0))
        except (TypeError, ValueError):
            return Response({"detail": "Неправильна кількість"}, status=status.HTTP_400_BAD_REQUEST)

        if actual_qty < 0:
            return Response({"detail": "Кількість не може бути від'ємною"}, status=status.HTTP_400_BAD_REQUEST)

        # Визначаємо різницю
        diff = actual_qty - batch.quantity

        # Оновлюємо кількість
        batch.quantity = actual_qty
        batch.save()

        # Створюємо транзакцію
        Transaction.objects.create(
            batch=batch,
            user=request.user,
            type=Transaction.INVENTORY,
            quantity=abs(diff),
            note=f"{'Надлишок' if diff > 0 else 'Нестача'}: {request.data.get('note', '')}"
        )

        return Response({"detail": "Інвентаризацію успішно проведено"})


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Перегляд журналу транзакцій (IN & OUT).
    """
    queryset = Transaction.objects.select_related('batch', 'user', 'batch__product', 'destination').all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = {
        'type': ['exact'],
        'batch__product__name': ['exact', 'icontains'],
        'batch__warehouse': ['exact'],
        'user': ['exact'],
        'user__username': ['exact'],
        'timestamp': ['lte', 'gte'],
    }
    search_fields = ['batch__batch_number', 'user__username', 'batch__product__name']
    ordering_fields = ['timestamp', 'quantity']


class RequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet для роботи з заявками
    """
    queryset = Request.objects.select_related('user', 'department').all()
    serializer_class = RequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'department', 'planned_date']
    search_fields = ['user__username', 'department__name']
    ordering_fields = ['created_at', 'planned_date']

    def get_queryset(self):
        """Фільтрує заявки в залежності від ролі користувача"""
        user = self.request.user

        if user.is_staff or user.role == 'admin':
            # Адміністратори бачать усі заявки
            return Request.objects.all()
        elif user.role == 'logistician':
            # Логісти бачать усі заявки
            return Request.objects.all()
        else:
            # Інші користувачі бачать тільки свої заявки
            return Request.objects.filter(user=user)

    def perform_create(self, serializer):
        """Додає поточного користувача до заявки при створенні"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Затвердження заявки логістом.
        POST /api/requests/{pk}/approve/
        """
        req = self.get_object()

        # Перевіряємо права та статус
        if request.user.role != 'logistician' and not request.user.is_staff:
            return Response({"detail": "Недостатньо прав"}, status=status.HTTP_403_FORBIDDEN)

        if req.status != 'pending':
            return Response({"detail": "Можна затверджувати тільки заявки в статусі 'очікує'"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Змінюємо статус
        req.status = 'approved'
        req.save()

        return Response({"detail": "Заявку затверджено"})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Відхилення заявки логістом.
        POST /api/requests/{pk}/reject/ { "note": <string> }
        """
        req = self.get_object()

        # Перевіряємо права та статус
        if request.user.role != 'logistician' and not request.user.is_staff:
            return Response({"detail": "Недостатньо прав"}, status=status.HTTP_403_FORBIDDEN)

        if req.status != 'pending':
            return Response({"detail": "Можна відхиляти тільки заявки в статусі 'очікує'"},
                            status=status.HTTP_400_BAD_REQUEST)

        # Змінюємо статус та додаємо примітку
        req.status = 'rejected'
        if 'note' in request.data:
            req.rejection_note = request.data['note']
        req.save()

        return Response({"detail": "Заявку відхилено"})

    @action(detail=True, methods=['post'])
    def fulfill(self, request, pk=None):
        """
        Виконання заявки (видача товарів).
        POST /api/requests/{pk}/fulfill/
        """
        req = self.get_object()

        # Перевіряємо права та статус
        if request.user.role != 'warehouse' and not request.user.is_staff:
            return Response({"detail": "Недостатньо прав"}, status=status.HTTP_403_FORBIDDEN)

        if req.status != 'approved':
            return Response({"detail": "Можна виконувати тільки затверджені заявки"},
                            status=status.HTTP_400_BAD_REQUEST)

        # TODO: Реалізувати логіку відпуску товарів за заявкою

        # Змінюємо статус
        req.status = 'fulfilled'
        req.save()

        return Response({"detail": "Заявку виконано"})


class RequestItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet для роботи з позиціями заявок
    """
    queryset = RequestItem.objects.select_related('request', 'product').all()
    serializer_class = RequestItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Фільтрує позиції заявок"""
        # Якщо передано ID заявки у параметрах запиту
        request_id = self.request.query_params.get('request', None)
        if request_id:
            return RequestItem.objects.filter(request_id=request_id)

        # Інакше повертаємо всі позиції, до яких користувач має доступ
        user = self.request.user
        if user.is_staff or user.role in ['admin', 'logistician']:
            return RequestItem.objects.all()
        else:
            return RequestItem.objects.filter(request__user=user)


class RouteViewSet(viewsets.ModelViewSet):
    """
    ViewSet для роботи з маршрутами доставки
    """
    queryset = Route.objects.select_related('warehouse').all()
    serializer_class = RouteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'warehouse', 'date']
    ordering_fields = ['date']

    def get_queryset(self):
        """Фільтрує маршрути"""
        user = self.request.user

        if user.is_staff or user.role in ['admin', 'logistician']:
            return Route.objects.all()
        elif user.role == 'warehouse':
            # Складський працівник бачить маршрути для своїх складів
            return Route.objects.filter(warehouse__manager=user)
        else:
            # Інші користувачі не бачать маршрути
            return Route.objects.none()

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """
        Почати виконання маршруту.
        POST /api/routes/{pk}/start/
        """
        route = self.get_object()

        if route.status != 'planned':
            return Response({"detail": "Можна почати тільки заплановані маршрути"},
                            status=status.HTTP_400_BAD_REQUEST)

        route.status = 'in_progress'
        route.save()

        return Response({"detail": "Маршрут розпочато"})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Завершити виконання маршруту.
        POST /api/routes/{pk}/complete/
        """
        route = self.get_object()

        if route.status != 'in_progress':
            return Response({"detail": "Можна завершити тільки маршрути в процесі виконання"},
                            status=status.HTTP_400_BAD_REQUEST)

        route.status = 'completed'
        route.save()

        return Response({"detail": "Маршрут завершено"})


class RoutePointViewSet(viewsets.ModelViewSet):
    """
    ViewSet для роботи з точками маршрутів
    """
    queryset = RoutePoint.objects.select_related('route', 'request').all()
    serializer_class = RoutePointSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Фільтрує точки маршрутів"""
        # Якщо передано ID маршруту у параметрах запиту
        route_id = self.request.query_params.get('route', None)
        if route_id:
            return RoutePoint.objects.filter(route_id=route_id).order_by('order')

        # Інакше повертаємо всі точки, до яких користувач має доступ
        user = self.request.user
        if user.is_staff or user.role in ['admin', 'logistician']:
            return RoutePoint.objects.all()
        elif user.role == 'warehouse':
            # Складський працівник бачить точки маршрутів для своїх складів
            return RoutePoint.objects.filter(route__warehouse__manager=user)
        else:
            # Інші користувачі не бачать точки маршрутів
            return RoutePoint.objects.none()