import React, { useEffect, useState, useRef } from 'react';
import Map, { Marker, Source, Layer, LineLayer } from 'react-map-gl';
import { Truck, MapPin, Clock, Package, CheckCircle, AlertCircle, Navigation, Phone, MessageCircle, ExternalLink } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useLogisticsStore } from '../../store/logisticsStore';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import 'mapbox-gl/dist/mapbox-gl.css';

interface TrackingData {
  orderId: string;
  orderStatus: string;
  orderDate: string;
  shippingAddress: string;
  shippingCity: string;
  totalAmount: number;
  routeId?: string;
  deliveryStatus?: string;
  deliveryStart?: string;
  estimatedDelivery?: string;
  vehiclePlate?: string;
  vehicleInfo?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  routeProgress?: number;
  currentSpeed?: number;
  lastLocationUpdate?: string;
  plannedArrival?: string;
  actualArrival?: string;
  stopStatus?: string;
}

interface EnhancedOrderTrackingProps {
  orderId: string;
  onClose: () => void;
}

const EnhancedOrderTracking: React.FC<EnhancedOrderTrackingProps> = ({ orderId, onClose }) => {
  const { simulateGPSUpdates } = useLogisticsStore();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const mapRef = useRef<any>(null);

  // Перевіряємо наявність Mapbox токена
  const hasMapboxToken = !!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  const fetchTrackingData = async () => {
    try {
      console.log('Fetching enhanced tracking data for order:', orderId);
      
      // Отримуємо основну інформацію про замовлення
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          shipping_address,
          shipping_city,
          total_amount
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        throw orderError;
      }

      if (!orderData) {
        throw new Error('Замовлення не знайдено');
      }

      console.log('Order data:', orderData);

      // Отримуємо дані про доставку з представлення
      const { data: trackingViewData, error: trackingError } = await supabase
        .from('customer_order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      console.log('Tracking view data:', trackingViewData);

      // Формуємо об'єкт з даними
      const combinedData: TrackingData = {
        orderId: orderData.id,
        orderStatus: orderData.status,
        orderDate: orderData.created_at,
        shippingAddress: orderData.shipping_address,
        shippingCity: orderData.shipping_city,
        totalAmount: orderData.total_amount,
        routeId: trackingViewData?.route_id || undefined,
        deliveryStatus: trackingViewData?.delivery_status || undefined,
        deliveryStart: trackingViewData?.delivery_start || undefined,
        estimatedDelivery: trackingViewData?.estimated_delivery || undefined,
        vehiclePlate: trackingViewData?.vehicle_plate || undefined,
        vehicleInfo: trackingViewData?.vehicle_info || undefined,
        currentLatitude: trackingViewData?.current_latitude || undefined,
        currentLongitude: trackingViewData?.current_longitude || undefined,
        routeProgress: trackingViewData?.route_progress || undefined,
        currentSpeed: trackingViewData?.current_speed || undefined,
        lastLocationUpdate: trackingViewData?.last_location_update || undefined,
        plannedArrival: trackingViewData?.planned_arrival || undefined,
        actualArrival: trackingViewData?.actual_arrival || undefined,
        stopStatus: trackingViewData?.stop_status || undefined,
      };

      console.log('Combined tracking data:', combinedData);
      setTrackingData(combinedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError(err instanceof Error ? err.message : 'Помилка завантаження даних відстеження');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchTrackingData();
    fetchNotifications();

    // Оновлюємо дані кожні 5 секунд
    const interval = setInterval(() => {
      fetchTrackingData();
      // ДОДАЄМО ВИКЛИК GPS СИМУЛЯЦІЇ
      simulateGPSUpdates();
    }, 5000);

    // Підписка на реальні оновлення
    const channel = supabase
      .channel('enhanced-order-tracking')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_locations',
      }, () => {
        console.log('Vehicle location updated, refreshing tracking data');
        fetchTrackingData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, () => {
        console.log('Order updated, refreshing tracking data');
        fetchTrackingData();
        fetchNotifications();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_routes',
      }, () => {
        console.log('Delivery route updated, refreshing tracking data');
        fetchTrackingData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `order_id=eq.${orderId}`,
      }, () => {
        console.log('New notification received');
        fetchNotifications();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [orderId, simulateGPSUpdates]);

  // Автоматично центруємо карту на поточній позиції транспорту
  useEffect(() => {
    if (trackingData?.currentLatitude && trackingData?.currentLongitude && mapRef.current && hasMapboxToken) {
      mapRef.current.flyTo({
        center: [trackingData.currentLongitude, trackingData.currentLatitude],
        zoom: 14,
        duration: 1000
      });
    }
  }, [trackingData?.currentLatitude, trackingData?.currentLongitude, hasMapboxToken]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'primary';
      case 'processing': return 'accent';
      case 'shipped': return 'accent';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Очікує підтвердження';
      case 'confirmed': return 'Підтверджено';
      case 'processing': return 'В обробці';
      case 'shipped': return 'Відправлено';
      case 'delivered': return 'Доставлено';
      case 'cancelled': return 'Скасовано';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={24} className="text-success-600" />;
      case 'shipped': return <Truck size={24} className="text-accent-600" />;
      case 'confirmed': return <Package size={24} className="text-primary-600" />;
      case 'processing': return <Package size={24} className="text-accent-600" />;
      case 'cancelled': return <AlertCircle size={24} className="text-error-600" />;
      default: return <Clock size={24} className="text-warning-600" />;
    }
  };

  const getProgressSteps = () => {
    const steps = [
      { key: 'pending', label: 'Замовлення створено', completed: true },
      { key: 'confirmed', label: 'Підтверджено', completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(trackingData?.orderStatus || '') },
      { key: 'processing', label: 'Готується до відправки', completed: ['processing', 'shipped', 'delivered'].includes(trackingData?.orderStatus || '') },
      { key: 'shipped', label: 'Відправлено', completed: ['shipped', 'delivered'].includes(trackingData?.orderStatus || '') },
      { key: 'delivered', label: 'Доставлено', completed: trackingData?.orderStatus === 'delivered' },
    ];
    return steps;
  };

  const openInGoogleMaps = () => {
    if (trackingData?.currentLatitude && trackingData?.currentLongitude) {
      const url = `https://www.google.com/maps?q=${trackingData.currentLatitude},${trackingData.currentLongitude}`;
      window.open(url, '_blank');
    }
  };

  const routeLayer: LineLayer = {
    id: 'route',
    type: 'line',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#F97316',
      'line-width': 4,
      'line-opacity': 0.8
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-6 bg-neutral-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-32"></div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">✕</button>
        </div>
        <Card className="animate-pulse">
          <div className="h-96 bg-neutral-100 rounded"></div>
        </Card>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <Card>
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-error-400 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            Помилка завантаження
          </h3>
          <p className="text-neutral-600 mb-4">
            {error || 'Не вдалося завантажити дані відстеження'}
          </p>
          <button
            onClick={onClose}
            className="text-primary-600 hover:text-primary-700"
          >
            Закрити
          </button>
        </div>
      </Card>
    );
  }

  const hasActiveDelivery = trackingData.routeId && trackingData.currentLatitude && trackingData.currentLongitude;
  const isShippedOrDelivered = trackingData.orderStatus === 'shipped' || trackingData.orderStatus === 'delivered';
  const shortOrderId = trackingData.orderId ? trackingData.orderId.slice(0, 8) : 'N/A';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Заголовок з кнопками дій */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-neutral-900">
            Відстеження замовлення
          </h2>
          <p className="text-neutral-600">
            Замовлення #{shortOrderId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-neutral-600 hover:text-primary-600 transition-colors"
          >
            <MessageCircle size={20} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-xl"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Прогрес замовлення */}
      <Card>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900">Статус замовлення</h3>
            <Badge variant={getStatusBadgeVariant(trackingData.orderStatus)} size="lg">
              {getStatusLabel(trackingData.orderStatus)}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between mb-6">
            {getProgressSteps().map((step, index) => (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                  ${step.completed 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-neutral-200 text-neutral-500'
                  }
                `}>
                  {step.completed ? <CheckCircle size={20} /> : <div className="w-3 h-3 rounded-full bg-current" />}
                </div>
                <span className={`text-xs text-center ${step.completed ? 'text-primary-600 font-medium' : 'text-neutral-500'}`}>
                  {step.label}
                </span>
                {index < getProgressSteps().length - 1 && (
                  <div className={`
                    absolute h-0.5 w-full top-5 left-1/2 transform -translate-y-1/2 z-0
                    ${step.completed ? 'bg-primary-600' : 'bg-neutral-200'}
                  `} style={{ width: `calc(100% / ${getProgressSteps().length - 1})` }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">Адреса доставки:</span>
            <p className="font-medium">
              {trackingData.shippingAddress || 'Не вказано'}, {trackingData.shippingCity || 'Не вказано'}
            </p>
          </div>
          <div>
            <span className="text-neutral-500">Сума замовлення:</span>
            <p className="font-medium">₴{(trackingData.totalAmount || 0).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-neutral-500">Дата замовлення:</span>
            <p className="font-medium">
              {trackingData.orderDate ? format(new Date(trackingData.orderDate), 'dd MMMM yyyy, HH:mm', { locale: uk }) : 'Невідомо'}
            </p>
          </div>
        </div>
      </Card>

      {/* Інформація про доставку */}
      {trackingData.routeId && (
        <Card title="Інформація про доставку">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
            {trackingData.vehiclePlate && (
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-accent-600" />
                <div>
                  <span className="text-neutral-500">Транспорт:</span>
                  <p className="font-medium">{trackingData.vehiclePlate}</p>
                  {trackingData.vehicleInfo && (
                    <p className="text-xs text-neutral-600">{trackingData.vehicleInfo}</p>
                  )}
                </div>
              </div>
            )}
            
            {trackingData.estimatedDelivery && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary-600" />
                <div>
                  <span className="text-neutral-500">Очікуваний час:</span>
                  <p className="font-medium">
                    {format(new Date(trackingData.estimatedDelivery), 'HH:mm', { locale: uk })}
                  </p>
                </div>
              </div>
            )}
            
            {trackingData.routeProgress !== undefined && (
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-success-600" />
                <div>
                  <span className="text-neutral-500">Прогрес:</span>
                  <p className="font-medium">{Math.round(trackingData.routeProgress * 100)}%</p>
                </div>
              </div>
            )}
            
            {trackingData.currentSpeed && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-accent-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <span className="text-neutral-500">Швидкість:</span>
                  <p className="font-medium">{Math.round(trackingData.currentSpeed)} км/год</p>
                </div>
              </div>
            )}
          </div>

          {/* Прогрес бар доставки */}
          {trackingData.routeProgress !== undefined && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-neutral-600 mb-2">
                <span>Склад</span>
                <span>{Math.round(trackingData.routeProgress * 100)}% завершено</span>
                <span>Ваша адреса</span>
              </div>
              <div className="bg-neutral-200 rounded-full h-3 relative overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-accent-500 to-accent-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${trackingData.routeProgress * 100}%` }}
                >
                  <div className="absolute right-0 top-0 h-full w-1 bg-white opacity-50 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Карта відстеження або альтернативний контент */}
      {hasActiveDelivery && (
        <Card title="Відстеження в реальному часі">
          {hasMapboxToken ? (
            <div className="h-96 rounded-lg overflow-hidden relative">
              <Map
                ref={mapRef}
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                initialViewState={{
                  longitude: trackingData.currentLongitude,
                  latitude: trackingData.currentLatitude,
                  zoom: 13
                }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
              >
                {/* Поточна позиція транспорту */}
                <Marker
                  longitude={trackingData.currentLongitude}
                  latitude={trackingData.currentLatitude}
                  anchor="center"
                >
                  <div className="relative">
                    <div className="bg-accent-600 p-3 rounded-full shadow-lg animate-pulse">
                      <Truck size={24} className="text-white" />
                    </div>
                    {trackingData.currentSpeed && (
                      <div className="absolute -top-2 -right-2 bg-success-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        {Math.round(trackingData.currentSpeed)} км/год
                      </div>
                    )}
                  </div>
                </Marker>

                {/* Пункт призначення */}
                <Marker
                  longitude={trackingData.currentLongitude + 0.01}
                  latitude={trackingData.currentLatitude + 0.01}
                  anchor="bottom"
                >
                  <div className="bg-success-600 p-2 rounded-lg shadow-lg">
                    <MapPin size={20} className="text-white" />
                  </div>
                </Marker>
              </Map>

              {/* Оверлей з інформацією */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Транспорт в дорозі</span>
                </div>
                {trackingData.lastLocationUpdate && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Останнє оновлення: {format(new Date(trackingData.lastLocationUpdate), 'HH:mm:ss', { locale: uk })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            // Альтернативний контент без карти
            <div className="h-96 bg-gradient-to-br from-primary-50 to-accent-50 rounded-lg flex flex-col items-center justify-center p-8">
              <div className="text-center mb-6">
                <div className="bg-accent-600 p-4 rounded-full shadow-lg mb-4 animate-pulse">
                  <Truck size={32} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Транспорт {trackingData.vehiclePlate} в дорозі
                </h3>
                <p className="text-neutral-600">
                  Ваше замовлення доставляється за адресою: {trackingData.shippingAddress}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 text-center mb-6">
                <div>
                  <div className="text-2xl font-bold text-accent-600">
                    {Math.round((trackingData.routeProgress || 0) * 100)}%
                  </div>
                  <div className="text-sm text-neutral-600">Прогрес маршруту</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary-600">
                    {trackingData.currentSpeed ? `${Math.round(trackingData.currentSpeed)} км/год` : '—'}
                  </div>
                  <div className="text-sm text-neutral-600">Поточна швидкість</div>
                </div>
              </div>

              {trackingData.currentLatitude && trackingData.currentLongitude && (
                <Button
                  variant="secondary"
                  icon={<ExternalLink size={16} />}
                  onClick={openInGoogleMaps}
                >
                  Відкрити в Google Maps
                </Button>
              )}

              {trackingData.lastLocationUpdate && (
                <p className="text-xs text-neutral-500 mt-4">
                  Останнє оновлення: {format(new Date(trackingData.lastLocationUpdate), 'HH:mm:ss', { locale: uk })}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Сповіщення */}
      {showNotifications && (
        <Card title="Сповіщення про замовлення">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-neutral-500 text-center py-4">Немає сповіщень</p>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    !notification.read ? 'bg-primary-50 border-primary-200' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-neutral-900">{notification.title}</h4>
                      <p className="text-sm text-neutral-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-neutral-500 mt-2">
                        {format(new Date(notification.created_at), 'dd MMM, HH:mm', { locale: uk })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Повідомлення для замовлень без активної доставки */}
      {!hasActiveDelivery && !isShippedOrDelivered && (
        <Card>
          <div className="text-center py-8">
            <Package size={48} className="mx-auto text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Очікування відправки
            </h3>
            <p className="text-neutral-600">
              Ваше замовлення готується до відправки. 
              Відстеження в реальному часі буде доступне після відправки.
            </p>
          </div>
        </Card>
      )}

      {/* Повідомлення для відправлених замовлень без GPS */}
      {!hasActiveDelivery && isShippedOrDelivered && trackingData.orderStatus !== 'delivered' && (
        <Card>
          <div className="text-center py-8">
            <Truck size={48} className="mx-auto text-accent-400 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Замовлення в дорозі
            </h3>
            <p className="text-neutral-600">
              Ваше замовлення відправлено та знаходиться в дорозі. 
              GPS відстеження буде доступне найближчим часом.
            </p>
            {trackingData.estimatedDelivery && (
              <p className="text-sm text-neutral-500 mt-2">
                Очікуваний час доставки: {format(new Date(trackingData.estimatedDelivery), 'dd MMMM yyyy, HH:mm', { locale: uk })}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Повідомлення для доставлених замовлень */}
      {trackingData.orderStatus === 'delivered' && (
        <Card>
          <div className="text-center py-8">
            <CheckCircle size={48} className="mx-auto text-success-500 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Замовлення доставлено!
            </h3>
            <p className="text-neutral-600">
              Ваше замовлення успішно доставлено за адресою: {trackingData.shippingAddress}
            </p>
            {trackingData.actualArrival && (
              <p className="text-sm text-neutral-500 mt-2">
                Час доставки: {format(new Date(trackingData.actualArrival), 'dd MMMM yyyy, HH:mm', { locale: uk })}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EnhancedOrderTracking;