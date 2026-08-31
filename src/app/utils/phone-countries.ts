import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber
} from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

export interface PhoneCountry {
  iso: CountryCode;
  name: string;
  dialCode: string;
}

const LOCALE_MAP: Record<string, string> = {
  en: 'en',
  fa: 'fa',
  ar: 'ar',
  tr: 'tr'
};

const MAX_NATIONAL_DIGITS = 15;

let cachedLocale = '';
let cachedCountries: PhoneCountry[] = [];

function resolveDisplayNames(locale: string): Intl.DisplayNames {
  const intlLocale = LOCALE_MAP[locale] ?? locale;
  try {
    return new Intl.DisplayNames([intlLocale], { type: 'region' });
  } catch {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  }
}

/** All supported countries with dial codes (245+). */
export function buildPhoneCountries(locale = 'en'): PhoneCountry[] {
  const intlLocale = LOCALE_MAP[locale] ?? locale;
  if (cachedLocale === intlLocale && cachedCountries.length > 0) {
    return cachedCountries;
  }

  const displayNames = resolveDisplayNames(locale);
  cachedCountries = getCountries()
    .map((iso) => ({
      iso,
      dialCode: getCountryCallingCode(iso),
      name: displayNames.of(iso) ?? iso
    }))
    .sort((a, b) => a.name.localeCompare(b.name, intlLocale));
  cachedLocale = intlLocale;
  return cachedCountries;
}

export function findPhoneCountry(iso?: string | null, locale = 'en'): PhoneCountry | undefined {
  if (!iso) {
    return undefined;
  }
  const code = iso.toUpperCase() as CountryCode;
  return buildPhoneCountries(locale).find((country) => country.iso === code);
}

export function digitsOnly(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/** Format national digits using libphonenumber country rules. */
export function formatPhoneDigits(digits: string, iso: CountryCode): string {
  return new AsYouType(iso).input(digitsOnly(digits).slice(0, MAX_NATIONAL_DIGITS));
}

/** Example mask / placeholder for the selected country. */
export function phonePlaceholder(iso: CountryCode): string {
  const typer = new AsYouType(iso);
  typer.input('9'.repeat(MAX_NATIONAL_DIGITS));
  const template = typer.getTemplate();
  if (template) {
    return template.replace(/x/gi, '0');
  }
  const formatted = typer.getNumber()?.formatNational();
  return formatted ? formatted.replace(/\d/g, '0') : '';
}

export function isValidNationalPhone(digits: string, iso: CountryCode): boolean {
  const clean = digitsOnly(digits);
  if (!clean) {
    return false;
  }
  try {
    return isValidPhoneNumber(clean, iso);
  } catch {
    return false;
  }
}

export function countryOptionLabel(country: PhoneCountry): string {
  return `${country.name} (+${country.dialCode})`;
}
