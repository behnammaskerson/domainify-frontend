import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaymentSettings {
  merchantId: string;
  sandbox: boolean;
  accessTokenConfigured: boolean;
  enabled: boolean;
  commissionPercent: number;
  minTopUpIrt: number;
  featuredListingPriceIrt: number;
  escrowHoldDays: number;
  callbackPublicBaseUrl: string;
  paymentNotificationsEnabled: boolean;
  paymentInAppNotificationsEnabled: boolean;
  paymentEmailNotificationsEnabled: boolean;
  paymentSmsNotificationsEnabled: boolean;
  updatedAt?: string | null;
}

export interface PaymentSettingsUpdate {
  merchantId?: string;
  sandbox: boolean;
  accessToken?: string;
  enabled: boolean;
  commissionPercent: number;
  minTopUpIrt: number;
  featuredListingPriceIrt: number;
  escrowHoldDays: number;
  callbackPublicBaseUrl?: string;
  paymentNotificationsEnabled: boolean;
  paymentInAppNotificationsEnabled: boolean;
  paymentEmailNotificationsEnabled: boolean;
  paymentSmsNotificationsEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class PaymentSettingsService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);

  getSettings(): Observable<PaymentSettings> {
    return this.http.get<PaymentSettings>(`${this.API_URL}/admin/payment-settings`);
  }

  updateSettings(payload: PaymentSettingsUpdate): Observable<PaymentSettings> {
    return this.http.put<PaymentSettings>(`${this.API_URL}/admin/payment-settings`, payload);
  }
}
