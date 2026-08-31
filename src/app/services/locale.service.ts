import { Injectable, computed, inject } from '@angular/core';
import { TranslationService, Language } from './translation.service';
import { numberingSystemFor, toLocaleDigits } from '../utils/locale-digits';

const LOCALE_MAP: Record<Language, string> = {
  en: 'en-US',
  fa: 'fa-IR',
  ar: 'ar-SA',
  tr: 'tr-TR'
};

@Injectable({
  providedIn: 'root'
})
export class LocaleService {
  private readonly translationService = inject(TranslationService);

  readonly locale = computed(() => LOCALE_MAP[this.translationService.currentLang()]);

  /** Digits suitable for the active language (Persian / Arabic-Indic when fa/ar). */
  digits(value: string | number | null | undefined): string {
    return toLocaleDigits(value, this.translationService.currentLang());
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), this.withNumbering(options)).format(value);
  }

  formatCurrency(value: number, currency = 'USD'): string {
    return new Intl.NumberFormat(this.locale(), this.withNumbering({
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    })).format(value);
  }

  formatCompact(value: number): string {
    return new Intl.NumberFormat(this.locale(), this.withNumbering({
      notation: 'compact',
      maximumFractionDigits: 1
    })).format(value);
  }

  formatPercent(value: number, signed = true): string {
    const formatted = new Intl.NumberFormat(this.locale(), this.withNumbering({
      maximumFractionDigits: 1
    })).format(Math.abs(value));
    if (!signed) {
      return `${formatted}%`;
    }
    return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatted}%`;
  }

  formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(this.locale(), this.withNumbering(options)).format(date);
  }

  formatMonth(monthIndex: number): string {
    return new Intl.DateTimeFormat(this.locale(), this.withNumbering({ month: 'short' }))
      .format(new Date(2024, monthIndex, 1));
  }

  formatRelativeMinutes(count: number): string {
    return this.formatRelative('minute', count);
  }

  formatRelativeHours(count: number): string {
    return this.formatRelative('hour', count);
  }

  formatRelativeDays(count: number): string {
    return this.formatRelative('day', count);
  }

  private formatRelative(unit: 'minute' | 'hour' | 'day', count: number): string {
    if (typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl) {
      const rtf = new Intl.RelativeTimeFormat(this.locale(), { numeric: 'auto' });
      const unitMap = { minute: 'minutes' as const, hour: 'hours' as const, day: 'days' as const };
      return toLocaleDigits(rtf.format(-count, unitMap[unit]), this.translationService.currentLang());
    }
    return toLocaleDigits(`${count} ${unit}(s) ago`, this.translationService.currentLang());
  }

  private withNumbering<T extends Intl.NumberFormatOptions | Intl.DateTimeFormatOptions>(
    options?: T
  ): T {
    const lang = this.translationService.currentLang();
    return {
      ...(options as object),
      numberingSystem: (options as { numberingSystem?: string } | undefined)?.numberingSystem
        ?? numberingSystemFor(lang)
    } as T;
  }
}
