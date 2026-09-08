import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TopUpDialogComponent } from '../../components/top-up-dialog/top-up-dialog.component';
import { LocaleCurrencyPipe, LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { AuthService } from '../../services/auth.service';
import {
  PaymentIntentSummary,
  WalletLedgerEntry,
  WalletService,
  WalletSummary
} from '../../services/wallet.service';

@Component({
  selector: 'app-wallet-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe,
    LocaleDatePipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'wallet.eyebrow' | translate"
        [title]="'wallet.title' | translate"
        [subtitle]="'wallet.subtitle' | translate">
        <div heroActions>
          <button mat-flat-button type="button" class="hero-cta"
                  [disabled]="toppingUp || loading || !!loadError"
                  (click)="openTopUp()">
            <mat-icon>add_card</mat-icon>
            {{ 'wallet.topUp.cta' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body wallet-shell">
        @if (loading) {
          <p class="muted">{{ 'wallet.loading' | translate }}</p>
        } @else if (loadError) {
          <div class="banner warn">
            <p>{{ loadError }}</p>
            <button mat-stroked-button type="button" (click)="reload()">
              <mat-icon>refresh</mat-icon>
              {{ 'common.retry' | translate }}
            </button>
          </div>
        } @else if (wallet) {
          @if (!wallet.paymentsEnabled) {
            <div class="banner warn">
              <p>{{ 'wallet.paymentsDisabled' | translate }}</p>
              @if (authService.isAdmin()) {
                <a mat-stroked-button routerLink="/settings" fragment="payment-settings">
                  <mat-icon>settings</mat-icon>
                  {{ 'wallet.openPaymentSettings' | translate }}
                </a>
              }
            </div>
          }

          <section class="balance-stage" [attr.aria-label]="'wallet.title' | translate">
            <div class="balance-glow" aria-hidden="true"></div>
            <div class="balance-main">
              <span class="balance-kicker">{{ 'wallet.available' | translate }}</span>
              <p class="balance-figure" dir="ltr">{{ wallet.availableBalance | localeCurrency }}</p>
              <p class="balance-held">
                {{ 'wallet.held' | translate }}:
                <span dir="ltr">{{ wallet.heldBalance | localeCurrency }}</span>
              </p>
            </div>
            <div class="balance-actions">
              <button mat-flat-button type="button" color="primary"
                      [disabled]="!wallet.paymentsEnabled || toppingUp"
                      (click)="openTopUp()">
                <mat-icon>add_card</mat-icon>
                {{ 'wallet.topUp.cta' | translate }}
              </button>
            </div>
          </section>

          <div class="panels">
            <section class="panel">
              <header class="panel-head">
                <h2>{{ 'wallet.paymentsTitle' | translate }}</h2>
                <p>{{ 'wallet.paymentsSubtitle' | translate }}</p>
              </header>
              @if (!payments.length) {
                <p class="empty">{{ 'wallet.emptyPayments' | translate }}</p>
              } @else {
                <ul class="activity-list">
                  @for (row of payments; track row.id) {
                    <li class="activity-item" [attr.data-status]="row.status">
                      <div class="activity-icon" aria-hidden="true">
                        <mat-icon>{{ paymentIcon(row.status) }}</mat-icon>
                      </div>
                      <div class="activity-copy">
                        <div class="activity-top">
                          <strong dir="ltr">{{ row.amountIrt | localeCurrency }}</strong>
                          <span class="status-chip">{{ ('wallet.paymentStatus.' + row.status) | translate }}</span>
                        </div>
                        <span class="activity-meta">
                          {{ row.createdAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } }}
                          @if (row.refId) {
                            · {{ 'wallet.refId' | translate }} {{ row.refId }}
                          }
                        </span>
                        @if (row.failureReason) {
                          <span class="activity-fail">{{ row.failureReason }}</span>
                        }
                      </div>
                    </li>
                  }
                </ul>
              }
            </section>

            <section class="panel">
              <header class="panel-head">
                <h2>{{ 'wallet.ledgerTitle' | translate }}</h2>
                <p>{{ 'wallet.ledgerSubtitle' | translate }}</p>
              </header>
              @if (!ledgerRows.length) {
                <p class="empty">{{ 'wallet.emptyLedger' | translate }}</p>
              } @else {
                <ul class="activity-list">
                  @for (row of ledgerRows; track row.id) {
                    <li class="activity-item">
                      <div class="activity-icon" [class.credit]="row.direction === 'CREDIT'"
                           [class.debit]="row.direction === 'DEBIT'" aria-hidden="true">
                        <mat-icon>{{ row.direction === 'CREDIT' ? 'south_west' : 'north_east' }}</mat-icon>
                      </div>
                      <div class="activity-copy">
                        <div class="activity-top">
                          <strong>{{ ('wallet.entryType.' + row.entryType) | translate }}</strong>
                          <span dir="ltr" [class.credit]="row.direction === 'CREDIT'" [class.debit]="row.direction === 'DEBIT'">
                            {{ row.direction === 'CREDIT' ? '+' : '−' }}{{ row.amount | localeCurrency }}
                          </span>
                        </div>
                        <span class="activity-meta">
                          {{ row.createdAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } }}
                          · {{ 'wallet.table.availableAfter' | translate }}
                          <span dir="ltr">{{ row.availableAfter | localeCurrency }}</span>
                        </span>
                        @if (row.note) {
                          <span class="activity-note">{{ row.note }}</span>
                        }
                      </div>
                    </li>
                  }
                </ul>
              }
            </section>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .wallet-shell { display: flex; flex-direction: column; gap: 1.25rem; }
    .muted { margin: 0; color: var(--text-muted); }
    .banner.warn {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 0.75rem 1rem; padding: 0.95rem 1.15rem; border-radius: 14px;
      border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border-color));
      background: color-mix(in srgb, var(--accent-light) 65%, var(--bg-primary));
    }
    .banner.warn p { margin: 0; flex: 1; min-width: 12rem; }
    .balance-stage {
      position: relative; overflow: hidden; border-radius: 20px; padding: 1.5rem 1.6rem;
      display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
      gap: 1.25rem; color: #f7f1e4;
      background: linear-gradient(145deg, #17140f 0%, #1f1a14 48%, #122033 100%);
      animation: walletReveal 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .balance-glow {
      position: absolute; width: 42vmax; height: 42vmax; border-radius: 50%;
      inset-inline-start: -18%; top: -55%; pointer-events: none;
      background: radial-gradient(circle, rgba(245, 215, 107, 0.22), transparent 68%);
      animation: walletOrb 14s ease-in-out infinite;
    }
    .balance-main { position: relative; z-index: 1; display: grid; gap: 0.35rem; }
    .balance-kicker {
      font-size: 0.75rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #f5d76b;
    }
    .balance-figure { margin: 0; font-size: clamp(1.9rem, 4vw, 2.75rem); font-weight: 800; letter-spacing: -0.03em; }
    .balance-held { margin: 0; opacity: 0.72; font-size: 0.92rem; }
    .balance-actions { position: relative; z-index: 1; }
    .panels {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;
    }
    .panel {
      border: 1px solid var(--border-color); border-radius: 16px; background: var(--bg-primary);
      padding: 1.1rem 1.15rem 0.35rem; min-height: 220px;
      animation: walletReveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .panel:nth-child(2) { animation-delay: 0.06s; }
    .panel-head { margin-bottom: 0.75rem; }
    .panel-head h2 { margin: 0 0 0.25rem; font-size: 1.05rem; }
    .panel-head p { margin: 0; color: var(--text-muted); font-size: 0.85rem; }
    .empty { color: var(--text-muted); padding: 1.25rem 0.25rem 1.5rem; }
    .activity-list { list-style: none; margin: 0; padding: 0; }
    .activity-item {
      display: flex; gap: 0.85rem; padding: 0.85rem 0.15rem;
      border-top: 1px solid var(--border-light, var(--border-color));
    }
    .activity-item:first-child { border-top: none; }
    .activity-icon {
      width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--bg-secondary); color: var(--text-secondary);
    }
    .activity-icon.credit, .credit { color: #1b7f4a; }
    .activity-icon.debit, .debit { color: #b42318; }
    .activity-copy { min-width: 0; flex: 1; display: grid; gap: 0.2rem; }
    .activity-top { display: flex; justify-content: space-between; gap: 0.75rem; align-items: baseline; }
    .activity-meta, .activity-note, .activity-fail {
      font-size: 0.8rem; color: var(--text-muted); overflow-wrap: anywhere;
    }
    .activity-fail { color: #b42318; }
    .status-chip {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
      padding: 0.2rem 0.45rem; border-radius: 999px; background: var(--bg-secondary);
    }
    [data-status='VERIFIED'] .status-chip { background: color-mix(in srgb, #1b7f4a 16%, var(--bg-secondary)); color: #1b7f4a; }
    [data-status='FAILED'] .status-chip,
    [data-status='CANCELLED'] .status-chip { background: color-mix(in srgb, #b42318 14%, var(--bg-secondary)); color: #b42318; }
    [data-status='REDIRECTED'] .status-chip,
    [data-status='CREATED'] .status-chip { color: var(--accent-dark, var(--accent)); }
    @keyframes walletReveal {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes walletOrb {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(4%, 3%, 0) scale(1.06); }
    }
    @media (prefers-reduced-motion: reduce) {
      .balance-stage, .panel, .balance-glow { animation: none !important; }
    }
  `
})
export class WalletPageComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  readonly authService = inject(AuthService);

  wallet: WalletSummary | null = null;
  loadError = '';
  loading = true;
  toppingUp = false;

  get ledgerRows(): WalletLedgerEntry[] {
    return this.wallet?.recentLedger ?? [];
  }

  get payments(): PaymentIntentSummary[] {
    return this.wallet?.recentPayments ?? [];
  }

  ngOnInit(): void {
    this.reload();
  }

  paymentIcon(status: string): string {
    switch (status) {
      case 'VERIFIED': return 'check_circle';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'cancel';
      case 'REDIRECTED': return 'open_in_browser';
      default: return 'hourglass_empty';
    }
  }

  reload(): void {
    this.loading = true;
    this.loadError = '';
    this.walletService.getWallet(30).subscribe({
      next: (wallet) => {
        this.wallet = {
          ...wallet,
          recentLedger: wallet.recentLedger ?? [],
          recentPayments: wallet.recentPayments ?? []
        };
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.wallet = null;
        this.loadError = this.apiError.resolve(err);
        this.snackBar.open(this.loadError, undefined, { duration: 4000 });
      }
    });
  }

  openTopUp(): void {
    if (!this.wallet) {
      return;
    }
    if (!this.wallet.paymentsEnabled) {
      this.snackBar.open(this.translate.instant('wallet.paymentsDisabled'), undefined, { duration: 4500 });
      return;
    }
    const ref = this.dialog.open(TopUpDialogComponent, {
      width: '420px',
      data: { minTopUpIrt: this.wallet.minTopUpIrt || 10000 }
    });
    ref.afterClosed().subscribe((amount) => {
      if (amount == null) {
        return;
      }
      this.toppingUp = true;
      this.walletService.topUp(amount).subscribe({
        next: (res) => {
          this.toppingUp = false;
          if (!res?.startPayUrl) {
            this.reload();
            this.snackBar.open(this.translate.instant('errors.PAYMENT_GATEWAY_ERROR'), undefined, { duration: 4500 });
            return;
          }
          window.location.href = res.startPayUrl;
        },
        error: (err) => {
          this.toppingUp = false;
          this.reload();
          this.snackBar.open(this.apiError.resolve(err), undefined, { duration: 4500 });
        }
      });
    });
  }
}
