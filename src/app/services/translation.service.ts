import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'en' | 'fa' | 'ar' | 'tr';

export interface LanguageOption {
  code: Language;
  labelKey: string;
  nativeLabel: string;
  rtl: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'domainify-language';
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly RTL_LANGS: Language[] = ['fa', 'ar'];
  private readonly http = inject(HttpClient);

  readonly languages: LanguageOption[] = [
    { code: 'en', labelKey: 'common.english', nativeLabel: 'English', rtl: false },
    { code: 'fa', labelKey: 'common.persian', nativeLabel: 'فارسی', rtl: true },
    { code: 'ar', labelKey: 'common.arabic', nativeLabel: 'العربية', rtl: true },
    { code: 'tr', labelKey: 'common.turkish', nativeLabel: 'Türkçe', rtl: false }
  ];

  currentLang = signal<Language>(this.getInitialLanguage());
  isRtl = computed(() => this.RTL_LANGS.includes(this.currentLang()));

  constructor(private translate: TranslateService) {
    this.translate.addLangs(this.languages.map(l => l.code));
    this.translate.setDefaultLang('en');
  }

  private isLanguage(value: unknown): value is Language {
    return value === 'en' || value === 'fa' || value === 'ar' || value === 'tr';
  }

  private readUserPreferredLanguage(): Language | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      const raw = localStorage.getItem('user');
      if (!raw) {
        return null;
      }
      const user = JSON.parse(raw) as { preferredLanguage?: string };
      return this.isLanguage(user?.preferredLanguage) ? user.preferredLanguage : null;
    } catch {
      return null;
    }
  }

  private getInitialLanguage(): Language {
    const fromUser = this.readUserPreferredLanguage();
    if (fromUser) {
      return fromUser;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (this.isLanguage(saved)) {
        return saved;
      }
    }
    return 'en';
  }

  private applyDocumentLanguage(lang: Language): void {
    const rtl = this.RTL_LANGS.includes(lang);
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.classList.remove('lang-en', 'lang-fa', 'lang-ar', 'lang-tr');
    document.documentElement.classList.add(`lang-${lang}`);
  }

  initialize(): void {
    const lang = this.currentLang();
    this.applyDocumentLanguage(lang);
  }

  private applyLanguage(lang: Language): void {
    this.translate.use(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.applyDocumentLanguage(lang);
  }

  /**
   * @param syncRemote When true (default) and the user is logged in, persist to the account
   * so email/SMS/in-app notifications follow this language for the recipient.
   */
  setLanguage(lang: Language, options?: { syncRemote?: boolean }): void {
    this.currentLang.set(lang);
    this.applyLanguage(lang);
    if (options?.syncRemote !== false && typeof localStorage !== 'undefined' && localStorage.getItem('accessToken')) {
      this.http.patch(`${this.API_URL}/users/me/preferred-language`, { language: lang }).subscribe({
        next: (user) => {
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
        },
        error: () => undefined
      });
    }
  }

  /** Apply account preferred language without writing back to the API. */
  applyPreferredLanguage(lang: string | null | undefined): void {
    if (this.isLanguage(lang)) {
      this.setLanguage(lang, { syncRemote: false });
    }
  }

  toggleLanguage(): void {
    const order: Language[] = ['en', 'fa', 'ar', 'tr'];
    const idx = order.indexOf(this.currentLang());
    this.setLanguage(order[(idx + 1) % order.length]);
  }
}
