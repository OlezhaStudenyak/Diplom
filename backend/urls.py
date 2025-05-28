# Файл backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

# Підключаємо URL аналітики для адмін-панелі
admin.site.site_header = 'Логістична система складського обліку'
admin.site.site_title = 'Адміністрування логістичної системи'
admin.site.index_title = 'Управління логістичною системою'

urlpatterns = [
    path('admin/', admin.site.urls),
    # URL для аналітичної панелі в адмінці
    path('admin/', include('inventory.admin_urls')),
    path('', include('inventory.urls')),  # Всі API маршрути з inventory додатку

    # Перенаправлення кореневого URL на API
    path('', RedirectView.as_view(url='/api/', permanent=False)),
]

# Додавання статичних файлів у режимі розробки
urlpatterns += staticfiles_urlpatterns()