import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { DatetimeFilterFieldComponent } from '../../components/datetime-filter-field/datetime-filter-field.component';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleDatePipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { AuthService } from '../../services/auth.service';
import {
  Ticket,
  TicketAssigneeOption,
  TicketCategory,
  TicketInboxView,
  TicketPriority,
  TicketQueue,
  TicketService,
  TicketStatus,
  TicketTag
} from '../../services/ticket.service';
import { UsersService } from '../../services/users.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

const UNASSIGNED_VALUE = '__unassigned__';

@Component({
  selector: 'app-admin-tickets-inbox',
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
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent,
    LocaleDatePipe,
    LocaleDigitsPipe,
    DatetimeFilterFieldComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.adminInbox.eyebrow' | translate"
        [title]="'tickets.adminInbox.title' | translate"
        [subtitle]="'tickets.adminInbox.subtitle' | translate">
        <div heroActions>
          <button mat-stroked-button
                  type="button"
                  class="presence-btn"
                  [class.away]="!ticketAvailable"
                  [disabled]="ticketAvailabilitySaving"
                  (click)="toggleTicketAvailability()"
                  [matTooltip]="'tickets.adminInbox.presenceHint' | translate">
            <mat-icon>{{ ticketAvailable ? 'check_circle' : 'do_not_disturb_on' }}</mat-icon>
            {{ (ticketAvailable ? 'tickets.adminInbox.presenceAvailable' : 'tickets.adminInbox.presenceAway') | translate }}
          </button>
          <button mat-stroked-button type="button" (click)="reload()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            {{ 'tickets.adminInbox.refresh' | translate }}
          </button>
        </div>
      </app-page-hero>

      <mat-sidenav-container class="inbox-shell">
        <mat-sidenav #filterNav
                     class="filters-sidenav"
                     mode="over"
                     position="end"
                     [autoFocus]="false"
                     [attr.aria-label]="'tickets.adminInbox.filters.title' | translate">
          <div class="filters-sidenav-inner">
            <header class="filters-sidenav-header">
              <div class="filters-heading">
                <mat-icon class="filters-heading-icon" aria-hidden="true">tune</mat-icon>
                <div class="filters-heading-copy">
                  <h2 class="filters-title">{{ 'tickets.adminInbox.filters.title' | translate }}</h2>
                  @if (activeFilterCount > 0) {
                    <span class="filters-active-count">
                      {{ 'tickets.adminInbox.filters.activeCount' | translate:{ count: (activeFilterCount | localeDigits) } }}
                    </span>
                  }
                </div>
              </div>
              <button mat-icon-button type="button"
                      [attr.aria-label]="'common.close' | translate"
                      (click)="filterNav.close()">
                <mat-icon>close</mat-icon>
              </button>
            </header>

            <div class="filters-body">
              <div class="filter-section">
                <p class="filter-section-label">{{ 'tickets.adminInbox.filters.ticket' | translate }}</p>
                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.status' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterStatus" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (status of statuses; track status) {
                      <mat-option [value]="status">{{ ('tickets.statuses.' + status) | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.priority' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterPriority" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (priority of priorities; track priority) {
                      <mat-option [value]="priority">{{ ('tickets.priorities.' + priority) | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.category' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterCategoryId" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (category of categories; track category.id) {
                      <mat-option [value]="category.id">{{ category.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.queue' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterQueueId" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (queue of queues; track queue.id) {
                      <mat-option [value]="queue.id">{{ queue.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.tag' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterTagId" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (tag of tags; track tag.id) {
                      <mat-option [value]="tag.id">{{ tag.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="filter-section">
                <p class="filter-section-label">{{ 'tickets.adminInbox.filters.people' | translate }}</p>
                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.assignee' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterAssigneeValue" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    <mat-option [value]="unassignedValue">{{ 'tickets.adminInbox.unassigned' | translate }}</mat-option>
                    @for (assignee of assignees; track assignee.id) {
                      <mat-option [value]="assignee.id">
                        {{ assignee.name || assignee.email }}
                        @if (assignee.available === false) {
                          — {{ 'tickets.agentUnavailable' | translate }}
                        }
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.customer' | translate }}</mat-label>
                  <input matInput
                         [(ngModel)]="filterCustomerInput"
                         (ngModelChange)="onCustomerInput($event)"
                         [placeholder]="'tickets.adminInbox.filters.customerPlaceholder' | translate">
                  <mat-icon matPrefix>person_search</mat-icon>
                </mat-form-field>
              </div>

              <div class="filter-section">
                <p class="filter-section-label">{{ 'tickets.adminInbox.filters.dates' | translate }}</p>
                <app-datetime-filter-field
                  [compact]="true"
                  [showClear]="true"
                  labelKey="tickets.adminInbox.filters.createdFrom"
                  [isoValue]="filterCreatedFrom"
                  (isoValueChange)="setCreatedFrom($event)">
                </app-datetime-filter-field>
                <app-datetime-filter-field
                  [compact]="true"
                  [showClear]="true"
                  labelKey="tickets.adminInbox.filters.createdTo"
                  [isoValue]="filterCreatedTo"
                  (isoValueChange)="setCreatedTo($event)">
                </app-datetime-filter-field>
              </div>
            </div>

            <footer class="filters-sidenav-footer">
              @if (activeFilterCount > 0) {
                <button mat-stroked-button type="button" class="filters-clear" (click)="clearAllFilters()">
                  <mat-icon>filter_alt_off</mat-icon>
                  {{ 'tickets.adminInbox.filters.clearAll' | translate }}
                </button>
              }
              <button mat-flat-button color="primary" type="button" class="filters-done" (click)="filterNav.close()">
                {{ 'tickets.adminInbox.filters.done' | translate }}
              </button>
            </footer>
          </div>
        </mat-sidenav>

        <mat-sidenav-content>
          <div class="page-body">
            <div class="filter-bar panel-surface">
              <div class="filter-tabs" role="tablist" [attr.aria-label]="'tickets.adminInbox.viewsLabel' | translate">
                @for (tab of inboxTabs; track tab.id) {
                  <button type="button"
                          class="filter-tab"
                          role="tab"
                          [class.active]="inboxView === tab.id"
                          [attr.aria-selected]="inboxView === tab.id"
                          (click)="setView(tab.id)">
                    {{ tab.labelKey | translate }}
                  </button>
                }
              </div>

              <div class="toolbar-end">
                <button mat-stroked-button type="button" class="filters-open-btn" (click)="filterNav.open()">
                  <mat-icon>filter_list</mat-icon>
                  {{ 'tickets.adminInbox.filters.title' | translate }}
                  @if (activeFilterCount > 0) {
                    <span class="filters-badge">{{ activeFilterCount | localeDigits }}</span>
                  }
                </button>

                <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.search' | translate }}</mat-label>
                  <input matInput
                         [(ngModel)]="searchInput"
                         (ngModelChange)="onSearchInput($event)"
                         [placeholder]="'tickets.adminInbox.searchPlaceholder' | translate">
                  <mat-icon matPrefix>search</mat-icon>
                  @if (searchInput) {
                    <button matSuffix mat-icon-button type="button" (click)="clearSearch()"
                            [attr.aria-label]="'tickets.adminInbox.clearSearch' | translate">
                      <mat-icon>close</mat-icon>
                    </button>
                  }
                </mat-form-field>
              </div>
            </div>

            <div class="panel-surface table-wrap">
              @if (loading && tickets.length === 0) {
                <p class="muted state-msg">{{ 'tickets.adminInbox.loading' | translate }}</p>
              } @else if (!loading && tickets.length === 0) {
                <div class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>{{ 'tickets.adminInbox.empty' | translate }}</p>
                </div>
              } @else {
                <div class="table-scroll">
                  <table mat-table [dataSource]="tickets" class="mat-mdc-table tickets-table"
                         [attr.aria-label]="'tickets.adminInbox.title' | translate">

                    <ng-container matColumnDef="rowNumber">
                      <th mat-header-cell *matHeaderCellDef class="col-row-num">{{ 'common.rowNumber' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket; let i = index" class="col-row-num">
                        {{ pageIndex * pageSize + i + 1 }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="publicNumber">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.id' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <a class="ticket-link" [routerLink]="['/admin/tickets', ticket.id]">
                          <code class="ticket-id" dir="ltr">{{ ticket.publicNumber || '—' }}</code>
                        </a>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="subject">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.subject' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <a class="ticket-link subject" [routerLink]="['/admin/tickets', ticket.id]" [matTooltip]="ticket.subject || ''">
                          {{ ticket.subject || '—' }}
                        </a>
                        @if (ticket.tags?.length) {
                          <div class="tag-row">
                            @for (tag of ticket.tags; track tag.id) {
                              <span class="tag-chip">{{ tag.name }}</span>
                            }
                          </div>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="requester">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.requester' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <span class="requester">{{ ticket.requesterName || ticket.requesterEmail || '—' }}</span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="queue">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.queue' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        {{ ticket.queue?.name || '—' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="assignee">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.assignee' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        @if (ticket.assigneeName || ticket.assigneeEmail) {
                          <span>{{ ticket.assigneeName || ticket.assigneeEmail }}</span>
                        } @else {
                          <span class="unassigned">{{ 'tickets.adminInbox.unassigned' | translate }}</span>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="priority">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.priority' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <span class="priority-pill" [attr.data-priority]="ticket.priority">
                          {{ ('tickets.priorities.' + ticket.priority) | translate }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.status' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <span class="status-pill" [attr.data-status]="ticket.status">
                          {{ ('tickets.statuses.' + ticket.status) | translate }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="dueAt">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.dueAt' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        @if (ticket.dueAt) {
                          <span class="due-at" [class.overdue]="ticket.overdue" dir="ltr">
                            {{ ticket.dueAt | localeDate:dateTimeFormat }}
                          </span>
                        } @else {
                          <span>—</span>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="updatedAt">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.updatedAt' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <span class="cell-datetime" dir="ltr">{{ ticket.updatedAt | localeDate:dateTimeFormat }}</span>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.overdue-row]="row.overdue"></tr>
                  </table>
                </div>

                <mat-paginator
                  [length]="totalElements"
                  [pageIndex]="pageIndex"
                  [pageSize]="pageSize"
                  [pageSizeOptions]="[10, 25, 50]"
                  [disabled]="loading"
                  (page)="onPage($event)"
                  [attr.aria-label]="'tickets.adminInbox.pagination' | translate">
                </mat-paginator>
              }
            </div>

            @if (totalElements > 0) {
              <p class="result-count muted">
                {{ 'tickets.adminInbox.resultCount' | translate:{ count: (totalElements | localeDigits) } }}
              </p>
            }
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .inbox-shell {
      min-height: 60vh;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      background: transparent;
    }

    .inbox-shell ::ng-deep .mat-drawer-backdrop.mat-drawer-shown {
      background: color-mix(in srgb, #14110d 35%, transparent);
    }

    .filters-sidenav {
      width: min(380px, 100%);
      max-width: 100%;
      background: var(--bg-primary);
      border-inline-start: 1px solid var(--border-color);
    }

    .filters-sidenav-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .filters-sidenav-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding: 18px 16px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .filters-heading {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .filters-heading-icon {
      color: var(--accent-dark, var(--primary));
    }

    .filters-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
    }

    .filters-active-count {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .filters-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 16px;
      flex: 1 1 auto;
      overflow: auto;
    }

    .filter-section-label {
      margin: 0 0 8px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .filter-control {
      width: 100%;
      margin-bottom: 8px;
    }

    .filters-sidenav-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 12px 16px 16px;
      border-top: 1px solid var(--border-color);
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

    .toolbar-end {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .filters-open-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .filters-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.35rem;
      height: 1.35rem;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--primary);
      color: #14110d;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .search-field {
      width: min(100%, 280px);
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

    .col-row-num {
      width: 48px;
      max-width: 48px;
      text-align: center;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
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
      max-width: 20rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }

    .tag-chip {
      display: inline-flex;
      padding: 1px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .requester {
      display: inline-block;
      max-width: 12rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .unassigned {
      color: var(--text-muted);
      font-style: italic;
    }

    .due-at.overdue {
      color: #dc2626;
      font-weight: 600;
    }

    .overdue-row {
      background: color-mix(in srgb, #dc2626 4%, transparent);
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

    .status-pill[data-status='NEW'] { background: color-mix(in srgb, #2563eb 12%, transparent); }
    .status-pill[data-status='OPEN'] { background: color-mix(in srgb, #0891b2 12%, transparent); }
    .status-pill[data-status='PENDING'],
    .status-pill[data-status='ON_HOLD'] { background: color-mix(in srgb, #d97706 12%, transparent); }
    .status-pill[data-status='RESOLVED'] { background: color-mix(in srgb, #16a34a 12%, transparent); }
    .status-pill[data-status='CLOSED'] { background: color-mix(in srgb, #64748b 12%, transparent); }
    .priority-pill[data-priority='URGENT'],
    .priority-pill[data-priority='HIGH'] { background: color-mix(in srgb, #dc2626 10%, transparent); }

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

    .muted { color: var(--text-muted); }
    .result-count { margin: 0; font-size: 0.85rem; }
    .presence-btn.away {
      border-color: color-mix(in srgb, var(--warning) 55%, var(--border-color));
      color: var(--warning);
    }

    @media (max-width: 720px) {
      .search-field { width: 100%; }
      .toolbar-end { width: 100%; }
    }
  `]
})
export class AdminTicketsInboxComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly unassignedValue = UNASSIGNED_VALUE;
  readonly statuses: TicketStatus[] = ['NEW', 'OPEN', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  readonly inboxTabs: { id: TicketInboxView; labelKey: string }[] = [
    { id: 'ALL', labelKey: 'tickets.adminInbox.views.all' },
    { id: 'UNASSIGNED', labelKey: 'tickets.adminInbox.views.unassigned' },
    { id: 'MINE', labelKey: 'tickets.adminInbox.views.mine' },
    { id: 'MY_QUEUE', labelKey: 'tickets.adminInbox.views.myQueue' },
    { id: 'WATCHING', labelKey: 'tickets.adminInbox.views.watching' },
    { id: 'MENTIONS', labelKey: 'tickets.adminInbox.views.mentions' },
    { id: 'OVERDUE', labelKey: 'tickets.adminInbox.views.overdue' },
    { id: 'ESCALATED', labelKey: 'tickets.adminInbox.views.escalated' },
    { id: 'ARCHIVED', labelKey: 'tickets.adminInbox.views.archived' },
    { id: 'DELETED', labelKey: 'tickets.adminInbox.views.deleted' }
  ];
  readonly displayedColumns = [
    'rowNumber', 'publicNumber', 'subject', 'requester', 'queue', 'assignee', 'priority', 'status', 'dueAt', 'updatedAt'
  ];
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;

  tickets: Ticket[] = [];
  categories: TicketCategory[] = [];
  queues: TicketQueue[] = [];
  assignees: TicketAssigneeOption[] = [];
  tags: TicketTag[] = [];
  loading = false;
  ticketAvailable = true;
  ticketAvailabilitySaving = false;
  inboxView: TicketInboxView = 'ALL';
  searchInput = '';
  searchQuery = '';
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  filterStatus: TicketStatus | '' = '';
  filterPriority: TicketPriority | '' = '';
  filterCategoryId: number | '' = '';
  filterQueueId: number | '' = '';
  filterTagId: number | '' = '';
  filterAssigneeValue: number | typeof UNASSIGNED_VALUE | '' = '';
  filterCustomerInput = '';
  filterCustomer = '';
  filterCreatedFrom = '';
  filterCreatedTo = '';

  private readonly search$ = new Subject<string>();
  private readonly customer$ = new Subject<string>();
  private searchSub?: Subscription;
  private customerSub?: Subscription;
  private loadSub?: Subscription;
  private querySub?: Subscription;

  get activeFilterCount(): number {
    let count = 0;
    if (this.filterStatus) count++;
    if (this.filterPriority) count++;
    if (this.filterCategoryId !== '') count++;
    if (this.filterQueueId !== '') count++;
    if (this.filterTagId !== '') count++;
    if (this.filterAssigneeValue !== '') count++;
    if (this.filterCustomer.trim()) count++;
    if (this.filterCreatedFrom) count++;
    if (this.filterCreatedTo) count++;
    return count;
  }

  ngOnInit(): void {
    this.authService.refreshCurrentUser().subscribe({
      next: (user) => { this.ticketAvailable = user.ticketAvailable !== false; },
      error: () => { this.ticketAvailable = true; }
    });
    this.ticketService.listAllCategories().subscribe({
      next: (categories) => { this.categories = categories ?? []; },
      error: () => { this.categories = []; }
    });
    this.ticketService.listAllQueues().subscribe({
      next: (queues) => { this.queues = (queues ?? []).filter((q) => q.active); },
      error: () => { this.queues = []; }
    });
    this.ticketService.listAdminAssignees().subscribe({
      next: (assignees) => { this.assignees = assignees ?? []; },
      error: () => { this.assignees = []; }
    });
    this.ticketService.listAdminTags().subscribe({
      next: (tags) => { this.tags = tags ?? []; },
      error: () => { this.tags = []; }
    });

    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const view = (params.get('view') ?? 'ALL').toUpperCase() as TicketInboxView;
      this.inboxView = this.inboxTabs.some((tab) => tab.id === view) ? view : 'ALL';

      const unassigned = params.get('unassigned');
      const assigneeIdRaw = params.get('assigneeId');
      if (unassigned === '1' || unassigned === 'true') {
        this.filterAssigneeValue = UNASSIGNED_VALUE;
      } else if (assigneeIdRaw && /^\d+$/.test(assigneeIdRaw)) {
        this.filterAssigneeValue = Number(assigneeIdRaw);
      } else if (params.has('assigneeId') || params.has('unassigned')) {
        this.filterAssigneeValue = '';
      }

      this.pageIndex = 0;
      this.load();
    });

    this.searchSub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.searchQuery = value.trim();
      this.pageIndex = 0;
      this.load();
    });

    this.customerSub = this.customer$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.filterCustomer = value.trim();
      this.pageIndex = 0;
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.customerSub?.unsubscribe();
    this.loadSub?.unsubscribe();
    this.querySub?.unsubscribe();
  }

  setView(view: TicketInboxView): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view.toLowerCase() },
      queryParamsHandling: 'merge'
    });
  }

  onSearchInput(value: string): void {
    this.search$.next(value ?? '');
  }

  clearSearch(): void {
    this.searchInput = '';
    this.search$.next('');
  }

  onCustomerInput(value: string): void {
    this.customer$.next(value ?? '');
  }

  onFiltersChanged(): void {
    this.pageIndex = 0;
    this.load();
  }

  setCreatedFrom(value: string | null): void {
    this.filterCreatedFrom = value ?? '';
    this.onFiltersChanged();
  }

  setCreatedTo(value: string | null): void {
    this.filterCreatedTo = value ?? '';
    this.onFiltersChanged();
  }

  clearAllFilters(): void {
    this.filterStatus = '';
    this.filterPriority = '';
    this.filterCategoryId = '';
    this.filterQueueId = '';
    this.filterTagId = '';
    this.filterAssigneeValue = '';
    this.filterCustomerInput = '';
    this.filterCustomer = '';
    this.filterCreatedFrom = '';
    this.filterCreatedTo = '';
    this.customer$.next('');
    this.onFiltersChanged();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  reload(): void {
    this.load();
  }

  toggleTicketAvailability(): void {
    if (this.ticketAvailabilitySaving) {
      return;
    }
    const next = !this.ticketAvailable;
    const previous = this.ticketAvailable;
    this.ticketAvailable = next;
    this.ticketAvailabilitySaving = true;
    this.usersService.setTicketAvailable(next).subscribe({
      next: (user) => {
        this.ticketAvailabilitySaving = false;
        this.ticketAvailable = user.ticketAvailable !== false;
        this.authService.setCurrentUser(user);
        this.snackBar.open(
          this.translate.instant(
            next ? 'settings.ticketAvailabilityEnabled' : 'settings.ticketAvailabilityDisabled'
          ),
          undefined,
          { duration: 2500 }
        );
      },
      error: (error) => {
        this.ticketAvailabilitySaving = false;
        this.ticketAvailable = previous;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 4000 });
      }
    });
  }

  private load(): void {
    this.loading = true;
    this.loadSub?.unsubscribe();
    this.loadSub = this.ticketService.listAdminInbox({
      view: this.inboxView,
      q: this.searchQuery || undefined,
      status: this.filterStatus || undefined,
      priority: this.filterPriority || undefined,
      categoryId: this.filterCategoryId === '' ? undefined : Number(this.filterCategoryId),
      queueId: this.filterQueueId === '' ? undefined : Number(this.filterQueueId),
      tagId: this.filterTagId === '' ? undefined : Number(this.filterTagId),
      unassigned: this.filterAssigneeValue === UNASSIGNED_VALUE || undefined,
      assigneeId: typeof this.filterAssigneeValue === 'number' ? this.filterAssigneeValue : undefined,
      customer: this.filterCustomer || undefined,
      createdFrom: this.filterCreatedFrom || undefined,
      createdTo: this.filterCreatedTo || undefined,
      page: this.pageIndex,
      size: this.pageSize,
      sort: 'updatedAt,desc'
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
