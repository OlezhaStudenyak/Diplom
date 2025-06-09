import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'order_status_change' | 'delivery_completed';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  subscribeToNotifications: () => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      const notifications = (data || []).map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        orderId: item.order_id,
        createdAt: new Date(item.created_at),
        read: item.read
      }));

      const unreadCount = notifications.filter(n => !n.read).length;

      set({ notifications, unreadCount, error: null });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ error: 'Failed to fetch notifications' });
    } finally {
      set({ loading: false });
    }
  },

  addNotification: (notification) => {
    try {
      const newNotification: Notification = {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        read: false,
        ...notification,
      };

      set(state => ({
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }));
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  },

  markAsRead: async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      set(state => ({
        notifications: state.notifications.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }

      set(state => ({
        notifications: state.notifications.map(notification => ({ ...notification, read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  removeNotification: async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error removing notification:', error);
        throw error;
      }

      set(state => {
        const notification = state.notifications.find(n => n.id === id);
        return {
          notifications: state.notifications.filter(n => n.id !== id),
          unreadCount: notification && !notification.read 
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount
        };
      });
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  },

  clearAll: async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) {
        console.error('Error clearing notifications:', error);
        throw error;
      }

      set({ notifications: [], unreadCount: 0 });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  },

  subscribeToNotifications: () => {
    try {
      // Завантажуємо сповіщення при підписці
      get().fetchNotifications();

      // Підписуємося на зміни в таблиці сповіщень
      const channel = supabase
        .channel('notifications-changes')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        }, (payload) => {
          try {
            const newNotification = {
              id: payload.new.id,
              type: payload.new.type,
              title: payload.new.title,
              message: payload.new.message,
              orderId: payload.new.order_id,
              createdAt: new Date(payload.new.created_at),
              read: payload.new.read
            };

            set(state => ({
              notifications: [newNotification, ...state.notifications],
              unreadCount: state.unreadCount + (newNotification.read ? 0 : 1)
            }));
          } catch (error) {
            console.error('Error processing notification update:', error);
          }
        })
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error unsubscribing from notifications:', error);
        }
      };
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return () => {}; // Return empty cleanup function
    }
  }
}));