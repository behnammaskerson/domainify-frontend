import { Injectable, Injector } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly injector: Injector,
    private readonly router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this.handleTokenRefresh(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private get authService(): AuthService {
    // Lazy resolve — eager AuthService inject creates HttpClient ↔ HTTP_INTERCEPTORS cycle.
    return this.injector.get(AuthService);
  }

  private handleTokenRefresh(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.authService.isImpersonating()) {
      return this.authService.endImpersonation().pipe(
        switchMap(() => {
          this.router.navigate(['/dashboard']);
          return throwError(() => new Error('Impersonation session expired'));
        }),
        catchError(() => {
          this.authService.logout();
          this.router.navigate(['/login']);
          return throwError(() => new Error('Session expired'));
        })
      );
    }

    return this.authService.refreshToken().pipe(
      switchMap(() => next.handle(request)),
      catchError(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
        return throwError(() => new Error('Session expired'));
      })
    );
  }
}
