import type { CountrySearchController, SearchState } from '../app/CountrySearchController.js';
import type { Country } from '../types.js';
import { addToHistory, clearHistory, loadHistory } from './searchHistory.js';

const numberFormat = new Intl.NumberFormat('en-US');

export function mountApp(root: HTMLElement, controller: CountrySearchController): void {
  const app = document.createElement('main');
  app.className = 'app';

  const header = document.createElement('header');
  header.className = 'app__header';
  const title = document.createElement('h1');
  title.className = 'app__title';
  title.textContent = 'Country Search';
  header.append(title);

  const form = document.createElement('form');
  form.className = 'search';
  form.setAttribute('role', 'search');
  form.addEventListener('submit', (e) => e.preventDefault());

  const input = document.createElement('input');
  input.className = 'search__input';
  input.type = 'search';
  input.name = 'query';
  input.placeholder = 'Type a country name…';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Country name');
  form.append(input);

  const historySection = document.createElement('section');
  historySection.className = 'history';
  historySection.hidden = true;
  const historyTitle = document.createElement('h2');
  historyTitle.className = 'history__title';
  historyTitle.textContent = 'Recent searches';
  const historyList = document.createElement('ul');
  historyList.className = 'history__list';
  const historyClear = document.createElement('button');
  historyClear.type = 'button';
  historyClear.className = 'history__clear';
  historyClear.textContent = 'Clear history';
  historySection.append(historyTitle, historyList, historyClear);

  const status = document.createElement('div');
  status.className = 'status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const results = document.createElement('ul');
  results.className = 'results';

  const details = document.createElement('aside');
  details.className = 'details';
  details.hidden = true;
  details.setAttribute('aria-label', 'Country details');

  app.append(header, form, historySection, status, results, details);
  root.append(app);

  let countries: Country[] = [];

  input.addEventListener('input', () => {
    controller.setQuery(input.value);
  });

  results.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const card = target.closest<HTMLElement>('[data-country-index]');
    if (!card) return;
    const index = Number.parseInt(card.dataset.countryIndex ?? '', 10);
    const country = countries[index];
    if (country) renderDetails(details, country);
  });

  historyClear.addEventListener('click', () => {
    clearHistory();
    renderHistory(historySection, historyList, input, controller);
  });

  controller.subscribe((state) => {
    countries = state.status === 'success' ? state.countries : [];
    renderStatus(status, state, controller);
    renderResults(results, state);
    if (state.status !== 'success') {
      details.hidden = true;
      details.replaceChildren();
    }
    if (state.status === 'success' || state.status === 'empty') {
      addToHistory(state.query);
      renderHistory(historySection, historyList, input, controller);
    }
  });

  renderHistory(historySection, historyList, input, controller);
  input.focus();
}

function renderStatus(
  container: HTMLElement,
  state: SearchState,
  controller: CountrySearchController,
): void {
  container.replaceChildren();
  container.dataset.status = state.status;
  switch (state.status) {
    case 'idle':
      return;
    case 'loading': {
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.textContent = `Searching for “${state.query}”…`;
      container.append(spinner, text);
      return;
    }
    case 'empty': {
      const text = document.createElement('p');
      text.className = 'status__empty';
      text.textContent = `Nothing found for “${state.query}”. Try another spelling.`;
      container.append(text);
      return;
    }
    case 'error': {
      const text = document.createElement('p');
      text.className = 'status__error';
      text.textContent = state.message;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'button button--retry';
      retry.textContent = 'Retry';
      retry.addEventListener('click', () => controller.retry());
      container.append(text, retry);
      return;
    }
    case 'success': {
      const text = document.createElement('p');
      text.className = 'status__count';
      const { length } = state.countries;
      text.textContent = `${length} ${length === 1 ? 'country' : 'countries'} found`;
      container.append(text);
      return;
    }
  }
}

function renderResults(list: HTMLElement, state: SearchState): void {
  list.replaceChildren();
  if (state.status !== 'success') return;
  state.countries.forEach((country, index) => {
    const item = document.createElement('li');
    item.className = 'results__item';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.countryIndex = String(index);
    if (country.flag) {
      const flag = document.createElement('img');
      flag.className = 'card__flag';
      flag.src = country.flag;
      flag.alt = `Flag of ${country.name}`;
      flag.loading = 'lazy';
      flag.addEventListener('error', () => {
        flag.hidden = true;
      });
      card.append(flag);
    }
    const body = document.createElement('div');
    body.className = 'card__body';
    const name = document.createElement('h2');
    name.className = 'card__name';
    name.textContent = country.name;
    const meta = document.createElement('dl');
    meta.className = 'card__meta';
    meta.append(
      metaRow('Capital', country.capital),
      metaRow('Region', country.region),
      metaRow('Population', numberFormat.format(country.population)),
    );
    body.append(name, meta);
    card.append(body);
    item.append(card);
    list.append(item);
  });
}

function renderDetails(container: HTMLElement, country: Country): void {
  container.replaceChildren();
  container.hidden = false;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'details__close';
  close.setAttribute('aria-label', 'Close details');
  close.textContent = '×';
  close.addEventListener('click', () => {
    container.hidden = true;
    container.replaceChildren();
  });
  const title = document.createElement('h2');
  title.className = 'details__title';
  title.textContent = country.name;
  const description = document.createElement('p');
  description.className = 'details__description';
  description.textContent = country.description;
  const list = document.createElement('dl');
  list.className = 'details__list';
  list.append(
    metaRow('Area', country.area > 0 ? `${numberFormat.format(country.area)} km²` : '—'),
    metaRow('Borders', country.borders.length > 0 ? country.borders.join(', ') : 'None'),
    metaRow('Languages', country.languages.length > 0 ? country.languages.join(', ') : '—'),
    metaRow('Currencies', country.currencies.length > 0 ? country.currencies.join(', ') : '—'),
  );
  container.append(close, title, description, list);
}

function renderHistory(
  section: HTMLElement,
  list: HTMLElement,
  input: HTMLInputElement,
  controller: CountrySearchController,
): void {
  const history = loadHistory();
  list.replaceChildren();
  if (history.length === 0) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  for (const query of history) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history__item';
    button.textContent = query;
    button.addEventListener('click', () => {
      input.value = query;
      controller.setQuery(query);
      input.focus();
    });
    item.append(button);
    list.append(item);
  }
}

function metaRow(term: string, value: string): DocumentFragment {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  const fragment = document.createDocumentFragment();
  fragment.append(dt, dd);
  return fragment;
}
