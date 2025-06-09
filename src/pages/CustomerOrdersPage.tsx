import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Clock, Eye } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import CreateOrderForm from '../components/orders/CreateOrderForm';
import EnhancedOrderTracking from '../components/orders/EnhancedOrderTracking';
import { format } from 'date-fns';

const CustomerOrdersPage: React.FC = () => {
  const { orders, loading, fetchOrders } = useOrderStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'primary';
      case 'processing':
        return 'accent';
      case 'shipped':
        return 'info';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Очікує підтвердження';
      case 'confirmed':
        return 'Підтверджено';
      case 'processing':
        return 'В обробці';
      case 'shipped':
        return 'Відправлено';
      case 'delivered':
        return 'Доставлено';
      case 'cancelled':
        return 'Скасовано';
      default:
        return status;
    }
  };

  const handleTrackOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsTrackingOpen(true);
  };

  const headers = [
    { key: 'id', label: 'Номер замовлення' },
    { key: 'created_at', label: 'Дата' },
    { key: 'total_amount', label: 'Сума' },
    { key: 'status', label: 'Статус' },
    { key: 'shipping_address', label: 'Адреса доставки' },
    { key: 'actions', label: 'Дії', className: 'text-right' },
  ];

  const renderRow = (order: any) => [
    <div className="font-medium text-neutral-900">#{order.id.slice(0, 8)}</div>,
    <div className="text-neutral-600">
      {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
    </div>,
    <div className="text-neutral-600">₴{order.totalAmount.toLocaleString()}</div>,
    <Badge
      variant={getStatusBadgeVariant(order.status)}
      size="sm"
    >
      {getStatusLabel(order.status)}
    </Badge>,
    <div className="text-neutral-600">
      {order.shippingAddress}, {order.shippingCity}
    </div>,
    <div className="flex justify-end">
      <Button
        size="sm"
        variant="secondary"
        icon={<Eye size={16} />}
        onClick={() => handleTrackOrder(order.id)}
      >
        Відстежити
      </Button>
    </div>,
  ];

  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchOrders();
  };

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.shippingAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.shippingCity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">
            Мої замовлення
          </h1>
          <p className="text-neutral-500 mt-1">
            Перегляд та відстеження ваших замовлень в реальному часі
          </p>
        </div>
        
        <Button
          variant="primary"
          icon={<Plus size={20} />}
          onClick={() => setIsModalOpen(true)}
        >
          Нове замовлення
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="Пошук замовлень..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>

        <Table
          headers={headers}
          data={filteredOrders}
          renderRow={renderRow}
          isLoading={loading}
          emptyState={
            <div className="text-center py-12">
              <Clock size={48} className="mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Замовлень не знайдено
              </h3>
              <p className="text-neutral-600">
                У вас поки що немає жодного замовлення
              </p>
            </div>
          }
        />
      </Card>

      {/* Модальне вікно створення замовлення */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        size="lg"
      >
        <CreateOrderForm onClose={handleModalClose} />
      </Modal>

      {/* Модальне вікно покращеного відстеження замовлення */}
      <Modal 
        isOpen={isTrackingOpen} 
        onClose={() => setIsTrackingOpen(false)}
        size="xl"
      >
        {selectedOrderId && (
          <EnhancedOrderTracking 
            orderId={selectedOrderId} 
            onClose={() => setIsTrackingOpen(false)} 
          />
        )}
      </Modal>
    </div>
  );
}

export default CustomerOrdersPage;