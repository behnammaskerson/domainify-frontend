import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { DatetimeFilterFieldComponent } from '../../components/datetime-filter-field/datetime-filter-field.component';
import { ApiErrorService } from '../../services/api-error.service';
import { SmsConfigService, SmsProviderResult } from '../../services/sms-config.service';
import { LocaleService } from '../../services/locale.service';
import { SmsReceivedMessage, SmsService } from '../../services/sms.service';
import { LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

type ReceiveTab = 'latest' | 'live' | 'archive';

@Component({
  selector: 'app-sms-receive-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule,
    PageHeroComponent,
    DatetimeFilterFieldComponent,
    LocaleDigitsPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'sms.receiveReports.eyebrow' | translate"
        [title]="'sms.receiveReports.title' | translate"
        [subtitle]="'sms.receiveReports.subtitle' | translate">
        <div heroActions>
          <button mat-stroked-button type="button" (click)="refreshActive()" [disabled]="activeLoading || !apiKeyConfigured">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.receiveReports.refresh' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        @if (configLoading) {
          <p class="muted">{{ 'sms.receiveReports.loading' | translate }}</p>
        } @else if (!apiKeyConfigured) {
          <div class="notice-card panel-surface">
            <mat-icon>info</mat-icon>
            <p>{{ 'sms.receiveReports.configRequired' | translate }}</p>
            <a mat-stroked-button routerLink="/settings" fragment="sms-config">
              {{ 'sms.receiveReports.openSettings' | translate }}
            </a>
          </div>
        } @else {
          <div class="filter-bar">
            <div class="filter-tabs" role="tablist" [attr.aria-label]="'sms.receiveReports.tabsLabel' | translate">
              @for (tab of tabs; track tab.id) {
                <button type="button"
                        class="filter-tab"
                        role="tab"
                        [class.active]="activeTab === tab.id"
                        [attr.aria-selected]="activeTab === tab.id"
                        (click)="setTab(tab.id)">
                  {{ tab.labelKey | translate }}
                </button>
              }
            </div>

            @if (activeTab === 'latest') {
              <div class="filter-controls">
                <mat-form-field appearance="outline" class="count-field">
                  <mat-label>{{ 'sms.receiveReports.latest.count' | translate }}</mat-label>
                  <mat-select [ngModel]="latestCount" (ngModelChange)="setLatestCount($event)">
                    @for (option of countOptions; track option) {
                      <mat-option [value]="option">{{ option | localeDigits }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <p class="hint-text">{{ 'sms.receiveReports.latest.onceHint' | translate }}</p>
            }

            @if (activeTab === 'live') {
              <div class="filter-controls">
                <mat-form-field appearance="outline" class="mobile-field">
                  <mat-icon matPrefix>phone_iphone</mat-icon>
                  <mat-label>{{ 'sms.receiveReports.filters.mobile' | translate }}</mat-label>
                  <input matInput
                         [ngModel]="liveMobile"
                         (ngModelChange)="onLiveMobileInput($event)"
                         [placeholder]="'sms.receiveReports.filters.mobilePlaceholder' | translate">
                </mat-form-field>

                <mat-form-field appearance="outline" class="sort-field">
                  <mat-label>{{ 'sms.receiveReports.live.sortByNewest' | translate }}</mat-label>
                  <mat-select [ngModel]="liveSortByNewest" (ngModelChange)="setLiveSort($event)">
                    <mat-option [value]="false">{{ 'sms.receiveReports.live.sortOldest' | translate }}</mat-option>
                    <mat-option [value]="true">{{ 'sms.receiveReports.live.sortNewest' | translate }}</mat-option>
                  </mat-select>
                </mat-form-field>

                @if (liveHasActiveFilters) {
                  <button mat-stroked-button type="button" class="clear-filters" (click)="clearLiveFilters()">
                    <mat-icon>filter_alt_off</mat-icon>
                    {{ 'sms.receiveReports.clearFilters' | translate }}
                  </button>
                }
              </div>
            }

            @if (activeTab === 'archive') {
              <div class="filter-controls">
                <app-datetime-filter-field
                  [compact]="true"
                  [showClear]="true"
                  [maxDate]="maxFilterDate"
                  labelKey="sms.receiveReports.archive.fromDate"
                  [isoValue]="archiveFromDateIso"
                  (isoValueChange)="setArchiveFromDate($event)">
                </app-datetime-filter-field>

                <app-datetime-filter-field
                  [compact]="true"
                  [showClear]="true"
                  [maxDate]="maxFilterDate"
                  labelKey="sms.receiveReports.archive.toDate"
                  [isoValue]="archiveToDateIso"
                  (isoValueChange)="setArchiveToDate($event)">
                </app-datetime-filter-field>

                <mat-form-field appearance="outline" class="mobile-field">
                  <mat-icon matPrefix>phone_iphone</mat-icon>
                  <mat-label>{{ 'sms.receiveReports.filters.mobile' | translate }}</mat-label>
                  <input matInput
                         [ngModel]="archiveMobile"
                         (ngModelChange)="onArchiveMobileInput($event)"
                         [placeholder]="'sms.receiveReports.filters.mobilePlaceholder' | translate">
                </mat-form-field>

                @if (archiveHasActiveFilters) {
                  <button mat-stroked-button type="button" class="clear-filters" (click)="clearArchiveFilters()">
                    <mat-icon>filter_alt_off</mat-icon>
                    {{ 'sms.receiveReports.clearFilters' | translate }}
                  </button>
                }
              </div>
            }
          </div>

          @if (activeTab === 'latest') {
            <div class="panel-surface table-wrap">
              <div class="table-scroll">
                <table mat-table
                       [dataSource]="latestItems"
                       class="mat-mdc-table users-table"
                       [attr.aria-label]="'sms.receiveReports.tabs.latest' | translate">

                  <ng-container matColumnDef="receiveReturnId">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.receiveReturnId' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-muted" dir="ltr">
                        {{ item.receiveReturnId != null ? (item.receiveReturnId | localeDigits) : '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="mobile">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.mobile' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-strong" dir="ltr">{{ formatMobile(item.mobile) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="messageText">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.messageText' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="message-preview cell-muted" [matTooltip]="item.messageText || ''">
                        {{ item.messageText || '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="number">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.number' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span dir="ltr">{{ item.number != null ? (item.number | localeDigits) : '—' }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="receivedDateTime">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.receivedDateTime' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.receivedDateTime) }}</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="latestColumns; sticky: true"></tr>
                  <tr mat-row *matRowDef="let row; columns: latestColumns;"></tr>
                  <tr class="mat-row empty-row" *matNoDataRow>
                    <td class="mat-cell" [attr.colspan]="latestColumns.length">
                      <div class="empty-state">
                        {{ latestLoading
                          ? ('sms.receiveReports.latest.loadingList' | translate)
                          : ('sms.receiveReports.latest.empty' | translate) }}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          }

          @if (activeTab === 'live') {
            <div class="panel-surface table-wrap">
              <div class="table-scroll">
                <table mat-table
                       [dataSource]="liveItems"
                       class="mat-mdc-table users-table"
                       [attr.aria-label]="'sms.receiveReports.tabs.live' | translate">

                  <ng-container matColumnDef="mobile">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.mobile' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-strong" dir="ltr">{{ formatMobile(item.mobile) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="messageText">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.messageText' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="message-preview cell-muted" [matTooltip]="item.messageText || ''">
                        {{ item.messageText || '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="number">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.number' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span dir="ltr">{{ item.number != null ? (item.number | localeDigits) : '—' }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="receivedDateTime">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.receivedDateTime' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.receivedDateTime) }}</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="liveColumns; sticky: true"></tr>
                  <tr mat-row *matRowDef="let row; columns: liveColumns;"></tr>
                  <tr class="mat-row empty-row" *matNoDataRow>
                    <td class="mat-cell" [attr.colspan]="liveColumns.length">
                      <div class="empty-state">
                        {{ liveLoading
                          ? ('sms.receiveReports.live.loadingList' | translate)
                          : ('sms.receiveReports.live.empty' | translate) }}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <mat-paginator
                [length]="livePaginatorLength"
                [pageIndex]="livePageIndex"
                [pageSize]="livePageSize"
                [pageSizeOptions]="[10, 25, 50, 100]"
                [showFirstLastButtons]="false"
                [attr.aria-label]="'sms.receiveReports.live.pagination' | translate"
                (page)="onLivePage($event)">
              </mat-paginator>
            </div>
          }

          @if (activeTab === 'archive') {
            <div class="panel-surface table-wrap">
              <div class="table-scroll">
                <table mat-table
                       [dataSource]="archiveItems"
                       class="mat-mdc-table users-table"
                       [attr.aria-label]="'sms.receiveReports.tabs.archive' | translate">

                  <ng-container matColumnDef="receiveReturnId">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.receiveReturnId' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-muted" dir="ltr">
                        {{ item.receiveReturnId != null ? (item.receiveReturnId | localeDigits) : '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="mobile">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.mobile' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-strong" dir="ltr">{{ formatMobile(item.mobile) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="messageText">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.messageText' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="message-preview cell-muted" [matTooltip]="item.messageText || ''">
                        {{ item.messageText || '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="number">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.number' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span dir="ltr">{{ item.number != null ? (item.number | localeDigits) : '—' }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="receivedDateTime">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.receiveReports.table.receivedDateTime' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.receivedDateTime) }}</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="archiveColumns; sticky: true"></tr>
                  <tr mat-row *matRowDef="let row; columns: archiveColumns;"></tr>
                  <tr class="mat-row empty-row" *matNoDataRow>
                    <td class="mat-cell" [attr.colspan]="archiveColumns.length">
                      <div class="empty-state">
                        {{ archiveLoading
                          ? ('sms.receiveReports.archive.loadingList' | translate)
                          : ('sms.receiveReports.archive.empty' | translate) }}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <mat-paginator
                [length]="archivePaginatorLength"
                [pageIndex]="archivePageIndex"
                [pageSize]="archivePageSize"
                [pageSizeOptions]="[10, 25, 50, 100]"
                [showFirstLastButtons]="false"
                [attr.aria-label]="'sms.receiveReports.archive.pagination' | translate"
                (page)="onArchivePage($event)">
              </mat-paginator>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .notice-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 24px;
      color: var(--text-secondary);
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

    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 12px;
    }

    .count-field,
    .sort-field {
      width: min(100%, 180px);
    }

    .mobile-field {
      width: min(100%, 220px);
    }

    .count-field ::ng-deep .mat-mdc-form-field-subscript-wrapper,
    .sort-field ::ng-deep .mat-mdc-form-field-subscript-wrapper,
    .mobile-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .clear-filters {
      height: 40px;
    }

    .clear-filters mat-icon {
      margin-inline-end: 6px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .hint-text {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .message-preview {
      display: inline-block;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty-state {
      padding: 40px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.92rem;
    }

    .muted {
      color: var(--text-secondary);
    }

    @media (max-width: 720px) {
      .filter-controls {
        flex-direction: column;
      }

      .count-field,
      .sort-field,
      .mobile-field {
        width: 100%;
      }
    }
  `]
})
export class SmsReceiveReportsComponent implements OnInit {
  private readonly smsService = inject(SmsService);
  private readonly smsConfigService = inject(SmsConfigService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly smsDateTimeFormat = SMS_DATETIME_FORMAT;
  readonly maxFilterDate = this.endOfYesterday();
  readonly countOptions = [10, 25, 50, 100];
  readonly latestColumns = ['receiveReturnId', 'mobile', 'messageText', 'number', 'receivedDateTime'];
  readonly liveColumns = ['mobile', 'messageText', 'number', 'receivedDateTime'];
  readonly archiveColumns = ['receiveReturnId', 'mobile', 'messageText', 'number', 'receivedDateTime'];
  readonly tabs: { id: ReceiveTab; labelKey: string }[] = [
    { id: 'latest', labelKey: 'sms.receiveReports.tabs.latest' },
    { id: 'live', labelKey: 'sms.receiveReports.tabs.live' },
    { id: 'archive', labelKey: 'sms.receiveReports.tabs.archive' }
  ];

  activeTab: ReceiveTab = 'latest';
  configLoading = true;
  apiKeyConfigured = false;

  latestLoading = false;
  latestItems: SmsReceivedMessage[] = [];
  latestCount = 50;

  liveLoading = false;
  liveItems: SmsReceivedMessage[] = [];
  livePageIndex = 0;
  livePageSize = 25;
  liveHasMore = false;
  liveMobile = '';
  liveSortByNewest = false;
  private liveMobileTimer: ReturnType<typeof setTimeout> | null = null;

  archiveLoading = false;
  archiveItems: SmsReceivedMessage[] = [];
  archivePageIndex = 0;
  archivePageSize = 25;
  archiveHasMore = false;
  archiveFromDateIso: string | null = null;
  archiveToDateIso: string | null = null;
  archiveMobile = '';
  private archiveMobileTimer: ReturnType<typeof setTimeout> | null = null;

  get activeLoading(): boolean {
    if (this.activeTab === 'live') {
      return this.liveLoading;
    }
    if (this.activeTab === 'archive') {
      return this.archiveLoading;
    }
    return this.latestLoading;
  }

  get livePaginatorLength(): number {
    return this.paginatorLength(this.livePageIndex, this.livePageSize, this.liveItems.length, this.liveHasMore);
  }

  get archivePaginatorLength(): number {
    return this.paginatorLength(
      this.archivePageIndex,
      this.archivePageSize,
      this.archiveItems.length,
      this.archiveHasMore
    );
  }

  get liveHasActiveFilters(): boolean {
    return !!this.liveMobile.trim() || this.liveSortByNewest;
  }

  get archiveHasActiveFilters(): boolean {
    return !!this.archiveFromDateIso || !!this.archiveToDateIso || !!this.archiveMobile.trim();
  }

  ngOnInit(): void {
    this.activeTab = this.parseTab(this.route.snapshot.queryParamMap.get('tab'));

    this.smsConfigService.getConfig().subscribe({
      next: (config) => {
        this.configLoading = false;
        this.apiKeyConfigured = config.apiKeyConfigured;
        if (config.apiKeyConfigured) {
          this.refreshActive();
        }
      },
      error: (error) => {
        this.configLoading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  setTab(tab: ReceiveTab): void {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    void this.router.navigate(['/sms/receive-reports'], {
      queryParams: { tab },
      replaceUrl: true
    });
    if (this.apiKeyConfigured) {
      this.refreshActive();
    }
  }

  refreshActive(): void {
    if (this.activeTab === 'live') {
      this.loadLive();
      return;
    }
    if (this.activeTab === 'archive') {
      this.loadArchive();
      return;
    }
    this.loadLatest();
  }

  setLatestCount(count: number): void {
    this.latestCount = count;
    this.loadLatest();
  }

  onLivePage(event: PageEvent): void {
    this.livePageIndex = event.pageIndex;
    this.livePageSize = event.pageSize;
    this.loadLive();
  }

  onArchivePage(event: PageEvent): void {
    this.archivePageIndex = event.pageIndex;
    this.archivePageSize = event.pageSize;
    this.loadArchive();
  }

  onLiveMobileInput(value: string): void {
    this.liveMobile = value;
    if (this.liveMobileTimer) {
      clearTimeout(this.liveMobileTimer);
    }
    this.liveMobileTimer = setTimeout(() => {
      this.livePageIndex = 0;
      this.loadLive();
    }, 400);
  }

  setLiveSort(value: boolean): void {
    this.liveSortByNewest = value;
    this.livePageIndex = 0;
    this.loadLive();
  }

  clearLiveFilters(): void {
    this.liveMobile = '';
    this.liveSortByNewest = false;
    this.livePageIndex = 0;
    this.loadLive();
  }

  setArchiveFromDate(value: string | null): void {
    this.archiveFromDateIso = value;
    this.archivePageIndex = 0;
    this.loadArchive();
  }

  setArchiveToDate(value: string | null): void {
    this.archiveToDateIso = value;
    this.archivePageIndex = 0;
    this.loadArchive();
  }

  onArchiveMobileInput(value: string): void {
    this.archiveMobile = value;
    if (this.archiveMobileTimer) {
      clearTimeout(this.archiveMobileTimer);
    }
    this.archiveMobileTimer = setTimeout(() => {
      this.archivePageIndex = 0;
      this.loadArchive();
    }, 400);
  }

  clearArchiveFilters(): void {
    this.archiveFromDateIso = null;
    this.archiveToDateIso = null;
    this.archiveMobile = '';
    this.archivePageIndex = 0;
    this.loadArchive();
  }

  formatMobile(mobile: number | null | undefined): string {
    if (mobile == null) {
      return '—';
    }
    return this.locale.digits(mobile);
  }

  formatEpoch(epochSeconds: number | null | undefined): string {
    if (epochSeconds == null || epochSeconds <= 0) {
      return '—';
    }
    const date = new Date(epochSeconds * 1000);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return this.locale.formatDate(date, this.smsDateTimeFormat);
  }

  private loadLatest(): void {
    this.latestLoading = true;
    this.smsService.listLatestReceived(this.latestCount).subscribe({
      next: (result) => {
        this.latestLoading = false;
        if (result.success) {
          this.latestItems = result.data ?? [];
          return;
        }
        this.latestItems = [];
        this.showError(this.resolveProviderMessage(result, 'sms.receiveReports.latest.failed'));
      },
      error: (error) => {
        this.latestLoading = false;
        this.latestItems = [];
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private loadLive(): void {
    this.liveLoading = true;
    this.smsService.listLiveReceived({
      pageSize: this.livePageSize,
      pageNumber: this.livePageIndex + 1,
      sortByNewest: this.liveSortByNewest,
      mobile: this.liveMobile.trim() || undefined
    }).subscribe({
      next: (result) => {
        this.liveLoading = false;
        if (result.success) {
          this.liveItems = result.data ?? [];
          this.liveHasMore = !!result.hasMore;
          if (result.pageNumber != null && result.pageNumber > 0) {
            this.livePageIndex = result.pageNumber - 1;
          }
          if (result.pageSize != null && result.pageSize > 0) {
            this.livePageSize = result.pageSize;
          }
          return;
        }
        this.liveItems = [];
        this.liveHasMore = false;
        this.showError(this.resolveProviderMessage(result, 'sms.receiveReports.live.failed'));
      },
      error: (error) => {
        this.liveLoading = false;
        this.liveItems = [];
        this.liveHasMore = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private loadArchive(): void {
    this.archiveLoading = true;
    this.smsService.listArchiveReceived({
      fromDate: this.toEpochSeconds(this.archiveFromDateIso),
      toDate: this.toEpochSeconds(this.archiveToDateIso),
      pageSize: this.archivePageSize,
      pageNumber: this.archivePageIndex + 1,
      mobile: this.archiveMobile.trim() || undefined
    }).subscribe({
      next: (result) => {
        this.archiveLoading = false;
        if (result.success) {
          this.archiveItems = result.data ?? [];
          this.archiveHasMore = !!result.hasMore;
          if (result.pageNumber != null && result.pageNumber > 0) {
            this.archivePageIndex = result.pageNumber - 1;
          }
          if (result.pageSize != null && result.pageSize > 0) {
            this.archivePageSize = result.pageSize;
          }
          return;
        }
        this.archiveItems = [];
        this.archiveHasMore = false;
        this.showError(this.resolveProviderMessage(result, 'sms.receiveReports.archive.failed'));
      },
      error: (error) => {
        this.archiveLoading = false;
        this.archiveItems = [];
        this.archiveHasMore = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private parseTab(value: string | null): ReceiveTab {
    if (value === 'live' || value === 'archive' || value === 'latest') {
      return value;
    }
    return 'latest';
  }

  private paginatorLength(pageIndex: number, pageSize: number, itemCount: number, hasMore: boolean): number {
    const loaded = pageIndex * pageSize + itemCount;
    return hasMore ? loaded + pageSize : loaded;
  }

  private toEpochSeconds(iso: string | null): number | undefined {
    if (!iso) {
      return undefined;
    }
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) {
      return undefined;
    }
    return Math.floor(ms / 1000);
  }

  private endOfYesterday(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setMilliseconds(-1);
    return date;
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

  private showError(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
