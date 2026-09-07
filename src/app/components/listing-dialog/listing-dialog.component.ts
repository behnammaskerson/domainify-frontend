import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { DomainItem } from '../../services/domains.service';
import { DomainListing, ListingsService, UpsertListingPayload } from '../../services/listings.service';
import { toLatinDigits } from '../../utils/locale-digits';

export interface ListingDialogData {
  mode: 'create' | 'edit';
  domain?: DomainItem | null;
  listing?: DomainListing | null;
}

@Component({
  selector: 'app-listing-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.mode === 'create' ? 'listings.form.createTitle' : 'listings.form.editTitle') | translate }}
    </h2>
    <mat-dialog-content class="dialog-body">
      <p class="domain-line" dir="ltr">{{ domainName }}</p>
      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'listings.form.askingPrice' | translate }} (IRT)</mat-label>
          <input
            matInput
            type="text"
            inputmode="numeric"
            autocomplete="off"
            dir="ltr"
            [value]="priceDisplay"
            (input)="onPriceInput($event)"
            (blur)="form.controls.askingPrice.markAsTouched()">
          @if (form.controls.askingPrice.touched && form.controls.askingPrice.invalid) {
            <mat-error>{{ 'listings.form.priceInvalid' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'listings.form.description' | translate }}</mat-label>
          <textarea matInput rows="4" formControlName="description" maxlength="2000"></textarea>
          <mat-hint align="end">{{ (form.controls.description.value || '').length }}/2000</mat-hint>
        </mat-form-field>

        <mat-slide-toggle formControlName="featured" color="primary">
          {{ 'listings.form.featured' | translate }}
        </mat-slide-toggle>
        <p class="hint">{{ 'listings.form.featuredHint' | translate }}</p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button"
              [disabled]="form.invalid || saving"
              (click)="submit()">
        {{ (saving ? 'listings.form.saving' : 'common.save') | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body {
      min-width: min(100%, 420px);
      padding-top: 8px !important;
    }
    .domain-line {
      margin: 0 0 12px;
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--text-primary);
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .full { width: 100%; }
    .hint {
      margin: -4px 0 0;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
  `]
})
export class ListingDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly listingsService = inject(ListingsService);
  private readonly dialogRef = inject(MatDialogRef<ListingDialogComponent, DomainListing | null>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  readonly data = inject<ListingDialogData>(MAT_DIALOG_DATA);

  saving = false;
  priceDisplay = '0';
  domainName = '';

  readonly form = this.fb.nonNullable.group({
    askingPrice: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    description: [''],
    featured: [false]
  });

  ngOnInit(): void {
    const listing = this.data.listing;
    const domain = this.data.domain;
    this.domainName = listing?.domainName || domain?.name || '';
    const price = Math.max(0, Math.floor(Number(
      listing?.askingPrice ?? domain?.price ?? 0
    )));
    this.form.patchValue({
      askingPrice: price,
      description: listing?.description || '',
      featured: !!listing?.featured
    });
    this.priceDisplay = this.formatGrouped(price);
  }

  onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = toLatinDigits(input.value).replace(/\D/g, '');
    const price = digits === '' ? 0 : Number(digits);
    if (!Number.isFinite(price) || price < 0) {
      this.form.controls.askingPrice.setValue(0);
      this.priceDisplay = '0';
      input.value = this.priceDisplay;
      return;
    }
    this.form.controls.askingPrice.setValue(price);
    this.form.controls.askingPrice.markAsDirty();
    this.priceDisplay = this.formatGrouped(price);
    input.value = this.priceDisplay;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    const payload: UpsertListingPayload = {
      askingPrice: Number(raw.askingPrice),
      description: String(raw.description || '').trim(),
      featured: !!raw.featured
    };
    this.saving = true;
    const req$ = this.data.mode === 'create'
      ? this.listingsService.create({
          ...payload,
          domainId: this.data.domain?.id
        })
      : this.listingsService.update(this.data.listing!.id, payload);

    req$.subscribe({
      next: (listing) => {
        this.saving = false;
        this.snackBar.open(this.translate.instant(
          this.data.mode === 'create' ? 'listings.form.created' : 'listings.form.updated'
        ), undefined, { duration: 3000 });
        this.dialogRef.close(listing);
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
