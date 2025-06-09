import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hunmwivokrpnqfszwhla.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bm13aXZva3JwbnFmc3p3aGxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3ODU1OSwiZXhwIjoyMDY0NDU0NTU5fQ.7EqvzyTWto4bSgcvqQNNUSDxGC08jumk3ZjBOXCs_Mc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);