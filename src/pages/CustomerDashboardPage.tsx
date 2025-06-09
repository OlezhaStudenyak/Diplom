import React, { useState, useEffect } from 'react';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LiveOrderUpdates from '../components/dashboard/LiveOrderUpdates';
import { 
  Package, 
  ShoppingCart, 
  Clock, 
  DollarSign,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EnhancedOrderTracking from '../components/orders/EnhancedOrderTracking';

const CustomerDashboardPage: React.FC = () => {
  const { orders, loading, fetchOrders } = useOrderStore();
  const { user } = useAuthStore();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalSpent: 0,
    lastOrderStatus: '',
    lastOrderDate: null as Date | null,
    ordersTrend: 0,
    spendingTrend: 0
  });

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (orders.length > 0) {
      const userOrders = orders.filter(order => order.customerId === user?.id);
      
      const totalOrders = userOrders.length;
      const totalSpent = userOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const lastOrder = userOrders[0];
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      const sixtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      
      const recentOrders = userOrders.filter(order => 
        new Date(order.createdAt) >= thirtyDaysAgo
      );
      
      const previousOrders = userOrders.filter(order => 
        new Date(order.createdAt) >= sixtyDaysAgo && 
        new Date(order.createdAt) < thirtyDaysAgo
      );
      
      const ordersTrend = previousOrders.length > 0
        ? ((recentOrders.length - previousOrders.length) / previousOrders.length) * 100
        : 0;
      
      const recentSpending = recentOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const previousSpending = previousOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      const spendingTrend = previousSpending > 0
        ? ((recentSpending - previousSpending) / previousSpending) * 100
        : 0;
      
      setMetrics({
        totalOrders,
        totalSpent,
        lastOrderStatus: lastOrder?.status || '',
        lastOrderDate: lastOrder ? new Date(lastOrder.createdAt) : null,
        ordersTrend,
        spendingTrend
      });
    }
  }, [orders, user]);

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

  const handleTrackOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsTrackingOpen(true);
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number | React.ReactNode;
    icon: React.ReactNode;
    trend?: number;
    link?: string;
  }> = ({ title, value, icon, trend, link }) => (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-500 truncate">{title}</p>
          <div className="mt-1 text-2xl font-semibold text-neutral-900 truncate">
            {value}
          </div>
          
          {typeof trend !== 'undefined' && (
            <div className="mt-1 flex items-center flex-wrap">
              {trend > 0 ? (
                <TrendingUp size={16} className="text-success-600 mr-1 flex-shrink-0" />
              ) : (
                <TrendingDown size={16} className="text-error-600 mr-1 flex-shrink-0" />
              )}
              <span className={`text-xs font-medium ${
                trend > 0 ? 'text-success-600' : 'text-error-600'
              }`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
              <span className="ml-1 text-xs text-neutral-500 truncate">
                за останні 30 днів
              </span>
            </div>
          )}
        </div>
        
        <div className="p-2 rounded-lg bg-primary-50 flex-shrink-0 ml-4">
          {React.cloneElement(icon as React.ReactElement, { 
            size: 24,
            className: 'text-primary-600' 
          })}
        </div>
      </div>

      {link && (
        <Link 
          to={link}
          className="absolute inset-0 flex items-center justify-end p-6 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-white/50"
        >
          <div className="flex items-center text-primary-600 font-medium">
            <span className="mr-2">Детальніше</span>
            <ArrowRight size={16} />
          </div>
        </Link>
      )}
    </Card>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-neutral-900">
            Панель керування
          </h1>
          <p className="text-neutral-500 mt-1">
            Огляд ваших замовлень та активності
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 bg-neutral-100 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-neutral-900">
          Панель керування
        </h1>
        <p className="text-neutral-500 mt-1">
          Огляд ваших замовлень та активності в реальному часі
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard
          title="Всього замовлень"
          value={metrics.totalOrders}
          icon={<Package />}
          trend={metrics.ordersTrend}
          link="/orders"
        />
        
        <StatCard
          title="Загальна сума замовлень"
          value={`₴${metrics.totalSpent.toLocaleString()}`}
          icon={<DollarSign />}
          trend={metrics.spendingTrend}
        />
        
        {metrics.lastOrderStatus && (
          <StatCard
            title="Статус останнього замовлення"
            value={
              <Badge
                variant={getStatusBadgeVariant(metrics.lastOrderStatus)}
                size="md"
                className="mt-1"
              >
                {getStatusLabel(metrics.lastOrderStatus)}
              </Badge>
            }
            icon={<ShoppingCart />}
          />
        )}
        
        {metrics.lastOrderDate && (
          <StatCard
            title="Дата останньої покупки"
            value={format(metrics.lastOrderDate, 'dd.MM.yyyy')}
            icon={<Clock />}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Останні замовлення */}
        <div className="lg:col-span-2">
          <Card title="Останні замовлення">
            <div className="divide-y divide-neutral-200">
              {orders.slice(0, 5).map(order => (
                <div
                  key={order.id}
                  className="p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-medium text-neutral-900">
                        Замовлення #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium text-neutral-900">
                          ₴{order.totalAmount.toLocaleString()}
                        </p>
                        <Badge
                          variant={getStatusBadgeVariant(order.status)}
                          size="sm"
                          className="mt-1"
                        >
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye size={16} />}
                        onClick={() => handleTrackOrder(order.id)}
                      >
                        Відстежити
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Оновлення доставок в реальному часі */}
        <div>
          <LiveOrderUpdates />
        </div>
      </div>

      {/* Модальне вікно відстеження замовлення */}
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
};

export default CustomerDashboardPage;