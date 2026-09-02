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

export interface SmsDeliveryStatusData {
  messageId?: number | null;
  mobile?: number | null;
  messageText?: string | null;
  sendDateTime?: number | null;
  lineNumber?: number | null;
  cost?: number | null;
  deliveryState?: number | null;
  deliveryDateTime?: number | null;
}

export interface SmsDailyPackItem {
  packId?: string | null;
  recipientCount?: number | null;
  creationDateTime?: number | null;
}

export interface SmsDailyPackResult extends SmsProviderResult {
  data?: SmsDailyPackItem[] | null;
  pageNumber?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface SmsDailyPackListParams {
  pageSize?: number;
  pageNumber?: number;
}

export interface SmsLiveSendResult extends SmsProviderResult {
  data?: SmsDeliveryStatusData[] | null;
  pageNumber?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface SmsArchiveSendListParams {
  fromDate?: number;
  toDate?: number;
  pageSize?: number;
  pageNumber?: number;
}

export interface SmsArchiveSendResult extends SmsProviderResult {
  data?: SmsDeliveryStatusData[] | null;
  pageNumber?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface SmsPackReportResult extends SmsProviderResult {
  packId?: string | null;
  data?: SmsDeliveryStatusData[] | null;
}

export interface SmsReceivedMessage {
  receiveReturnId?: number | null;
  messageText?: string | null;
  number?: number | null;
  mobile?: number | null;
  receivedDateTime?: number | null;
}

export interface SmsReceiveLatestResult extends SmsProviderResult {
  data?: SmsReceivedMessage[] | null;
  count?: number;
}

export interface SmsReceivePagedResult extends SmsProviderResult {
  data?: SmsReceivedMessage[] | null;
  pageNumber?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface SmsReceiveLiveListParams {
  pageSize?: number;
  pageNumber?: number;
  sortByNewest?: boolean;
  mobile?: string;
}

export interface SmsReceiveArchiveListParams {
  fromDate?: number;
  toDate?: number;
  pageSize?: number;
  pageNumber?: number;
  mobile?: string;
}

@Injectable({ providedIn: 'root' })
export class SmsService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);

  sendBulk(payload: SmsBulkSendRequest): Observable<SmsBulkSendResult> {
    return this.http.post<SmsBulkSendResult>(`${this.API_URL}/admin/sms/send/bulk`, payload);
  }

  listLiveSends(params?: SmsDailyPackListParams): Observable<SmsLiveSendResult> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageSize', String(params?.pageSize ?? 100));
    httpParams = httpParams.set('pageNumber', String(params?.pageNumber ?? 1));
    return this.http.get<SmsLiveSendResult>(`${this.API_URL}/admin/sms/send/live`, { params: httpParams });
  }

  listArchiveSends(params?: SmsArchiveSendListParams): Observable<SmsArchiveSendResult> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageSize', String(params?.pageSize ?? 100));
    httpParams = httpParams.set('pageNumber', String(params?.pageNumber ?? 1));
    if (params?.fromDate != null && params.fromDate > 0) {
      httpParams = httpParams.set('fromDate', String(params.fromDate));
    }
    if (params?.toDate != null && params.toDate > 0) {
      httpParams = httpParams.set('toDate', String(params.toDate));
    }
    return this.http.get<SmsArchiveSendResult>(`${this.API_URL}/admin/sms/send/archive`, { params: httpParams });
  }

  listDailyPacks(params?: SmsDailyPackListParams): Observable<SmsDailyPackResult> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageSize', String(params?.pageSize ?? 10));
    httpParams = httpParams.set('pageNumber', String(params?.pageNumber ?? 1));
    return this.http.get<SmsDailyPackResult>(`${this.API_URL}/admin/sms/send/pack`, { params: httpParams });
  }

  getPackReport(packId: string): Observable<SmsPackReportResult> {
    return this.http.get<SmsPackReportResult>(
      `${this.API_URL}/admin/sms/send/pack/${encodeURIComponent(packId)}`
    );
  }

  listLatestReceived(count = 100): Observable<SmsReceiveLatestResult> {
    const httpParams = new HttpParams().set('count', String(Math.min(Math.max(count, 1), 100)));
    return this.http.get<SmsReceiveLatestResult>(`${this.API_URL}/admin/sms/receive/latest`, {
      params: httpParams
    });
  }

  listLiveReceived(params?: SmsReceiveLiveListParams): Observable<SmsReceivePagedResult> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageSize', String(params?.pageSize ?? 100));
    httpParams = httpParams.set('pageNumber', String(params?.pageNumber ?? 1));
    if (params?.sortByNewest != null) {
      httpParams = httpParams.set('sortByNewest', String(params.sortByNewest));
    }
    if (params?.mobile) {
      httpParams = httpParams.set('mobile', params.mobile);
    }
    return this.http.get<SmsReceivePagedResult>(`${this.API_URL}/admin/sms/receive/live`, {
      params: httpParams
    });
  }

  listArchiveReceived(params?: SmsReceiveArchiveListParams): Observable<SmsReceivePagedResult> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('pageSize', String(params?.pageSize ?? 100));
    httpParams = httpParams.set('pageNumber', String(params?.pageNumber ?? 1));
    if (params?.fromDate != null && params.fromDate > 0) {
      httpParams = httpParams.set('fromDate', String(params.fromDate));
    }
    if (params?.toDate != null && params.toDate > 0) {
      httpParams = httpParams.set('toDate', String(params.toDate));
    }
    if (params?.mobile) {
      httpParams = httpParams.set('mobile', params.mobile);
    }
    return this.http.get<SmsReceivePagedResult>(`${this.API_URL}/admin/sms/receive/archive`, {
      params: httpParams
    });
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
