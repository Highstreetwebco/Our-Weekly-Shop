import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://oaeihzqzrrxqgidolldb.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_wpl164Sk0BlYOuEIC_ldsw_HKpuWs7s';

// Static exports render without a window; native and browser sessions use AsyncStorage.
const sessionStorage = {
  getItem: (key: string) => typeof window === 'undefined' ? Promise.resolve(null) : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.removeItem(key),
};
export const isSupabaseConfigured = true;
export const supabase = createClient(url, key, {
  auth: { storage: sessionStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
