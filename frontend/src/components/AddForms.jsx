import React, { useState, useEffect } from 'react';
import {
  fetchProducts,
  createProduct,
  fetchBatches,
  createBatch,
  receiveBatch,
  dispenseBatch,
} from '../api';

export default function AddForms({ user, refreshBatches }) {
  const [products, setProducts] = useState([]);
  const [batches, setBatches]   = useState([]);

  const [prodData, setProdData]   = useState({ name: '', unit: '', category: '' });
  const [batchData, setBatchData] = useState({ product: '', batch_number: '', quantity: 0, production_date: '', expiry_date: '' });
  const [txData, setTxData]       = useState({ batch: '', type: 'IN', quantity: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const productsResponse = await fetchProducts();
        console.log('Отримані продукти в AddForms:', productsResponse);
        if (productsResponse && productsResponse.data && Array.isArray(productsResponse.data)) {
          setProducts(productsResponse.data);
        } else {
          console.warn('Отримано неправильний формат даних продуктів');
          setProducts([]);
        }
        
        const batchesResponse = await fetchBatches();
        console.log('Отримані партії в AddForms:', batchesResponse);
        if (batchesResponse && batchesResponse.data && Array.isArray(batchesResponse.data)) {
          setBatches(batchesResponse.data);
        } else {
          console.warn('Отримано неправильний формат даних партій');
          setBatches([]);
        }
      } catch (error) {
        console.error('Помилка завантаження даних у AddForms:', error);
        setProducts([]);
        setBatches([]);
      }
    };
    
    loadData();
  }, []);

  const handleProd = async e => {
    e.preventDefault();
    try {
      await createProduct(prodData);
      setProdData({ name: '', unit: '', category: '' });
      const { data } = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      alert('Error creating product');
    }
  };

  const handleBatch = async e => {
    e.preventDefault();
    try {
      await createBatch({
        product: parseInt(batchData.product, 10),
        batch_number: batchData.batch_number,
        quantity: batchData.quantity,
        production_date: batchData.production_date,
        expiry_date: batchData.expiry_date,
      });
      setBatchData({ product: '', batch_number: '', quantity: 0, production_date: '', expiry_date: '' });
      const { data } = await fetchBatches();
      setBatches(data);
    } catch (err) {
      console.error(err);
      alert('Error creating batch: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleTx = async e => {
    e.preventDefault();
    try {
      if (txData.type === 'IN') {
        await receiveBatch(parseInt(txData.batch, 10), txData.quantity);
      } else {
        await dispenseBatch(parseInt(txData.batch, 10), txData.quantity);
      }
      setTxData({ batch: '', type: 'IN', quantity: 0 });
      const { data } = await fetchBatches();
      setBatches(data);
    } catch (err) {
      console.error(err);
      alert('Error creating transaction: ' + (err.response?.data?.detail || err.message));
    }
  };
  const isWorker = user?.is_staff || user?.groups?.includes('Worker');
 // const isAdmin = user?.is_staff & user?.?.includes('admin');
  console.log(user)
  return (
    <div style={{ padding: '1rem' }}>
           {isWorker && (
       <>
         <h2>Додати Продукт</h2>
         <form onSubmit={handleProd}>
           <input required placeholder="Name"
             value={prodData.name}
             onChange={e => setProdData({ ...prodData, name: e.target.value })}
           />
           <input required placeholder="Unit"
             value={prodData.unit}
             onChange={e => setProdData({ ...prodData, unit: e.target.value })}
           />
           <input placeholder="Category"
             value={prodData.category}
             onChange={e => setProdData({ ...prodData, category: e.target.value })}
           />
           <button type="submit">Створити продукт</button>
         </form>
         <h2>Додати Партію</h2>
      <form onSubmit={handleBatch}>
        <select required value={batchData.product} onChange={e => setBatchData({ ...batchData, product: e.target.value })}>
          <option value="">Оберіть продукт</option>
          {Array.isArray(products) ? products.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">Завантаження продуктів...</option>}
        </select>
        <input required placeholder="Batch Number" value={batchData.batch_number} onChange={e => setBatchData({ ...batchData, batch_number: e.target.value })} />
        <input type="number" required placeholder="Quantity" value={batchData.quantity} onChange={e => setBatchData({ ...batchData, quantity: Number(e.target.value) })} />
        <input type="date" required placeholder="Production Date" value={batchData.production_date} onChange={e => setBatchData({ ...batchData, production_date: e.target.value })} />
        <input type="date" required placeholder="Expiry Date" value={batchData.expiry_date} onChange={e => setBatchData({ ...batchData, expiry_date: e.target.value })} />
        <button type="submit">Створити партію</button>
      </form>

      <h2>Додати Транзакцію</h2>
      <form onSubmit={handleTx}>
        <select required value={txData.batch} onChange={e => setTxData({ ...txData, batch: e.target.value })}>
          <option value="">Оберіть партію</option>
          {Array.isArray(batches) ? batches.map(b => {
            const productName = b.product && b.product.name 
              ? b.product.name 
              : b.product_name || `Продукт ID: ${b.product}`;
            return (
              <option key={b.id} value={b.id}>
                {productName} – {b.batch_number}
              </option>
            );
          }) : <option value="">Завантаження партій...</option>}
        </select>
        <select value={txData.type} onChange={e => setTxData({ ...txData, type: e.target.value })}>
          <option value="IN">Прийом</option>
          <option value="OUT">Відпуск</option>
        </select>
        <input type="number" required placeholder="Quantity" value={txData.quantity} onChange={e => setTxData({ ...txData, quantity: Number(e.target.value) })} />
        <button type="submit">Зареєструвати транзакцію</button>
      </form>
       </>
     )}

    </div>
  );
}