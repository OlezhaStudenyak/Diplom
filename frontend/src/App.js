// src/App.js
import React, { useEffect, useState } from 'react';
import Login from './components/Login';
import AdminDashboard from './components/dashboards/AdminDashboard';
import SupplierDashboard from './components/dashboards/SupplierDashboard';
import RequesterDashboard from './components/dashboards/RequesterDashboard';
import LogisticianDashboard from './components/dashboards/LogisticianDashboard';
import WarehouseDashboard from './components/dashboards/WarehouseDashboard';
import AddForms from './components/AddForms';
import ProductsPage      from './components/ProductsPage';
import 'bootstrap/dist/css/bootstrap.min.css';

import {
  loginUser,
  fetchMe,
  fetchProducts,
  fetchBatches,
  receiveBatch,
  fetchTransactions
} from './api';

function App() {
  const [user, setUser]               = useState(null);
  const [view, setView]               = useState('dashboard');
  const [products, setProducts]       = useState([]);
  const [batches, setBatches]         = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Подгружаем данные после того, как user установлен
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        console.log('Завантаження даних для користувача:', user.username);
        
        // Перевіряємо наявність токена перед запитами
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.warn('Відсутній токен авторизації при спробі завантаження даних');
          return;
        }
        
        // Завантажуємо дані з обробкою помилок
        const prods = await fetchProducts();
        setProducts(prods.data);
        
        const bchs = await fetchBatches();
        setBatches(bchs.data);
        
        const txs = await fetchTransactions();
        setTransactions(txs.data);
        
        console.log('Всі дані успішно завантажено');
      } catch (error) {
        console.error('Помилка завантаження даних:', error);
        
        // Перевіряємо помилку авторизації
        if (error.response && error.response.status === 401) {
          console.error('Помилка авторизації при завантаженні даних');
          // Перезавантажуємо сторінку для перенаправлення на логін
          window.location.reload();
        }
      }
    };
    
    loadData();
  }, [user]);
  

  // Обработчик receive для batch
  const onReceive = async id => {
    await receiveBatch(id, 10);
    const { data } = await fetchBatches();
    setBatches(data);
  };

  // Пока нет user — показываем форму логина
  if (!user) {
    return (
      <Login onLogin={async u => {
        setUser(u);
        // сразу после входа подгружаем данные
        const prods = await fetchProducts();
        setProducts(prods.data);
        const bchs = await fetchBatches();
        setBatches(bchs.data);
        const txs = await fetchTransactions();
        setTransactions(txs.data);
      }} />
    );
  }

  // Відображаємо дешборд в залежності від ролі користувача
  if (view === 'dashboard') {
    // Для адміністратора
    if (user.is_staff || user.role === 'admin') {
      return <AdminDashboard user={user} onSelect={v => setView(v)} setUser={setUser} />;
    }
    
    // Для складського працівника
    if (user.role === 'warehouse') {
      return <WarehouseDashboard user={user} onSelect={v => setView(v)} setUser={setUser} />;
    }
    
    // Для логіста
    if (user.role === 'logistician') {
      return <LogisticianDashboard user={user} onSelect={v => setView(v)} setUser={setUser} />;
    }
    
    // За замовчуванням для потребувача (requester) або менеджера
    return <RequesterDashboard user={user} onSelect={v => setView(v)} setUser={setUser} />;
  }
console.log(user)
  // Основной UI, в зависимости от view
  return (
    <div style={{ padding: '2rem' }}>
      {/* Кнопка повернення до дешборду для всіх користувачів */}
      <button onClick={() => setView('dashboard')}>
          ← Назад в панель управления
      </button>

      {/* Просмотр Продуктов */}
      {view === 'products' && (
        <>
          <h1>Products</h1>
          <ul>
            {products.map(p => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </>
      )}

      {/* Просмотр Партий */}
      {view === 'batches' && (
        <>
          <h1>Batches</h1>
          <ul>
            {batches.map(b => (
              <li key={b.id} style={{ marginBottom: '0.5rem' }}>
                {b.product.name}: {b.quantity} шт. {' '}
                <button onClick={() => onReceive(b.id)}>Receive +10</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Просмотр Транзакций */}
      {view === 'transactions' && (
        <>
          <h1>Transactions</h1>
          <ul>
            {transactions.map(t => (
              <li key={t.id}>{t.type} — {t.quantity}</li>
            ))}
          </ul>
        </>
      )}

      {/* Админская панель AddForms: только если админ и не на дашборде */}
      {user.is_staff && view !== 'dashboard' && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Администрирование</h2>
          <AddForms
            user={user}
            refreshBatches={() => fetchBatches().then(r => setBatches(r.data))}
          />
        </div>
      )}
    </div>
  );
}

export default App;
