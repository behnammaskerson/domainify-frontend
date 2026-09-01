import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SmsConfig {
  serverUrl: string;
  apiKeyConfigured: boolean;
  defaultLine?: string | null;
  updatedAt?: string | null;
}

export interface SmsConfigUpdate {
  serverUrl: string;
  apiKey?: string;
}

export interface SmsProviderResult {
  success: boolean;
  httpStatus?: number | null;
  providerStatus?: number | null;
}

export interface SmsCreditResult extends SmsProviderResult {
  credit?: number | null;
}

export interface SmsLinesResult extends SmsProviderResult {
  lines?: string[];
}

@Injectable({ providedIn: 'root' })
export class SmsConfigService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);

  getConfig(): Observable<SmsConfig> {
    return this.http.get<SmsConfig>(`${this.API_URL}/admin/sms-config`);
  }

  updateConfig(payload: SmsConfigUpdate): Observable<SmsConfig> {
    return this.http.put<SmsConfig>(`${this.API_URL}/admin/sms-config`, payload);
  }

  getCredit(): Observable<SmsCreditResult> {
    return this.http.get<SmsCreditResult>(`${this.API_URL}/admin/sms-config/credit`);
  }

  getLines(): Observable<SmsLinesResult> {
    return this.http.get<SmsLinesResult>(`${this.API_URL}/admin/sms-config/lines`);
  }

  setDefaultLine(defaultLine: string): Observable<SmsConfig> {
    return this.http.put<SmsConfig>(`${this.API_URL}/admin/sms-config/default-line`, { defaultLine });
  }
}
