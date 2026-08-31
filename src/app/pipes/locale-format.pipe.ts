import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from '../services/locale.service';
import { TranslationService } from '../services/translation.service';
import { toLocaleDigits } from '../utils/locale-digits';

@Pipe({ name: 'localeNumber', standalone: true, pure: false })
export class LocaleNumberPipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(value: number | null | undefined, options?: Intl.NumberFormatOptions): string {
    if (value == null) {
      return '';
    }
    return this.locale.formatNumber(value, options);
  }
}

@Pipe({ name: 'localeDigits', standalone: true, pure: false })
export class LocaleDigitsPipe implements PipeTransform {
  private readonly translation = inject(TranslationService);

  transform(value: string | number | null | undefined): string {
    return toLocaleDigits(value, this.translation.currentLang());
  }
}

@Pipe({ name: 'localeCurrency', standalone: true, pure: false })
export class LocaleCurrencyPipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(value: number | null | undefined, currency = 'USD'): string {
    if (value == null) {
      return '';
    }
    return this.locale.formatCurrency(value, currency);
  }
}

@Pipe({ name: 'localeDate', standalone: true, pure: false })
export class LocaleDatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions): string {
    if (value == null || value === '') {
      return '';
    }
    return this.locale.formatDate(value, options);
  }
}

@Pipe({ name: 'localeMonth', standalone: true, pure: false })
export class LocaleMonthPipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(monthIndex: number | null | undefined): string {
    if (monthIndex == null) {
      return '';
    }
    return this.locale.formatMonth(monthIndex);
  }
}

@Pipe({ name: 'localeCompact', standalone: true, pure: false })
export class LocaleCompactPipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(value: number | null | undefined): string {
    if (value == null) {
      return '';
    }
    return this.locale.formatCompact(value);
  }
}

@Pipe({ name: 'localePercent', standalone: true, pure: false })
export class LocalePercentPipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(value: number | null | undefined): string {
    if (value == null) {
      return '';
    }
    return this.locale.formatPercent(value);
  }
}
