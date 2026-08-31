import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService, TotpEnableResponse, TotpSetupResponse } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';

export type TotpSetupDialogResult =
  | { enabled: true; backupCodes: string[]; user: TotpEnableResponse['user'] }
  | { enabled: false };

@Component({
  selector: 'app-totp-setup-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'settings.totp.setupTitle' | translate }}</h2>
    <mat-dialog-content>
      @if (loadingSetup) {
        <div class="center">
          <mat-progress-spinner diameter="36" mode="indeterminate"></mat-progress-spinner>
        </div>
      } @else if (step === 'scan') {
        <p class="hint">{{ 'settings.totp.setupScan' | translate }}</p>
        @if (setup?.qrCodeDataUri) {
          <img class="qr" [src]="setup!.qrCodeDataUri" alt="TOTP QR code" width="200" height="200">
        }
        <div class="secret-box">
          <span class="secret-label">{{ 'settings.totp.manualSecret' | translate }}</span>
          <code dir="ltr">{{ setup?.secret }}</code>
          <button mat-icon-button type="button" (click)="copySecret()" [attr.aria-label]="'common.copy' | translate">
            <mat-icon>content_copy</mat-icon>
          </button>
        </div>
        <form [formGroup]="codeForm" (ngSubmit)="enable()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'settings.totp.code' | translate }}</mat-label>
            <input matInput formControlName="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" dir="ltr">
          </mat-form-field>
        </form>
      } @else {
        <p class="hint warn">{{ 'settings.totp.backupIntro' | translate }}</p>
        <ul class="backup-list" dir="ltr">
          @for (code of backupCodes; track code) {
            <li><code>{{ code }}</code></li>
          }
        </ul>
        <button mat-stroked-button type="button" (click)="copyBackupCodes()">
          <mat-icon>content_copy</mat-icon>
          {{ 'settings.totp.copyBackup' | translate }}
        </button>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (step === 'scan') {
        <button mat-button type="button" mat-dialog-close [disabled]="saving">
          {{ 'common.cancel' | translate }}
        </button>
        <button mat-flat-button color="primary" type="button" (click)="enable()" [disabled]="codeForm.invalid || saving">
          @if (saving) {
            <mat-progress-spinner diameter="18" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
          } @else {
            {{ 'settings.totp.enable' | translate }}
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

    .hint.warn {
      color: var(--warning);
    }

    .qr {
      display: block;
      margin: 0 auto 16px;
      border-radius: 12px;
      background: #fff;
      padding: 8px;
    }

    .secret-box {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
    }

    .secret-label {
      width: 100%;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .secret-box code {
      flex: 1;
      font-size: 0.92rem;
      word-break: break-all;
      color: var(--text-primary);
    }

    .full-width { width: 100%; }

    .backup-list {
      list-style: none;
      margin: 0 0 16px;
      padding: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: var(--bg-secondary);
      border-radius: 10px;
      border: 1px solid var(--border-light);
    }

    .backup-list code {
      font-size: 0.95rem;
      letter-spacing: 0.04em;
    }

    .center {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    mat-dialog-actions button mat-progress-spinner {
      display: inline-block;
    }
  `]
})
export class TotpSetupDialogComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly apiError = inject(ApiErrorService);
  private readonly dialogRef = inject(MatDialogRef<TotpSetupDialogComponent, TotpSetupDialogResult>);

  loadingSetup = true;
  saving = false;
  step: 'scan' | 'backup' = 'scan';
  setup: TotpSetupResponse | null = null;
  backupCodes: string[] = [];
  private enabledUser: TotpEnableResponse['user'] | null = null;

  codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: Record<string, never>) {}

  ngOnInit(): void {
    this.auth.setupTotp().subscribe({
      next: (setup) => {
        this.setup = setup;
        this.loadingSetup = false;
      },
      error: (error) => {
        this.loadingSetup = false;
        this.snackBar.open(
          this.apiError.resolve(error) || this.translate.instant('settings.totp.setupFailed'),
          this.translate.instant('common.close'),
          { duration: 4000, panelClass: ['error-snackbar'] }
        );
        this.dialogRef.close({ enabled: false });
      }
    });
  }

  enable(): void {
    if (this.codeForm.invalid || this.saving) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.auth.enableTotp(this.codeForm.controls.code.value.trim()).subscribe({
      next: (response) => {
        this.saving = false;
        this.backupCodes = response.backupCodes;
        this.enabledUser = response.user;
        this.step = 'backup';
      },
      error: (error) => {
        this.saving = false;
        this.snackBar.open(
          this.apiError.resolve(error) || this.translate.instant('settings.totp.invalidCode'),
          this.translate.instant('common.close'),
          { duration: 4000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  copySecret(): void {
    if (!this.setup?.secret) {
      return;
    }
    navigator.clipboard.writeText(this.setup.secret);
    this.snackBar.open(this.translate.instant('settings.totp.secretCopied'), this.translate.instant('common.close'), {
      duration: 2000
    });
  }

  copyBackupCodes(): void {
    navigator.clipboard.writeText(this.backupCodes.join('\n'));
    this.snackBar.open(this.translate.instant('settings.totp.backupCopied'), this.translate.instant('common.close'), {
      duration: 2000
    });
  }

  finish(): void {
    if (this.enabledUser) {
      this.dialogRef.close({ enabled: true, backupCodes: this.backupCodes, user: this.enabledUser });
    } else {
      this.dialogRef.close({ enabled: false });
    }
  }
}
