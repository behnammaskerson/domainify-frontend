import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { DomainItem, DomainWhois, DomainsService } from '../../services/domains.service';
import { LocaleDatePipe } from '../../pipes/locale-format.pipe';

export interface DomainWhoisDialogData {
  domain: DomainItem;
}

@Component({
  selector: 'app-domain-whois-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    ClipboardModule,
    TranslateModule,
    LocaleDatePipe
  ],
  template: `
    <h2 mat-dialog-title>{{ 'domains.whois.title' | translate }}</h2>
    <mat-dialog-content class="dialog-body">
      <p class="intro">{{ 'domains.whois.intro' | translate:{ domain: data.domain.name } }}</p>

      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="36"></mat-spinner>
          <p>{{ 'domains.whois.loading' | translate }}</p>
        </div>
      } @else if (errorMessage) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>{{ errorMessage }}</p>
          <button mat-stroked-button type="button" (click)="reload()">
            <mat-icon>refresh</mat-icon>
            {{ 'common.retry' | translate }}
          </button>
        </div>
      } @else if (whois) {
        <section class="section">
          <h3>{{ 'domains.whois.sections.overview' | translate }}</h3>
          <div class="grid">
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.domain' | translate }}</span>
              <div class="value-row">
                <code dir="ltr">{{ whois.ldhName || whois.domainName }}</code>
                <button mat-icon-button type="button" (click)="copy(whois.ldhName || whois.domainName)"
                        [attr.aria-label]="'common.copy' | translate">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
            </div>
            @if (whois.unicodeName && whois.unicodeName !== whois.ldhName) {
              <div class="field">
                <span class="label">{{ 'domains.whois.fields.unicodeName' | translate }}</span>
                <code dir="ltr">{{ whois.unicodeName }}</code>
              </div>
            }
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.status' | translate }}</span>
              <div class="chips">
                @if (whois.statuses?.length) {
                  @for (status of whois.statuses; track status) {
                    <span class="method-pill">{{ status }}</span>
                  }
                } @else {
                  <span class="muted">—</span>
                }
              </div>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.dnssec' | translate }}</span>
              <span class="method-pill" [class.verified]="whois.dnssecSigned">
                {{ (whois.dnssecSigned ? 'domains.whois.dnssecSigned' : 'domains.whois.dnssecUnsigned') | translate }}
              </span>
            </div>
          </div>
        </section>

        <section class="section">
          <h3>{{ 'domains.whois.sections.dates' | translate }}</h3>
          <div class="grid">
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.registeredAt' | translate }}</span>
              <span>
                {{ whois.registeredAt
                  ? (whois.registeredAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric' })
                  : '—' }}
              </span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.updatedAt' | translate }}</span>
              <span>
                {{ whois.updatedAt
                  ? (whois.updatedAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric' })
                  : '—' }}
              </span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.expiresAt' | translate }}</span>
              <span>
                {{ whois.expiresAt
                  ? (whois.expiresAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric' })
                  : '—' }}
              </span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.checkedAt' | translate }}</span>
              <span>
                {{ whois.checkedAt
                  ? (whois.checkedAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—' }}
              </span>
            </div>
          </div>
        </section>

        <section class="section">
          <h3>{{ 'domains.whois.sections.registrar' | translate }}</h3>
          <div class="grid">
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.registrar' | translate }}</span>
              <span>{{ whois.registrar || '—' }}</span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.ianaId' | translate }}</span>
              <span dir="ltr">{{ whois.registrarIanaId || '—' }}</span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.email' | translate }}</span>
              <span dir="ltr">{{ whois.registrarEmail || '—' }}</span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.url' | translate }}</span>
              @if (whois.registrarUrl) {
                <a [href]="whois.registrarUrl" target="_blank" rel="noopener noreferrer" dir="ltr">{{ whois.registrarUrl }}</a>
              } @else {
                <span>—</span>
              }
            </div>
          </div>
        </section>

        <section class="section">
          <h3>{{ 'domains.whois.sections.registrant' | translate }}</h3>
          <p class="hint">{{ 'domains.whois.privacyHint' | translate }}</p>
          <div class="grid">
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.name' | translate }}</span>
              <span>{{ whois.registrantName || '—' }}</span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.organization' | translate }}</span>
              <span>{{ whois.registrantOrganization || '—' }}</span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.country' | translate }}</span>
              <span>{{ whois.registrantCountry || '—' }}</span>
            </div>
            <div class="field">
              <span class="label">{{ 'domains.whois.fields.email' | translate }}</span>
              <span dir="ltr">{{ whois.registrantEmail || '—' }}</span>
            </div>
          </div>
        </section>

        <section class="section">
          <h3>{{ 'domains.whois.sections.nameServers' | translate }}</h3>
          @if (whois.nameServers?.length) {
            <ul class="ns-list" dir="ltr">
              @for (ns of whois.nameServers; track ns) {
                <li>
                  <code>{{ ns }}</code>
                  <button mat-icon-button type="button" (click)="copy(ns)" [attr.aria-label]="'common.copy' | translate">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">—</p>
          }
        </section>

        @if (whois.rdapUrl) {
          <p class="source">
            <span class="label">{{ 'domains.whois.fields.source' | translate }}</span>
            <a [href]="whois.rdapUrl" target="_blank" rel="noopener noreferrer" dir="ltr">RDAP</a>
          </p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.close' | translate }}</button>
      @if (!loading) {
        <button mat-stroked-button type="button" (click)="reload()" [disabled]="loading">
          <mat-icon>refresh</mat-icon>
          {{ 'domains.whois.refresh' | translate }}
        </button>
      }
      @if (whois?.expiresAt) {
        <button mat-flat-button color="primary" type="button" (click)="applyExpiry()" [disabled]="applying">
          {{ 'domains.whois.applyExpiry' | translate }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body {
      min-width: min(100%, 560px);
      max-height: min(72vh, 720px);
    }

    .intro {
      margin: 0 0 16px;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 28px 12px;
      text-align: center;
      color: var(--text-muted);
    }

    .section {
      margin-bottom: 18px;
    }

    .section h3 {
      margin: 0 0 10px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .hint {
      margin: 0 0 10px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 16px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .value-row {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }

    code {
      font-family: var(--font-mono, ui-monospace, monospace);
      font-size: 0.85rem;
      word-break: break-all;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .method-pill.verified {
      background: var(--success-light);
      color: var(--success);
      border-color: transparent;
    }

    .ns-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ns-list li {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .source {
      margin: 8px 0 0;
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .muted { color: var(--text-muted); }

    a {
      color: var(--primary);
      word-break: break-all;
    }

    @media (max-width: 560px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .dialog-body {
        min-width: 0;
      }
    }
  `]
})
export class DomainWhoisDialogComponent implements OnInit {
  private readonly domainsService = inject(DomainsService);
  private readonly dialogRef = inject(MatDialogRef<DomainWhoisDialogComponent, { appliedExpiry?: boolean } | null>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  private readonly clipboard = inject(Clipboard);
  readonly data = inject<DomainWhoisDialogData>(MAT_DIALOG_DATA);

  loading = false;
  applying = false;
  whois: DomainWhois | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = null;
    this.whois = null;
    this.domainsService.lookupWhoisForDomain(this.data.domain.id).subscribe({
      next: (result) => {
        this.loading = false;
        this.whois = result;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.apiError.resolve(error);
      }
    });
  }

  copy(value: string): void {
    if (!value) {
      return;
    }
    this.clipboard.copy(value);
    this.snackBar.open(this.translate.instant('common.copied'), undefined, { duration: 2000 });
  }

  applyExpiry(): void {
    if (!this.whois?.expiresAt || !this.data.domain.id || this.applying) {
      return;
    }
    this.applying = true;
    this.domainsService.refreshExpiryFromRegistrar(this.data.domain.id).subscribe({
      next: () => {
        this.applying = false;
        this.snackBar.open(this.translate.instant('domains.form.expiryFetched'), undefined, { duration: 3000 });
        this.dialogRef.close({ appliedExpiry: true });
      },
      error: (error) => {
        this.applying = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
