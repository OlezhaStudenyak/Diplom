import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RouteOptimizationRequest, RouteOptimizationResponse } from '../types';

interface RouteState {
  optimizedRoute: RouteOptimizationResponse | null;
  loading: boolean;
  error: string | null;
  optimizeRoute: (request: RouteOptimizationRequest) => Promise<void>;
}

export const useRouteStore = create<RouteState>((set) => ({
  optimizedRoute: null,
  loading: false,
  error: null,

  optimizeRoute: async (request) => {
    try {
      set({ loading: true, error: null });

      console.log('Optimizing route with request:', request);

      // Використовуємо правильний URL для edge function
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/route-optimization`;
      
      // Отримуємо поточну сесію для авторизації
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('Calling edge function:', functionUrl);

      // Додаємо Mapbox токен до запиту
      const requestWithToken = {
        ...request,
        mapboxToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
      };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestWithToken),
      });

      console.log('Edge function response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Edge function error:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const optimizedRoute = await response.json();
      console.log('Optimized route received:', optimizedRoute);
      
      set({ optimizedRoute });

    } catch (error) {
      console.error('Error optimizing route:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to optimize route';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));