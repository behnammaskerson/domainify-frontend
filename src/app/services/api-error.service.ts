import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class ApiErrorService {
  private readonly translate = inject(TranslateService);

  resolve(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return this.translate.instant('errors.UNEXPECTED_ERROR');
    }

    const body = error.error as { code?: string; message?: string } | null;

    if (body?.code) {
      const key = `errors.${body.code}`;
      const translated = this.translate.instant(key);
      if (translated !== key) {
        return translated;
      }
    }

    if (body?.message) {
      return body.message;
    }

    if (error.status === 401) {
      return this.translate.instant('auth.messages.loginFailed');
    }

    return this.translate.instant('errors.UNEXPECTED_ERROR');
  }
}
