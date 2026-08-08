/**
 * businessSession.ts
 *
 * Holds the currently "signed-in" sales rep for the Business Suite on a shared
 * shop device. The device is authenticated as the OWNER's account; reps switch
 * themselves in by PIN (verified server-side via /business/staff/verify-pin).
 * Whoever is active here gets stamped onto every sale and stock movement, which
 * is the whole point of the theft-attribution story.
 *
 * Kept in memory + AsyncStorage so it survives a screen change but is easy to
 * clear. null == the owner is acting directly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActiveRep { _id: string; name: string; role?: string; }

const KEY = 'business_active_rep';
let current: ActiveRep | null = null;
let loaded = false;
type Listener = (rep: ActiveRep | null) => void;
const listeners = new Set<Listener>();

export async function loadActiveRep(): Promise<ActiveRep | null> {
  if (loaded) return current;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    current = raw ? JSON.parse(raw) : null;
  } catch {
    current = null;
  }
  loaded = true;
  return current;
}

export function getActiveRep(): ActiveRep | null {
  return current;
}

export async function setActiveRep(rep: ActiveRep | null): Promise<void> {
  current = rep;
  loaded = true;
  try {
    if (rep) await AsyncStorage.setItem(KEY, JSON.stringify(rep));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
  listeners.forEach((l) => l(current));
}

/** staffId to send with a sale/stock action — undefined means "owner acting". */
export function activeStaffId(): string | undefined {
  return current?._id || undefined;
}

export function subscribeActiveRep(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
