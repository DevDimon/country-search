const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_SHARED_TIMEOUT_MS = 15_000;
export function createCachedSearch(baseSearch, options = {}) {
    const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    const sharedTimeoutMs = options.sharedTimeoutMs ?? DEFAULT_SHARED_TIMEOUT_MS;
    const cache = new Map();
    const inFlight = new Map();
    function remember(key, countries) {
        if (cache.has(key))
            cache.delete(key);
        cache.set(key, countries);
        while (cache.size > maxEntries) {
            const oldest = cache.keys().next();
            if (oldest.done)
                break;
            cache.delete(oldest.value);
        }
    }
    function startRequest(key, query) {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            controller.abort(new DOMException('The shared request timed out', 'TimeoutError'));
        }, sharedTimeoutMs);
        const promise = baseSearch(query, controller.signal)
            .then((countries) => {
            remember(key, countries);
            return countries;
        })
            .finally(() => {
            clearTimeout(timer);
            const cur = inFlight.get(key);
            if (cur?.controller === controller)
                inFlight.delete(key);
        });
        void promise.catch(() => undefined);
        const entry = { controller, promise, refCount: 0 };
        inFlight.set(key, entry);
        return entry;
    }
    return function cachedSearch(query, signal) {
        const key = query.trim().toLowerCase();
        if (key.length === 0)
            return Promise.resolve([]);
        if (signal.aborted)
            return Promise.reject(toError(signal.reason));
        const cached = cache.get(key);
        if (cached) {
            remember(key, cached);
            return Promise.resolve(cached);
        }
        let entry = inFlight.get(key);
        if (entry?.controller.signal.aborted) {
            inFlight.delete(key);
            entry = undefined;
        }
        const activeEntry = entry ?? startRequest(key, query);
        activeEntry.refCount += 1;
        return raceWithSignal(activeEntry.promise, signal).finally(() => {
            activeEntry.refCount -= 1;
            if (activeEntry.refCount <= 0 && inFlight.get(key) === activeEntry) {
                activeEntry.controller.abort();
            }
        });
    };
}
function toError(reason) {
    if (reason instanceof Error)
        return reason;
    return new DOMException(typeof reason === 'string' ? reason : 'The operation was aborted', 'AbortError');
}
function raceWithSignal(promise, signal) {
    if (signal.aborted)
        return Promise.reject(toError(signal.reason));
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            reject(toError(signal.reason));
        };
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then((value) => {
            signal.removeEventListener('abort', onAbort);
            resolve(value);
        }, (error) => {
            signal.removeEventListener('abort', onAbort);
            reject(toError(error));
        });
    });
}
//# sourceMappingURL=cachedSearch.js.map