import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './styles/dashboards.css';
import './styles/admin-dashboard.css';
import './styles/warehouse-dashboard.css';
import './styles/logistician-dashboard.css';
import './styles/requester-dashboard.css';
import './styles/supplier-dashboard.css';
import './styles/header.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Оскільки axios вже імпортовано в api.js, 
// і вже є глобальний перехоплювач в API.js, 
// тут додатковий код не потрібний

// Імпортуємо axios для глобальних налаштувань
import axios from 'axios';

// Додаємо глобальний обробник помилок для відстеження проблем з авторизацією
axios.interceptors.response.use(
  response => response,
  error => {
    // Якщо отримуємо помилку 401 (неавторизовано)
    if (error.response && error.response.status === 401) {
      console.error('Помилка авторизації 401:', error.response.data);
      
      // Якщо ми не на сторінці логіну, перенаправляємо
      if (!window.location.pathname.includes('/login')) {
        console.log('Перенаправлення на логін через невдалу авторизацію');
        // Зберігаємо шлях для можливого повернення
        localStorage.setItem('returnPath', window.location.pathname);
        // Видаляємо токен, бо він невалідний
        localStorage.removeItem('authToken');
        // Перенаправлення можна реалізувати також через history API
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
