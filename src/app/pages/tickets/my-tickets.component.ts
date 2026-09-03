import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketPortalNavComponent } from '../../components/ticket-portal-nav/ticket-portal-nav.component';
import { LocaleDatePipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import {
  Ticket,
  TicketService,
  TicketStatus
} from '../../services/ticket.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

type StatusFilter = 'ALL' | TicketStatus;

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent,
    TicketPortalNavComponent,
    LocaleDatePipe,
    LocaleDigitsPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.portal.eyebrow' | translate"
        [title]="'tickets.mine.title' | translate"
        [subtitle]="'tickets.mine.subtitle' | translate">
        <div heroActions>
          <a mat-flat-button color="primary" routerLink="/tickets/new">
            <mat-icon>add</mat-icon>
            {{ 'tickets.mine.create' | translate }}
          </a>
          <button mat-stroked-button type="button" (click)="reload()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            {{ 'tickets.mine.refresh' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <app-ticket-portal-nav active="mine"></app-ticket-portal-nav>
        <div class="filter-bar panel-surface">
          <div class="filter-tabs" role="tablist" [attr.aria-label]="'tickets.mine.statusFilter' | translate">
            @for (tab of statusTabs; track tab) {
              <button type="button"
                      class="filter-tab"
                      role="tab"
                      [class.active]="statusFilter === tab"
                      [attr.aria-selected]="statusFilter === tab"
                      (click)="setStatus(tab)">
                {{ statusLabel(tab) }}
              </button>
            }
          </div>

          <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
            <mat-label>{{ 'tickets.mine.search' | translate }}</mat-label>
            <input matInput
                   [(ngModel)]="searchInput"
                   (ngModelChange)="onSearchInput($event)"
                   [placeholder]="'tickets.mine.searchPlaceholder' | translate">
            <mat-icon matPrefix>search</mat-icon>
            @if (searchInput) {
              <button matSuffix mat-icon-button type="button" (click)="clearSearch()"
                      [attr.aria-label]="'tickets.mine.clearSearch' | translate">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>
        </div>

        <div class="panel-surface table-wrap">
          @if (loading && tickets.length === 0) {
            <p class="muted state-msg">{{ 'tickets.mine.loading' | translate }}</p>
          } @else if (!loading && tickets.length === 0) {
            <div class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>{{ 'tickets.mine.empty' | translate }}</p>
              <a mat-stroked-button routerLink="/tickets/new">
                {{ 'tickets.mine.create' | translate }}
              </a>
            </div>
          } @else {
            <div class="table-scroll">
              <table mat-table [dataSource]="tickets" class="mat-mdc-table tickets-table"
                     [attr.aria-label]="'tickets.mine.title' | translate">

                <ng-container matColumnDef="publicNumber">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.mine.table.id' | translate }}</th>
                  <td mat-cell *matCellDef="let ticket">
                    <a class="ticket-link" [routerLink]="['/tickets/mine', ticket.id]">
                      <code class="ticket-id" dir="ltr">{{ ticket.publicNumber || '—' }}</code>
                    </a>
                  </td>
                </ng-container>

                <ng-container matColumnDef="subject">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.mine.table.subject' | translate }}</th>
                  <td mat-cell *matCellDef="let ticket">
                    <a class="ticket-link subject" [routerLink]="['/tickets/mine', ticket.id]" [matTooltip]="ticket.subject || ''">
                      {{ ticket.subject || '—' }}
                    </a>
                  </td>
                </ng-container>

                <ng-container matColumnDef="category">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.mine.table.category' | translate }}</th>
                  <td mat-cell *matCellDef="let ticket">
                    {{ ticket.category?.name || '—' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="priority">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.mine.table.priority' | translate }}</th>
                  <td mat-cell *matCellDef="let ticket">
                    <span class="priority-pill" [attr.data-priority]="ticket.priority">
                      {{ ('tickets.priorities.' + ticket.priority) | translate }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.mine.table.status' | translate }}</th>
                  <td mat-cell *matCellDef="let ticket">
                    <span class="status-pill" [attr.data-status]="ticket.status">
                      {{ ('tickets.statuses.' + ticket.status) | translate }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.mine.table.createdAt' | translate }}</th>
                  <td mat-cell *matCellDef="let ticket">
                    <span class="cell-datetime" dir="ltr">{{ ticket.createdAt | localeDate:dateTimeFormat }}</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>

            <mat-paginator
              [length]="totalElements"
              [pageIndex]="pageIndex"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 25, 50]"
              [disabled]="loading"
              (page)="onPage($event)"
              [attr.aria-label]="'tickets.mine.pagination' | translate">
            </mat-paginator>
          }
        </div>

        @if (totalElements > 0) {
          <p class="result-count muted">
            {{ 'tickets.mine.resultCount' | translate:{ count: (totalElements | localeDigits) } }}
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .page-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 16px;
      padding: 14px 16px;
    }

    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      flex: 1 1 auto;
    }

    .filter-tab {
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-muted);
      border-radius: 999px;
      padding: 6px 12px;
      font: inherit;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .filter-tab.active {
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      border-color: color-mix(in srgb, var(--primary) 45%, var(--border-color));
      color: var(--text-primary);
      font-weight: 600;
    }

    .search-field {
      width: min(100%, 320px);
      flex: 0 1 320px;
    }

    .table-wrap {
      overflow: hidden;
      max-width: 100%;
      min-width: 0;
    }

    .table-scroll {
      overflow-x: auto;
      max-width: 100%;
    }

    .tickets-table {
      width: 100%;
      min-width: 960px;
    }

    .ticket-id {
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .ticket-link {
      color: inherit;
      text-decoration: none;
    }

    .ticket-link:hover {
      color: var(--primary);
      text-decoration: underline;
    }

    .subject {
      display: inline-block;
      max-width: 28rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-pill,
    .priority-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      white-space: nowrap;
    }

    .status-pill[data-status='NEW'] {
      background: color-mix(in srgb, #2563eb 12%, transparent);
      border-color: color-mix(in srgb, #2563eb 35%, var(--border-color));
    }

    .status-pill[data-status='OPEN'] {
      background: color-mix(in srgb, #0891b2 12%, transparent);
      border-color: color-mix(in srgb, #0891b2 35%, var(--border-color));
    }

    .status-pill[data-status='PENDING'],
    .status-pill[data-status='ON_HOLD'] {
      background: color-mix(in srgb, #d97706 12%, transparent);
      border-color: color-mix(in srgb, #d97706 35%, var(--border-color));
    }

    .status-pill[data-status='RESOLVED'] {
      background: color-mix(in srgb, #16a34a 12%, transparent);
      border-color: color-mix(in srgb, #16a34a 35%, var(--border-color));
    }

    .status-pill[data-status='CLOSED'] {
      background: color-mix(in srgb, #64748b 12%, transparent);
      border-color: color-mix(in srgb, #64748b 35%, var(--border-color));
    }

    .priority-pill[data-priority='URGENT'],
    .priority-pill[data-priority='HIGH'] {
      background: color-mix(in srgb, #dc2626 10%, transparent);
      border-color: color-mix(in srgb, #dc2626 30%, var(--border-color));
    }

    .cell-datetime {
      white-space: nowrap;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .empty-state,
    .state-msg {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 48px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-state mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.7;
    }

    .muted {
      color: var(--text-muted);
    }

    .result-count {
      margin: 0;
      font-size: 0.85rem;
    }

    @media (max-width: 720px) {
      .search-field {
        width: 100%;
        flex: 1 1 100%;
      }

      .subject {
        max-width: 12rem;
      }
    }
  `]
})
export class MyTicketsComponent implements OnInit, OnDestroy {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly statusTabs: StatusFilter[] = [
    'ALL', 'NEW', 'OPEN', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'
  ];
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;
  readonly displayedColumns = [
    'publicNumber', 'subject', 'category', 'priority', 'status', 'createdAt'
  ];

  tickets: Ticket[] = [];
  loading = false;
  statusFilter: StatusFilter = 'ALL';
  searchInput = '';
  searchQuery = '';
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  private loadSub?: Subscription;

  ngOnInit(): void {
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((value) => {
      this.searchQuery = value.trim();
      this.pageIndex = 0;
      this.load();
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  setStatus(status: StatusFilter): void {
    if (this.statusFilter === status) {
      return;
    }
    this.statusFilter = status;
    this.pageIndex = 0;
    this.load();
  }

  onSearchInput(value: string): void {
    this.search$.next(value ?? '');
  }

  clearSearch(): void {
    this.searchInput = '';
    this.search$.next('');
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  reload(): void {
    this.load();
  }

  statusLabel(status: StatusFilter): string {
    if (status === 'ALL') {
      return this.translate.instant('tickets.mine.allStatuses');
    }
    return this.translate.instant('tickets.statuses.' + status);
  }

  private load(): void {
    this.loading = true;
    this.loadSub?.unsubscribe();
    this.loadSub = this.ticketService.listMine({
      status: this.statusFilter === 'ALL' ? undefined : this.statusFilter,
      q: this.searchQuery || undefined,
      page: this.pageIndex,
      size: this.pageSize,
      sort: 'createdAt,desc'
    }).subscribe({
      next: (page) => {
        this.tickets = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
        this.pageIndex = page.number ?? this.pageIndex;
        this.pageSize = page.size ?? this.pageSize;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.tickets = [];
        this.totalElements = 0;
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
