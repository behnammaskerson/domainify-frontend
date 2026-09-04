import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
import { SmsConfigService, SmsCreditResult, SmsLinesResult, SmsProviderResult } from '../../services/sms-config.service';
import { EmailConfigService } from '../../services/email-config.service';
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
import { LocaleNumberPipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
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
    FormsModule,
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
    LtrHostComponent,
    LocaleNumberPipe,
    LocaleDigitsPipe
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

            <div class="email-verification-row">
              @if (emailVerified) {
                <span class="email-status verified">
                  <mat-icon>verified</mat-icon>
                  {{ 'settings.profile.emailVerified' | translate }}
                </span>
              } @else {
                <span class="email-status unverified">
                  <mat-icon>mark_email_unread</mat-icon>
                  {{ 'settings.profile.emailUnverified' | translate }}
                </span>
                <button mat-stroked-button type="button"
                        (click)="sendVerificationEmail()"
                        [disabled]="verificationSending">
                  <mat-icon>send</mat-icon>
                  {{ (verificationSending ? 'settings.profile.sendingVerification' : 'settings.profile.sendVerification') | translate }}
                </button>
              }
            </div>
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
            @if (hasProfilePhone) {
              <div class="phone-verification-row">
                @if (phoneVerified) {
                  <span class="phone-status verified">
                    <mat-icon>verified</mat-icon>
                    {{ 'settings.profile.phoneVerified' | translate }}
                  </span>
                } @else {
                  <span class="phone-status unverified">
                    <mat-icon>phonelink_lock</mat-icon>
                    {{ 'settings.profile.phoneUnverified' | translate }}
                  </span>
                  <button mat-stroked-button type="button"
                          (click)="sendPhoneVerification()"
                          [disabled]="phoneVerificationSending || profileForm.dirty">
                    <mat-icon>sms</mat-icon>
                    {{ (phoneVerificationSending ? 'settings.profile.sendingPhoneVerification' : 'settings.profile.sendPhoneVerification') | translate }}
                  </button>
                  @if (phoneOtpSent) {
                    <mat-form-field appearance="outline" class="phone-otp-field">
                      <mat-icon matPrefix>dialpad</mat-icon>
                      <mat-label>{{ 'settings.profile.phoneOtpLabel' | translate }}</mat-label>
                      <input matInput
                             dir="ltr"
                             inputmode="numeric"
                             autocomplete="one-time-code"
                             maxlength="6"
                             [(ngModel)]="phoneOtpCode"
                             [ngModelOptions]="{ standalone: true }"
                             [placeholder]="'settings.profile.phoneOtpPlaceholder' | translate">
                    </mat-form-field>
                    <button mat-flat-button color="primary" type="button"
                            (click)="verifyPhone()"
                            [disabled]="phoneVerifying || !phoneOtpCode.trim()">
                      <mat-icon>check_circle</mat-icon>
                      {{ (phoneVerifying ? 'settings.profile.verifyingPhone' : 'settings.profile.verifyPhone') | translate }}
                    </button>
                  }
                }
              </div>
            }
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
            <mat-slide-toggle color="primary"
                              [checked]="emailNotificationsEnabled"
                              [disabled]="emailNotificationsSaving"
                              (change)="onEmailNotificationsToggle($event.checked)">
            </mat-slide-toggle>
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <span class="setting-label">{{ 'settings.smsNotifications' | translate }}</span>
              <span class="setting-desc">{{ 'settings.smsNotificationsDesc' | translate }}</span>
              @if (!hasVerifiedPhoneForSms) {
                <span class="setting-desc warn-hint">{{ 'settings.smsNotificationsNeedPhone' | translate }}</span>
              }
            </div>
            <mat-slide-toggle color="primary"
                              [checked]="smsNotificationsEnabled"
                              [disabled]="smsNotificationsSaving || !hasVerifiedPhoneForSms"
                              (change)="onSmsNotificationsToggle($event.checked)">
            </mat-slide-toggle>
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

          <section class="settings-group settings-anchor" id="email-config">
            <h2 class="settings-group-title">{{ 'settings.emailConfig.title' | translate }}</h2>
            <p class="settings-group-desc">{{ 'settings.emailConfig.subtitle' | translate }}</p>

            @if (emailConfigLoading) {
              <p class="settings-group-desc">{{ 'settings.emailConfig.loading' | translate }}</p>
            } @else {
              <form [formGroup]="emailConfigForm" class="policy-form" (ngSubmit)="saveEmailConfig()">
                <div class="email-config-toggles">
                  <mat-slide-toggle formControlName="enabled" color="primary">
                    {{ 'settings.emailConfig.enabled' | translate }}
                  </mat-slide-toggle>
                  <mat-slide-toggle formControlName="useTls" color="primary">
                    {{ 'settings.emailConfig.useTls' | translate }}
                  </mat-slide-toggle>
                </div>

                <div class="sms-config-fields">
                  <mat-form-field appearance="outline" class="full-width sms-control-field">
                    <mat-icon matPrefix>dns</mat-icon>
                    <mat-label>{{ 'settings.emailConfig.host' | translate }}</mat-label>
                    <input matInput formControlName="host" type="text" dir="ltr" autocomplete="off">
                    @if (emailConfigForm.controls.host.hasError('required') && emailConfigForm.controls.host.touched) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width sms-control-field">
                    <mat-icon matPrefix>settings_ethernet</mat-icon>
                    <mat-label>{{ 'settings.emailConfig.port' | translate }}</mat-label>
                    <input matInput formControlName="port" type="number" min="1" max="65535" dir="ltr">
                    @if (emailConfigForm.controls.port.hasError('required') && emailConfigForm.controls.port.touched) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    } @else if (emailConfigForm.controls.port.hasError('min') || emailConfigForm.controls.port.hasError('max')) {
                      <mat-error>{{ 'settings.emailConfig.portInvalid' | translate }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width sms-control-field">
                    <mat-icon matPrefix>person</mat-icon>
                    <mat-label>{{ 'settings.emailConfig.username' | translate }}</mat-label>
                    <input matInput formControlName="username" type="text" dir="ltr" autocomplete="off">
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width sms-control-field">
                    <mat-icon matPrefix>vpn_key</mat-icon>
                    <mat-label>{{ 'settings.emailConfig.password' | translate }}</mat-label>
                    <input matInput formControlName="password" type="password" dir="ltr" autocomplete="new-password">
                    @if (emailPasswordConfigured) {
                      <mat-hint>{{ 'settings.emailConfig.passwordHint' | translate }}</mat-hint>
                    }
                    @if (emailConfigForm.controls.password.hasError('required') && emailConfigForm.controls.password.touched) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width sms-control-field">
                    <mat-icon matPrefix>alternate_email</mat-icon>
                    <mat-label>{{ 'settings.emailConfig.fromEmail' | translate }}</mat-label>
                    <input matInput formControlName="fromEmail" type="email" dir="ltr" autocomplete="off">
                    @if (emailConfigForm.controls.fromEmail.hasError('required') && emailConfigForm.controls.fromEmail.touched) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    } @else if (emailConfigForm.controls.fromEmail.hasError('email') && emailConfigForm.controls.fromEmail.touched) {
                      <mat-error>{{ 'settings.emailConfig.fromEmailInvalid' | translate }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width sms-control-field">
                    <mat-icon matPrefix>badge</mat-icon>
                    <mat-label>{{ 'settings.emailConfig.fromName' | translate }}</mat-label>
                    <input matInput formControlName="fromName" type="text" autocomplete="off">
                  </mat-form-field>
                </div>

                <div class="form-actions">
                  <button mat-flat-button color="primary" type="submit"
                          [disabled]="emailConfigForm.invalid || emailConfigSaving">
                    {{ 'settings.emailConfig.save' | translate }}
                  </button>
                </div>
              </form>

              @if (emailConfigForm.controls.enabled.value) {
                <div class="email-test-card">
                  <h3>{{ 'settings.emailConfig.testTitle' | translate }}</h3>
                  <p class="settings-group-desc">{{ 'settings.emailConfig.testHint' | translate }}</p>
                  <div class="email-test-row">
                    <mat-form-field appearance="outline" class="full-width sms-control-field">
                      <mat-icon matPrefix>mail</mat-icon>
                      <mat-label>{{ 'settings.emailConfig.testTo' | translate }}</mat-label>
                      <input matInput [value]="emailTestTo"
                             (input)="emailTestTo = $any($event.target).value"
                             type="email" dir="ltr" autocomplete="off">
                    </mat-form-field>
                    <button mat-stroked-button type="button"
                            [disabled]="emailTestSending || !emailTestTo"
                            (click)="sendTestEmail()">
                      <mat-icon>send</mat-icon>
                      {{ (emailTestSending ? 'settings.emailConfig.testSending' : 'settings.emailConfig.testSend') | translate }}
                    </button>
                  </div>
                  @if (emailTestError) {
                    <p class="sms-credit-error">{{ emailTestError }}</p>
                  }
                </div>
              }
            }
          </section>

          <section class="settings-group settings-anchor" id="sms-config">
            <h2 class="settings-group-title">{{ 'settings.smsConfig.title' | translate }}</h2>
            <p class="settings-group-desc">{{ 'settings.smsConfig.subtitle' | translate }}</p>

            @if (smsConfigLoading) {
              <p class="settings-group-desc">{{ 'settings.smsConfig.loading' | translate }}</p>
            } @else {
              @if (smsApiKeyConfigured) {
                <div class="sms-credit-card">
                  <div class="sms-credit-copy">
                    <span class="sms-credit-label">{{ 'settings.smsConfig.credit' | translate }}</span>
                    @if (smsCreditLoading) {
                      <span class="sms-credit-muted">{{ 'settings.smsConfig.creditLoading' | translate }}</span>
                    } @else if (smsCreditResult?.success && smsCreditResult?.credit != null) {
                      <span class="sms-credit-value">
                        {{ smsCreditResult!.credit! | localeNumber:{ minimumFractionDigits: 0, maximumFractionDigits: 2 } }}
                      </span>
                    } @else {
                      <span class="sms-credit-error">{{ smsCreditErrorMessage }}</span>
                    }
                  </div>
                  <button mat-stroked-button type="button" [disabled]="smsCreditLoading" (click)="loadSmsCredit()">
                    <mat-icon>refresh</mat-icon>
                    {{ 'settings.smsConfig.creditRefresh' | translate }}
                  </button>
                </div>

                <div class="sms-lines-card">
                  <div class="sms-lines-header">
                    <span class="sms-credit-label">{{ 'settings.smsConfig.lines' | translate }}</span>
                    <button mat-stroked-button type="button" [disabled]="smsLinesLoading" (click)="loadSmsLines()">
                      <mat-icon>refresh</mat-icon>
                      {{ 'settings.smsConfig.linesRefresh' | translate }}
                    </button>
                  </div>
                  @if (smsLinesLoading) {
                    <p class="sms-credit-muted">{{ 'settings.smsConfig.linesLoading' | translate }}</p>
                  } @else if (smsLinesResult?.success && smsLines.length) {
                    <mat-form-field appearance="outline" class="full-width sms-control-field">
                      <mat-icon matPrefix>dialpad</mat-icon>
                      <mat-label>{{ 'settings.smsConfig.defaultLine' | translate }}</mat-label>
                      <mat-select [value]="selectedDefaultLine"
                                  [disabled]="defaultLineSaving"
                                  (selectionChange)="onDefaultLineSelected($event.value)">
                        @for (line of smsLines; track line) {
                          <mat-option [value]="line">{{ line | localeDigits }}</mat-option>
                        }
                      </mat-select>
                      @if (selectedDefaultLine) {
                        <mat-hint>{{ 'settings.smsConfig.defaultLineHint' | translate }}</mat-hint>
                      }
                    </mat-form-field>
                  } @else if (smsLinesResult?.success) {
                    <p class="sms-credit-muted">{{ 'settings.smsConfig.linesEmpty' | translate }}</p>
                  } @else if (smsLinesErrorMessage) {
                    <p class="sms-credit-error">{{ smsLinesErrorMessage }}</p>
                  }
                </div>
              }

              <form [formGroup]="smsConfigForm" class="policy-form" (ngSubmit)="saveSmsConfig()">
                <div class="sms-config-fields">
                  <mat-form-field appearance="outline" class="full-width sms-control-field">
                    <mat-icon matPrefix>link</mat-icon>
                    <mat-label>{{ 'settings.smsConfig.serverUrl' | translate }}</mat-label>
                    <input matInput
                           formControlName="serverUrl"
                           type="url"
                           dir="ltr"
                           autocomplete="off">
                    @if (smsConfigForm.controls.serverUrl.hasError('required') && smsConfigForm.controls.serverUrl.touched) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    } @else if (smsConfigForm.controls.serverUrl.hasError('pattern') && smsConfigForm.controls.serverUrl.touched) {
                      <mat-error>{{ 'settings.smsConfig.serverUrlInvalid' | translate }}</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width sms-control-field">
                    <mat-icon matPrefix>vpn_key</mat-icon>
                    <mat-label>{{ 'settings.smsConfig.apiKey' | translate }}</mat-label>
                    <input matInput
                           formControlName="apiKey"
                           type="password"
                           dir="ltr"
                           autocomplete="new-password">
                    @if (smsApiKeyConfigured) {
                      <mat-hint>{{ 'settings.smsConfig.apiKeyHint' | translate }}</mat-hint>
                    }
                    @if (smsConfigForm.controls.apiKey.hasError('required') && smsConfigForm.controls.apiKey.touched) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    }
                  </mat-form-field>
                </div>

                <div class="form-actions">
                  <button mat-flat-button color="primary" type="submit"
                          [disabled]="smsConfigForm.invalid || smsConfigSaving">
                    {{ 'settings.smsConfig.save' | translate }}
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
      width: 100%;
      max-width: none;
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

    .email-verification-row,
    .phone-verification-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px;
    }

    .email-status,
    .phone-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
    }

    .email-status mat-icon,
    .phone-status mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .email-status.verified,
    .phone-status.verified { color: #2e7d32; }
    .email-status.unverified,
    .phone-status.unverified { color: var(--text-muted); }

    .warn-hint {
      color: var(--warning, #b45309);
    }

    .phone-otp-field {
      width: min(180px, 100%);
      margin: 0;
    }

    .phone-otp-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
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

    .sms-credit-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }

    .sms-credit-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .sms-credit-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .sms-credit-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent-dark);
      line-height: 1.3;
    }

    :host-context(body.dark-theme) .sms-credit-value {
      color: var(--accent);
    }

    .sms-credit-muted {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .sms-credit-error {
      font-size: 0.85rem;
      color: var(--danger);
      line-height: 1.4;
    }

    .sms-lines-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }

    .sms-lines-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .email-config-toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 16px 24px;
      margin-bottom: 16px;
    }

    .email-test-card {
      margin-top: 20px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }

    .email-test-card h3 {
      margin: 0 0 4px;
      font-size: 0.95rem;
    }

    .email-test-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }

    .email-test-row button {
      margin-top: 4px;
      white-space: nowrap;
    }

    .policy-form .full-width {
      width: 100%;
    }

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
  private readonly smsConfigService = inject(SmsConfigService);
  private readonly emailConfigService = inject(EmailConfigService);
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
    { id: 'password-policy', titleKey: 'settings.passwordPolicy.title', icon: 'policy', adminOnly: true },
    { id: 'email-config', titleKey: 'settings.emailConfig.title', icon: 'email', adminOnly: true },
    { id: 'sms-config', titleKey: 'settings.smsConfig.title', icon: 'sms', adminOnly: true }
  ];

  get visibleNavItems(): SettingsNavItem[] {
    return this.navItems.filter((item) => !item.adminOnly || this.authService.isAdmin());
  }

  get hasProfilePhone(): boolean {
    const raw = this.profileForm.getRawValue();
    return !!(raw.phoneCountryCode?.trim() && raw.phoneNumber?.trim());
  }

  get hasVerifiedPhoneForSms(): boolean {
    return this.hasProfilePhone && this.phoneVerified;
  }

  profileSaving = false;
  verificationSending = false;
  emailVerified = true;
  phoneVerified = true;
  emailNotificationsEnabled = true;
  emailNotificationsSaving = false;
  smsNotificationsEnabled = false;
  smsNotificationsSaving = false;
  phoneVerificationSending = false;
  phoneVerifying = false;
  phoneOtpCode = '';
  phoneOtpSent = false;
  passwordSaving = false;
  avatarSaving = false;
  totpBusy = false;
  policyLoading = false;
  policySaving = false;
  smsConfigLoading = false;
  smsConfigSaving = false;
  smsApiKeyConfigured = false;
  emailConfigLoading = false;
  emailConfigSaving = false;
  emailPasswordConfigured = false;
  emailTestTo = '';
  emailTestSending = false;
  emailTestError = '';
  smsCreditLoading = false;
  smsCreditResult: SmsCreditResult | null = null;
  smsCreditErrorMessage = '';
  smsLinesLoading = false;
  smsLinesResult: SmsLinesResult | null = null;
  smsLines: string[] = [];
  smsLinesErrorMessage = '';
  selectedDefaultLine = '';
  defaultLineSaving = false;
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

  smsConfigForm = this.fb.nonNullable.group({
    serverUrl: ['https://api.sms.ir/', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/i)
    ]],
    apiKey: ['']
  });

  emailConfigForm = this.fb.nonNullable.group({
    enabled: [false],
    host: [''],
    port: [587, [Validators.required, Validators.min(1), Validators.max(65535)]],
    username: [''],
    password: [''],
    fromEmail: ['', [Validators.email]],
    fromName: [''],
    useTls: [true]
  });

  ngOnInit(): void {
    this.usersService.getMe().subscribe({
      next: (user) => this.applyUser(user),
      error: (error) => this.showError(error)
    });
    this.loadPasswordPolicyForForms();
    if (this.authService.isAdmin()) {
      this.loadAdminPasswordPolicy();
      this.loadAdminEmailConfig();
      this.loadAdminSmsConfig();
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

  private loadAdminEmailConfig(): void {
    this.emailConfigLoading = true;
    this.emailConfigService.getConfig().subscribe({
      next: (config) => {
        this.emailConfigLoading = false;
        this.emailPasswordConfigured = config.passwordConfigured;
        this.emailConfigForm.patchValue({
          enabled: config.enabled,
          host: config.host || '',
          port: config.port || 587,
          username: config.username || '',
          password: '',
          fromEmail: config.fromEmail || '',
          fromName: config.fromName || '',
          useTls: config.useTls
        });
        this.applyEmailValidators();
        if (!this.emailTestTo && this.profileForm.controls.email.value) {
          this.emailTestTo = this.profileForm.controls.email.value;
        }
      },
      error: (error) => {
        this.emailConfigLoading = false;
        this.showError(error);
      }
    });

    this.emailConfigForm.controls.enabled.valueChanges.subscribe(() => this.applyEmailValidators());
    this.emailConfigForm.controls.username.valueChanges.subscribe(() => this.applyEmailPasswordValidators());
  }

  private applyEmailValidators(): void {
    const enabled = this.emailConfigForm.controls.enabled.value;
    const hostCtrl = this.emailConfigForm.controls.host;
    const fromEmailCtrl = this.emailConfigForm.controls.fromEmail;

    if (enabled) {
      hostCtrl.setValidators([Validators.required]);
      fromEmailCtrl.setValidators([Validators.required, Validators.email]);
    } else {
      hostCtrl.setValidators([]);
      fromEmailCtrl.setValidators([Validators.email]);
    }
    hostCtrl.updateValueAndValidity({ emitEvent: false });
    fromEmailCtrl.updateValueAndValidity({ emitEvent: false });
    this.applyEmailPasswordValidators();
  }

  private applyEmailPasswordValidators(): void {
    const enabled = this.emailConfigForm.controls.enabled.value;
    const username = this.emailConfigForm.controls.username.value.trim();
    const passwordCtrl = this.emailConfigForm.controls.password;

    if (enabled && username && !this.emailPasswordConfigured) {
      passwordCtrl.setValidators([Validators.required]);
    } else {
      passwordCtrl.setValidators([]);
    }
    passwordCtrl.updateValueAndValidity({ emitEvent: false });
  }

  saveEmailConfig(): void {
    if (this.emailConfigForm.invalid || !this.authService.isAdmin()) {
      this.emailConfigForm.markAllAsTouched();
      return;
    }

    const raw = this.emailConfigForm.getRawValue();
    const username = raw.username.trim();
    const password = raw.password.trim();

    if (raw.enabled && username && !this.emailPasswordConfigured && !password) {
      this.emailConfigForm.controls.password.setErrors({ required: true });
      this.emailConfigForm.controls.password.markAsTouched();
      return;
    }

    this.emailConfigSaving = true;
    const payload = {
      enabled: raw.enabled,
      host: raw.host.trim(),
      port: Number(raw.port),
      username,
      fromEmail: raw.fromEmail.trim(),
      fromName: raw.fromName.trim(),
      useTls: raw.useTls,
      ...(password ? { password } : {})
    };

    this.emailConfigService.updateConfig(payload).subscribe({
      next: (config) => {
        this.emailConfigSaving = false;
        this.emailPasswordConfigured = config.passwordConfigured;
        this.emailConfigForm.patchValue({ password: '' });
        this.applyEmailPasswordValidators();
        this.emailTestError = '';
        this.snack(this.translate.instant('settings.emailConfig.saved'));
      },
      error: (error) => {
        this.emailConfigSaving = false;
        this.showError(error);
      }
    });
  }

  sendTestEmail(): void {
    const to = this.emailTestTo.trim();
    if (!to || !this.authService.isAdmin() || this.emailTestSending) {
      return;
    }
    this.emailTestSending = true;
    this.emailTestError = '';
    this.emailConfigService.sendTestEmail(to).subscribe({
      next: (result) => {
        this.emailTestSending = false;
        if (result.success) {
          this.snack(this.translate.instant('settings.emailConfig.testSuccess'));
        } else {
          this.emailTestError = result.errorMessage || this.translate.instant('settings.emailConfig.testFailed');
        }
      },
      error: (error) => {
        this.emailTestSending = false;
        this.emailTestError = this.apiError.resolve(error);
      }
    });
  }

  private loadAdminSmsConfig(): void {
    this.smsConfigLoading = true;
    this.smsConfigService.getConfig().subscribe({
      next: (config) => {
        this.smsConfigLoading = false;
        this.smsApiKeyConfigured = config.apiKeyConfigured;
        this.smsConfigForm.patchValue({
          serverUrl: config.serverUrl,
          apiKey: ''
        });
        this.selectedDefaultLine = config.defaultLine ?? '';
        this.applySmsApiKeyValidators();
        if (config.apiKeyConfigured) {
          this.loadSmsCredit();
          this.loadSmsLines();
        } else {
          this.smsCreditResult = null;
          this.smsCreditErrorMessage = '';
          this.smsLinesResult = null;
          this.smsLines = [];
          this.smsLinesErrorMessage = '';
          this.selectedDefaultLine = '';
        }
      },
      error: (error) => {
        this.smsConfigLoading = false;
        this.showError(error);
      }
    });
  }

  private applySmsApiKeyValidators(): void {
    if (this.smsApiKeyConfigured) {
      this.smsConfigForm.controls.apiKey.setValidators([]);
    } else {
      this.smsConfigForm.controls.apiKey.setValidators([Validators.required]);
    }
    this.smsConfigForm.controls.apiKey.updateValueAndValidity({ emitEvent: false });
  }

  loadSmsCredit(): void {
    if (!this.authService.isAdmin() || !this.smsApiKeyConfigured) {
      return;
    }
    this.smsCreditLoading = true;
    this.smsCreditErrorMessage = '';
    this.smsConfigService.getCredit().subscribe({
      next: (result) => {
        this.smsCreditLoading = false;
        this.smsCreditResult = result;
        if (!result.success) {
          this.smsCreditErrorMessage = this.resolveSmsProviderMessage(result);
        }
      },
      error: (error) => {
        this.smsCreditLoading = false;
        this.smsCreditResult = null;
        this.smsCreditErrorMessage = this.apiError.resolve(error);
      }
    });
  }

  loadSmsLines(): void {
    if (!this.authService.isAdmin() || !this.smsApiKeyConfigured) {
      return;
    }
    this.smsLinesLoading = true;
    this.smsLinesErrorMessage = '';
    this.smsConfigService.getLines().subscribe({
      next: (result) => {
        this.smsLinesLoading = false;
        this.smsLinesResult = result;
        this.smsLines = result.success && result.lines ? [...result.lines] : [];
        if (!result.success) {
          this.smsLinesErrorMessage = this.resolveSmsProviderMessage(result, 'settings.smsConfig.linesUnavailable');
          return;
        }
        if (this.selectedDefaultLine && !this.smsLines.includes(this.selectedDefaultLine)) {
          this.selectedDefaultLine = '';
        }
      },
      error: (error) => {
        this.smsLinesLoading = false;
        this.smsLinesResult = null;
        this.smsLines = [];
        this.smsLinesErrorMessage = this.apiError.resolve(error);
      }
    });
  }

  onDefaultLineSelected(line: string): void {
    if (!line || !this.authService.isAdmin()) {
      return;
    }
    const previous = this.selectedDefaultLine;
    this.selectedDefaultLine = line;
    this.defaultLineSaving = true;
    this.smsConfigService.setDefaultLine(line).subscribe({
      next: (config) => {
        this.defaultLineSaving = false;
        this.selectedDefaultLine = config.defaultLine ?? line;
        this.snack(this.translate.instant('settings.smsConfig.defaultLineSaved'));
      },
      error: (error) => {
        this.defaultLineSaving = false;
        this.selectedDefaultLine = previous;
        this.showError(error);
      }
    });
  }

  private resolveSmsProviderMessage(result: SmsProviderResult, fallbackKey = 'settings.smsConfig.creditUnavailable'): string {
    if (result.providerStatus != null) {
      const providerKey = `settings.smsConfig.providerStatus.${result.providerStatus}`;
      const providerMessage = this.translate.instant(providerKey);
      if (providerMessage !== providerKey) {
        return providerMessage;
      }
    }
    if (result.httpStatus != null) {
      const httpKey = `settings.smsConfig.httpStatus.${result.httpStatus}`;
      const httpMessage = this.translate.instant(httpKey);
      if (httpMessage !== httpKey) {
        return httpMessage;
      }
    }
    return this.translate.instant(fallbackKey);
  }

  saveSmsConfig(): void {
    if (this.smsConfigForm.invalid || !this.authService.isAdmin()) {
      this.smsConfigForm.markAllAsTouched();
      return;
    }
    const raw = this.smsConfigForm.getRawValue();
    const apiKey = String(raw.apiKey ?? '').trim();
    if (!this.smsApiKeyConfigured && !apiKey) {
      this.smsConfigForm.controls.apiKey.setErrors({ required: true });
      this.smsConfigForm.controls.apiKey.markAsTouched();
      return;
    }
    this.smsConfigSaving = true;
    this.smsConfigService.updateConfig({
      serverUrl: raw.serverUrl.trim(),
      apiKey: apiKey || undefined
    }).subscribe({
      next: (config) => {
        this.smsConfigSaving = false;
        this.smsApiKeyConfigured = config.apiKeyConfigured;
        this.smsConfigForm.patchValue({ serverUrl: config.serverUrl, apiKey: '' });
        this.applySmsApiKeyValidators();
        this.snack(this.translate.instant('settings.smsConfig.saved'));
        if (config.apiKeyConfigured) {
          this.loadSmsCredit();
          this.loadSmsLines();
        }
      },
      error: (error) => {
        this.smsConfigSaving = false;
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
    }, { emitEvent: false });
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    this.avatarSrc = this.usersService.resolveAvatarUrl(user.avatarUrl);
    const first = user.firstName?.charAt(0) ?? '';
    const last = user.lastName?.charAt(0) ?? '';
    this.profileInitials = `${first}${last}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
    this.emailVerified = user.emailVerified !== false;
    this.phoneVerified = user.phoneVerified !== false;
    this.emailNotificationsEnabled = user.emailNotificationsEnabled !== false;
    this.smsNotificationsEnabled = user.smsNotificationsEnabled === true;
    this.phoneOtpSent = false;
    this.phoneOtpCode = '';
    if (!this.emailTestTo && user.email) {
      this.emailTestTo = user.email;
    }
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
      next: (response) => {
        this.profileSaving = false;
        const user = response.user;
        if (response.accessToken && response.refreshToken) {
          this.authService.applySessionTokens(response.accessToken, response.refreshToken, user);
        } else {
          this.authService.setCurrentUser(user);
        }
        this.applyUser(user);
        this.snack(this.translate.instant('settings.profile.saved'));
        if (!user.emailVerified) {
          this.snack(this.translate.instant('settings.profile.verificationSentHint'));
        }
        if (user.phoneCountryCode && user.phoneNumber && user.phoneVerified === false) {
          this.snack(this.translate.instant('settings.profile.phoneVerificationSentHint'));
        }
      },
      error: (error) => {
        this.profileSaving = false;
        this.showError(error);
      }
    });
  }

  sendVerificationEmail(): void {
    if (this.verificationSending || this.emailVerified) {
      return;
    }
    this.verificationSending = true;
    this.usersService.sendVerificationEmail().subscribe({
      next: () => {
        this.verificationSending = false;
        this.snack(this.translate.instant('settings.profile.verificationSent'));
      },
      error: (error) => {
        this.verificationSending = false;
        this.showError(error);
      }
    });
  }

  onEmailNotificationsToggle(enabled: boolean): void {
    if (this.emailNotificationsSaving || enabled === this.emailNotificationsEnabled) {
      return;
    }
    const previous = this.emailNotificationsEnabled;
    this.emailNotificationsEnabled = enabled;
    this.emailNotificationsSaving = true;
    this.usersService.setEmailNotificationsEnabled(enabled).subscribe({
      next: (user) => {
        this.emailNotificationsSaving = false;
        this.applyUser(user);
        this.authService.setCurrentUser(user);
        this.snack(this.translate.instant(
          enabled ? 'settings.emailNotificationsEnabled' : 'settings.emailNotificationsDisabled'
        ));
      },
      error: (error) => {
        this.emailNotificationsSaving = false;
        this.emailNotificationsEnabled = previous;
        this.showError(error);
      }
    });
  }

  onSmsNotificationsToggle(enabled: boolean): void {
    if (this.smsNotificationsSaving || enabled === this.smsNotificationsEnabled || !this.hasVerifiedPhoneForSms) {
      return;
    }
    const previous = this.smsNotificationsEnabled;
    this.smsNotificationsEnabled = enabled;
    this.smsNotificationsSaving = true;
    this.usersService.setSmsNotificationsEnabled(enabled).subscribe({
      next: (user) => {
        this.smsNotificationsSaving = false;
        this.applyUser(user);
        this.authService.setCurrentUser(user);
        this.snack(this.translate.instant(
          enabled ? 'settings.smsNotificationsEnabled' : 'settings.smsNotificationsDisabled'
        ));
      },
      error: (error) => {
        this.smsNotificationsSaving = false;
        this.smsNotificationsEnabled = previous;
        this.showError(error);
      }
    });
  }

  sendPhoneVerification(): void {
    if (this.phoneVerificationSending || this.phoneVerified || !this.hasProfilePhone || this.profileForm.dirty) {
      return;
    }
    this.phoneVerificationSending = true;
    this.usersService.sendPhoneVerification().subscribe({
      next: () => {
        this.phoneVerificationSending = false;
        this.phoneOtpSent = true;
        this.snack(this.translate.instant('settings.profile.phoneVerificationSent'));
      },
      error: (error) => {
        this.phoneVerificationSending = false;
        this.showError(error);
      }
    });
  }

  verifyPhone(): void {
    const code = this.phoneOtpCode.trim();
    if (this.phoneVerifying || !code || this.phoneVerified) {
      return;
    }
    this.phoneVerifying = true;
    this.usersService.verifyPhone(code).subscribe({
      next: (user) => {
        this.phoneVerifying = false;
        this.applyUser(user);
        this.authService.setCurrentUser(user);
        this.snack(this.translate.instant('settings.profile.phoneVerifiedSuccess'));
      },
      error: (error) => {
        this.phoneVerifying = false;
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
