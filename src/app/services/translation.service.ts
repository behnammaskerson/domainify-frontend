import { Injectable, signal, computed } from '@angular/core';
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
  private readonly RTL_LANGS: Language[] = ['fa', 'ar'];

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

  private getInitialLanguage(): Language {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'en' || saved === 'fa' || saved === 'ar' || saved === 'tr') {
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

  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    this.applyLanguage(lang);
  }

  toggleLanguage(): void {
    const order: Language[] = ['en', 'fa', 'ar', 'tr'];
    const idx = order.indexOf(this.currentLang());
    this.setLanguage(order[(idx + 1) % order.length]);
  }
}
