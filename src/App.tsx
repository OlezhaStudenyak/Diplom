import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import ProductsPage from './pages/ProductsPage';
import WarehousePage from './pages/WarehousePage';
import LogisticsPage from './pages/LogisticsPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import StaffOrdersPage from './pages/StaffOrdersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';
import RealTimeNotifications from './components/notifications/RealTimeNotifications';
import { useAuthStore } from './store/authStore';
import { useNotificationStore } from './store/notificationStore';

const App: React.FC = () => {
  const { initialized, initializeAuth, user } = useAuthStore();
  const { subscribeToNotifications } = useNotificationStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    };

    initApp();
  }, [initializeAuth]);

  useEffect(() => {
    if (user) {
      try {
        const unsubscribe = subscribeToNotifications();
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Failed to subscribe to notifications:', error);
      }
    }
  }, [user, subscribeToNotifications]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-neutral-600">Ініціалізація додатку...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <ErrorBoundary>
              <LoginPage />
            </ErrorBoundary>
          } />
          <Route path="/signup" element={
            <ErrorBoundary>
              <SignupPage />
            </ErrorBoundary>
          } />
          
          <Route path="/" element={
            <ErrorBoundary>
              <Layout />
            </ErrorBoundary>
          }>
            <Route index element={
              <ErrorBoundary>
                {user?.role === 'customer' 
                  ? <CustomerDashboardPage />
                  : <DashboardPage />
                }
              </ErrorBoundary>
            } />
            
            <Route path="products" element={
              <ErrorBoundary>
                <ProductsPage />
              </ErrorBoundary>
            } />
            
            <Route path="warehouses" element={
              <ErrorBoundary>
                <ProtectedRoute allowedRoles={['admin', 'warehouse_worker', 'manager']}>
                  <WarehousePage />
                </ProtectedRoute>
              </ErrorBoundary>
            } />
            
            <Route path="logistics" element={
              <ErrorBoundary>
                <ProtectedRoute allowedRoles={['admin', 'logistician', 'manager', 'driver']}>
                  <LogisticsPage />
                </ProtectedRoute>
              </ErrorBoundary>
            } />
            
            <Route path="orders" element={
              <ErrorBoundary>
                {user?.role === 'customer'
                  ? <CustomerOrdersPage />
                  : <StaffOrdersPage />
                }
              </ErrorBoundary>
            } />
            
            <Route path="reports" element={
              <ErrorBoundary>
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <ReportsPage />
                </ProtectedRoute>
              </ErrorBoundary>
            } />
            
            <Route path="settings" element={
              <ErrorBoundary>
                <SettingsPage />
              </ErrorBoundary>
            } />
          </Route>
          
          <Route path="*" element={<Navigate to="/\" replace />} />
        </Routes>
        
        {/* Компонент для відображення сповіщень в реальному часі */}
        {user && <RealTimeNotifications />}
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;