import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface TicketCloneDialogData {
  sourcePublicNumber?: string;
  sourceSubject?: string;
}

export interface TicketCloneDialogResult {
  subject: string;
}

@Component({
  selector: 'app-ticket-clone-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.cloneTitle' | translate }}</h2>
    <mat-dialog-content class="clone-content">
      <p class="clone-intro">
        {{ 'tickets.detail.cloneIntro' | translate: { number: data.sourcePublicNumber || '—' } }}
      </p>
      <p class="clone-hint">{{ 'tickets.detail.cloneHint' | translate }}</p>

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
          <mat-label>{{ 'tickets.detail.cloneSubjectLabel' | translate }}</mat-label>
          <input matInput formControlName="subject" maxlength="200" autocomplete="off" />
          @if (form.controls.subject.hasError('required')) {
            <mat-error>{{ 'tickets.detail.cloneSubjectRequired' | translate }}</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" type="button" [disabled]="!canSubmit" (click)="confirm()">
        {{ 'tickets.detail.cloneConfirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host h2[mat-dialog-title] {
      color: var(--text-primary);
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .clone-content {
      min-width: 360px;
      max-width: 480px;
    }

    .clone-intro,
    .clone-hint {
      margin: 0 0 12px;
      color: var(--text-secondary);
      line-height: 1.5;
      font-size: 0.92rem;
    }

    .clone-hint {
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .full-width {
      width: 100%;
    }
  `]
})
export class TicketCloneDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TicketCloneDialogComponent, TicketCloneDialogResult>);
  readonly data = inject<TicketCloneDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    subject: [this.defaultSubject(), [Validators.required, Validators.maxLength(200)]]
  });

  get canSubmit(): boolean {
    return this.form.valid;
  }

  confirm(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ subject: this.form.controls.subject.value.trim() });
  }

  private defaultSubject(): string {
    const base = (this.data.sourceSubject || '').trim();
    if (!base) {
      return '';
    }
    const suffix = ' (copy)';
    if (base.length + suffix.length <= 200) {
      return base + suffix;
    }
    return base.slice(0, Math.max(0, 200 - suffix.length)) + suffix;
  }
}
