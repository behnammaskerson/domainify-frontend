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

/** Numeric Jalali patterns — avoid MMM/MMMM (date-fns-jalali can emit "شهر"). */
const JALALI_DATE = 'yyyy/MM/dd';
const JALALI_DATETIME = 'yyyy/MM/dd, HH:mm';
const JALALI_MONTH_YEAR = 'yyyy/MM';
const JALALI_TIME = 'HH:mm';

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
    return JALALI_DATE;
  }

  const hasTime = !!(options.timeStyle || options.hour !== undefined || options.minute !== undefined);
  const hasDate = !!(
    options.dateStyle
    || options.year !== undefined
    || options.month !== undefined
    || options.day !== undefined
  );

  if (options.month === 'short' && options.year === 'numeric' && options.day === undefined && !hasTime) {
    return JALALI_MONTH_YEAR;
  }

  if (hasTime && !hasDate) {
    return JALALI_TIME;
  }

  if (hasDate && hasTime) {
    return JALALI_DATETIME;
  }

  return JALALI_DATE;
}

export const SMS_DATETIME_FORMAT: Intl.DateTimeFormatOptions = DATETIME_OPTIONS;
