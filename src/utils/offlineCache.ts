/**
 * offlineCache.ts
 *
 * Caches the last successful response body for GET requests so screens keep
 * showing real data — not a blank error state — when the device has no
 * connection. Wired into api/client.ts's requestJson: every successful GET
 * gets saved here; a GET that fails with a network error or timeout falls
 * back to whatever was last cached for that exact path.
 *
 * Deliberately GET-only. Bookings, payments and record writes always need a
 * live server round trip — queuing a payment offline and hoping it "syncs"
 * later is a real financial/double-booking risk, not a UX nicety, so writes
 * are never cached or queued here and still fail loudly with no connection.
 *
 * Entries are namespaced per signed-in actor (owner vs a specific individual
 * staff login), because Business Suite explicitly supports one physical
 * device being used by different people (see businessSession.ts). Without
 * this, the next person to log in on a shared clinic device could see the
 * previous person's cached patient/sales data while offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';
import { loadStaffSession } from './businessSession';

const PREFIX      = 'xv_cache:';
const MAX_ENTRIES  = 80; // best-effort cap so this can't grow unbounded on a device left logged in for months

async function namespace(): Promise<string> {
  try {
    const staffSession = await loadStaffSession();
    if (staffSession?.staff?.id) return `staff:${staffSession.staff.id}`;
  } catch {}
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return `owner:${session.user.id}`;
  } catch {}
  return 'anon';
}

async function cacheKey(path: string): Promise<string> {
  return `${PREFIX}${await namespace()}:${path}`;
}

async function allCacheKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((k) => k.startsWith(PREFIX));
  } catch {
    return [];
  }
}

export async function saveCachedResponse(path: string, body: unknown): Promise<void> {
  try {
    const key = await cacheKey(path);
    await AsyncStorage.setItem(key, JSON.stringify({ body, cachedAt: Date.now() }));

    // Trim oldest entries past the cap — best-effort, never blocks the caller.
    const keys = await allCacheKeys();
    if (keys.length > MAX_ENTRIES) {
      const entries = await Promise.all(keys.map(async (k) => {
        const raw = await AsyncStorage.getItem(k);
        let cachedAt = 0;
        try { cachedAt = raw ? JSON.parse(raw).cachedAt ?? 0 : 0; } catch {}
        return { k, cachedAt };
      }));
      entries.sort((a, b) => a.cachedAt - b.cachedAt);
      const drop = entries.slice(0, entries.length - MAX_ENTRIES).map((e) => e.k);
      if (drop.length) await AsyncStorage.multiRemove(drop);
    }
  } catch {
    // Non-fatal — worst case, offline fallback just has nothing to serve.
  }
}

export async function loadCachedResponse(
  path: string,
): Promise<{ body: any; cachedAt: number } | null> {
  try {
    const key = await cacheKey(path);
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Wipe cached responses for the CURRENT actor only. Call before clearing their session on logout. */
export async function clearOfflineCacheForCurrentActor(): Promise<void> {
  try {
    const ns = await namespace();
    const mine = (await allCacheKeys()).filter((k) => k.startsWith(`${PREFIX}${ns}:`));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {}
}
