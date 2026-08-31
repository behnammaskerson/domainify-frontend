import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
    MatSnackBarModule,
    AuthShellComponent
  ],
  template: `
    <app-auth-shell
      [title]="'auth.forgotPassword.title' | translate"
      [subtitle]="'auth.forgotPassword.subtitle' | translate"
      [headline]="'auth.forgotPassword.heroTitle' | translate"
      [support]="'auth.forgotPassword.heroSupport' | translate">
      <form class="auth-form" [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-icon matPrefix>mail</mat-icon>
          <mat-label>{{ 'auth.forgotPassword.email' | translate }}</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="email">
          @if (forgotForm.get('email')?.hasError('required')) {
            <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
          }
          @if (forgotForm.get('email')?.hasError('email')) {
            <mat-error>{{ 'auth.validation.email' | translate }}</mat-error>
          }
        </mat-form-field>

        <button mat-flat-button
                color="primary"
                class="full-width submit-btn"
                [disabled]="forgotForm.invalid || isLoading"
                type="submit">
          @if (isLoading) {
            <mat-progress-spinner diameter="20" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
          } @else {
            <span>{{ 'auth.forgotPassword.sendReset' | translate }}</span>
          }
        </button>
      </form>

      <div class="form-footer">
        <a routerLink="/login" class="back-link">
          <mat-icon>arrow_back</mat-icon>
          {{ 'auth.forgotPassword.back' | translate }}
        </a>
      </div>
    </app-auth-shell>
  `,
  styles: [`
    .auth-form {
      display: flex;
      flex-direction: column;
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    .submit-btn {
      height: 48px !important;
      font-size: 1rem !important;
      font-weight: 700 !important;
      border-radius: var(--radius-md) !important;
      margin-top: 8px;
    }

    .form-footer {
      margin-top: 28px;
      text-align: center;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--accent);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .back-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: inherit;
    }

    .back-link:hover {
      text-decoration: underline;
      color: var(--accent-dark);
    }

    [dir="rtl"] .back-link mat-icon {
      transform: scaleX(-1);
    }
  `]
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  isLoading = false;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private http = inject(HttpClient);
  private translateService = inject(TranslateService);
  private readonly API_URL = 'http://localhost:8080/api';

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.http.post(`${this.API_URL}/auth/forgot-password`, this.forgotForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open(this.translateService.instant('auth.messages.resetEmailSent'), this.translateService.instant('common.close'), {
          duration: 3500
        });
        this.router.navigate(['/login']);
      },
      error: () => {
        this.isLoading = false;
        // Still show success-style message to avoid email enumeration
        this.snackBar.open(this.translateService.instant('auth.messages.resetEmailSent'), this.translateService.instant('common.close'), {
          duration: 3500
        });
        this.router.navigate(['/login']);
      }
    });
  }
}
