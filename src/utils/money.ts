/**
 * money.ts — currency formatting for a multi-country product.
 *
 * A Lagos shop shows ₦, a Riyadh clinic shows SAR — the symbol is the business's
 * choice (BusinessProfile.currencySymbol). We cache it locally so every screen
 * formats consistently and instantly, even before the profile is re-fetched, and
 * default to ₦ so nothing ever renders without a symbol.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'biz.currencySymbol';
let symbol = '₦';

/** Currencies a business can pick. `symbol` is what prints on receipts. */
export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: 'NGN', symbol: '₦',  label: 'Nigerian Naira (₦)' },
  { code: 'USD', symbol: '$',  label: 'US Dollar ($)' },
  { code: 'SAR', symbol: 'SR', label: 'Saudi Riyal (SR)' },
  { code: 'AED', symbol: 'AED',label: 'UAE Dirham (AED)' },
  { code: 'EUR', symbol: '€',  label: 'Euro (€)' },
  { code: 'GBP', symbol: '£',  label: 'British Pound (£)' },
  { code: 'GHS', symbol: '₵',  label: 'Ghanaian Cedi (₵)' },
  { code: 'KES', symbol: 'KSh',label: 'Kenyan Shilling (KSh)' },
  { code: 'ZAR', symbol: 'R',  label: 'South African Rand (R)' },
  { code: 'INR', symbol: '₹',  label: 'Indian Rupee (₹)' },
  { code: 'CNY', symbol: '¥',  label: 'Chinese Yuan (¥)' },
];

export function symbolForCode(code?: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || '₦';
}

/** Load the cached symbol at startup (call once on app boot). */
export async function loadCurrency(): Promise<void> {
  try { const s = await AsyncStorage.getItem(KEY); if (s) symbol = s; } catch {}
}

/** Set + persist the active currency symbol. */
export function setCurrencySymbol(s?: string | null): void {
  symbol = s || '₦';
  AsyncStorage.setItem(KEY, symbol).catch(() => {});
}

export function getCurrencySymbol(): string { return symbol; }

/** Format an amount with the active currency symbol and grouping. */
export function money(n: number | null | undefined, overrideSymbol?: string): string {
  const s = overrideSymbol || symbol;
  const v = Number(n) || 0;
  return `${s}${v.toLocaleString()}`;
}
