import axios from 'axios';

const API_URL = 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Функція для додавання JWT токена до заголовків
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, config.data);
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  }
);

// Додавання перехоплювача відповідей для логування
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`[API Error] ${error.response.status} ${error.config.method.toUpperCase()} ${error.config.url}`, error.response.data);
    } else {
      console.error("[API Error] Request failed", error);
    }
    return Promise.reject(error);
  }
);

// Функція для оновлення токена, якщо поточний прострочений
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_URL}token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('accessToken', access);

        // Повторюємо початковий запит з новим токеном
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // При помилці оновлення токену - перенаправляємо на логін
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Endpoints

// Auth
export const loginUser = (credentials) => {
  const response = api.post('token/', credentials);
  // Зберігаємо отримані токени
  response.then(resp => {
    if (resp.data.access) {
      localStorage.setItem('accessToken', resp.data.access);
    }
    if (resp.data.refresh) {
      localStorage.setItem('refreshToken', resp.data.refresh);
    }
  });
  return response;
};

/**
 * Скидання паролю користувача
 * 
 * Ця функція дозволяє адміністратору скинути пароль користувача,
 * якщо він його забув. Новий пароль буде згенеровано автоматично
 * або встановлено адміністратором.
 * 
 * @param {number} userId - ID користувача
 * @param {string} newPassword - Новий пароль
 * @returns {Promise} - Результат запиту
 */
export const resetUserPassword = async (userId, newPassword) => {
  return api.post(`users/${userId}/reset-password/`, { password: newPassword });
};

/**
 * Скидання паролю користувача
 * 
 * Ця функція дозволяє адміністратору скинути пароль користувача,
 * якщо він його забув. Новий пароль буде згенеровано автоматично
 * або встановлено адміністратором.
 * 
 * @param {number} userId - ID користувача
 * @param {string} newPassword - Новий пароль
 * @returns {Promise} - Результат запиту
 */
export const verifyToken = (token) => api.post('token/verify/', { token });
export const refreshToken = (refresh) => api.post('token/refresh/', { refresh });
export const getCurrentUser = async () => {
  try {
    // Перевіряємо чи є токен авторизації
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Спроба отримати дані користувача без токену авторизації');
    } else {
      console.log('Запит на отримання даних поточного користувача з токеном');
    }
    
    const response = await api.get('me/');
    console.log('Відповідь API для поточного користувача:', response);
    return response;
  } catch (error) {
    console.error('Помилка отримання поточного користувача:', error);
    
    // Додаткова діагностика
    if (error.response) {
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // Якщо помилка автентифікації
      if (error.response.status === 401) {
        console.log('Помилка автентифікації при отриманні даних поточного користувача');
        // Спробуємо оновити токен, якщо є функція оновлення токену
        try {
          await refreshToken();
          // Повторюємо запит з оновленим токеном
          return api.get('me/');
        } catch (refreshError) {
          console.error('Не вдалося оновити токен:', refreshError);
          throw error; // Викидаємо оригінальну помилку
        }
      }
    }
    throw error;
  }
};

// Products
export const getProducts = (params) => api.get('products/', { params });
export const getProduct = (id) => api.get(`products/${id}/`);
export const createProduct = async (data) => {
  try {
    console.log('Створення продукту з даними:', data);
    const response = await api.post('products/', data);
    console.log('Відповідь створення продукту:', response);
    return response;
  } catch (error) {
    console.error('Помилка створення продукту:', error);
    throw error;
  }
};
export const updateProduct = (id, data) => api.put(`products/${id}/`, data);
export const deleteProduct = (id) => api.delete(`products/${id}/`);

// Batches
export const getBatches = async (params) => {
  try {
    console.log('Запит на отримання партій товарів з параметрами:', params);
    const response = await api.get('batches/', { params });
    console.log('Отримані партії товарів (сирі дані):', response);
    
    // Перевіряємо наявність даних та обробляємо різні формати відповіді
    if (response && response.data) {
      // Обробка пагінації Django REST Framework
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} партій (з пагінацією)`);
        return { data: response.data.results };
      }
      
      // Якщо дані не мають пагінації, але є масивом
      if (Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} партій (без пагінації)`);
        return { data: response.data };
      }
      
      // Якщо це один об'єкт
      if (!Array.isArray(response.data) && response.data.id) {
        console.log('Отримано одну партію, конвертуємо в масив');
        return { data: [response.data] };
      }
      
      console.warn("Неочікуваний формат даних партій:", response.data);
      return { data: [] };
    }
    
    console.error("API повернуло порожні дані партій");
    return { data: [] };
  } catch (error) {
    console.error('Помилка при отриманні партій товарів:', error);
    return { data: [] };
  }
};
export const getBatch = (id) => api.get(`batches/${id}/`);
export const createBatch = (data) => api.post('batches/', data);
export const updateBatch = (id, data) => api.put(`batches/${id}/`, data);
export const deleteBatch = (id) => api.delete(`batches/${id}/`);
export const receiveBatch = (id, data) => api.post(`batches/${id}/receive/`, data);
export const dispenseBatch = (id, data) => api.post(`batches/${id}/dispense/`, data);
export const transferBatch = (id, data) => api.post(`batches/${id}/transfer/`, data);
export const inventoryBatch = (id, data) => api.post(`batches/${id}/inventory/`, data);

// Transactions
export const getTransactions = async (params) => {
  try {
    console.log('Запит на отримання транзакцій з параметрами:', params);
    const response = await api.get('transactions/', { params });
    console.log('Отримані транзакції (сирі дані):', response);
    
    // Перевіряємо наявність даних та обробляємо різні формати відповіді
    if (response && response.data) {
      // Обробка пагінації Django REST Framework
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} транзакцій (з пагінацією)`);
        return { data: response.data.results };
      }
      
      // Якщо дані не мають пагінації, але є масивом
      if (Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} транзакцій (без пагінації)`);
        return { data: response.data };
      }
      
      // Якщо це один об'єкт
      if (!Array.isArray(response.data) && response.data.id) {
        console.log('Отримано одну транзакцію, конвертуємо в масив');
        return { data: [response.data] };
      }
      
      console.warn("Неочікуваний формат даних транзакцій:", response.data);
      return { data: [] };
    }
    
    console.error("API повернуло порожні дані транзакцій");
    return { data: [] };
  } catch (error) {
    console.error('Помилка при отриманні транзакцій:', error);
    return { data: [] };
  }
};
export const getTransaction = (id) => api.get(`transactions/${id}/`);

// Додатковий код для діагностики API запитів
export const testApiConnection = async () => {
  try {
    // Перевіряємо базовий URL
    console.log('Базовий URL API:', api.defaults.baseURL);
    
    // Перевіряємо заголовки
    console.log('Заголовки запитів:', api.defaults.headers);
    
    // Тестовий запит
    const response = await api.get('/');
    console.log('Тестовий запит успішний:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Тестовий запит невдалий:', error);
    return { 
      success: false, 
      error: {
        message: error.message,
        config: error.config,
        status: error.response?.status,
        data: error.response?.data
      } 
    };
  }
};

// Warehouses
export const getWarehouses = async () => {
  try {
    console.log('Виконуємо запит до API для складів...');
    const response = await api.get('warehouses/');
    console.log('Вихідна відповідь API для складів:', response);
    return response;
  } catch (error) {
    console.error('Помилка запиту складів:', error);
    if (error.response) {
      // Сервер повернув відповідь зі статусом відмінним від 2xx
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // Запит був зроблений, але відповіді не було
      console.error('Запит без відповіді:', error.request);
    } else {
      // Помилка в налаштуванні запиту
      console.error('Помилка налаштування запиту:', error.message);
    }
    throw error;
  }
};
export const getWarehouse = (id) => api.get(`warehouses/${id}/`);
export const createWarehouse = (data) => api.post('warehouses/', data);
export const updateWarehouse = (id, data) => api.put(`warehouses/${id}/`, data);
export const deleteWarehouse = (id) => api.delete(`warehouses/${id}/`);

// Warehouse Locations
export const getLocations = async (warehouseId) => {
  try {
    console.log('Виконуємо запит до API для локацій складу. ID складу:', warehouseId);
    const response = await api.get(`warehouse-locations/?warehouse=${warehouseId}`);
    console.log('Вихідна відповідь API для локацій складу:', response);
    return response;
  } catch (error) {
    console.error('Помилка запиту локацій складу:', error);
    if (error.response) {
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('Запит без відповіді:', error.request);
    } else {
      console.error('Помилка налаштування запиту:', error.message);
    }
    throw error;
  }
};

export const getLocation = (id) => api.get(`warehouse-locations/${id}/`);
export const createLocation = (data) => api.post('warehouse-locations/', data);
export const updateLocation = (id, data) => api.put(`warehouse-locations/${id}/`, data);
export const deleteLocation = (id) => api.delete(`warehouse-locations/${id}/`);
export const updateBatchLocation = (batchId, locationId) => 
  api.post(`batches/${batchId}/update-location/`, { location: locationId });

export const fetchLocations = async (warehouseId) => {
  try {
    const response = await getLocations(warehouseId);
    console.log("Детальна відповідь API для локацій складу:", response);
    
    // Аналіз структури відповіді
    console.log("Тип відповіді:", typeof response);
    if (response) {
      console.log("Ключі відповіді:", Object.keys(response));
      if (response.data) {
        console.log("Тип response.data:", typeof response.data);
        console.log("Чи є масивом:", Array.isArray(response.data));
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          console.log("Ключі response.data:", Object.keys(response.data));
        }
      }
    }

    // Різні варіанти обробки даних в залежності від структури відповіді
    if (response) {
      // Якщо response.data - масив, використовуємо його напряму
      if (response.data && Array.isArray(response.data)) {
        return { data: response.data };
      }
      
      // Якщо response.data - об'єкт з полем 'results' (Django REST framework pagination)
      else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return { data: response.data.results };
      }
      
      // Якщо response - масив
      else if (Array.isArray(response)) {
        return { data: response };
      }
      
      // Якщо response містить масив 'results' (Django REST framework pagination)
      else if (response.results && Array.isArray(response.results)) {
        return { data: response.results };
      }
      
      // Якщо response.data - об'єкт, конвертуємо його значення у масив
      else if (response.data && typeof response.data === 'object') {
        return { data: Object.values(response.data) };
      }
      
      // Якщо response - об'єкт, конвертуємо його значення у масив
      else if (typeof response === 'object') {
        return { data: Object.values(response) };
      }
    }
    
    // У всіх інших випадках повертаємо порожній масив
    console.error("API повернуло дані у неочікуваному форматі:", response);
    return { data: [] };
  } catch (error) {
    console.error("Помилка при отриманні локацій складу:", error);
    return { data: [] };
  }
};

// Departments
export const getDepartments = async () => {
  try {
    console.log('Виконуємо запит до API для підрозділів...');
    const response = await api.get('departments/');
    console.log('Вихідна відповідь API для підрозділів:', response);
    return response;
  } catch (error) {
    console.error('Помилка запиту підрозділів:', error);
    if (error.response) {
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('Запит без відповіді:', error.request);
    } else {
      console.error('Помилка налаштування запиту:', error.message);
    }
    throw error;
  }
};
export const getDepartment = (id) => api.get(`departments/${id}/`);
export const createDepartment = async (data) => {
  try {
    console.log('Відправка запиту на створення підрозділу:', data);
    const response = await api.post('departments/', data);
    console.log('Відповідь після створення підрозділу:', response);
    return response;
  } catch (error) {
    console.error('Помилка при створенні підрозділу:', error);
    if (error.response) {
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw error;
  }
};
export const updateDepartment = (id, data) => api.put(`departments/${id}/`, data);
export const deleteDepartment = (id) => api.delete(`departments/${id}/`);

export const fetchDepartments = async () => {
  try {
    const response = await getDepartments();
    console.log("Детальна відповідь API для підрозділів:", response);
    
    // Аналіз структури відповіді
    console.log("Тип відповіді:", typeof response);
    if (response) {
      console.log("Ключі відповіді:", Object.keys(response));
      if (response.data) {
        console.log("Тип response.data:", typeof response.data);
        console.log("Чи є масивом:", Array.isArray(response.data));
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          console.log("Ключі response.data:", Object.keys(response.data));
        }
      }
    }

    // Різні варіанти обробки даних в залежності від структури відповіді
    if (response) {
      // Якщо response.data - масив, використовуємо його напряму
      if (response.data && Array.isArray(response.data)) {
        return { data: response.data };
      }
      
      // Якщо response.data - об'єкт з полем 'results' (Django REST framework pagination)
      else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return { data: response.data.results };
      }
      
      // Якщо response - масив
      else if (Array.isArray(response)) {
        return { data: response };
      }
      
      // Якщо response містить масив 'results' (Django REST framework pagination)
      else if (response.results && Array.isArray(response.results)) {
        return { data: response.results };
      }
      
      // Якщо response.data - об'єкт, конвертуємо його значення у масив
      else if (response.data && typeof response.data === 'object') {
        return { data: Object.values(response.data) };
      }
      
      // Якщо response - об'єкт, конвертуємо його значення у масив
      else if (typeof response === 'object') {
        return { data: Object.values(response) };
      }
    }
    
    // У всіх інших випадках повертаємо порожній масив
    console.error("API повернуло дані у неочікуваному форматі:", response);
    return { data: [] };
  } catch (error) {
    console.error("Помилка при отриманні підрозділів:", error);
    return { data: [] };
  }
};

// Requests
export const getRequests = async (params) => {
  try {
    console.log('Запит на отримання запитів з параметрами:', params);
    const response = await api.get('requests/', { params });
    console.log('Отримані запити (сирі дані):', response);
    
    // Перевіряємо наявність даних та обробляємо різні формати відповіді
    if (response && response.data) {
      // Обробка пагінації Django REST Framework
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} запитів (з пагінацією)`);
        return { data: response.data.results };
      }
      
      // Якщо дані не мають пагінації, але є масивом
      if (Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} запитів (без пагінації)`);
        return { data: response.data };
      }
      
      // Якщо це один об'єкт
      if (!Array.isArray(response.data) && response.data.id) {
        console.log('Отримано один запит, конвертуємо в масив');
        return { data: [response.data] };
      }
      
      console.warn("Неочікуваний формат даних запитів:", response.data);
      return { data: [] };
    }
    
    console.error("API повернуло порожні дані запитів");
    return { data: [] };
  } catch (error) {
    console.error('Помилка при отриманні запитів:', error);
    return { data: [] };
  }
};
export const getRequest = (id) => api.get(`requests/${id}/`);
export const createRequest = (data) => api.post('requests/', data);
export const updateRequest = (id, data) => api.put(`requests/${id}/`, data);
export const deleteRequest = (id) => api.delete(`requests/${id}/`);
export const approveRequest = (id) => api.post(`requests/${id}/approve/`);
export const rejectRequest = (id, note) => api.post(`requests/${id}/reject/`, { note });
export const fulfillRequest = (id) => api.post(`requests/${id}/fulfill/`);

// Request Items
export const getRequestItems = (params) => api.get('request-items/', { params });
export const createRequestItem = (data) => api.post('request-items/', data);
export const updateRequestItem = (id, data) => api.put(`request-items/${id}/`, data);
export const deleteRequestItem = (id) => api.delete(`request-items/${id}/`);

// Routes
export const getRoutes = async (params) => {
  try {
    console.log('Виконуємо запит до API для маршрутів...');
    const response = await api.get('routes/', { params });
    console.log('Вихідна відповідь API для маршрутів:', response);
    return response;
  } catch (error) {
    console.error('Помилка запиту маршрутів:', error);
    if (error.response) {
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('Запит без відповіді:', error.request);
    } else {
      console.error('Помилка налаштування запиту:', error.message);
    }
    throw error;
  }
};
export const getRoute = (id) => api.get(`routes/${id}/`);
export const createRoute = async (data) => {
  try {
    console.log('Відправка запиту на створення маршруту:', data);
    const response = await api.post('routes/', data);
    console.log('Відповідь після створення маршруту:', response);
    return response;
  } catch (error) {
    console.error('Помилка при створенні маршруту:', error);
    if (error.response) {
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data
      });
      
      // Формуємо повідомлення про помилку з деталями
      const errorDetails = error.response.data 
        ? Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('; ')
        : 'Невідома помилка сервера';
      
      // Додаємо деталі помилки до об'єкта помилки
      error.message = `HTTP ${error.response.status}: ${errorDetails}`;
    }
    throw error;
  }
};
export const updateRoute = (id, data) => api.put(`routes/${id}/`, data);
export const deleteRoute = (id) => api.delete(`routes/${id}/`);
export const startRoute = (id) => api.post(`routes/${id}/start/`);
export const completeRoute = (id) => api.post(`routes/${id}/complete/`);

export const fetchRoutes = async (params) => {
  try {
    const response = await getRoutes(params);
    console.log("Детальна відповідь API для маршрутів:", response);
    
    // Аналіз структури відповіді
    console.log("Тип відповіді:", typeof response);
    if (response) {
      console.log("Ключі відповіді:", Object.keys(response));
      if (response.data) {
        console.log("Тип response.data:", typeof response.data);
        console.log("Чи є масивом:", Array.isArray(response.data));
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          console.log("Ключі response.data:", Object.keys(response.data));
        }
      }
    }

    // Різні варіанти обробки даних в залежності від структури відповіді
    if (response) {
      // Якщо response.data - масив, використовуємо його напряму
      if (response.data && Array.isArray(response.data)) {
        return { data: response.data };
      }
      
      // Якщо response.data - об'єкт з полем 'results' (Django REST framework pagination)
      else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return { data: response.data.results };
      }
      
      // Якщо response - масив
      else if (Array.isArray(response)) {
        return { data: response };
      }
      
      // Якщо response містить масив 'results' (Django REST framework pagination)
      else if (response.results && Array.isArray(response.results)) {
        return { data: response.results };
      }
      
      // Якщо response.data - об'єкт, конвертуємо його значення у масив
      else if (response.data && typeof response.data === 'object') {
        return { data: Object.values(response.data) };
      }
      
      // Якщо response - об'єкт, конвертуємо його значення у масив
      else if (typeof response === 'object') {
        return { data: Object.values(response) };
      }
    }
    
    // У всіх інших випадках повертаємо порожній масив
    console.error("API повернуло дані у неочікуваному форматі:", response);
    return { data: [] };
  } catch (error) {
    console.error("Помилка при отриманні маршрутів:", error);
    return { data: [] };
  }
};

// Route Points
export const createRoutePoint = async (data) => {
  try {
    console.log('Створення точки маршруту з даними:', data);
    const response = await api.post('route-points/', data);
    console.log('Відповідь створення точки маршруту:', response);
    return response;
  } catch (error) {
    console.error('Помилка створення точки маршруту:', error);
    if (error.response) {
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw error;
  }
};


export const getRoutePoints = async (routeId) => {
  try {
    console.log('Запит на отримання точок маршруту для маршруту ID:', routeId);
    const response = await api.get(`route-points/?route=${routeId}`);
    console.log('Отримані точки маршруту (сирі дані):', response);
    
    // Перевіряємо наявність даних та обробляємо різні формати відповіді
    if (response && response.data) {
      // Обробка пагінації Django REST Framework
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} точок маршруту (з пагінацією)`);
        return { data: response.data.results };
      }
      
      // Якщо дані не мають пагінації, але є масивом
      if (Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} точок маршруту (без пагінації)`);
        return { data: response.data };
      }
      
      // Якщо це один об'єкт
      if (!Array.isArray(response.data) && response.data.id) {
        console.log('Отримано одну точку маршруту, конвертуємо в масив');
        return { data: [response.data] };
      }
      
      console.warn("Неочікуваний формат даних точок маршруту:", response.data);
      return { data: [] };
    }
    
    console.error("API повернуло порожні дані точок маршруту");
    return { data: [] };
  } catch (error) {
    console.error('Помилка при отриманні точок маршруту:', error);
    // Повертаємо порожній масив замість викидання помилки для кращого UX
    return { data: [] };
  }
};

export const updateRoutePoint = (id, data) => api.put(`route-points/${id}/`, data);
export const deleteRoutePoint = (id) => api.delete(`route-points/${id}/`);

// Warehouse Locations
export const getWarehouseLocations = async (params) => {
  try {
    console.log('Запит на отримання локацій складу з параметрами:', params);
    const response = await api.get('warehouse-locations/', { params });
    console.log('Отримані локації складу (сирі дані):', response);
    
    if (response && response.data) {
      // Обробка пагінації Django REST Framework
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} локацій складу (з пагінацією)`);
        return { data: response.data.results };
      }
      
      // Якщо дані не мають пагінації, але є масивом
      if (Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} локацій складу (без пагінації)`);
        return { data: response.data };
      }
      
      console.warn("Неочікуваний формат даних локацій складу:", response.data);
      return { data: [] };
    }
    
    console.error("API повернуло порожні дані локацій складу");
    return { data: [] };
  } catch (error) {
    console.error('Помилка при отриманні локацій складу:', error);
    return { data: [] };
  }
};

// Inventory
export const getInventories = async (params) => {
  try {
    console.log('Запит на отримання інвентаризацій з параметрами:', params);
    const response = await api.get('inventories/', { params });
    console.log('Отримані інвентаризації (сирі дані):', response);
    
    if (response && response.data) {
      // Обробка пагінації Django REST Framework
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} інвентаризацій (з пагінацією)`);
        return { data: response.data.results };
      }
      
      // Якщо дані не мають пагінації, але є масивом
      if (Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} інвентаризацій (без пагінації)`);
        return { data: response.data };
      }
      
      console.warn("Неочікуваний формат даних інвентаризацій:", response.data);
      return { data: [] };
    }
    
    console.error("API повернуло порожні дані інвентаризацій");
    return { data: [] };
  } catch (error) {
    console.error('Помилка при отриманні інвентаризацій:', error);
    return { data: [] };
  }
};

export const getInventory = (id) => api.get(`inventories/${id}/`);
export const createInventory = (data) => api.post('inventories/', data);
export const updateInventory = (id, data) => api.put(`inventories/${id}/`, data);
export const deleteInventory = (id) => api.delete(`inventories/${id}/`);
export const startInventory = (id) => api.post(`inventories/${id}/start/`);
export const completeInventory = (id) => api.post(`inventories/${id}/complete/`);
export const cancelInventory = (id) => api.post(`inventories/${id}/cancel/`);

// Inventory Items
export const getInventoryItems = async (inventoryId) => {
  try {
    console.log('Запит на отримання елементів інвентаризації для ID:', inventoryId);
    const response = await api.get(`inventory-items/?inventory=${inventoryId}`);
    console.log('Отримані елементи інвентаризації (сирі дані):', response);
    
    if (response && response.data) {
      // Обробка пагінації Django REST Framework
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} елементів інвентаризації (з пагінацією)`);
        return { data: response.data.results };
      }
      
      // Якщо дані не мають пагінації, але є масивом
      if (Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} елементів інвентаризації (без пагінації)`);
        return { data: response.data };
      }
      
      console.warn("Неочікуваний формат даних елементів інвентаризації:", response.data);
      return { data: [] };
    }
    
    console.error("API повернуло порожні дані елементів інвентаризації");
    return { data: [] };
  } catch (error) {
    console.error('Помилка при отриманні елементів інвентаризації:', error);
    return { data: [] };
  }
};

export const getInventoryItem = (id) => api.get(`inventory-items/${id}/`);
export const updateInventoryItem = (id, data) => api.put(`inventory-items/${id}/`, data);
export const countInventoryItem = (id, actualQuantity, notes = "") => 
  api.post(`inventory-items/${id}/count/`, { actual_quantity: actualQuantity, notes });

// Inventory Discrepancies
export const getInventoryDiscrepancies = async (inventoryId) => {
  try {
    console.log('Запит на отримання розбіжностей інвентаризації для ID:', inventoryId);
    const response = await api.get(`inventory-discrepancies/?inventory=${inventoryId}`);
    console.log('Отримані розбіжності інвентаризації (сирі дані):', response);
    
    if (response && response.data) {
      // Обробка пагінації Django REST Framework
      if (response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} розбіжностей інвентаризації (з пагінацією)`);
        return { data: response.data.results };
      }
      
      // Якщо дані не мають пагінації, але є масивом
      if (Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} розбіжностей інвентаризації (без пагінації)`);
        return { data: response.data };
      }
      
      console.warn("Неочікуваний формат даних розбіжностей інвентаризації:", response.data);
      return { data: [] };
    }
    
    console.error("API повернуло порожні дані розбіжностей інвентаризації");
    return { data: [] };
  } catch (error) {
    console.error('Помилка при отриманні розбіжностей інвентаризації:', error);
    return { data: [] };
  }
};

export const getInventoryDiscrepancy = (id) => api.get(`inventory-discrepancies/${id}/`);
export const updateInventoryDiscrepancy = (id, data) => api.put(`inventory-discrepancies/${id}/`, data);
export const resolveDiscrepancy = (id, reason, note) => 
  api.post(`inventory-discrepancies/${id}/resolve/`, { reason, resolution_note: note });
export const ignoreDiscrepancy = (id, note) => 
  api.post(`inventory-discrepancies/${id}/ignore/`, { resolution_note: note });

// Users
export const getUsers = async () => {
  try {
    console.log('Виконуємо прямий запит до API для користувачів...');
    const response = await api.get('users/');
    console.log('Отримана відповідь від API для користувачів:', response);
    return response;
  } catch (error) {
    console.error('Помилка запиту користувачів:', error);
    if (error.response) {
      // Сервер повернув відповідь зі статусом відмінним від 2xx
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      // Запит був зроблений, але відповіді не було
      console.error('Запит без відповіді:', error.request);
    } else {
      // Помилка в налаштуванні запиту
      console.error('Помилка налаштування запиту:', error.message);
    }
    throw error;
  }
};
export const getUser = (id) => api.get(`users/${id}/`);
export const createUser = async (data) => {
  try {
    console.log('Створення користувача з даними:', data);
    // Перевірка наявності обов'язкових полів
    if (!data.username) {
      console.error('Помилка: імʼя користувача відсутнє');
      throw new Error('Імʼя користувача обовязкове');
    }
    
    if (!data.password) {
      console.error('Помилка: пароль відсутній');
      throw new Error('Пароль обовязковий');
    }
    
    // Перевірка на допустимі значення ролі
    const validRoles = ['admin', 'warehouse', 'logistician', 'manager'];
    if (data.role && !validRoles.includes(data.role)) {
      console.error(`Помилка: недопустима роль '${data.role}'. Допустимі ролі: ${validRoles.join(', ')}`);
      throw new Error(`Недопустима роль '${data.role}'. Будь ласка, виберіть одну з: ${validRoles.join(', ')}`);
    }
    
    // Переконуємося, що значення за замовчуванням - 'manager'
    const userData = {
      ...data,
      role: data.role || 'manager'
    };
    
    console.log('Відправка даних користувача після перевірки:', userData);
    
    // Примітка: Не хешуємо пароль на фронтенді.
    // Django самостійно хешує паролі використовуючи PBKDF2 з SHA-256
    // при отриманні запиту на створення користувача
    const response = await api.post('users/', userData);
    console.log('Відповідь створення користувача:', response.status, response.statusText);
    return response;
  } catch (error) {
    console.error('Помилка при створенні користувача:', error);
    if (error.response) {
      console.error('Відповідь сервера:', error.response.status, error.response.data);
      
      // Виводимо більш детальне повідомлення про помилку
      if (error.response.data) {
        const errorDetails = Object.entries(error.response.data)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('\n');
        console.error('Детальна помилка від API:', errorDetails);
      }
    }
    throw error;
  }
};
export const updateUser = (id, data) => api.put(`users/${id}/`, data);
export const deleteUser = (id) => api.delete(`users/${id}/`);

// Функції-обгортки для підтримки старих викликів
export const fetchMe = () => getCurrentUser();
export const fetchProducts = async (params) => {
  try {
    console.log('fetchProducts викликано з параметрами:', params);
    const result = await getProducts(params);
    console.log('Результат fetchProducts:', result);
    
    // Перевірка на правильність формату даних
    if (!result || !result.data) {
      console.warn('fetchProducts: результат не містить даних');
      return { data: [] };
    }
    
    if (!Array.isArray(result.data)) {
      console.warn('fetchProducts: результат не є масивом:', result.data);
      return { data: [] };
    }
    
    console.log(`fetchProducts: отримано ${result.data.length} продуктів`);
    return result;
  } catch (error) {
    console.error('Помилка в fetchProducts:', error);
    return { data: [] };
  }
};
export const fetchBatches = (params) => getBatches(params);
export const fetchTransactions = (params) => getTransactions(params);
export const fetchUsers = async () => {
  try {
    console.log('Виконуємо запит до API для отримання користувачів...');
    const response = await getUsers();
    console.log('Вихідна відповідь API для користувачів:', response);
    
    // Аналіз структури відповіді
    console.log("Тип відповіді:", typeof response);
    if (response) {
      console.log("Ключі відповіді:", Object.keys(response));
      if (response.data) {
        console.log("Тип response.data:", typeof response.data);
        console.log("Чи є масивом:", Array.isArray(response.data));
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          console.log("Ключі response.data:", Object.keys(response.data));
        }
      }
    }

    // Різні варіанти обробки даних в залежності від структури відповіді
    if (response) {
      // Якщо response.data - масив, використовуємо його напряму
      if (response.data && Array.isArray(response.data)) {
        console.log(`Отримано ${response.data.length} користувачів як масив`);
        return { data: response.data };
      }
      
      // Якщо response.data - об'єкт з полем 'results' (Django REST framework pagination)
      else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        console.log(`Отримано ${response.data.results.length} користувачів з пагінацією`);
        return { data: response.data.results };
      }
      
      // Якщо response - масив
      else if (Array.isArray(response)) {
        console.log(`Отримано ${response.length} користувачів (response є масивом)`);
        return { data: response };
      }
      
      // Якщо response містить масив 'results' (Django REST framework pagination)
      else if (response.results && Array.isArray(response.results)) {
        console.log(`Отримано ${response.results.length} користувачів (response.results є масивом)`);
        return { data: response.results };
      }
      
      // Якщо response.data - об'єкт, конвертуємо його значення у масив
      else if (response.data && typeof response.data === 'object') {
        console.log('Response.data є об\'єктом, конвертуємо в масив');
        return { data: Object.values(response.data) };
      }
      
      // Якщо response - об'єкт, конвертуємо його значення у масив
      else if (typeof response === 'object') {
        console.log('Response є об\'єктом, конвертуємо в масив');
        return { data: Object.values(response) };
      }
    }
    
    // У всіх інших випадках повертаємо порожній масив
    console.error("API повернуло дані у неочікуваному форматі:", response);
    return { data: [] };
  } catch (error) {
    console.error("Помилка при отриманні користувачів:", error);
    if (error.response) {
      console.error('Деталі відповіді:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('Запит без відповіді:', error.request);
    } else {
      console.error('Помилка налаштування запиту:', error.message);
    }
    return { data: [] };
  }
};

export const fetchWarehouses = async () => {
  try {
    const response = await getWarehouses();
    console.log("Детальна відповідь API для складів:", response);
    
    // Аналіз структури відповіді
    console.log("Тип відповіді:", typeof response);
    if (response) {
      console.log("Ключі відповіді:", Object.keys(response));
      if (response.data) {
        console.log("Тип response.data:", typeof response.data);
        console.log("Чи є масивом:", Array.isArray(response.data));
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          console.log("Ключі response.data:", Object.keys(response.data));
        }
      }
    }

    // Різні варіанти обробки даних в залежності від структури відповіді
    if (response) {
      // Якщо response.data - масив, використовуємо його напряму
      if (response.data && Array.isArray(response.data)) {
        return { data: response.data };
      }
      
      // Якщо response.data - об'єкт з полем 'results' (Django REST framework pagination)
      else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        return { data: response.data.results };
      }
      
      // Якщо response - масив
      else if (Array.isArray(response)) {
        return { data: response };
      }
      
      // Якщо response містить масив 'results' (Django REST framework pagination)
      else if (response.results && Array.isArray(response.results)) {
        return { data: response.results };
      }
      
      // Якщо response.data - об'єкт, конвертуємо його значення у масив
      else if (response.data && typeof response.data === 'object') {
        return { data: Object.values(response.data) };
      }
      
      // Якщо response - об'єкт, конвертуємо його значення у масив
      else if (typeof response === 'object') {
        return { data: Object.values(response) };
      }
    }
    
    // У всіх інших випадках повертаємо порожній масив
    console.error("API повернуло дані у неочікуваному форматі:", response);
    return { data: [] };
  } catch (error) {
    console.error("Помилка при отриманні складів:", error);
    return { data: [] };
  }
};

// Функції-обгортки для роботи з інвентаризацією
export const fetchInventories = (params) => getInventories(params);
export const fetchInventoryItems = (inventoryId) => getInventoryItems(inventoryId);
export const fetchInventoryDiscrepancies = (inventoryId) => getInventoryDiscrepancies(inventoryId);
export const fetchWarehouseLocations = (params) => getWarehouseLocations(params);

export default api;