import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('accessToken');
    const isAuthRequest = request.url.includes('/auth/');
    const isAppApi = request.url.includes('localhost:8080')
      || request.url.startsWith('/api/')
      || request.url.startsWith('api/');

    if (token && !isAuthRequest && isAppApi) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }
}
