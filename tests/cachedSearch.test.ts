import { describe, expect, it, vi } from 'vitest';
import { createCachedSearch } from '../src/api/cachedSearch.js';
import type { Country } from '../src/types.js';
import { toError } from './helpers.js';

const country: Country = {
  name: 'Spain',
  flag: '',
  capital: 'Madrid',
  region: 'Europe',
  population: 1,
  area: 1,
  borders: [],
  languages: [],
  currencies: [],
  description: '',
};

describe('createCachedSearch', () => {
  it('serves repeated queries from the cache', async () => {
    const base = vi.fn().mockResolvedValue([country]);
    const search = createCachedSearch(base);
    const signal = new AbortController().signal;
    const first = await search('spain', signal);
    const second = await search('  SPAIN ', signal);
    expect(base).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('deduplicates concurrent identical requests', async () => {
    let resolveBase!: (c: Country[]) => void;
    const base = vi.fn(
      () =>
        new Promise<Country[]>((r) => {
          resolveBase = r;
        }),
    );
    const search = createCachedSearch(base);
    const first = search('spain', new AbortController().signal);
    const second = search('spain', new AbortController().signal);
    expect(base).toHaveBeenCalledTimes(1);
    resolveBase([country]);
    await expect(first).resolves.toEqual([country]);
    await expect(second).resolves.toEqual([country]);
  });

  it('aborting one caller keeps the shared request alive for the other', async () => {
    let resolveBase!: (c: Country[]) => void;
    const base = vi.fn(
      (_q: string, signal: AbortSignal) =>
        new Promise<Country[]>((resolve, reject) => {
          resolveBase = resolve;
          signal.addEventListener('abort', () => reject(toError(signal.reason)), { once: true });
        }),
    );
    const search = createCachedSearch(base);
    const a = new AbortController();
    const b = new AbortController();
    const first = search('spain', a.signal);
    const second = search('spain', b.signal);
    a.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    resolveBase([country]);
    await expect(second).resolves.toEqual([country]);
  });

  it('aborting the only caller really cancels the shared request', async () => {
    const base = vi.fn(
      (_q: string, signal: AbortSignal) =>
        new Promise<Country[]>((_r, reject) => {
          signal.addEventListener('abort', () => reject(toError(signal.reason)), { once: true });
        }),
    );
    const search = createCachedSearch(base);
    const caller = new AbortController();
    const promise = search('spain', caller.signal);
    caller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    const baseSignal = base.mock.calls[0]?.[1];
    expect(baseSignal?.aborted).toBe(true);
  });
});
