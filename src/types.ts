export interface RawFlags {
  png?: string;
  svg?: string;
  alt?: string;
}
export interface RawLanguage {
  name?: string;
}
export interface RawCurrency {
  name?: string;
  symbol?: string;
}

export interface CountryRaw {
  name?: string;
  flags?: RawFlags;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  borders?: string[];
  languages?: RawLanguage[] | Record<string, string>;
  currencies?: RawCurrency[] | Record<string, RawCurrency>;
  description?: string;
}

export interface Country {
  name: string;
  flag: string;
  capital: string;
  region: string;
  population: number;
  area: number;
  borders: string[];
  languages: string[];
  currencies: string[];
  description: string;
}
