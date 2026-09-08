import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { OfferDialogComponent } from '../offer-dialog/offer-dialog.component';
import { LocaleCurrencyPipe, LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { DomainListing } from '../../services/listings.service';
import { ListingOffer, OffersService } from '../../services/offers.service';

export interface ListingOffersDialogData {
  listing: DomainListing;
}

@Component({
  selector: 'app-listing-offers-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
    LocaleCurrencyPipe,
    LocaleDatePipe
  ],
  template: `
    <h2 mat-dialog-title>{{ 'offers.sellerTitle' | translate }}</h2>
    <mat-dialog-content class="dialog-body">
      <p class="domain-line" dir="ltr">{{ data.listing.domainName }}</p>
      @if (loading) {
        <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!offers.length) {
        <p class="empty">{{ 'offers.emptyForListing' | translate }}</p>
      } @else {
        <div class="offers-list">
          @for (offer of offers; track offer.id) {
            <article class="offer-card">
              <div class="offer-head">
                <strong>{{ offer.buyerName || ('offers.buyer' | translate) }}</strong>
                <span class="status-pill"
                      [class.active]="offer.status === 'ACCEPTED' || offer.status === 'PENDING'"
                      [class.pending]="offer.status === 'COUNTERED'"
                      [class.sold]="offer.status === 'REJECTED' || offer.status === 'WITHDRAWN' || offer.status === 'EXPIRED'">
                  {{ ('offers.status.' + offer.status) | translate }}
                </span>
              </div>
              <div class="offer-amount" dir="ltr">{{ offer.amount | localeCurrency }}</div>
              @if (offer.message) {
                <p class="offer-msg">{{ offer.message }}</p>
              }
              <p class="offer-meta cell-datetime">
                {{ offer.updatedAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } }}
              </p>
              @if (offer.status === 'PENDING') {
                <div class="offer-actions">
                  <button mat-flat-button color="primary" type="button" (click)="accept(offer)">
                    {{ 'offers.actions.accept' | translate }}
                  </button>
                  <button mat-stroked-button type="button" (click)="counter(offer)">
                    {{ 'offers.actions.counter' | translate }}
                  </button>
                  <button mat-button color="warn" type="button" (click)="reject(offer)">
                    {{ 'offers.actions.reject' | translate }}
                  </button>
                </div>
              }
              <button mat-button type="button" class="timeline-toggle" (click)="toggleTimeline(offer)">
                {{ 'offers.timeline' | translate }}
              </button>
              @if (expandedId === offer.id && detail) {
                <ul class="timeline">
                  @for (ev of detail.events || []; track ev.id) {
                    <li>
                      <span class="ev-action">{{ ('offers.events.' + ev.action) | translate }}</span>
                      @if (ev.amount != null) {
                        <span dir="ltr">{{ ev.amount | localeCurrency }}</span>
                      }
                      @if (ev.actorName) {
                        <span class="ev-actor">{{ ev.actorName }}</span>
                      }
                    </li>
                  }
                </ul>
              }
            </article>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body {
      min-width: min(100%, 520px);
      max-height: 70vh;
    }
    .domain-line { margin: 0 0 12px; font-weight: 700; }
    .loading, .empty { text-align: center; padding: 24px 0; color: var(--text-muted); }
    .offers-list { display: flex; flex-direction: column; gap: 12px; }
    .offer-card {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      background: var(--bg-primary);
    }
    .offer-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      margin-bottom: 6px;
    }
    .offer-amount { font-weight: 700; font-size: 1.05rem; }
    .offer-msg { margin: 6px 0 0; color: var(--text-secondary); font-size: 0.9rem; }
    .offer-meta { margin: 6px 0 0; }
    .offer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .timeline-toggle { margin-top: 4px; }
    .timeline {
      margin: 8px 0 0;
      padding-inline-start: 18px;
      color: var(--text-secondary);
      font-size: 0.85rem;
    }
    .timeline li { margin-bottom: 4px; }
    .ev-action { font-weight: 600; margin-inline-end: 6px; }
    .ev-actor { color: var(--text-muted); margin-inline-start: 6px; }
  `]
})
export class ListingOffersDialogComponent implements OnInit {
  private readonly offersService = inject(OffersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  private readonly dialogRef = inject(MatDialogRef<ListingOffersDialogComponent, boolean>);
  readonly data = inject<ListingOffersDialogData>(MAT_DIALOG_DATA);

  loading = false;
  offers: ListingOffer[] = [];
  expandedId: number | null = null;
  detail: ListingOffer | null = null;
  private changed = false;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.offersService.listForListing(this.data.listing.id, {
      page: 0,
      size: 50,
      sort: 'createdAt,desc'
    }).subscribe({
      next: (page) => {
        this.loading = false;
        this.offers = page.content ?? [];
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  toggleTimeline(offer: ListingOffer): void {
    if (this.expandedId === offer.id) {
      this.expandedId = null;
      this.detail = null;
      return;
    }
    this.expandedId = offer.id;
    this.offersService.get(offer.id).subscribe({
      next: (detail) => this.detail = detail,
      error: (error) => this.snackBar.open(this.apiError.resolve(error), undefined, {
        duration: 6000,
        panelClass: ['error-snackbar']
      })
    });
  }

  accept(offer: ListingOffer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'offers.confirm.acceptTitle',
        messageKey: 'offers.confirm.acceptMessage',
        messageParams: { domain: offer.domainName || this.data.listing.domainName },
        confirmKey: 'offers.actions.accept',
        confirmColor: 'primary' as const
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.offersService.accept(offer.id).subscribe({
        next: () => {
          this.changed = true;
          this.snackBar.open(this.translate.instant('offers.toast.acceptedPendingPay'), undefined, {
            duration: 4500
          });
          this.reload();
          this.dialogRef.close(true);
        },
        error: (error) => this.fail(error)
      });
    });
  }

  reject(offer: ListingOffer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'offers.confirm.rejectTitle',
        messageKey: 'offers.confirm.rejectMessage',
        messageParams: { domain: offer.domainName || this.data.listing.domainName },
        confirmKey: 'offers.actions.reject',
        confirmColor: 'warn' as const
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.offersService.reject(offer.id).subscribe({
        next: () => {
          this.changed = true;
          this.snackBar.open(this.translate.instant('offers.toast.rejected'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (error) => this.fail(error)
      });
    });
  }

  counter(offer: ListingOffer): void {
    const ref = this.dialog.open(OfferDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'app-dialog',
      data: { mode: 'counter', listing: this.data.listing, offer }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.changed = true;
        this.reload();
      }
    });
  }

  private fail(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
