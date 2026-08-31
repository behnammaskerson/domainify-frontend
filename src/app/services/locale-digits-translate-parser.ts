import { Injectable } from '@angular/core';
import { TranslateDefaultParser } from '@ngx-translate/core';
import { toLocaleDigits, usesLocaleDigits } from '../utils/locale-digits';

/**
 * Converts numeric interpolate params to Persian / Arabic-Indic digits
 * when the active language is fa or ar.
 *
 * Reads language from document.documentElement.lang (set by TranslationService)
 * to avoid a TranslateService ↔ TranslateParser circular dependency.
 */
@Injectable()
export class LocaleDigitsTranslateParser extends TranslateDefaultParser {
  override interpolate(expr: string | Function, params?: any): string {
    const lang =
      (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
    const mapped = this.mapParams(params, lang);
    return super.interpolate(expr, mapped);
  }

  private mapParams(params: any, lang: string): any {
    if (!params || !usesLocaleDigits(lang)) {
      return params;
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        out[key] = toLocaleDigits(value, lang);
      } else if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
        out[key] = toLocaleDigits(value, lang);
      } else {
        out[key] = value;
      }
    }
    return out;
  }
}
