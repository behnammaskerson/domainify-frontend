import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  expiryDays: number;
  historyCount: number;
  updatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PasswordPolicyService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);
  private publicPolicy$?: Observable<PasswordPolicy>;

  /** Public rules for register / password forms (cached). */
  getPublicPolicy(force = false): Observable<PasswordPolicy> {
    if (!this.publicPolicy$ || force) {
      this.publicPolicy$ = this.http
        .get<PasswordPolicy>(`${this.API_URL}/auth/password-policy`)
        .pipe(shareReplay(1));
    }
    return this.publicPolicy$;
  }

  getAdminPolicy(): Observable<PasswordPolicy> {
    return this.http.get<PasswordPolicy>(`${this.API_URL}/admin/password-policy`);
  }

  updatePolicy(policy: PasswordPolicy): Observable<PasswordPolicy> {
    return this.http.put<PasswordPolicy>(`${this.API_URL}/admin/password-policy`, policy);
  }

  invalidatePublicCache(): void {
    this.publicPolicy$ = undefined;
  }
}
