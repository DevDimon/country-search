import { searchCountries } from './api/searchCountries.js';
import { createCachedSearch } from './api/cachedSearch.js';
import { CountrySearchController } from './app/CountrySearchController.js';
import { mountApp } from './ui/mountApp.js';
const root = document.createElement('div');
root.id = 'app';
document.body.append(root);
const search = createCachedSearch(searchCountries);
const controller = new CountrySearchController({ search, debounceMs: 350, timeoutMs: 8_000 });
mountApp(root, controller);
//# sourceMappingURL=main.js.map