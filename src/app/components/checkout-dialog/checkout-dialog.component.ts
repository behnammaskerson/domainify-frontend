import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocaleCurrencyPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { MarketplaceOrder, OrdersService } from '../../services/orders.service';
import { WalletService } from '../../services/wallet.service';

export interface CheckoutDialogData {
  order: MarketplaceOrder;
}

@Component({
  selector: 'app-checkout-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
    LocaleCurrencyPipe
  ],
  template: `
    <h2 mat-dialog-title>{{ 'orders.checkout.title' | translate }}</h2>
    <mat-dialog-content>
      <p class="domain" dir="ltr">{{ order.domainName }}</p>
      <dl class="facts">
        <div>
          <dt>{{ 'orders.checkout.gross' | translate }}</dt>
          <dd dir="ltr">{{ order.grossAmount | localeCurrency }}</dd>
        </div>
        <div>
          <dt>{{ 'orders.checkout.commission' | translate }}</dt>
          <dd dir="ltr">{{ order.commissionAmount | localeCurrency }}</dd>
        </div>
        <div>
          <dt>{{ 'orders.checkout.sellerNet' | translate }}</dt>
          <dd dir="ltr">{{ order.sellerNet | localeCurrency }}</dd>
        </div>
        @if (walletAvailable != null) {
          <div>
            <dt>{{ 'orders.checkout.walletAvailable' | translate }}</dt>
            <dd dir="ltr">{{ walletAvailable | localeCurrency }}</dd>
          </div>
        }
      </dl>
      @if (order.paymentDeadline) {
        <p class="deadline">{{ 'orders.checkout.deadline' | translate:{ when: order.paymentDeadline } }}</p>
      }
      @if (busy) {
        <div class="busy"><mat-spinner diameter="28"></mat-spinner></div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="null" [disabled]="busy">
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-stroked-button type="button" [disabled]="busy" (click)="payWallet()">
        <mat-icon>account_balance_wallet</mat-icon>
        {{ 'orders.checkout.payWallet' | translate }}
      </button>
      <button mat-flat-button color="primary" type="button" [disabled]="busy" (click)="payGateway()">
        <mat-icon>payments</mat-icon>
        {{ 'orders.checkout.payGateway' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .domain { margin: 0 0 1rem; font-weight: 700; font-size: 1.1rem; }
    .facts { margin: 0; padding: 0; display: grid; gap: 0.55rem; }
    .facts > div {
      display: flex; justify-content: space-between; gap: 1rem;
      padding: 0.65rem 0.8rem; border-radius: 10px; background: var(--bg-secondary);
    }
    dt { color: var(--text-muted); font-size: 0.85rem; }
    dd { margin: 0; font-weight: 700; }
    .deadline { margin: 0.85rem 0 0; color: var(--text-muted); font-size: 0.82rem; }
    .busy { display: flex; justify-content: center; padding: 0.75rem 0; }
    mat-dialog-actions button mat-icon { margin-inline-end: 4px; }
  `
})
export class CheckoutDialogComponent implements OnInit {
  private readonly data = inject<CheckoutDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CheckoutDialogComponent, MarketplaceOrder | null>);
  private readonly ordersService = inject(OrdersService);
  private readonly walletService = inject(WalletService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  order = this.data.order;
  walletAvailable: number | null = null;
  busy = false;

  ngOnInit(): void {
    this.walletService.getWallet(1).subscribe({
      next: (w) => { this.walletAvailable = Number(w.availableBalance ?? 0); },
      error: () => { this.walletAvailable = null; }
    });
  }

  payWallet(): void {
    if (this.busy) return;
    this.busy = true;
    this.ordersService.payWithWallet(this.order.id).subscribe({
      next: (paid) => {
        this.busy = false;
        this.snackBar.open(this.translate.instant('orders.toast.paid'), undefined, { duration: 3500 });
        this.dialogRef.close(paid);
      },
      error: (err) => {
        this.busy = false;
        this.snackBar.open(this.apiError.resolve(err), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  payGateway(): void {
    if (this.busy) return;
    this.busy = true;
    this.ordersService.payWithZarinPal(this.order.id).subscribe({
      next: (pay) => {
        this.busy = false;
        if (pay?.startPayUrl) {
          window.location.href = pay.startPayUrl;
          return;
        }
        this.snackBar.open(this.translate.instant('orders.toast.gatewayMissing'), undefined, {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      },
      error: (err) => {
        this.busy = false;
        this.snackBar.open(this.apiError.resolve(err), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
