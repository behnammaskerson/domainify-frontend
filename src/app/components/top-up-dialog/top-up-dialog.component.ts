import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { toLatinDigits } from '../../utils/locale-digits';

export interface TopUpDialogData {
  minTopUpIrt: number;
}

@Component({
  selector: 'app-top-up-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'wallet.topUp.title' | translate }}</h2>
    <mat-dialog-content>
      <p class="hint">{{ 'wallet.topUp.hint' | translate:{ min: minTopUpDisplay } }}</p>
      <form [formGroup]="form" class="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'wallet.topUp.amount' | translate }}</mat-label>
          <input matInput type="text" inputmode="numeric" autocomplete="off" dir="ltr"
                 [value]="amountDisplay"
                 (input)="onAmountInput($event)"
                 (blur)="form.controls.amountIrt.markAsTouched()">
          @if (form.controls.amountIrt.touched && form.controls.amountIrt.hasError('required')) {
            <mat-error>{{ 'wallet.topUp.amountRequired' | translate }}</mat-error>
          }
          @if (form.controls.amountIrt.touched && form.controls.amountIrt.hasError('min')) {
            <mat-error>{{ 'wallet.topUp.amountTooLow' | translate:{ min: minTopUpDisplay } }}</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="null">{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid" (click)="submit()">
        {{ 'wallet.topUp.continue' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .hint {
      margin: 0 0 1rem;
      opacity: 0.8;
      font-size: 0.9rem;
    }
    .form {
      display: block;
    }
    .full-width {
      width: 100%;
    }
  `
})
export class TopUpDialogComponent {
  readonly data = inject<TopUpDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TopUpDialogComponent, number | null>);
  private readonly fb = inject(FormBuilder);

  private readonly initialAmount = Math.max(0, Math.floor(Number(this.data.minTopUpIrt) || 0));
  readonly minTopUpDisplay = this.formatGrouped(this.initialAmount);
  amountDisplay = this.minTopUpDisplay;

  readonly form = this.fb.nonNullable.group({
    amountIrt: [this.initialAmount, [Validators.required, Validators.min(this.data.minTopUpIrt)]]
  });

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = toLatinDigits(input.value).replace(/\D/g, '');
    const amount = digits === '' ? 0 : Number(digits);
    if (!Number.isFinite(amount) || amount < 0) {
      this.form.controls.amountIrt.setValue(0);
      this.amountDisplay = this.formatGrouped(0);
      input.value = this.amountDisplay;
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
    this.dialogRef.close(Math.floor(this.form.controls.amountIrt.value));
  }

  private formatGrouped(value: number): string {
    return Math.floor(Math.max(0, value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
