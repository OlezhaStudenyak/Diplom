import React, { useState } from 'react';
import { loginUser, fetchMe } from '../api';
import './Login.css';   // імпорт стилів

export default function Login({ onLogin }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await loginUser(creds);
      const me = await fetchMe();
      onLogin(me.data);
    } catch (err) {
      console.error('Помилка входу:', err);
      setError('Неправильне ім\'я користувача або пароль');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={submit}>
        <h2>Вхід до системи інвентаризації</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label>Ім'я користувача:</label>
          <input
            className="login-input"
            value={creds.username}
            onChange={e => setCreds({ ...creds, username: e.target.value })}
            placeholder="Введіть ім'я користувача"
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Пароль:</label>
          <input
            className="login-input"
            type="password"
            value={creds.password}
            onChange={e => setCreds({ ...creds, password: e.target.value })}
            placeholder="Введіть пароль"
            disabled={loading}
            required
          />
        </div>
        
        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'Вхід...' : 'Увійти'}
        </button>


      </form>
    </div>
  );
}
