import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/api/mapCountryResponse.js';
import type { CountryRaw } from '../src/types.js';

describe('mapCountryResponse', () => {
  it('maps a complete API payload', () => {
    const raw: CountryRaw = {
      name: 'Spain',
      flags: { svg: 'https://flagcdn.com/es.svg', png: 'https://flagcdn.com/es.png' },
      capital: 'Madrid',
      region: 'Europe',
      population: 47_351_567,
      area: 505_992,
      borders: ['FRA', 'PRT', 'AND'],
      languages: [{ name: 'Spanish' }],
      currencies: [{ name: 'Euro', symbol: '€' }],
    };
    expect(mapCountryResponse(raw)).toEqual({
      name: 'Spain',
      flag: 'https://flagcdn.com/es.svg',
      capital: 'Madrid',
      region: 'Europe',
      population: 47_351_567,
      area: 505_992,
      borders: ['FRA', 'PRT', 'AND'],
      languages: ['Spanish'],
      currencies: ['Euro (€)'],
      description: 'Spain is a country in Europe.',
    });
  });

  it('tolerates completely missing fields', () => {
    expect(mapCountryResponse({})).toEqual({
      name: 'Unknown country',
      flag: '',
      capital: '—',
      region: '—',
      population: 0,
      area: 0,
      borders: [],
      languages: [],
      currencies: [],
      description: 'Unknown country.',
    });
  });

  it('falls back to png flag and subregion', () => {
    const mapped = mapCountryResponse({
      name: 'Puerto Rico',
      flags: { png: 'https://flagcdn.com/pr.png' },
      subregion: 'Caribbean',
    });
    expect(mapped.flag).toBe('https://flagcdn.com/pr.png');
    expect(mapped.region).toBe('Caribbean');
  });

  it('supports dictionary-shaped languages and currencies', () => {
    const mapped = mapCountryResponse({
      name: 'Spain',
      languages: { spa: 'Spanish', cat: 'Catalan' },
      currencies: { EUR: { name: 'Euro', symbol: '€' } },
    });
    expect(mapped.languages).toEqual(['Spanish', 'Catalan']);
    expect(mapped.currencies).toEqual(['Euro (€)']);
  });

  it('ignores invalid numbers', () => {
    const mapped = mapCountryResponse({ name: 'X', population: Number.NaN, area: -1 });
    expect(mapped.population).toBe(0);
    expect(mapped.area).toBe(0);
  });

  it('does not mutate the raw input', () => {
    const raw: CountryRaw = { name: 'X', borders: ['A'] };
    const mapped = mapCountryResponse(raw);
    mapped.borders.push('B');
    expect(raw.borders).toEqual(['A']);
  });
});
