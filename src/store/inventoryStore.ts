import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Product, ProductCategory, InventoryLevel } from '../types';

interface InventoryState {
  products: Product[];
  categories: ProductCategory[];
  levels: InventoryLevel[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  createProduct: (product: Partial<Product>) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  createCategory: (category: { name: string; description?: string }) => Promise<ProductCategory | null>;
  fetchLevels: (productId?: string, warehouseId?: string) => Promise<void>;
  updateLevel: (id: string, quantity: number) => Promise<void>;
  updateInventoryQuantity: (levelId: string, quantity: number) => Promise<void>;
  checkLowStock: () => Promise<void>;
  getInventoryReport: () => Promise<{
    warehouseId: string;
    warehouseName: string;
    products: Array<{
      id: string;
      name: string;
      sku: string;
      quantity: number;
      minimumQuantity: number;
      lastUpdated: string;
      pendingShipments: number;
      pendingReceipts: number;
    }>;
  }[]>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  categories: [],
  levels: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    try {
      set({ loading: true, error: null });
      
      // Fetch products with their categories
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(*)
        `);

      if (productsError) throw productsError;

      // Fetch inventory levels for stock calculation
      const { data: levels, error: levelsError } = await supabase
        .from('inventory_levels')
        .select('*');

      if (levelsError) throw levelsError;

      // Calculate total stock for each product
      const productsWithStock = products.map(product => ({
        ...product,
        stock: levels
          .filter(level => level.product_id === product.id)
          .reduce((total, level) => total + Number(level.quantity), 0)
      }));

      set({ products: productsWithStock });
    } catch (error) {
      console.error('Error fetching products:', error);
      set({ error: 'Failed to fetch products' });
    } finally {
      set({ loading: false });
    }
  },

  createProduct: async (product) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;

      // Refresh products list
      await get().fetchProducts();
      
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      set({ error: 'Failed to create product' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateProduct: async (id, product) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id);
      
      if (error) throw error;

      // Refresh products list
      await get().fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      set({ error: 'Failed to update product' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteProduct: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      // Remove product from local state
      set(state => ({
        products: state.products.filter(product => product.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting product:', error);
      set({ error: 'Failed to delete product' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchCategories: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('product_categories')
        .select('*');
      
      if (error) throw error;
      
      set({ categories: data });
    } catch (error) {
      console.error('Error fetching categories:', error);
      set({ error: 'Failed to fetch categories' });
    } finally {
      set({ loading: false });
    }
  },

  createCategory: async (category) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('product_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;

      // Refresh categories list
      await get().fetchCategories();
      
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      set({ error: 'Failed to create category' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  fetchLevels: async (productId?: string, warehouseId?: string) => {
    try {
      set({ loading: true, error: null });
      
      let query = supabase
        .from('inventory_levels')
        .select('*');
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data to match our interface
      const transformedLevels = data.map(level => ({
        id: level.id,
        productId: level.product_id,
        warehouseId: level.warehouse_id,
        quantity: level.quantity,
        minimumQuantity: level.minimum_quantity,
        maximumQuantity: level.maximum_quantity,
        createdAt: level.created_at,
        updatedAt: level.updated_at
      }));
      
      set({ levels: transformedLevels });
    } catch (error) {
      console.error('Error fetching inventory levels:', error);
      set({ error: 'Failed to fetch inventory levels' });
    } finally {
      set({ loading: false });
    }
  },

  updateLevel: async (id: string, quantity: number) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('inventory_levels')
        .update({ quantity })
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh levels after update
      await get().fetchLevels();
      
    } catch (error) {
      console.error('Error updating inventory level:', error);
      set({ error: 'Failed to update inventory level' });
    } finally {
      set({ loading: false });
    }
  },

  updateInventoryQuantity: async (levelId: string, quantity: number) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('inventory_levels')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', levelId);
      
      if (error) throw error;
      
      // Update local state
      set(state => ({
        levels: state.levels.map(level =>
          level.id === levelId 
            ? { ...level, quantity, updatedAt: new Date().toISOString() }
            : level
        )
      }));

      // Also refresh products to update stock display
      await get().fetchProducts();
      
    } catch (error) {
      console.error('Error updating inventory quantity:', error);
      set({ error: 'Failed to update inventory quantity' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  checkLowStock: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('inventory_levels')
        .select('*')
        .lte('quantity', supabase.raw('minimum_quantity'));
      
      if (error) throw error;
      
      // Process low stock items
      data.forEach(item => {
        // Trigger notification through notification store
        const notificationStore = useNotificationStore.getState();
        notificationStore.addNotification({
          type: 'warning',
          title: 'Низький рівень запасів',
          message: `Товар ID:${item.product_id} потребує поповнення запасів`
        });
      });
      
    } catch (error) {
      console.error('Error checking low stock:', error);
      set({ error: 'Failed to check low stock levels' });
    } finally {
      set({ loading: false });
    }
  },

  getInventoryReport: async () => {
    try {
      set({ loading: true, error: null });

      // Fetch warehouses
      const { data: warehouses, error: warehousesError } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (warehousesError) throw warehousesError;

      // Fetch inventory levels with product details
      const { data: levels, error: levelsError } = await supabase
        .from('inventory_levels')
        .select(`
          *,
          product:products(
            id,
            name,
            sku
          )
        `);

      if (levelsError) throw levelsError;

      // Fetch pending transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('inventory_transactions')
        .select('*')
        .in('status', ['pending', 'processing']);

      if (transactionsError) throw transactionsError;

      // Group inventory by warehouse
      const report = warehouses.map(warehouse => {
        const warehouseLevels = levels.filter(level => level.warehouse_id === warehouse.id);
        
        const products = warehouseLevels.map(level => {
          const pendingShipments = transactions
            .filter(t => 
              t.source_warehouse_id === warehouse.id && 
              t.product_id === level.product_id
            )
            .reduce((sum, t) => sum + Number(t.quantity), 0);

          const pendingReceipts = transactions
            .filter(t => 
              t.destination_warehouse_id === warehouse.id && 
              t.product_id === level.product_id
            )
            .reduce((sum, t) => sum + Number(t.quantity), 0);

          return {
            id: level.product_id,
            name: level.product.name,
            sku: level.product.sku,
            quantity: Number(level.quantity),
            minimumQuantity: Number(level.minimum_quantity),
            lastUpdated: level.updated_at,
            pendingShipments,
            pendingReceipts
          };
        });

        return {
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          products
        };
      });

      return report;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      set({ error: 'Failed to generate inventory report' });
      return [];
    } finally {
      set({ loading: false });
    }
  }
}));