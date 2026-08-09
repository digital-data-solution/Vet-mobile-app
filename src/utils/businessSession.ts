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

// ─────────────────────────────────────────────────────────────────────────────
// STAFF AUTH SESSION (hybrid logins)
//
// Separate from the shared-device PIN switcher above. This is an individual
// staff member logging in on THEIR OWN phone with a username + password. When a
// staff session is present, business API calls carry the scoped staff token
// (see businessFetch in api/client.ts) INSTEAD of the owner's Supabase token,
// and the Business UI is scoped to the staff member's permissions.
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffPermissions {
  sell:            boolean;
  viewReports:     boolean;
  manageInventory: boolean;
  adjustStock:     boolean;
  manageStaff:     boolean;
  dispense:        boolean;
}

export interface StaffAuth {
  id:            string;
  name:          string;
  role?:         string;
  permissions:   StaffPermissions;
  ownerId?:      string;
  businessName?: string;
}

export interface StaffSession {
  staffToken: string;
  staff:      StaffAuth;
}

const STAFF_KEY = 'business_staff_session';
let staffSession: StaffSession | null = null;
let staffLoaded = false;
type StaffListener = (s: StaffSession | null) => void;
const staffListeners = new Set<StaffListener>();

export async function loadStaffSession(): Promise<StaffSession | null> {
  if (staffLoaded) return staffSession;
  try {
    const raw = await AsyncStorage.getItem(STAFF_KEY);
    staffSession = raw ? JSON.parse(raw) : null;
  } catch {
    staffSession = null;
  }
  staffLoaded = true;
  return staffSession;
}

export function getStaffSession(): StaffSession | null {
  return staffSession;
}

/** The scoped staff token for Authorization: Bearer, or undefined for owner mode. */
export function getStaffToken(): string | undefined {
  return staffSession?.staffToken || undefined;
}

export async function setStaffSession(s: StaffSession | null): Promise<void> {
  staffSession = s;
  staffLoaded = true;
  try {
    if (s) await AsyncStorage.setItem(STAFF_KEY, JSON.stringify(s));
    else await AsyncStorage.removeItem(STAFF_KEY);
  } catch {
    /* non-fatal */
  }
  staffListeners.forEach((l) => l(staffSession));
}

export async function clearStaffSession(): Promise<void> {
  await setStaffSession(null);
}

export function subscribeStaffSession(l: StaffListener): () => void {
  staffListeners.add(l);
  return () => staffListeners.delete(l);
}
