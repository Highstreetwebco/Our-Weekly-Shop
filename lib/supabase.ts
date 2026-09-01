import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// The app remains usable in demo mode until Supabase details are added.
export const isSupabaseConfigured = Boolean(url && key);
export const supabase = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : null;
