import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ApiErrorService } from '../../services/api-error.service';
import { SmsConfigService, SmsProviderResult } from '../../services/sms-config.service';
import { LocaleService } from '../../services/locale.service';
import { SmsDeliveryStatusData, SmsService } from '../../services/sms.service';
import { LocaleDigitsPipe, LocaleNumberPipe } from '../../pipes/locale-format.pipe';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

@Component({
  selector: 'app-sms-pack-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent,
    LocaleDigitsPipe,
    LocaleNumberPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'sms.packReport.eyebrow' | translate"
        [title]="'sms.packReport.title' | translate"
        [subtitle]="'sms.packReport.subtitle' | translate:{ packId: packId }">
        <div heroActions>
          <a mat-stroked-button routerLink="/sms/send-reports" [queryParams]="{ tab: 'packs' }">
            <mat-icon>arrow_back</mat-icon>
            {{ 'sms.packReport.back' | translate }}
          </a>
          <button mat-stroked-button type="button" (click)="loadReport()" [disabled]="loading || !packId">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.packReport.refresh' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        @if (configLoading) {
          <p class="muted">{{ 'sms.packReport.loading' | translate }}</p>
        } @else if (!apiKeyConfigured) {
          <div class="notice-card panel-surface">
            <mat-icon>info</mat-icon>
            <p>{{ 'sms.packReport.configRequired' | translate }}</p>
            <a mat-stroked-button routerLink="/settings" fragment="sms-config">
              {{ 'sms.packReport.openSettings' | translate }}
            </a>
          </div>
        } @else if (!packId) {
          <p class="muted">{{ 'sms.packReport.packIdRequired' | translate }}</p>
        } @else {
          <div class="meta-bar">
            <span class="meta-label">{{ 'sms.packReport.packId' | translate }}</span>
            <span class="meta-value" dir="ltr">{{ packId }}</span>
            <span class="meta-count">
              {{ 'sms.packReport.messageCount' | translate:{ count: (items.length | localeNumber) } }}
            </span>
          </div>

          <div class="panel-surface table-wrap">
            <div class="table-scroll">
              <table mat-table
                     [dataSource]="items"
                     class="mat-mdc-table users-table"
                     [attr.aria-label]="'sms.packReport.title' | translate">

                <ng-container matColumnDef="messageId">
                  <th mat-header-cell *matHeaderCellDef>{{ 'sms.packReport.table.messageId' | translate }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span class="cell-muted" dir="ltr">
                      {{ item.messageId != null ? (item.messageId | localeDigits) : '—' }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="mobile">
                  <th mat-header-cell *matHeaderCellDef>{{ 'sms.packReport.table.mobile' | translate }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span class="cell-strong" dir="ltr">{{ formatMobile(item.mobile) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="messageText">
                  <th mat-header-cell *matHeaderCellDef>{{ 'sms.packReport.table.messageText' | translate }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span class="message-preview cell-muted" [matTooltip]="item.messageText || ''">
                      {{ item.messageText || '—' }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="lineNumber">
                  <th mat-header-cell *matHeaderCellDef>{{ 'sms.packReport.table.lineNumber' | translate }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span dir="ltr">{{ item.lineNumber != null ? (item.lineNumber | localeDigits) : '—' }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="cost">
                  <th mat-header-cell *matHeaderCellDef>{{ 'sms.packReport.table.cost' | translate }}</th>
                  <td mat-cell *matCellDef="let item">{{ item.cost ?? 0 | localeNumber }}</td>
                </ng-container>

                <ng-container matColumnDef="sendDateTime">
                  <th mat-header-cell *matHeaderCellDef>{{ 'sms.packReport.table.sendDateTime' | translate }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.sendDateTime) }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="deliveryState">
                  <th mat-header-cell *matHeaderCellDef>{{ 'sms.packReport.table.deliveryState' | translate }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span class="status-pill" [ngClass]="deliveryClass(item.deliveryState)">
                      {{ deliveryLabel(item.deliveryState) }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="deliveryDateTime">
                  <th mat-header-cell *matHeaderCellDef>{{ 'sms.packReport.table.deliveryDateTime' | translate }}</th>
                  <td mat-cell *matCellDef="let item">
                    <span class="cell-datetime" dir="ltr">{{ formatEpoch(item.deliveryDateTime) }}</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                <tr class="mat-row empty-row" *matNoDataRow>
                  <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                    <div class="empty-state">
                      {{ loading ? ('sms.packReport.loadingList' | translate) : ('sms.packReport.empty' | translate) }}
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
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

    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 16px;
      margin-bottom: 16px;
    }

    .meta-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .meta-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      color: var(--text-primary);
      word-break: break-all;
    }

    .meta-count {
      margin-inline-start: auto;
      font-size: 0.86rem;
      color: var(--text-secondary);
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
  `]
})
export class SmsPackReportComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly smsService = inject(SmsService);
  private readonly smsConfigService = inject(SmsConfigService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LocaleService);

  readonly smsDateTimeFormat = SMS_DATETIME_FORMAT;
  readonly displayedColumns = [
    'messageId',
    'mobile',
    'messageText',
    'lineNumber',
    'cost',
    'sendDateTime',
    'deliveryState',
    'deliveryDateTime'
  ];

  configLoading = true;
  apiKeyConfigured = false;
  loading = false;
  packId = '';
  items: SmsDeliveryStatusData[] = [];

  ngOnInit(): void {
    this.packId = this.route.snapshot.paramMap.get('packId')?.trim() ?? '';
    this.smsConfigService.getConfig().subscribe({
      next: (config) => {
        this.configLoading = false;
        this.apiKeyConfigured = config.apiKeyConfigured;
        if (config.apiKeyConfigured && this.packId) {
          this.loadReport();
        }
      },
      error: (error) => {
        this.configLoading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  loadReport(): void {
    if (!this.packId) {
      return;
    }
    this.loading = true;
    this.smsService.getPackReport(this.packId).subscribe({
      next: (result) => {
        this.loading = false;
        if (result.success) {
          this.items = result.data ?? [];
          return;
        }
        this.items = [];
        this.showError(this.resolveProviderMessage(result, 'sms.packReport.failed'));
      },
      error: (error) => {
        this.loading = false;
        this.items = [];
        this.showError(this.apiError.resolve(error));
      }
    });
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
