import { Injectable, inject, effect } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { enUS } from 'date-fns/locale';
import { faIR } from 'date-fns-jalali/locale';
import { TranslationService } from './translation.service';

@Injectable({ providedIn: 'root' })
export class CalendarLocaleService {
  private readonly translation = inject(TranslationService);
  private readonly adapter = inject(DateAdapter);

  constructor() {
    effect(() => {
      this.apply(this.translation.currentLang());
    });
  }

  isJalali(): boolean {
    return this.translation.currentLang() === 'fa';
  }

  private apply(lang: string): void {
    if (lang === 'fa') {
      this.adapter.setLocale(faIR);
    } else {
      this.adapter.setLocale(enUS);
    }
  }
}
