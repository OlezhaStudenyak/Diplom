import React, { useState, useEffect } from 'react';
import { 
  fetchUsers, createUser, updateUser, deleteUser, resetUserPassword,
  fetchDepartments, createDepartment, updateDepartment, deleteDepartment,
  fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getWarehouses, // Додаємо прямий доступ до API для діагностики
  testApiConnection // Додаємо функцію тестування API
} from '../../api';
import axios from 'axios';
import { getVehicles, updateVehicle } from '../../api';
import { Form, Button, Table } from 'react-bootstrap';

const AdminDashboard = ({ user, onSelect, setUser }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [activeForm, setActiveForm] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', variant: 'info' });
  
  // Форми для створення і редагування
  const [userForm, setUserForm] = useState({
    username: '', password: '', first_name: '', last_name: '', email: '', role: 'manager'
  });
  
  const [driverForm, setDriverForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    vehicle: ''
  });
  
  const [departmentForm, setDepartmentForm] = useState({ 
    name: '', 
    code: '', 
    contact_person: '',
    phone: '',
    address: '',
    email: ''
  });
  
  // Функція для створення підрозділу
  const handleCreateDepartment = async () => {
    try {
      setLoading(true);
      
      // Перевірка обов'язкових полів
      if (!departmentForm.name) {
        alert('Назва підрозділу є обов\'язковою');
        setLoading(false);
        return;
      }
      
      console.log('Створення підрозділу:', departmentForm);
      await createDepartment(departmentForm);
      
      // Очищаємо форму
      setDepartmentForm({
        name: '',
        code: '',
        contact_person: '',
        phone: '',
        address: '',
        email: ''
      });
      
      // Оновлюємо список підрозділів
      const depsData = await fetchDepartments();
      setDepartments(Array.isArray(depsData.data) ? depsData.data : []);
      
      alert('Підрозділ успішно створено');
    } catch (error) {
      console.error('Помилка при створенні підрозділу:', error);
      alert(`Помилка при створенні підрозділу: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  const [warehouseForm, setWarehouseForm] = useState({ name: '', address: '', manager: '' });
  
  // Режим редагування
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // Отримуємо auth token
  const authToken = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
  
  useEffect(() => {
    // Діагностичний вивід для визначення доступних URL API
    console.log('Завантаження компонента адміністрування...');
    console.log('Перевірка доступних URL API...');
    
    // Перевірка різних URL для транспортних засобів
    const checkUrls = async () => {
      try {
        await axios.get('/api/inventory/vehicles/', {
          headers: { Authorization: `Token ${authToken}` }
        });
        console.log('URL /api/inventory/vehicles/ працює');
      } catch (error) {
        console.log('URL /api/inventory/vehicles/ не працює:', error.message);
      }
      
      try {
        await axios.get('/api/vehicles/', {
          headers: { Authorization: `Token ${authToken}` }
        });
        console.log('URL /api/vehicles/ працює');
      } catch (error) {
        console.log('URL /api/vehicles/ не працює:', error.message);
      }
      
      try {
        await axios.get('/api/inventory/vehicle/', {
          headers: { Authorization: `Token ${authToken}` }
        });
        console.log('URL /api/inventory/vehicle/ працює');
      } catch (error) {
        console.log('URL /api/inventory/vehicle/ не працює:', error.message);
      }
    };
    
    checkUrls();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    
    // Для отримання додаткової інформації про дані складів
    if (activeTab === 'warehouses') {
      console.log('Перезавантаження даних складів при активації вкладки');
      
      // Тестова перевірка API напряму
      const testAPI = async () => {
        try {
          const directApiResponse = await getWarehouses();
          console.log('Прямий запит API для складів:', directApiResponse);
        } catch (error) {
          console.error('Помилка прямого запиту API:', error);
        }
      };
      
      testAPI();
    }
    
    // Завантажуємо дані транспортних засобів
    const fetchVehicles = async () => {
      try {
        // Використовуємо правильний URL API для транспортних засобів
        const response = await axios.get('/api/vehicles/', {
          headers: { Authorization: `Token ${authToken}` }
        });
        console.log('Отримані дані транспортних засобів:', response.data);
        setVehicles(response.data);
      } catch (error) {
        console.error('Помилка при отриманні даних транспортних засобів:', error);
        // Показуємо повідомлення про помилку з більш детальною інформацією
        setAlertInfo({
          show: true,
          message: `Помилка при отриманні даних транспортних засобів: ${error.response?.status || ''} ${error.message || 'Невідома помилка'}`,
          variant: 'danger'
        });
        // Встановлюємо порожній масив, щоб уникнути помилок рендерингу
        setVehicles([]);
      }
    };
    
    fetchVehicles();
  }, [activeTab, authToken]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          console.log('Завантаження даних користувачів...');
          try {
            const userData = await fetchUsers();
            // Перевірка наявності даних та їх формату
            console.log("Отримані дані користувачів:", userData);
            
            if (userData && userData.data) {
              if (Array.isArray(userData.data)) {
                console.log(`Встановлюємо ${userData.data.length} користувачів у стейт`);
                setUsers(userData.data);
              } else if (typeof userData.data === 'object') {
                // Якщо це об'єкт, але не масив, перетворюємо на масив
                const usersArray = Object.values(userData.data);
                console.log(`Перетворюємо об'єкт на масив з ${usersArray.length} користувачів`);
                setUsers(usersArray);
              } else {
                console.error("Неочікуваний формат даних користувачів:", userData.data);
                setUsers([]);
              }
            } else if (userData) {
              if (Array.isArray(userData)) {
                console.log(`Встановлюємо прямий масив з ${userData.length} користувачів`);
                setUsers(userData);
              } else if (typeof userData === 'object') {
                // Якщо це об'єкт, але не масив, перетворюємо на масив
                const usersArray = Object.values(userData);
                console.log(`Перетворюємо прямий об'єкт на масив з ${usersArray.length} користувачів`);
                setUsers(usersArray);
              } else {
                console.error("Неочікуваний формат даних користувачів (немає поля data):", userData);
                setUsers([]);
              }
            } else {
              console.error("Отримані дані користувачів є null або undefined");
              setUsers([]);
            }
          } catch (userError) {
            console.error("Помилка при отриманні даних користувачів:", userError);
            setUsers([]);
            alert(`Помилка при завантаженні користувачів: ${userError.message || 'Невідома помилка'}`);
          }
          break;
        case 'departments':
          const deptData = await fetchDepartments();
          console.log("Отримані дані підрозділів:", deptData);
          if (deptData && deptData.data && Array.isArray(deptData.data)) {
            setDepartments(deptData.data);
          } else {
            console.error("Отримані дані підрозділів мають неправильний формат:", deptData);
            setDepartments([]);
          }
          break;
        case 'warehouses':
          const whData = await fetchWarehouses();
          console.log("Отримані дані складів:", whData);
          // Жорстка перевірка та примусове перетворення на масив
          let warehousesArray = [];
          if (whData && whData.data) {
            if (Array.isArray(whData.data)) {
              warehousesArray = whData.data;
            } else if (typeof whData.data === 'object') {
              // Якщо це об'єкт, але не масив, спробуємо витягнути значення
              warehousesArray = Object.values(whData.data);
            }
          } else if (whData) {
            if (Array.isArray(whData)) {
              warehousesArray = whData;
            } else if (typeof whData === 'object') {
              // Якщо це об'єкт, але не масив, спробуємо витягнути значення
              warehousesArray = Object.values(whData);
            }
          }
          
          console.log("Перетворені дані складів:", warehousesArray);
          setWarehouses(warehousesArray);
          
          // Також завантажуємо користувачів для вибору менеджера
          if (users.length === 0) {
            const userData = await fetchUsers();
            console.log("Додаткові дані користувачів:", userData);
            if (userData && userData.data && Array.isArray(userData.data)) {
              setUsers(userData.data);
            } else {
              setUsers([]);
            }
          }
          break;
      }
    } catch (error) {
      console.error("Помилка завантаження даних:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    try {
      console.log("Відправлення форми користувача:", userForm);
      
      // Перевірка обов'язкових полів
      if (!userForm.username) {
        alert("Ім'я користувача обов'язкове");
        return;
      }
      
      if (!editMode && !userForm.password) {
        alert("Пароль обов'язковий для нового користувача");
        return;
      }
      
      // Перевірка допустимих ролей
      const validRoles = ['admin', 'warehouse', 'logistician', 'manager'];
      if (userForm.role && !validRoles.includes(userForm.role)) {
        alert(`Обрана роль '${userForm.role}' недоступна в системі. Виберіть одну з: ${validRoles.join(', ')}`);
        return;
      }
      
      // При редагуванні не відправляємо порожній пароль
      const userData = {...userForm};
      if (editMode && !userData.password) {
        delete userData.password;
      }
      
      if (editMode) {
        await updateUser(editId, userData);
        alert("Користувача успішно оновлено");
      } else {
        await createUser(userData);
        alert("Користувача успішно створено");
      }
      
      setUserForm({ username: '', password: '', first_name: '', last_name: '', email: '', role: 'manager' });
      setEditMode(false);
      setEditId(null);
      
      console.log("Оновлення списку користувачів після збереження...");
      try {
        const fetchedData = await fetchUsers();
        console.log("Отримані дані користувачів після збереження:", fetchedData);
        
        if (fetchedData && fetchedData.data) {
          if (Array.isArray(fetchedData.data)) {
            console.log(`Оновлюємо таблицю: отримано ${fetchedData.data.length} користувачів`);
            setUsers(fetchedData.data);
          } else if (typeof fetchedData.data === 'object') {
            // Якщо це об'єкт, але не масив, перетворюємо на масив
            const usersArray = Object.values(fetchedData.data);
            console.log(`Оновлюємо таблицю: перетворено об'єкт на масив з ${usersArray.length} користувачів`);
            setUsers(usersArray);
          } else {
            console.error("Неочікуваний формат даних після збереження:", fetchedData.data);
            alert("Користувача збережено, але виникла помилка під час оновлення списку. Спробуйте оновити сторінку.");
          }
        } else {
          console.error("API повернув порожні дані після збереження");
          alert("Користувача збережено, але виникла помилка під час оновлення списку. Спробуйте перезавантажити дані.");
        }
      } catch (fetchError) {
        console.error("Помилка при оновленні списку користувачів:", fetchError);
        alert("Користувача збережено, але виникла помилка під час оновлення списку. Натисніть 'Перезавантажити дані користувачів'.");
      }
    } catch (error) {
      console.error("Помилка збереження користувача:", error);
      
      let errorMessage = "Помилка при збереженні користувача";
      
      if (error.response && error.response.data) {
        // Формуємо детальне повідомлення про помилку
        const errorDetails = Object.entries(error.response.data)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('\n');
        
        errorMessage += `\n${errorDetails}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };
      
      // Додавання CSS для статусних значків
      useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85em;
        font-weight: bold;
      }
      .status-active {
        background-color: #d4edda;
        color: #155724;
      }
      .status-maintenance {
        background-color: #fff3cd;
        color: #856404;
      }
      .status-repair {
        background-color: #f8d7da;
        color: #721c24;
      }
      .status-inactive {
        background-color: #e2e3e5;
        color: #383d41;
      }
      .table-note {
        margin-top: 10px;
        color: #6c757d;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
      }, []);

  const handleSubmitDepartment = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateDepartment(editId, departmentForm);
      } else {
        await createDepartment(departmentForm);
      }
      
      setDepartmentForm({ name: '', code: '' });
      setEditMode(false);
      setEditId(null);
      
      const deptData = await fetchDepartments();
      if (deptData && deptData.data && Array.isArray(deptData.data)) {
        setDepartments(deptData.data);
      } else {
        console.error("Отримані дані підрозділів мають неправильний формат:", deptData);
        setDepartments([]); // Встановлюємо порожній масив для уникнення помилок
      }
    } catch (error) {
      console.error("Помилка збереження підрозділу:", error);
    }
  };
  
  const handleSubmitWarehouse = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await updateWarehouse(editId, warehouseForm);
      } else {
        await createWarehouse(warehouseForm);
      }
      
      setWarehouseForm({ name: '', address: '', manager: '' });
      setEditMode(false);
      setEditId(null);
      
      const whData = await fetchWarehouses();
      if (whData && whData.data && Array.isArray(whData.data)) {
        setWarehouses(whData.data);
      } else {
        console.error("Отримані дані складів мають неправильний формат:", whData);
        setWarehouses([]); // Встановлюємо порожній масив для уникнення помилок
      }
    } catch (error) {
      console.error("Помилка збереження складу:", error);
    }
  };
      
      // Функція createDriver вже визначена десь в іншому місці файлу
  
  // Обробник зміни полів форми водія
  const handleDriverFormChange = (e) => {
    const { name, value } = e.target;
    setDriverForm({ ...driverForm, [name]: value });
  };
  
  // Створення нового водія
  const createDriver = async (e) => {
    e.preventDefault();
    try {
      console.log('Початок створення водія...');
      
      // Генеруємо випадковий пароль та унікальні логін і пошту
      const generateRandomPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };
      
      // Перевірка що поля імені, прізвища і телефону заповнені
      if (!driverForm.first_name || !driverForm.last_name || !driverForm.phone) {
        setAlertInfo({
          show: true,
          message: 'Заповніть усі обов\'язкові поля (ім\'я, прізвище, телефон)',
          variant: 'danger'
        });
        return;
      }
      
      // Генеруємо унікальний логін на основі імені та прізвища
      const randomSuffix = Math.floor(Math.random() * 10000);
      const username = `driver_${driverForm.first_name.toLowerCase()}_${driverForm.last_name.toLowerCase()}_${randomSuffix}`;
      
      // Генеруємо унікальну тимчасову електронну пошту
      const email = `driver_${randomSuffix}@system.internal`;
      
      const userData = {
        username: username,
        email: email,
        password: generateRandomPassword(),
        first_name: driverForm.first_name,
        last_name: driverForm.last_name,
        phone: driverForm.phone,
        role: 'driver'
      };
      
      const userResponse = await axios.post('/api/users/', userData, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      // Оновлюємо список користувачів
      const newUser = userResponse.data;
      setUsers([...users, newUser]);
      
      // Якщо автомобіль вибрано, оновлюємо його, призначаючи нового водія
      if (driverForm.vehicle) {
        // Спробуємо всі можливі шляхи для оновлення автомобіля
        let vehicleResponse;
        try {
          console.log('Спроба оновити через URL: /api/inventory/vehicles/');
          vehicleResponse = await axios.patch(`/api/inventory/vehicles/${driverForm.vehicle}/`, {
            driver: newUser.id
          }, {
            headers: { Authorization: `Token ${authToken}` }
          });
        } catch (err1) {
          console.log('Помилка з першим URL, спроба URL: /api/vehicles/');
          try {
            vehicleResponse = await axios.patch(`/api/vehicles/${driverForm.vehicle}/`, {
              driver: newUser.id
            }, {
              headers: { Authorization: `Token ${authToken}` }
            });
          } catch (err2) {
            console.log('Помилка з другим URL, спроба URL: /api/inventory/vehicle/');
            vehicleResponse = await axios.patch(`/api/inventory/vehicle/${driverForm.vehicle}/`, {
              driver: newUser.id
            }, {
              headers: { Authorization: `Token ${authToken}` }
            });
          }
        }
        
        // Оновлюємо список автомобілів
        setVehicles(vehicles.map(v => v.id === parseInt(driverForm.vehicle) ? vehicleResponse.data : v));
      }
      
      // Очищаємо форму і показуємо повідомлення
      setDriverForm({
        first_name: '',
        last_name: '',
        phone: '',
        vehicle: ''
      });
      
      setAlertInfo({
        show: true,
        message: 'Водія успішно створено та призначено на автомобіль!',
        variant: 'success'
      });
    } catch (error) {
      console.error('Помилка при створенні водія:', error);
      setAlertInfo({
        show: true,
        message: 'Помилка при створенні водія. Перевірте введені дані.',
        variant: 'danger'
      });
    }
  };

  const handleEditUser = (user) => {
    if (!user || !user.id) {
      console.error("Спроба редагувати користувача з неповними даними:", user);
      alert("Помилка: Дані користувача неповні або відсутні");
      return;
    }
    
    setUserForm({
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role: user.role || 'manager',
      password: '' // Не передаємо пароль для редагування
    });
    setEditMode(true);
    setEditId(user.id);
  };

  const handleEditDepartment = (dept) => {
    setDepartmentForm({
      name: dept.name,
      code: dept.code
    });
    setEditMode(true);
    setEditId(dept.id);
  };

  const handleEditWarehouse = (wh) => {
    setWarehouseForm({
      name: wh.name,
      address: wh.address,
      manager: wh.manager || ''
    });
    setEditMode(true);
    setEditId(wh.id);
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Ви впевнені, що хочете видалити цього користувача?")) {
      try {
        await deleteUser(id);
        const userData = await fetchUsers();
        if (userData && userData.data && Array.isArray(userData.data)) {
          setUsers(userData.data);
        } else {
          console.error("Отримані дані користувачів мають неправильний формат:", userData);
          setUsers([]);
        }
      } catch (error) {
        console.error("Помилка видалення користувача:", error);
      }
    }
  };
        
        // Функція для скидання паролю користувача
        const handleResetPassword = async (userId, userName) => {
          const generateRandomPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
          };
          
          const options = [
      'Ввести новий пароль вручну', 
      'Згенерувати випадковий пароль', 
      'Скасувати'
          ];
          
          const choice = window.prompt(
      `Оберіть опцію для скидання паролю користувача ${userName}:\n` +
      `1. ${options[0]}\n` +
      `2. ${options[1]}\n` +
      `3. ${options[2]}\n` +
      'Введіть номер (1-3):'
          );
          
          if (!choice || choice === '3') {
      return; // Користувач скасував операцію
          }
          
          try {
      let newPassword = null;
      
      if (choice === '1') {
        // Ручне введення паролю
        newPassword = window.prompt('Введіть новий пароль (не менше 8 символів):');
        if (!newPassword) return;
        
        if (newPassword.length < 8) {
          alert('Пароль повинен містити не менше 8 символів');
          return;
        }
      } else if (choice === '2') {
        // Генерація випадкового паролю
        newPassword = generateRandomPassword();
      } else {
        alert('Невірний вибір. Спробуйте знову.');
        return;
      }
      
      await resetUserPassword(userId, newPassword);
      
      // Повідомлення про успішну зміну паролю
      alert(`Пароль користувача ${userName} успішно змінено на:\n\n${newPassword}\n\nЗапишіть або запам'ятайте цей пароль, оскільки його не можна буде переглянути пізніше.`);
      
          } catch (err) {
      console.error('Помилка скидання паролю:', err);
      alert('Помилка скидання паролю: ' + (err.response?.data?.detail || err.message));
          }
        };

  const handleDeleteDepartment = async (id) => {
    if (window.confirm("Ви впевнені, що хочете видалити цей підрозділ?")) {
      try {
        await deleteDepartment(id);
        const deptData = await fetchDepartments();
        if (deptData && deptData.data && Array.isArray(deptData.data)) {
          setDepartments(deptData.data);
        } else {
          console.error("Отримані дані підрозділів мають неправильний формат:", deptData);
          setDepartments([]);
        }
      } catch (error) {
        console.error("Помилка видалення підрозділу:", error);
      }
    }
  };
  
  const handleDeleteWarehouse = async (id) => {
    if (window.confirm("Ви впевнені, що хочете видалити цей склад?")) {
      try {
        await deleteWarehouse(id);
        const whData = await fetchWarehouses();
        if (whData && whData.data && Array.isArray(whData.data)) {
          setWarehouses(whData.data);
        } else {
          console.error("Отримані дані складів мають неправильний формат:", whData);
          setWarehouses([]);
        }
      } catch (error) {
        console.error("Помилка видалення складу:", error);
      }
    }
  };

  // Додаємо функцію для тестування API
  const handleTestApiConnection = async () => {
    try {
      setLoading(true);
      
      // Викликаємо тестову функцію (вже імпортовану)
      const result = await testApiConnection();
      console.log('Результат тесту API:', result);
      
      // Показуємо повідомлення користувачу
      alert(
        result.success 
          ? 'Зєднання з API успішне. Перевірте консоль браузера для деталей.'
          : `Помилка з'єднання з API: ${result.error?.message || 'Невідома помилка'}`
      );
    } catch (error) {
      console.error('Помилка тестування API:', error);
      alert(`Помилка тестування API: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="admin-dashboard">
      <h1>Панель адміністратора</h1>
      
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
      
      <style>
        {`
        .required {
          color: red;
        }
        .form-group input:required, .form-group select:required {
          border-left: 3px solid red;
        }
        .alert-container {
          margin-bottom: 20px;
        }
        .form-error {
          color: red;
          font-size: 0.8em;
          margin-top: 5px;
        }
        .error-message {
          background-color: #ffebee;
          border-left: 4px solid #f44336;
          padding: 10px;
          margin: 10px 0;
          color: #b71c1c;
        }
        .info-message {
          background-color: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 10px;
          margin: 10px 0;
          color: #0d47a1;
        }
        .reload-button-container {
          margin: 10px 0;
        }
        .reload-button {
          background-color: #4caf50;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .reload-button:hover {
          background-color: #388e3c;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .data-table th, .data-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .data-table th {
          background-color: #f5f5f5;
        }
        .data-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .data-table tr:hover {
          background-color: #f1f1f1;
        }
        `}
      </style>
      
      <div className="api-test-button">
        <button 
          onClick={handleTestApiConnection}
          className="test-api-button"
        >
          Перевірити з'єднання з API
        </button>
      </div>
      
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          Користувачі
        </button>
        <button 
          className={activeTab === 'departments' ? 'active' : ''} 
          onClick={() => setActiveTab('departments')}
        >
          Підрозділи
        </button>
        <button 
          onClick={() => user ? handleResetPassword(user.id, user.username) : alert('Користувач не вибраний')}
          className="reset-button"
        >
          Скинути свій пароль
        </button>
        <button 
          className={activeTab === 'warehouses' ? 'active' : ''} 
          onClick={() => setActiveTab('warehouses')}
        >
          Склади
        </button>
        <button 
          className={activeTab === 'drivers' ? 'active' : ''} 
          onClick={() => {
            setActiveTab('drivers');
            setActiveForm(activeForm === 'driver' ? null : 'driver');
          }}
        >
          Водії
        </button>
      </div>
      
      <div className="dashboard-content">
        {alertInfo.show && (
          <div className={`alert alert-${alertInfo.variant} alert-container`}>
            {alertInfo.message}
            <button 
              className="close" 
              onClick={() => setAlertInfo({...alertInfo, show: false})}
            >
              &times;
            </button>
          </div>
        )}
        
        {loading && <div className="loading">Завантаження...</div>}
        
        {/* Управління користувачами */}
        {activeTab === 'users' && !loading && (
          <div>
            <h2>{editMode ? 'Редагувати користувача' : 'Додати нового користувача'}</h2>
            <form onSubmit={(e) => handleSubmitUser(e)} className="admin-form">
              <div className="form-group">
                <label>Ім'я користувача: <span className="required">*</span></label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={e => setUserForm({...userForm, username: e.target.value})}
                  placeholder="Введіть ім'я користувача"
                />
              </div>
              
              <div className="form-group">
                <label>Пароль{editMode ? " (залиште порожнім, щоб не змінювати)" : " *"}:</label>
                <input
                  type="password"
                  required={!editMode}
                  value={userForm.password}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                  placeholder={editMode ? "Залиште порожнім, щоб не змінювати" : "Введіть пароль"}
                />
              </div>
              
              <div className="form-group">
                <label>Ім'я:</label>
                <input
                  type="text"
                  value={userForm.first_name}
                  onChange={e => setUserForm({...userForm, first_name: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Прізвище:</label>
                <input
                  type="text"
                  value={userForm.last_name}
                  onChange={e => setUserForm({...userForm, last_name: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Роль:</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({...userForm, role: e.target.value})}
                >
                  <option value="admin">Адміністратор</option>
                  <option value="warehouse">Складський працівник</option>
                  <option value="logistician">Логіст</option>
                  <option value="manager">Менеджер</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="submit">{editMode ? 'Оновити' : 'Додати'}</button>
                {editMode && (
                  <button type="button" onClick={() => {
                    setEditMode(false);
                    setEditId(null);
                    setUserForm({ username: '', password: '', first_name: '', last_name: '', email: '', role: 'manager' });
                  }}>
                    Скасувати
                  </button>
                )}
              </div>
            </form>

            <h2>Список користувачів</h2>
            <div className="reload-button-container">
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    console.log("Ручне перезавантаження користувачів...");
                    const userData = await fetchUsers();
                    console.log("Дані від fetchUsers при ручному перезавантаженні:", userData);
                    
                    if (userData && userData.data && Array.isArray(userData.data)) {
                      setUsers(userData.data);
                      console.log(`Оновлено ${userData.data.length} користувачів в таблиці`);
                    } else {
                      console.error("Дані користувачів мають неправильний формат:", userData);
                      setUsers([]);
                    }
                  } catch (error) {
                    console.error("Помилка при ручному перезавантаженні користувачів:", error);
                    alert(`Помилка при завантаженні користувачів: ${error.message || 'Невідома помилка'}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="reload-button"
              >
                Перезавантажити дані користувачів
              </button>
            </div>
            {!Array.isArray(users) ? (
              <div className="error-message">
                Помилка завантаження даних користувачів. Будь ласка, спробуйте оновити сторінку або натисніть кнопку "Перезавантажити дані користувачів".
              </div>
            ) : users.length === 0 ? (
              <div className="info-message">
                Немає доступних користувачів. Створіть першого користувача, використовуючи форму вище, або перевірте 
                наявність помилок у консолі браузера (F12).
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ім'я користувача</th>
                    <th>Повне ім'я</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id || Math.random()}>
                      <td>{user.username}</td>
                      <td>{user.first_name || ''} {user.last_name || ''}</td>
                      <td>{user.email || ''}</td>
                      <td>{user.role_display || user.role || ''}</td>
                      <td>
                        <button onClick={() => handleEditUser(user)}>Редагувати</button>
                        <button onClick={() => handleDeleteUser(user.id)}>Видалити</button>
                        <button onClick={() => handleResetPassword(user.id, user.username)}>Скинути пароль</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {/* Управління підрозділами */}
        {activeTab === 'departments' && !loading && (
          <div>
            <h2>{editMode ? 'Редагувати підрозділ' : 'Додати новий підрозділ'}</h2>
            <form onSubmit={handleSubmitDepartment} className="admin-form">
              <div className="form-group">
                <label>Назва:</label>
                <input
                  type="text"
                  required
                  value={departmentForm.name}
                  onChange={e => setDepartmentForm({...departmentForm, name: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Код:</label>
                <input
                  type="text"
                  required
                  value={departmentForm.code}
                  onChange={e => setDepartmentForm({...departmentForm, code: e.target.value})}
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-button">{editMode ? 'Оновити' : 'Додати'}</button>
                {editMode && (
                  <button type="button" onClick={() => {
                    setEditMode(false);
                    setEditId(null);
                    setDepartmentForm({
                      name: '',
                      code: '',
                      contact_person: '',
                      phone: '',
                      address: '',
                      email: ''
                    });
                  }}>
                    Скасувати
                  </button>
                )}
              </div>
            </form>
            
            <h2>Список підрозділів</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Назва</th>
                  <th>Код</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept.id}>
                    <td>{dept.name}</td>
                    <td>{dept.code}</td>
                    <td>
                      <button onClick={() => handleEditDepartment(dept)}>Редагувати</button>
                      <button onClick={() => handleDeleteDepartment(dept.id)}>Видалити</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Управління складами */}
        {activeTab === 'warehouses' && !loading && (
          <div>
            <h2>{editMode ? 'Редагувати склад' : 'Додати новий склад'}</h2>
            <form onSubmit={handleSubmitWarehouse} className="admin-form">
              <div className="form-group">
                <label>Назва:</label>
                <input
                  type="text"
                  required
                  value={warehouseForm.name}
                  onChange={e => setWarehouseForm({...warehouseForm, name: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Адреса:</label>
                <textarea
                  required
                  value={warehouseForm.address}
                  onChange={e => setWarehouseForm({...warehouseForm, address: e.target.value})}
                  minLength="8"
                />
                <small className="address-info">
                  Введіть повну адресу складу, мінімум 8 символів
                </small>
              </div>
              
              <div className="form-group">
                <label>Менеджер:</label>
                <select
                  value={warehouseForm.manager}
                  onChange={e => setWarehouseForm({...warehouseForm, manager: e.target.value})}
                >
                  <option value="">Виберіть менеджера</option>
                  {Array.isArray(users) ? users
                    .filter(user => user.role === 'warehouse')
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.first_name} {user.last_name})
                      </option>
                    )) : <option value="">Немає доступних менеджерів</option>
                  }
                </select>
              </div>
              
              <div className="form-actions">
                <button type="submit">{editMode ? 'Оновити' : 'Додати'}</button>
                {editMode && (
                  <button type="button" onClick={() => {
                    setEditMode(false);
                    setEditId(null);
                    setWarehouseForm({ name: '', address: '', manager: '' });
                  }}>
                    Скасувати
                  </button>
                )}
              </div>
            </form>
            
            <h2>Список складів</h2>
            <div className="reload-button-container">
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    console.log("Ручне перезавантаження складів...");
                    const directApiResponse = await getWarehouses();
                    console.log('Прямий запит API для складів при ручному перезавантаженні:', directApiResponse);
                    
                    const whData = await fetchWarehouses();
                    console.log("Дані від fetchWarehouses при ручному перезавантаженні:", whData);
                    
                    let warehousesArray = [];
                    if (whData && whData.data) {
                      if (Array.isArray(whData.data)) {
                        warehousesArray = whData.data;
                      } else if (typeof whData.data === 'object') {
                        warehousesArray = Object.values(whData.data);
                      }
                    } else if (whData) {
                      if (Array.isArray(whData)) {
                        warehousesArray = whData;
                      } else if (typeof whData === 'object') {
                        warehousesArray = Object.values(whData);
                      }
                    }
                    
                    console.log("Перетворені дані складів при ручному перезавантаженні:", warehousesArray);
                    setWarehouses(warehousesArray);
                  } catch (error) {
                    console.error("Помилка при ручному перезавантаженні:", error);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="reload-button"
              >
                Перезавантажити дані складів
              </button>
            </div>
            {!Array.isArray(warehouses) ? (
              <div className="error-message">
                Помилка завантаження даних складів. Будь ласка, спробуйте оновити сторінку або натисніть кнопку "Перезавантажити дані складів".
              </div>
            ) : warehouses.length === 0 ? (
              <div className="info-message">
                Немає доступних складів. Створіть перший склад, використовуючи форму вище, або перевірте 
                наявність помилок у консолі браузера (F12).
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Назва</th>
                    <th>Адреса</th>
                    <th>Менеджер</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map(warehouse => (
                    <tr key={warehouse.id || Math.random()}>
                      <td>{warehouse.name}</td>
                      <td>{warehouse.address}</td>
                      <td>{warehouse.manager_name}</td>
                      <td>
                        <button onClick={() => handleEditWarehouse(warehouse)}>Редагувати</button>
                        <button onClick={() => handleDeleteWarehouse(warehouse.id)}>Видалити</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
          
                {/* Форма створення водія */}
                {activeTab === 'drivers' && (
          <div className="user-form">
            <div className="form-title">
              <h2>Створення нового водія</h2>
            </div>
            
            <Form onSubmit={createDriver}>
              <div className="form-row">
                <Form.Group className="form-group">
                  <Form.Label>Ім'я</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="first_name" 
                    value={driverForm.first_name} 
                    onChange={handleDriverFormChange} 
                    required
                  />
                </Form.Group>
                
                <Form.Group className="form-group">
                  <Form.Label>Прізвище</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="last_name" 
                    value={driverForm.last_name} 
                    onChange={handleDriverFormChange} 
                    required
                  />
                </Form.Group>
                
                <Form.Group className="form-group">
                  <Form.Label>Телефон</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="phone" 
                    value={driverForm.phone} 
                    onChange={handleDriverFormChange} 
                    required
                  />
                </Form.Group>
              </div>
              
              <div className="form-row">
                <Form.Group className="form-group">
                  <Form.Label>Призначити автомобіль</Form.Label>
                  <Form.Control 
                    as="select" 
                    name="vehicle" 
                    value={driverForm.vehicle} 
                    onChange={handleDriverFormChange}
                  >
                    <option value="">Виберіть автомобіль</option>
                    {Array.isArray(vehicles) && vehicles.length > 0 ?
                      (vehicles
                        .filter(vehicle => !vehicle.driver && vehicle.status === 'active')
                        .length > 0 ?
                        vehicles
                          .filter(vehicle => !vehicle.driver && vehicle.status === 'active')
                          .map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {`${vehicle.name || 'Без назви'} - ${vehicle.model || 'Без моделі'} (${vehicle.plate_number || 'Без номеру'})`}
                            </option>
                          ))
                        : <option value="" disabled>Немає доступних вільних автомобілів</option>
                      ) : 
                      <option value="" disabled>Немає доступних автомобілів або помилка завантаження</option>
                    }
                  </Form.Control>
                </Form.Group>
              </div>
              
              <Button type="submit" variant="success" className="mt-3">
                Створити водія
              </Button>
            </Form>
            
            <h3 className="mt-4">Список водіїв</h3>
            <div className="reload-button-container">
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    // Завантажуємо дані знову
                    const response = await axios.get('/api/inventory/vehicles/', {
                      headers: { Authorization: `Token ${authToken}` }
                    });
                    console.log('Отримані дані транспортних засобів при ручному перезавантаженні:', response.data);
                    setVehicles(response.data);
                    setAlertInfo({
                      show: true,
                      message: 'Дані транспортних засобів успішно оновлено',
                      variant: 'success'
                    });
                  } catch (error) {
                    console.error('Помилка при перезавантаженні даних транспортних засобів:', error);
                    setAlertInfo({
                      show: true, 
                      message: `Помилка при перезавантаженні даних транспортних засобів: ${error.message}`,
                      variant: 'danger'
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="reload-button"
              >
                Перезавантажити дані транспортних засобів
              </button>
            </div>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ім'я</th>
                  <th>Прізвище</th>
                  <th>Телефон</th>
                  <th>Призначений автомобіль</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(users) ? 
                  users
                    .filter(user => user.role === 'driver')
                    .map(user => {
                      const assignedVehicle = Array.isArray(vehicles) ? 
                        vehicles.find(v => v.driver === user.id) : 
                        null;
                      return (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.first_name || ''}</td>
                          <td>{user.last_name || ''}</td>
                          <td>{user.phone || ''}</td>
                          <td>
                            {assignedVehicle 
                              ? `${assignedVehicle.name || 'Без назви'} (${assignedVehicle.plate_number || 'Без номеру'})` 
                              : 'Не призначено'}
                          </td>
                        </tr>
                      );
                    }) : <tr><td colSpan="5">Завантаження даних...</td></tr>}
              </tbody>
            </Table>
          </div>
                )}
      </div>
    </div>
  );
};

export default AdminDashboard;
