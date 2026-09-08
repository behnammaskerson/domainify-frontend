import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleCurrencyPipe, LocaleDatePipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import {
  TicketCustomerContext,
  TicketCustomerSmsSnippet,
  TicketService
} from '../../services/ticket.service';
import { UsersService } from '../../services/users.service';
import { TranslationService } from '../../services/translation.service';
import { findPhoneCountry, formatPhoneDigits } from '../../utils/phone-countries';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

@Component({
  selector: 'app-ticket-customer-side-panel',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
    LocaleCurrencyPipe,
    LocaleDatePipe,
    LocaleDigitsPipe
  ],
  template: `
    <aside class="customer-panel panel-surface" [attr.aria-label]="'tickets.detail.sidePanel.title' | translate">
      <div class="panel-head">
        <div>
          <h2>{{ 'tickets.detail.sidePanel.title' | translate }}</h2>
          <p>{{ 'tickets.detail.sidePanel.subtitle' | translate }}</p>
        </div>
        <button mat-icon-button type="button"
                [disabled]="loading"
                [matTooltip]="'tickets.detail.sidePanel.refresh' | translate"
                (click)="reload()">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      @if (loading) {
        <div class="panel-loading">
          <mat-spinner diameter="28"></mat-spinner>
        </div>
      } @else if (error) {
        <p class="panel-error">{{ error }}</p>
        <button mat-stroked-button type="button" (click)="reload()">
          {{ 'tickets.detail.sidePanel.retry' | translate }}
        </button>
      } @else if (context) {
        @if (context.profile; as profile) {
        <section class="panel-section profile">
          <div class="profile-row">
            @if (avatarSrc) {
              <img class="avatar" [src]="avatarSrc" alt="" />
            } @else {
              <div class="avatar avatar-fallback" aria-hidden="true">
                <mat-icon>person</mat-icon>
              </div>
            }
            <div class="profile-text">
              <strong>{{ displayName }}</strong>
              <a class="email" dir="ltr" [href]="'mailto:' + profile.email">{{ profile.email }}</a>
              @if (phoneDisplay) {
                <span class="phone" dir="ltr">{{ phoneDisplay }}</span>
              }
            </div>
          </div>
          <dl class="facts">
            <div>
              <dt>{{ 'tickets.detail.sidePanel.userId' | translate }}</dt>
              <dd dir="ltr">{{ profile.id }}</dd>
            </div>
            <div>
              <dt>{{ 'tickets.detail.sidePanel.role' | translate }}</dt>
              <dd>{{ ('users.roles.' + profile.role) | translate }}</dd>
            </div>
            <div>
              <dt>{{ 'tickets.detail.sidePanel.status' | translate }}</dt>
              <dd>
                {{ (profile.enabled ? 'tickets.detail.sidePanel.enabled' : 'tickets.detail.sidePanel.disabled') | translate }}
              </dd>
            </div>
            <div>
              <dt>{{ 'tickets.detail.sidePanel.joined' | translate }}</dt>
              <dd dir="ltr">{{ profile.createdAt | localeDate:dateFormat }}</dd>
            </div>
            <div>
              <dt>{{ 'tickets.detail.sidePanel.emailVerified' | translate }}</dt>
              <dd>{{ (profile.emailVerified ? 'tickets.detail.sidePanel.yes' : 'tickets.detail.sidePanel.no') | translate }}</dd>
            </div>
            <div>
              <dt>{{ 'tickets.detail.sidePanel.phoneVerified' | translate }}</dt>
              <dd>{{ (profile.phoneVerified ? 'tickets.detail.sidePanel.yes' : 'tickets.detail.sidePanel.no') | translate }}</dd>
            </div>
          </dl>
          @if (context.wallet; as wallet) {
            <div class="wallet-strip">
              <div>
                <span class="meta-label">{{ 'tickets.detail.sidePanel.available' | translate }}</span>
                <strong dir="ltr">{{ wallet.availableBalance | localeCurrency }}</strong>
              </div>
              <div>
                <span class="meta-label">{{ 'tickets.detail.sidePanel.held' | translate }}</span>
                <strong dir="ltr">{{ wallet.heldBalance | localeCurrency }}</strong>
              </div>
            </div>
          }
          <a mat-stroked-button type="button" class="full-btn" routerLink="/user"
             [queryParams]="{ email: profile.email }">
            <mat-icon>manage_accounts</mat-icon>
            {{ 'tickets.detail.sidePanel.openUser' | translate }}
          </a>
        </section>

        <section class="panel-section">
          <div class="section-head">
            <h3>{{ 'tickets.detail.sidePanel.domains' | translate }}</h3>
            <span class="count" dir="ltr">{{ context.domainTotal | localeDigits }}</span>
          </div>
          @if (!context.domains.length) {
            <p class="empty">{{ 'tickets.detail.sidePanel.noDomains' | translate }}</p>
          } @else {
            <ul class="item-list">
              @for (domain of context.domains; track domain.id) {
                <li>
                  <span class="item-title" dir="ltr">{{ domain.name }}</span>
                  <span class="item-meta">
                    <span class="status-pill" [attr.data-status]="domain.status">
                      {{ ('domains.status.' + (domain.status | lowercase)) | translate }}
                    </span>
                    @if (domain.ownershipStatus) {
                      <span class="muted">{{ ('domains.ownershipStatus.' + (domain.ownershipStatus | lowercase)) | translate }}</span>
                    }
                  </span>
                </li>
              }
            </ul>
            @if (context.domainTotal > context.domains.length) {
              <p class="more">{{ 'tickets.detail.sidePanel.showingOf' | translate:{
                shown: (context.domains.length | localeDigits),
                total: (context.domainTotal | localeDigits)
              } }}</p>
            }
          }
        </section>

        <section class="panel-section">
          <div class="section-head">
            <h3>{{ 'tickets.detail.sidePanel.orders' | translate }}</h3>
            <span class="count" dir="ltr">{{ context.orderTotal | localeDigits }}</span>
          </div>
          @if (!context.orders.length) {
            <p class="empty">{{ 'tickets.detail.sidePanel.noOrders' | translate }}</p>
          } @else {
            <ul class="item-list">
              @for (order of context.orders; track order.id) {
                <li>
                  <span class="item-title" dir="ltr">{{ order.domainName || ('#' + order.id) }}</span>
                  <span class="item-meta">
                    <span dir="ltr">{{ order.grossAmount | localeCurrency }}</span>
                    <span class="status-pill" [attr.data-status]="order.status">
                      {{ ('orders.status.' + order.status) | translate }}
                    </span>
                  </span>
                  @if (order.createdAt) {
                    <span class="item-time" dir="ltr">{{ order.createdAt | localeDate:dateFormat }}</span>
                  }
                </li>
              }
            </ul>
            @if (context.orderTotal > context.orders.length) {
              <p class="more">{{ 'tickets.detail.sidePanel.showingOf' | translate:{
                shown: (context.orders.length | localeDigits),
                total: (context.orderTotal | localeDigits)
              } }}</p>
            }
          }
        </section>

        <section class="panel-section">
          <div class="section-head">
            <h3>{{ 'tickets.detail.sidePanel.sms' | translate }}</h3>
            @if (context.smsMobile) {
              <span class="count" dir="ltr">{{ context.smsMobile }}</span>
            }
          </div>
          @if (!context.smsAvailable) {
            <p class="empty">{{ smsUnavailableKey | translate }}</p>
          } @else if (!context.recentSms.length) {
            <p class="empty">{{ 'tickets.detail.sidePanel.noSms' | translate }}</p>
          } @else {
            <ul class="item-list sms-list">
              @for (sms of context.recentSms; track trackSms($index, sms)) {
                <li>
                  <p class="sms-body">{{ sms.messageText || '—' }}</p>
                  <span class="item-time" dir="ltr">{{ formatEpoch(sms.receivedDateTime) }}</span>
                </li>
              }
            </ul>
            <a mat-button type="button" class="full-btn" routerLink="/sms/receive-reports">
              {{ 'tickets.detail.sidePanel.openSms' | translate }}
            </a>
          }
        </section>
        }
      }
    </aside>
  `,
  styles: `
    .customer-panel {
      position: sticky;
      top: 1rem;
      padding: 1rem 1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: calc(100vh - 2rem);
      overflow: auto;
    }
    .panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .panel-head h2 {
      margin: 0;
      font-size: 1.05rem;
    }
    .panel-head p {
      margin: 0.25rem 0 0;
      color: var(--text-muted);
      font-size: 0.82rem;
    }
    .panel-loading, .panel-error, .empty, .more {
      color: var(--text-muted);
      font-size: 0.88rem;
      margin: 0;
    }
    .panel-error { color: #b42318; }
    .panel-section {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border-color);
    }
    .panel-section.profile { border-top: 0; padding-top: 0; }
    .section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .section-head h3 {
      margin: 0;
      font-size: 0.92rem;
    }
    .count {
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .profile-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .avatar-fallback {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary);
      color: var(--text-muted);
    }
    .profile-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }
    .profile-text strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .email, .phone {
      font-size: 0.82rem;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .facts {
      margin: 0;
      display: grid;
      gap: 0.4rem;
    }
    .facts > div {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 0.82rem;
    }
    dt { color: var(--text-muted); }
    dd { margin: 0; font-weight: 600; text-align: end; }
    .wallet-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .wallet-strip > div {
      padding: 0.65rem 0.7rem;
      border-radius: 10px;
      background: var(--bg-secondary);
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .meta-label {
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .full-btn {
      width: 100%;
    }
    .full-btn mat-icon { margin-inline-end: 4px; }
    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .item-list li {
      padding: 0.55rem 0.65rem;
      border-radius: 10px;
      background: var(--bg-secondary);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .item-title {
      font-weight: 650;
      font-size: 0.88rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 0.65rem;
      align-items: center;
      font-size: 0.78rem;
    }
    .item-time, .muted {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .sms-body {
      margin: 0;
      font-size: 0.85rem;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.72rem;
      background: color-mix(in srgb, var(--accent) 12%, var(--bg-primary));
    }
  `
})
export class TicketCustomerSidePanelComponent implements OnChanges {
  private readonly ticketService = inject(TicketService);
  private readonly usersService = inject(UsersService);
  private readonly apiError = inject(ApiErrorService);
  private readonly translationService = inject(TranslationService);

  @Input({ required: true }) ticketId!: number;

  readonly dateFormat = SMS_DATETIME_FORMAT;

  loading = false;
  error = '';
  context: TicketCustomerContext | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticketId'] && this.ticketId != null) {
      this.reload();
    }
  }

  get displayName(): string {
    const p = this.context?.profile;
    if (!p) return '';
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
    return name || p.email || String(p.id);
  }

  get phoneDisplay(): string | null {
    const p = this.context?.profile;
    if (!p?.phoneNumber && !p?.phoneCountryCode) return null;
    const country = findPhoneCountry(p?.phoneCountryCode, this.translationService.currentLang());
    if (country && p?.phoneNumber) {
      return `+${country.dialCode} ${formatPhoneDigits(p.phoneNumber, country.iso)}`;
    }
    if (p?.phoneCountryCode && p?.phoneNumber) {
      return `+${p.phoneCountryCode} ${p.phoneNumber}`;
    }
    return p?.phoneNumber || p?.phoneCountryCode || null;
  }

  get avatarSrc(): string | null {
    return this.usersService.resolveAvatarUrl(this.context?.profile?.avatarUrl);
  }

  get smsUnavailableKey(): string {
    const reason = this.context?.smsUnavailableReason;
    if (reason === 'NO_PHONE') return 'tickets.detail.sidePanel.smsNoPhone';
    if (reason === 'SMS_DISABLED') return 'tickets.detail.sidePanel.smsDisabled';
    return 'tickets.detail.sidePanel.smsUnavailable';
  }

  reload(): void {
    if (this.ticketId == null) return;
    this.loading = true;
    this.error = '';
    this.ticketService.getCustomerContext(this.ticketId, 8).subscribe({
      next: (ctx) => {
        this.context = ctx;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.context = null;
        this.error = this.apiError.resolve(err);
      }
    });
  }

  trackSms(index: number, sms: TicketCustomerSmsSnippet): string | number {
    return sms.receiveReturnId ?? `${index}-${sms.receivedDateTime ?? 0}`;
  }

  formatEpoch(epochSeconds: number | null | undefined): string {
    if (epochSeconds == null || epochSeconds <= 0) {
      return '—';
    }
    return new Date(epochSeconds * 1000).toLocaleString();
  }
}
