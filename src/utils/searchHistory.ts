import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY   = 'xv_search_history';
const LIMIT = 6;

export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addSearchTerm(term: string): Promise<void> {
  const cleaned = term.trim();
  if (!cleaned || cleaned.length < 2) return;
  try {
    const prev = await getSearchHistory();
    const deduped = [cleaned, ...prev.filter((t) => t.toLowerCase() !== cleaned.toLowerCase())].slice(0, LIMIT);
    await AsyncStorage.setItem(KEY, JSON.stringify(deduped));
  } catch {}
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
