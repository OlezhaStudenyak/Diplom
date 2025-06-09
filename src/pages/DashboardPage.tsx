import React, { useEffect, useState } from 'react';
import DashboardStats from '../components/dashboard/DashboardStats';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import WarehouseMap from '../components/dashboard/WarehouseMap';
import { useWarehouseStore } from '../store/warehouseStore';
import { supabase } from '../lib/supabase';
import type { DashboardMetrics } from '../types';

const DashboardPage: React.FC = () => {
  const { warehouses, loading: warehousesLoading, fetchWarehouses } = useWarehouseStore();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    activeDeliveries: 0,
    inventoryValue: 0,
    warehouseUtilization: 0,
    monthlyShipments: [],
    categoryCounts: []
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        await fetchWarehouses();

        // Fetch products with their categories and inventory
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            category:product_categories(name)
          `);
        
        if (productsError) throw productsError;

        // Calculate metrics
        const totalProducts = products?.length || 0;
        let inventoryValue = 0;
        let lowStockCount = 0;
        
        products?.forEach(product => {
          // Calculate value based on price and unit value
          inventoryValue += Number(product.price) * Number(product.unit_value || 0);
          
          // Check if product is low on stock (below minimum_stock)
          if (product.minimum_stock && Number(product.unit_value) <= Number(product.minimum_stock)) {
            lowStockCount++;
          }
        });

        // Fetch pending orders
        const { count: pendingOrders } = await supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .eq('status', 'pending');

        // Fetch active deliveries
        const { count: activeDeliveries } = await supabase
          .from('delivery_routes')
          .select('id', { count: 'exact' })
          .eq('status', 'in_progress');

        // Calculate warehouse utilization
        const totalCapacity = warehouses.reduce((sum, w) => sum + w.total_capacity, 0);
        const utilizationPercentage = totalCapacity > 0 
          ? Math.round((products.length / totalCapacity) * 100)
          : 0;

        setMetrics({
          totalProducts,
          lowStockItems: lowStockCount,
          inventoryValue,
          pendingOrders: pendingOrders || 0,
          activeDeliveries: activeDeliveries || 0,
          warehouseUtilization: utilizationPercentage,
          monthlyShipments: [],
          categoryCounts: []
        });

      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Set up real-time subscription for metrics updates
    const subscription = supabase
      .channel('metrics-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, () => {
        fetchMetrics();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        fetchMetrics();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchWarehouses]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-neutral-900">Панель керування</h1>
        <p className="text-neutral-500 mt-1">Огляд ваших складських та логістичних операцій</p>
      </div>
      
      <DashboardStats metrics={metrics} loading={loading} />
      <DashboardCharts />
      <WarehouseMap warehouses={warehouses} loading={warehousesLoading} />
    </div>
  );
};

export default DashboardPage;