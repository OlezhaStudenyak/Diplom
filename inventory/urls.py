from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'warehouses', views.WarehouseViewSet)
router.register(r'departments', views.DepartmentViewSet)
router.register(r'batches', views.BatchViewSet)
router.register(r'transactions', views.TransactionViewSet)
router.register(r'requests', views.RequestViewSet)
router.register(r'request-items', views.RequestItemViewSet)
router.register(r'routes', views.RouteViewSet)
router.register(r'route-points', views.RoutePointViewSet)
router.register(r'vehicles', views.VehicleViewSet)

# Додаємо альтернативні шляхи для транспортних засобів, щоб підтримати всі URL, які перевіряє фронтенд
alternative_router = DefaultRouter()
alternative_router.register(r'vehicle', views.VehicleViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/inventory/', include(alternative_router.urls)),
    path('api/me/', views.MeView.as_view(), name='me'),

    # JWT токен автентифікація
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]

