import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/api/HttpError.js';
import { searchCountries } from '../src/api/searchCountries.js';
import { toError } from './helpers.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('searchCountries', () => {
  it('requests the encoded query and maps the array response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse([{ name: 'Spain', capital: 'Madrid' }]));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const result = await searchCountries('south korea', controller.signal);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://countries.dev/name/south%20korea');
    expect(init.signal).toBe(controller.signal);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Spain');
  });

  it('returns an empty array on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(searchCountries('zzz', new AbortController().signal)).resolves.toEqual([]);
  });

  it('throws HttpError with status on non-404 failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    const error = await searchCountries('spain', new AbortController().signal).catch(
      (r: unknown) => r,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(500);
    expect((error as HttpError).name).toBe('HttpError');
  });

  it('propagates AbortError when the signal is aborted', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const { signal } = init ?? {};
      if (!signal) throw new Error('fetch called without AbortSignal');
      return new Promise<Response>((_resolve, reject) => {
        if (signal.aborted) {
          reject(toError(signal.reason));
          return;
        }
        signal.addEventListener('abort', () => reject(toError(signal.reason)), { once: true });
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const promise = searchCountries('spain', controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
