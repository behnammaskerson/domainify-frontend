import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ApiErrorService } from '../../services/api-error.service';
import { AppNotification, NotificationService } from '../../services/notification.service';

type ReadFilter = 'ALL' | 'UNREAD';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'notifications.page.eyebrow' | translate"
        [title]="'notifications.page.title' | translate"
        [subtitle]="'notifications.page.subtitle' | translate">
        <div heroActions>
          @if (unreadCount > 0) {
            <button mat-stroked-button type="button" (click)="markAllRead()" [disabled]="loading || markingAll">
              <mat-icon>done_all</mat-icon>
              {{ 'notifications.markAllRead' | translate }}
            </button>
          }
          <button mat-stroked-button type="button" (click)="reload()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            {{ 'notifications.page.refresh' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <div class="filter-bar panel-surface">
          <div class="filter-tabs" role="tablist" [attr.aria-label]="'notifications.page.filterLabel' | translate">
            @for (tab of filterTabs; track tab) {
              <button type="button"
                      class="filter-tab"
                      role="tab"
                      [class.active]="readFilter === tab"
                      [attr.aria-selected]="readFilter === tab"
                      (click)="setFilter(tab)">
                {{ filterLabel(tab) }}
                @if (tab === 'UNREAD' && unreadCount > 0) {
                  <span class="filter-badge">{{ unreadCount }}</span>
                }
              </button>
            }
          </div>
        </div>

        <div class="list-panel panel-surface">
          @if (loading) {
            <div class="state-panel">
              <mat-progress-spinner diameter="36" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
            </div>
          } @else if (notifications.length === 0) {
            <div class="state-panel empty">
              <mat-icon>notifications_none</mat-icon>
              <p>{{ emptyMessage() }}</p>
            </div>
          } @else {
            <ul class="notification-list">
              @for (notif of notifications; track notif.id) {
                <li>
                  <button type="button"
                          class="notification-row"
                          [class.unread]="!notif.read"
                          (click)="openNotification(notif)">
                    <span class="icon-wrap" [style.color]="notificationService.iconColor(notif.type)">
                      <mat-icon>{{ notificationService.iconName(notif.type) }}</mat-icon>
                    </span>
                    <span class="copy">
                      <span class="message">{{ notificationService.messageText(notif) }}</span>
                      @if (notif.ticketSubject) {
                        <span class="subject">{{ notif.ticketSubject }}</span>
                      }
                      <span class="meta">
                        <span>{{ notificationService.relativeTime(notif.createdAt) }}</span>
                        @if (notif.ticketPublicNumber) {
                          <span class="dot" aria-hidden="true">·</span>
                          <span dir="ltr">{{ notif.ticketPublicNumber }}</span>
                        }
                      </span>
                    </span>
                    @if (!notif.read) {
                      <span class="unread-dot" aria-hidden="true"></span>
                    }
                    <mat-icon class="chevron" aria-hidden="true">chevron_right</mat-icon>
                  </button>
                </li>
              }
            </ul>

            <mat-paginator
              [length]="totalElements"
              [pageIndex]="pageIndex"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 20, 50]"
              [showFirstLastButtons]="true"
              (page)="onPage($event)">
            </mat-paginator>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .filter-bar {
      padding: 10px;
    }

    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filter-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: transparent;
      color: var(--text-secondary);
      padding: 8px 14px;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
    }

    .filter-tab:hover,
    .filter-tab.active {
      color: var(--accent-dark);
      border-color: color-mix(in srgb, var(--accent) 35%, var(--border-color));
      background: var(--accent-light);
    }

    :host-context(body.dark-theme) .filter-tab.active {
      color: var(--accent);
    }

    .filter-badge {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--danger);
      color: #fff;
      font-size: 0.68rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .list-panel {
      overflow: hidden;
    }

    .state-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 240px;
      padding: 32px 20px;
      color: var(--text-muted);
    }

    .state-panel.empty mat-icon {
      font-size: 42px;
      width: 42px;
      height: 42px;
      opacity: 0.55;
    }

    .state-panel.empty p {
      margin: 0;
      font-size: 0.92rem;
      text-align: center;
    }

    .notification-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .notification-row {
      width: 100%;
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
      border: none;
      border-bottom: 1px solid var(--border-color);
      background: transparent;
      color: inherit;
      text-align: start;
      cursor: pointer;
      transition: background 0.18s ease;
    }

    .notification-row:hover {
      background: var(--bg-secondary);
    }

    .notification-row.unread {
      background: color-mix(in srgb, var(--accent) 6%, transparent);
    }

    .icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--bg-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .message {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .subject {
      font-size: 0.82rem;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
    }

    .chevron {
      color: var(--text-muted);
      flex-shrink: 0;
    }

    :host-context([dir='rtl']) .chevron {
      transform: scaleX(-1);
    }

    @media (max-width: 640px) {
      .notification-row {
        grid-template-columns: auto 1fr auto;
        gap: 12px;
      }

      .chevron {
        display: none;
      }
    }
  `]
})
export class NotificationsPageComponent implements OnInit {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly apiError = inject(ApiErrorService);

  readonly filterTabs: ReadFilter[] = ['ALL', 'UNREAD'];

  notifications: AppNotification[] = [];
  loading = false;
  markingAll = false;
  unreadCount = 0;
  readFilter: ReadFilter = 'ALL';
  pageIndex = 0;
  pageSize = 20;
  totalElements = 0;

  ngOnInit(): void {
    this.notificationService.fetchUnreadCount().subscribe((count) => {
      this.unreadCount = count;
    });
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.notificationService.list(this.pageIndex, this.pageSize, this.readFilter === 'UNREAD').subscribe({
      next: (page) => {
        this.loading = false;
        this.notifications = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
        this.pageIndex = page.number ?? 0;
        this.pageSize = page.size ?? this.pageSize;
      },
      error: (error) => {
        this.loading = false;
        this.showError(error);
      }
    });
  }

  setFilter(filter: ReadFilter): void {
    if (this.readFilter === filter) {
      return;
    }
    this.readFilter = filter;
    this.pageIndex = 0;
    this.reload();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.reload();
  }

  markAllRead(): void {
    this.markingAll = true;
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.markingAll = false;
        this.unreadCount = 0;
        this.reload();
        this.snackBar.open(
          this.translate.instant('notifications.page.allMarkedRead'),
          this.translate.instant('common.close'),
          { duration: 3000 }
        );
      },
      error: (error) => {
        this.markingAll = false;
        this.showError(error);
      }
    });
  }

  openNotification(notif: AppNotification): void {
    const markAndNavigate = () => {
      const route = this.notificationService.ticketRoute(notif);
      if (route) {
        this.router.navigate(route);
      }
    };

    if (notif.read) {
      markAndNavigate();
      return;
    }

    this.notificationService.markRead(notif.id).subscribe({
      next: () => {
        notif.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        if (this.readFilter === 'UNREAD') {
          this.reload();
        }
        markAndNavigate();
      },
      error: () => markAndNavigate()
    });
  }

  filterLabel(tab: ReadFilter): string {
    return this.translate.instant(tab === 'ALL'
      ? 'notifications.page.filterAll'
      : 'notifications.page.filterUnread');
  }

  emptyMessage(): string {
    return this.translate.instant(this.readFilter === 'UNREAD'
      ? 'notifications.page.emptyUnread'
      : 'notifications.empty');
  }

  private showError(error: unknown): void {
    const message = this.apiError.resolve(error) || this.translate.instant('errors.UNEXPECTED_ERROR');
    this.snackBar.open(message, this.translate.instant('common.close'), {
      duration: 4000,
      panelClass: ['error-snackbar']
    });
  }
}
