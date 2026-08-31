import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService, User } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';

export interface TotpDisableDialogData {
  mode: 'disable' | 'regenerate';
}

export type TotpDisableDialogResult =
  | { action: 'disable'; user: User }
  | { action: 'regenerate'; backupCodes: string[]; user: User }
  | null;

@Component({
  selector: 'app-totp-disable-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.mode === 'disable' ? 'settings.totp.disableTitle' : 'settings.totp.regenerateTitle') | translate }}
    </h2>
    <mat-dialog-content>
      <p class="hint">
        {{ (data.mode === 'disable' ? 'settings.totp.disableHint' : 'settings.totp.regenerateHint') | translate }}
      </p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'settings.password.current' | translate }}</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="current-password">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'settings.totp.code' | translate }}</mat-label>
          <input matInput formControlName="code" inputmode="numeric" autocomplete="one-time-code" maxlength="16" dir="ltr">
        </mat-form-field>
      </form>

      @if (backupCodes.length) {
        <p class="hint warn">{{ 'settings.totp.backupIntro' | translate }}</p>
        <ul class="backup-list" dir="ltr">
          @for (code of backupCodes; track code) {
            <li><code>{{ code }}</code></li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="saving">
        {{ 'common.cancel' | translate }}
      </button>
      @if (!backupCodes.length) {
        <button mat-flat-button
                [color]="data.mode === 'disable' ? 'warn' : 'primary'"
                type="button"
                (click)="submit()"
                [disabled]="form.invalid || saving">
          @if (saving) {
            <mat-progress-spinner diameter="18" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
          } @else {
            {{ (data.mode === 'disable' ? 'settings.totp.disable' : 'settings.totp.regenerate') | translate }}
          }
        </button>
      } @else {
        <button mat-flat-button color="primary" type="button" (click)="finish()">
          {{ 'settings.totp.done' | translate }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    :host h2[mat-dialog-title] {
      color: var(--text-primary);
      font-family: var(--font-display);
      font-weight: 700;
    }

    .hint {
      margin: 0 0 16px;
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .hint.warn { color: var(--warning); }
    .full-width { width: 100%; }

    .backup-list {
      list-style: none;
      margin: 0;
      padding: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: var(--bg-secondary);
      border-radius: 10px;
      border: 1px solid var(--border-light);
    }
  `]
})
export class TotpDisableDialogComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly apiError = inject(ApiErrorService);
  private readonly dialogRef = inject(MatDialogRef<TotpDisableDialogComponent, TotpDisableDialogResult>);

  saving = false;
  backupCodes: string[] = [];
  private resultUser: User | null = null;

  form = this.fb.nonNullable.group({
    password: ['', Validators.required],
    code: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: TotpDisableDialogData) {}

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const { password, code } = this.form.getRawValue();

    if (this.data.mode === 'disable') {
      this.auth.disableTotp(password, code.trim()).subscribe({
        next: (user) => {
          this.saving = false;
          this.dialogRef.close({ action: 'disable', user });
        },
        error: (error) => this.fail(error)
      });
      return;
    }

    this.auth.regenerateBackupCodes(password, code.trim()).subscribe({
      next: (response) => {
        this.saving = false;
        this.backupCodes = response.backupCodes;
        this.resultUser = response.user;
      },
      error: (error) => this.fail(error)
    });
  }

  finish(): void {
    if (this.resultUser) {
      this.dialogRef.close({
        action: 'regenerate',
        backupCodes: this.backupCodes,
        user: this.resultUser
      });
    } else {
      this.dialogRef.close(null);
    }
  }

  private fail(error: unknown): void {
    this.saving = false;
    this.snackBar.open(
      this.apiError.resolve(error) || this.translate.instant('settings.totp.actionFailed'),
      this.translate.instant('common.close'),
      { duration: 4000, panelClass: ['error-snackbar'] }
    );
  }
}
