import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { UsersService } from '../../services/users.service';
import { AuthService, User } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';
import { PasswordPolicyService, PasswordPolicy } from '../../services/password-policy.service';
import {
  buildPasswordValidators,
  buildPasswordPolicyChecks,
  calculatePasswordStrength,
  PasswordPolicyCheck
} from '../../utils/password-policy.validators';
import { AvatarEditorDialogComponent } from '../../components/avatar-editor-dialog/avatar-editor-dialog.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { TotpSetupDialogComponent } from '../../components/totp-setup-dialog/totp-setup-dialog.component';
import { TotpDisableDialogComponent, TotpDisableDialogData } from '../../components/totp-disable-dialog/totp-disable-dialog.component';
import { LtrHostComponent } from '../../components/ltr-host/ltr-host.component';
import {
  buildPhoneCountries,
  countryOptionLabel,
  digitsOnly,
  findPhoneCountry,
  formatPhoneDigits,
  isValidNationalPhone,
  phonePlaceholder
} from '../../utils/phone-countries';
import type { CountryCode } from 'libphonenumber-js';
import { ActivatedRoute, Router } from '@angular/router';

interface SettingsNavItem {
  id: string;
  titleKey: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSelectModule,
    TranslateModule,
    PageHeroComponent,
    LtrHostComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'settings.eyebrow' | translate"
        [title]="'settings.title' | translate"
        [subtitle]="'settings.subtitle' | translate">
      </app-page-hero>

      <div class="page-body settings-wrap">
        <nav class="settings-nav" aria-label="Settings sections">
          @for (item of visibleNavItems; track item.id) {
            <button type="button"
                    class="settings-nav-item"
                    [class.active]="activeSection === item.id"
                    (click)="goToSection(item.id)">
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.titleKey | translate }}</span>
            </button>
          }
        </nav>

        <section class="settings-group settings-anchor" id="profile">
          <h2 class="settings-group-title">{{ 'settings.profile.title' | translate }}</h2>
          <p class="settings-group-desc">{{ 'settings.profile.subtitle' | translate }}</p>

          <div class="avatar-row">
            <div class="avatar-preview" aria-hidden="true">
              @if (avatarSrc) {
                <img [src]="avatarSrc" alt="">
              } @else {
                <span>{{ profileInitials }}</span>
              }
            </div>
            <div class="avatar-actions">
              <button mat-stroked-button type="button" (click)="openAvatarEditor()" [disabled]="avatarSaving">
                <mat-icon>photo_camera</mat-icon>
                {{ 'avatar.change' | translate }}
              </button>
              @if (avatarSrc) {
                <button mat-button type="button" color="warn" (click)="removeAvatar()" [disabled]="avatarSaving">
                  <mat-icon>delete_outline</mat-icon>
                  {{ 'avatar.remove' | translate }}
                </button>
              }
            </div>
          </div>

          <form [formGroup]="profileForm" class="profile-form" (ngSubmit)="saveProfile()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-icon matPrefix>person</mat-icon>
                <mat-label>{{ 'settings.profile.firstName' | translate }}</mat-label>
                <input matInput formControlName="firstName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-icon matPrefix>badge</mat-icon>
                <mat-label>{{ 'settings.profile.lastName' | translate }}</mat-label>
                <input matInput formControlName="lastName">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-icon matPrefix>mail</mat-icon>
              <mat-label>{{ 'settings.profile.email' | translate }}</mat-label>
              <input matInput type="email" formControlName="email">
            </mat-form-field>
            <app-ltr-host class="phone-row">
              <div class="phone-field-block country-field">
                <span class="phone-field-label">{{ 'settings.profile.countryCode' | translate }}</span>
                <mat-form-field appearance="outline"
                                subscriptSizing="fixed"
                                class="phone-control-field phone-control-field--country">
                  <mat-icon matPrefix>public</mat-icon>
                  <mat-select #countrySelect
                              formControlName="phoneCountryCode"
                              panelClass="country-select-panel"
                              (openedChange)="onCountryPanelToggle($event)"
                              (selectionChange)="onCountryChange()">
                    <mat-option disabled
                                class="country-search-option"
                                (click)="$event.stopPropagation()"
                                (mousedown)="$event.preventDefault(); $event.stopPropagation()">
                      <input #countrySearchInput
                             class="country-search-input"
                             type="text"
                             dir="ltr"
                             role="searchbox"
                             autocomplete="off"
                             tabindex="0"
                             [attr.aria-label]="'settings.profile.countrySearch' | translate"
                             [placeholder]="'settings.profile.countrySearch' | translate"
                             [value]="countrySearch"
                             (input)="onCountrySearchInput($event)"
                             (keydown)="onCountrySearchKeydown($event)"
                             (keyup)="$event.stopPropagation()"
                             (mousedown)="$event.stopPropagation()"
                             (click)="$event.stopPropagation()">
                    </mat-option>
                    <mat-option value="">{{ 'settings.profile.countryPlaceholder' | translate }}</mat-option>
                    @for (country of filteredPhoneCountries; track country.iso) {
                      <mat-option [value]="country.iso">{{ countryLabel(country) }}</mat-option>
                    }
                    @if (filteredPhoneCountries.length === 0) {
                      <mat-option disabled>{{ 'settings.profile.countryNotFound' | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="phone-field-block phone-field">
                <span class="phone-field-label">{{ 'settings.profile.mobileNumber' | translate }}</span>
                <mat-form-field appearance="outline"
                                subscriptSizing="fixed"
                                class="phone-control-field phone-control-field--phone"
                                [class.has-dial-prefix]="!!selectedDialCode">
                  <mat-icon matPrefix>phone</mat-icon>
                  @if (selectedDialCode) {
                    <span matTextPrefix class="dial-prefix" dir="ltr">+{{ selectedDialCode }}</span>
                  }
                  <input matInput
                         type="tel"
                         dir="ltr"
                         inputmode="numeric"
                         autocomplete="tel-national"
                         formControlName="phoneDisplay"
                         [placeholder]="phoneMaskPlaceholder"
                         [disabled]="!profileForm.controls.phoneCountryCode.value"
                         (input)="onPhoneInput($event)">
                </mat-form-field>
              </div>
              @if (profileForm.hasError('phoneIncomplete') && profileForm.touched) {
                <div class="phone-row-error">{{ 'settings.profile.phoneIncomplete' | translate }}</div>
              } @else if (profileForm.hasError('phoneInvalid') && profileForm.touched) {
                <div class="phone-row-error">{{ 'settings.profile.phoneInvalid' | translate }}</div>
              }
            </app-ltr-host>
            <div class="form-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="profileForm.invalid || profileSaving">
                <mat-icon>save</mat-icon>
                {{ 'settings.profile.save' | translate }}
              </button>
            </div>
          </form>
        </section>

        <section class="settings-group settings-anchor" id="password">
          <h2 class="settings-group-title">{{ 'settings.password.title' | translate }}</h2>
          <p class="settings-group-desc">{{ 'settings.password.subtitle' | translate }}</p>
          <form [formGroup]="passwordForm" class="profile-form" (ngSubmit)="changePassword()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-icon matPrefix>lock</mat-icon>
              <mat-label>{{ 'settings.password.current' | translate }}</mat-label>
              <input matInput type="password" formControlName="currentPassword">
            </mat-form-field>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-icon matPrefix>vpn_key</mat-icon>
                <mat-label>{{ 'settings.password.new' | translate }}</mat-label>
                <input matInput type="password" formControlName="newPassword" autocomplete="new-password">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-icon matPrefix>lock_clock</mat-icon>
                <mat-label>{{ 'settings.password.confirm' | translate }}</mat-label>
                <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password">
              </mat-form-field>
            </div>
            @if (passwordForm.controls.newPassword.value) {
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
            @if (passwordPolicyChecks.length) {
              <ul class="policy-requirements" aria-live="polite">
                @for (req of passwordPolicyChecks; track req.id) {
                  <li [class.met]="req.met">
                    <mat-icon aria-hidden="true">{{ req.met ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                    <span>{{ req.label }}</span>
                  </li>
                }
              </ul>
            }
            <div class="form-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="passwordForm.invalid || passwordSaving">
                <mat-icon>lock_reset</mat-icon>
                {{ 'settings.password.save' | translate }}
              </button>
            </div>
          </form>
        </section>

        <section class="settings-group settings-anchor" id="appearance">
          <h2 class="settings-group-title">{{ 'settings.appearance' | translate }}</h2>
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ 'settings.theme' | translate }}</span>
              <span class="setting-desc">{{ 'settings.themeDesc' | translate }}</span>
            </div>
            <div class="choice-row">
              <button type="button"
                      class="choice-btn"
                      [class.active]="themeService.theme() === 'light'"
                      (click)="themeService.setTheme('light')">
                <mat-icon>light_mode</mat-icon>
                {{ 'settings.lightMode' | translate }}
              </button>
              <button type="button"
                      class="choice-btn"
                      [class.active]="themeService.theme() === 'dark'"
                      (click)="themeService.setTheme('dark')">
                <mat-icon>dark_mode</mat-icon>
                {{ 'settings.darkMode' | translate }}
              </button>
            </div>
          </div>
        </section>

        <section class="settings-group settings-anchor" id="language">
          <h2 class="settings-group-title">{{ 'settings.language' | translate }}</h2>
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ 'settings.languageLabel' | translate }}</span>
              <span class="setting-desc">{{ 'settings.languageDesc' | translate }}</span>
            </div>
            <div class="choice-row lang-choices">
              @for (lang of translationService.languages; track lang.code) {
                <button type="button"
                        class="choice-btn"
                        [class.active]="translationService.currentLang() === lang.code"
                        (click)="translationService.setLanguage(lang.code)">
                  <span class="code">{{ lang.code | uppercase }}</span>
                  {{ lang.nativeLabel }}
                </button>
              }
            </div>
          </div>
        </section>

        <section class="settings-group settings-anchor" id="notifications">
          <h2 class="settings-group-title">{{ 'settings.notifications' | translate }}</h2>
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ 'settings.emailNotifications' | translate }}</span>
              <span class="setting-desc">{{ 'settings.emailNotificationsDesc' | translate }}</span>
            </div>
            <mat-slide-toggle color="primary" checked></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ 'settings.pushNotifications' | translate }}</span>
              <span class="setting-desc">{{ 'settings.pushNotificationsDesc' | translate }}</span>
            </div>
            <mat-slide-toggle color="primary" checked></mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ 'settings.marketingEmails' | translate }}</span>
              <span class="setting-desc">{{ 'settings.marketingEmailsDesc' | translate }}</span>
            </div>
            <mat-slide-toggle color="primary"></mat-slide-toggle>
          </div>
        </section>

        <section class="settings-group settings-anchor" id="security">
          <h2 class="settings-group-title">{{ 'settings.security' | translate }}</h2>
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ 'settings.twoFactor' | translate }}</span>
              <span class="setting-desc">{{ 'settings.twoFactorDesc' | translate }}</span>
              @if (totpEnabled) {
                <span class="totp-status">{{ 'settings.totp.enabledStatus' | translate }}</span>
              }
            </div>
            <mat-slide-toggle color="primary"
                              [checked]="totpEnabled"
                              [disabled]="totpBusy"
                              (change)="onTotpToggle($event.checked)"></mat-slide-toggle>
          </div>
          @if (totpEnabled) {
            <div class="setting-row totp-actions-row">
              <div class="setting-copy">
                <span class="setting-label">{{ 'settings.totp.backupCodes' | translate }}</span>
                <span class="setting-desc">{{ 'settings.totp.backupCodesDesc' | translate }}</span>
              </div>
              <button mat-stroked-button type="button" [disabled]="totpBusy" (click)="regenerateBackupCodes()">
                {{ 'settings.totp.regenerate' | translate }}
              </button>
            </div>
          }
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ 'settings.loginAlerts' | translate }}</span>
              <span class="setting-desc">{{ 'settings.loginAlertsDesc' | translate }}</span>
            </div>
            <mat-slide-toggle color="primary" checked></mat-slide-toggle>
          </div>
        </section>

        @if (authService.isAdmin()) {
          <section class="settings-group settings-anchor" id="password-policy">
            <h2 class="settings-group-title">{{ 'settings.passwordPolicy.title' | translate }}</h2>
            <p class="settings-group-desc">{{ 'settings.passwordPolicy.subtitle' | translate }}</p>

            @if (policyLoading) {
              <p class="settings-group-desc">{{ 'settings.passwordPolicy.loading' | translate }}</p>
            } @else {
              <form [formGroup]="policyForm" class="policy-form" (ngSubmit)="savePasswordPolicy()">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-icon matPrefix>straighten</mat-icon>
                    <mat-label>{{ 'settings.passwordPolicy.minLength' | translate }}</mat-label>
                    <input matInput type="number" formControlName="minLength" min="4" max="128">
                    @if (policyForm.controls.minLength.hasError('required')) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    } @else if (policyForm.controls.minLength.hasError('min') || policyForm.controls.minLength.hasError('max')) {
                      <mat-error>{{ 'settings.passwordPolicy.minLengthRange' | translate }}</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-icon matPrefix>height</mat-icon>
                    <mat-label>{{ 'settings.passwordPolicy.maxLength' | translate }}</mat-label>
                    <input matInput type="number" formControlName="maxLength" min="4" max="256">
                    @if (policyForm.controls.maxLength.hasError('required')) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    } @else if (policyForm.controls.maxLength.hasError('min') || policyForm.controls.maxLength.hasError('max')) {
                      <mat-error>{{ 'settings.passwordPolicy.maxLengthRange' | translate }}</mat-error>
                    }
                  </mat-form-field>
                </div>

                <div class="setting-row policy-toggle">
                  <div class="setting-copy">
                    <span class="setting-label">{{ 'settings.passwordPolicy.requireUppercase' | translate }}</span>
                    <span class="setting-desc">{{ 'settings.passwordPolicy.requireUppercaseDesc' | translate }}</span>
                  </div>
                  <mat-slide-toggle color="primary" formControlName="requireUppercase"></mat-slide-toggle>
                </div>
                <div class="setting-row policy-toggle">
                  <div class="setting-copy">
                    <span class="setting-label">{{ 'settings.passwordPolicy.requireLowercase' | translate }}</span>
                    <span class="setting-desc">{{ 'settings.passwordPolicy.requireLowercaseDesc' | translate }}</span>
                  </div>
                  <mat-slide-toggle color="primary" formControlName="requireLowercase"></mat-slide-toggle>
                </div>
                <div class="setting-row policy-toggle">
                  <div class="setting-copy">
                    <span class="setting-label">{{ 'settings.passwordPolicy.requireDigit' | translate }}</span>
                    <span class="setting-desc">{{ 'settings.passwordPolicy.requireDigitDesc' | translate }}</span>
                  </div>
                  <mat-slide-toggle color="primary" formControlName="requireDigit"></mat-slide-toggle>
                </div>
                <div class="setting-row policy-toggle">
                  <div class="setting-copy">
                    <span class="setting-label">{{ 'settings.passwordPolicy.requireSpecial' | translate }}</span>
                    <span class="setting-desc">{{ 'settings.passwordPolicy.requireSpecialDesc' | translate }}</span>
                  </div>
                  <mat-slide-toggle color="primary" formControlName="requireSpecial"></mat-slide-toggle>
                </div>

                <div class="form-row policy-numbers">
                  <mat-form-field appearance="outline">
                    <mat-icon matPrefix>event</mat-icon>
                    <mat-label>{{ 'settings.passwordPolicy.expiryDays' | translate }}</mat-label>
                    <input matInput type="number" formControlName="expiryDays" min="0" max="3650">
                    <mat-hint>{{ 'settings.passwordPolicy.expiryDaysHint' | translate }}</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-icon matPrefix>history</mat-icon>
                    <mat-label>{{ 'settings.passwordPolicy.historyCount' | translate }}</mat-label>
                    <input matInput type="number" formControlName="historyCount" min="0" max="24">
                    <mat-hint>{{ 'settings.passwordPolicy.historyCountHint' | translate }}</mat-hint>
                  </mat-form-field>
                </div>

                <div class="form-actions">
                  <button mat-flat-button color="primary" type="submit"
                          [disabled]="policyForm.invalid || policySaving">
                    {{ 'settings.passwordPolicy.save' | translate }}
                  </button>
                </div>
              </form>
            }
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .settings-wrap {
      max-width: 760px;
    }

    .settings-nav {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 8px;
      margin-bottom: 20px;
    }

    .settings-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-secondary);
      font-family: var(--font-ui);
      font-size: 0.88rem;
      font-weight: 600;
      text-align: start;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
    }

    .settings-nav-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--accent);
      flex-shrink: 0;
    }

    .settings-nav-item:hover {
      border-color: var(--accent);
      color: var(--text-primary);
    }

    .settings-nav-item.active {
      border-color: var(--accent);
      background: var(--accent-light);
      color: var(--accent-dark);
    }

    :host-context(body.dark-theme) .settings-nav-item.active {
      color: var(--accent);
    }

    .settings-anchor {
      scroll-margin-top: 88px;
    }

    .settings-group-desc {
      margin: 0 0 12px;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .avatar-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-light);
    }

    .avatar-preview {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      overflow: hidden;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, #1c1812 0%, #2a2318 100%);
      color: #f5d76b;
      font-weight: 700;
      font-size: 1.4rem;
      flex-shrink: 0;
      box-shadow: inset 0 0 0 1px rgba(245, 215, 107, 0.18);
    }

    .avatar-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-bottom: 12px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }

    .choice-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .lang-choices {
      max-width: 360px;
      justify-content: flex-end;
    }

    .totp-status {
      display: inline-block;
      margin-top: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--success);
    }

    .totp-actions-row {
      border-top: 1px solid var(--border-light);
      padding-top: 12px;
    }

    .policy-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .policy-toggle {
      padding: 10px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .policy-numbers {
      margin-top: 12px;
    }

    .policy-requirements {
      list-style: none;
      margin: 4px 0 12px;
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
      width: 100%;
    }

    .password-strength--block {
      margin: 0 0 10px;
      max-width: 100%;
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

    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  @ViewChild('countrySelect') countrySelect?: MatSelect;
  @ViewChild('countrySearchInput') countrySearchInput?: ElementRef<HTMLInputElement>;

  themeService = inject(ThemeService);
  translationService = inject(TranslationService);
  readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly passwordPolicyService = inject(PasswordPolicyService);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  countrySearch = '';
  activeSection = 'profile';

  readonly navItems: SettingsNavItem[] = [
    { id: 'profile', titleKey: 'settings.profile.title', icon: 'person' },
    { id: 'password', titleKey: 'settings.password.title', icon: 'lock' },
    { id: 'appearance', titleKey: 'settings.appearance', icon: 'palette' },
    { id: 'language', titleKey: 'settings.language', icon: 'translate' },
    { id: 'notifications', titleKey: 'settings.notifications', icon: 'notifications' },
    { id: 'security', titleKey: 'settings.security', icon: 'shield' },
    { id: 'password-policy', titleKey: 'settings.passwordPolicy.title', icon: 'policy', adminOnly: true }
  ];

  get visibleNavItems(): SettingsNavItem[] {
    return this.navItems.filter((item) => !item.adminOnly || this.authService.isAdmin());
  }

  profileSaving = false;
  passwordSaving = false;
  avatarSaving = false;
  totpBusy = false;
  policyLoading = false;
  policySaving = false;
  totpEnabled = false;
  avatarSrc: string | null = null;
  profileInitials = '?';
  phoneMaskPlaceholder = '';
  selectedDialCode = '';
  passwordPolicyChecks: PasswordPolicyCheck[] = [];
  passwordStrength = 0;
  private activePasswordPolicy: PasswordPolicy | null = null;
  private policyCheckLabels: Partial<Record<PasswordPolicyCheck['id'], string>> = {};

  get passwordStrengthLabelKey(): string {
    if (this.passwordStrength < 3) return 'auth.register.passwordWeak';
    if (this.passwordStrength < 4) return 'auth.register.passwordMedium';
    return 'auth.register.passwordStrong';
  }

  profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneCountryCode: [''],
    phoneDisplay: [''],
    phoneNumber: ['']
  }, { validators: [this.phoneGroupValidator.bind(this)] });

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  policyForm = this.fb.nonNullable.group({
    minLength: [8, [Validators.required, Validators.min(4), Validators.max(128)]],
    maxLength: [100, [Validators.required, Validators.min(4), Validators.max(256)]],
    requireUppercase: [true],
    requireLowercase: [true],
    requireDigit: [true],
    requireSpecial: [false],
    expiryDays: [0, [Validators.required, Validators.min(0), Validators.max(3650)]],
    historyCount: [0, [Validators.required, Validators.min(0), Validators.max(24)]]
  });

  ngOnInit(): void {
    this.usersService.getMe().subscribe({
      next: (user) => this.applyUser(user),
      error: (error) => this.showError(error)
    });
    this.loadPasswordPolicyForForms();
    if (this.authService.isAdmin()) {
      this.loadAdminPasswordPolicy();
    }
    this.passwordForm.controls.newPassword.valueChanges.subscribe((value) => {
      this.refreshPasswordFeedback(String(value ?? ''));
    });
    this.route.fragment.subscribe((fragment) => {
      if (!fragment) {
        return;
      }
      this.activeSection = fragment;
      setTimeout(() => this.scrollToAnchor(fragment), 100);
    });
  }

  goToSection(id: string): void {
    this.activeSection = id;
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: id,
      replaceUrl: true
    });
    this.scrollToAnchor(id);
  }

  private scrollToAnchor(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private loadPasswordPolicyForForms(): void {
    this.passwordPolicyService.getPublicPolicy().subscribe({
      next: (policy) => {
        this.activePasswordPolicy = policy;
        this.passwordForm.controls.newPassword.setValidators(buildPasswordValidators(policy));
        this.passwordForm.controls.newPassword.updateValueAndValidity({ emitEvent: false });
        this.policyCheckLabels = {
          minLength: this.translate.instant('settings.passwordPolicy.reqMinLength', { n: policy.minLength }),
          uppercase: this.translate.instant('settings.passwordPolicy.reqUppercase'),
          lowercase: this.translate.instant('settings.passwordPolicy.reqLowercase'),
          digit: this.translate.instant('settings.passwordPolicy.reqDigit'),
          special: this.translate.instant('settings.passwordPolicy.reqSpecial')
        };
        this.refreshPasswordFeedback(this.passwordForm.controls.newPassword.value);
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

  private loadAdminPasswordPolicy(): void {
    this.policyLoading = true;
    this.passwordPolicyService.getAdminPolicy().subscribe({
      next: (policy) => {
        this.policyLoading = false;
        this.policyForm.patchValue({
          minLength: policy.minLength,
          maxLength: policy.maxLength,
          requireUppercase: policy.requireUppercase,
          requireLowercase: policy.requireLowercase,
          requireDigit: policy.requireDigit,
          requireSpecial: policy.requireSpecial,
          expiryDays: policy.expiryDays,
          historyCount: policy.historyCount
        });
      },
      error: (error) => {
        this.policyLoading = false;
        this.showError(error);
      }
    });
  }

  savePasswordPolicy(): void {
    if (this.policyForm.invalid || !this.authService.isAdmin()) {
      this.policyForm.markAllAsTouched();
      return;
    }
    const raw = this.policyForm.getRawValue();
    if (raw.minLength > raw.maxLength) {
      this.snack(this.translate.instant('settings.passwordPolicy.minMaxError'));
      return;
    }
    this.policySaving = true;
    this.passwordPolicyService.updatePolicy({
      minLength: Number(raw.minLength),
      maxLength: Number(raw.maxLength),
      requireUppercase: raw.requireUppercase,
      requireLowercase: raw.requireLowercase,
      requireDigit: raw.requireDigit,
      requireSpecial: raw.requireSpecial,
      expiryDays: Number(raw.expiryDays),
      historyCount: Number(raw.historyCount)
    }).subscribe({
      next: (policy) => {
        this.policySaving = false;
        this.passwordPolicyService.invalidatePublicCache();
        this.loadPasswordPolicyForForms();
        this.policyForm.patchValue(policy);
        this.snack(this.translate.instant('settings.passwordPolicy.saved'));
      },
      error: (error) => {
        this.policySaving = false;
        this.showError(error);
      }
    });
  }

  countryLabel = countryOptionLabel;

  get phoneCountries() {
    return buildPhoneCountries(this.translationService.currentLang());
  }

  get filteredPhoneCountries() {
    const query = this.countrySearch.trim().toLowerCase();
    if (!query) {
      return this.phoneCountries;
    }
    const digits = query.replace(/\D/g, '');
    return this.phoneCountries.filter((country) =>
      country.name.toLowerCase().includes(query)
      || country.iso.toLowerCase().includes(query)
      || (digits && country.dialCode.includes(digits))
    );
  }

  onCountryPanelToggle(open: boolean): void {
    if (open) {
      // MatSelect finishes its own focus handling after open; focus search next tick.
      setTimeout(() => this.focusCountrySearch());
      return;
    }
    this.countrySearch = '';
  }

  onCountrySearchInput(event: Event): void {
    this.countrySearch = (event.target as HTMLInputElement).value;
    // Option list rebuild can steal focus; keep caret in the search box.
    setTimeout(() => this.focusCountrySearch());
  }

  onCountrySearchKeydown(event: KeyboardEvent): void {
    // Keep MatSelect from treating typing as typeahead / selection.
    event.stopPropagation();

    const navigationKeys = ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
    if (navigationKeys.includes(event.key)) {
      (event.target as HTMLInputElement).blur();
      this.countrySelect?.focus();
      return;
    }
    if (event.key === 'Escape') {
      this.countrySelect?.close();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
    }
  }

  private focusCountrySearch(): void {
    const input =
      this.countrySearchInput?.nativeElement
      ?? document.querySelector<HTMLInputElement>('.country-select-panel .country-search-input');
    input?.focus({ preventScroll: true });
  }

  onCountryChange(): void {
    const iso = this.profileForm.controls.phoneCountryCode.value as CountryCode | '';
    const country = iso ? findPhoneCountry(iso, this.translationService.currentLang()) : undefined;
    this.selectedDialCode = country?.dialCode ?? '';
    this.phoneMaskPlaceholder = country ? phonePlaceholder(country.iso) : '';

    const digits = this.profileForm.controls.phoneNumber.value;
    if (country && digits) {
      const formatted = formatPhoneDigits(digits, country.iso);
      const nationalDigits = digitsOnly(formatted);
      this.profileForm.patchValue({
        phoneNumber: nationalDigits,
        phoneDisplay: formatted
      }, { emitEvent: false });
    } else if (!country) {
      this.profileForm.patchValue({
        phoneNumber: '',
        phoneDisplay: ''
      }, { emitEvent: false });
    } else {
      this.profileForm.patchValue({ phoneDisplay: '' }, { emitEvent: false });
    }
    this.profileForm.updateValueAndValidity();
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const iso = this.profileForm.controls.phoneCountryCode.value as CountryCode | '';
    const country = iso ? findPhoneCountry(iso, this.translationService.currentLang()) : undefined;
    if (!country) {
      input.value = '';
      this.profileForm.patchValue({ phoneDisplay: '', phoneNumber: '' }, { emitEvent: false });
      return;
    }

    const digits = digitsOnly(input.value).slice(0, 15);
    const formatted = formatPhoneDigits(digits, country.iso);
    input.value = formatted;
    this.profileForm.patchValue({
      phoneDisplay: formatted,
      phoneNumber: digitsOnly(formatted)
    }, { emitEvent: false });
    this.profileForm.updateValueAndValidity();
  }

  private phoneGroupValidator(group: AbstractControl): ValidationErrors | null {
    const country = (group.get('phoneCountryCode')?.value || '').trim();
    const number = (group.get('phoneNumber')?.value || '').trim();
    if (!country && !number) {
      return null;
    }
    if (!country || !number) {
      return { phoneIncomplete: true };
    }
    const meta = findPhoneCountry(country, this.translationService.currentLang());
    if (!meta) {
      return { phoneInvalid: true };
    }
    if (!isValidNationalPhone(number, meta.iso)) {
      return { phoneInvalid: true };
    }
    return null;
  }

  openAvatarEditor(): void {
    const ref = this.dialog.open(AvatarEditorDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      restoreFocus: true,
      disableClose: true,
      panelClass: 'avatar-editor-dialog-panel'
    });
    ref.afterClosed().subscribe((blob: Blob | null | undefined) => {
      if (!blob) {
        return;
      }
      this.avatarSaving = true;
      this.usersService.uploadAvatar(blob).subscribe({
        next: (user) => {
          this.avatarSaving = false;
          this.applyUser(user);
          this.authService.setCurrentUser(user);
          this.snack(this.translate.instant('avatar.updated'));
        },
        error: (error) => {
          this.avatarSaving = false;
          this.showError(error);
        }
      });
    });
  }

  removeAvatar(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      restoreFocus: true,
      data: {
        titleKey: 'avatar.remove',
        messageKey: 'avatar.confirmRemove',
        confirmKey: 'avatar.remove',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.avatarSaving = true;
      this.usersService.removeAvatar().subscribe({
        next: (user) => {
          this.avatarSaving = false;
          this.applyUser(user);
          this.authService.setCurrentUser(user);
          this.snack(this.translate.instant('avatar.removed'));
        },
        error: (error) => {
          this.avatarSaving = false;
          this.showError(error);
        }
      });
    });
  }

  private applyUser(user: User): void {
    this.totpEnabled = !!user.totpEnabled;
    const locale = this.translationService.currentLang();
    const country = findPhoneCountry(user.phoneCountryCode, locale);
    const digits = user.phoneNumber ?? '';
    this.selectedDialCode = country?.dialCode ?? '';
    this.phoneMaskPlaceholder = country ? phonePlaceholder(country.iso) : '';
    this.profileForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneCountryCode: user.phoneCountryCode ?? '',
      phoneNumber: digits,
      phoneDisplay: country && digits ? formatPhoneDigits(digits, country.iso) : ''
    });
    this.avatarSrc = this.usersService.resolveAvatarUrl(user.avatarUrl);
    const first = user.firstName?.charAt(0) ?? '';
    const last = user.lastName?.charAt(0) ?? '';
    this.profileInitials = `${first}${last}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.profileSaving = true;
    const raw = this.profileForm.getRawValue();
    const payload = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      phoneCountryCode: raw.phoneCountryCode || null,
      phoneNumber: raw.phoneNumber || null
    };
    this.usersService.updateMe(payload).subscribe({
      next: (user) => {
        this.profileSaving = false;
        this.applyUser(user);
        this.authService.setCurrentUser(user);
        this.snack(this.translate.instant('settings.profile.saved'));
      },
      error: (error) => {
        this.profileSaving = false;
        this.showError(error);
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }
    const value = this.passwordForm.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.snack(this.translate.instant('auth.validation.passwordMismatch'));
      return;
    }
    this.passwordSaving = true;
    this.usersService.changePassword(value).subscribe({
      next: () => {
        this.passwordSaving = false;
        this.passwordForm.reset();
        this.refreshPasswordFeedback('');
        this.snack(this.translate.instant('settings.password.saved'));
      },
      error: (error) => {
        this.passwordSaving = false;
        this.showError(error);
      }
    });
  }

  onTotpToggle(checked: boolean): void {
    if (this.totpBusy) {
      return;
    }
    if (checked) {
      this.openTotpSetupDialog();
      return;
    }
    this.openTotpDisableDialog('disable');
  }

  regenerateBackupCodes(): void {
    if (this.totpBusy || !this.totpEnabled) {
      return;
    }
    this.openTotpDisableDialog('regenerate');
  }

  private openTotpSetupDialog(): void {
    this.totpBusy = true;
    const ref = this.dialog.open(TotpSetupDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      disableClose: true
    });
    ref.afterClosed().subscribe((result) => {
      this.totpBusy = false;
      if (result?.enabled && result.user) {
        this.totpEnabled = true;
        this.authService.setCurrentUser(result.user);
        this.snack(this.translate.instant('settings.totp.enabledSuccess'));
      }
    });
  }

  private openTotpDisableDialog(mode: TotpDisableDialogData['mode']): void {
    this.totpBusy = true;
    const ref = this.dialog.open(TotpDisableDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: { mode } satisfies TotpDisableDialogData
    });
    ref.afterClosed().subscribe((result) => {
      this.totpBusy = false;
      if (!result) {
        return;
      }
      this.authService.setCurrentUser(result.user);
      if (result.action === 'disable') {
        this.totpEnabled = false;
        this.snack(this.translate.instant('settings.totp.disabledSuccess'));
        return;
      }
      this.snack(this.translate.instant('settings.totp.regenerateSuccess'));
    });
  }

  private snack(message: string): void {
    this.snackBar.open(message, this.translate.instant('common.close'), { duration: 3000 });
  }

  private showError(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), this.translate.instant('common.close'), {
      duration: 4000,
      panelClass: ['error-snackbar']
    });
  }
}
