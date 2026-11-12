import { HttpError } from '../api/HttpError.js';
import type { Country } from '../types.js';
import { debounce, type DebouncedFunction } from '../utils/debounce.js';
import { isAbortError, isTimeoutError } from '../utils/errors.js';
import { createTimedSignal } from '../utils/signals.js';

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

interface ActiveRequest {
  controller: AbortController;
  dispose: () => void;
}

const DEFAULT_DEBOUNCE_MS = 350;
const DEFAULT_TIMEOUT_MS = 8_000;

export class CountrySearchController {
  private state: SearchState = { status: 'idle' };
  private readonly listeners = new Set<(state: SearchState) => void>();
  private readonly search: SearchFn;
  private readonly timeoutMs: number;
  private readonly debounced: DebouncedFunction<[string]>;
  private active: ActiveRequest | null = null;
  private lastQuery = '';

  constructor(options: CountrySearchControllerOptions) {
    this.search = options.search;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.debounced = debounce((q: string) => {
      void this.runSearch(q);
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

  retry(): void {
    const query = this.lastQuery.trim();
    if (query.length === 0) return;
    this.cancelActive();
    this.debounced.cancel();
    void this.runSearch(query);
  }

  dispose(): void {
    this.cancelActive();
    this.debounced.cancel();
    this.listeners.clear();
  }

  private cancelActive(): void {
    if (!this.active) return;
    this.active.dispose();
    this.active.controller.abort();
    this.active = null;
  }

  private async runSearch(query: string): Promise<void> {
    const controller = new AbortController();
    const timed = createTimedSignal(controller.signal, this.timeoutMs);
    const request: ActiveRequest = { controller, dispose: timed.dispose };
    this.active = request;
    this.setState({ status: 'loading', query });

    try {
      const countries = await this.search(query, timed.signal);
      if (this.active !== request) return;
      this.setState(
        countries.length > 0 ? { status: 'success', query, countries } : { status: 'empty', query },
      );
    } catch (error) {
      if (this.active !== request) return;
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
      if (this.active === request) {
        request.dispose();
        this.active = null;
      }
    }
  }

  private setState(state: SearchState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
