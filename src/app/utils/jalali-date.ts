import { format } from 'date-fns-jalali';
import { faIR } from 'date-fns-jalali/locale';
import { toLocaleDigits } from './locale-digits';

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
};

export function formatJalaliDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pattern = resolveJalaliPattern(options);
  const formatted = format(date, pattern, { locale: faIR });
  return toLocaleDigits(formatted, 'fa');
}

function resolveJalaliPattern(options?: Intl.DateTimeFormatOptions): string {
  if (!options) {
    return 'd MMM yyyy';
  }

  const hasTime = !!(options.timeStyle || options.hour !== undefined || options.minute !== undefined);
  const hasDate = !!(
    options.dateStyle
    || options.year !== undefined
    || options.month !== undefined
    || options.day !== undefined
  );

  if (options.dateStyle === 'medium' && options.timeStyle === 'short') {
    return 'd MMM yyyy, HH:mm';
  }

  if (
    options.year === 'numeric'
    && options.month === 'short'
    && options.day === 'numeric'
    && hasTime
  ) {
    return 'd MMM yyyy, HH:mm';
  }

  if (options.month === 'short' && options.year === 'numeric' && options.day === undefined) {
    return 'MMM yyyy';
  }

  if (options.month === 'short') {
    return 'd MMM yyyy';
  }

  if (hasTime && !hasDate) {
    return 'HH:mm';
  }

  if (hasDate && hasTime) {
    return 'yyyy/MM/dd, HH:mm';
  }

  return 'yyyy/MM/dd';
}

export const SMS_DATETIME_FORMAT: Intl.DateTimeFormatOptions = DATETIME_OPTIONS;
