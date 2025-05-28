import React, { useState, useEffect } from 'react';
import { 
  getRoutes, createRoute, updateRoute, deleteRoute,
  fetchWarehouses, fetchDepartments, fetchBatches,
  getRequests, approveRequest, rejectRequest, 
  createRoutePoint, getRoutePoints
} from '../../api';



const LogisticianDashboard = (props) => {
  const { user, setUser } = props;
  const [activeTab, setActiveTab] = useState('routes');
  const [routes, setRoutes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Форма для створення і редагування маршруту
  const [routeForm, setRouteForm] = useState({ 
    name: '', 
    date: '',
    warehouse: '',
    status: 'planned',
    points: []
  });
  
  // Режим редагування
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  
  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  // Завантажуємо дані при першому рендерингу
  useEffect(() => {
    const initialLoad = async () => {
      try {
        // Встановлюємо початкову дату
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        setRouteForm(prevForm => ({
          ...prevForm,
          date: formattedDate
        }));
        
        // Завантажуємо дані
        await loadData();
      } catch (error) {
        console.error("Помилка при початковому завантаженні:", error);
      }
    };
    
    initialLoad();
  }, [loadData]);
  
  // Додаємо для відлагодження
  useEffect(() => {
    console.log("Поточний стан routes:", routes);
    if (Array.isArray(routes) && routes.length > 0) {
      console.log("Перший маршрут:", routes[0]);
    }
  }, [routes]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Завантажуємо основні дані
      const warehousesData = await fetchWarehouses();
      console.log("Отримані дані складів:", warehousesData);
      if (warehousesData && warehousesData.data) {
        setWarehouses(Array.isArray(warehousesData.data) ? warehousesData.data : []);
      }
      
      const departmentsData = await fetchDepartments();
      console.log("Отримані дані підрозділів:", departmentsData);
      if (departmentsData && departmentsData.data) {
        setDepartments(Array.isArray(departmentsData.data) ? departmentsData.data : []);
      }
      
      // Завантажуємо специфічні дані в залежності від вкладки
      if (activeTab === 'routes') {
        const routesData = await getRoutes();
        console.log("Отримані дані маршрутів:", routesData);
        if (routesData && routesData.data) {
          setRoutes(Array.isArray(routesData.data) ? routesData.data : []);
        } else {
          console.error("Отримані неправильні дані маршрутів:", routesData);
          setRoutes([]);
        }
      } else if (activeTab === 'requests') {
        // Завантажуємо заявки, які очікують перевірки
        const requestsData = await getRequests();
        console.log("Отримані дані заявок:", requestsData);
        if (requestsData && requestsData.data) {
          setRequests(Array.isArray(requestsData.data) 
            ? requestsData.data.filter(req => req.status === 'pending') 
            : []);
        }
      }
    } catch (error) {
      console.error("Помилка завантаження даних:", error);
      alert("Помилка завантаження даних: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitRoute = async (e) => {
    e.preventDefault();
    
    // Валідація форми
    if (!routeForm.name.trim()) {
      alert("Будь ласка, введіть назву маршруту");
      return;
    }
    
    if (!routeForm.date) {
      alert("Будь ласка, виберіть дату маршруту");
      return;
    }
    
    if (!routeForm.warehouse) {
      alert("Будь ласка, виберіть склад відправлення");
      return;
    }
    
    if (!Array.isArray(routeForm.points) || routeForm.points.length === 0) {
      alert("Додайте хоча б одну точку маршруту");
      return;
    }
    
    // Перевірка всіх точок маршруту
    for (const [index, point] of routeForm.points.entries()) {
      if (!point.department) {
        alert(`Виберіть підрозділ для точки #${index + 1}`);
        return;
      }
      if (!point.address) {
        const department = departments.find(dept => dept.id === Number(point.department));
        if (department && department.address) {
          // Автоматично заповнюємо адресу з підрозділу
          routeForm.points[index].address = department.address;
        } else {
          alert(`Введіть адресу для точки #${index + 1}`);
          return;
        }
      }
    }
    
    try {
      let routeId;
      
      if (editMode) {
        // Редагуємо існуючий маршрут
        const updateResponse = await updateRoute(editId, {
          name: routeForm.name,
          date: routeForm.date,
          warehouse: routeForm.warehouse,
          status: routeForm.status
        });
        console.log("Маршрут оновлено:", updateResponse);
        routeId = editId;
      } else {
        // Створюємо новий маршрут
        const createResponse = await createRoute({
          name: routeForm.name,
          date: routeForm.date,
          warehouse: routeForm.warehouse,
          status: routeForm.status || 'planned'
        });
        console.log("Маршрут створено:", createResponse);
        routeId = createResponse.data.id;
      }
      
      // Якщо маємо routeId і точки маршруту, створюємо/оновлюємо їх
      if (routeId && Array.isArray(routeForm.points) && routeForm.points.length > 0) {
        console.log("Створюємо точки для маршруту ID:", routeId);
        
        // Очищаємо старі точки перед створенням нових (якщо редагуємо)
        console.log(`Створюємо точки маршруту для ID ${routeId}, кількість точок: ${routeForm.points.length}`);
        
        // Створюємо нові точки маршруту з паузою між запитами
        for (const [index, point] of routeForm.points.entries()) {
          try {
            console.log(`Створення точки #${index + 1}:`, point);
            
            // Додаємо додаткову перевірку для впевненості, що всі обов'язкові поля присутні
            if (!point.address) {
              const department = departments.find(dept => dept.id === Number(point.department));
              point.address = department?.address || 'Адреса не вказана';
            }
            
            const pointData = {
              route: routeId,
              order: point.order || index + 1,
              address: point.address || 'Адреса не вказана',
              note: point.note || ''
            };
            
            // Додаємо department лише якщо він вказаний
            if (point.department) {
              pointData.department = point.department;
            }
            
            const response = await createRoutePoint(pointData);
            console.log(`Точка #${index + 1} успішно створена:`, response);
            
            // Додаємо невелику паузу між запитами для уникнення перевантаження сервера
            if (routeForm.points.length > 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (pointError) {
            console.error(`Помилка створення точки маршруту #${index + 1}:`, pointError);
            if (pointError.response) {
              console.error('Деталі відповіді сервера:', pointError.response.data);
            }
            // Продовжуємо додавати інші точки, навіть якщо одна не додалася
          }
        }
      }
      
      // Скидаємо форму і оновлюємо дані
      setRouteForm({ 
        name: '', 
        date: '',
        warehouse: '',
        status: 'planned',
        points: []
      });
      setEditMode(false);
      setEditId(null);
      
      // Оновлюємо список маршрутів
      const routesData = await getRoutes();
      console.log("Отримано оновлені маршрути:", routesData);
      if (routesData && routesData.data) {
        setRoutes(Array.isArray(routesData.data) ? routesData.data : []);
      }
      
      // Встановлюємо поточну дату як початкову
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // формат YYYY-MM-DD
      
      // Оновлюємо форму з початковою датою
      setRouteForm(prevForm => ({
        ...prevForm,
        date: formattedDate
      }));
      
      alert("Маршрут успішно збережено!");
      
    } catch (error) {
      console.error("Помилка збереження маршруту:", error);
      alert("Помилка збереження маршруту: " + (error.response?.data?.detail || error.message));
    }
  };
  
  const handleAddPoint = () => {
    setRouteForm({
      ...routeForm,
      points: [
        ...routeForm.points, 
        { 
          department: '', 
          order: routeForm.points.length + 1,
          address: '',
          note: ''
        }
      ]
    });
  };
  
  const handleRemovePoint = (index) => {
    const newPoints = [...routeForm.points];
    newPoints.splice(index, 1);
    
    // Оновлюємо порядкові номери
    const updatedPoints = newPoints.map((point, idx) => ({
      ...point,
      order: idx + 1
    }));
    
    setRouteForm({
      ...routeForm,
      points: updatedPoints
    });
  };
  
  const handlePointChange = (index, field, value) => {
    const newPoints = [...routeForm.points];
    newPoints[index][field] = value;
    
    // Якщо змінилося поле department, спробуємо автоматично заповнити адресу
    if (field === 'department' && value) {
      const department = departments.find(dept => dept.id === Number(value));
      if (department && department.address) {
        newPoints[index].address = department.address;
      }
    }
    
    setRouteForm({
      ...routeForm,
      points: newPoints
    });
  };
  

  
  const handleEdit = async (route) => {
    console.log("Редагування маршруту:", route);
    
    try {
      // Завантажуємо точки маршруту
      const pointsResponse = await getRoutePoints(route.id);
      
      // Точки маршруту
      const routePoints = pointsResponse?.data || [];
      console.log("Отримані точки маршруту:", routePoints);
      
      // Заповнюємо форму даними маршруту
      setRouteForm({
        name: route.name || '',
        date: route.date || '',
        warehouse: route.warehouse || '',
        status: route.status || 'planned',
        points: routePoints.map(point => ({
          department: point.department,
          order: point.order
        }))
      });
      
      setEditMode(true);
      setEditId(route.id);
    } catch (error) {
      console.error("Помилка при завантаженні даних маршруту:", error);
      alert("Помилка при завантаженні даних маршруту: " + error.message);
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm("Ви впевнені, що хочете видалити цей маршрут?")) {
      try {
        await deleteRoute(id);
        
        // Оновлюємо список маршрутів
        const routesData = await getRoutes();
        setRoutes(routesData.data);
        
      } catch (error) {
        console.error("Помилка видалення маршруту:", error);
        alert("Помилка видалення маршруту: " + error.response?.data?.detail || error.message);
      }
    }
  };
  
  const handleApproveRequest = async (id) => {
    try {
      await approveRequest(id);
      
      // Оновлюємо список заявок
      const requestsData = await getRequests();
      setRequests(requestsData.data.filter(req => req.status === 'pending'));
      
    } catch (error) {
      console.error("Помилка затвердження заявки:", error);
      alert("Помилка затвердження заявки: " + error.response?.data?.detail || error.message);
    }
  };
  
  const handleRejectRequest = async (id) => {
    const note = prompt("Вкажіть причину відхилення заявки:");
    if (note === null) return; // Користувач скасував
    
    try {
      await rejectRequest(id, note);
      
      // Оновлюємо список заявок
      const requestsData = await getRequests();
      setRequests(requestsData.data.filter(req => req.status === 'pending'));
      
    } catch (error) {
      console.error("Помилка відхилення заявки:", error);
      alert("Помилка відхилення заявки: " + error.response?.data?.detail || error.message);
    }
  };
  
  // Інлайн стилі для компонентів точок маршруту
  const routeDetailsStyles = `
    .route-details {
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 4px;
      margin-top: 5px;
    }
    
    .points-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .points-table th,
    .points-table td {
      padding: 8px;
      border: 1px solid #ddd;
      text-align: left;
    }
    
    .points-table thead {
      background-color: #f2f2f2;
    }
    
    .view-points-button {
      margin-left: 5px;
      background-color: #4a6da7;
      color: white;
    }
    
    .route-points-container {
      margin-top: 10px;
    }
  `;
  
  const handleLogout = () => {
    // Очищаємо токени
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    
    // Очищаємо дані користувача
    props.setUser(null);
  };
  
  return (
    <div className="logistician-dashboard">
      <style>{routeDetailsStyles}</style>
      <h1>Панель логіста</h1>

      
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
          className={activeTab === 'routes' ? 'active' : ''} 
          onClick={() => setActiveTab('routes')}
        >
          Маршрути
        </button>
        <button 
          className={activeTab === 'requests' ? 'active' : ''} 
          onClick={() => setActiveTab('requests')}
        >
          Заявки на погодження
        </button>
      </div>
      
      <button 
        onClick={handleLogout} 
        className="login-return-button"
      >
        Повернутися до сторінки логіну
      </button>
      
      <div className="dashboard-content">
        {loading && <div className="loading">Завантаження...</div>}
        
        {/* Управління маршрутами */}
        {activeTab === 'routes' && !loading && (
          <div>
            <h2>{editMode ? 'Редагувати маршрут' : 'Створити новий маршрут'}</h2>
            <form onSubmit={handleSubmitRoute} className="route-form">
              <div className="form-group">
                <label>Назва маршруту:</label>
                <input
                  type="text"
                  value={routeForm.name}
                  onChange={(e) => setRouteForm({...routeForm, name: e.target.value})}
                  required
                  placeholder="Наприклад: Доставка ліків у район А"
                />
              </div>
                <label>Дата маршруту:</label>
                <input
                  type="date"
                  value={routeForm.date || ''}
                  onChange={(e) => setRouteForm({...routeForm, date: e.target.value})}
                  required
                />
              
              <div className="form-group">
                <label>Склад відправлення:</label>
                <select
                  value={routeForm.warehouse}
                  onChange={(e) => setRouteForm({...routeForm, warehouse: e.target.value})}
                  required
                >
                  <option value="">Виберіть склад</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              
              <h3>Точки маршруту</h3>
              {routeForm.points.length === 0 && (
                <p>Додайте точки маршруту нижче</p>
              )}
              
              {routeForm.points.map((point, index) => (
                <div key={index} className="route-point">
                  <div className="point-order">{point.order}</div>
                  
                  <div className="form-group">
                    <label>Підрозділ:</label>
                    <select
                      value={point.department}
                      onChange={(e) => handlePointChange(index, 'department', e.target.value)}
                      required
                    >
                      <option value="">Виберіть підрозділ</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Адреса:</label>
                    <input
                      type="text"
                      value={point.address || ''}
                      onChange={(e) => handlePointChange(index, 'address', e.target.value)}
                      placeholder="Введіть адресу точки маршруту"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Примітка:</label>
                    <input
                      type="text"
                      value={point.note || ''}
                      onChange={(e) => handlePointChange(index, 'note', e.target.value)}
                      placeholder="Додаткова інформація"
                    />
                  </div>
                  
                  <button 
                    type="button" 
                    className="remove-point" 
                    onClick={() => handleRemovePoint(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <div className="form-actions">
                <button type="button" onClick={handleAddPoint}>
                  + Додати точку
                </button>
              </div>
              
              <div className="form-actions">
                <button type="submit" disabled={routeForm.points.length === 0}>
                  {editMode ? 'Оновити маршрут' : 'Створити маршрут'}
                </button>
                {editMode && (
                  <button type="button" onClick={() => {
                    setEditMode(false);
                    setEditId(null);
                    setRouteForm({ 
                      name: '', 
                      date: '',
                      warehouse: '',
                      status: 'planned',
                      points: []
                    });
                  }}>
                    Скасувати
                  </button>
                )}
              </div>
            </form>
            
            <h2>Список маршрутів</h2>
            <div style={{margin: '10px 0', padding: '5px', background: '#f5f5f5', border: '1px solid #ddd'}}>
              <small>Стан масиву маршрутів: {Array.isArray(routes) ? `Масив (довжина: ${routes.length})` : typeof routes}</small>
              {Array.isArray(routes) && routes.length > 0 && (
                <details>
                  <summary><small>Показати деталі першого маршруту</small></summary>
                  <pre style={{fontSize: '10px'}}>{JSON.stringify(routes[0], null, 2)}</pre>
                </details>
              )}
              <div>
                <small>Стан запиту: {loading ? 'Завантаження...' : 'Завершено'}</small>
                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const routesData = await getRoutes();
                      console.log("Примусове оновлення маршрутів:", routesData);
                      
                      // Перевірка наявності результатів пагінації
                      if (routesData?.data?.results && Array.isArray(routesData.data.results)) {
                        console.log("Встановлюємо results з пагінації:", routesData.data.results);
                        setRoutes(routesData.data.results);
                      } else if (routesData && routesData.data) {
                        console.log("Встановлюємо звичайні дані:", routesData.data);
                        setRoutes(Array.isArray(routesData.data) ? routesData.data : []);
                      } else {
                        console.warn("Немає даних для оновлення маршрутів");
                        setRoutes([]);
                      }
                    } catch (error) {
                      console.error("Помилка оновлення:", error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{marginLeft: '10px', fontSize: '12px'}}
                >
                  Оновити
                </button>
              </div>
              
              <div style={{marginTop: '10px', padding: '5px', background: '#fff', border: '1px dashed #aaa'}}>
                <details>
                  <summary><small>Відлагоджувальна інформація</small></summary>
                  <p><small>Типи даних: {typeof routes}</small></p>
                  <p><small>Стан у консолі: відкрийте консоль розробника (F12) та шукайте логи з 'Отримані маршрути'</small></p>
                </details>
              </div>
            </div>
            
            {!Array.isArray(routes) || routes.length === 0 ? (
              <div>
                <p>Немає створених маршрутів</p>
                <p style={{color: '#666', fontSize: '0.9em'}}>
                  Якщо ви бачите маршрути в консолі, але не тут, спробуйте натиснути кнопку "Оновити" вище
                </p>
              </div>
            ) : (
              <>
                <p>Знайдено маршрутів: {routes.length}</p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Назва</th>
                      <th>Дата</th>
                      <th>Склад</th>
                      <th>Статус</th>
                      <th>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map(route => (
                      <React.Fragment key={route.id}>
                        <tr>
                          <td>{route.id}</td>
                          <td>{route.name || 'Без назви'}</td>
                          <td>{route.date || 'Не вказано'}</td>
                          <td>
                            {warehouses.find(wh => wh.id === Number(route.warehouse))?.name || 
                            route.warehouse_name || 
                            `Склад ID: ${route.warehouse}`}
                          </td>
                          <td>{route.status_display || route.status || 'Заплановано'}</td>
                          <td>
                            <button 
                              className="edit-button" 
                              onClick={() => {
                                try {
                                  handleEdit(route);
                                } catch (error) {
                                  console.error("Помилка при спробі редагування:", error);
                                  alert(`Помилка при спробі редагування маршруту. Деталі в консолі.`);
                                }
                              }}
                            >
                              Редагувати
                            </button>
                            <button className="delete-button" onClick={() => handleDelete(route.id)}>Видалити</button>
                            <button 
                              className="view-points-button" 
                              onClick={async () => {
                                try {
                                  const routeDetailsElem = document.getElementById(`route-details-${route.id}`);
                                  if (routeDetailsElem) {
                                    // Якщо деталі вже завантажені, просто перемикаємо видимість
                                    routeDetailsElem.style.display = routeDetailsElem.style.display === 'none' ? 'table-row' : 'none';
                                  } else {
                                    alert("Елемент деталей маршруту не знайдено. Перезавантажте сторінку.");
                                  }
                                } catch (error) {
                                  console.error("Помилка при відображенні точок маршруту:", error);
                                }
                              }}
                            >
                              Деталі
                            </button>
                          </td>
                        </tr>
                        <tr id={`route-details-${route.id}`} style={{display: 'none', backgroundColor: '#f9f9f9'}}>
                          <td colSpan="6">
                            <div className="route-details">
                              <h4>Точки маршруту</h4>
                              <button 
                                onClick={async () => {
                                  try {
                                    const pointsData = await getRoutePoints(route.id);
                                    const points = pointsData.data || [];
                                    
                                    const pointsContainer = document.getElementById(`route-points-${route.id}`);
                                    if (pointsContainer) {
                                      if (points.length === 0) {
                                        pointsContainer.innerHTML = '<p>Немає точок для цього маршруту</p>';
                                      } else {
                                        let html = '<table class="points-table"><thead><tr><th>№</th><th>Адреса</th><th>Замітка</th></tr></thead><tbody>';
                                        
                                        points.forEach(point => {
                                          html += `<tr>
                                            <td>${point.order}</td>
                                            <td>${point.address || 'Не вказано'}</td>
                                            <td>${point.note || '-'}</td>
                                          </tr>`;
                                        });
                                        
                                        html += '</tbody></table>';
                                        pointsContainer.innerHTML = html;
                                      }
                                    }
                                  } catch (error) {
                                    console.error("Помилка завантаження точок маршруту:", error);
                                  }
                                }}
                              >
                                Завантажити точки
                              </button>
                              <div id={`route-points-${route.id}`} className="route-points-container">
                                <p>Натисніть "Завантажити точки" для відображення деталей</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
        
        {/* Заявки на погодження */}
        {activeTab === 'requests' && !loading && (
          <div>
            <h2>Заявки на погодження</h2>
            {requests.length === 0 ? (
              <p>Немає заявок, які очікують погодження</p>
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
                      <td>{new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString()}</td>
                      <td>{departments.find(d => d.id === request.department)?.name || 'Невідомий підрозділ'}</td>
                      <td>{request.note}</td>
                      <td>
                        <button 
                          className="approve-button"
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          Затвердити
                        </button>
                        <button 
                          className="reject-button"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          Відхилити
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticianDashboard;
