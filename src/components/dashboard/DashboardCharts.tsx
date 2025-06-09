import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';

const COLORS = [
  '#1E40AF', // primary-800
  '#065F46', // secondary-800
  '#9A3412', // accent-800
  '#15803D', // success-700
  '#A16207', // warning-700
  '#B91C1C', // error-700
];

const DashboardCharts: React.FC = () => {
  const [monthlyShipments, setMonthlyShipments] = useState<{ month: string; count: number }[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{ category: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Fetch monthly shipments from orders
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('created_at')
          .eq('status', 'shipped')
          .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString());

        if (ordersError) throw ordersError;

        // Process monthly shipments data
        const monthlyData = orders.reduce((acc: Record<string, number>, curr) => {
          const month = new Date(curr.created_at).toLocaleString('uk-UA', { month: 'short' });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        const formattedShipments = Object.entries(monthlyData).map(([month, count]) => ({
          month,
          count
        }));

        // Fetch products with their categories
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            category:product_categories(name)
          `);

        if (productsError) throw productsError;

        // Process category counts data
        const categoryData = products.reduce((acc: Record<string, number>, product) => {
          const category = product.category?.name || 'Без категорії';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});

        const formattedCategories = Object.entries(categoryData)
          .map(([category, count]) => ({
            category,
            count: Number(count)
          }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count);

        setMonthlyShipments(formattedShipments);
        setCategoryCounts(formattedCategories);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title="Щомісячні відправлення\" className="animate-pulse">
          <div className="h-64 bg-neutral-100 rounded"></div>
        </Card>
        
        <Card title="Запаси за категоріями" className="animate-pulse">
          <div className="h-64 bg-neutral-100 rounded"></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <Card title="Щомісячні відправлення">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyShipments}
              margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#1E40AF" 
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      <Card title="Запаси за категоріями">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryCounts}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                dataKey="count"
                nameKey="category"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryCounts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} товарів`, 'Кількість']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default DashboardCharts;