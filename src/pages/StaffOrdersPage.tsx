import React, { useState, useEffect } from 'react';
import { Search, Package, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import { format } from 'date-fns';
import type { OrderStatus } from '../types';

const StaffOrdersPage: React.FC = () => {
  const { 
    orders, 
    orderInventorySummary,
    loading, 
    fetchOrders, 
    fetchOrderInventorySummary,
    updateOrderStatus 
  } = useOrderStore();
  
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchOrderInventorySummary();
  }, [fetchOrders, fetchOrderInventorySummary]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'primary';
      case 'processing': return 'accent';
      case 'shipped': return 'info';
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

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case 'pending': return 'confirmed';
      case 'confirmed': return 'processing';
      case 'processing': return 'shipped';
      case 'shipped': return 'delivered';
      default: return null;
    }
  };

  const getNextStatusLabel = (currentStatus: OrderStatus): string => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return '';
    return getStatusLabel(nextStatus);
  };

  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return;

    try {
      setUpdateLoading(orderId);
      await updateOrderStatus(orderId, nextStatus);
      await fetchOrders();
      await fetchOrderInventorySummary();
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleViewInventory = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsInventoryModalOpen(true);
  };

  const filteredOrders = orders
    .filter(order => 
      (statusFilter === 'all' || order.status === statusFilter) &&
      (order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.shippingAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.shippingCity.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const selectedOrderInventory = orderInventorySummary.filter(
    item => item.orderId === selectedOrderId
  );

  const headers = [
    { key: 'id', label: 'Номер замовлення' },
    { key: 'customer', label: 'Клієнт', className: 'hidden sm:table-cell' },
    { key: 'created_at', label: 'Дата', className: 'hidden md:table-cell' },
    { key: 'total_amount', label: 'Сума' },
    { key: 'status', label: 'Статус' },
    { key: 'shipping_address', label: 'Адреса доставки', className: 'hidden lg:table-cell' },
    { key: 'actions', label: 'Дії', className: 'text-right' },
  ];

  const inventoryHeaders = [
    { key: 'product', label: 'Товар' },
    { key: 'warehouse', label: 'Склад' },
    { key: 'ordered', label: 'Замовлено' },
    { key: 'current_stock', label: 'Поточний запас' },
    { key: 'shipped', label: 'Відправлено' },
    { key: 'status', label: 'Статус' }
  ];

  const renderRow = (order: any) => [
    <div className="font-medium text-neutral-900">#{order.id.slice(0, 8)}</div>,
    <div className="hidden sm:table-cell text-neutral-600">
      {order.customer?.firstName} {order.customer?.lastName}
    </div>,
    <div className="hidden md:table-cell text-neutral-600">
      {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
    </div>,
    <div className="text-neutral-600">₴{order.totalAmount.toLocaleString()}</div>,
    <Badge
      variant={getStatusBadgeVariant(order.status)}
      size="sm"
    >
      {getStatusLabel(order.status)}
    </Badge>,
    <div className="hidden lg:table-cell text-neutral-600 truncate max-w-xs">
      {order.shippingAddress}, {order.shippingCity}
    </div>,
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="ghost"
        icon={<Eye size={16} />}
        onClick={() => handleViewInventory(order.id)}
      >
        Запаси
      </Button>
      {getNextStatus(order.status) && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleUpdateStatus(order.id, order.status)}
          isLoading={updateLoading === order.id}
        >
          {getNextStatusLabel(order.status)}
        </Button>
      )}
    </div>,
  ];

  const renderInventoryRow = (item: any) => [
    <div>
      <div className="font-medium text-neutral-900">{item.productName}</div>
      <div className="text-sm text-neutral-500">{item.productSku}</div>
    </div>,
    <div className="text-neutral-600">{item.warehouseName}</div>,
    <div className="text-neutral-600">{item.orderedQuantity}</div>,
    <div className={`font-medium ${item.currentStock < item.orderedQuantity ? 'text-error-600' : 'text-neutral-900'}`}>
      {item.currentStock}
    </div>,
    <div className="text-neutral-600">
      {item.shippedQuantity > 0 ? item.shippedQuantity : '-'}
    </div>,
    <div>
      {item.shippedQuantity > 0 ? (
        <Badge variant="success\" size="sm\" dot>
          Відправлено
        </Badge>
      ) : item.reservedQuantity > 0 ? (
        <Badge variant="warning" size="sm" dot>
          Зарезервовано
        </Badge>
      ) : (
        <Badge variant="neutral" size="sm" dot>
          Очікує
        </Badge>
      )}
    </div>
  ];

  const statusOptions = [
    { value: 'all', label: 'Всі статуси' },
    { value: 'pending', label: 'Очікує підтвердження' },
    { value: 'confirmed', label: 'Підтверджено' },
    { value: 'processing', label: 'В обробці' },
    { value: 'shipped', label: 'Відправлено' },
    { value: 'delivered', label: 'Доставлено' },
    { value: 'cancelled', label: 'Скасовано' },
  ];

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const hasLowStock = selectedOrderInventory.some(item => 
    item.currentStock < item.orderedQuantity
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-neutral-900">
          Управління замовленнями
        </h1>
        <p className="text-neutral-500 mt-1">
          Перегляд та обробка замовлень клієнтів з контролем запасів
        </p>
      </div>

      <Card>
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Пошук замовлень..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={18} />}
              fullWidth
            />
          </div>
          <div className="w-full sm:w-64 flex-shrink-0">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              fullWidth
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table
            headers={headers}
            data={filteredOrders}
            renderRow={renderRow}
            isLoading={loading}
            emptyState={
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Замовлень не знайдено
                </h3>
                <p className="text-neutral-600">
                  Наразі немає замовлень, які відповідають вашому пошуку
                </p>
              </div>
            }
          />
        </div>
      </Card>

      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                Запаси для замовлення #{selectedOrderId?.slice(0, 8)}
              </h3>
              {selectedOrder && (
                <p className="text-sm text-neutral-600 mt-1">
                  Статус: {getStatusLabel(selectedOrder.status)} • 
                  Клієнт: {selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}
                </p>
              )}
            </div>
            <Badge
              variant={getStatusBadgeVariant(selectedOrder?.status || '')}
              size="md"
            >
              {getStatusLabel(selectedOrder?.status || '')}
            </Badge>
          </div>

          {hasLowStock && (
            <Alert variant="warning" title="Увага!">
              Деякі товари мають недостатній запас на складі. Перевірте наявність перед підтвердженням замовлення.
            </Alert>
          )}

          <Table
            headers={inventoryHeaders}
            data={selectedOrderInventory}
            renderRow={renderInventoryRow}
            isLoading={loading}
            emptyState={
              <div className="text-center py-8">
                <Package size={32} className="mx-auto text-neutral-400 mb-2" />
                <p className="text-neutral-600">Немає даних про запаси</p>
              </div>
            }
          />

          <div className="bg-neutral-50 p-4 rounded-lg">
            <h4 className="font-medium text-neutral-900 mb-2">Легенда статусів:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="sm" dot>Очікує</Badge>
                <span className="text-neutral-600">Товар не списаний</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm" dot>Зарезервовано</Badge>
                <span className="text-neutral-600">Товар списаний зі складу</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm" dot>Відправлено</Badge>
                <span className="text-neutral-600">Товар відправлений клієнту</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffOrdersPage;