import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Order, OrderItem, OrderStatus, OrderStatusHistory } from '../types';

interface OrderInventorySummary {
  orderId: string;
  orderStatus: OrderStatus;
  orderDate: string;
  customerId: string;
  customerName: string;
  orderItemId: string;
  productId: string;
  productName: string;
  productSku: string;
  orderedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  warehouseName: string;
  currentStock: number;
  reservedQuantity: number;
  shippedQuantity: number;
  shippedDate?: string;
}

interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  orderItems: OrderItem[];
  statusHistory: OrderStatusHistory[];
  orderInventorySummary: OrderInventorySummary[];
  loading: boolean;
  error: string | null;
  
  fetchOrders: () => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  createOrder: (order: Omit<Order, 'id' | 'status' | 'totalAmount' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateOrderStatus: (id: string, status: OrderStatus, notes?: string) => Promise<void>;
  
  fetchOrderItems: (orderId: string) => Promise<void>;
  addOrderItem: (item: Omit<OrderItem, 'id' | 'totalPrice' | 'createdAt'>) => Promise<void>;
  removeOrderItem: (id: string) => Promise<void>;
  updateOrderItem: (id: string, quantity: number) => Promise<void>;
  
  fetchStatusHistory: (orderId: string) => Promise<void>;
  fetchOrderInventorySummary: () => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  selectedOrder: null,
  orderItems: [],
  statusHistory: [],
  orderInventorySummary: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!orders_customer_id_fkey_profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const transformedOrders = data.map(order => ({
        id: order.id,
        customerId: order.customer_id,
        status: order.status,
        totalAmount: order.total_amount,
        shippingAddress: order.shipping_address,
        shippingCity: order.shipping_city,
        shippingState: order.shipping_state,
        shippingPostalCode: order.shipping_postal_code,
        shippingCountry: order.shipping_country,
        notes: order.notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        customer: order.customer ? {
          firstName: order.customer.first_name,
          lastName: order.customer.last_name
        } : null
      }));
      
      set({ orders: transformedOrders });
    } catch (error) {
      console.error('Error fetching orders:', error);
      set({ error: 'Failed to fetch orders' });
    } finally {
      set({ loading: false });
    }
  },

  fetchOrderById: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!orders_customer_id_fkey_profiles(first_name, last_name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      const transformedOrder = {
        id: data.id,
        customerId: data.customer_id,
        status: data.status,
        totalAmount: data.total_amount,
        shippingAddress: data.shipping_address,
        shippingCity: data.shipping_city,
        shippingState: data.shipping_state,
        shippingPostalCode: data.shipping_postal_code,
        shippingCountry: data.shipping_country,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        customer: data.customer ? {
          firstName: data.customer.first_name,
          lastName: data.customer.last_name
        } : null
      };
      
      set({ selectedOrder: transformedOrder });
    } catch (error) {
      console.error('Error fetching order:', error);
      set({ error: 'Failed to fetch order' });
    } finally {
      set({ loading: false });
    }
  },

  createOrder: async (order) => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const transformedOrder = {
        shipping_address: order.shippingAddress,
        shipping_city: order.shippingCity,
        shipping_state: order.shippingState,
        shipping_postal_code: order.shippingPostalCode,
        shipping_country: order.shippingCountry,
        notes: order.notes,
        customer_id: user.id
      };
      
      const { data, error } = await supabase
        .from('orders')
        .insert([transformedOrder])
        .select()
        .single();
      
      if (error) throw error;
      
      const transformedData = {
        id: data.id,
        customerId: data.customer_id,
        status: data.status,
        totalAmount: data.total_amount,
        shippingAddress: data.shipping_address,
        shippingCity: data.shipping_city,
        shippingState: data.shipping_state,
        shippingPostalCode: data.shipping_postal_code,
        shippingCountry: data.shipping_country,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      set(state => ({
        orders: [transformedData, ...state.orders]
      }));
      
      return data.id;
    } catch (error) {
      console.error('Error creating order:', error);
      set({ error: 'Failed to create order' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateOrderStatus: async (id, status, notes) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      if (notes) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: historyError } = await supabase
            .from('order_status_history')
            .insert([{
              order_id: id,
              status,
              notes,
              changed_by: user.id
            }]);
          
          if (historyError) throw historyError;
        }
      }
      
      set(state => ({
        orders: state.orders.map(order => 
          order.id === id ? { ...order, status } : order
        ),
        selectedOrder: state.selectedOrder?.id === id 
          ? { ...state.selectedOrder, status }
          : state.selectedOrder
      }));

      // Refresh order inventory summary after status change
      await get().fetchOrderInventorySummary();
    } catch (error) {
      console.error('Error updating order status:', error);
      set({ error: 'Failed to update order status' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchOrderItems: async (orderId) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(name, sku, unit_type, unit_value),
          warehouse:warehouses(name)
        `)
        .eq('order_id', orderId);
      
      if (error) throw error;
      
      const transformedItems = data.map(item => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        warehouseId: item.warehouse_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        createdAt: item.created_at,
        product: item.product ? {
          name: item.product.name,
          sku: item.product.sku,
          unitType: item.product.unit_type,
          unitValue: item.product.unit_value
        } : null,
        warehouse: item.warehouse ? {
          name: item.warehouse.name
        } : null
      }));
      
      set({ orderItems: transformedItems });
    } catch (error) {
      console.error('Error fetching order items:', error);
      set({ error: 'Failed to fetch order items' });
    } finally {
      set({ loading: false });
    }
  },

  addOrderItem: async (item) => {
    try {
      set({ loading: true, error: null });
      
      const transformedItem = {
        order_id: item.orderId,
        product_id: item.productId,
        warehouse_id: item.warehouseId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice
      };
      
      const { data, error } = await supabase
        .from('order_items')
        .insert([transformedItem])
        .select()
        .single();
      
      if (error) throw error;
      
      const transformedData = {
        id: data.id,
        orderId: data.order_id,
        productId: data.product_id,
        warehouseId: data.warehouse_id,
        quantity: data.quantity,
        unitPrice: data.unit_price,
        totalPrice: data.total_price,
        createdAt: data.created_at
      };
      
      set(state => ({
        orderItems: [...state.orderItems, transformedData]
      }));
    } catch (error) {
      console.error('Error adding order item:', error);
      set({ error: 'Failed to add order item' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  removeOrderItem: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      set(state => ({
        orderItems: state.orderItems.filter(item => item.id !== id)
      }));
    } catch (error) {
      console.error('Error removing order item:', error);
      set({ error: 'Failed to remove order item' });
    } finally {
      set({ loading: false });
    }
  },

  updateOrderItem: async (id, quantity) => {
    try {
      set({ loading: true, error: null });
      
      const currentItem = get().orderItems.find(item => item.id === id);
      if (!currentItem) throw new Error('Order item not found');
      
      const totalPrice = quantity * currentItem.unitPrice;
      
      const { data, error } = await supabase
        .from('order_items')
        .update({
          quantity,
          total_price: totalPrice
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const transformedData = {
        id: data.id,
        orderId: data.order_id,
        productId: data.product_id,
        warehouseId: data.warehouse_id,
        quantity: data.quantity,
        unitPrice: data.unit_price,
        totalPrice: data.total_price,
        createdAt: data.created_at
      };
      
      set(state => ({
        orderItems: state.orderItems.map(item =>
          item.id === id ? transformedData : item
        )
      }));
    } catch (error) {
      console.error('Error updating order item:', error);
      set({ error: 'Failed to update order item' });
    } finally {
      set({ loading: false });
    }
  },

  fetchStatusHistory: async (orderId) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('order_status_history')
        .select(`
          *,
          changed_by_user:profiles!order_status_history_changed_by_fkey(first_name, last_name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const transformedHistory = data.map(item => ({
        id: item.id,
        orderId: item.order_id,
        status: item.status,
        notes: item.notes,
        changedBy: item.changed_by,
        createdAt: item.created_at,
        changedByUser: item.changed_by_user ? {
          firstName: item.changed_by_user.first_name,
          lastName: item.changed_by_user.last_name
        } : null
      }));
      
      set({ statusHistory: transformedHistory });
    } catch (error) {
      console.error('Error fetching status history:', error);
      set({ error: 'Failed to fetch status history' });
    } finally {
      set({ loading: false });
    }
  },

  fetchOrderInventorySummary: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('order_inventory_summary')
        .select('*')
        .order('order_date', { ascending: false });
      
      if (error) throw error;
      
      const transformedSummary = data.map(item => ({
        orderId: item.order_id,
        orderStatus: item.order_status,
        orderDate: item.order_date,
        customerId: item.customer_id,
        customerName: item.customer_name,
        orderItemId: item.order_item_id,
        productId: item.product_id,
        productName: item.product_name,
        productSku: item.product_sku,
        orderedQuantity: item.ordered_quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        warehouseName: item.warehouse_name,
        currentStock: item.current_stock || 0,
        reservedQuantity: item.reserved_quantity || 0,
        shippedQuantity: item.shipped_quantity || 0,
        shippedDate: item.shipped_date
      }));
      
      set({ orderInventorySummary: transformedSummary });
    } catch (error) {
      console.error('Error fetching order inventory summary:', error);
      set({ error: 'Failed to fetch order inventory summary' });
    } finally {
      set({ loading: false });
    }
  }
}));