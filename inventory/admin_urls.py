from django.urls import path
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render

# Представлення для аналітичної панелі
def analytics_view(request):
    # Тут можна додати логіку для отримання даних для аналітики
    return render(request, 'admin/custom_analytics.html')

# URL-шаблони для адмін-панелі
urlpatterns = [
    path('analytics/', staff_member_required(analytics_view), name='custom_analytics'),
]
