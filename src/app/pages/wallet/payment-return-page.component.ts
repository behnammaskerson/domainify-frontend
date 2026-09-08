import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleCurrencyPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { PaymentVerifyResult, WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-payment-return-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'payments.return.eyebrow' | translate"
        [title]="'payments.return.title' | translate"
        [subtitle]="'payments.return.subtitle' | translate">
      </app-page-hero>

      <div class="page-body">
        <section class="result-card" [attr.data-state]="state">
          <div class="result-orb" aria-hidden="true"></div>
          <div class="result-icon" aria-hidden="true">
            @if (verifying) {
              <mat-icon class="spin">autorenew</mat-icon>
            } @else if (state === 'ok') {
              <mat-icon>verified</mat-icon>
            } @else if (state === 'cancelled') {
              <mat-icon>cancel</mat-icon>
            } @else {
              <mat-icon>error</mat-icon>
            }
          </div>

          @if (verifying) {
            <h2>{{ 'payments.return.verifying' | translate }}</h2>
            <p class="support">{{ 'payments.return.verifyingHint' | translate }}</p>
          } @else if (state === 'cancelled') {
            <h2>{{ 'payments.return.cancelled' | translate }}</h2>
            <p class="support">{{ 'payments.return.cancelledHint' | translate }}</p>
          } @else if (state === 'error') {
            <h2>{{ 'payments.return.failedTitle' | translate }}</h2>
            <p class="support">{{ error }}</p>
          } @else if (result) {
            <h2>{{ (result.alreadyVerified ? 'payments.return.alreadyVerified' : (isOrderPayment ? 'payments.return.orderSuccess' : 'payments.return.success')) | translate }}</h2>
            <p class="support">{{ (isOrderPayment ? 'payments.return.orderSuccessHint' : 'payments.return.successHint') | translate }}</p>
            <dl class="facts">
              <div>
                <dt>{{ 'payments.return.amount' | translate }}</dt>
                <dd dir="ltr">{{ result.amountIrt | localeCurrency }}</dd>
              </div>
              @if (result.refId) {
                <div>
                  <dt>{{ 'payments.return.refId' | translate }}</dt>
                  <dd dir="ltr">{{ result.refId }}</dd>
                </div>
              }
              <div>
                <dt>{{ 'payments.return.available' | translate }}</dt>
                <dd dir="ltr">{{ result.availableBalance | localeCurrency }}</dd>
              </div>
            </dl>
          }

          <div class="actions">
            @if (isOrderPayment) {
              <a mat-flat-button color="primary" routerLink="/marketplace/my-orders">
                <mat-icon>receipt_long</mat-icon>
                {{ 'payments.return.backToOrders' | translate }}
              </a>
            } @else {
              <a mat-flat-button color="primary" routerLink="/wallet">
                <mat-icon>account_balance_wallet</mat-icon>
                {{ 'payments.return.backToWallet' | translate }}
              </a>
            }
            <a mat-stroked-button routerLink="/dashboard">{{ 'menu.dashboard' | translate }}</a>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .result-card {
      position: relative; overflow: hidden; max-width: 560px; margin: 0 auto;
      padding: 2rem 1.5rem 1.5rem; border-radius: 22px;
      border: 1px solid var(--border-color); background: var(--bg-primary);
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem;
      animation: resultIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .result-orb {
      position: absolute; width: 28vmax; height: 28vmax; border-radius: 50%; top: -40%; inset-inline-end: -20%;
      background: radial-gradient(circle, color-mix(in srgb, var(--accent) 28%, transparent), transparent 70%);
      pointer-events: none; animation: orbFloat 12s ease-in-out infinite;
    }
    .result-icon {
      position: relative; z-index: 1; width: 72px; height: 72px; border-radius: 20px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--bg-secondary); color: var(--accent);
    }
    .result-icon mat-icon { font-size: 36px; width: 36px; height: 36px; }
    [data-state='ok'] .result-icon { color: #1b7f4a; background: color-mix(in srgb, #1b7f4a 14%, var(--bg-secondary)); }
    [data-state='error'] .result-icon,
    [data-state='cancelled'] .result-icon { color: #b42318; background: color-mix(in srgb, #b42318 12%, var(--bg-secondary)); }
    h2 { position: relative; z-index: 1; margin: 0.35rem 0 0; font-size: clamp(1.25rem, 2.5vw, 1.65rem); }
    .support { position: relative; z-index: 1; margin: 0; color: var(--text-muted); max-width: 36rem; }
    .facts {
      position: relative; z-index: 1; width: 100%; margin: 0.75rem 0 0; padding: 0;
      display: grid; gap: 0.65rem; text-align: start;
    }
    .facts > div {
      display: flex; justify-content: space-between; gap: 1rem; align-items: baseline;
      padding: 0.75rem 0.9rem; border-radius: 12px; background: var(--bg-secondary);
    }
    dt { font-size: 0.82rem; color: var(--text-muted); }
    dd { margin: 0; font-weight: 700; }
    .actions {
      position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 0.65rem;
      justify-content: center; margin-top: 0.85rem;
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes resultIn {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes orbFloat {
      0%, 100% { transform: translate3d(0, 0, 0); }
      50% { transform: translate3d(-3%, 4%, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .result-card, .result-orb, .spin { animation: none !important; }
    }
  `
})
export class PaymentReturnPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly walletService = inject(WalletService);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);

  verifying = true;
  state: 'ok' | 'cancelled' | 'error' | 'loading' = 'loading';
  error = '';
  result: PaymentVerifyResult | null = null;

  get isOrderPayment(): boolean {
    const purpose = this.result?.purpose;
    return purpose === 'BUY_NOW' || purpose === 'OFFER_SETTLEMENT';
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const authority = params.get('Authority') || params.get('authority') || '';
    const status = (params.get('Status') || params.get('status') || '').toUpperCase();

    if (!authority) {
      this.verifying = false;
      this.state = 'error';
      this.error = this.translate.instant('errors.PAYMENT_AUTHORITY_REQUIRED');
      return;
    }

    if (status && status !== 'OK') {
      this.walletService.cancel(authority).subscribe({
        next: () => {
          this.verifying = false;
          this.state = 'cancelled';
        },
        error: () => {
          this.verifying = false;
          this.state = 'cancelled';
        }
      });
      return;
    }

    this.walletService.verify(authority).subscribe({
      next: (result) => {
        this.result = result;
        this.verifying = false;
        this.state = 'ok';
      },
      error: (err) => {
        this.verifying = false;
        this.state = 'error';
        this.error = this.apiError.resolve(err);
      }
    });
  }
}
