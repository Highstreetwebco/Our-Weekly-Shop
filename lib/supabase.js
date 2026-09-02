import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://oaeihzqzrrxqgidolldb.supabase.co";
const supabasePublishableKey = "sb_publishable_wpl164Sk0BlYOuEIC_ldsw_HKpuWs7s";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
