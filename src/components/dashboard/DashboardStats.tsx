import React from 'react';
import { 
  PackageOpen, 
  AlertTriangle, 
  ShoppingCart, 
  Truck, 
  DollarSign, 
  BarChart3
} from 'lucide-react';
import Card from '../ui/Card';
import { DashboardMetrics } from '../../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, className = '' }) => (
  <Card className={`${className}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
        
        {trend && (
          <div className="mt-1 flex items-center">
            <span className={`text-xs font-medium ${trend.isPositive ? 'text-success-600' : 'text-error-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="ml-1 text-xs text-neutral-500">порівняно з минулим місяцем</span>
          </div>
        )}
      </div>
      
      <div className="p-2 rounded-lg bg-primary-50">
        {React.cloneElement(icon as React.ReactElement, { 
          size: 24,
          className: 'text-primary-600' 
        })}
      </div>
    </div>
  </Card>
);

interface DashboardStatsProps {
  metrics: DashboardMetrics;
  loading?: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ metrics, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
              <div className="h-8 bg-neutral-200 rounded w-1/2 mt-3"></div>
              <div className="h-3 bg-neutral-200 rounded w-2/3 mt-3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard
        title="Всього товарів"
        value={metrics.totalProducts || 0}
        icon={<PackageOpen />}
        trend={{ value: 12, isPositive: true }}
      />
      
      <StatCard
        title="Товари з низьким запасом"
        value={metrics.lowStockItems || 0}
        icon={<AlertTriangle />}
        trend={{ value: 5, isPositive: false }}
      />
      
      <StatCard
        title="Очікують обробки"
        value={metrics.pendingOrders || 0}
        icon={<ShoppingCart />}
        trend={{ value: 3, isPositive: true }}
      />
      
      <StatCard
        title="Активні доставки"
        value={metrics.activeDeliveries || 0}
        icon={<Truck />}
        trend={{ value: 8, isPositive: true }}
      />
      
      <StatCard
        title="Вартість запасів"
        value={`₴${(metrics.inventoryValue || 0).toLocaleString()}`}
        icon={<DollarSign />}
        trend={{ value: 15, isPositive: true }}
      />
      
      <StatCard
        title="Використання складу"
        value={`${metrics.warehouseUtilization || 0}%`}
        icon={<BarChart3 />}
        trend={{ value: 2, isPositive: true }}
      />
    </div>
  );
};

export default DashboardStats;