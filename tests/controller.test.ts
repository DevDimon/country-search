import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/api/HttpError.js';
import { CountrySearchController } from '../src/app/CountrySearchController.js';
import type { Country } from '../src/types.js';

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

describe('CountrySearchController', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not search on empty input and resets the state', async () => {
    const search = vi.fn().mockResolvedValue([country]);
    const controller = new CountrySearchController({ search, debounceMs: 50, timeoutMs: 1_000 });
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).toBe('success');
    controller.setQuery('   ');
    await vi.advanceTimersByTimeAsync(50);
    expect(search).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toEqual({ status: 'idle' });
  });

  it('shows loading while the debounced request is pending', async () => {
    const search = vi.fn(() => new Promise<Country[]>(() => undefined));
    const controller = new CountrySearchController({ search, debounceMs: 50, timeoutMs: 1_000 });
    controller.setQuery('spain');
    expect(controller.getState()).toMatchObject({ status: 'loading', query: 'spain' });
    await vi.advanceTimersByTimeAsync(50);
    expect(search).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({ status: 'loading', query: 'spain' });
  });

  it('debounces rapid input into a single request', async () => {
    const search = vi.fn().mockResolvedValue([country]);
    const controller = new CountrySearchController({ search, debounceMs: 100, timeoutMs: 1_000 });
    controller.setQuery('s');
    await vi.advanceTimersByTimeAsync(50);
    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(50);
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(100);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
  });

  it('retry re-runs exactly the last query', async () => {
    const search = vi
      .fn()
      .mockRejectedValueOnce(new HttpError(500, 'boom'))
      .mockResolvedValueOnce([country]);
    const controller = new CountrySearchController({ search, debounceMs: 10, timeoutMs: 1_000 });
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).toBe('error');
    controller.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1]?.[0]).toBe('spain');
    expect(controller.getState().status).toBe('success');
  });
});
