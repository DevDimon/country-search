import { HttpError } from '../api/HttpError.js';
import type { Country } from '../types.js';
import { debounce, type DebouncedFunction } from '../utils/debounce.js';
import { isAbortError, isTimeoutError } from '../utils/errors.js';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; kind: 'timeout' | 'http' | 'network'; message: string };

export type SearchFn = (query: string, signal: AbortSignal) => Promise<Country[]>;

export interface CountrySearchControllerOptions {
  search: SearchFn;
  debounceMs?: number;
  timeoutMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 350;
const DEFAULT_TIMEOUT_MS = 8_000;

export class CountrySearchController {
  private state: SearchState = { status: 'idle' };
  private readonly listeners = new Set<(state: SearchState) => void>();
  private readonly search: SearchFn;
  private readonly timeoutMs: number;
  private readonly debounced: DebouncedFunction<[string]>;
  private requestId = 0; // ← replaces the real abort for now
  private lastQuery = '';

  constructor(options: CountrySearchControllerOptions) {
    this.search = options.search;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.debounced = debounce((query: string) => {
      void this.runSearch(query);
    }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  }

  getState(): SearchState {
    return this.state;
  }

  subscribe(listener: (state: SearchState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setQuery(rawQuery: string): void {
    this.lastQuery = rawQuery;
    this.requestId += 1;
    const query = rawQuery.trim();
    if (query.length === 0) {
      this.debounced.cancel();
      this.setState({ status: 'idle' });
      return;
    }
    this.setState({ status: 'loading', query });
    this.debounced(query);
  }

  retry(): void {
    const query = this.lastQuery.trim();
    if (query.length === 0) return;
    this.debounced.cancel();
    void this.runSearch(query);
  }

  dispose(): void {
    this.requestId += 1;
    this.debounced.cancel();
    this.listeners.clear();
  }

  private async runSearch(query: string): Promise<void> {
    const id = ++this.requestId;
    const timeoutController = new AbortController();
    const timer = setTimeout(() => {
      timeoutController.abort(new DOMException('The request timed out', 'TimeoutError'));
    }, this.timeoutMs);

    try {
      const countries = await this.search(query, timeoutController.signal);
      if (id !== this.requestId) return;
      this.setState(
        countries.length > 0 ? { status: 'success', query, countries } : { status: 'empty', query },
      );
    } catch (error) {
      if (id !== this.requestId) return;
      if (isAbortError(error)) return;
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
    } finally {
      clearTimeout(timer);
    }
  }

  private setState(state: SearchState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
