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
  requesterName?: string;
  assigneeId?: number;
  assigneeEmail?: string;
  assigneeName?: string;
  dueAt?: string;
  overdue?: boolean;
  closedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  archived?: boolean;
  deleted?: boolean;
  tags?: TicketTag[];
  createdAt?: string;
  updatedAt?: string;
  attachments?: TicketAttachmentMeta[];
}

export type TicketInboxView = 'ALL' | 'UNASSIGNED' | 'MINE' | 'MENTIONS' | 'OVERDUE' | 'ARCHIVED' | 'DELETED';

export interface TicketTag {
  id: number;
  name: string;
}

export interface TicketAssigneeOption {
  id: number;
  name: string;
  email: string;
}

export interface TicketMessage {
  id?: number | null;
  body?: string;
  authorId?: number;
  authorName?: string;
  authorEmail?: string;
  mine?: boolean;
  staff?: boolean;
  initial?: boolean;
  createdAt?: string;
  attachments?: TicketAttachmentMeta[];
}

export interface TicketDetail {
  ticket: Ticket;
  messages: TicketMessage[];
  canReply: boolean;
  canClose?: boolean;
  canReopen?: boolean;
  canArchive?: boolean;
  canUnarchive?: boolean;
  canSoftDelete?: boolean;
  canRestore?: boolean;
  reopenUntil?: string;
  reopenWindowDays?: number;
  allowedNextStatuses?: TicketStatus[];
}

export type TicketAttachmentKind = 'IMAGE' | 'PDF' | 'LOG' | 'DOCUMENT';

export interface TicketSettings {
  reopenWindowDays: number;
  maxAttachments: number;
  maxAttachmentSizeMb: number;
  allowedAttachmentKinds: TicketAttachmentKind[];
  autoArchiveClosedAfterDays: number;
}

export interface TicketAttachmentPolicy {
  maxAttachments: number;
  maxAttachmentSizeMb: number;
  maxAttachmentBytes: number;
  allowedAttachmentKinds: TicketAttachmentKind[];
  allowedContentTypes: string[];
  allowedExtensions: string[];
}

export interface TicketStatusDefinition {
  status: TicketStatus;
  label?: string | null;
  active: boolean;
  sortOrder: number;
}

export interface TicketStatusTransition {
  from: TicketStatus;
  to: TicketStatus;
}

export interface TicketStatusWorkflow {
  statuses: TicketStatusDefinition[];
  transitions: TicketStatusTransition[];
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

export interface AdminInboxParams {
  view?: TicketInboxView;
  q?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: number;
  assigneeId?: number;
  unassigned?: boolean;
  createdFrom?: string;
  createdTo?: string;
  tagId?: number;
  customer?: string;
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

  listAdminInbox(params?: AdminInboxParams): Observable<PagedTickets> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('view', params?.view ?? 'ALL');
    if (params?.q?.trim()) {
      httpParams = httpParams.set('q', params.q.trim());
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.priority) {
      httpParams = httpParams.set('priority', params.priority);
    }
    if (params?.categoryId != null) {
      httpParams = httpParams.set('categoryId', String(params.categoryId));
    }
    if (params?.unassigned) {
      httpParams = httpParams.set('unassigned', 'true');
    } else if (params?.assigneeId != null) {
      httpParams = httpParams.set('assigneeId', String(params.assigneeId));
    }
    if (params?.createdFrom) {
      httpParams = httpParams.set('createdFrom', params.createdFrom);
    }
    if (params?.createdTo) {
      httpParams = httpParams.set('createdTo', params.createdTo);
    }
    if (params?.tagId != null) {
      httpParams = httpParams.set('tagId', String(params.tagId));
    }
    if (params?.customer?.trim()) {
      httpParams = httpParams.set('customer', params.customer.trim());
    }
    httpParams = httpParams.set('page', String(params?.page ?? 0));
    httpParams = httpParams.set('size', String(params?.size ?? 10));
    if (params?.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<PagedTickets>(`${this.API_URL}/admin/tickets/inbox`, { params: httpParams });
  }

  listAdminAssignees(): Observable<TicketAssigneeOption[]> {
    return this.http.get<TicketAssigneeOption[]>(`${this.API_URL}/admin/tickets/assignees`);
  }

  listAdminTags(): Observable<TicketTag[]> {
    return this.http.get<TicketTag[]>(`${this.API_URL}/admin/tickets/tags`);
  }

  getMine(id: number): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(`${this.API_URL}/tickets/mine/${id}`);
  }

  getAdminTicket(id: number): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(`${this.API_URL}/admin/tickets/${id}`);
  }

  reply(id: number, payload: ReplyTicketPayload): Observable<TicketDetail> {
    const formData = new FormData();
    formData.append('body', payload.body);
    for (const file of payload.attachments ?? []) {
      formData.append('attachments', file, file.name);
    }
    return this.http.post<TicketDetail>(`${this.API_URL}/tickets/mine/${id}/replies`, formData);
  }

  replyAsAdmin(id: number, payload: ReplyTicketPayload): Observable<TicketDetail> {
    const formData = new FormData();
    formData.append('body', payload.body);
    for (const file of payload.attachments ?? []) {
      formData.append('attachments', file, file.name);
    }
    return this.http.post<TicketDetail>(`${this.API_URL}/admin/tickets/${id}/replies`, formData);
  }

  updateAdminTicketStatus(id: number, status: TicketStatus): Observable<TicketDetail> {
    return this.http.patch<TicketDetail>(`${this.API_URL}/admin/tickets/${id}/status`, { status });
  }

  closeAdminTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.API_URL}/admin/tickets/${id}/close`, {});
  }

  reopenAdminTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.API_URL}/admin/tickets/${id}/reopen`, {});
  }

  archiveAdminTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.API_URL}/admin/tickets/${id}/archive`, {});
  }

  unarchiveAdminTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.API_URL}/admin/tickets/${id}/unarchive`, {});
  }

  softDeleteAdminTicket(id: number): Observable<TicketDetail> {
    return this.http.delete<TicketDetail>(`${this.API_URL}/admin/tickets/${id}`);
  }

  restoreAdminTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.API_URL}/admin/tickets/${id}/restore`, {});
  }

  closeMineTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.API_URL}/tickets/mine/${id}/close`, {});
  }

  reopenMineTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${this.API_URL}/tickets/mine/${id}/reopen`, {});
  }

  updateAdminTicketTags(id: number, payload: { tagIds?: number[]; names?: string[] }): Observable<TicketDetail> {
    return this.http.put<TicketDetail>(`${this.API_URL}/admin/tickets/${id}/tags`, payload);
  }

  listAdminManagedTags(): Observable<TicketTag[]> {
    return this.http.get<TicketTag[]>(`${this.API_URL}/admin/ticket-tags`);
  }

  createAdminTag(name: string): Observable<TicketTag> {
    return this.http.post<TicketTag>(`${this.API_URL}/admin/ticket-tags`, { name });
  }

  deleteAdminTag(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/ticket-tags/${id}`);
  }

  getStatusWorkflow(): Observable<TicketStatusWorkflow> {
    return this.http.get<TicketStatusWorkflow>(`${this.API_URL}/admin/ticket-status-workflow`);
  }

  saveStatusWorkflow(workflow: TicketStatusWorkflow): Observable<TicketStatusWorkflow> {
    return this.http.put<TicketStatusWorkflow>(`${this.API_URL}/admin/ticket-status-workflow`, workflow);
  }

  getTicketSettings(): Observable<TicketSettings> {
    return this.http.get<TicketSettings>(`${this.API_URL}/admin/ticket-settings`);
  }

  saveTicketSettings(settings: TicketSettings): Observable<TicketSettings> {
    return this.http.put<TicketSettings>(`${this.API_URL}/admin/ticket-settings`, settings);
  }

  getAttachmentPolicy(): Observable<TicketAttachmentPolicy> {
    return this.http.get<TicketAttachmentPolicy>(`${this.API_URL}/tickets/attachment-policy`);
  }

  fetchTicketAttachment(ticketId: number, attachmentId: number, admin = false): Observable<Blob> {
    const base = admin
      ? `${this.API_URL}/admin/tickets/${ticketId}/attachments/${attachmentId}`
      : `${this.API_URL}/tickets/mine/${ticketId}/attachments/${attachmentId}`;
    return this.http.get(base, { responseType: 'blob' });
  }

  fetchMessageAttachment(
    ticketId: number,
    messageId: number,
    attachmentId: number,
    admin = false
  ): Observable<Blob> {
    const base = admin
      ? `${this.API_URL}/admin/tickets/${ticketId}/messages/${messageId}/attachments/${attachmentId}`
      : `${this.API_URL}/tickets/mine/${ticketId}/messages/${messageId}/attachments/${attachmentId}`;
    return this.http.get(base, { responseType: 'blob' });
  }

  downloadTicketAttachment(ticketId: number, attachmentId: number, fileName: string, admin = false): Observable<void> {
    return this.fetchTicketAttachment(ticketId, attachmentId, admin).pipe(
      map((blob) => this.saveBlob(blob, fileName))
    );
  }

  downloadMessageAttachment(
    ticketId: number,
    messageId: number,
    attachmentId: number,
    fileName: string,
    admin = false
  ): Observable<void> {
    return this.fetchMessageAttachment(ticketId, messageId, attachmentId, admin).pipe(
      map((blob) => this.saveBlob(blob, fileName))
    );
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

  saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName || 'attachment';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
