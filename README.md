  # Система Складського Обліку

## Налаштування проекту

### Підготовка віртуального середовища

```bash
# Активувати віртуальне середовище
# На Windows
env\Scripts\activate
# На Linux/Mac
source env/bin/activate

# Встановити залежності
pip install -r requirements.txt
```

### Запуск серверу розробки

```bash
# Переконайтесь, що всі міграції застосовані
python manage.py migrate

# Створіть суперкористувача якщо потрібно
python manage.py createsuperuser

# Запустіть сервер розробки
python manage.py runserver
```

