import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, interval, switchMap, tap, catchError, of, startWith } from 'rxjs';
import { AuthService } from './auth.service';

export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_CUSTOMER_REPLY'
  | 'TICKET_STAFF_REPLY'
  | 'TICKET_MENTION'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_UNASSIGNED'
  | 'TICKET_CLOSED'
  | 'TICKET_REOPENED';

export type TicketStatus = 'NEW' | 'OPEN' | 'PENDING' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED';

export interface AppNotification {
  id: number;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
  actorId?: number | null;
  actorName?: string | null;
  ticketId?: number | null;
  ticketPublicNumber?: string | null;
  ticketSubject?: string | null;
  statusFrom?: TicketStatus | null;
  statusTo?: TicketStatus | null;
}

export interface PagedNotifications {
  content: AppNotification[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);

  private unreadCountSubject = new BehaviorSubject<number>(0);
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  readonly notifications$ = this.notificationsSubject.asObservable();

  private pollingStarted = false;

  startPolling(intervalMs = 45000): void {
    if (this.pollingStarted) {
      return;
    }
    this.pollingStarted = true;
    interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.refresh().pipe(catchError(() => of(null))))
    ).subscribe();
  }

  refresh(): Observable<void> {
    return this.list(0, 15).pipe(
      tap((page) => this.notificationsSubject.next(page.content ?? [])),
      switchMap(() => this.fetchUnreadCount()),
      switchMap(() => of(void 0))
    );
  }

  list(page = 0, size = 20, unreadOnly = false): Observable<PagedNotifications> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (unreadOnly) {
      params = params.set('unreadOnly', 'true');
    }
    return this.http.get<PagedNotifications>(`${this.API_URL}/notifications`, { params });
  }

  fetchUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.API_URL}/notifications/unread-count`).pipe(
      tap((res) => this.unreadCountSubject.next(res.count ?? 0)),
      switchMap((res) => of(res.count ?? 0))
    );
  }

  markRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.API_URL}/notifications/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.notificationsSubject.getValue();
        this.notificationsSubject.next(
          current.map((item) => item.id === id ? { ...item, read: true } : item)
        );
        const unread = Math.max(0, this.unreadCountSubject.getValue() - 1);
        this.unreadCountSubject.next(unread);
      })
    );
  }

  markAllRead(): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${this.API_URL}/notifications/mark-all-read`, {}).pipe(
      tap(() => {
        const current = this.notificationsSubject.getValue();
        this.notificationsSubject.next(current.map((item) => ({ ...item, read: true })));
        this.unreadCountSubject.next(0);
      })
    );
  }

  messageText(notif: AppNotification): string {
    const key = `notifications.types.${notif.type}`;
    const actor = notif.actorName || this.translate.instant('notifications.someone');
    const ticketNumber = notif.ticketPublicNumber || `#${notif.ticketId ?? ''}`;
    const statusFrom = notif.statusFrom
      ? this.translate.instant(`tickets.statuses.${notif.statusFrom}`)
      : '';
    const statusTo = notif.statusTo
      ? this.translate.instant(`tickets.statuses.${notif.statusTo}`)
      : '';
    return this.translate.instant(key, {
      actor,
      ticketNumber,
      subject: notif.ticketSubject || '',
      statusFrom,
      statusTo
    });
  }

  iconName(type: NotificationType): string {
    switch (type) {
      case 'TICKET_CREATED':
        return 'confirmation_number';
      case 'TICKET_CUSTOMER_REPLY':
      case 'TICKET_STAFF_REPLY':
        return 'chat';
      case 'TICKET_MENTION':
        return 'alternate_email';
      case 'TICKET_STATUS_CHANGED':
        return 'sync_alt';
      case 'TICKET_ASSIGNED':
        return 'person_add';
      case 'TICKET_UNASSIGNED':
        return 'person_remove';
      case 'TICKET_CLOSED':
        return 'lock';
      case 'TICKET_REOPENED':
        return 'lock_open';
      default:
        return 'notifications';
    }
  }

  iconColor(type: NotificationType): string {
    switch (type) {
      case 'TICKET_CREATED':
        return 'var(--info)';
      case 'TICKET_MENTION':
        return 'var(--accent)';
      case 'TICKET_CLOSED':
        return 'var(--text-muted)';
      case 'TICKET_REOPENED':
        return 'var(--success)';
      default:
        return 'var(--warning)';
    }
  }

  relativeTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) {
      return this.translate.instant('notifications.time.justNow');
    }
    if (minutes < 60) {
      return this.translate.instant('notifications.time.minutesAgo', { count: minutes });
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return this.translate.instant('notifications.time.hoursAgo', { count: hours });
    }
    const days = Math.floor(hours / 24);
    return this.translate.instant('notifications.time.daysAgo', { count: days });
  }

  ticketRoute(notif: AppNotification): string[] | null {
    if (!notif.ticketId) {
      return null;
    }
    const isAdmin = this.authService.isAdmin();
    return isAdmin
      ? ['/admin/tickets', String(notif.ticketId)]
      : ['/tickets/mine', String(notif.ticketId)];
  }

  reset(): void {
    this.pollingStarted = false;
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }
}
