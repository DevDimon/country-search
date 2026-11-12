const STORAGE_KEY = 'country-search:history';
const LIMIT = 10;
function getStorage() {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    }
    catch {
        return null;
    }
}
export function loadHistory(storage = getStorage()) {
    if (!storage)
        return [];
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((i) => typeof i === 'string').slice(0, LIMIT);
    }
    catch {
        return [];
    }
}
export function addToHistory(query, storage = getStorage()) {
    const normalised = query.trim();
    if (!normalised)
        return loadHistory(storage);
    const next = [
        normalised,
        ...loadHistory(storage).filter((i) => i.toLowerCase() !== normalised.toLowerCase()),
    ].slice(0, LIMIT);
    try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    catch {
        /* ignore */
    }
    return next;
}
export function clearHistory(storage = getStorage()) {
    try {
        storage?.removeItem(STORAGE_KEY);
    }
    catch {
        /* ignore */
    }
}
//# sourceMappingURL=searchHistory.js.map