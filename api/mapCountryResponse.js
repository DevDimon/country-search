const UNKNOWN = '—';
export function mapCountryResponse(raw) {
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
            ? raw.borders.filter((b) => typeof b === 'string')
            : [],
        languages,
        currencies,
        description: nonEmpty(raw.description) ?? buildDescription(name, region),
    };
}
function buildDescription(name, region) {
    return region === UNKNOWN ? `${name}.` : `${name} is a country in ${region}.`;
}
function nonEmpty(v) {
    if (typeof v !== 'string')
        return undefined;
    const t = v.trim();
    return t.length > 0 ? t : undefined;
}
function toFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}
function normalizeLanguages(value) {
    if (!value)
        return [];
    if (Array.isArray(value)) {
        return value
            .map((l) => nonEmpty(l.name))
            .filter((n) => n !== undefined);
    }
    return Object.values(value)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
}
function normalizeCurrencies(value) {
    if (!value)
        return [];
    const format = (c) => {
        const name = nonEmpty(c.name);
        if (!name)
            return undefined;
        const symbol = nonEmpty(c.symbol);
        return symbol ? `${name} (${symbol})` : name;
    };
    if (Array.isArray(value)) {
        return value.map(format).filter((e) => e !== undefined);
    }
    return Object.values(value)
        .map(format)
        .filter((e) => e !== undefined);
}
//# sourceMappingURL=mapCountryResponse.js.map