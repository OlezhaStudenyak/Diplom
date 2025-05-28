import React from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';

const Header = ({ user, setUser }) => {
  const history = useHistory();
  const location = useLocation();

  const handleLogout = () => {
    // Clear local storage tokens
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    
    // Clear user state
    setUser(null);
    
    // Redirect to login
    history.push('/login');
  };
  
  // Функція визначення меню в залежності від ролі користувача
  const getNavLinks = () => {
    if (!user) return [];
    
    const defaultLinks = [
      { path: '/dashboard', label: 'Панель керування' }
    ];
    
    // Додаємо посилання в залежності від ролі
    if (user.is_superuser || user.role === 'admin') {
      return [
        ...defaultLinks,
        { path: '/products', label: 'Продукти' },
        { path: '/batches', label: 'Партії' },
        { path: '/transactions', label: 'Транзакції' }
      ];
    } else if (user.role === 'warehouse') {
      return [
        ...defaultLinks,
        { path: '/products', label: 'Продукти' },
        { path: '/batches', label: 'Партії' },
        { path: '/transactions', label: 'Транзакції' }
      ];
    } else if (user.role === 'supplier') {
      return [
        ...defaultLinks,
        { path: '/products', label: 'Продукти' }
      ];
    } else if (user.role === 'logistician') {
      return [
        ...defaultLinks,
        { path: '/batches', label: 'Партії' }
      ];
    } else {
      return defaultLinks;
    }
  };
  
  const navLinks = getNavLinks();

  return (
    <header className="app-header">
      <div className="logo">
        <Link to="/">Inventory Pro</Link>
      </div>
      
      {user ? (
        <div className="header-content">
          <nav className="main-nav">
            <ul>
              {navLinks.map((link, index) => (
                <li key={index}>
                  <Link 
                    to={link.path} 
                    className={location.pathname === link.path ? 'active' : ''}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="user-menu">
            <div className="user-info">
              <span className="username">{user.username}</span>
              <span className="role-badge">{user.role_display || user.role}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">Вихід</button>
          </div>
        </div>
      ) : (
        <div className="auth-links">
          <Link to="/login">Вхід</Link>
        </div>
      )}
    </header>
  );
};

export default Header;
