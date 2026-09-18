/**
 * Safe Storage Implementation
 * Prevents crashes in environments where localStorage is restricted or throws
 * (e.g., Firefox cross-origin iframe with Total Cookie Protection, private browsing, etc.)
 */

const memoryStore = new Map<string, string>();

let isLocalStorageWorking = false;

try {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    const testKey = '__qrms_storage_probe__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isLocalStorageWorking = true;
  }
} catch {
  isLocalStorageWorking = false;
}

export const safeStorage = {
  isAvailable(): boolean {
    return isLocalStorageWorking;
  },

  getItem(key: string): string | null {
    if (isLocalStorageWorking) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch {
        // Fall back to memoryStore
      }
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    const strVal = String(value);
    memoryStore.set(key, strVal);
    if (isLocalStorageWorking) {
      try {
        window.localStorage.setItem(key, strVal);
      } catch {
        // Quota exceeded or restricted
      }
    }
  },

  removeItem(key: string): void {
    memoryStore.delete(key);
    if (isLocalStorageWorking) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  },

  clear(): void {
    memoryStore.clear();
    if (isLocalStorageWorking) {
      try {
        window.localStorage.clear();
      } catch {}
    }
  },

  key(index: number): string | null {
    if (isLocalStorageWorking) {
      try {
        return window.localStorage.key(index);
      } catch {}
    }
    return Array.from(memoryStore.keys())[index] ?? null;
  },

  get length(): number {
    if (isLocalStorageWorking) {
      try {
        return window.localStorage.length;
      } catch {}
    }
    return memoryStore.size;
  },

  getAllKeys(): string[] {
    const keys = new Set<string>(memoryStore.keys());
    if (isLocalStorageWorking) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.add(k);
        }
      } catch {}
    }
    return Array.from(keys);
  },
};
