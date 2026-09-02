import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'NEW' | 'OPEN' | 'PENDING' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED';
export type TicketChannel = 'PORTAL' | 'EMAIL';

export interface TicketCategory {
  id: number;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface TicketCategoryRequest {
  name: string;
  code?: string;
  active?: boolean;
  sortOrder?: number;
}

export interface TicketAttachmentMeta {
  id?: number;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface Ticket {
  id?: number;
  publicNumber?: string;
  subject?: string;
  description?: string;
  category?: TicketCategory | null;
  priority?: TicketPriority;
  status?: TicketStatus;
  channel?: TicketChannel;
  requesterId?: number;
  requesterEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  attachments?: TicketAttachmentMeta[];
}

export interface TicketMessage {
  id?: number | null;
  body?: string;
  authorId?: number;
  authorName?: string;
  authorEmail?: string;
  mine?: boolean;
  createdAt?: string;
  attachments?: TicketAttachmentMeta[];
}

export interface TicketDetail {
  ticket: Ticket;
  messages: TicketMessage[];
  canReply: boolean;
}

export interface PagedTickets {
  content: Ticket[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface MyTicketsParams {
  status?: TicketStatus;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  categoryId: number;
  priority: TicketPriority;
  attachments?: File[];
}

export interface ReplyTicketPayload {
  body: string;
  attachments?: File[];
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);

  listActiveCategories(): Observable<TicketCategory[]> {
    return this.http.get<TicketCategory[]>(`${this.API_URL}/tickets/categories`);
  }

  listAllCategories(): Observable<TicketCategory[]> {
    return this.http.get<TicketCategory[]>(`${this.API_URL}/admin/ticket-categories`);
  }

  createCategory(payload: TicketCategoryRequest): Observable<TicketCategory> {
    return this.http.post<TicketCategory>(`${this.API_URL}/admin/ticket-categories`, payload);
  }

  updateCategory(id: number, payload: TicketCategoryRequest): Observable<TicketCategory> {
    return this.http.put<TicketCategory>(`${this.API_URL}/admin/ticket-categories/${id}`, payload);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/ticket-categories/${id}`);
  }

  listMine(params?: MyTicketsParams): Observable<PagedTickets> {
    let httpParams = new HttpParams();
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.q?.trim()) {
      httpParams = httpParams.set('q', params.q.trim());
    }
    httpParams = httpParams.set('page', String(params?.page ?? 0));
    httpParams = httpParams.set('size', String(params?.size ?? 10));
    if (params?.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<PagedTickets>(`${this.API_URL}/tickets/mine`, { params: httpParams });
  }

  getMine(id: number): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(`${this.API_URL}/tickets/mine/${id}`);
  }

  reply(id: number, payload: ReplyTicketPayload): Observable<TicketDetail> {
    const formData = new FormData();
    formData.append('body', payload.body);
    for (const file of payload.attachments ?? []) {
      formData.append('attachments', file, file.name);
    }
    return this.http.post<TicketDetail>(`${this.API_URL}/tickets/mine/${id}/replies`, formData);
  }

  downloadTicketAttachment(ticketId: number, attachmentId: number, fileName: string): Observable<void> {
    return this.http.get(`${this.API_URL}/tickets/mine/${ticketId}/attachments/${attachmentId}`, {
      responseType: 'blob'
    }).pipe(map((blob) => this.saveBlob(blob, fileName)));
  }

  downloadMessageAttachment(
    ticketId: number,
    messageId: number,
    attachmentId: number,
    fileName: string
  ): Observable<void> {
    return this.http.get(
      `${this.API_URL}/tickets/mine/${ticketId}/messages/${messageId}/attachments/${attachmentId}`,
      { responseType: 'blob' }
    ).pipe(map((blob) => this.saveBlob(blob, fileName)));
  }

  create(payload: CreateTicketPayload): Observable<Ticket> {
    const formData = new FormData();
    formData.append('subject', payload.subject);
    formData.append('description', payload.description);
    formData.append('categoryId', String(payload.categoryId));
    formData.append('priority', payload.priority);
    for (const file of payload.attachments ?? []) {
      formData.append('attachments', file, file.name);
    }
    return this.http.post<Ticket>(`${this.API_URL}/tickets`, formData);
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName || 'attachment';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
