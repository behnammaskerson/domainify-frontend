import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { DatetimeFilterFieldComponent } from '../../components/datetime-filter-field/datetime-filter-field.component';
import { ApiErrorService } from '../../services/api-error.service';
import { SmsConfigService, SmsProviderResult } from '../../services/sms-config.service';
import { LocaleService } from '../../services/locale.service';
import {
  SmsDailyPackItem,
  SmsDeliveryStatusData,
  SmsService
} from '../../services/sms.service';
import { LocaleDigitsPipe, LocaleNumberPipe } from '../../pipes/locale-format.pipe';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

type ReportTab = 'live' | 'archive' | 'packs';

@Component({
  selector: 'app-sms-send-reports',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent,
    DatetimeFilterFieldComponent,
    LocaleDigitsPipe,
    LocaleNumberPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'sms.sendReports.eyebrow' | translate"
        [title]="'sms.sendReports.title' | translate"
        [subtitle]="'sms.sendReports.subtitle' | translate">
        <div heroActions>
          <button mat-stroked-button type="button" (click)="refreshActive()" [disabled]="activeLoading || !apiKeyConfigured">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.sendReports.refresh' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        @if (configLoading) {
          <p class="muted">{{ 'sms.sendReports.loading' | translate }}</p>
        } @else if (!apiKeyConfigured) {
          <div class="notice-card panel-surface">
            <mat-icon>info</mat-icon>
            <p>{{ 'sms.sendReports.configRequired' | translate }}</p>
            <a mat-stroked-button routerLink="/settings" fragment="sms-config">
              {{ 'sms.sendReports.openSettings' | translate }}
            </a>
          </div>
        } @else {
          <div class="filter-bar">
            <div class="filter-tabs" role="tablist" [attr.aria-label]="'sms.sendReports.tabsLabel' | translate">
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

            @if (activeTab === 'archive') {
              <div class="filter-controls">
                <app-datetime-filter-field
                  [compact]="true"
                  [showClear]="true"
                  [maxDate]="maxFilterDate"
                  labelKey="sms.archiveSends.fromDate"
                  [isoValue]="archiveFromDateIso"
                  (isoValueChange)="setArchiveFromDate($event)">
                </app-datetime-filter-field>

                <app-datetime-filter-field
                  [compact]="true"
                  [showClear]="true"
                  [maxDate]="maxFilterDate"
                  labelKey="sms.archiveSends.toDate"
                  [isoValue]="archiveToDateIso"
                  (isoValueChange)="setArchiveToDate($event)">
                </app-datetime-filter-field>

                @if (archiveHasActiveFilters) {
                  <button mat-stroked-button type="button" class="clear-filters" (click)="clearArchiveFilters()">
                    <mat-icon>filter_alt_off</mat-icon>
                    {{ 'sms.archiveSends.clearFilters' | translate }}
                  </button>
                }
              </div>
            }
          </div>

          @if (activeTab === 'live') {
            <div class="panel-surface table-wrap">
              <div class="table-scroll">
                <table mat-table
                       [dataSource]="liveItems"
                       class="mat-mdc-table users-table"
                       [attr.aria-label]="'sms.liveSends.title' | translate">

                  <ng-container matColumnDef="messageId">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.liveSends.table.messageId' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-muted" dir="ltr">
                        {{ item.messageId != null ? (item.messageId | localeDigits) : '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="mobile">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.liveSends.table.mobile' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-strong" dir="ltr">{{ formatMobile(item.mobile) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="messageText">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.liveSends.table.messageText' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="message-preview cell-muted" [matTooltip]="item.messageText || ''">
                        {{ item.messageText || '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="lineNumber">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.liveSends.table.lineNumber' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span dir="ltr">{{ item.lineNumber != null ? (item.lineNumber | localeDigits) : '—' }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="cost">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.liveSends.table.cost' | translate }}</th>
                    <td mat-cell *matCellDef="let item">{{ item.cost ?? 0 | localeNumber }}</td>
                  </ng-container>

                  <ng-container matColumnDef="sendDateTime">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.liveSends.table.sendDateTime' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.sendDateTime) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="deliveryState">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.liveSends.table.deliveryState' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="status-pill" [ngClass]="deliveryClass(item.deliveryState)">
                        {{ deliveryLabel(item.deliveryState) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="deliveryDateTime">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.liveSends.table.deliveryDateTime' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.deliveryDateTime) }}</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="messageColumns; sticky: true"></tr>
                  <tr mat-row *matRowDef="let row; columns: messageColumns;"></tr>
                  <tr class="mat-row empty-row" *matNoDataRow>
                    <td class="mat-cell" [attr.colspan]="messageColumns.length">
                      <div class="empty-state">
                        {{ liveLoading ? ('sms.liveSends.loadingList' | translate) : ('sms.liveSends.empty' | translate) }}
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
                [attr.aria-label]="'sms.liveSends.pagination' | translate"
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
                       [attr.aria-label]="'sms.archiveSends.title' | translate">

                  <ng-container matColumnDef="messageId">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.archiveSends.table.messageId' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-muted" dir="ltr">
                        {{ item.messageId != null ? (item.messageId | localeDigits) : '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="mobile">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.archiveSends.table.mobile' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-strong" dir="ltr">{{ formatMobile(item.mobile) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="messageText">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.archiveSends.table.messageText' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="message-preview cell-muted" [matTooltip]="item.messageText || ''">
                        {{ item.messageText || '—' }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="lineNumber">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.archiveSends.table.lineNumber' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span dir="ltr">{{ item.lineNumber != null ? (item.lineNumber | localeDigits) : '—' }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="cost">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.archiveSends.table.cost' | translate }}</th>
                    <td mat-cell *matCellDef="let item">{{ item.cost ?? 0 | localeNumber }}</td>
                  </ng-container>

                  <ng-container matColumnDef="sendDateTime">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.archiveSends.table.sendDateTime' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.sendDateTime) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="deliveryState">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.archiveSends.table.deliveryState' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="status-pill" [ngClass]="deliveryClass(item.deliveryState)">
                        {{ deliveryLabel(item.deliveryState) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="deliveryDateTime">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.archiveSends.table.deliveryDateTime' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.deliveryDateTime) }}</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="messageColumns; sticky: true"></tr>
                  <tr mat-row *matRowDef="let row; columns: messageColumns;"></tr>
                  <tr class="mat-row empty-row" *matNoDataRow>
                    <td class="mat-cell" [attr.colspan]="messageColumns.length">
                      <div class="empty-state">
                        {{ archiveLoading
                          ? ('sms.archiveSends.loadingList' | translate)
                          : ('sms.archiveSends.empty' | translate) }}
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
                [attr.aria-label]="'sms.archiveSends.pagination' | translate"
                (page)="onArchivePage($event)">
              </mat-paginator>
            </div>
          }

          @if (activeTab === 'packs') {
            <div class="panel-surface table-wrap">
              <div class="table-scroll">
                <table mat-table
                       [dataSource]="packItems"
                       class="mat-mdc-table users-table"
                       [attr.aria-label]="'sms.dailyPacks.title' | translate">

                  <ng-container matColumnDef="packId">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.dailyPacks.table.packId' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-muted" dir="ltr">{{ item.packId || '—' }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="recipientCount">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.dailyPacks.table.recipientCount' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-strong">{{ item.recipientCount ?? 0 | localeNumber }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="creationDateTime">
                    <th mat-header-cell *matHeaderCellDef>{{ 'sms.dailyPacks.table.creationDateTime' | translate }}</th>
                    <td mat-cell *matCellDef="let item">
                      <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.creationDateTime) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef class="col-actions"></th>
                    <td mat-cell *matCellDef="let item" class="col-actions">
                      @if (item.packId) {
                        <a mat-icon-button
                           [routerLink]="['/sms/pack-report', item.packId]"
                           [matTooltip]="'sms.dailyPacks.viewReport' | translate"
                           [attr.aria-label]="'sms.dailyPacks.viewReport' | translate">
                          <mat-icon>description</mat-icon>
                        </a>
                      }
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="packColumns; sticky: true"></tr>
                  <tr mat-row *matRowDef="let row; columns: packColumns;"></tr>
                  <tr class="mat-row empty-row" *matNoDataRow>
                    <td class="mat-cell" [attr.colspan]="packColumns.length">
                      <div class="empty-state">
                        {{ packsLoading
                          ? ('sms.dailyPacks.loadingList' | translate)
                          : ('sms.dailyPacks.empty' | translate) }}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <mat-paginator
                [length]="packsPaginatorLength"
                [pageIndex]="packsPageIndex"
                [pageSize]="packsPageSize"
                [pageSizeOptions]="[10, 25, 50, 100]"
                [showFirstLastButtons]="false"
                [attr.aria-label]="'sms.dailyPacks.pagination' | translate"
                (page)="onPacksPage($event)">
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

    .clear-filters {
      height: 40px;
    }

    .clear-filters mat-icon {
      margin-inline-end: 6px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .message-preview {
      display: inline-block;
      max-width: 240px;
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

    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      white-space: nowrap;
    }

    .status-pill.delivered {
      background: var(--success-light);
      color: var(--success);
      border-color: transparent;
    }

    .status-pill.pending {
      background: var(--warning-light);
      color: var(--warning);
      border-color: transparent;
    }

    .status-pill.failed {
      background: var(--danger-light);
      color: var(--danger);
      border-color: transparent;
    }

    .muted {
      color: var(--text-secondary);
    }

    @media (max-width: 720px) {
      .filter-controls {
        flex-direction: column;
      }
    }
  `]
})
export class SmsSendReportsComponent implements OnInit {
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
  readonly messageColumns = [
    'messageId',
    'mobile',
    'messageText',
    'lineNumber',
    'cost',
    'sendDateTime',
    'deliveryState',
    'deliveryDateTime'
  ];
  readonly packColumns = ['packId', 'recipientCount', 'creationDateTime', 'actions'];
  readonly tabs: { id: ReportTab; labelKey: string }[] = [
    { id: 'live', labelKey: 'sms.sendReports.tabs.live' },
    { id: 'archive', labelKey: 'sms.sendReports.tabs.archive' },
    { id: 'packs', labelKey: 'sms.sendReports.tabs.packs' }
  ];

  activeTab: ReportTab = 'live';
  configLoading = true;
  apiKeyConfigured = false;

  liveLoading = false;
  liveItems: SmsDeliveryStatusData[] = [];
  livePageIndex = 0;
  livePageSize = 25;
  liveHasMore = false;

  archiveLoading = false;
  archiveItems: SmsDeliveryStatusData[] = [];
  archivePageIndex = 0;
  archivePageSize = 25;
  archiveHasMore = false;
  archiveFromDateIso: string | null = null;
  archiveToDateIso: string | null = null;

  packsLoading = false;
  packItems: SmsDailyPackItem[] = [];
  packsPageIndex = 0;
  packsPageSize = 10;
  packsHasMore = false;

  get activeLoading(): boolean {
    if (this.activeTab === 'archive') {
      return this.archiveLoading;
    }
    if (this.activeTab === 'packs') {
      return this.packsLoading;
    }
    return this.liveLoading;
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

  get packsPaginatorLength(): number {
    return this.paginatorLength(this.packsPageIndex, this.packsPageSize, this.packItems.length, this.packsHasMore);
  }

  get archiveHasActiveFilters(): boolean {
    return !!this.archiveFromDateIso || !!this.archiveToDateIso;
  }

  ngOnInit(): void {
    this.activeTab = this.resolveInitialTab();

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

  setTab(tab: ReportTab): void {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    void this.router.navigate(['/sms/send-reports'], {
      queryParams: { tab },
      replaceUrl: true
    });
    if (this.apiKeyConfigured) {
      this.refreshActive();
    }
  }

  refreshActive(): void {
    if (this.activeTab === 'archive') {
      this.loadArchive();
      return;
    }
    if (this.activeTab === 'packs') {
      this.loadPacks();
      return;
    }
    this.loadLive();
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

  onPacksPage(event: PageEvent): void {
    this.packsPageIndex = event.pageIndex;
    this.packsPageSize = event.pageSize;
    this.loadPacks();
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

  clearArchiveFilters(): void {
    this.archiveFromDateIso = null;
    this.archiveToDateIso = null;
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

  deliveryLabel(state: number | null | undefined): string {
    if (state == null) {
      return this.translate.instant('sms.deliveryStates.unknown');
    }
    const key = `sms.deliveryStates.${state}`;
    const translated = this.translate.instant(key);
    return translated === key
      ? this.translate.instant('sms.deliveryStates.unknown')
      : translated;
  }

  deliveryClass(state: number | null | undefined): string {
    if (state === 1 || state === 3 || state === 5) {
      return 'delivered';
    }
    if (state === 2 || state === 4 || state === 6 || state === 7) {
      return 'failed';
    }
    return 'pending';
  }

  private loadLive(): void {
    this.liveLoading = true;
    this.smsService.listLiveSends({
      pageSize: this.livePageSize,
      pageNumber: this.livePageIndex + 1
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
        this.showError(this.resolveProviderMessage(result, 'sms.liveSends.failed'));
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
    this.smsService.listArchiveSends({
      fromDate: this.toEpochSeconds(this.archiveFromDateIso),
      toDate: this.toEpochSeconds(this.archiveToDateIso),
      pageSize: this.archivePageSize,
      pageNumber: this.archivePageIndex + 1
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
        this.showError(this.resolveProviderMessage(result, 'sms.archiveSends.failed'));
      },
      error: (error) => {
        this.archiveLoading = false;
        this.archiveItems = [];
        this.archiveHasMore = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private loadPacks(): void {
    this.packsLoading = true;
    this.smsService.listDailyPacks({
      pageSize: this.packsPageSize,
      pageNumber: this.packsPageIndex + 1
    }).subscribe({
      next: (result) => {
        this.packsLoading = false;
        if (result.success) {
          this.packItems = result.data ?? [];
          this.packsHasMore = !!result.hasMore;
          if (result.pageNumber != null && result.pageNumber > 0) {
            this.packsPageIndex = result.pageNumber - 1;
          }
          if (result.pageSize != null && result.pageSize > 0) {
            this.packsPageSize = result.pageSize;
          }
          return;
        }
        this.packItems = [];
        this.packsHasMore = false;
        this.showError(this.resolveProviderMessage(result, 'sms.dailyPacks.failed'));
      },
      error: (error) => {
        this.packsLoading = false;
        this.packItems = [];
        this.packsHasMore = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private resolveInitialTab(): ReportTab {
    const path = this.router.url.split('?')[0];
    if (path.includes('/sms/archive-sends')) {
      return 'archive';
    }
    if (path.includes('/sms/daily-packs')) {
      return 'packs';
    }
    if (path.includes('/sms/live-sends')) {
      return 'live';
    }
    return this.parseTab(this.route.snapshot.queryParamMap.get('tab'));
  }

  private parseTab(value: string | null): ReportTab {
    if (value === 'archive' || value === 'packs' || value === 'live') {
      return value;
    }
    return 'live';
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
