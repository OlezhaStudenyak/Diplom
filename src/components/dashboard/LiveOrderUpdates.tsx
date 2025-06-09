import React, { useEffect, useState } from 'react';
import { Truck, Package, Clock, MapPin, Bell } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useLogisticsStore } from '../../store/logisticsStore';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface LiveUpdate {
  orderId: string;
  orderStatus: string;
  vehiclePlate?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  routeProgress?: number;
  estimatedDelivery?: string;
  lastUpdate: string;
  message: string;
}

const LiveOrderUpdates: React.FC = () => {
  const { user } = useAuthStore();
  const { simulateGPSUpdates } = useLogisticsStore();
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveUpdates = async () => {
    if (!user || user.role !== 'customer') return;

    try {
      // Отримуємо активні замовлення користувача з відстеженням
      const { data, error } = await supabase
        .from('customer_order_tracking')
        .select('*')
        .eq('order_status', 'shipped')
        .order('order_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      const updates: LiveUpdate[] = (data || []).map(item => {
        let message = '';
        const progress = Math.round((item.route_progress || 0) * 100);
        
        if (progress < 25) {
          message = `Транспорт ${item.vehicle_plate} виїхав зі складу`;
        } else if (progress < 75) {
          message = `Транспорт ${item.vehicle_plate} в дорозі (${progress}% маршруту)`;
        } else {
          message = `Транспорт ${item.vehicle_plate} наближається до вас`;
        }

        return {
          orderId: item.order_id,
          orderStatus: item.order_status,
          vehiclePlate: item.vehicle_plate,
          currentLatitude: item.current_latitude,
          currentLongitude: item.current_longitude,
          routeProgress: item.route_progress,
          estimatedDelivery: item.estimated_delivery,
          lastUpdate: item.last_location_update || new Date().toISOString(),
          message
        };
      });

      setLiveUpdates(updates);
    } catch (error) {
      console.error('Error fetching live updates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveUpdates();

    // Оновлюємо дані кожні 10 секунд
    const interval = setInterval(() => {
      fetchLiveUpdates();
      // ДОДАЄМО ВИКЛИК GPS СИМУЛЯЦІЇ
      simulateGPSUpdates();
    }, 10000);

    // Підписка на реальні оновлення
    const channel = supabase
      .channel('live-order-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_locations',
      }, () => {
        fetchLiveUpdates();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, () => {
        fetchLiveUpdates();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, simulateGPSUpdates]);

  if (loading) {
    return (
      <Card title="Оновлення доставок\" className="animate-pulse">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-neutral-100 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (liveUpdates.length === 0) {
    return (
      <Card title="Оновлення доставок">
        <div className="text-center py-8">
          <Package size={32} className="mx-auto text-neutral-400 mb-2" />
          <p className="text-neutral-600 text-sm">
            Немає активних доставок
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Оновлення доставок" 
      headerAction={
        <div className="flex items-center gap-1 text-success-600">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium">В реальному часі</span>
        </div>
      }
    >
      <div className="space-y-4">
        {liveUpdates.map((update) => (
          <div 
            key={update.orderId}
            className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg border border-primary-100"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-accent-600" />
                <span className="font-medium text-neutral-900">
                  Замовлення #{update.orderId.slice(0, 8)}
                </span>
              </div>
              <Badge variant="accent" size="sm">
                В дорозі
              </Badge>
            </div>
            
            <p className="text-sm text-neutral-700 mb-3">
              {update.message}
            </p>
            
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <div className="flex items-center gap-4">
                {update.routeProgress && (
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>{Math.round(update.routeProgress * 100)}% маршруту</span>
                  </div>
                )}
                {update.estimatedDelivery && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>
                      Прибуття: {format(new Date(update.estimatedDelivery), 'HH:mm')}
                    </span>
                  </div>
                )}
              </div>
              <span>
                {format(new Date(update.lastUpdate), 'HH:mm:ss', { locale: uk })}
              </span>
            </div>
            
            {/* Прогрес бар */}
            {update.routeProgress && (
              <div className="mt-3 bg-neutral-200 rounded-full h-1.5">
                <div 
                  className="bg-gradient-to-r from-accent-500 to-accent-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${update.routeProgress * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default LiveOrderUpdates;