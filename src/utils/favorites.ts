import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoriteItem {
  id:           string;
  type:         'professional' | 'kennel' | 'shop';
  name:         string;
  role?:        string;
  address?:     string;
  profileImage?: string;
  savedAt:      number;
}

const KEY = 'xv_favorites';

async function load(): Promise<FavoriteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function save(items: FavoriteItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

export async function getFavorites(): Promise<FavoriteItem[]> {
  return load();
}

export async function isFavorite(id: string): Promise<boolean> {
  const items = await load();
  return items.some((f) => f.id === id);
}

export async function toggleFavorite(item: Omit<FavoriteItem, 'savedAt'>): Promise<boolean> {
  const items = await load();
  const idx = items.findIndex((f) => f.id === item.id);
  if (idx >= 0) {
    items.splice(idx, 1);
    await save(items);
    return false;
  }
  items.unshift({ ...item, savedAt: Date.now() });
  // Keep max 50 favorites
  if (items.length > 50) items.splice(50);
  await save(items);
  return true;
}
