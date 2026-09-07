import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { DomainListing } from '../../services/listings.service';
import { ListingOffer, OffersService, UpsertOfferPayload } from '../../services/offers.service';
import { toLatinDigits } from '../../utils/locale-digits';
import { LocaleCurrencyPipe } from '../../pipes/locale-format.pipe';

export interface OfferDialogData {
  mode: 'create' | 'counter';
  listing?: DomainListing | null;
  offer?: ListingOffer | null;
}

@Component({
  selector: 'app-offer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    TranslateModule,
    LocaleCurrencyPipe
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.mode === 'create' ? 'offers.form.createTitle' : 'offers.form.counterTitle') | translate }}
    </h2>
    <mat-dialog-content class="dialog-body">
      <p class="domain-line" dir="ltr">{{ domainName }}</p>
      @if (askingPrice != null) {
        <p class="asking">
          <span class="asking-label">{{ 'offers.form.askingPrice' | translate }}</span>
          <span class="asking-price" dir="ltr">{{ askingPrice | localeCurrency }}</span>
        </p>
      }
      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full amount-field" subscriptSizing="dynamic">
          <mat-label>{{ 'offers.form.amount' | translate }} (IRT)</mat-label>
          <input
            matInput
            type="text"
            inputmode="numeric"
            autocomplete="off"
            dir="ltr"
            class="amount-input"
            [value]="amountDisplay"
            (input)="onAmountInput($event)"
            (blur)="form.controls.amount.markAsTouched()">
          @if (form.controls.amount.touched && form.controls.amount.invalid) {
            <mat-error>{{ 'offers.form.amountInvalid' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'offers.form.message' | translate }}</mat-label>
          <textarea matInput rows="3" formControlName="message" maxlength="1000"></textarea>
          <mat-hint align="end">{{ (form.controls.message.value || '').length }}/1000</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button"
              [disabled]="form.invalid || saving"
              (click)="submit()">
        {{ (saving ? 'offers.form.saving' : (data.mode === 'create' ? 'offers.form.submit' : 'offers.form.counter')) | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body {
      min-width: min(100%, 420px);
      padding-top: 8px !important;
    }
    .domain-line {
      margin: 0 0 6px;
      font-weight: 700;
      font-size: 1.05rem;
      unicode-bidi: isolate;
    }
    .asking {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px 10px;
      margin: 0 0 12px;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .asking-label {
      flex: 0 1 auto;
    }
    .asking-price {
      direction: ltr;
      unicode-bidi: isolate;
      text-align: left;
      font-variant-numeric: tabular-nums;
      font-weight: 650;
      color: var(--text-primary);
      letter-spacing: 0.01em;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .full { width: 100%; }
    .amount-field .amount-input,
    .amount-field input[dir='ltr'] {
      direction: ltr !important;
      text-align: left !important;
      unicode-bidi: isolate;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.01em;
    }
    :host-context(html[dir='rtl']) .amount-field .mat-mdc-form-field-infix,
    :host-context([dir='rtl']) .amount-field .mat-mdc-form-field-infix {
      text-align: left;
    }
    :host-context(html[dir='rtl']) .amount-field input,
    :host-context([dir='rtl']) .amount-field input {
      direction: ltr !important;
      text-align: left !important;
    }
  `]
})
export class OfferDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly offersService = inject(OffersService);
  private readonly dialogRef = inject(MatDialogRef<OfferDialogComponent, ListingOffer | null>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  readonly data = inject<OfferDialogData>(MAT_DIALOG_DATA);

  saving = false;
  amountDisplay = '0';
  domainName = '';
  askingPrice: number | null = null;

  readonly form = this.fb.nonNullable.group({
    amount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    message: ['']
  });

  ngOnInit(): void {
    const listing = this.data.listing;
    const offer = this.data.offer;
    this.domainName = listing?.domainName || offer?.domainName || '';
    this.askingPrice = listing?.askingPrice ?? offer?.askingPrice ?? null;
    const seed = Math.max(0, Math.floor(Number(
      this.data.mode === 'counter'
        ? (offer?.amount ?? listing?.askingPrice ?? 0)
        : (listing?.askingPrice ?? 0)
    )));
    this.form.patchValue({ amount: seed, message: '' });
    this.amountDisplay = this.formatGrouped(seed);
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = toLatinDigits(input.value).replace(/\D/g, '');
    const amount = digits === '' ? 0 : Number(digits);
    if (!Number.isFinite(amount) || amount < 0) {
      this.form.controls.amount.setValue(0);
      this.amountDisplay = '0';
      input.value = this.amountDisplay;
      return;
    }
    this.form.controls.amount.setValue(amount);
    this.form.controls.amount.markAsDirty();
    this.amountDisplay = this.formatGrouped(amount);
    input.value = this.amountDisplay;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    const payload: UpsertOfferPayload = {
      amount: Number(raw.amount),
      message: String(raw.message || '').trim()
    };
    this.saving = true;
    const req$ = this.data.mode === 'create'
      ? this.offersService.create(this.data.listing!.id, payload)
      : this.offersService.counter(this.data.offer!.id, payload);

    req$.subscribe({
      next: (offer) => {
        this.saving = false;
        this.snackBar.open(this.translate.instant(
          this.data.mode === 'create' ? 'offers.toast.created' : 'offers.toast.countered'
        ), undefined, { duration: 3000 });
        this.dialogRef.close(offer);
      },
      error: (error) => {
        this.saving = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private formatGrouped(value: number): string {
    return Math.floor(Math.max(0, value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
