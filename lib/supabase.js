import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://oaeihzqzrrxqgidolldb.supabase.co";
const supabasePublishableKey = "sb_publishable_wpl164Sk0BlYOuEIC_ldsw_HKpuWs7s";

// Static web exports run once without a browser. This adapter keeps that pass
// safe, then uses localStorage on web and AsyncStorage in the native app.
const sessionStorage = {
  async getItem(key) {
    if (typeof window === "undefined") return null;
    if (window.localStorage) return window.localStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === "undefined") return;
    if (window.localStorage) window.localStorage.setItem(key, value);
    else await AsyncStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window === "undefined") return;
    if (window.localStorage) window.localStorage.removeItem(key);
    else await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
