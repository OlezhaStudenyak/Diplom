    // src/components/ProductsPage.jsx
import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, deleteProduct } from '../api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm]         = useState({ name: '', unit: '', category: '' });

  // Завантажити список
  const load = async () => {
    const { data } = await fetchProducts();
    setProducts(data);
  };

  useEffect(() => { load() }, []);

  // Додати продукт
  const handleAdd = async e => {
    e.preventDefault();
    await createProduct(form);
    setForm({ name: '', unit: '', category: '' });
    load();
  };

  // Видалити продукт
  const handleDelete = async id => {
    if (window.confirm('Впевнені, що хочете видалити?')) {
      await deleteProduct(id);
      load();
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1>Управління продуктами</h1>

      <ul>
        {products.map(p => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            {p.name} ({p.unit})&nbsp;
            <button onClick={() => handleDelete(p.id)}>🗑 Видалити</button>
          </li>
        ))}
      </ul>

      <h2>Додати новий продукт</h2>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Unit"
          value={form.unit}
          onChange={e => setForm({ ...form, unit: e.target.value })}
          required
        />
        <input
          placeholder="Category"
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
        />
        <button type="submit">Додати</button>
      </form>
    </div>
  );
}
