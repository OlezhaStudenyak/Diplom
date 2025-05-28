import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import { getCurrentUser, isAuthenticated } from '../api';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // Перевіряємо наявність токену перед запитом
        if (!isAuthenticated()) {
          console.log('Токен автентифікації відсутній, пропускаємо запит користувача');
          setAuthError(true);
          setLoading(false);
          return;
        }
        
        console.log('Спроба отримати дані поточного користувача...');
        const response = await getCurrentUser();
        
        if (response && response.data) {
          console.log('Отримано дані користувача:', response.data);
          setUser(response.data);
        } else {
          console.warn('API повернув порожні дані користувача');
          setAuthError(true);
        }
      } catch (error) {
        console.error('Помилка отримання поточного користувача:', error);
        
        if (error.response && error.response.status === 401) {
          console.log('Помилка авторизації 401, перенаправлення на логін');
          setAuthError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);
