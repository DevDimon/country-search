import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/api/HttpError.js';
import { CountrySearchController } from '../src/app/CountrySearchController.js';
import type { Country } from '../src/types.js';
import { isAbortError, isTimeoutError } from '../src/utils/errors.js';
import { toError } from './helpers.js';

describe('error type guards', () => {
  it('recognises AbortError and nothing else', () => {
    expect(isAbortError(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isAbortError(new DOMException('x', 'TimeoutError'))).toBe(false);
    expect(isAbortError(new HttpError(500, 'x'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
  });

  it('recognises TimeoutError and nothing else', () => {
    expect(isTimeoutError(new DOMException('x', 'TimeoutError'))).toBe(true);
    expect(isTimeoutError(new DOMException('x', 'AbortError'))).toBe(false);
    expect(isTimeoutError(new HttpError(500, 'x'))).toBe(false);
    expect(isTimeoutError({})).toBe(false);
  });
});

describe('controller error distinction', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function create(
    search: (query: string, signal: AbortSignal) => Promise<Country[]>,
    timeoutMs = 5_000,
  ): CountrySearchController {
    return new CountrySearchController({ search, debounceMs: 10, timeoutMs });
  }

  it('does not surface AbortError as a user-visible error', async () => {
    const controller = create(() => Promise.reject(new DOMException('aborted', 'AbortError')));
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).not.toBe('error');
  });

  it('surfaces TimeoutError as a timeout error (not as AbortError)', async () => {
    const controller = create(
      (_query, signal) =>
        new Promise<Country[]>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(toError(signal.reason)), { once: true });
        }),
      500,
    );
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(500);
    expect(controller.getState()).toMatchObject({ status: 'error', kind: 'timeout' });
  });

  it('treats a 404 HttpError as an empty result, not an error', async () => {
    const controller = create(() => Promise.reject(new HttpError(404, 'not found')));
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState()).toMatchObject({ status: 'empty', query: 'spain' });
  });

  it('surfaces other HttpErrors as http errors with the status in the message', async () => {
    const controller = create(() => Promise.reject(new HttpError(503, 'unavailable')));
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(0);
    const state = controller.getState();
    expect(state).toMatchObject({ status: 'error', kind: 'http' });
    if (state.status === 'error') expect(state.message).toContain('503');
  });

  it('surfaces generic network failures as network errors', async () => {
    const controller = create(() => Promise.reject(new TypeError('Failed to fetch')));
    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState()).toMatchObject({ status: 'error', kind: 'network' });
  });
});
