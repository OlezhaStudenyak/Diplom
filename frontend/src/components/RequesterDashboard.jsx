import React, { useState, useEffect } from 'react';
import { 
  fetchProducts, fetchDepartments,
  fetchRequests, createRequest, updateRequest, deleteRequest,
  fetchRequestItems, createRequestItem, updateRequestItem, deleteRequestItem
} from '../api';

const RequesterDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('my-requests');
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Форма для нової заявки
  const [newRequest, setNewRequest] = useState({
    department: '',
    note: '',
    items: [{ product: '', quantity: 1 }]
  });
  
  // Завантаження даних
  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Завантажуємо заявки
      const requestsData = await fetchRequests();
      setRequests(requestsData.data);
      
      // Завантажуємо продукти і відділи для форми
      if (products.length === 0) {
        const productsData = await fetchProducts();
        setProducts(productsData.data);
      }
      
      if (departments.length === 0) {
        const departmentsData = await fetchDepartments();
        setDepartments(departmentsData.data);
      }
    } catch (error) {
      console.error("Помилка завантаження даних:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Обробники для форми нової заявки
  const handleRequestChange = (e) => {
    const { name, value } = e.target;
    setNewRequest({ ...newRequest, [name]: value });
  };
  
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...newRequest.items];
    updatedItems[index] = { ...updatedItems[index], [name]: value };
    setNewRequest({ ...newRequest, items: updatedItems });
  };
  
  const addItem = () => {
    setNewRequest({
      ...newRequest,
      items: [...newRequest.items, { product: '', quantity: 1 }]
    });
  };
  
  const removeItem = (index) => {
    const updatedItems = [...newRequest.items];
    updatedItems.splice(index, 1);
    setNewRequest({ ...newRequest, items: updatedItems });
  };
  
  // Відправка нової заявки
  const submitRequest = async (e) => {
    e.preventDefault();
    if (newRequest.department === '') {
      alert('Оберіть відділ');
      return;
    }
    
    if (newRequest.items.some(item => item.product === '' || item.quantity < 1)) {
      alert('Заповніть всі поля товарів коректно');
      return;
    }
    
    setLoading(true);
    try {
      // Створюємо заявку
      const response = await createRequest({
        department: newRequest.department,
        note: newRequest.note
      });
      
      const requestId = response.data.id;
      
      // Додаємо товари до заявки
      for (const item of newRequest.items) {
        await createRequestItem({
          request: requestId,
          product: item.product,
          quantity: parseInt(item.quantity)
        });
      }
      
      // Скидаємо форму і оновлюємо список
      setNewRequest({
        department: '',
        note: '',
        items: [{ product: '', quantity: 1 }]
      });
      
      alert('Заявку створено');
      loadData();
    } catch (error) {
      console.error("Помилка створення заявки:", error);
      alert('Помилка при створенні заявки');
    } finally {
      setLoading(false);
    }
  };
  
  // Скасування заявки
  const cancelRequest = async (requestId) => {
    if (!window.confirm("Ви впевнені, що хочете скасувати цю заявку?")) {
      return;
    }
    
    setLoading(true);
    try {
      await deleteRequest(requestId);
      alert('Заявку скасовано');
      loadData();
    } catch (error) {
      console.error("Помилка скасування заявки:", error);
      alert('Помилка при скасуванні заявки');
    } finally {
      setLoading(false);
    }
  };
  
  // Отримання статусу заявки у зрозумілому форматі
  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'В очікуванні',
      'approved': 'Затверджено',
      'rejected': 'Відхилено',
      'fulfilled': 'Виконано'
    };
    return statusMap[status] || status;
  };
  
  // Отримання класу стилів на основі статусу
  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'fulfilled': 'status-fulfilled'
    };
    return classMap[status] || '';
  };
  
  return (
    <div className="requester-dashboard">
      <h1>Панель запитів на товари</h1>
      
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'my-requests' ? 'active' : ''} 
          onClick={() => setActiveTab('my-requests')}
        >
          Мої заявки
        </button>
        <button 
          className={activeTab === 'new-request' ? 'active' : ''} 
          onClick={() => setActiveTab('new-request')}
        >
          Нова заявка
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Завантаження...</div>
      ) : (
        <div className="dashboard-content">
          {activeTab === 'my-requests' && (
            <div className="my-requests">
              <h2>Мої заявки</h2>
              
              {requests.length === 0 ? (
                <p>У вас ще немає заявок</p>
              ) : (
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Відділ</th>
                      <th>Дата створення</th>
                      <th>Статус</th>
                      <th>Примітка</th>
                      <th>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(request => (
                      <tr key={request.id}>
                        <td>{request.id}</td>
                        <td>{request.department?.name || 'Не вказано'}</td>
                        <td>{new Date(request.created_at).toLocaleDateString()}</td>
                        <td className={getStatusClass(request.status)}>
                          {getStatusText(request.status)}
                        </td>
                        <td>{request.note}</td>
                        <td>
                          {request.status === 'pending' && (
                            <button 
                              className="btn-cancel" 
                              onClick={() => cancelRequest(request.id)}
                            >
                              Скасувати
                            </button>
                          )}
                          <button 
                            className="btn-view" 
                            onClick={() => alert('Деталі заявки')} // Тут можна додати перегляд деталей
                          >
                            Деталі
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          
          {activeTab === 'new-request' && (
            <div className="new-request">
              <h2>Створення нової заявки</h2>
              
              <form onSubmit={submitRequest}>
                <div className="form-group">
                  <label>Відділ:</label>
                  <select 
                    name="department" 
                    value={newRequest.department} 
                    onChange={handleRequestChange}
                    required
                  >
                    <option value="">Оберіть відділ</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Примітка:</label>
                  <textarea 
                    name="note" 
                    value={newRequest.note} 
                    onChange={handleRequestChange}
                    placeholder="Додаткова інформація до заявки"
                  />
                </div>
                
                <h3>Товари</h3>
                
                {newRequest.items.map((item, index) => (
                  <div key={index} className="request-item">
                    <div className="form-group">
                      <label>Товар:</label>
                      <select 
                        name="product" 
                        value={item.product} 
                        onChange={(e) => handleItemChange(index, e)}
                        required
                      >
                        <option value="">Оберіть товар</option>
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
                        name="quantity" 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, e)}
                        min="1"
                        required
                      />
                    </div>
                    
                    {newRequest.items.length > 1 && (
                      <button 
                        type="button" 
                        className="btn-remove-item"
                        onClick={() => removeItem(index)}
                      >
                        Видалити
                      </button>
                    )}
                  </div>
                ))}
                
                <button 
                  type="button" 
                  className="btn-add-item"
                  onClick={addItem}
                >
                  + Додати товар
                </button>
                
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn-submit"
                    disabled={loading}
                  >
                    Створити заявку
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .requester-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .dashboard-tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        
        .dashboard-tabs button {
          padding: 10px 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
        }
        
        .dashboard-tabs button.active {
          border-bottom: 3px solid #4caf50;
          color: #4caf50;
        }
        
        .loading {
          text-align: center;
          padding: 20px;
          font-style: italic;
        }
        
        .requests-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .requests-table th, .requests-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .requests-table th {
          background-color: #f5f5f5;
        }
        
        .status-pending { color: #ff9800; }
        .status-approved { color: #2196f3; }
        .status-rejected { color: #f44336; }
        .status-fulfilled { color: #4caf50; }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .form-group select, .form-group input, .form-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .request-item {
          display: flex;
          gap: 15px;
          align-items: flex-end;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .btn-add-item, .btn-submit, .btn-cancel, .btn-view {
          padding: 8px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .btn-add-item {
          background-color: #e0e0e0;
          color: #333;
          margin-bottom: 20px;
        }
        
        .btn-submit {
          background-color: #4caf50;
          color: white;
        }
        
        .btn-cancel {
          background-color: #f44336;
          color: white;
          margin-right: 5px;
        }
        
        .btn-view {
          background-color: #2196f3;
          color: white;
        }
        
        .btn-remove-item {
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 5px 10px;
          cursor: pointer;
        }
        
        .form-actions {
          margin-top: 20px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default RequesterDashboard;
