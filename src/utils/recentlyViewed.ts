import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentItem {
  id:       string;
  type:     'professional' | 'kennel' | 'shop';
  name:     string;
  role?:    string;
  emoji?:   string;
  color?:   string;
  viewedAt: number;
}

const KEY     = 'xv_recently_viewed';
const MAX     = 6;

async function load(): Promise<RecentItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getRecentlyViewed(): Promise<RecentItem[]> {
  return load();
}

export async function addRecentlyViewed(item: Omit<RecentItem, 'viewedAt'>): Promise<void> {
  try {
    const items = await load();
    const filtered = items.filter((r) => r.id !== item.id);
    filtered.unshift({ ...item, viewedAt: Date.now() });
    if (filtered.length > MAX) filtered.splice(MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
  } catch {}
}
