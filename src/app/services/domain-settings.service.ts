import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DomainSettings {
  renewalRemindersEnabled: boolean;
  renewalInAppEnabled: boolean;
  renewalEmailEnabled: boolean;
  renewalSmsEnabled: boolean;
  renewalWindows: string;
  renewalWindowsParsed?: number[];
  renewalSendHour: number;
  renewalSendMinute: number;
  renewalLastRunDate?: string | null;
  updatedAt?: string | null;
}

export interface DomainSettingsUpdate {
  renewalRemindersEnabled: boolean;
  renewalInAppEnabled: boolean;
  renewalEmailEnabled: boolean;
  renewalSmsEnabled: boolean;
  renewalWindows: number[];
  renewalSendHour: number;
  renewalSendMinute: number;
}

export interface DomainRenewalTestRequest {
  domainName: string;
  windowDays: number;
  toEmail?: string;
  sendInApp: boolean;
  sendEmail: boolean;
  sendSms: boolean;
}

export interface DomainRenewalTestResult {
  success: boolean;
  errorMessage?: string | null;
  channelsSent?: string[];
}

@Injectable({ providedIn: 'root' })
export class DomainSettingsService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);

  getSettings(): Observable<DomainSettings> {
    return this.http.get<DomainSettings>(`${this.API_URL}/admin/domain-settings`);
  }

  updateSettings(payload: DomainSettingsUpdate): Observable<DomainSettings> {
    return this.http.put<DomainSettings>(`${this.API_URL}/admin/domain-settings`, payload);
  }

  sendTestRenewal(payload: DomainRenewalTestRequest): Observable<DomainRenewalTestResult> {
    return this.http.post<DomainRenewalTestResult>(`${this.API_URL}/admin/domain-settings/test-renewal`, payload);
  }
}
