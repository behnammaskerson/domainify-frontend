import { Component, OnInit, inject } from '@angular/core';
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
import { AuthService } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';
import { PasswordPolicyService } from '../../services/password-policy.service';
import { buildPasswordValidators } from '../../utils/password-policy.validators';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

@Component({
  selector: 'app-register',
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
      [title]="'auth.register.title' | translate"
      [subtitle]="'auth.register.subtitle' | translate"
      [headline]="'auth.register.heroTitle' | translate"
      [support]="'auth.register.heroSupport' | translate">
      <form class="auth-form" [formGroup]="registerForm" (ngSubmit)="onSubmit()">
        <div class="name-fields">
          <mat-form-field appearance="outline" class="half-width">
            <mat-icon matPrefix>person</mat-icon>
            <mat-label>{{ 'auth.register.firstName' | translate }}</mat-label>
            <input matInput formControlName="firstName" autocomplete="given-name">
            @if (registerForm.get('firstName')?.hasError('required')) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-icon matPrefix>badge</mat-icon>
            <mat-label>{{ 'auth.register.lastName' | translate }}</mat-label>
            <input matInput formControlName="lastName" autocomplete="family-name">
            @if (registerForm.get('lastName')?.hasError('required')) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-icon matPrefix>mail</mat-icon>
          <mat-label>{{ 'auth.register.email' | translate }}</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="email">
          @if (registerForm.get('email')?.hasError('required')) {
            <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
          }
          @if (registerForm.get('email')?.hasError('email')) {
            <mat-error>{{ 'auth.validation.email' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-icon matPrefix>lock</mat-icon>
          <mat-label>{{ 'auth.register.password' | translate }}</mat-label>
          <input matInput
                 formControlName="password"
                 [type]="hidePassword ? 'password' : 'text'"
                 autocomplete="new-password">
          <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword"
                  [attr.aria-label]="hidePassword ? ('a11y.showPassword' | translate) : ('a11y.hidePassword' | translate)">
            <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (registerForm.get('password')?.hasError('required')) {
            <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
          }
          @if (registerForm.get('password')?.hasError('policyMinLength')) {
            <mat-error>{{ 'settings.passwordPolicy.reqMinLength' | translate:{ n: registerForm.get('password')?.getError('policyMinLength')?.requiredLength } }}</mat-error>
          }
          @if (registerForm.get('password')?.hasError('policyUppercase')) {
            <mat-error>{{ 'settings.passwordPolicy.reqUppercase' | translate }}</mat-error>
          }
          @if (registerForm.get('password')?.hasError('policyLowercase')) {
            <mat-error>{{ 'settings.passwordPolicy.reqLowercase' | translate }}</mat-error>
          }
          @if (registerForm.get('password')?.hasError('policyDigit')) {
            <mat-error>{{ 'settings.passwordPolicy.reqDigit' | translate }}</mat-error>
          }
          @if (registerForm.get('password')?.hasError('policySpecial')) {
            <mat-error>{{ 'settings.passwordPolicy.reqSpecial' | translate }}</mat-error>
          }
          @if (registerForm.get('password')?.value) {
            <mat-hint>
              <div class="password-strength">
                <div class="strength-track">
                  <div class="strength-bar"
                       [class.weak]="strength < 3"
                       [class.medium]="strength >= 3 && strength < 4"
                       [class.strong]="strength >= 4"
                       [style.width.%]="strength * 25"></div>
                </div>
                <span [class.weak]="strength < 3"
                      [class.medium]="strength >= 3 && strength < 4"
                      [class.strong]="strength >= 4">
                  {{ strengthLabelKey | translate }}
                </span>
              </div>
            </mat-hint>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-icon matPrefix>lock_clock</mat-icon>
          <mat-label>{{ 'auth.register.confirmPassword' | translate }}</mat-label>
          <input matInput
                 formControlName="confirmPassword"
                 [type]="hideConfirm ? 'password' : 'text'"
                 autocomplete="new-password">
          <button mat-icon-button matSuffix type="button" (click)="hideConfirm = !hideConfirm"
                  [attr.aria-label]="hideConfirm ? ('a11y.showPassword' | translate) : ('a11y.hidePassword' | translate)">
            <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (registerForm.get('confirmPassword')?.hasError('required')) {
            <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
          }
          @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched) {
            <mat-error>{{ 'auth.validation.passwordMismatch' | translate }}</mat-error>
          }
        </mat-form-field>

        <button mat-flat-button
                color="primary"
                class="full-width submit-btn"
                [disabled]="registerForm.invalid || isLoading"
                type="submit">
          @if (isLoading) {
            <mat-progress-spinner diameter="20" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
          } @else {
            <span>{{ 'auth.register.register' | translate }}</span>
          }
        </button>
      </form>

      <div class="form-footer">
        <p>
          {{ 'auth.register.alreadyHave' | translate }}
          <a routerLink="/login" class="text-link">{{ 'auth.register.signIn' | translate }}</a>
        </p>
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
      margin-bottom: 4px;
    }

    .name-fields {
      display: flex;
      gap: 12px;
    }

    .half-width {
      flex: 1;
      min-width: 0;
    }

    .submit-btn {
      height: 48px !important;
      font-size: 1rem !important;
      font-weight: 700 !important;
      border-radius: var(--radius-md) !important;
      margin-top: 8px;
    }

    .password-strength {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 4px;
    }

    .strength-track {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background: var(--border-color);
      overflow: hidden;
    }

    .strength-bar {
      height: 100%;
      border-radius: 2px;
      transition: width 0.25s ease, background 0.25s ease;
    }

    .strength-bar.weak { background: var(--danger); }
    .strength-bar.medium { background: var(--warning); }
    .strength-bar.strong { background: var(--success); }

    .password-strength span {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .password-strength span.weak { color: var(--danger); }
    .password-strength span.medium { color: var(--warning); }
    .password-strength span.strong { color: var(--success); }

    .form-footer {
      margin-top: 28px;
      text-align: center;
    }

    .form-footer p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    .text-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }

    .text-link:hover {
      text-decoration: underline;
      color: var(--accent-dark);
    }

    @media (max-width: 520px) {
      .name-fields {
        flex-direction: column;
        gap: 0;
      }
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirm = true;
  strength = 0;
  private policyMinLength = 8;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private passwordPolicyService = inject(PasswordPolicyService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translateService = inject(TranslateService);
  private apiError = inject(ApiErrorService);

  constructor() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.registerForm.get('password')?.valueChanges.subscribe((value: string) => {
      this.strength = this.calculateStrength(value || '');
    });
  }

  ngOnInit(): void {
    this.passwordPolicyService.getPublicPolicy().subscribe({
      next: (policy) => {
        this.policyMinLength = policy.minLength;
        this.registerForm.get('password')?.setValidators(buildPasswordValidators(policy));
        this.registerForm.get('password')?.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  get strengthLabelKey(): string {
    if (this.strength < 3) return 'auth.register.passwordWeak';
    if (this.strength < 4) return 'auth.register.passwordMedium';
    return 'auth.register.passwordStrong';
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  calculateStrength(password: string): number {
    let strength = 0;
    if (password.length >= this.policyMinLength) strength++;
    if (password.length >= this.policyMinLength + 4) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open(this.translateService.instant('auth.messages.registerSuccess'), this.translateService.instant('common.close'), {
          duration: 3000
        });
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        const message = this.apiError.resolve(error) || this.translateService.instant('auth.messages.registerFailed');
        this.snackBar.open(message, this.translateService.instant('common.close'), {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
