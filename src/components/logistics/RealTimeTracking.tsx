import React, { useEffect, useState, useRef } from 'react';
import Map, { Marker, Source, Layer, LineLayer } from 'react-map-gl';
import { Truck, MapPin, Clock, Route, Package } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { useLogisticsStore } from '../../store/logisticsStore';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ActiveDelivery {
  routeId: string;
  orderId: string;
  vehicleId: string;
  vehiclePlate: string;
  customerAddress: string;
  estimatedArrival: string;
  progress: number;
  currentLocation: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
  };
  routeGeometry?: any;
  status: string;
}

const RealTimeTracking: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [viewport, setViewport] = useState({
    latitude: 50.4501,
    longitude: 30.5234,
    zoom: 11
  });

  useEffect(() => {
    if (mapContainerRef.current) {
      setMapReady(true);
    }
  }, []);

  // Завантаження активних доставок
  const fetchActiveDeliveries = async () => {
    try {
      const { data: routes, error } = await supabase
        .from('delivery_routes')
        .select(`
          id,
          vehicle_id,
          status,
          simulation_end_time,
          route_geometry,
          vehicles!inner(license_plate),
          delivery_stops!inner(
            order_id,
            address,
            planned_arrival,
            orders!inner(
              shipping_address,
              shipping_city
            )
          )
        `)
        .eq('simulation_active', true)
        .eq('status', 'in_progress');

      if (error) throw error;

      // Отримуємо поточні локації транспорту
      const vehicleIds = routes?.map(r => r.vehicle_id) || [];
      const { data: locations, error: locError } = await supabase
        .from('vehicle_locations')
        .select('*')
        .in('vehicle_id', vehicleIds);

      if (locError) throw locError;

      const deliveries: ActiveDelivery[] = routes?.map(route => {
        const location = locations?.find(l => l.vehicle_id === route.vehicle_id);
        const stop = route.delivery_stops[0];
        
        return {
          routeId: route.id,
          orderId: stop.order_id,
          vehicleId: route.vehicle_id,
          vehiclePlate: route.vehicles.license_plate,
          customerAddress: `${stop.orders.shipping_address}, ${stop.orders.shipping_city}`,
          estimatedArrival: stop.planned_arrival,
          progress: location?.route_progress || 0,
          currentLocation: {
            latitude: location?.latitude || 50.4501,
            longitude: location?.longitude || 30.5234,
            speed: location?.speed,
            heading: location?.heading
          },
          routeGeometry: route.route_geometry,
          status: route.status
        };
      }) || [];

      setActiveDeliveries(deliveries);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Симуляція GPS оновлень
  const simulateGPSUpdates = async () => {
    try {
      const { error } = await supabase.rpc('schedule_gps_updates');
      if (error) throw error;
    } catch (error) {
      console.error('Error simulating GPS updates:', error);
    }
  };

  useEffect(() => {
    fetchActiveDeliveries();
    
    // Оновлюємо дані кожні 5 секунд
    const interval = setInterval(() => {
      fetchActiveDeliveries();
      simulateGPSUpdates();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Підписка на реальні оновлення
  useEffect(() => {
    const channel = supabase
      .channel('vehicle-tracking')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_locations',
      }, () => {
        fetchActiveDeliveries();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_routes',
      }, () => {
        fetchActiveDeliveries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'planned': return 'warning';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'В дорозі';
      case 'completed': return 'Доставлено';
      case 'planned': return 'Заплановано';
      default: return status;
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
      'line-color': '#1E40AF',
      'line-width': 3,
      'line-opacity': 0.7
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-[600px] bg-neutral-100 rounded"></div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div ref={mapContainerRef} className="h-[600px] relative">
          {mapReady && (
            <Map
              mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
              initialViewState={viewport}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              style={{ width: '100%', height: '100%' }}
            >
              {/* Відображаємо маршрути */}
              {activeDeliveries.map(delivery => {
                if (!delivery.routeGeometry) return null;
                
                return (
                  <Source
                    key={`route-${delivery.routeId}`}
                    type="geojson"
                    data={{
                      type: 'Feature',
                      geometry: delivery.routeGeometry,
                      properties: {}
                    }}
                  >
                    <Layer {...routeLayer} />
                  </Source>
                );
              })}

              {/* Відображаємо транспорт */}
              {activeDeliveries.map(delivery => (
                <Marker
                  key={delivery.vehicleId}
                  longitude={delivery.currentLocation.longitude}
                  latitude={delivery.currentLocation.latitude}
                  anchor="center"
                  onClick={() => setSelectedDelivery(
                    selectedDelivery === delivery.routeId ? null : delivery.routeId
                  )}
                >
                  <div 
                    className="bg-primary-600 p-2 rounded-lg shadow-lg cursor-pointer hover:bg-primary-700 transition-colors relative"
                    style={{
                      transform: delivery.currentLocation.heading 
                        ? `rotate(${delivery.currentLocation.heading}deg)` 
                        : undefined
                    }}
                  >
                    <Truck size={20} className="text-white" />
                    {delivery.currentLocation.speed && (
                      <div className="absolute -top-2 -right-2 bg-success-500 text-white text-xs px-1 rounded">
                        {Math.round(delivery.currentLocation.speed)}
                      </div>
                    )}
                  </div>
                </Marker>
              ))}

              {/* Відображаємо пункти призначення */}
              {activeDeliveries.map(delivery => {
                if (!delivery.routeGeometry?.coordinates?.[1]) return null;
                
                const [lng, lat] = delivery.routeGeometry.coordinates[1];
                
                return (
                  <Marker
                    key={`destination-${delivery.routeId}`}
                    longitude={lng}
                    latitude={lat}
                    anchor="bottom"
                  >
                    <div className="bg-error-600 p-2 rounded-lg shadow-lg">
                      <MapPin size={16} className="text-white" />
                    </div>
                  </Marker>
                );
              })}
            </Map>
          )}

          {/* Панель з активними доставками */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm w-full max-h-96 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Route size={20} className="text-primary-600" />
              <h3 className="font-semibold text-neutral-900">
                Активні доставки ({activeDeliveries.length})
              </h3>
            </div>
            
            <div className="space-y-3">
              {activeDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={32} className="mx-auto text-neutral-400 mb-2" />
                  <p className="text-sm text-neutral-600">
                    Немає активних доставок
                  </p>
                </div>
              ) : (
                activeDeliveries.map(delivery => (
                  <div 
                    key={delivery.routeId}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDelivery === delivery.routeId
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                    onClick={() => {
                      setSelectedDelivery(
                        selectedDelivery === delivery.routeId ? null : delivery.routeId
                      );
                      setViewport({
                        latitude: delivery.currentLocation.latitude,
                        longitude: delivery.currentLocation.longitude,
                        zoom: 14
                      });
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {delivery.vehiclePlate}
                      </span>
                      <Badge 
                        variant={getStatusBadgeVariant(delivery.status)} 
                        size="sm"
                      >
                        {getStatusLabel(delivery.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-neutral-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span className="truncate">{delivery.customerAddress}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>
                          Прибуття: {format(new Date(delivery.estimatedArrival), 'HH:mm')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Route size={12} />
                        <span>Прогрес: {Math.round(delivery.progress * 100)}%</span>
                      </div>
                      
                      {delivery.currentLocation.speed && (
                        <div className="flex items-center gap-1">
                          <Truck size={12} />
                          <span>Швидкість: {Math.round(delivery.currentLocation.speed)} км/год</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Прогрес бар */}
                    <div className="mt-2 bg-neutral-200 rounded-full h-1.5">
                      <div 
                        className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${delivery.progress * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RealTimeTracking;