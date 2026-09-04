import { Injectable, Injector, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TranslationService } from './translation.service';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  enabled?: boolean;
  avatarUrl?: string | null;
  phoneCountryCode?: string | null;
  phoneNumber?: string | null;
  totpEnabled?: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string | null;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
  ticketAvailable?: boolean;
  preferredLanguage?: 'en' | 'fa' | 'ar' | 'tr' | string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  creatorUsername?: string | null;
  createMethod?: 'REGISTER' | 'ADMIN' | string | null;
}

export interface AuthResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: string;
  user?: User | null;
  requiresTotp?: boolean;
  preAuthToken?: string | null;
  requiresPasswordChange?: boolean;
  requiresEmailVerification?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  preferredLanguage?: string;
}

export interface TotpSetupResponse {
  secret: string;
  otpauthUri: string;
  qrCodeDataUri: string;
}

export interface TotpEnableResponse {
  user: User;
  backupCodes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api';
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  /** Lazy — do not inject TranslationService eagerly (HttpClient ↔ interceptor cycle). */
  private readonly injector = inject(Injector);

  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, request).pipe(
      tap(response => {
        if (!response.requiresTotp) {
          this.saveToken(response);
        }
      })
    );
  }

  verifyTotpLogin(preAuthToken: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/2fa/verify`, {
      preAuthToken,
      code
    }).pipe(
      tap(response => this.saveToken(response))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, request).pipe(
      tap(response => {
        if (!response.requiresEmailVerification) {
          this.saveToken(response);
        }
      })
    );
  }

  resendVerificationEmail(email: string): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.API_URL}/auth/resend-verification-email`, { email });
  }

  logout(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      this.http.post(`${this.API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe();
    }
    this.clearToken();
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      this.logout();
      throw new Error('No refresh token');
    }

    return this.http.post<AuthResponse>(
      `${this.API_URL}/auth/refresh?refreshToken=${encodeURIComponent(refreshToken)}`,
      {}
    ).pipe(
      tap(response => this.saveToken(response))
    );
  }

  setupTotp(): Observable<TotpSetupResponse> {
    return this.http.post<TotpSetupResponse>(`${this.API_URL}/users/me/2fa/setup`, {});
  }

  enableTotp(code: string): Observable<TotpEnableResponse> {
    return this.http.post<TotpEnableResponse>(`${this.API_URL}/users/me/2fa/enable`, { code });
  }

  disableTotp(password: string, code: string): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/users/me/2fa/disable`, { password, code });
  }

  regenerateBackupCodes(password: string, code: string): Observable<TotpEnableResponse> {
    return this.http.post<TotpEnableResponse>(`${this.API_URL}/users/me/2fa/backup-codes`, {
      password,
      code
    });
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/users/me`, {
      headers: { Authorization: this.getAuthHeader() }
    });
  }

  refreshCurrentUser(): Observable<User> {
    return this.getCurrentUser().pipe(
      tap((user) => this.setCurrentUser(user))
    );
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.API_URL}/auth/verify-email`, {
      params: { token }
    });
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.getValue();
    return user?.role === 'ADMIN';
  }

  setCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.applyPreferredLanguageLater(user.preferredLanguage);
  }

  private saveToken(response: AuthResponse): void {
    if (!response.accessToken || !response.refreshToken || !response.user) {
      return;
    }
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
    this.applyPreferredLanguageLater(response.user.preferredLanguage);
  }

  private applyPreferredLanguageLater(lang: string | null | undefined): void {
    queueMicrotask(() => {
      this.injector.get(TranslationService).applyPreferredLanguage(lang);
    });
  }

  /** Apply tokens returned after an identity change (e.g. profile email update). */
  applySessionTokens(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.setCurrentUser(user);
  }

  private clearToken(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  private getAuthHeader(): string {
    const token = localStorage.getItem('accessToken');
    return token ? `Bearer ${token}` : '';
  }
}
