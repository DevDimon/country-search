import { HttpError } from './HttpError.js';
import { mapCountryResponse } from './mapCountryResponse.js';
import type { Country, CountryRaw } from '../types.js';

const BASE_URL = 'https://countries.dev/name';

export type SearchFn = (query: string, signal: AbortSignal) => Promise<Country[]>;

export async function searchCountries(query: string, signal: AbortSignal): Promise<Country[]> {
  const url = `${BASE_URL}/${encodeURIComponent(query.trim())}`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });

  if (response.status === 404) return [];

  if (!response.ok) {
    throw new HttpError(
      response.status,
      `Country search failed with status ${response.status}`,
      url,
    );
  }

  const payload: unknown = await response.json();
  return toCountryList(payload).map(mapCountryResponse);
}

function toCountryList(payload: unknown): CountryRaw[] {
  if (Array.isArray(payload)) return payload as CountryRaw[];
  if (payload !== null && typeof payload === 'object') return [payload];
  return [];
}
