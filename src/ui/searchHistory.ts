const STORAGE_KEY = 'country-search:history';
const LIMIT = 10;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadHistory(storage: StorageLike | null = getStorage()): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((i): i is string => typeof i === 'string').slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function addToHistory(query: string, storage: StorageLike | null = getStorage()): string[] {
  const normalised = query.trim();
  if (!normalised) return loadHistory(storage);
  const next = [
    normalised,
    ...loadHistory(storage).filter((i) => i.toLowerCase() !== normalised.toLowerCase()),
  ].slice(0, LIMIT);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearHistory(storage: StorageLike | null = getStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
