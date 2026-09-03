import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  passwordConfigured: boolean;
  fromEmail: string;
  fromName: string;
  useTls: boolean;
  updatedAt?: string | null;
}

export interface EmailConfigUpdate {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
  useTls: boolean;
}

export interface EmailTestResult {
  success: boolean;
  errorMessage?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EmailConfigService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);

  getConfig(): Observable<EmailConfig> {
    return this.http.get<EmailConfig>(`${this.API_URL}/admin/email-config`);
  }

  updateConfig(payload: EmailConfigUpdate): Observable<EmailConfig> {
    return this.http.put<EmailConfig>(`${this.API_URL}/admin/email-config`, payload);
  }

  sendTestEmail(to: string): Observable<EmailTestResult> {
    return this.http.post<EmailTestResult>(`${this.API_URL}/admin/email-config/test`, { to });
  }
}
