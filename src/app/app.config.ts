import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslateService, TranslateParser } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';
import { ErrorInterceptor } from './services/error.interceptor';
import { LanguageInterceptor } from './services/language.interceptor';
import { TranslationService } from './services/translation.service';
import { CalendarLocaleService } from './services/calendar-locale.service';
import { LocaleDigitsTranslateParser } from './services/locale-digits-translate-parser';
import { firstValueFrom } from 'rxjs';
import { provideDateFnsAdapter } from 'ngx-material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { enUS } from 'date-fns/locale';
import { TranslatedPaginatorIntl } from './services/translated-paginator-intl';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

function initTranslations(translate: TranslateService, translationService: TranslationService) {
  return () => {
    translationService.initialize();
    return firstValueFrom(translate.use(translationService.currentLang()));
  };
}

function initCalendarLocale(calendarLocale: CalendarLocaleService) {
  return () => {
    // Touch the service so the language→calendar effect is registered.
    void calendarLocale.isJalali();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      })
    ),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    provideDateFnsAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: enUS },
    { provide: MatPaginatorIntl, useClass: TranslatedPaginatorIntl },
    {
      provide: APP_INITIALIZER,
      useFactory: initTranslations,
      deps: [TranslateService, TranslationService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initCalendarLocale,
      deps: [CalendarLocaleService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LanguageInterceptor,
      multi: true
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        },
        parser: {
          provide: TranslateParser,
          useClass: LocaleDigitsTranslateParser
        }
      })
    )
  ]
};
