import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

const LANGUAGE_STORAGE_KEY = 'domainify-language';

@Injectable()
export class LanguageInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Never inject TranslationService here — it creates a circular dependency with
    // TranslateHttpLoader (TranslationService -> TranslateService -> HttpClient -> this).
    if (request.url.includes('/assets/i18n/')) {
      return next.handle(request);
    }

    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
      : null;
    const lang = saved === 'en' || saved === 'fa' || saved === 'ar' || saved === 'tr' ? saved : 'en';

    return next.handle(request.clone({
      setHeaders: {
        'Accept-Language': lang
      }
    }));
  }
}
