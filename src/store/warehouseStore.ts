import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Warehouse, WarehouseZone } from '../types';

interface WarehouseState {
  warehouses: Warehouse[];
  warehouseZones: WarehouseZone[];
  selectedWarehouse: Warehouse | null;
  loading: boolean;
  error: string | null;
  fetchWarehouses: () => Promise<void>;
  fetchWarehouseZones: (warehouseId: string) => Promise<void>;
  selectWarehouse: (warehouse: Warehouse) => void;
  createWarehouse: (warehouse: Omit<Warehouse, 'id' | 'createdAt'>) => Promise<void>;
  updateWarehouse: (id: string, updates: Partial<Warehouse>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  createWarehouseZone: (zone: Omit<WarehouseZone, 'id'>) => Promise<void>;
  updateWarehouseZone: (id: string, updates: Partial<WarehouseZone>) => Promise<void>;
  deleteWarehouseZone: (id: string) => Promise<void>;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  warehouses: [],
  warehouseZones: [],
  selectedWarehouse: null,
  loading: false,
  error: null,

  fetchWarehouses: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      set({ warehouses: data as Warehouse[] });
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchWarehouseZones: async (warehouseId) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('warehouse_zones')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('name');
      
      if (error) throw error;
      
      set({ warehouseZones: data as WarehouseZone[] });
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  selectWarehouse: (warehouse) => {
    set({ selectedWarehouse: warehouse });
  },

  createWarehouse: async (warehouse) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('warehouses')
        .insert([warehouse])
        .select();
      
      if (error) throw error;
      
      set(state => ({
        warehouses: [...state.warehouses, data[0] as Warehouse]
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  updateWarehouse: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('warehouses')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      set(state => ({
        warehouses: state.warehouses.map(w => 
          w.id === id ? { ...w, ...updates } : w
        ),
        selectedWarehouse: state.selectedWarehouse?.id === id 
          ? { ...state.selectedWarehouse, ...updates } 
          : state.selectedWarehouse
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  deleteWarehouse: async (id) => {
    try {
      set({ loading: true, error: null });
      
      // Delete dependent records in the correct order to avoid foreign key constraint violations
      
      // 1. Delete inventory items first (they reference warehouse_zones)
      const { error: inventoryItemsError } = await supabase
        .from('inventory_items')
        .delete()
        .eq('warehouse_id', id);
      
      if (inventoryItemsError) throw inventoryItemsError;

      // 2. Delete order items that reference this warehouse
      const { error: orderItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('warehouse_id', id);
      
      if (orderItemsError) throw orderItemsError;

      // 3. Delete inventory transactions (source and destination)
      const { error: transactionsSourceError } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('source_warehouse_id', id);
      
      if (transactionsSourceError) throw transactionsSourceError;

      const { error: transactionsDestError } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('destination_warehouse_id', id);
      
      if (transactionsDestError) throw transactionsDestError;

      // 4. Delete inventory counts
      const { error: inventoryCountsError } = await supabase
        .from('inventory_counts')
        .delete()
        .eq('warehouse_id', id);
      
      if (inventoryCountsError) throw inventoryCountsError;

      // 5. Delete inventory levels
      const { error: inventoryLevelsError } = await supabase
        .from('inventory_levels')
        .delete()
        .eq('warehouse_id', id);
      
      if (inventoryLevelsError) throw inventoryLevelsError;

      // 6. Delete warehouse zones (they have CASCADE delete, but being explicit)
      const { error: warehouseZonesError } = await supabase
        .from('warehouse_zones')
        .delete()
        .eq('warehouse_id', id);
      
      if (warehouseZonesError) throw warehouseZonesError;

      // 7. Finally, delete the warehouse itself
      const { error: warehouseError } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);
      
      if (warehouseError) throw warehouseError;
      
      // Remove warehouse from local state
      set(state => ({
        warehouses: state.warehouses.filter(w => w.id !== id),
        selectedWarehouse: state.selectedWarehouse?.id === id 
          ? null 
          : state.selectedWarehouse
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createWarehouseZone: async (zone) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('warehouse_zones')
        .insert([zone])
        .select();
      
      if (error) throw error;
      
      set(state => ({
        warehouseZones: [...state.warehouseZones, data[0] as WarehouseZone]
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  updateWarehouseZone: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('warehouse_zones')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      set(state => ({
        warehouseZones: state.warehouseZones.map(z => 
          z.id === id ? { ...z, ...updates } : z
        )
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  deleteWarehouseZone: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase
        .from('warehouse_zones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      set(state => ({
        warehouseZones: state.warehouseZones.filter(z => z.id !== id)
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  }
}));