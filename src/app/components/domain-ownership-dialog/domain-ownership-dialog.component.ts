import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import {
  DomainItem,
  DomainOwnershipChallenge,
  DomainOwnershipMethod,
  DomainsService
} from '../../services/domains.service';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { Clipboard } from '@angular/cdk/clipboard';

export interface DomainOwnershipDialogData {
  domain: DomainItem;
}

@Component({
  selector: 'app-domain-ownership-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatRadioModule,
    MatSnackBarModule,
    ClipboardModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'domains.ownership.title' | translate }}</h2>
    <mat-dialog-content>
      <p class="intro">
        {{ 'domains.ownership.intro' | translate:{ domain: data.domain.name } }}
      </p>

      @if (!challenge) {
        <form [formGroup]="form" class="method-form">
          <label class="method-label">{{ 'domains.ownership.chooseMethod' | translate }}</label>
          <mat-radio-group formControlName="method" class="method-group">
            <mat-radio-button value="DNS_TXT">{{ 'domains.ownership.methods.DNS_TXT' | translate }}</mat-radio-button>
            <mat-radio-button value="HTTP_FILE">{{ 'domains.ownership.methods.HTTP_FILE' | translate }}</mat-radio-button>
          </mat-radio-group>
        </form>
      } @else {
        <div class="challenge">
          <p class="status-line">
            <span class="ownership-pill pending">{{ 'domains.ownershipStatus.pending' | translate }}</span>
            <span class="method-tag">{{ ('domains.ownership.methods.' + challenge.method) | translate }}</span>
          </p>

          @if (challenge.method === 'DNS_TXT') {
            <p class="hint">{{ 'domains.ownership.dnsHint' | translate }}</p>
            <div class="field-block">
              <span class="field-label">{{ 'domains.ownership.dnsHost' | translate }}</span>
              <code dir="ltr">{{ challenge.dnsHost }}</code>
              <button mat-icon-button type="button" (click)="copy(challenge.dnsHost!)" [attr.aria-label]="'common.copy' | translate">
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>
            <div class="field-block">
              <span class="field-label">{{ 'domains.ownership.dnsType' | translate }}</span>
              <code dir="ltr">{{ challenge.dnsType }}</code>
            </div>
            <div class="field-block">
              <span class="field-label">{{ 'domains.ownership.dnsValue' | translate }}</span>
              <code dir="ltr">{{ challenge.dnsValue }}</code>
              <button mat-icon-button type="button" (click)="copy(challenge.dnsValue!)" [attr.aria-label]="'common.copy' | translate">
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>
          } @else {
            <p class="hint">{{ 'domains.ownership.httpHint' | translate }}</p>
            <div class="field-block">
              <span class="field-label">{{ 'domains.ownership.httpUrl' | translate }}</span>
              <code dir="ltr">{{ challenge.httpUrl }}</code>
              <button mat-icon-button type="button" (click)="copy(challenge.httpUrl!)" [attr.aria-label]="'common.copy' | translate">
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>
            <div class="field-block">
              <span class="field-label">{{ 'domains.ownership.httpBody' | translate }}</span>
              <code dir="ltr">{{ challenge.httpBody }}</code>
              <button mat-icon-button type="button" (click)="copy(challenge.httpBody!)" [attr.aria-label]="'common.copy' | translate">
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="busy">{{ 'common.close' | translate }}</button>
      @if (!challenge) {
        <button mat-flat-button color="primary" type="button" (click)="start()" [disabled]="form.invalid || busy">
          {{ (busy ? 'domains.ownership.starting' : 'domains.ownership.start') | translate }}
        </button>
      } @else {
        <button mat-stroked-button type="button" (click)="cancelChallenge()" [disabled]="busy">
          {{ 'domains.ownership.cancel' | translate }}
        </button>
        <button mat-flat-button color="primary" type="button" (click)="check()" [disabled]="busy">
          {{ (busy ? 'domains.ownership.checking' : 'domains.ownership.check') | translate }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .intro { margin: 0 0 16px; color: var(--text-muted); line-height: 1.45; }
    .method-form { display: flex; flex-direction: column; gap: 10px; }
    .method-label { font-weight: 600; font-size: 0.9rem; }
    .method-group { display: flex; flex-direction: column; gap: 8px; }
    .hint { margin: 0 0 12px; color: var(--text-muted); font-size: 0.88rem; }
    .status-line { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
    .ownership-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .ownership-pill.pending { background: color-mix(in srgb, #d97706 14%, transparent); }
    .method-tag { font-size: 0.78rem; color: var(--text-muted); }
    .field-block {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
      padding: 8px 10px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
    }
    .field-label {
      flex: 0 0 100%;
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    code {
      flex: 1 1 auto;
      font-size: 0.82rem;
      word-break: break-all;
      color: var(--text-primary);
    }
    mat-dialog-content {
      min-width: min(100%, 420px);
      max-height: none !important;
      overflow: visible !important;
      overflow-y: visible !important;
    }
  `]
})
export class DomainOwnershipDialogComponent implements OnInit {
  private readonly domainsService = inject(DomainsService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly apiError = inject(ApiErrorService);
  private readonly clipboard = inject(Clipboard);
  private readonly dialogRef = inject(MatDialogRef<DomainOwnershipDialogComponent, DomainItem | null>);
  readonly data = inject<DomainOwnershipDialogData>(MAT_DIALOG_DATA);

  challenge: DomainOwnershipChallenge | null = null;
  busy = false;

  readonly form = this.fb.nonNullable.group({
    method: this.fb.nonNullable.control<DomainOwnershipMethod>('DNS_TXT', Validators.required)
  });

  ngOnInit(): void {
    if (this.data.domain.ownershipStatus === 'PENDING') {
      this.busy = true;
      this.domainsService.getOwnershipChallenge(this.data.domain.id).subscribe({
        next: (challenge) => {
          this.challenge = challenge;
          this.busy = false;
        },
        error: () => {
          this.busy = false;
        }
      });
    }
  }

  start(): void {
    if (this.form.invalid || this.busy) {
      return;
    }
    this.busy = true;
    this.domainsService.startOwnership(this.data.domain.id, this.form.controls.method.value).subscribe({
      next: (challenge) => {
        this.challenge = challenge;
        this.busy = false;
      },
      error: (error) => {
        this.busy = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  check(): void {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.domainsService.checkOwnership(this.data.domain.id).subscribe({
      next: (domain) => {
        this.busy = false;
        this.snackBar.open(this.translate.instant('domains.ownership.verified'), undefined, { duration: 2800 });
        this.dialogRef.close(domain);
      },
      error: (error) => {
        this.busy = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 6000, panelClass: ['error-snackbar'] });
      }
    });
  }

  cancelChallenge(): void {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.domainsService.cancelOwnership(this.data.domain.id).subscribe({
      next: (domain) => {
        this.busy = false;
        this.challenge = null;
        this.snackBar.open(this.translate.instant('domains.ownership.cancelled'), undefined, { duration: 2500 });
        this.dialogRef.close(domain);
      },
      error: (error) => {
        this.busy = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }

  copy(value: string): void {
    if (this.clipboard.copy(value)) {
      this.snackBar.open(this.translate.instant('common.copied'), undefined, { duration: 1800 });
    }
  }
}
