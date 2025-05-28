import React, { useState, useEffect } from 'react';
import { 
  fetchProducts, createProduct, updateProduct, 
  fetchWarehouses, createBatch
} from '../../api';

const SupplierDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Форми для створення і редагування
  const [productForm, setProductForm] = useState({ 
    name: '', 
    description: '',
    category: '',
    unit: 'шт',
    min_quantity: 0
  });
  
  const [batchForm, setBatchForm] = useState({
    product: '',
    warehouse: '',
    batch_number: '',
    quantity: 1,
    expiry_date: '',
    production_date: new Date().toISOString().split('T')[0]
  });
  
  // Режим редагування
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  
  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Завантажуємо продукти
      const productsData = await fetchProducts();
      setProducts(productsData.data);
      
      // Завантажуємо склади для форми партії
      const warehousesData = await fetchWarehouses();
      setWarehouses(warehousesData.data);
      
    } catch (error) {
      console.error("Помилка завантаження даних:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    
    try {
      if (editMode) {
        // Редагуємо існуючий продукт
        await updateProduct(editId, productForm);
      } else {
        // Створюємо новий продукт
        await createProduct(productForm);
      }
      
      // Скидаємо форму і оновлюємо дані
      setProductForm({ 
        name: '', 
        description: '',
        category: '',
        unit: 'шт',
        min_quantity: 0
      });
      setEditMode(false);
      setEditId(null);
      
      // Оновлюємо список продуктів
      const productsData = await fetchProducts();
      setProducts(productsData.data);
      
    } catch (error) {
      console.error("Помилка збереження продукту:", error);
      alert("Помилка збереження продукту: " + error.response?.data?.detail || error.message);
    }
  };
  
  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    
    try {
      // Створюємо нову партію
      await createBatch(batchForm);
      
      // Скидаємо форму
      setBatchForm({
        product: '',
        warehouse: '',
        batch_number: '',
        quantity: 1,
        expiry_date: '',
        production_date: new Date().toISOString().split('T')[0]
      });
      
      alert("Партію успішно створено!");
      
    } catch (error) {
      console.error("Помилка створення партії:", error);
      alert("Помилка створення партії: " + error.response?.data?.detail || error.message);
    }
  };
  
  const handleEdit = (product) => {
    // Заповнюємо форму даними продукту
    setProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      unit: product.unit,
      min_quantity: product.min_quantity
    });
    
    setEditMode(true);
    setEditId(product.id);
  };
  
  const generateBatchNumber = () => {
    // Безпечно отримуємо продукт, перевіряючи чи products це масив
    let product = null;
    if (Array.isArray(products)) {
      product = products.find(p => p.id === batchForm.product) || null;
    }
    if (!product) return '';
    
    const today = new Date();
    const year = today.getFullYear().toString().substr(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    // Формуємо номер партії: перші 3 літери назви продукту + дата + випадкове число
    const productPrefix = product.name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${productPrefix}-${year}${month}${day}-${randomNum}`;
  };
  
  return (
    <div className="supplier-dashboard">
      <h1>Панель постачальника</h1>
      
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
          className={activeTab === 'products' ? 'active' : ''} 
          onClick={() => setActiveTab('products')}
        >
          Продукти
        </button>
        <button 
          className={activeTab === 'batches' ? 'active' : ''} 
          onClick={() => setActiveTab('batches')}
        >
          Створення партії
        </button>
      </div>
      
      <div className="dashboard-content">
        {loading && <div className="loading">Завантаження...</div>}
        
        {/* Управління продуктами */}
        {activeTab === 'products' && !loading && (
          <div>
            <h2>{editMode ? 'Редагувати продукт' : 'Додати новий продукт'}</h2>
            <form onSubmit={handleSubmitProduct} className="product-form">
              <div className="form-group">
                <label>Назва:</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Опис:</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Категорія:</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Одиниця виміру:</label>
                <select
                  value={productForm.unit}
                  onChange={(e) => setProductForm({...productForm, unit: e.target.value})}
                >
                  <option value="шт">штуки</option>
                  <option value="кг">кілограми</option>
                  <option value="л">літри</option>
                  <option value="м">метри</option>
                  <option value="м²">квадратні метри</option>
                  <option value="м³">кубічні метри</option>
                  <option value="уп">упаковки</option>
                  <option value="кмпл">комплекти</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Мінімальна кількість:</label>
                <input
                  type="number"
                  min="0"
                  value={productForm.min_quantity}
                  onChange={(e) => setProductForm({...productForm, min_quantity: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div className="form-actions">
                <button type="submit">
                  {editMode ? 'Оновити продукт' : 'Додати продукт'}
                </button>
                {editMode && (
                  <button type="button" onClick={() => {
                    setEditMode(false);
                    setEditId(null);
                    setProductForm({ 
                      name: '', 
                      description: '',
                      category: '',
                      unit: 'шт',
                      min_quantity: 0
                    });
                  }}>
                    Скасувати
                  </button>
                )}
              </div>
            </form>
            
            <h2>Список продуктів</h2>
            {products.length === 0 ? (
              <p>Немає доданих продуктів</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Назва</th>
                    <th>Категорія</th>
                    <th>Одиниця виміру</th>
                    <th>Мін. кількість</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{product.unit}</td>
                      <td>{product.min_quantity}</td>
                      <td>
                        <button onClick={() => handleEdit(product)}>Редагувати</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {/* Створення партії */}
        {activeTab === 'batches' && !loading && (
          <div>
            <h2>Створити нову партію</h2>
            <form onSubmit={handleSubmitBatch} className="batch-form">
              <div className="form-group">
                <label>Продукт:</label>
                <select
                  value={batchForm.product}
                  onChange={(e) => {
                    setBatchForm({
                      ...batchForm, 
                      product: e.target.value,
                      batch_number: e.target.value ? generateBatchNumber() : ''
                    });
                  }}
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
                <label>Склад призначення:</label>
                <select
                  value={batchForm.warehouse}
                  onChange={(e) => setBatchForm({...batchForm, warehouse: e.target.value})}
                  required
                >
                  <option value="">Виберіть склад</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Номер партії:</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={batchForm.batch_number}
                    onChange={(e) => setBatchForm({...batchForm, batch_number: e.target.value})}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setBatchForm({...batchForm, batch_number: generateBatchNumber()})}
                    disabled={!batchForm.product}
                  >
                    Згенерувати
                  </button>
                </div>
              </div>
              
              <div className="form-group">
                <label>Кількість:</label>
                <input
                  type="number"
                  min="1"
                  value={batchForm.quantity}
                  onChange={(e) => setBatchForm({...batchForm, quantity: parseInt(e.target.value) || 1})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Дата виробництва:</label>
                <input
                  type="date"
                  value={batchForm.production_date}
                  onChange={(e) => setBatchForm({...batchForm, production_date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Термін придатності:</label>
                <input
                  type="date"
                  value={batchForm.expiry_date}
                  onChange={(e) => setBatchForm({...batchForm, expiry_date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="submit">Створити партію</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;
