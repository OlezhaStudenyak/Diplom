import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Vehicle, VehicleLocation, DeliveryRoute, DeliveryStop } from '../types';

// Helper functions for data transformation
const transformVehicle = (data: any): Vehicle => ({
  id: data.id,
  licensePlate: data.license_plate,
  model: data.model,
  make: data.make,
  year: data.year,
  capacity: data.capacity,
  status: data.status,
  lastMaintenanceDate: data.last_maintenance_date,
  nextMaintenanceDate: data.next_maintenance_date,
  notes: data.notes,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

const transformRoute = (data: any): DeliveryRoute => ({
  id: data.id,
  vehicleId: data.vehicle_id,
  driverId: data.driver_id,
  status: data.status,
  startTime: data.start_time,
  endTime: data.end_time,
  totalDistance: data.total_distance,
  totalStops: data.total_stops,
  notes: data.notes,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  vehicle: data.vehicle ? transformVehicle(data.vehicle) : undefined,
  driver: data.driver ? {
    id: data.driver.id,
    firstName: data.driver.first_name,
    lastName: data.driver.last_name
  } : undefined
});

const transformStop = (data: any): DeliveryStop => ({
  id: data.id,
  routeId: data.route_id,
  orderId: data.order_id,
  sequenceNumber: data.sequence_number,
  status: data.status,
  plannedArrival: data.planned_arrival,
  actualArrival: data.actual_arrival,
  latitude: data.latitude,
  longitude: data.longitude,
  address: data.address,
  notes: data.notes,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

// Helper function to convert camelCase to snake_case for database operations
const toSnakeCase = (data: any): any => {
  const snakeCase: any = {};
  Object.keys(data).forEach(key => {
    snakeCase[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = data[key];
  });
  return snakeCase;
};

interface LogisticsState {
  vehicles: Vehicle[];
  vehicleLocations: Record<string, VehicleLocation>;
  routes: DeliveryRoute[];
  stops: DeliveryStop[];
  selectedVehicle: Vehicle | null;
  selectedRoute: DeliveryRoute | null;
  vehicleLocationChannel: RealtimeChannel | null;
  loading: boolean;
  error: string | null;
  fetchVehicles: () => Promise<void>;
  fetchVehicleLocations: () => Promise<void>;
  fetchRoutes: (status?: DeliveryRoute['status']) => Promise<void>;
  fetchRouteStops: (routeId: string) => Promise<void>;
  selectVehicle: (vehicle: Vehicle | null) => void;
  selectRoute: (route: DeliveryRoute | null) => void;
  createVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
  createRoute: (route: Omit<DeliveryRoute, 'id' | 'createdAt'>) => Promise<DeliveryRoute>;
  updateRoute: (id: string, updates: Partial<DeliveryRoute>) => Promise<void>;
  createStop: (stop: Omit<DeliveryStop, 'id'>) => Promise<void>;
  updateStop: (id: string, updates: Partial<DeliveryStop>) => Promise<void>;
  subscribeToVehicleLocations: () => () => void;
  simulateGPSUpdates: () => Promise<void>;
}

export const useLogisticsStore = create<LogisticsState>((set, get) => ({
  vehicles: [],
  vehicleLocations: {},
  routes: [],
  stops: [],
  selectedVehicle: null,
  selectedRoute: null,
  vehicleLocationChannel: null,
  loading: false,
  error: null,

  fetchVehicles: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('license_plate');
      
      if (error) throw error;
      
      set({ vehicles: data.map(transformVehicle) });
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchVehicleLocations: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('vehicle_locations')
        .select('*');
      
      if (error) throw error;
      
      const locations: Record<string, VehicleLocation> = {};
      data.forEach(location => {
        locations[location.vehicle_id] = {
          id: location.id,
          vehicleId: location.vehicle_id,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          speed: location.speed,
          updatedAt: location.updated_at,
          route_progress: location.route_progress
        };
      });
      
      set({ vehicleLocations: locations });
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchRoutes: async (status) => {
    try {
      set({ loading: true, error: null });
      
      let query = supabase
        .from('delivery_routes')
        .select(`
          *,
          vehicle:vehicles(*),
          driver:profiles(id, first_name, last_name)
        `)
        .order('start_time', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      set({ routes: data.map(transformRoute) });
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  fetchRouteStops: async (routeId) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('delivery_stops')
        .select('*')
        .eq('route_id', routeId)
        .order('sequence_number');
      
      if (error) throw error;
      
      set({ stops: data.map(transformStop) });
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  selectVehicle: (vehicle) => {
    set({ selectedVehicle: vehicle });
  },

  selectRoute: (route) => {
    set({ selectedRoute: route });
  },

  createVehicle: async (vehicle) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert([toSnakeCase(vehicle)])
        .select();
      
      if (error) throw error;
      
      const newVehicle = transformVehicle(data[0]);
      set(state => ({
        vehicles: [...state.vehicles, newVehicle]
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  updateVehicle: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('vehicles')
        .update(toSnakeCase(updates))
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      const updatedVehicle = transformVehicle(data[0]);
      set(state => ({
        vehicles: state.vehicles.map(v => 
          v.id === id ? updatedVehicle : v
        ),
        selectedVehicle: state.selectedVehicle?.id === id 
          ? updatedVehicle
          : state.selectedVehicle
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  createRoute: async (route) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('delivery_routes')
        .insert([{
          ...toSnakeCase(route),
          created_at: new Date().toISOString(),
        }])
        .select(`
          *,
          vehicle:vehicles(*),
          driver:profiles(id, first_name, last_name)
        `);
      
      if (error) throw error;

      const newRoute = transformRoute(data[0]);
      set(state => ({
        routes: [...state.routes, newRoute]
      }));
      
      return newRoute;
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateRoute: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('delivery_routes')
        .update(toSnakeCase(updates))
        .eq('id', id)
        .select(`
          *,
          vehicle:vehicles(*),
          driver:profiles(id, first_name, last_name)
        `);
      
      if (error) throw error;

      const updatedRoute = transformRoute(data[0]);
      set(state => ({
        routes: state.routes.map(r => 
          r.id === id ? updatedRoute : r
        ),
        selectedRoute: state.selectedRoute?.id === id 
          ? updatedRoute
          : state.selectedRoute
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  createStop: async (stop) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('delivery_stops')
        .insert([toSnakeCase(stop)])
        .select();
      
      if (error) throw error;
      
      const newStop = transformStop(data[0]);
      set(state => ({
        stops: [...state.stops, newStop]
      }));
    } catch (error) {
      if (error instanceof Error) {
        set({ error: error.message });
      }
    } finally {
      set({ loading: false });
    }
  },

  updateStop: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('delivery_stops')
        .update(toSnakeCase(updates))
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      const updatedStop = transformStop(data[0]);
      set(state => ({
        stops: state.stops.map(s => 
          s.id === id ? updatedStop : s
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

  subscribeToVehicleLocations: () => {
    const state = get();
    
    // Check if we already have a channel
    if (state.vehicleLocationChannel) {
      // Check if the channel is already subscribed
      if (state.vehicleLocationChannel.state === 'SUBSCRIBED') {
        // Return a no-op function since we're already subscribed
        return () => {};
      }
    }
    
    // Create a new channel if we don't have one
    const channel = supabase
      .channel('vehicle-locations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_locations',
      }, (payload) => {
        const location = payload.new as any;
        set(state => ({
          vehicleLocations: {
            ...state.vehicleLocations,
            [location.vehicle_id]: {
              id: location.id,
              vehicleId: location.vehicle_id,
              latitude: location.latitude,
              longitude: location.longitude,
              heading: location.heading,
              speed: location.speed,
              updatedAt: location.updated_at,
              route_progress: location.route_progress
            }
          }
        }));
      });
    
    // Store the channel in state
    set({ vehicleLocationChannel: channel });
    
    // Subscribe to the channel
    channel.subscribe();
    
    // Return cleanup function
    return () => {
      const currentState = get();
      if (currentState.vehicleLocationChannel) {
        supabase.removeChannel(currentState.vehicleLocationChannel);
        set({ vehicleLocationChannel: null });
      }
    };
  },

  simulateGPSUpdates: async () => {
    try {
      // Використовуємо edge function замість RPC
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schedule-gps-updates`;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('GPS simulation error:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('GPS simulation result:', result);
    } catch (error) {
      console.error('Error simulating GPS updates:', error);
    }
  }
}));