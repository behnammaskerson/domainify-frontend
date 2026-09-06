import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, shareReplay, tap } from 'rxjs';
import { Observable } from 'rxjs';

/** Display / selection codes. Prices are always stored in IRT (تومان / Iran Rial base of the rates API). */
export type AppCurrency = 'IRT' | 'USD' | 'USDT' | 'EUR' | 'CAD' | 'AUD' | 'TRY' | 'AED' | 'CNY';

export interface CurrencyOption {
  code: AppCurrency;
  /** i18n key under currency.codes.* */
  labelKey: string;
}

interface BackendRatesResponse {
  base?: string;
  updatedAt?: string | null;
  fetchedAt?: number;
  sellByCode?: Record<string, number>;
}

interface FxCachePayload {
  fetchedAt: number;
  updatedAt: string | null;
  /** Sell rates: IRT per 1 unit of foreign currency */
  sellByCode: Record<string, number>;
}

const API_URL = 'http://localhost:8080/api';
const CURRENCY_STORAGE_KEY = 'domainify-currency';
const FX_CACHE_KEY = 'domainify-fx-cache';
/** Client re-check interval; backend owns the upstream 10-minute cache. */
const CLIENT_REFRESH_MS = 10 * 60 * 1000;
const MIN_FETCH_GAP_MS = 15_000;

export const APP_CURRENCIES: CurrencyOption[] = [
  { code: 'IRT', labelKey: 'currency.codes.IRT' },
  { code: 'USD', labelKey: 'currency.codes.USD' },
  { code: 'USDT', labelKey: 'currency.codes.USDT' },
  { code: 'EUR', labelKey: 'currency.codes.EUR' },
  { code: 'CAD', labelKey: 'currency.codes.CAD' },
  { code: 'AUD', labelKey: 'currency.codes.AUD' },
  { code: 'TRY', labelKey: 'currency.codes.TRY' },
  { code: 'AED', labelKey: 'currency.codes.AED' },
  { code: 'CNY', labelKey: 'currency.codes.CNY' }
];

const SUPPORTED = new Set<AppCurrency>(APP_CURRENCIES.map((c) => c.code));

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private readonly http = inject(HttpClient);

  private readonly selectedCode = signal<AppCurrency>(this.readStoredCurrency());
  private readonly sellByCode = signal<Record<string, number>>({});
  private readonly ratesUpdatedAt = signal<string | null>(null);
  private readonly lastFetchedAt = signal<number>(0);
  private readonly loading = signal(false);

  private inFlight$: Observable<FxCachePayload> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly currencies = APP_CURRENCIES;
  readonly currency = this.selectedCode.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly updatedAt = this.ratesUpdatedAt.asReadonly();

  /** Bumps when currency or rates change so impure pipes refresh. */
  readonly displayRevision = computed(
    () => `${this.selectedCode()}:${this.lastFetchedAt()}:${Object.keys(this.sellByCode()).length}`
  );

  constructor() {
    this.hydrateFromCache();
    this.ensureRates();
    if (typeof window !== 'undefined') {
      this.refreshTimer = setInterval(() => this.ensureRates(true), CLIENT_REFRESH_MS);
    }
  }

  setCurrency(code: AppCurrency): void {
    if (!SUPPORTED.has(code) || code === this.selectedCode()) {
      return;
    }
    this.selectedCode.set(code);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    } catch {
      // ignore quota / private mode
    }
    this.ensureRates();
  }

  /**
   * Convert an amount stored in IRT (API base / domain price) into the selected currency.
   * Uses sell rate (IRT per 1 foreign unit): foreign = irt / sell.
   * Returns null when the target rate is not loaded yet.
   */
  convertFromIrt(amountIrt: number, target: AppCurrency = this.selectedCode()): number | null {
    if (!Number.isFinite(amountIrt)) {
      return 0;
    }
    if (target === 'IRT') {
      return amountIrt;
    }
    const sell = this.sellByCode()[target];
    if (!sell || sell <= 0) {
      return null;
    }
    return amountIrt / sell;
  }

  hasRate(code: AppCurrency): boolean {
    return code === 'IRT' || (this.sellByCode()[code] ?? 0) > 0;
  }

  /** Fraction digits for display in the given (or selected) currency. */
  fractionDigits(code: AppCurrency = this.selectedCode()): number {
    return code === 'IRT' ? 0 : 2;
  }

  /** ISO-ish code for Intl; USDT is not ISO — callers should special-case. */
  intlCurrencyCode(code: AppCurrency = this.selectedCode()): string {
    return code === 'USDT' ? 'USD' : code === 'IRT' ? 'IRR' : code;
  }

  ensureRates(force = false): void {
    const now = Date.now();
    const age = now - this.lastFetchedAt();
    if (!force && age >= 0 && age < CLIENT_REFRESH_MS && Object.keys(this.sellByCode()).length > 0) {
      return;
    }
    if (!force && age >= 0 && age < MIN_FETCH_GAP_MS) {
      return;
    }
    this.fetchRates().subscribe();
  }

  private fetchRates(): Observable<FxCachePayload> {
    if (this.inFlight$) {
      return this.inFlight$;
    }
    this.loading.set(true);
    this.inFlight$ = this.http.get<BackendRatesResponse>(`${API_URL}/currency/rates`).pipe(
      map((res) => this.toCachePayload(res)),
      tap((payload) => {
        this.applyPayload(payload);
        this.persistCache(payload);
        this.loading.set(false);
        this.inFlight$ = null;
      }),
      catchError(() => {
        this.loading.set(false);
        this.inFlight$ = null;
        return of(this.currentPayload());
      }),
      shareReplay(1)
    );
    return this.inFlight$;
  }

  private toCachePayload(res: BackendRatesResponse): FxCachePayload {
    const sellByCode: Record<string, number> = {};
    for (const [code, sell] of Object.entries(res.sellByCode ?? {})) {
      const key = code.toUpperCase();
      const value = Number(sell);
      if (key && Number.isFinite(value) && value > 0) {
        sellByCode[key] = value;
      }
    }
    return {
      fetchedAt: typeof res.fetchedAt === 'number' && res.fetchedAt > 0 ? res.fetchedAt : Date.now(),
      updatedAt: res.updatedAt ?? null,
      sellByCode
    };
  }

  private applyPayload(payload: FxCachePayload): void {
    this.sellByCode.set(payload.sellByCode ?? {});
    this.ratesUpdatedAt.set(payload.updatedAt);
    this.lastFetchedAt.set(payload.fetchedAt || Date.now());
  }

  private currentPayload(): FxCachePayload {
    return {
      fetchedAt: this.lastFetchedAt(),
      updatedAt: this.ratesUpdatedAt(),
      sellByCode: this.sellByCode()
    };
  }

  private hydrateFromCache(): void {
    try {
      const raw = localStorage.getItem(FX_CACHE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as FxCachePayload;
      if (!parsed?.sellByCode || typeof parsed.fetchedAt !== 'number') {
        return;
      }
      this.applyPayload(parsed);
    } catch {
      // ignore corrupt cache
    }
  }

  private persistCache(payload: FxCachePayload): void {
    try {
      localStorage.setItem(FX_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  private readStoredCurrency(): AppCurrency {
    try {
      const raw = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (raw && SUPPORTED.has(raw as AppCurrency)) {
        return raw as AppCurrency;
      }
    } catch {
      // ignore
    }
    return 'IRT';
  }
}
