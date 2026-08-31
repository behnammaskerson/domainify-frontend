import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { ApiErrorService } from '../../services/api-error.service';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    TranslateModule,
    MatSnackBarModule,
    AuthShellComponent
  ],
  template: `
    <app-auth-shell
      [title]="(step === 'credentials' ? 'auth.login.title' : 'auth.login.totpTitle') | translate"
      [subtitle]="(step === 'credentials' ? 'auth.login.subtitle' : 'auth.login.totpSubtitle') | translate"
      [headline]="'auth.login.heroTitle' | translate"
      [support]="'auth.login.heroSupport' | translate">

      @if (step === 'credentials') {
        <form class="auth-form" [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-icon matPrefix>mail</mat-icon>
            <mat-label>{{ 'auth.login.email' | translate }}</mat-label>
            <input matInput formControlName="email" type="email" autocomplete="email">
            @if (loginForm.get('email')?.hasError('required')) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
            @if (loginForm.get('email')?.hasError('email')) {
              <mat-error>{{ 'auth.validation.email' | translate }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-icon matPrefix>lock</mat-icon>
            <mat-label>{{ 'auth.login.password' | translate }}</mat-label>
            <input matInput
                   formControlName="password"
                   [type]="hidePassword ? 'password' : 'text'"
                   autocomplete="current-password">
            <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword"
                    [attr.aria-label]="hidePassword ? ('a11y.showPassword' | translate) : ('a11y.hidePassword' | translate)">
              <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (loginForm.get('password')?.hasError('required')) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
          </mat-form-field>

          <div class="form-options">
            <mat-checkbox formControlName="rememberMe" color="primary">
              {{ 'auth.login.rememberMe' | translate }}
            </mat-checkbox>
            <a routerLink="/forgot-password" class="text-link">
              {{ 'auth.login.forgotPassword' | translate }}
            </a>
          </div>

          <button mat-flat-button
                  color="primary"
                  class="full-width submit-btn"
                  [disabled]="loginForm.invalid || isLoading"
                  type="submit">
            @if (isLoading) {
              <mat-progress-spinner diameter="20" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
            } @else {
              <span>{{ 'auth.login.login' | translate }}</span>
            }
          </button>
        </form>

        <div class="form-footer">
          <p>
            {{ 'auth.login.noAccount' | translate }}
            <a routerLink="/register" class="text-link">{{ 'auth.login.signUp' | translate }}</a>
          </p>
        </div>
      } @else {
        <form class="auth-form" [formGroup]="totpForm" (ngSubmit)="onVerifyTotp()">
          <p class="totp-hint">{{ 'auth.login.totpHint' | translate }}</p>

          <mat-form-field appearance="outline" class="full-width">
            <mat-icon matPrefix>pin</mat-icon>
            <mat-label>{{ 'auth.login.totpCode' | translate }}</mat-label>
            <input matInput
                   formControlName="code"
                   inputmode="numeric"
                   autocomplete="one-time-code"
                   maxlength="16"
                   dir="ltr">
            @if (totpForm.get('code')?.hasError('required')) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
          </mat-form-field>

          <button mat-flat-button
                  color="primary"
                  class="full-width submit-btn"
                  [disabled]="totpForm.invalid || isLoading"
                  type="submit">
            @if (isLoading) {
              <mat-progress-spinner diameter="20" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
            } @else {
              <span>{{ 'auth.login.verify' | translate }}</span>
            }
          </button>

          <button mat-button type="button" class="full-width back-btn" (click)="backToCredentials()" [disabled]="isLoading">
            {{ 'auth.login.backToLogin' | translate }}
          </button>
        </form>
      }
    </app-auth-shell>
  `,
  styles: [`
    .auth-form {
      display: flex;
      flex-direction: column;
    }

    .full-width {
      width: 100%;
      margin-bottom: 4px;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin: 4px 0 20px;
      flex-wrap: wrap;
    }

    .text-link {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .text-link:hover {
      text-decoration: underline;
      color: var(--accent-dark);
    }

    .submit-btn {
      height: 48px !important;
      font-size: 1rem !important;
      font-weight: 700 !important;
      border-radius: var(--radius-md) !important;
      letter-spacing: 0.01em;
    }

    .back-btn {
      margin-top: 8px;
    }

    .totp-hint {
      margin: 0 0 16px;
      color: var(--text-secondary);
      font-size: 0.92rem;
      line-height: 1.5;
    }

    .form-footer {
      margin-top: 28px;
      text-align: center;
    }

    .form-footer p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  totpForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  step: 'credentials' | 'totp' = 'credentials';
  private preAuthToken = '';

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translationService = inject(TranslationService);
  private translateService = inject(TranslateService);
  private apiError = inject(ApiErrorService);

  ngOnInit(): void {
    this.translateService.use(this.translationService.currentLang());
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });
    this.totpForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.requiresTotp && response.preAuthToken) {
          this.preAuthToken = response.preAuthToken;
          this.step = 'totp';
          this.totpForm.reset();
          return;
        }
        this.finishLoginSuccess(!!response.requiresPasswordChange);
      },
      error: (error) => {
        this.isLoading = false;
        this.showError(error, 'auth.messages.loginFailed');
      }
    });
  }

  onVerifyTotp(): void {
    if (this.totpForm.invalid || !this.preAuthToken) {
      this.totpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const code = String(this.totpForm.value.code ?? '').trim();

    this.authService.verifyTotpLogin(this.preAuthToken, code).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.finishLoginSuccess(!!response.requiresPasswordChange);
      },
      error: (error) => {
        this.isLoading = false;
        this.showError(error, 'auth.messages.totpFailed');
      }
    });
  }

  backToCredentials(): void {
    this.step = 'credentials';
    this.preAuthToken = '';
    this.totpForm.reset();
  }

  private finishLoginSuccess(requiresPasswordChange = false): void {
    if (requiresPasswordChange) {
      this.snackBar.open(
        this.translateService.instant('settings.password.expired'),
        this.translateService.instant('common.close'),
        { duration: 5000 }
      );
      this.router.navigate(['/settings'], { fragment: 'password' });
      return;
    }
    this.snackBar.open(
      this.translateService.instant('auth.messages.loginSuccess'),
      this.translateService.instant('common.close'),
      { duration: 3000 }
    );
    this.router.navigate(['/dashboard']);
  }

  private showError(error: unknown, fallbackKey: string): void {
    const message = this.apiError.resolve(error) || this.translateService.instant(fallbackKey);
    this.snackBar.open(message, this.translateService.instant('common.close'), {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }
}
