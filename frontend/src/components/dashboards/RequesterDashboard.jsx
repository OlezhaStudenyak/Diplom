import React, { useState, useEffect } from 'react';
import { 
  fetchProducts, fetchDepartments,
  getRequests, createRequest, updateRequest, deleteRequest,
  getRequestItems, createRequestItem, updateRequestItem, deleteRequestItem
} from '../../api';

const RequesterDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('my-requests');
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState(null);
  
  useEffect(() => {
    // Перевіряємо наявність користувача та токену
    if (!user) {
      console.error('Компонент RequesterDashboard: користувач не визначений');
      setError('Помилка автентифікації. Будь ласка, увійдіть знову.');
      return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Компонент RequesterDashboard: токен відсутній');
      setError('Помилка автентифікації. Будь ласка, увійдіть знову.');
      return;
    }
    
    // Завантажуємо дані
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Завантаження заявок та продуктів для потребувача...');
        
        // Завантажуємо заявки та продукти паралельно
        const [requestsResponse, productsResponse] = await Promise.all([
          getRequests({ requester: user.id }),
          fetchProducts()
        ]);
        
        setRequests(requestsResponse.data);
        setProducts(productsResponse.data);
        
        console.log(`Завантажено ${requestsResponse.data.length} заявок та ${productsResponse.data.length} продуктів`);
      } catch (err) {
        console.error('Помилка завантаження даних для потребувача:', err);
        
        if (err.response && err.response.status === 401) {
          setError('Помилка автентифікації. Перезавантажте сторінку та увійдіть знову.');
        } else {
          setError('Сталася помилка під час завантаження даних. Спробуйте оновити сторінку.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [user]);
  const [department, setDepartment] = useState(null);
  
  // Форма для створення і редагування заявки
  const [requestForm, setRequestForm] = useState({ 
    department: '', 
    note: '',
    items: [{ product: '', quantity: 1 }] 
  });
  
  // Режим редагування
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Завантажуємо заявки користувача
      const requestsData = await getRequests();
      setRequests(requestsData.data);
      
      // Завантажуємо продукти для форми
      const productsData = await fetchProducts();
      setProducts(productsData.data);
      
      // Завантажуємо підрозділи і знаходимо підрозділ користувача
      const departmentsData = await fetchDepartments();
      if (user.department) {
        const userDept = departmentsData.data.find(dept => dept.id === user.department);
        setDepartment(userDept);
        // Встановлюємо підрозділ користувача як типове значення у формі
        setRequestForm(prev => ({ ...prev, department: user.department }));
      }
    } catch (error) {
      console.error("Помилка завантаження даних:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    try {
      if (editMode) {
        // Редагуємо існуючу заявку
        await updateRequest(editId, {
          department: requestForm.department,
          note: requestForm.note
        });
        
        // Тепер оновлюємо позиції заявки
        // Спершу завантажуємо поточні позиції
        const requestItemsData = await getRequestItems(editId);
        const currentItems = requestItemsData.data;
        
        // Для кожної позиції з форми
        for (const item of requestForm.items) {
          // Шукаємо, чи є вже така позиція
          const existingItem = currentItems.find(i => i.product === item.product);
          
          if (existingItem) {
            // Якщо є - оновлюємо
            if (existingItem.quantity !== item.quantity) {
              await updateRequestItem(existingItem.id, {
                quantity: item.quantity
              });
            }
          } else {
            // Якщо немає - створюємо нову
            await createRequestItem({
              request: editId,
              product: item.product,
              quantity: item.quantity
            });
          }
        }
        
        // Перевіряємо, чи треба видалити якісь позиції
        for (const currentItem of currentItems) {
          const stillExists = requestForm.items.some(i => i.product === currentItem.product);
          if (!stillExists) {
            await deleteRequestItem(currentItem.id);
          }
        }
        
      } else {
        // Створюємо нову заявку
        const response = await createRequest({
          department: requestForm.department,
          note: requestForm.note
        });
        
        // Тепер створюємо позиції заявки
        for (const item of requestForm.items) {
          await createRequestItem({
            request: response.data.id,
            product: item.product,
            quantity: item.quantity
          });
        }
      }
      
      // Скидаємо форму і оновлюємо дані
      setRequestForm({ 
        department: user.department || '', 
        note: '',
        items: [{ product: '', quantity: 1 }] 
      });
      setEditMode(false);
      setEditId(null);
      
      // Оновлюємо список заявок
      const requestsData = await getRequests();
      setRequests(requestsData.data);
      
      // Переключаємося на вкладку зі списком заявок
      setActiveTab('my-requests');
      
    } catch (error) {
      console.error("Помилка збереження заявки:", error);
      alert("Помилка збереження заявки: " + error.response?.data?.detail || error.message);
    }
  };
  
  const handleAddItem = () => {
    setRequestForm({
      ...requestForm,
      items: [...requestForm.items, { product: '', quantity: 1 }]
    });
  };
  
  const handleRemoveItem = (index) => {
    if (requestForm.items.length === 1) {
      alert("Заявка повинна містити хоча б одну позицію");
      return;
    }
    
    const newItems = [...requestForm.items];
    newItems.splice(index, 1);
    setRequestForm({
      ...requestForm,
      items: newItems
    });
  };
  
  const handleItemChange = (index, field, value) => {
    const newItems = [...requestForm.items];
    newItems[index][field] = value;
    setRequestForm({
      ...requestForm,
      items: newItems
    });
  };
  
  const handleEdit = async (request) => {
    try {
      // Завантажуємо детальну інформацію про заявку
      const requestItemsData = await getRequestItems(request.id);
      const requestItems = requestItemsData.data;
      
      // Заповнюємо форму даними заявки
      setRequestForm({
        department: request.department,
        note: request.note,
        items: requestItems.map(item => ({
          product: item.product,
          quantity: item.quantity
        }))
      });
      
      setEditMode(true);
      setEditId(request.id);
      
      // Переключаємося на вкладку створення/редагування
      setActiveTab('create-request');
      
    } catch (error) {
      console.error("Помилка завантаження даних заявки:", error);
      alert("Помилка завантаження даних заявки: " + error.response?.data?.detail || error.message);
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm("Ви впевнені, що хочете видалити цю заявку?")) {
      try {
        await deleteRequest(id);
        
        // Оновлюємо список заявок
        const requestsData = await getRequests();
        setRequests(requestsData.data);
        
      } catch (error) {
        console.error("Помилка видалення заявки:", error);
        alert("Помилка видалення заявки: " + error.response?.data?.detail || error.message);
      }
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">В очікуванні</span>;
      case 'approved':
        return <span className="badge badge-success">Затверджено</span>;
      case 'rejected':
        return <span className="badge badge-danger">Відхилено</span>;
      case 'fulfilled':
        return <span className="badge badge-primary">Виконано</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };
  
  return (
    <div className="requester-dashboard">
      <h1>Панель потребувача</h1>
      
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
      
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'my-requests' ? 'active' : ''} 
          onClick={() => setActiveTab('my-requests')}
        >
          Мої заявки
        </button>
        <button 
          className={activeTab === 'create-request' ? 'active' : ''} 
          onClick={() => {
            setActiveTab('create-request');
            if (editMode) {
              setEditMode(false);
              setEditId(null);
              setRequestForm({ 
                department: user.department || '', 
                note: '',
                items: [{ product: '', quantity: 1 }] 
              });
            }
          }}
        >
          {editMode ? 'Редагувати заявку' : 'Створити заявку'}
        </button>
      </div>
      
      <div className="dashboard-content">
        {loading && <div className="loading">Завантаження...</div>}
        
        {/* Список заявок */}
        {activeTab === 'my-requests' && !loading && (
          <div>
            <h2>Мої заявки</h2>
            {requests.length === 0 ? (
              <p>У вас ще немає заявок. <button onClick={() => setActiveTab('create-request')}>Створити заявку</button></p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Створено</th>
                    <th>Статус</th>
                    <th>Примітка</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(request => (
                    <tr key={request.id}>
                      <td>{request.id}</td>
                      <td>{new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString()}</td>
                      <td>{getStatusBadge(request.status)}</td>
                      <td>{request.note}</td>
                      <td>
                        <button 
                          onClick={() => handleEdit(request)}
                          disabled={request.status !== 'pending'}
                        >
                          Редагувати
                        </button>
                        <button 
                          onClick={() => handleDelete(request.id)}
                          disabled={request.status !== 'pending'}
                        >
                          Видалити
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {/* Форма створення/редагування заявки */}
        {activeTab === 'create-request' && !loading && (
          <div>
            <h2>{editMode ? 'Редагувати заявку' : 'Створити нову заявку'}</h2>
            <form onSubmit={handleSubmitRequest} className="request-form">
              <div className="form-group">
                <label>Підрозділ:</label>
                <input
                  type="text"
                  value={department ? department.name : 'Не призначено'}
                  disabled
                />
                <input
                  type="hidden"
                  value={requestForm.department}
                />
                {!department && (
                  <p className="form-helper">
                    Вас не призначено до жодного підрозділу. Зверніться до адміністратора.
                  </p>
                )}
              </div>
              
              <div className="form-group">
                <label>Примітка:</label>
                <textarea
                  value={requestForm.note}
                  onChange={(e) => setRequestForm({...requestForm, note: e.target.value})}
                  placeholder="Опис або додаткова інформація"
                />
              </div>
              
              <h3>Позиції заявки</h3>
              {requestForm.items.map((item, index) => (
                <div key={index} className="request-item">
                  <div className="form-group">
                    <label>Продукт:</label>
                    <select
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      required
                    >
                      <option value="">Виберіть продукт</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Кількість:</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>
                  
                  <button 
                    type="button" 
                    className="remove-item" 
                    onClick={() => handleRemoveItem(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <div className="form-actions">
                <button type="button" onClick={handleAddItem}>
                  + Додати позицію
                </button>
              </div>
              
              <div className="form-actions">
                <button type="submit" disabled={!department}>
                  {editMode ? 'Оновити заявку' : 'Створити заявку'}
                </button>
                {editMode && (
                  <button type="button" onClick={() => {
                    setEditMode(false);
                    setEditId(null);
                    setRequestForm({ 
                      department: user.department || '', 
                      note: '',
                      items: [{ product: '', quantity: 1 }] 
                    });
                  }}>
                    Скасувати
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequesterDashboard;
