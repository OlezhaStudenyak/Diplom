import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  initialized: false,

  initializeAuth: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        set({ 
          error: 'Failed to get session',
          initialized: true,
          loading: false
        });
        return;
      }
      
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Profile error:', profileError);
            if (profileError.code === 'PGRST116') {
              await supabase.auth.signOut();
              set({ 
                user: null, 
                session: null,
                error: 'Profile not found. Please sign in again.',
                initialized: true,
                loading: false
              });
              return;
            }
            throw profileError;
          }

          if (profile) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email || '',
                role: profile.role,
                firstName: profile.first_name,
                lastName: profile.last_name,
                profileImage: profile.profile_image,
                createdAt: profile.created_at,
              },
              session,
              error: null,
              initialized: true,
              loading: false
            });
          } else {
            throw new Error('Profile data is null');
          }
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
          await supabase.auth.signOut();
          set({ 
            user: null, 
            session: null,
            error: 'Failed to load profile',
            initialized: true,
            loading: false
          });
        }
      } else {
        set({
          user: null,
          session: null,
          error: null,
          initialized: true,
          loading: false
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ 
        error: 'Failed to initialize authentication',
        initialized: true,
        loading: false
      });
    }
  },

  login: async (email, password) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Login error:', authError);
        set({ 
          error: 'Invalid email or password',
          loading: false
        });
        throw authError;
      }

      if (data.user && data.session) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            if (profileError.code === 'PGRST116') {
              await supabase.auth.signOut();
              set({ 
                user: null, 
                session: null,
                error: 'Profile not found. Please contact support.',
                loading: false
              });
              throw new Error('Profile not found');
            }
            throw profileError;
          }

          set({
            user: {
              id: data.user.id,
              email: data.user.email || '',
              role: profile.role,
              firstName: profile.first_name,
              lastName: profile.last_name,
              profileImage: profile.profile_image,
              createdAt: profile.created_at,
            },
            session: data.session,
            error: null,
            loading: false
          });
        } catch (profileError) {
          console.error('Error in login profile fetch:', profileError);
          await supabase.auth.signOut();
          set({ 
            user: null, 
            session: null,
            error: 'Failed to load user profile',
            loading: false
          });
          throw profileError;
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred during login',
        loading: false
      });
      throw error;
    }
  },

  signup: async (email, password, firstName, lastName, role) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role
          }
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw signUpError;
      }

      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                first_name: firstName,
                last_name: lastName,
                role,
                email,
              },
            ])
            .select()
            .single();

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // If profile creation fails, clean up the auth user
            await supabase.auth.signOut();
            throw profileError;
          }

          set({
            user: {
              id: data.user.id,
              email: data.user.email || '',
              role,
              firstName,
              lastName,
              createdAt: new Date().toISOString(),
            },
            session: data.session,
            error: null,
            loading: false
          });
        } catch (profileError) {
          console.error('Error in signup profile creation:', profileError);
          await supabase.auth.signOut();
          set({ 
            user: null, 
            session: null,
            error: 'Failed to create user profile',
            loading: false
          });
          throw profileError;
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'An error occurred during signup',
        loading: false
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      await supabase.auth.signOut();
      set({ 
        user: null, 
        session: null,
        error: null,
        loading: false
      });
    } catch (error) {
      console.error('Logout error:', error);
      set({ 
        error: 'Failed to log out',
        loading: false
      });
      throw error;
    }
  },

  resetPassword: async (email) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      set({
        error: null,
        loading: false
      });
    } catch (error) {
      console.error('Password reset error:', error);
      set({ 
        error: 'Failed to send password reset email',
        loading: false
      });
      throw error;
    }
  },
}));