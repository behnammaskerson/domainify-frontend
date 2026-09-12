import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { AuthShellComponent } from '../../auth/auth-shell/auth-shell.component';
import { CaptchaComponent, CaptchaResult } from '../../components/captcha/captcha.component';
import { ApiErrorService } from '../../services/api-error.service';
import {
  GuestTicketService,
  GuestTicketSummary
} from '../../services/guest-ticket.service';

@Component({
  selector: 'app-guest-ticket-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
    AuthShellComponent,
    CaptchaComponent
  ],
  template: `
    <app-auth-shell
      [compact]="true"
      [title]="'guestSupport.list.title' | translate"
      [subtitle]="'guestSupport.list.subtitle' | translate"
      [headline]="'guestSupport.list.heroTitle' | translate"
      [support]="'guestSupport.list.heroSupport' | translate">

      <a routerLink="/login" class="back-link">
        <mat-icon>arrow_back</mat-icon>
        {{ 'guestSupport.create.backToLogin' | translate }}
      </a>

      @if (tokenMode) {
        @if (listLoading) {
          <p class="muted">{{ 'guestSupport.list.loading' | translate }}</p>
        } @else if (!tickets.length) {
          <div class="empty">
            <mat-icon>inbox</mat-icon>
            <p>{{ 'guestSupport.list.empty' | translate }}</p>
            <a mat-stroked-button routerLink="/support/new">{{ 'guestSupport.list.newRequest' | translate }}</a>
          </div>
        } @else {
          <ul class="ticket-list">
            @for (ticket of tickets; track ticket.id) {
              <li class="ticket-row" [class.current]="ticket.current">
                <div class="ticket-meta">
                  <span class="ticket-id">{{ ticket.publicNumber || ('#' + ticket.id) }}</span>
                  <span class="chip status">{{ ('tickets.statuses.' + ticket.status) | translate }}</span>
                  <span class="chip priority">{{ ('tickets.priorities.' + ticket.priority) | translate }}</span>
                </div>
                <p class="ticket-subject">{{ ticket.subject }}</p>
                <div class="ticket-actions">
                  @if (ticket.current && ticket.accessToken) {
                    <a mat-flat-button color="primary" [routerLink]="['/support/t', ticket.accessToken]">
                      {{ 'guestSupport.list.open' | translate }}
                    </a>
                  } @else {
                    <button mat-flat-button color="primary" type="button"
                            [disabled]="openingId === ticket.id"
                            (click)="openTicket(ticket)">
                      @if (openingId === ticket.id) {
                        <mat-progress-spinner diameter="18" mode="indeterminate"></mat-progress-spinner>
                      } @else {
                        {{ 'guestSupport.list.open' | translate }}
                      }
                    </button>
                  }
                </div>
              </li>
            }
          </ul>
          <p class="footer-hint">{{ 'guestSupport.list.tokenHint' | translate }}</p>
        }
      } @else if (emailed) {
        <div class="empty">
          <mat-icon>mark_email_read</mat-icon>
          <h2>{{ 'guestSupport.list.emailedTitle' | translate }}</h2>
          <p>{{ 'guestSupport.list.emailedBody' | translate }}</p>
          <button mat-stroked-button type="button" (click)="emailed = false">
            {{ 'guestSupport.list.tryAgain' | translate }}
          </button>
        </div>
      } @else {
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submitLookup()">
          <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
            <mat-label>{{ 'guestSupport.list.email' | translate }}</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email">
          </mat-form-field>

          @if (captchaEnabled) {
            <app-captcha (captchaResult)="onCaptchaResult($event)"></app-captcha>
          }

          <button mat-flat-button color="primary" class="full-width submit-btn"
                  type="submit" [disabled]="form.invalid || submitting || (captchaEnabled && !captchaValid)">
            @if (submitting) {
              <mat-progress-spinner diameter="20" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
            } @else {
              {{ 'guestSupport.list.submit' | translate }}
            }
          </button>
        </form>
        <p class="footer-hint">{{ 'guestSupport.list.emailHint' | translate }}</p>
        <p class="footer-link">
          <a routerLink="/support/new">{{ 'guestSupport.list.newRequest' | translate }}</a>
        </p>
      }
    </app-auth-shell>
  `,
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 20px;
      color: var(--accent, #c9a227);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
    }
    .back-link mat-icon { font-size: 18px; width: 18px; height: 18px; color: inherit; }
    [dir="rtl"] .back-link mat-icon { transform: scaleX(-1); }
    .auth-form { display: grid; gap: 8px; width: 100%; }
    .full-width, .submit-btn { width: 100%; }
    .submit-btn { margin-top: 8px; height: 48px !important; font-weight: 700 !important; }
    .muted { color: var(--text-secondary); }
    .empty {
      text-align: center;
      display: grid;
      gap: 0.75rem;
      justify-items: center;
      padding: 1rem 0;
    }
    .empty mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: var(--accent, #c9a227); }
    .ticket-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    .ticket-row {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md, 10px);
      padding: 14px 16px;
      background: var(--bg-secondary, transparent);
    }
    .ticket-row.current { border-color: var(--accent, #c9a227); }
    .ticket-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 6px; }
    .ticket-id { font-weight: 700; font-size: 0.85rem; }
    .chip {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent, #c9a227) 16%, transparent);
    }
    .ticket-subject { margin: 0 0 12px; font-size: 1rem; line-height: 1.4; }
    .ticket-actions { display: flex; justify-content: flex-end; }
    .footer-hint {
      margin-top: 18px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.45;
    }
    .footer-link { text-align: center; margin-top: 12px; }
    .footer-link a { color: var(--accent, #c9a227); font-weight: 600; text-decoration: none; }
  `]
})
export class GuestTicketListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly guestTickets = inject(GuestTicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  tokenMode = false;
  accessToken = '';
  tickets: GuestTicketSummary[] = [];
  listLoading = false;
  submitting = false;
  emailed = false;
  captchaEnabled = false;
  captchaValid = false;
  captchaResult: CaptchaResult | null = null;
  openingId: number | null = null;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() || '';
    if (token) {
      this.tokenMode = true;
      this.accessToken = token;
      this.loadMine(token);
      return;
    }
    this.checkCaptchaEnabled();
  }

  onCaptchaResult(result: CaptchaResult | null): void {
    this.captchaResult = result;
    this.captchaValid = !!(result?.token && result?.answer);
  }

  submitLookup(): void {
    if (this.form.invalid || this.submitting || (this.captchaEnabled && !this.captchaValid)) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.guestTickets.lookupByEmail({
      email: this.form.controls.email.value.trim(),
      captchaToken: this.captchaResult?.token,
      captchaAnswer: this.captchaResult?.answer
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.emailed = true;
      },
      error: (error) => {
        this.submitting = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
      }
    });
  }

  openTicket(ticket: GuestTicketSummary): void {
    if (!this.accessToken || ticket.id == null) {
      return;
    }
    if (ticket.accessToken) {
      void this.router.navigate(['/support/t', ticket.accessToken]);
      return;
    }
    this.openingId = ticket.id;
    this.guestTickets.openRelated(this.accessToken, ticket.id).subscribe({
      next: (opened) => {
        this.openingId = null;
        if (opened.accessToken) {
          void this.router.navigate(['/support/t', opened.accessToken]);
        }
      },
      error: (error) => {
        this.openingId = null;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
      }
    });
  }

  private loadMine(token: string): void {
    this.listLoading = true;
    this.guestTickets.listMine(token).subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.listLoading = false;
      },
      error: (error) => {
        this.listLoading = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
        this.tokenMode = false;
        this.checkCaptchaEnabled();
      }
    });
  }

  private checkCaptchaEnabled(): void {
    fetch('http://localhost:8080/api/public/captcha/generate', { method: 'POST' })
      .then(r => r.json())
      .then((result: { token?: string; imageDataUrl?: string }) => {
        this.captchaEnabled = !!(result.token && result.imageDataUrl);
      })
      .catch(() => {
        this.captchaEnabled = false;
      });
  }
}
