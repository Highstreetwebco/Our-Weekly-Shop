import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { freshState, migrateLegacy } from './engine';
import { saveCloud } from './storage';
export function cacheKey(uid) {
  return `ows-whole-shop:${uid || 'guest'}`;
}
async function readCache(uid) {
  const raw = await AsyncStorage.getItem(cacheKey(uid));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return parsed.shop ? parsed : {
    shop: parsed,
    serverRevision: null
  };
}
export default function useShop() {
  const [shop, setShop] = useState(freshState),
    [session, setSession] = useState(null),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState('Opening your shop…'),
    [recovery, setRecovery] = useState(null);
  const uidRef = useRef(null),
    epoch = useRef(0),
    revision = useRef(0),
    queue = useRef(Promise.resolve()),
    loadedAt = useRef(0),
    allowCloud = useRef(false);
  useEffect(() => {
    let live = true;
    async function load(session) {
      const run = ++epoch.current,
        uid = session?.user?.id || null;
      uidRef.current = uid;
      setReady(false);
      setSession(session);
      allowCloud.current = false;
      let local = null,
        cached = null,
        next = freshState(),
        message = 'Saved on this device';
      setRecovery(null);
      try {
        try {
          cached = await readCache(uid);
          local = cached?.shop;
        } catch {
          message = 'Earlier device copy could not be read.';
        }
        next = local || next;
        if (uid) {
          const profile = await supabase.from('profiles').select('app_state').eq('id', uid).maybeSingle();
          if (!live || run !== epoch.current) return;
          if (profile.error) throw profile.error;
          const cloud = profile.data?.app_state || {};
          revision.current = Number(cloud.wholeShop?.updatedAt || 0);
          if (cloud.wholeShop?.version === 1) {
            const pending = local && local.updatedAt > cloud.wholeShop.updatedAt;
            const conflict = pending && cached.serverRevision !== revision.current;
            if (conflict) {
              await AsyncStorage.setItem(`${cacheKey(uid)}:recovery`, JSON.stringify(local));
              setRecovery(local);
            }
            next = pending && !conflict ? local : cloud.wholeShop;
            message = conflict ? 'Another device changed this plan. Account copy loaded; review your unsynced device copy in Account.' : next === local && pending ? 'Device copy loaded — use Save to account to sync.' : 'Saved to your account';
          } else if (!local) {
            next = migrateLegacy(cloud, cloud.familyMembers || [], cloud.multiWeek || {});
            const membership = await supabase.from('household_members').select('household_id').eq('user_id', uid).limit(1).maybeSingle();
            if (membership.error) throw membership.error;
            if (membership.data) {
              const r = await supabase.from('household_people').select('*').eq('household_id', membership.data.household_id);
              if (r.error) throw r.error;
              if (r.data?.length) next.people = r.data;
              const meals = await supabase.from('meals').select('*, meal_ingredients(*, ingredients(name))').eq('household_id', membership.data.household_id);
              if (meals.error) throw meals.error;
              (meals.data || []).forEach(m => {
                next.recipes[m.name] = {
                  emoji: m.emoji || '🍽️',
                  category: m.meal_type || 'dinner',
                  servings: Number(m.servings || m.default_portions || 2),
                  ingredients: (m.meal_ingredients || []).map(i => ({
                    name: i.ingredients?.name || 'Ingredient',
                    quantity: Number(i.quantity || 0),
                    unit: i.unit || 'item'
                  }))
                };
              });
            }
            message = 'Account loaded';
          }
          if (!live || run !== epoch.current) return;
          allowCloud.current = true;
          const recoveryRaw = await AsyncStorage.getItem(`${cacheKey(uid)}:recovery`);
          if (recoveryRaw && run === epoch.current) setRecovery(JSON.parse(recoveryRaw));
        }
      } catch (error) {
        message = local ? 'Device copy loaded. Account sync unavailable.' : 'Account could not be loaded. Changes will stay on this device.';
      }
      if (!live || run !== epoch.current) return;
      loadedAt.current = Number(next.updatedAt || 0);
      setShop(next);
      setStatus(message);
      setReady(true);
    }
    supabase.auth.getSession().then(({
      data,
      error
    }) => {
      if (live) load(error ? null : data.session);
    }).catch(() => {
      if (live) load(null);
    });
    const {
      data
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (live && event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED' && (s?.user?.id || null) !== uidRef.current) setTimeout(() => load(s), 0);
    });
    return () => {
      live = false;
      epoch.current++;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!ready || shop.updatedAt <= loadedAt.current) return;
    const uid = uidRef.current,
      run = epoch.current,
      stamp = shop.updatedAt;
    setStatus('Saving…');
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (run !== epoch.current) return;
      try {
        await AsyncStorage.setItem(cacheKey(uid), JSON.stringify({
          shop,
          serverRevision: revision.current
        }));
      } catch {
        if (run === epoch.current) setStatus('Could not save on this device. Please keep this page open.');
        return;
      }
      let message = 'Saved on this device';
      if (uid && allowCloud.current) {
        try {
          await saveCloud(supabase, uid, shop, revision.current);
          if (run === epoch.current) revision.current = stamp;
          await AsyncStorage.setItem(cacheKey(uid), JSON.stringify({
            shop,
            serverRevision: stamp
          }));
          message = 'Saved to your account';
        } catch (e) {
          message = `Saved on this device. ${e.message || 'Account sync unavailable.'}`;
        }
      } else if (uid) message = 'Saved on this device. Reload to reconnect your account.';
      if (run === epoch.current) setStatus(message);
    });
  }, [ready, shop]);
  function update(fn) {
    setShop(old => ({
      ...(typeof fn === 'function' ? fn(old) : fn),
      updatedAt: Math.max(Date.now(), old.updatedAt + 1)
    }));
  }
  return {
    shop,
    update,
    session,
    ready,
    status,
    recovery,
    sync: () => update(s => s)
  };
}
