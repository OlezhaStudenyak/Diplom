import React from 'react';
import { Link } from 'react-router-dom';
const NotFound = ({ message = 'Сторінку не знайдено' }) => {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>{message}</p>
      <Link to="/dashboard" className="back-link">Повернутися на головну</Link>
    </div>
  );
};

export default NotFound;
