import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface TicketSavedViewDialogData {
  mode: 'create' | 'rename';
  name?: string;
  isDefault?: boolean;
}

export interface TicketSavedViewDialogResult {
  name: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-ticket-saved-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.mode === 'rename'
        ? 'tickets.adminInbox.savedViews.renameTitle'
        : 'tickets.adminInbox.savedViews.saveTitle') | translate }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>{{ 'tickets.adminInbox.savedViews.name' | translate }}</mat-label>
          <input matInput formControlName="name" maxlength="80"
                 [placeholder]="'tickets.adminInbox.savedViews.namePlaceholder' | translate">
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <mat-error>{{ 'tickets.adminInbox.savedViews.nameRequired' | translate }}</mat-error>
          }
        </mat-form-field>
        <label class="default-row">
          <mat-checkbox formControlName="isDefault">
            {{ 'tickets.adminInbox.savedViews.setDefault' | translate }}
          </mat-checkbox>
        </label>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid" (click)="submit()">
        {{ (data.mode === 'rename' ? 'common.save' : 'tickets.adminInbox.savedViews.save') | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }

    mat-dialog-content {
      max-height: none !important;
      overflow: visible !important;
      overflow-y: visible !important;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: min(100%, 360px);
      padding-top: 0.25rem;
    }

    .full { width: 100%; }

    .default-row {
      display: flex;
      align-items: center;
      margin: 0.25rem 0 0.5rem;
    }
  `
})
export class TicketSavedViewDialogComponent {
  readonly data = inject<TicketSavedViewDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TicketSavedViewDialogComponent, TicketSavedViewDialogResult | null>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.name ?? '', [Validators.required, Validators.maxLength(80)]],
    isDefault: [!!this.data.isDefault]
  });

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name.trim(),
      isDefault: raw.isDefault
    });
  }
}
