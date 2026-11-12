import { HttpError } from './HttpError.js';
import { mapCountryResponse } from './mapCountryResponse.js';
const BASE_URL = 'https://countries.dev/name';
export async function searchCountries(query, signal) {
    const url = `${BASE_URL}/${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (response.status === 404)
        return [];
    if (!response.ok) {
        throw new HttpError(response.status, `Country search failed with status ${response.status}`, url);
    }
    const payload = await response.json();
    return toCountryList(payload).map(mapCountryResponse);
}
function toCountryList(payload) {
    if (Array.isArray(payload))
        return payload;
    if (payload !== null && typeof payload === 'object')
        return [payload];
    return [];
}
//# sourceMappingURL=searchCountries.js.map