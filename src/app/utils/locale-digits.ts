import { Language } from '../services/translation.service';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Convert Persian / Arabic-Indic digits back to Latin 0–9. */
export function toLatinDigits(value: string | number | null | undefined): string {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** Convert Latin digits to Persian (arabext) or Arabic-Indic (arab). */
export function toLocaleDigits(
  value: string | number | null | undefined,
  lang: Language | string
): string {
  if (value == null) {
    return '';
  }
  const latin = toLatinDigits(value);
  if (lang === 'fa') {
    return latin.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
  }
  if (lang === 'ar') {
    return latin.replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
  }
  return latin;
}

export function usesLocaleDigits(lang: Language | string): boolean {
  return lang === 'fa' || lang === 'ar';
}

export function numberingSystemFor(lang: Language | string): 'latn' | 'arab' | 'arabext' {
  if (lang === 'fa') {
    return 'arabext';
  }
  if (lang === 'ar') {
    return 'arab';
  }
  return 'latn';
}
