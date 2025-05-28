# Скрипт для створення тестового користувача
import os
import django

# Налаштування для запуску Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from inventory.models import CustomUser

def create_test_user():
    # Перевіряємо, чи існує користувач admin
    if not CustomUser.objects.filter(username='admin').exists():
        print("Створення тестового адміністратора...")
        user = CustomUser.objects.create_user(
            username='admin',
            password='admin123',
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            is_staff=True,
            is_superuser=True
        )
        print(f"Створено користувача: {user.username}")
    else:
        print("Тестовий адміністратор вже існує")

    # Створюємо додаткового користувача для тестування
    if not CustomUser.objects.filter(username='warehouse').exists():
        print("Створення тестового складського працівника...")
        user = CustomUser.objects.create_user(
            username='warehouse',
            password='warehouse123',
            email='warehouse@example.com',
            first_name='Warehouse',
            last_name='Worker',
            role='warehouse'
        )
        print(f"Створено користувача: {user.username}")
    else:
        print("Тестовий складський працівник вже існує")

if __name__ == "__main__":
    create_test_user()
    print("Завершено створення тестових користувачів")
