import React, { useEffect } from 'react';
import { Bell, Package, Truck, CheckCircle } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const { 
    notifications, 
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    subscribeToNotifications
  } = useNotificationStore();

  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications();
    return () => {
      unsubscribe();
    };
  }, [subscribeToNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_status_change':
        return <Package size={16} className="text-primary-600" />;
      case 'delivery_completed':
        return <CheckCircle size={16} className="text-success-600" />;
      case 'success':
        return <CheckCircle size={16} className="text-success-600" />;
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return <Truck size={16} className="text-accent-600" />;
    }
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        className="p-1.5 rounded-full hover:bg-neutral-100 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} className="text-neutral-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs text-white bg-error-500 rounded-full transform translate-x-1/4 -translate-y-1/4">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 z-50 mt-2 w-96 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden">
            <div className="p-4 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900">
                  Сповіщення {unreadCount > 0 && `(${unreadCount})`}
                </h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      className="text-sm text-primary-600 hover:text-primary-700"
                      onClick={markAllAsRead}
                    >
                      Позначити всі
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      className="text-sm text-neutral-600 hover:text-neutral-700"
                      onClick={clearAll}
                    >
                      Очистити
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-neutral-500 mt-2">Завантаження...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <Bell size={32} className="mx-auto text-neutral-300 mb-2" />
                  <p>Немає сповіщень</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-neutral-900">
                              {notification.title}
                            </p>
                            <button
                              className="text-neutral-400 hover:text-neutral-600 ml-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-neutral-500">
                              {format(notification.createdAt, 'dd MMM, HH:mm', { locale: uk })}
                            </p>
                            {notification.orderId && (
                              <span className="text-xs text-primary-600 bg-primary-100 px-2 py-1 rounded">
                                #{notification.orderId.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;