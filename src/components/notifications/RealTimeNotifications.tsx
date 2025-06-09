import React, { useEffect, useState } from 'react';
import { Bell, Truck, Package, CheckCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface RealTimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string;
  createdAt: Date;
  read: boolean;
}

const RealTimeNotifications: React.FC = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [showToast, setShowToast] = useState<RealTimeNotification | null>(null);

  useEffect(() => {
    if (!user) return;

    // Підписка на нові сповіщення
    const channel = supabase
      .channel('real-time-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotification: RealTimeNotification = {
          id: payload.new.id,
          type: payload.new.type,
          title: payload.new.title,
          message: payload.new.message,
          orderId: payload.new.order_id,
          createdAt: new Date(payload.new.created_at),
          read: payload.new.read
        };

        setNotifications(prev => [newNotification, ...prev]);
        
        // Показуємо toast сповіщення
        setShowToast(newNotification);
        
        // Автоматично приховуємо toast через 5 секунд
        setTimeout(() => {
          setShowToast(null);
        }, 5000);

        // Відтворюємо звук сповіщення (якщо дозволено)
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Ігноруємо помилки відтворення звуку
          });
        } catch (error) {
          // Ігноруємо помилки створення аудіо
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_status_change':
        return <Package size={20} className="text-primary-600" />;
      case 'delivery_completed':
        return <CheckCircle size={20} className="text-success-600" />;
      case 'delivery_update':
        return <Truck size={20} className="text-accent-600" />;
      default:
        return <Bell size={20} className="text-neutral-600" />;
    }
  };

  const dismissToast = () => {
    setShowToast(null);
  };

  if (!showToast) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-lg shadow-lg border border-neutral-200 p-4 transform transition-all duration-300 ease-in-out animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(showToast.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-medium text-neutral-900 truncate">
                {showToast.title}
              </h4>
              <button
                onClick={dismissToast}
                className="flex-shrink-0 ml-2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={16} />
              </button>
            </div>
            
            <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
              {showToast.message}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-500">
                {format(showToast.createdAt, 'HH:mm', { locale: uk })}
              </span>
              
              {showToast.orderId && (
                <span className="text-xs text-primary-600 bg-primary-100 px-2 py-1 rounded">
                  #{showToast.orderId.slice(0, 8)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Прогрес бар для автоматичного приховування */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-100">
          <div 
            className="h-full bg-primary-500 transition-all duration-5000 ease-linear"
            style={{ 
              animation: 'progress 5s linear forwards',
              width: '0%'
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default RealTimeNotifications;