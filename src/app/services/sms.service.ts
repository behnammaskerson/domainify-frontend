import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SmsProviderResult } from './sms-config.service';

export interface SmsBulkSendRequest {
  lineNumber?: string;
  messageText: string;
  mobiles: string[];
  sendDateTime?: number;
  sendSource?: 'SINGLE' | 'BULK' | 'FILE';
}

export interface SmsBulkSendData {
  packId?: string | null;
  messageIds?: number[] | null;
  cost?: number | null;
}

export interface SmsBulkSendResult extends SmsProviderResult {
  data?: SmsBulkSendData | null;
}

export type ScheduledSmsSourceType = 'SINGLE' | 'BULK' | 'FILE';
export type ScheduledSmsStatus = 'PENDING' | 'CANCELLED' | 'SENT';

export interface SmsScheduledItem {
  packId: string;
  sourceType: ScheduledSmsSourceType;
  lineNumber: string;
  messageText: string;
  recipientCount: number;
  cost?: number | null;
  scheduledAt: string;
  status: ScheduledSmsStatus;
  cancelledAt?: string | null;
  returnedCreditCount?: number | null;
  smsCount?: number | null;
  createdAt: string;
  cancellable: boolean;
}

export interface SmsScheduledCancelResult extends SmsProviderResult {
  returnedCreditCount?: number | null;
  smsCount?: number | null;
}

export interface SmsScheduledListParams {
  status?: ScheduledSmsStatus;
  sourceType?: ScheduledSmsSourceType;
  search?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SmsScheduledPagedResult {
  content: SmsScheduledItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  allCount: number;
  pendingCount: number;
  cancelledCount: number;
  sentCount: number;
}

@Injectable({ providedIn: 'root' })
export class SmsService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);

  sendBulk(payload: SmsBulkSendRequest): Observable<SmsBulkSendResult> {
    return this.http.post<SmsBulkSendResult>(`${this.API_URL}/admin/sms/send/bulk`, payload);
  }

  listScheduled(params?: SmsScheduledListParams): Observable<SmsScheduledPagedResult> {
    let httpParams = new HttpParams();
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.sourceType) {
      httpParams = httpParams.set('sourceType', params.sourceType);
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.scheduledFrom) {
      httpParams = httpParams.set('scheduledFrom', params.scheduledFrom);
    }
    if (params?.scheduledTo) {
      httpParams = httpParams.set('scheduledTo', params.scheduledTo);
    }
    httpParams = httpParams.set('page', String(params?.page ?? 0));
    httpParams = httpParams.set('size', String(params?.size ?? 10));
    if (params?.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<SmsScheduledPagedResult>(`${this.API_URL}/admin/sms/scheduled`, { params: httpParams });
  }

  cancelScheduled(packId: string): Observable<SmsScheduledCancelResult> {
    return this.http.delete<SmsScheduledCancelResult>(`${this.API_URL}/admin/sms/scheduled/${packId}`);
  }

  removeScheduledRecord(packId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/sms/scheduled/${packId}/record`);
  }
}
