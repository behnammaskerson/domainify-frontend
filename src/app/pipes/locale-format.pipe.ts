import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from '../services/locale.service';
import { TranslationService } from '../services/translation.service';
import { AppCurrency, CurrencyService } from '../services/currency.service';
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
  private readonly currencyService = inject(CurrencyService);

  /**
   * Formats a price stored in IRT, converting to the toolbar-selected currency
   * (or an explicit override). Pass `convert: false` to format the raw amount
   * in the given currency without FX conversion.
   */
  transform(
    value: number | null | undefined,
    currencyOrOptions?: string | { currency?: string; convert?: boolean }
  ): string {
    if (value == null) {
      return '';
    }
    // Touch revision so impure pipe updates when FX rates / selection change.
    void this.currencyService.displayRevision();

    const opts = typeof currencyOrOptions === 'string'
      ? { currency: currencyOrOptions, convert: true }
      : { currency: currencyOrOptions?.currency, convert: currencyOrOptions?.convert !== false };

    const target = (opts.currency as AppCurrency | undefined) ?? this.currencyService.currency();
    let amount = value;
    let displayCode: AppCurrency = target;
    if (opts.convert !== false) {
      const converted = this.currencyService.convertFromIrt(value, target);
      if (converted == null) {
        displayCode = 'IRT';
        amount = value;
      } else {
        amount = converted;
      }
    }
    const code = displayCode === 'IRT' ? 'IRT' : displayCode === 'USDT' ? 'USDT' : this.currencyService.intlCurrencyCode(displayCode);
    return this.locale.formatCurrency(amount, code, this.currencyService.fractionDigits(displayCode));
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
