import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TicketAttachmentPolicy,
  TicketCategory,
  TicketDetail,
  TicketPriority
} from './ticket.service';

export interface GuestCreateTicketPayload {
  name: string;
  email: string;
  subject: string;
  description: string;
  categoryId: number;
  priority: TicketPriority;
  attachments?: File[];
  captchaToken?: string;
  captchaAnswer?: string;
}

export interface GuestTicketPublicConfig {
  guestTicketCreateEnabled: boolean;
  guestTicketAttachmentsEnabled: boolean;
}

export interface GuestTicketSummary {
  id: number;
  publicNumber?: string;
  subject: string;
  status: string;
  priority: TicketPriority;
  createdAt?: string;
  updatedAt?: string;
  current?: boolean;
  accessToken?: string;
}

export interface GuestTicketLookupPayload {
  email: string;
  captchaToken?: string;
  captchaAnswer?: string;
}

@Injectable({ providedIn: 'root' })
export class GuestTicketService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api';

  getConfig(): Observable<GuestTicketPublicConfig> {
    return this.http.get<GuestTicketPublicConfig>(`${this.API_URL}/public/tickets/config`);
  }

  listCategories(): Observable<TicketCategory[]> {
    return this.http.get<TicketCategory[]>(`${this.API_URL}/public/tickets/categories`);
  }

  getAttachmentPolicy(): Observable<TicketAttachmentPolicy> {
    return this.http.get<TicketAttachmentPolicy>(`${this.API_URL}/public/tickets/attachment-policy`);
  }

  create(payload: GuestCreateTicketPayload): Observable<{ message: string }> {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('email', payload.email);
    formData.append('subject', payload.subject);
    formData.append('description', payload.description);
    formData.append('categoryId', String(payload.categoryId));
    formData.append('priority', payload.priority);
    for (const file of payload.attachments ?? []) {
      formData.append('attachments', file, file.name);
    }

    if (payload.captchaToken) {
      formData.append('captchaToken', payload.captchaToken);
    }
    if (payload.captchaAnswer) {
      formData.append('captchaAnswer', payload.captchaAnswer);
    }

    return this.http.post<{ message: string }>(`${this.API_URL}/public/tickets`, formData);
  }

  lookupByEmail(payload: GuestTicketLookupPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/public/tickets/lookup`, payload);
  }

  listMine(token: string): Observable<GuestTicketSummary[]> {
    return this.http.get<GuestTicketSummary[]>(
      `${this.API_URL}/public/tickets/access/${encodeURIComponent(token)}/mine`
    );
  }

  openRelated(token: string, ticketId: number): Observable<GuestTicketSummary> {
    return this.http.post<GuestTicketSummary>(
      `${this.API_URL}/public/tickets/access/${encodeURIComponent(token)}/mine/${ticketId}/open`,
      {}
    );
  }

  getByToken(token: string): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(
      `${this.API_URL}/public/tickets/access/${encodeURIComponent(token)}`
    );
  }

  reply(token: string, body: string, attachments?: File[]): Observable<TicketDetail> {
    const formData = new FormData();
    formData.append('body', body);
    for (const file of attachments ?? []) {
      formData.append('attachments', file, file.name);
    }
    return this.http.post<TicketDetail>(
      `${this.API_URL}/public/tickets/access/${encodeURIComponent(token)}/replies`,
      formData
    );
  }
}
