import type { Country, CountryRaw, RawCurrency, RawLanguage } from '../types.js';

const UNKNOWN = '—';

export function mapCountryResponse(raw: CountryRaw): Country {
  const name = nonEmpty(raw.name) ?? 'Unknown country';
  const region = nonEmpty(raw.region) ?? nonEmpty(raw.subregion) ?? UNKNOWN;
  const languages = normalizeLanguages(raw.languages);
  const currencies = normalizeCurrencies(raw.currencies);

  return {
    name,
    flag: nonEmpty(raw.flags?.svg) ?? nonEmpty(raw.flags?.png) ?? '',
    capital: nonEmpty(raw.capital) ?? UNKNOWN,
    region,
    population: toFiniteNumber(raw.population),
    area: toFiniteNumber(raw.area),
    borders: Array.isArray(raw.borders)
      ? raw.borders.filter((b): b is string => typeof b === 'string')
      : [],
    languages,
    currencies,
    description: nonEmpty(raw.description) ?? buildDescription(name, region),
  };
}

function buildDescription(name: string, region: string): string {
  return region === UNKNOWN ? `${name}.` : `${name} is a country in ${region}.`;
}
function nonEmpty(v: string | undefined): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}
function toFiniteNumber(v: number | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}
function normalizeLanguages(value: CountryRaw['languages']): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((l: RawLanguage) => nonEmpty(l.name))
      .filter((n): n is string => n !== undefined);
  }
  return Object.values(value)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}
function normalizeCurrencies(value: CountryRaw['currencies']): string[] {
  if (!value) return [];
  const format = (c: RawCurrency): string | undefined => {
    const name = nonEmpty(c.name);
    if (!name) return undefined;
    const symbol = nonEmpty(c.symbol);
    return symbol ? `${name} (${symbol})` : name;
  };
  if (Array.isArray(value)) {
    return value.map(format).filter((e): e is string => e !== undefined);
  }
  return Object.values(value)
    .map(format)
    .filter((e): e is string => e !== undefined);
}
