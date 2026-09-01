import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://oaeihzqzrrxqgidolldb.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_wpl164Sk0BlYOuEIC_ldsw_HKpuWs7s';

// The app remains usable in demo mode until Supabase details are added.
export const isSupabaseConfigured = true;
export const supabase = createClient(url, key, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
