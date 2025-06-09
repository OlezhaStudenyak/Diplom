import React, { useState, useEffect } from 'react';
import { useLogisticsStore } from '../store/logisticsStore';
import { useAuthStore } from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import VehicleForm from '../components/logistics/VehicleForm';
import RouteForm from '../components/logistics/RouteForm';
import RouteTracking from '../components/logistics/RouteTracking';
import { Plus, Search, MapPin } from 'lucide-react';
import Input from '../components/ui/Input';
import { format } from 'date-fns';

const LogisticsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    vehicles, 
    routes,
    loading, 
    fetchVehicles,
    fetchRoutes,
    fetchVehicleLocations,
    subscribeToVehicleLocations
  } = useLogisticsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'tracking' | 'vehicles' | 'routes'>('tracking');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchVehicles(),
          fetchRoutes(),
          fetchVehicleLocations()
        ]);

        // Set up real-time subscription after initial data fetch
        const unsubscribe = subscribeToVehicleLocations();
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing logistics data:', error);
      }
    };

    initializeData();
  }, []); // Empty dependency array to run only on mount

  const handleVehicleModalClose = () => {
    setIsVehicleModalOpen(false);
    setSelectedVehicle(null);
    fetchVehicles();
  };

  const handleRouteModalClose = () => {
    setIsRouteModalOpen(false);
    setSelectedRoute(null);
    fetchRoutes();
  };

  const getVehicleStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      available: { variant: 'success', label: 'Доступний' },
      in_delivery: { variant: 'primary', label: 'У дорозі' },
      maintenance: { variant: 'warning', label: 'На обслуговуванні' },
      out_of_service: { variant: 'error', label: 'Не працює' }
    };

    const statusInfo = variants[status] || { variant: 'neutral', label: status };
    return (
      <Badge variant={statusInfo.variant} size="sm">
        {statusInfo.label}
      </Badge>
    );
  };

  const getRouteStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      planned: { variant: 'warning', label: 'Заплановано' },
      in_progress: { variant: 'primary', label: 'В процесі' },
      completed: { variant: 'success', label: 'Завершено' },
      cancelled: { variant: 'error', label: 'Скасовано' }
    };

    const statusInfo = variants[status] || { variant: 'neutral', label: status };
    return (
      <Badge variant={statusInfo.variant} size="sm">
        {statusInfo.label}
      </Badge>
    );
  };

  const vehicleHeaders = [
    { key: 'license_plate', label: 'Номерний знак' },
    { key: 'model', label: 'Модель' },
    { key: 'capacity', label: 'Вантажопідйомність' },
    { key: 'status', label: 'Статус' },
    { key: 'last_maintenance', label: 'Останнє ТО' },
  ];

  const routeHeaders = [
    { key: 'vehicle', label: 'Транспорт' },
    { key: 'driver', label: 'Водій' },
    { key: 'status', label: 'Статус' },
    { key: 'stops', label: 'Зупинки' },
    { key: 'start_time', label: 'Початок' },
  ];

  const renderVehicleRow = (vehicle: any) => [
    <div className="font-medium text-neutral-900">{vehicle.licensePlate}</div>,
    <div className="text-neutral-600">{vehicle.make} {vehicle.model}</div>,
    <div className="text-neutral-600">{vehicle.capacity} кг</div>,
    getVehicleStatusBadge(vehicle.status),
    <div className="text-neutral-600">
      {vehicle.lastMaintenanceDate 
        ? format(new Date(vehicle.lastMaintenanceDate), 'dd.MM.yyyy')
        : 'Не проводилось'}
    </div>,
  ];

  const renderRouteRow = (route: any) => [
    <div className="font-medium text-neutral-900">
      {vehicles.find(v => v.id === route.vehicleId)?.licensePlate || 'Не призначено'}
    </div>,
    <div className="text-neutral-600">
      {route.driver?.firstName} {route.driver?.lastName}
    </div>,
    getRouteStatusBadge(route.status),
    <div className="text-neutral-600">{route.totalStops} зупинок</div>,
    <div className="text-neutral-600">
      {format(new Date(route.startTime), 'dd.MM.yyyy HH:mm')}
    </div>,
  ];

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">
            Логістика
          </h1>
          <p className="text-neutral-500 mt-1">
            Управління транспортом та маршрутами доставки
          </p>
        </div>

        {isManager && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              icon={<Plus size={20} />}
              onClick={() => setIsVehicleModalOpen(true)}
            >
              Додати транспорт
            </Button>
            <Button
              variant="primary"
              icon={<MapPin size={20} />}
              onClick={() => setIsRouteModalOpen(true)}
            >
              Створити маршрут
            </Button>
          </div>
        )}
      </div>

      <Card>
        <div className="mb-6">
          <div className="border-b border-neutral-200">
            <nav className="-mb-px flex gap-4">
              <button
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'tracking'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
                `}
                onClick={() => setActiveTab('tracking')}
              >
                Відстеження
              </button>
              <button
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'vehicles'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
                `}
                onClick={() => setActiveTab('vehicles')}
              >
                Транспорт
              </button>
              <button
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'routes'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
                `}
                onClick={() => setActiveTab('routes')}
              >
                Маршрути
              </button>
            </nav>
          </div>

          {activeTab !== 'tracking' && (
            <div className="mt-4">
              <Input
                placeholder={`Пошук ${activeTab === 'vehicles' ? 'транспорту' : 'маршрутів'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search size={18} />}
              />
            </div>
          )}
        </div>

        {activeTab === 'tracking' ? (
          <RouteTracking />
        ) : activeTab === 'vehicles' ? (
          <Table
            headers={vehicleHeaders}
            data={vehicles.filter(vehicle =>
              vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
              `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            renderRow={renderVehicleRow}
            isLoading={loading}
            onRowClick={isManager ? (vehicle) => {
              setSelectedVehicle(vehicle);
              setIsVehicleModalOpen(true);
            } : undefined}
          />
        ) : (
          <Table
            headers={routeHeaders}
            data={routes.filter(route =>
              route.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              `${route.driver?.firstName} ${route.driver?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            renderRow={renderRouteRow}
            isLoading={loading}
            onRowClick={(route) => {
              setSelectedRoute(route);
              setIsRouteModalOpen(true);
            }}
          />
        )}
      </Card>

      <Modal
        isOpen={isVehicleModalOpen}
        onClose={handleVehicleModalClose}
        size="lg"
      >
        <VehicleForm
          vehicle={selectedVehicle}
          onClose={handleVehicleModalClose}
        />
      </Modal>

      <Modal
        isOpen={isRouteModalOpen}
        onClose={handleRouteModalClose}
        size="xl"
      >
        <RouteForm
          route={selectedRoute}
          onClose={handleRouteModalClose}
        />
      </Modal>
    </div>
  );
};

export default LogisticsPage;