import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCountries } from '../src/api/searchCountries.js';
import { CountrySearchController } from '../src/app/CountrySearchController.js';
import type { CountryRaw } from '../src/types.js';
import { toError } from './helpers.js';

interface ControlledRequest {
  url: string;
  signal: AbortSignal;
  promise: Promise<Response>;
  resolve: (body: CountryRaw[], status?: number) => void;
  reject: (error: unknown) => void;
}

function toUrlString(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function createControlledFetch() {
  const requests: ControlledRequest[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = toUrlString(input);
    const signal = init?.signal ?? new AbortController().signal;
    let resolveResponse!: (r: Response) => void;
    let rejectResponse!: (e: unknown) => void;
    const promise = new Promise<Response>((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });
    const onAbort = (): void => {
      rejectResponse(toError(signal.reason));
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
    requests.push({
      url,
      signal,
      promise,
      resolve: (body, status = 200) => {
        signal.removeEventListener('abort', onAbort);
        resolveResponse(
          new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      },
      reject: (error) => {
        signal.removeEventListener('abort', onAbort);
        rejectResponse(error);
      },
    });
    return promise;
  });
  return { fetchMock, requests };
}

describe('race condition: stale responses', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts the active request immediately on every input change', async () => {
    const signals: AbortSignal[] = [];
    const search = vi.fn((_query: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<any>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(toError(signal.reason)), { once: true });
      });
    });
    const controller = new CountrySearchController({ search, debounceMs: 100, timeoutMs: 1_000 });
    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(100);
    expect(signals).toHaveLength(1);
    expect(signals[0]!.aborted).toBe(false);
    controller.setQuery('spain');
    expect(signals[0]!.aborted).toBe(true);
  });

  it('really aborts the older request and only renders the last query', async () => {
    const { fetchMock, requests } = createControlledFetch();
    vi.stubGlobal('fetch', fetchMock);

    const controller = new CountrySearchController({
      search: searchCountries,
      debounceMs: 300,
      timeoutMs: 5_000,
    });

    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(300);
    expect(requests).toHaveLength(1);
    const first = requests[0]!;
    expect(first.url).toContain('/name/sp');
    expect(first.signal.aborted).toBe(false);

    controller.setQuery('spain');
    expect(first.signal.aborted).toBe(true);
    await expect(first.promise).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(300);
    expect(requests).toHaveLength(2);
    const second = requests[1]!;

    second.resolve([
      {
        name: 'Spain',
        capital: 'Madrid',
        region: 'Europe',
        population: 47_000_000,
        flags: { svg: 'https://flagcdn.com/es.svg' },
      },
    ]);
    await vi.advanceTimersByTimeAsync(0);

    first.resolve([{ name: 'Spratly Islands', capital: '—', region: 'Asia' }]);
    await vi.advanceTimersByTimeAsync(0);

    const state = controller.getState();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.countries.map((c) => c.name)).toEqual(['Spain']);
    }
  });
});
