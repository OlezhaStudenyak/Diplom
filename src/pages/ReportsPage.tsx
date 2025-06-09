import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../store/inventoryStore';
import { useOrderStore } from '../store/orderStore';
import { useLogisticsStore } from '../store/logisticsStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'logistics'>('inventory');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('week');

  const { getInventoryReport, loading: inventoryLoading } = useInventoryStore();
  const { orders, loading: ordersLoading, fetchOrders } = useOrderStore();
  const { routes, loading: logisticsLoading, fetchRoutes } = useLogisticsStore();

  const [inventoryReport, setInventoryReport] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<any[]>([]);
  const [logisticsStats, setLogisticsStats] = useState<any[]>([]);

  useEffect(() => {
    const loadReports = async () => {
      const report = await getInventoryReport();
      setInventoryReport(report);
      await fetchOrders();
      await fetchRoutes();
    };

    loadReports();
  }, [getInventoryReport, fetchOrders, fetchRoutes]);

  useEffect(() => {
    // Calculate order statistics
    const stats = orders.reduce((acc: any, order) => {
      const date = format(new Date(order.createdAt), 'dd.MM.yyyy');
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          total: 0,
          completed: 0,
          cancelled: 0
        };
      }
      acc[date].count++;
      acc[date].total += order.totalAmount;
      if (order.status === 'delivered') acc[date].completed++;
      if (order.status === 'cancelled') acc[date].cancelled++;
      return acc;
    }, {});

    setOrderStats(Object.values(stats));
  }, [orders]);

  useEffect(() => {
    // Calculate logistics statistics
    const stats = routes.reduce((acc: any, route) => {
      const date = format(new Date(route.createdAt), 'dd.MM.yyyy');
      if (!acc[date]) {
        acc[date] = {
          date,
          totalRoutes: 0,
          totalDistance: 0,
          completedDeliveries: 0
        };
      }
      acc[date].totalRoutes++;
      acc[date].totalDistance += route.totalDistance;
      if (route.status === 'completed') acc[date].completedDeliveries++;
      return acc;
    }, {});

    setLogisticsStats(Object.values(stats));
  }, [routes]);

  const renderInventoryReport = () => {
    const headers = [
      { key: 'sku', label: 'Артикул' },
      { key: 'name', label: 'Назва' },
      { key: 'quantity', label: 'Кількість' },
      { key: 'status', label: 'Статус' },
      { key: 'pending', label: 'Очікується' }
    ];

    const renderRow = (item: any) => [
      <div className="font-medium">{item.sku}</div>,
      <div>{item.name}</div>,
      <div>{item.quantity}</div>,
      <Badge
        variant={item.quantity <= item.minimumQuantity ? 'error' : 'success'}
        size="sm"
      >
        {item.quantity <= item.minimumQuantity ? 'Низький запас' : 'В нормі'}
      </Badge>,
      <div>{item.pendingReceipts > 0 ? `+${item.pendingReceipts}` : '-'}</div>
    ];

    const filteredReport = selectedWarehouse === 'all'
      ? inventoryReport
      : inventoryReport.filter(w => w.warehouseId === selectedWarehouse);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            options={[
              { value: 'all', label: 'Всі склади' },
              ...inventoryReport.map(w => ({
                value: w.warehouseId,
                label: w.warehouseName
              }))
            ]}
          />
        </div>

        {filteredReport.map(warehouse => (
          <Card
            key={warehouse.warehouseId}
            title={warehouse.warehouseName}
          >
            <Table
              headers={headers}
              data={warehouse.products}
              renderRow={renderRow}
              isLoading={inventoryLoading}
            />
          </Card>
        ))}
      </div>
    );
  };

  const renderOrdersReport = () => {
    return (
      <Card title="Статистика замовлень">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar name="Всього замовлень" dataKey="count" fill="#1E40AF" />
              <Bar name="Виконано" dataKey="completed" fill="#059669" />
              <Bar name="Скасовано" dataKey="cancelled" fill="#DC2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-primary-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-primary-700">
              {orders.length}
            </div>
            <div className="text-sm text-primary-600">Всього замовлень</div>
          </div>

          <div className="bg-success-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-success-700">
              {orders.filter(o => o.status === 'delivered').length}
            </div>
            <div className="text-sm text-success-600">Виконано</div>
          </div>

          <div className="bg-error-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-error-700">
              {orders.filter(o => o.status === 'cancelled').length}
            </div>
            <div className="text-sm text-error-600">Скасовано</div>
          </div>
        </div>
      </Card>
    );
  };

  const renderLogisticsReport = () => {
    return (
      <Card title="Статистика доставок">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={logisticsStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar name="Маршрути" dataKey="totalRoutes" fill="#1E40AF" />
              <Bar name="Виконані доставки" dataKey="completedDeliveries" fill="#059669" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-primary-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-primary-700">
              {routes.length}
            </div>
            <div className="text-sm text-primary-600">Всього маршрутів</div>
          </div>

          <div className="bg-success-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-success-700">
              {routes.filter(r => r.status === 'completed').length}
            </div>
            <div className="text-sm text-success-600">Завершено</div>
          </div>

          <div className="bg-warning-50 p-4 rounded-lg">
            <div className="text-2xl font-semibold text-warning-700">
              {routes.filter(r => r.status === 'in_progress').length}
            </div>
            <div className="text-sm text-warning-600">В процесі</div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-neutral-900">
          Звіти
        </h1>
        <p className="text-neutral-500 mt-1">
          Аналітика та статистика роботи системи
        </p>
      </div>

      <div className="mb-6">
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex gap-4">
            <button
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'inventory'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
              `}
              onClick={() => setActiveTab('inventory')}
            >
              Склад
            </button>
            <button
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'orders'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
              `}
              onClick={() => setActiveTab('orders')}
            >
              Замовлення
            </button>
            <button
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'logistics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}
              `}
              onClick={() => setActiveTab('logistics')}
            >
              Логістика
            </button>
          </nav>
        </div>
      </div>

      <div>
        {activeTab === 'inventory' && renderInventoryReport()}
        {activeTab === 'orders' && renderOrdersReport()}
        {activeTab === 'logistics' && renderLogisticsReport()}
      </div>
    </div>
  );
};

export default ReportsPage;