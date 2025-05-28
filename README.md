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

### Типові проблеми запуску

1. Переконайтеся, що віртуальне середовище активовано
2. Всі залежності встановлені (`pip install -r requirements.txt`)
3. Міграції застосовані (`python manage.py migrate`)
4. Сервер запускається на доступному порту (`python manage.py runserver 8000`)
