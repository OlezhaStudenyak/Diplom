import React, { useEffect, useState, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import { Truck, MapPin } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { useLogisticsStore } from '../../store/logisticsStore';
import { format } from 'date-fns';
import RealTimeTracking from './RealTimeTracking';
import 'mapbox-gl/dist/mapbox-gl.css';

interface RouteTrackingProps {
  routeId?: string;
}

const RouteTracking: React.FC<RouteTrackingProps> = ({ routeId }) => {
  const [activeTab, setActiveTab] = useState<'realtime' | 'overview'>('realtime');

  const { 
    routes, 
    vehicles,
    vehicleLocations,
    loading
  } = useLogisticsStore();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'planned': return 'warning';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned': return 'Заплановано';
      case 'in_progress': return 'В процесі';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Скасовано';
      default: return status;
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
      {/* Вкладки */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex gap-4">
          <button
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'realtime'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
            `}
            onClick={() => setActiveTab('realtime')}
          >
            Відстеження в реальному часі
          </button>
          <button
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
            `}
            onClick={() => setActiveTab('overview')}
          >
            Огляд маршрутів
          </button>
        </nav>
      </div>

      {/* Контент */}
      {activeTab === 'realtime' ? (
        <RealTimeTracking />
      ) : (
        <Card title="Огляд всіх маршрутів">
          <div className="space-y-4">
            {routes.length === 0 ? (
              <div className="text-center py-12">
                <Truck size={48} className="mx-auto text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Немає маршрутів
                </h3>
                <p className="text-neutral-600">
                  Маршрути будуть створюватися автоматично при підтвердженні замовлень
                </p>
              </div>
            ) : (
              routes.map(route => {
                const vehicle = vehicles.find(v => v.id === route.vehicleId);
                const location = vehicleLocations[route.vehicleId || ''];
                
                return (
                  <div 
                    key={route.id}
                    className="p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Truck size={20} className="text-primary-600" />
                        <div>
                          <h4 className="font-medium text-neutral-900">
                            {vehicle?.licensePlate || 'Невідомий транспорт'}
                          </h4>
                          <p className="text-sm text-neutral-600">
                            Маршрут #{route.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={getStatusBadgeVariant(route.status)} 
                        size="sm"
                      >
                        {getStatusLabel(route.status)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-500">Початок:</span>
                        <p className="font-medium">
                          {format(new Date(route.startTime), 'dd.MM.yyyy HH:mm')}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-neutral-500">Зупинки:</span>
                        <p className="font-medium">{route.totalStops}</p>
                      </div>
                      
                      <div>
                        <span className="text-neutral-500">Відстань:</span>
                        <p className="font-medium">{route.totalDistance} км</p>
                      </div>
                      
                      {location && (
                        <div>
                          <span className="text-neutral-500">Прогрес:</span>
                          <p className="font-medium">
                            {Math.round((location.route_progress || 0) * 100)}%
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {route.notes && (
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <p className="text-sm text-neutral-600">{route.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RouteTracking;