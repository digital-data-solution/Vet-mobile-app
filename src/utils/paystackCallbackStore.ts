export interface PaystackCallbacks {
  onSuccess: (reference: string) => void | Promise<void>;
  onCancel:  () => void;
}

const store = new Map<string, PaystackCallbacks>();

export function storePaystackCallbacks(key: string, callbacks: PaystackCallbacks): void {
  store.set(key, callbacks);
}

export function getPaystackCallbacks(key: string): PaystackCallbacks | undefined {
  return store.get(key);
}

export function clearPaystackCallbacks(key: string): void {
  store.delete(key);
}
