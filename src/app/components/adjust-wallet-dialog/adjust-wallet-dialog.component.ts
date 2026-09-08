import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { toLatinDigits } from '../../utils/locale-digits';

export interface AdjustWalletDialogData {
  userName: string;
  availableBalance?: number | null;
}

export interface AdjustWalletDialogResult {
  direction: 'CREDIT' | 'DEBIT';
  amountIrt: number;
  note: string;
}

@Component({
  selector: 'app-adjust-wallet-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'users.wallet.adjustTitle' | translate }}</h2>
    <mat-dialog-content>
      <p class="hint">{{ 'users.wallet.adjustHint' | translate:{ name: data.userName } }}</p>
      @if (data.availableBalance != null) {
        <p class="balance" dir="ltr">{{ 'users.wallet.currentBalance' | translate }}: {{ amountDisplayFor(data.availableBalance) }}</p>
      }
      <form [formGroup]="form" class="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'users.wallet.direction' | translate }}</mat-label>
          <mat-select formControlName="direction">
            <mat-option value="CREDIT">{{ 'users.wallet.credit' | translate }}</mat-option>
            <mat-option value="DEBIT">{{ 'users.wallet.debit' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'users.wallet.amount' | translate }}</mat-label>
          <input matInput type="text" inputmode="numeric" autocomplete="off" dir="ltr"
                 [value]="amountDisplay"
                 (input)="onAmountInput($event)"
                 (blur)="form.controls.amountIrt.markAsTouched()">
          @if (form.controls.amountIrt.touched && form.controls.amountIrt.invalid) {
            <mat-error>{{ 'users.wallet.amountInvalid' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'users.wallet.note' | translate }}</mat-label>
          <textarea matInput rows="3" formControlName="note"></textarea>
          @if (form.controls.note.touched && form.controls.note.invalid) {
            <mat-error>{{ 'users.wallet.noteRequired' | translate }}</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="null">{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid" (click)="submit()">
        {{ 'users.wallet.apply' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .hint, .balance { margin: 0 0 0.85rem; color: var(--text-muted); font-size: 0.9rem; }
    .balance { font-weight: 600; color: var(--text-primary); }
    .full-width { width: 100%; }
    .form { display: grid; gap: 0.15rem; }
  `
})
export class AdjustWalletDialogComponent {
  readonly data = inject<AdjustWalletDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AdjustWalletDialogComponent, AdjustWalletDialogResult | null>);
  private readonly fb = inject(FormBuilder);

  amountDisplay = '';

  readonly form = this.fb.nonNullable.group({
    direction: this.fb.nonNullable.control<'CREDIT' | 'DEBIT'>('CREDIT', Validators.required),
    amountIrt: [0, [Validators.required, Validators.min(1)]],
    note: ['', [Validators.required, Validators.maxLength(500)]]
  });

  amountDisplayFor(value: number | null | undefined): string {
    return this.formatGrouped(Math.max(0, Math.floor(Number(value || 0))));
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = toLatinDigits(input.value).replace(/\D/g, '');
    const amount = digits === '' ? 0 : Number(digits);
    if (!Number.isFinite(amount) || amount < 0) {
      this.form.controls.amountIrt.setValue(0);
      this.amountDisplay = '';
      input.value = '';
      return;
    }
    this.form.controls.amountIrt.setValue(amount);
    this.form.controls.amountIrt.markAsDirty();
    this.amountDisplay = this.formatGrouped(amount);
    input.value = this.amountDisplay;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      direction: raw.direction,
      amountIrt: Math.floor(raw.amountIrt),
      note: raw.note.trim()
    });
  }

  private formatGrouped(value: number): string {
    return Math.floor(Math.max(0, value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
