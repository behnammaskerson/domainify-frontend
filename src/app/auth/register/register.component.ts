import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';
import { PasswordPolicy, PasswordPolicyService } from '../../services/password-policy.service';
import { TranslationService } from '../../services/translation.service';
import {
  buildPasswordPolicyChecks,
  buildPasswordValidators,
  calculatePasswordStrength,
  PasswordPolicyCheck
} from '../../utils/password-policy.validators';
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
    MatCheckboxModule,
    TranslateModule,
    MatSnackBarModule,
    AuthShellComponent
  ],
  template: `
    <app-auth-shell
      [title]="(step === 'form' ? 'auth.register.title' : 'auth.register.successTitle') | translate"
      [subtitle]="(step === 'form' ? 'auth.register.subtitle' : 'auth.register.successSubtitle') | translate"
      [headline]="'auth.register.heroTitle' | translate"
      [support]="'auth.register.heroSupport' | translate">

      @if (step === 'form') {
        <form class="auth-form" [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="name-fields">
            <mat-form-field appearance="outline" class="half-width">
              <mat-icon matPrefix>person</mat-icon>
              <mat-label>{{ 'auth.register.firstName' | translate }}</mat-label>
              <input matInput formControlName="firstName" autocomplete="given-name">
              @if (registerForm.get('firstName')?.hasError('required') && registerForm.get('firstName')?.touched) {
                <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
              }
              @if (registerForm.get('firstName')?.hasError('minlength') && registerForm.get('firstName')?.touched) {
                <mat-error>{{ 'auth.validation.minNameLength' | translate }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-icon matPrefix>badge</mat-icon>
              <mat-label>{{ 'auth.register.lastName' | translate }}</mat-label>
              <input matInput formControlName="lastName" autocomplete="family-name">
              @if (registerForm.get('lastName')?.hasError('required') && registerForm.get('lastName')?.touched) {
                <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
              }
              @if (registerForm.get('lastName')?.hasError('minlength') && registerForm.get('lastName')?.touched) {
                <mat-error>{{ 'auth.validation.minNameLength' | translate }}</mat-error>
              }
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-icon matPrefix>mail</mat-icon>
            <mat-label>{{ 'auth.register.email' | translate }}</mat-label>
            <input matInput formControlName="email" type="email" autocomplete="email">
            @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
            @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
              <mat-error>{{ 'auth.validation.email' | translate }}</mat-error>
            }
          </mat-form-field>

          <div class="info-banner" role="note">
            <mat-icon aria-hidden="true">mark_email_unread</mat-icon>
            <span>{{ 'auth.register.emailVerificationHint' | translate }}</span>
          </div>

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
            @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
            @if (registerForm.get('password')?.hasError('policyMinLength')) {
              <mat-error>{{ 'settings.passwordPolicy.reqMinLength' | translate:{ n: registerForm.get('password')?.getError('policyMinLength')?.requiredLength } }}</mat-error>
            }
            @if (registerForm.get('password')?.hasError('policyMaxLength')) {
              <mat-error>{{ 'settings.passwordPolicy.reqMaxLength' | translate:{ n: registerForm.get('password')?.getError('policyMaxLength')?.requiredLength } }}</mat-error>
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
          </mat-form-field>

          @if (registerForm.get('password')?.value) {
            <div class="password-strength password-strength--block">
              <div class="strength-track">
                <div class="strength-bar"
                     [class.weak]="passwordStrength < 3"
                     [class.medium]="passwordStrength >= 3 && passwordStrength < 4"
                     [class.strong]="passwordStrength >= 4"
                     [style.width.%]="passwordStrength * 25"></div>
              </div>
              <span [class.weak]="passwordStrength < 3"
                    [class.medium]="passwordStrength >= 3 && passwordStrength < 4"
                    [class.strong]="passwordStrength >= 4">
                {{ passwordStrengthLabelKey | translate }}
              </span>
            </div>
          }

          @if (policyLoading) {
            <div class="policy-loading">
              <mat-progress-spinner diameter="18" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
              <span>{{ 'auth.register.policyLoading' | translate }}</span>
            </div>
          } @else if (passwordPolicyChecks.length) {
            <ul class="policy-requirements" aria-live="polite">
              @for (req of passwordPolicyChecks; track req.id) {
                <li [class.met]="req.met">
                  <mat-icon aria-hidden="true">{{ req.met ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  <span>{{ req.label }}</span>
                </li>
              }
            </ul>
          }

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
            @if (registerForm.get('confirmPassword')?.hasError('required') && registerForm.get('confirmPassword')?.touched) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
            @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched) {
              <mat-error>{{ 'auth.validation.passwordMismatch' | translate }}</mat-error>
            }
          </mat-form-field>

          <div class="terms-row">
            <mat-checkbox formControlName="acceptTerms" color="primary">
              {{ 'auth.register.terms' | translate }}
            </mat-checkbox>
            @if (registerForm.get('acceptTerms')?.hasError('required') && registerForm.get('acceptTerms')?.touched) {
              <div class="terms-error">{{ 'auth.validation.termsRequired' | translate }}</div>
            }
          </div>

          <button mat-flat-button
                  color="primary"
                  class="full-width submit-btn"
                  [disabled]="registerForm.invalid || isLoading || policyLoading"
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
      } @else {
        <div class="success-panel">
          <div class="success-icon" aria-hidden="true">
            <mat-icon>mark_email_read</mat-icon>
          </div>
          <p class="success-lead">{{ 'auth.register.verificationSentTo' | translate:{ email: registeredEmail } }}</p>
          <p class="success-note">{{ 'auth.register.verificationNote' | translate }}</p>

          <div class="success-actions">
            <button mat-flat-button color="primary" type="button" class="full-width" routerLink="/login">
              {{ 'auth.register.backToSignIn' | translate }}
            </button>
            <button mat-stroked-button type="button" class="full-width"
                    (click)="resendVerification()"
                    [disabled]="resendSending">
              @if (resendSending) {
                <mat-progress-spinner diameter="18" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
              } @else {
                <ng-container>
                  <mat-icon>send</mat-icon>
                  {{ 'auth.register.resendVerification' | translate }}
                </ng-container>
              }
            </button>
          </div>
        </div>
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

    .name-fields {
      display: flex;
      gap: 12px;
    }

    .half-width {
      flex: 1;
      min-width: 0;
    }

    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 0 0 12px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--accent) 10%, var(--bg-secondary));
      border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border-color));
      color: var(--text-secondary);
      font-size: 0.86rem;
      line-height: 1.45;
    }

    .info-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--accent);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .policy-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 12px;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .policy-requirements {
      list-style: none;
      margin: 0 0 12px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .policy-requirements li {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 0.82rem;
      line-height: 1.35;
    }

    .policy-requirements li mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .policy-requirements li.met {
      color: var(--success);
    }

    .policy-requirements li.met mat-icon {
      color: var(--success);
    }

    .password-strength {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .password-strength--block {
      margin: 0 0 10px;
      padding-top: 2px;
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
      white-space: nowrap;
    }

    .password-strength span.weak { color: var(--danger); }
    .password-strength span.medium { color: var(--warning); }
    .password-strength span.strong { color: var(--success); }

    .terms-row {
      margin: 8px 0 16px;
    }

    .terms-error {
      margin-top: 6px;
      color: var(--danger);
      font-size: 0.78rem;
    }

    .submit-btn {
      height: 48px !important;
      font-size: 1rem !important;
      font-weight: 700 !important;
      border-radius: var(--radius-md) !important;
      margin-top: 4px;
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

    .text-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }

    .text-link:hover {
      text-decoration: underline;
      color: var(--accent-dark);
    }

    .success-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 8px 0 4px;
    }

    .success-icon mat-icon {
      font-size: 52px;
      width: 52px;
      height: 52px;
      color: #2e7d32;
    }

    .success-lead {
      margin: 0;
      color: var(--text-primary);
      font-size: 0.98rem;
      line-height: 1.5;
      font-weight: 600;
    }

    .success-note {
      margin: 0 0 8px;
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .success-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }

    .success-actions button mat-icon {
      margin-inline-end: 6px;
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
  policyLoading = true;
  resendSending = false;
  hidePassword = true;
  hideConfirm = true;
  passwordStrength = 0;
  passwordPolicyChecks: PasswordPolicyCheck[] = [];
  step: 'form' | 'success' = 'form';
  registeredEmail = '';

  private activePasswordPolicy: PasswordPolicy | null = null;
  private policyCheckLabels: Partial<Record<PasswordPolicyCheck['id'], string>> = {};

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly passwordPolicyService = inject(PasswordPolicyService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translateService = inject(TranslateService);
  private readonly translationService = inject(TranslationService);
  private readonly apiError = inject(ApiErrorService);

  constructor() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });

    this.registerForm.get('password')?.valueChanges.subscribe((value: string) => {
      this.refreshPasswordFeedback(value || '');
    });
  }

  ngOnInit(): void {
    this.translateService.use(this.translationService.currentLang());
    this.loadPasswordPolicy();
  }

  get passwordStrengthLabelKey(): string {
    if (this.passwordStrength < 3) return 'auth.register.passwordWeak';
    if (this.passwordStrength < 4) return 'auth.register.passwordMedium';
    return 'auth.register.passwordStrong';
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.policyLoading) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { acceptTerms: _acceptTerms, ...payload } = this.registerForm.getRawValue();

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.registeredEmail = payload.email;
        this.step = 'success';
      },
      error: (error) => {
        this.isLoading = false;
        const message = this.apiError.resolve(error) || this.translateService.instant('auth.messages.registerFailed');
        this.snackBar.open(message, this.translateService.instant('common.close'), {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  resendVerification(): void {
    if (this.resendSending) {
      return;
    }
    this.resendSending = true;
    this.authService.resendVerificationEmail(this.registeredEmail).subscribe({
      next: () => {
        this.resendSending = false;
        this.snackBar.open(
          this.translateService.instant('auth.register.resendSent'),
          this.translateService.instant('common.close'),
          { duration: 3000 }
        );
      },
      error: (error) => {
        this.resendSending = false;
        this.snackBar.open(
          this.apiError.resolve(error),
          this.translateService.instant('common.close'),
          { duration: 4000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  private loadPasswordPolicy(): void {
    this.policyLoading = true;
    this.passwordPolicyService.getPublicPolicy().subscribe({
      next: (policy) => {
        this.policyLoading = false;
        this.activePasswordPolicy = policy;
        this.registerForm.get('password')?.setValidators(buildPasswordValidators(policy));
        this.registerForm.get('password')?.updateValueAndValidity({ emitEvent: false });
        this.policyCheckLabels = {
          minLength: this.translateService.instant('settings.passwordPolicy.reqMinLength', { n: policy.minLength }),
          uppercase: this.translateService.instant('settings.passwordPolicy.reqUppercase'),
          lowercase: this.translateService.instant('settings.passwordPolicy.reqLowercase'),
          digit: this.translateService.instant('settings.passwordPolicy.reqDigit'),
          special: this.translateService.instant('settings.passwordPolicy.reqSpecial')
        };
        this.refreshPasswordFeedback(this.registerForm.get('password')?.value || '');
      },
      error: () => {
        this.policyLoading = false;
        this.refreshPasswordFeedback(this.registerForm.get('password')?.value || '');
      }
    });
  }

  private refreshPasswordFeedback(password: string): void {
    const policy = this.activePasswordPolicy;
    const minLength = policy?.minLength ?? 8;
    this.passwordStrength = calculatePasswordStrength(password, minLength);
    if (!policy) {
      this.passwordPolicyChecks = [];
      return;
    }
    this.passwordPolicyChecks = buildPasswordPolicyChecks(policy, password, this.policyCheckLabels);
  }
}
