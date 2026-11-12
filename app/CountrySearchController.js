import { HttpError } from '../api/HttpError.js';
import { debounce } from '../utils/debounce.js';
import { isAbortError, isTimeoutError } from '../utils/errors.js';
import { createTimedSignal } from '../utils/signals.js';
const DEFAULT_DEBOUNCE_MS = 350;
const DEFAULT_TIMEOUT_MS = 8_000;
export class CountrySearchController {
    state = { status: 'idle' };
    listeners = new Set();
    search;
    timeoutMs;
    debounced;
    active = null;
    lastQuery = '';
    constructor(options) {
        this.search = options.search;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.debounced = debounce((q) => {
            void this.runSearch(q);
        }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    }
    getState() {
        return this.state;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.state);
        return () => {
            this.listeners.delete(listener);
        };
    }
    setQuery(rawQuery) {
        this.lastQuery = rawQuery;
        this.cancelActive();
        const query = rawQuery.trim();
        if (query.length === 0) {
            this.debounced.cancel();
            this.setState({ status: 'idle' });
            return;
        }
        this.setState({ status: 'loading', query });
        this.debounced(query);
    }
    retry() {
        const query = this.lastQuery.trim();
        if (query.length === 0)
            return;
        this.cancelActive();
        this.debounced.cancel();
        void this.runSearch(query);
    }
    dispose() {
        this.cancelActive();
        this.debounced.cancel();
        this.listeners.clear();
    }
    cancelActive() {
        if (!this.active)
            return;
        this.active.dispose();
        this.active.controller.abort();
        this.active = null;
    }
    async runSearch(query) {
        const controller = new AbortController();
        const timed = createTimedSignal(controller.signal, this.timeoutMs);
        const request = { controller, dispose: timed.dispose };
        this.active = request;
        this.setState({ status: 'loading', query });
        try {
            const countries = await this.search(query, timed.signal);
            if (this.active !== request)
                return;
            this.setState(countries.length > 0 ? { status: 'success', query, countries } : { status: 'empty', query });
        }
        catch (error) {
            if (this.active !== request)
                return;
            if (isAbortError(error))
                return;
            if (isTimeoutError(error)) {
                this.setState({
                    status: 'error',
                    query,
                    kind: 'timeout',
                    message: 'The request took too long. Please try again.',
                });
                return;
            }
            if (error instanceof HttpError) {
                if (error.status === 404) {
                    this.setState({ status: 'empty', query });
                    return;
                }
                this.setState({
                    status: 'error',
                    query,
                    kind: 'http',
                    message: `Server responded with ${error.status}. Please try again.`,
                });
                return;
            }
            this.setState({
                status: 'error',
                query,
                kind: 'network',
                message: 'Network error. Check your connection and try again.',
            });
        }
        finally {
            if (this.active === request) {
                request.dispose();
                this.active = null;
            }
        }
    }
    setState(state) {
        this.state = state;
        for (const listener of this.listeners)
            listener(state);
    }
}
//# sourceMappingURL=CountrySearchController.js.map