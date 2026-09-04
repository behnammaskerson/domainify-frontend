import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { DatetimeFilterFieldComponent } from '../../components/datetime-filter-field/datetime-filter-field.component';
import { ApiErrorService } from '../../services/api-error.service';
import {
  ScheduledSmsSourceType,
  ScheduledSmsStatus,
  SmsScheduledItem,
  SmsService
} from '../../services/sms.service';
import { SmsProviderResult } from '../../services/sms-config.service';
import { LocaleDatePipe, LocaleDigitsPipe, LocaleNumberPipe } from '../../pipes/locale-format.pipe';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

type StatusFilter = 'all' | ScheduledSmsStatus;
type SourceFilter = 'all' | ScheduledSmsSourceType;

@Component({
  selector: 'app-scheduled-sms',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule,
    PageHeroComponent,
    DatetimeFilterFieldComponent,
    LocaleDatePipe,
    LocaleDigitsPipe,
    LocaleNumberPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'sms.scheduled.eyebrow' | translate"
        [title]="'sms.scheduled.title' | translate"
        [subtitle]="'sms.scheduled.subtitle' | translate">
        <div heroActions>
          <button mat-stroked-button type="button" (click)="loadItems()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.scheduled.refresh' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <div class="filter-bar">
          <div class="filter-tabs">
            @for (filter of statusFilters; track filter.value) {
              <button type="button"
                      class="filter-tab"
                      [class.active]="activeFilter === filter.value"
                      (click)="setStatusFilter(filter.value)">
                {{ ('sms.scheduled.filters.' + filter.value) | translate }}
                <span class="count">{{ filter.count | localeNumber }}</span>
              </button>
            }
          </div>

          <div class="filter-controls">
            <mat-form-field appearance="outline" class="search-field">
              <mat-icon matPrefix>search</mat-icon>
              <input matInput
                     [placeholder]="'sms.scheduled.search' | translate"
                     [ngModel]="searchTerm"
                     (ngModelChange)="onSearchChange($event)">
            </mat-form-field>

            <mat-form-field appearance="outline" class="source-field">
              <mat-label>{{ 'sms.scheduled.table.source' | translate }}</mat-label>
              <mat-select [ngModel]="activeSource" (ngModelChange)="setSourceFilter($event)">
                <mat-option value="all">{{ 'sms.scheduled.sourceFilter.all' | translate }}</mat-option>
                <mat-option value="SINGLE">{{ 'sms.scheduled.source.SINGLE' | translate }}</mat-option>
                <mat-option value="BULK">{{ 'sms.scheduled.source.BULK' | translate }}</mat-option>
                <mat-option value="FILE">{{ 'sms.scheduled.source.FILE' | translate }}</mat-option>
              </mat-select>
            </mat-form-field>

            <app-datetime-filter-field
              [compact]="true"
              [showClear]="true"
              labelKey="sms.scheduled.scheduledFrom"
              [isoValue]="scheduledFrom"
              (isoValueChange)="setScheduledFrom($event)">
            </app-datetime-filter-field>

            <app-datetime-filter-field
              [compact]="true"
              [showClear]="true"
              labelKey="sms.scheduled.scheduledTo"
              [isoValue]="scheduledTo"
              (isoValueChange)="setScheduledTo($event)">
            </app-datetime-filter-field>

            @if (hasActiveFilters) {
              <button mat-stroked-button type="button" class="clear-filters" (click)="clearFilters()">
                <mat-icon>filter_alt_off</mat-icon>
                {{ 'sms.scheduled.clearFilters' | translate }}
              </button>
            }
          </div>
        </div>

        <div class="panel-surface table-wrap">
          <div class="table-scroll">
            <table mat-table
                   matSort
                   [matSortActive]="sortActive"
                   [matSortDirection]="sortDirection"
                   matSortDisableClear
                   [dataSource]="items"
                   class="mat-mdc-table users-table"
                   [attr.aria-label]="'sms.scheduled.title' | translate"
                   (matSortChange)="onSortChange($event)">

              <ng-container matColumnDef="rowNumber">
                <th mat-header-cell *matHeaderCellDef class="col-row-num">{{ 'common.rowNumber' | translate }}</th>
                <td mat-cell *matCellDef="let item; let i = index" class="col-row-num">
                  {{ pageIndex * pageSize + i + 1 }}
                </td>
              </ng-container>

              <ng-container matColumnDef="sourceType">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="sourceType">
                  {{ 'sms.scheduled.table.source' | translate }}
                </th>
                <td mat-cell *matCellDef="let item">
                  <span class="method-pill">{{ ('sms.scheduled.source.' + item.sourceType) | translate }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="packId">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="packId">
                  {{ 'sms.scheduled.table.packId' | translate }}
                </th>
                <td mat-cell *matCellDef="let item">
                  <span class="cell-muted" dir="ltr">{{ item.packId | localeDigits }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="lineNumber">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="lineNumber">
                  {{ 'sms.scheduled.table.line' | translate }}
                </th>
                <td mat-cell *matCellDef="let item">
                  <span class="cell-strong" dir="ltr">{{ item.lineNumber | localeDigits }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="recipientCount">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="recipientCount">
                  {{ 'sms.scheduled.table.recipients' | translate }}
                </th>
                <td mat-cell *matCellDef="let item">
                  <span class="cell-strong">{{ item.recipientCount | localeNumber }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="messageText">
                <th mat-header-cell *matHeaderCellDef>{{ 'sms.scheduled.table.message' | translate }}</th>
                <td mat-cell *matCellDef="let item">
                  <span class="message-preview cell-muted" [matTooltip]="item.messageText">{{ item.messageText }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="scheduledAt">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="scheduledAt">
                  {{ 'sms.scheduled.table.scheduledAt' | translate }}
                </th>
                <td mat-cell *matCellDef="let item">
                  <span class="cell-datetime" dir="ltr">
                    {{ item.scheduledAt | localeDate:smsDateTimeFormat }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="status">
                  {{ 'sms.scheduled.table.status' | translate }}
                </th>
                <td mat-cell *matCellDef="let item">
                  <span class="status-pill" [ngClass]="statusClass(item.status)">
                    {{ ('sms.scheduled.status.' + item.status) | translate }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="cost">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="cost">
                  {{ 'sms.scheduled.table.cost' | translate }}
                </th>
                <td mat-cell *matCellDef="let item">{{ item.cost ?? 0 | localeNumber }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="col-actions"></th>
                <td mat-cell *matCellDef="let item" class="col-actions">
                  <button mat-icon-button
                          type="button"
                          [matMenuTriggerFor]="actionMenu"
                          [disabled]="cancellingPackId === item.packId || deletingPackId === item.packId"
                          [matTooltip]="'a11y.actions' | translate">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #actionMenu="matMenu">
                    @if (item.status === 'PENDING') {
                      <button mat-menu-item
                              type="button"
                              [disabled]="!item.cancellable"
                              [matTooltip]="!item.cancellable ? ('sms.scheduled.cancelTooLateHint' | translate) : ''"
                              (click)="confirmCancel(item)">
                        <mat-icon>event_busy</mat-icon>
                        {{ 'sms.scheduled.cancel' | translate }}
                      </button>
                    }
                    <button mat-menu-item
                            type="button"
                            class="delete-item"
                            (click)="confirmDelete(item)">
                      <mat-icon>delete</mat-icon>
                      {{ 'sms.scheduled.delete' | translate }}
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              <tr class="mat-row empty-row" *matNoDataRow>
                <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                  <div class="empty-state">
                    {{ loading ? ('sms.scheduled.loading' | translate) : ('sms.scheduled.empty' | translate) }}
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <mat-paginator
            [length]="totalElements"
            [pageIndex]="pageIndex"
            [pageSize]="pageSize"
            [pageSizeOptions]="[5, 10, 25, 50]"
            [showFirstLastButtons]="true"
            [attr.aria-label]="'sms.scheduled.pagination' | translate"
            (page)="onPage($event)">
          </mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .page-body {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .filter-bar {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
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
      padding: 8px 14px;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: var(--bg-primary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
    }

    .filter-tab.active {
      border-color: var(--accent);
      color: var(--text-primary);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }

    .filter-tab .count {
      font-size: 0.75rem;
      opacity: 0.8;
    }

    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 12px;
    }

    .search-field {
      width: min(100%, 280px);
    }

    .source-field {
      width: min(100%, 180px);
    }

    .search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper,
    .source-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .clear-filters mat-icon {
      margin-inline-end: 6px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .message-preview {
      display: inline-block;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .col-row-num {
      width: 48px;
      max-width: 48px;
      text-align: center;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .empty-state {
      padding: 40px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.92rem;
    }

    .status-pill.sent {
      background: var(--success-light);
      color: var(--success);
      border-color: transparent;
    }

    .status-pill.cancelled {
      background: var(--danger-light);
      color: var(--danger);
      border-color: transparent;
    }

    @media (max-width: 720px) {
      .filter-controls {
        flex-direction: column;
      }

      .search-field,
      .source-field {
        width: 100%;
      }
    }
  `]
})
export class ScheduledSmsComponent implements OnInit {
  private readonly smsService = inject(SmsService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly searchChanges$ = new Subject<string>();

  readonly smsDateTimeFormat = SMS_DATETIME_FORMAT;

  loading = false;
  cancellingPackId: string | null = null;
  deletingPackId: string | null = null;
  items: SmsScheduledItem[] = [];
  activeFilter: StatusFilter = 'all';
  activeSource: SourceFilter = 'all';
  searchTerm = '';
  scheduledFrom: string | null = null;
  scheduledTo: string | null = null;

  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;
  sortActive = 'scheduledAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  allCount = 0;
  pendingCount = 0;
  cancelledCount = 0;
  sentCount = 0;

  readonly displayedColumns = [
    'rowNumber',
    'sourceType',
    'packId',
    'lineNumber',
    'recipientCount',
    'messageText',
    'scheduledAt',
    'status',
    'cost',
    'actions'
  ];

  get statusFilters(): { value: StatusFilter; count: number }[] {
    return [
      { value: 'all', count: this.allCount },
      { value: 'PENDING', count: this.pendingCount },
      { value: 'CANCELLED', count: this.cancelledCount },
      { value: 'SENT', count: this.sentCount }
    ];
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim()
      || this.activeSource !== 'all'
      || !!this.scheduledFrom
      || !!this.scheduledTo;
  }

  ngOnInit(): void {
    this.searchChanges$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((term) => {
      this.searchTerm = term;
      this.pageIndex = 0;
      this.loadItems();
    });
    this.loadItems();
  }

  statusClass(status: ScheduledSmsStatus): string {
    if (status === 'SENT') {
      return 'sent';
    }
    if (status === 'CANCELLED') {
      return 'cancelled';
    }
    return 'pending';
  }

  setStatusFilter(filter: StatusFilter): void {
    this.activeFilter = filter;
    this.pageIndex = 0;
    this.loadItems();
  }

  setSourceFilter(source: SourceFilter): void {
    this.activeSource = source;
    this.pageIndex = 0;
    this.loadItems();
  }

  onSearchChange(value: string): void {
    this.searchChanges$.next(value);
  }

  setScheduledFrom(value: string | null): void {
    this.scheduledFrom = value;
    this.pageIndex = 0;
    this.loadItems();
  }

  setScheduledTo(value: string | null): void {
    this.scheduledTo = value;
    this.pageIndex = 0;
    this.loadItems();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.activeSource = 'all';
    this.scheduledFrom = null;
    this.scheduledTo = null;
    this.pageIndex = 0;
    this.loadItems();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadItems();
  }

  onSortChange(sort: Sort): void {
    this.sortActive = sort.active || 'scheduledAt';
    this.sortDirection = sort.direction === 'asc' ? 'asc' : 'desc';
    this.pageIndex = 0;
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.smsService.listScheduled({
      status: this.activeFilter === 'all' ? undefined : this.activeFilter,
      sourceType: this.activeSource === 'all' ? undefined : this.activeSource,
      search: this.searchTerm.trim() || undefined,
      scheduledFrom: this.scheduledFrom || undefined,
      scheduledTo: this.scheduledTo || undefined,
      page: this.pageIndex,
      size: this.pageSize,
      sort: `${this.sortActive},${this.sortDirection}`
    }).subscribe({
      next: (page) => {
        this.items = page.content;
        this.totalElements = page.totalElements;
        this.pageIndex = page.number;
        this.pageSize = page.size;
        this.allCount = page.allCount;
        this.pendingCount = page.pendingCount;
        this.cancelledCount = page.cancelledCount;
        this.sentCount = page.sentCount;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  confirmCancel(item: SmsScheduledItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      restoreFocus: true,
      data: {
        titleKey: 'sms.scheduled.cancelTitle',
        messageKey: 'sms.scheduled.cancelMessage',
        messageParams: { packId: item.packId },
        confirmKey: 'sms.scheduled.cancelConfirm',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.cancelItem(item);
      }
    });
  }

  confirmDelete(item: SmsScheduledItem): void {
    const messageKey = item.status === 'PENDING' && item.cancellable
      ? 'sms.scheduled.deleteMessagePending'
      : 'sms.scheduled.deleteMessage';

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      restoreFocus: true,
      data: {
        titleKey: 'sms.scheduled.deleteTitle',
        messageKey,
        messageParams: { packId: item.packId },
        confirmKey: 'sms.scheduled.deleteConfirm',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteItem(item);
      }
    });
  }

  private deleteItem(item: SmsScheduledItem): void {
    this.deletingPackId = item.packId;
    this.smsService.removeScheduledRecord(item.packId).subscribe({
      next: () => {
        this.deletingPackId = null;
        this.snack(this.translate.instant('sms.scheduled.deleteSuccess'));
        this.loadItems();
      },
      error: (error) => {
        this.deletingPackId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private cancelItem(item: SmsScheduledItem): void {
    this.cancellingPackId = item.packId;
    this.smsService.cancelScheduled(item.packId).subscribe({
      next: (result) => {
        this.cancellingPackId = null;
        if (result.success) {
          this.snack(this.translate.instant('sms.scheduled.cancelSuccess', {
            credit: result.returnedCreditCount ?? 0,
            smsCount: result.smsCount ?? 0
          }));
          this.loadItems();
          return;
        }
        this.showError(this.resolveProviderMessage(result, 'sms.scheduled.cancelFailed'));
      },
      error: (error) => {
        this.cancellingPackId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private resolveProviderMessage(result: SmsProviderResult, fallbackKey: string): string {
    if (result.providerStatus != null) {
      const key = `errors.SMS_PROVIDER_${result.providerStatus}`;
      const translated = this.translate.instant(key);
      if (translated !== key) {
        return translated;
      }
    }
    return this.translate.instant(fallbackKey);
  }

  private snack(message: string): void {
    this.snackBar.open(message, undefined, { duration: 4000 });
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
