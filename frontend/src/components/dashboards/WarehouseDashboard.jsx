import React, { useState, useEffect } from 'react';
import { 
  fetchProducts, 
  fetchBatches, 
  fetchTransactions,
  fetchWarehouses, 
  fetchDepartments, 
  getRequests, 
  getBatches,
  receiveBatch, 
  dispenseBatch, 
  transferBatch, 
  inventoryBatch,
  fulfillRequest,
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  updateBatchLocation
} from '../../api';
import '../../styles/Dashboard.css';
import '../../styles/warehouse-dashboard.css';

// Допоміжний компонент для відображення таблиці партій
const BatchesTable = ({ batches, products, onBatchAction }) => {
  if (!batches || !Array.isArray(batches) || batches.length === 0) {
    return <p>Немає партій для відображення.</p>;
  }
  
  // Функція для безпечного отримання імені продукту
  const getProductName = (productId) => {
    if (!products || !Array.isArray(products)) {
      return `Продукт ID: ${productId}`;
    }
    
    const product = products.find(p => p.id === productId);
    return product ? product.name : `Продукт ID: ${productId}`;
  };
  
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Продукт</th>
          <th>Партія</th>
          <th>Кількість</th>
          <th>Виробництво</th>
          <th>Термін придатності</th>
          <th>Дії</th>
        </tr>
      </thead>
      <tbody>
        {batches.map(batch => {
          // Безпечне отримання імені продукту
          const productName = batch.product_name || 
                             (batch.product && batch.product.name) || 
                             getProductName(batch.product) || 
                             'Невідомий продукт';
          
          return (
            <tr key={batch.id || `batch-${Math.random()}`} 
                className={new Date(batch.expiry_date) < new Date() ? 'expired-batch' : ''}>
              <td>{batch.id}</td>
              <td>{productName}</td>
              <td>{batch.batch_number}</td>
              <td>{batch.quantity}</td>
              <td>{batch.production_date}</td>
              <td>{batch.expiry_date}</td>
              <td>
                <button onClick={() => onBatchAction(batch.id, 'transaction')}>Транзакція</button>
                <button onClick={() => onBatchAction(batch.id, 'transfer')}>Перемістити</button>
                <button onClick={() => onBatchAction(batch.id, 'adjust')}>Інвентаризація</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// Допоміжний компонент для відображення списку транзакцій
const TransactionsList = ({ transactions }) => {
  if (!transactions) {
    return <p>Немає даних про транзакції.</p>;
  }
  
  if (!Array.isArray(transactions)) {
    console.error('TransactionsList отримав не масив:', transactions);
    return (
      <div className="error-message">
        <p>Помилка завантаження транзакцій. Неправильний формат даних.</p>
        <button onClick={() => window.location.reload()}>Перезавантажити сторінку</button>
      </div>
    );
  }
  
  if (transactions.length === 0) {
    return <p>Немає транзакцій для відображення.</p>;
  }
  
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Тип</th>
          <th>Партія</th>
          <th>Кількість</th>
          <th>Дата</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map(tx => (
          <tr key={tx.id || `tx-${Math.random()}`}>
            <td>{tx.id}</td>
            <td>{tx.type === 'IN' ? 'Прийом' : tx.type === 'OUT' ? 'Відпуск' : tx.type}</td>
            <td>{tx.batch_number || (tx.batch && tx.batch.batch_number) || 'Невідома партія'}</td>
            <td>{tx.quantity}</td>
            <td>{tx.created_at?.split('T')[0] || 'Невідома дата'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const WarehouseDashboard = ({ user }) => {
  // Додаємо обробник помилок для відстеження проблем з даними
  const safeFind = (array, predicate, fallbackValue) => {
    if (!Array.isArray(array)) {
      console.warn('safeFind: перший аргумент не є масивом', array);
      return fallbackValue;
    }
    try {
      const result = array.find(predicate);
      return result || fallbackValue;
    } catch (error) {
      console.error('Помилка у функції safeFind:', error);
      return fallbackValue;
    }
  };
  const [activeTab, setActiveTab] = useState('inventory');
  const [batches, setBatches] = useState([]);
  
  // Безпечний сеттер для продуктів
  const safeSetProducts = (data) => {
    if (Array.isArray(data)) {
      setProducts(data);
    } else if (data && data.data && Array.isArray(data.data)) {
      setProducts(data.data);
    } else {
      console.warn('Спроба встановити недійсні дані продуктів:', data);
      setProducts([]);
    }
  };
  
  // Безпечний сеттер для партій
  const safeSetBatches = (data) => {
    if (Array.isArray(data)) {
      setBatches(data);
    } else if (data && data.data && Array.isArray(data.data)) {
      setBatches(data.data);
    } else {
      console.warn('Спроба встановити недійсні дані партій:', data);
      setBatches([]);
    }
  };
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [requests, setRequests] = useState([]);
  // Локації складу
  const [locations, setLocations] = useState([]);
  // Гарантуємо, що transactions завжди масив
  const [transactions, setTransactions] = useState([]);
  
  // Безпечний сеттер для транзакцій
  const safeSetTransactions = (data) => {
    if (Array.isArray(data)) {
      setTransactions(data);
    } else if (data && data.data && Array.isArray(data.data)) {
      setTransactions(data.data);
    } else {
      console.warn('Спроба встановити недійсні дані транзакцій:', data);
      setTransactions([]);
    }
  };
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Форми для операцій
  const [receiveForm, setReceiveForm] = useState({
    batch: '',
    quantity: 1,
    note: ''
  });
  
  const [dispenseForm, setDispenseForm] = useState({
    batch: '',
    quantity: 1,
    destination: '',
    note: ''
  });
  
  const [transferForm, setTransferForm] = useState({
    batch: '',
    quantity: 1,
    warehouse: '',
    note: ''
  });
  
  const [inventoryForm, setInventoryForm] = useState({
    batch: '',
    actual_quantity: 0,
    note: ''
  });
  
  // Форма для локацій
  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    type: 'bin',
    parent: '',
    description: ''
  });
  
  // Форма для призначення локації для партії
  const [batchLocationForm, setBatchLocationForm] = useState({
    batch: '',
    location: ''
  });
  
  // Стан редагування локації
  const [editingLocation, setEditingLocation] = useState(null);
  
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);
  
  // Завантаження даних при зміні вкладки
  useEffect(() => {
    if (selectedWarehouse) {
      loadTabData();
    }
  }, [activeTab, selectedWarehouse]);
  
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Отримуємо список складів
      const warehousesResponse = await fetchWarehouses();
      setWarehouses(warehousesResponse.data);
      
      // Визначаємо склад користувача (якщо він призначений менеджером)
      const userWarehouses = warehousesResponse.data.filter(wh => wh.manager === user.id);
      
      if (userWarehouses.length > 0) {
        setSelectedWarehouse(userWarehouses[0].id.toString());
      } else if (warehousesResponse.data.length > 0) {
        // Якщо немає складів, де користувач є менеджером, але є інші склади
        setSelectedWarehouse(warehousesResponse.data[0].id.toString());
      }
      
      // Завантажуємо продукти для відображення їх назв
      const productsResponse = await fetchProducts();
      setProducts(productsResponse.data);
      
      // Завантажуємо підрозділи для форми відвантаження
      const departmentsResponse = await fetchDepartments();
      setDepartments(departmentsResponse.data);
      
    } catch (err) {
      console.error("Помилка завантаження даних:", err);
      setError("Помилка завантаження даних. Спробуйте оновити сторінку.");
    } finally {
      setLoading(false);
    }
  };
  
  const loadTabData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'inventory') {
        // Завантажуємо інвентар для вибраного складу
        const batchesResponse = await getBatches({ warehouse: selectedWarehouse });
        setBatches(batchesResponse.data);
      } else if (activeTab === 'transactions') {
        // Завантажуємо транзакції
        const transactionsResponse = await fetchTransactions({ 
          'batch__warehouse': selectedWarehouse 
        });
        setTransactions(transactionsResponse.data);
      } else if (activeTab === 'requests') {
        // Завантажуємо заявки, які чекають на виконання
        const requestsResponse = await getRequests({ status: 'approved' });
        setRequests(requestsResponse.data);
      } else if (activeTab === 'locations') {
        // Завантажуємо локації для вибраного складу
        const locationsResponse = await fetchLocations({ warehouse: selectedWarehouse });
        setLocations(locationsResponse.data);
        
        // Також завантажуємо партії для вибраного складу (для призначення локацій)
        const batchesResponse = await getBatches({ warehouse: selectedWarehouse });
        setBatches(batchesResponse.data);
      } else if (activeTab.startsWith('operations')) {
        // Завантажуємо партії для вибраного складу (для операцій)
        const batchesResponse = await getBatches({ warehouse: selectedWarehouse });
        setBatches(batchesResponse.data);
      }
    } catch (err) {
      console.error("Помилка завантаження даних для вкладки:", err);
      setError(`Помилка завантаження даних для вкладки "${activeTab}". Спробуйте знову.`);
    } finally {
      setLoading(false);
    }
  };
  
  const changeWarehouse = (warehouseId) => {
    setSelectedWarehouse(warehouseId);
  };
  
  // Обробники операцій
  const handleReceive = async (e) => {
    e.preventDefault();
    
    if (!receiveForm.batch || receiveForm.quantity <= 0) {
      alert("Будь ласка, заповніть всі поля коректно");
      return;
    }
    
    try {
      await receiveBatch(receiveForm.batch, {
        quantity: receiveForm.quantity,
        note: receiveForm.note
      });
      
      // Скидаємо форму
      setReceiveForm({
        batch: '',
        quantity: 1,
        note: ''
      });
      
      // Оновлюємо дані
      loadTabData();
      
      alert("Товар успішно отримано");
    } catch (error) {
      console.error("Помилка отримання товару:", error);
      alert("Помилка отримання товару: " + (error.response?.data?.detail || error.message));
    }
  };
  
  const handleDispense = async (e) => {
    e.preventDefault();
    
    if (!dispenseForm.batch || dispenseForm.quantity <= 0) {
      alert("Будь ласка, заповніть всі обов'язкові поля коректно");
      return;
    }
    
    try {
      await dispenseBatch(dispenseForm.batch, {
        quantity: dispenseForm.quantity,
        destination: dispenseForm.destination || null,
        note: dispenseForm.note
      });
      
      // Скидаємо форму
      setDispenseForm({
        batch: '',
        quantity: 1,
        destination: '',
        note: ''
      });
      
      // Оновлюємо дані
      loadTabData();
      
      alert("Товар успішно відпущено");
    } catch (error) {
      console.error("Помилка відпуску товару:", error);
      alert("Помилка відпуску товару: " + (error.response?.data?.detail || error.message));
    }
  };
  
  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!transferForm.batch || transferForm.quantity <= 0 || !transferForm.warehouse) {
      alert("Будь ласка, заповніть всі поля коректно");
      return;
    }
    
    try {
      await transferBatch(transferForm.batch, {
        quantity: transferForm.quantity,
        warehouse: transferForm.warehouse,
        note: transferForm.note
      });
      
      // Скидаємо форму
      setTransferForm({
        batch: '',
        quantity: 1,
        warehouse: '',
        note: ''
      });
      
      // Оновлюємо дані
      loadTabData();
      
      alert("Товар успішно переміщено");
    } catch (error) {
      console.error("Помилка переміщення товару:", error);
      alert("Помилка переміщення товару: " + (error.response?.data?.detail || error.message));
    }
  };
  
  
  const handleInventory = async (e) => {
    e.preventDefault();
    
    if (!inventoryForm.batch || inventoryForm.actual_quantity < 0) {
      alert("Будь ласка, заповніть всі поля коректно");
      return;
    }
    
    try {
      await inventoryBatch(inventoryForm.batch, {
        actual_quantity: inventoryForm.actual_quantity,
        note: inventoryForm.note
      });
      
      // Скидаємо форму
      setInventoryForm({
        batch: '',
        actual_quantity: 0,
        note: ''
      });
      
      // Оновлюємо дані
      loadTabData();
      
      alert("Інвентаризацію успішно проведено");
    } catch (error) {
      console.error("Помилка інвентаризації:", error);
      alert("Помилка інвентаризації: " + (error.response?.data?.detail || error.message));
    }
  };
  
  const handleFulfillRequest = async (requestId) => {
    if (window.confirm("Ви підтверджуєте видачу товарів за цією заявкою?")) {
      try {
        await fulfillRequest(requestId);
        
        // Оновлюємо список заявок
        const requestsResponse = await getRequests({ status: 'approved' });
        setRequests(requestsResponse.data);
        
        alert("Заявку успішно виконано");
      } catch (error) {
        console.error("Помилка виконання заявки:", error);
        alert("Помилка виконання заявки: " + (error.response?.data?.detail || error.message));
      }
    }
  };
  
  // Функції для роботи з локаціями
  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Перевірка обов'язкових полів
      if (!locationForm.name || !locationForm.code) {
        alert("Назва та код локації є обов'язковими");
        return;
      }
      
      // Оновлення або створення нової локації
      if (editingLocation) {
        await updateLocation(editingLocation.id, {
          ...locationForm,
          warehouse: selectedWarehouse
        });
        alert("Локацію успішно оновлено");
      } else {
        await createLocation({
          ...locationForm,
          warehouse: selectedWarehouse
        });
        alert("Локацію успішно створено");
      }
      
      // Скидаємо форму і стан редагування
      setLocationForm({
        name: '',
        code: '',
        type: 'bin',
        parent: '',
        description: ''
      });
      setEditingLocation(null);
      
      // Оновлюємо список локацій
      const locationsResponse = await fetchLocations({ warehouse: selectedWarehouse });
      setLocations(locationsResponse.data);
    } catch (error) {
      console.error("Помилка збереження локації:", error);
      alert("Помилка збереження локації: " + (error.response?.data?.detail || error.message));
    }
  };
  
  const handleEditLocation = (location) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      code: location.code,
      type: location.type,
      parent: location.parent || '',
      description: location.description || ''
    });
  };
  
  const handleDeleteLocation = async (locationId) => {
    if (window.confirm("Ви впевнені, що хочете видалити цю локацію? Всі партії, пов'язані з цією локацією, будуть розташовані без локації.")) {
      try {
        await deleteLocation(locationId);
        
        // Оновлюємо список локацій
        const locationsResponse = await fetchLocations({ warehouse: selectedWarehouse });
        setLocations(locationsResponse.data);
        
        alert("Локацію успішно видалено");
      } catch (error) {
        console.error("Помилка видалення локації:", error);
        alert("Помилка видалення локації: " + (error.response?.data?.detail || error.message));
      }
    }
  };
  
  // Функція для призначення локації для партії
  const handleAssignBatchLocation = async (e) => {
    e.preventDefault();
    
    try {
      if (!batchLocationForm.batch || !batchLocationForm.location) {
        alert("Оберіть партію та локацію");
        return;
      }
      
      await updateBatchLocation(batchLocationForm.batch, {
        location: batchLocationForm.location
      });
      
      // Скидаємо форму
      setBatchLocationForm({
        batch: '',
        location: ''
      });
      
      // Оновлюємо список партій
      const batchesResponse = await getBatches({ warehouse: selectedWarehouse });
      setBatches(batchesResponse.data);
      
      alert("Локацію для партії успішно оновлено");
    } catch (error) {
      console.error("Помилка при призначенні локації для партії:", error);
      alert("Помилка при призначенні локації для партії: " + (error.response?.data?.detail || error.message));
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('uk-UA');
  };
  
  return (
    <div className="warehouse-dashboard">
      <h1>Панель керування складом</h1>
         
      
      <button 
        onClick={() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }}
        className="login-return-button"
      >
        Повернутися до сторінки логіну
      </button>
      
      {!user && <div className="loading">Завантаження інформації про користувача...</div>}
      {loading && <div className="loading">Завантаження даних...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {user && selectedWarehouse && !loading && (
        <>
          <div className="warehouse-selector">
            <label>Склад:</label>
            <select 
              value={selectedWarehouse} 
              onChange={(e) => changeWarehouse(e.target.value)}
            >
              {warehouses.map(wh => (
                <option 
                  key={wh.id} 
                  value={wh.id}
                  disabled={user.role === 'warehouse' && wh.manager !== user.id}
                >
                  {wh.name} {wh.manager === user.id ? '(мій склад)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="dashboard-tabs">
            <button 
              className={activeTab === 'inventory' ? 'active' : ''} 
              onClick={() => setActiveTab('inventory')}
            >
              Інвентар
            </button>
            <button 
              className={activeTab === 'transactions' ? 'active' : ''} 
              onClick={() => setActiveTab('transactions')}
            >
              Транзакції
            </button>
            <button 
              className={activeTab === 'requests' ? 'active' : ''} 
              onClick={() => setActiveTab('requests')}
            >
              Заявки
            </button>
            <button 
              className={activeTab === 'operations-receive' ? 'active' : ''} 
              onClick={() => setActiveTab('operations-receive')}
            >
              Отримання
            </button>
            <button 
              className={activeTab === 'operations-dispense' ? 'active' : ''} 
              onClick={() => setActiveTab('operations-dispense')}
            >
              Відпуск
            </button>
            <button 
              className={activeTab === 'operations-transfer' ? 'active' : ''} 
              onClick={() => setActiveTab('operations-transfer')}
            >
              Переміщення
            </button>
            <button 
              className={activeTab === 'operations-inventory' ? 'active' : ''} 
              onClick={() => setActiveTab('operations-inventory')}
            >
              Інвентаризація
            </button>
            <button 
              className={activeTab === 'locations' ? 'active' : ''} 
              onClick={() => setActiveTab('locations')}
            >
              Локації
            </button>
            <button 
              className={activeTab === 'stocktaking' ? 'active' : ''} 
              onClick={() => setActiveTab('stocktaking')}
            >
              Інвентаризація
            </button>
            <button 
              className={activeTab === 'reports' ? 'active' : ''} 
              onClick={() => setActiveTab('reports')}
            >
              Звіти
            </button>
          </div>
          
          <div className="dashboard-content">
            {/* Інвентар */}
            {activeTab === 'inventory' && !loading && (
              <div>
                <h2>Інвентар складу</h2>
                {batches.length === 0 ? (
                  <p>Немає доступних партій на складі</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Номер партії</th>
                        <th>Продукт</th>
                        <th>Кількість</th>
                        <th>Термін придатності</th>
                        <th>Локація</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map(batch => (
                        <tr key={batch.id}>
                          <td>{batch.batch_number}</td>
                          <td>
                            {Array.isArray(products) 
                              ? (products.find(p => p.id === batch.product)?.name || batch.product_name || 'Невідомий продукт')
                              : (batch.product_name || `Продукт ID: ${batch.product}` || 'Невідомий продукт')}
                          </td>
                          <td>{batch.quantity}</td>
                          <td>{new Date(batch.expiry_date).toLocaleDateString()}</td>
                          <td>{batch.location_display || 'Не вказано'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            {/* Транзакції */}
            {activeTab === 'transactions' && !loading && (
              <div>
                <h2>Історія транзакцій</h2>
                {transactions.length === 0 ? (
                  <p>Немає транзакцій для відображення</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Тип</th>
                        <th>Партія</th>
                        <th>Продукт</th>
                        <th>Кількість</th>
                        <th>Користувач</th>
                        <th>Примітка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(transaction => (
                        <tr key={transaction.id}>
                          <td>{formatDate(transaction.timestamp)}</td>
                          <td>{transaction.type}</td>
                          <td>{transaction.batch?.batch_number}</td>
                          <td>{products.find(p => p.id === transaction.batch?.product)?.name || 'Невідомий продукт'}</td>
                          <td>{transaction.quantity}</td>
                          <td>{transaction.user_name || transaction.user}</td>
                          <td>{transaction.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            {/* Заявки */}
            {activeTab === 'requests' && !loading && (
              <div>
                <h2>Заявки на видачу</h2>
                {requests.length === 0 ? (
                  <p>Немає затверджених заявок, які очікують на видачу</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Дата створення</th>
                        <th>Підрозділ</th>
                        <th>Примітка</th>
                        <th>Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(request => (
                        <tr key={request.id}>
                          <td>{request.id}</td>
                          <td>{formatDate(request.created_at)}</td>
                          <td>{departments.find(d => d.id === request.department)?.name || 'Невідомий підрозділ'}</td>
                          <td>{request.note}</td>
                          <td>
                            <button onClick={() => handleFulfillRequest(request.id)}>
                              Виконати заявку
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            {/* Локації */}
            {activeTab === 'locations' && !loading && (
              <div className="locations-container">
                <h2>Локації складу</h2>
                
                <div className="locations-grid">
                  <div className="locations-form">
                    <h3>{editingLocation ? 'Редагувати локацію' : 'Додати нову локацію'}</h3>
                    <form onSubmit={handleLocationSubmit}>
                      <div className="form-group">
                        <label>Назва:</label>
                        <input
                          type="text"
                          required
                          value={locationForm.name}
                          onChange={(e) => setLocationForm({...locationForm, name: e.target.value})}
                          placeholder="Наприклад: Стелаж А"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Код:</label>
                        <input
                          type="text"
                          required
                          value={locationForm.code}
                          onChange={(e) => setLocationForm({...locationForm, code: e.target.value})}
                          placeholder="Наприклад: A-1-2"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Тип:</label>
                        <select
                          value={locationForm.type}
                          onChange={(e) => setLocationForm({...locationForm, type: e.target.value})}
                        >
                          <option value="zone">Зона</option>
                          <option value="rack">Стелаж</option>
                          <option value="shelf">Полиця</option>
                          <option value="bin">Комірка</option>
                          <option value="other">Інше</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Батьківська локація:</label>
                        <select
                          value={locationForm.parent}
                          onChange={(e) => setLocationForm({...locationForm, parent: e.target.value})}
                        >
                          <option value="">Немає (коренева локація)</option>
                          {locations.map(loc => (
                            // Не показуємо поточну локацію, яку ми редагуємо, як можливу батьківську
                            editingLocation && loc.id === editingLocation.id ? null : (
                              <option key={loc.id} value={loc.id}>
                                {loc.code} - {loc.name}
                              </option>
                            )
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Опис:</label>
                        <textarea
                          value={locationForm.description}
                          onChange={(e) => setLocationForm({...locationForm, description: e.target.value})}
                          placeholder="Додаткова інформація про локацію"
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button type="submit">{editingLocation ? 'Оновити' : 'Додати'}</button>
                        {editingLocation && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingLocation(null);
                              setLocationForm({
                                name: '',
                                code: '',
                                type: 'bin',
                                parent: '',
                                description: ''
                              });
                            }}
                          >
                            Скасувати
                          </button>
                        )}
                      </div>
                    </form>
                    
                    <h3>Призначити локацію для партії</h3>
                    <form onSubmit={handleAssignBatchLocation}>
                      <div className="form-group">
                        <label>Партія:</label>
                        <select
                          value={batchLocationForm.batch}
                          onChange={(e) => setBatchLocationForm({...batchLocationForm, batch: e.target.value})}
                          required
                        >
                          <option value="">Виберіть партію</option>
                          {batches.map(batch => (
                            <option key={batch.id} value={batch.id}>
                              {batch.batch_number} - {products.find(p => p.id === batch.product)?.name || 'Невідомий продукт'}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Локація:</label>
                        <select
                          value={batchLocationForm.location}
                          onChange={(e) => setBatchLocationForm({...batchLocationForm, location: e.target.value})}
                          required
                        >
                          <option value="">Виберіть локацію</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>
                              {loc.code} - {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-actions">
                        <button type="submit">Призначити</button>
                      </div>
                    </form>
                  </div>
                  
                  <div className="locations-list">
                    <h3>Список локацій</h3>
                    {locations.length === 0 ? (
                      <p>Немає локацій для відображення. Створіть першу локацію за допомогою форми зліва.</p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Код</th>
                            <th>Назва</th>
                            <th>Тип</th>
                            <th>Батьківська локація</th>
                            <th>Дії</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locations.map(location => (
                            <tr key={location.id}>
                              <td>{location.code}</td>
                              <td>{location.name}</td>
                              <td>
                                {location.type === 'zone' ? 'Зона' :
                                 location.type === 'rack' ? 'Стелаж' :
                                 location.type === 'shelf' ? 'Полиця' :
                                 location.type === 'bin' ? 'Комірка' : 'Інше'}
                              </td>
                              <td>
                                {location.parent_display || 'Коренева локація'}
                              </td>
                              <td>
                                <button onClick={() => handleEditLocation(location)}>Редагувати</button>
                                <button onClick={() => handleDeleteLocation(location.id)}>Видалити</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    
                    <h3>Партії за локаціями</h3>
                    {batches.length === 0 ? (
                      <p>Немає партій для відображення.</p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Номер партії</th>
                            <th>Продукт</th>
                            <th>Кількість</th>
                            <th>Локація</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batches.map(batch => (
                            <tr key={batch.id}>
                              <td>{batch.batch_number}</td>
                              <td>
                                {Array.isArray(products) 
                                  ? (products.find(p => p.id === batch.product)?.name || batch.product_name || 'Невідомий продукт')
                                  : (batch.product_name || `Продукт ID: ${batch.product}` || 'Невідомий продукт')}
                              </td>
                              <td>{batch.quantity}</td>
                              <td>{batch.location_display || 'Не вказано'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Операції */}
            {activeTab.startsWith('operations') && !loading && (
              <div className="operations-container">
                {/* Отримання */}
                {activeTab === 'operations-receive' && (
                  <div className="operation-form">
                    <h3>Отримання товару</h3>
                    <form onSubmit={handleReceive}>
                      <div className="form-group">
                        <label>Партія:</label>
                        <select
                          value={receiveForm.batch}
                          onChange={(e) => setReceiveForm({...receiveForm, batch: e.target.value})}
                          required
                        >
                          <option value="">Виберіть партію</option>
                          {batches.map(batch => (
                            <option key={batch.id} value={batch.id}>
                              {batch.batch_number} - {products.find(p => p.id === batch.product)?.name || 'Невідомий продукт'}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Кількість:</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={receiveForm.quantity}
                          onChange={(e) => setReceiveForm({...receiveForm, quantity: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Примітка:</label>
                        <textarea
                          value={receiveForm.note}
                          onChange={(e) => setReceiveForm({...receiveForm, note: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button type="submit">Отримати</button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* Відпуск */}
                {activeTab === 'operations-dispense' && (
                  <div className="operation-form">
                    <h3>Відпуск товару</h3>
                    <form onSubmit={handleDispense}>
                      <div className="form-group">
                        <label>Партія:</label>
                        <select
                          value={dispenseForm.batch}
                          onChange={(e) => setDispenseForm({...dispenseForm, batch: e.target.value})}
                          required
                        >
                          <option value="">Виберіть партію</option>
                          {batches.map(batch => (
                            <option key={batch.id} value={batch.id}>
                              {batch.batch_number} - {products.find(p => p.id === batch.product)?.name || 'Невідомий продукт'} 
                              (доступно: {batch.quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                        
                      <div className="form-group">
                        <label>Кількість:</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={dispenseForm.quantity}
                          onChange={(e) => setDispenseForm({...dispenseForm, quantity: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Відділ призначення:</label>
                        <select
                          value={dispenseForm.destination}
                          onChange={(e) => setDispenseForm({...dispenseForm, destination: e.target.value})}
                        >
                          <option value="">Виберіть відділ (необов'язково)</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Примітка:</label>
                        <textarea
                          value={dispenseForm.note}
                          onChange={(e) => setDispenseForm({...dispenseForm, note: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button type="submit">Відпустити</button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* Переміщення */}
                {activeTab === 'operations-transfer' && (
                  <div className="operation-form">
                    <h3>Переміщення товару між складами</h3>
                    <form onSubmit={handleTransfer}>
                      <div className="form-group">
                        <label>Партія:</label>
                        <select
                          value={transferForm.batch}
                          onChange={(e) => setTransferForm({...transferForm, batch: e.target.value})}
                          required
                        >
                          <option value="">Виберіть партію</option>
                          {batches.map(batch => (
                            <option key={batch.id} value={batch.id}>
                              {batch.batch_number} - {products.find(p => p.id === batch.product)?.name || 'Невідомий продукт'} 
                              (доступно: {batch.quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Кількість:</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={transferForm.quantity}
                          onChange={(e) => setTransferForm({...transferForm, quantity: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Склад призначення:</label>
                        <select
                          value={transferForm.warehouse}
                          onChange={(e) => setTransferForm({...transferForm, warehouse: e.target.value})}
                          required
                        >
                          <option value="">Виберіть склад</option>
                          {warehouses
                            .filter(wh => wh.id !== parseInt(selectedWarehouse))
                            .map(wh => (
                              <option key={wh.id} value={wh.id}>{wh.name}</option>
                            ))
                          }
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Примітка:</label>
                        <textarea
                          value={transferForm.note}
                          onChange={(e) => setTransferForm({...transferForm, note: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button type="submit">Перемістити</button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* Інвентаризація */}
                {activeTab === 'operations-inventory' && (
                  <div className="operation-form">
                    <h3>Інвентаризація товару</h3>
                    <form onSubmit={handleInventory}>
                      <div className="form-group">
                        <label>Партія:</label>
                        <select
                          value={inventoryForm.batch}
                          onChange={(e) => setInventoryForm({...inventoryForm, batch: e.target.value})}
                          required
                        >
                          <option value="">Виберіть партію</option>
                          {batches.map(batch => (
                            <option key={batch.id} value={batch.id}>
                              {batch.batch_number} - {products.find(p => p.id === batch.product)?.name || 'Невідомий продукт'} 
                              (в системі: {batch.quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Фактична кількість:</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={inventoryForm.actual_quantity}
                          onChange={(e) => setInventoryForm({...inventoryForm, actual_quantity: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Примітка:</label>
                        <textarea
                          value={inventoryForm.note}
                          onChange={(e) => setInventoryForm({...inventoryForm, note: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button type="submit">Оновити дані</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      
      {user && !selectedWarehouse && !loading && (
        <div className="no-warehouse-message">
          <p>У вас немає доступу до жодного складу. Зверніться до адміністратора для отримання доступу.</p>
          {warehouses.length === 0 ? (
            <p>В системі не додано жодного складу.</p>
          ) : (
            <p>В системі є {warehouses.length} складів, але ви не призначені менеджером жодного з них.</p>
          )}
        </div>
      )}
      
      {!user && !loading && (
        <div className="no-warehouse-message">
          <p>Не вдалося завантажити інформацію про користувача. Спробуйте оновити сторінку.</p>
        </div>
      )}
    </div>
  );
};

export default WarehouseDashboard;