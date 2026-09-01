import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ApiErrorService } from '../../services/api-error.service';
import { SmsConfigService, SmsProviderResult } from '../../services/sms-config.service';
import { SmsBulkSendResult, SmsService } from '../../services/sms.service';
import { LocaleDatePipe, LocaleDigitsPipe, LocaleNumberPipe } from '../../pipes/locale-format.pipe';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';
import { DatetimeFilterFieldComponent } from '../../components/datetime-filter-field/datetime-filter-field.component';

interface MobileAnalysis {
  total: number;
  invalid: number;
  duplicates: number;
  sendable: string[];
}

@Component({
  selector: 'app-bulk-sms-send',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent,
    LocaleNumberPipe,
    LocaleDigitsPipe,
    LocaleDatePipe,
    DatetimeFilterFieldComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'sms.bulkSend.eyebrow' | translate"
        [title]="'sms.bulkSend.title' | translate"
        [subtitle]="'sms.bulkSend.subtitle' | translate">
      </app-page-hero>

      <div class="page-body bulk-wrap">
        @if (configLoading) {
          <p class="muted">{{ 'sms.bulkSend.loading' | translate }}</p>
        } @else if (!apiKeyConfigured) {
          <div class="notice-card">
            <mat-icon>info</mat-icon>
            <p>{{ 'sms.bulkSend.configRequired' | translate }}</p>
            <a mat-stroked-button routerLink="/settings" fragment="sms-config">
              {{ 'sms.bulkSend.openSettings' | translate }}
            </a>
          </div>
        } @else if (linesLoading) {
          <p class="muted">{{ 'sms.bulkSend.linesLoading' | translate }}</p>
        } @else if (linesLoadFailed) {
          <p class="muted">{{ 'sms.bulkSend.linesUnavailable' | translate }}</p>
          <button mat-stroked-button type="button" (click)="loadLines()">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.bulkSend.retry' | translate }}
          </button>
        } @else if (!smsLines.length) {
          <p class="muted">{{ 'sms.bulkSend.linesEmpty' | translate }}</p>
          <button mat-stroked-button type="button" (click)="loadLines()">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.bulkSend.retry' | translate }}
          </button>
        } @else {
          @if (completedResult?.success && completedResult?.data; as bulkData) {
            <div class="wizard-card result-card">
              <div class="result-header">
                <mat-icon class="result-icon">check_circle</mat-icon>
                <h2>{{ 'sms.bulkSend.success' | translate }}</h2>
              </div>
              <div class="result-details">
                <p>{{ 'sms.bulkSend.packId' | translate }}: <span dir="ltr">{{ bulkData.packId }}</span></p>
                <p>{{ 'sms.bulkSend.cost' | translate }}: {{ bulkData.cost ?? 0 | localeNumber }}</p>
                @if (bulkData.messageIds?.length) {
                  <p>{{ 'sms.bulkSend.messageIds' | translate }}:</p>
                  <p class="result-ids" dir="ltr">{{ bulkData.messageIds!.join(', ') | localeDigits }}</p>
                }
              </div>
              <button mat-flat-button color="primary" type="button" (click)="startAnother()">
                <mat-icon>add</mat-icon>
                {{ 'sms.bulkSend.sendAnother' | translate }}
              </button>
            </div>
          } @else {
            <div class="wizard-card">
              <nav class="stepper" aria-label="Bulk SMS steps">
                <div class="step" [class.active]="currentStep === 1" [class.done]="currentStep > 1">
                  <span class="step-icon">
                    @if (currentStep > 1) { <mat-icon>check</mat-icon> } @else { <mat-icon>groups</mat-icon> }
                  </span>
                  <div class="step-copy">
                    <span class="step-label">{{ 'sms.bulkSend.step1.label' | translate }}</span>
                    <span class="step-state">
                      @if (currentStep === 1) {
                        {{ 'sms.bulkSend.step1.inProgress' | translate }}
                      } @else {
                        {{ 'sms.bulkSend.step1.done' | translate }}
                      }
                    </span>
                  </div>
                </div>
                <div class="step-connector" [class.done]="currentStep > 1"></div>
                <div class="step" [class.active]="currentStep === 2" [class.done]="currentStep > 2">
                  <span class="step-icon">
                    @if (currentStep > 2) { <mat-icon>check</mat-icon> } @else { <mat-icon>sms</mat-icon> }
                  </span>
                  <div class="step-copy">
                    <span class="step-label">{{ 'sms.bulkSend.step2.label' | translate }}</span>
                    <span class="step-state">
                      @if (currentStep === 2) {
                        {{ 'sms.bulkSend.step2.inProgress' | translate }}
                      } @else if (currentStep > 2) {
                        {{ 'sms.bulkSend.step2.done' | translate }}
                      } @else {
                        {{ 'sms.bulkSend.step2.pending' | translate }}
                      }
                    </span>
                  </div>
                </div>
                <div class="step-connector" [class.done]="currentStep > 2"></div>
                <div class="step" [class.active]="currentStep === 3">
                  <span class="step-icon"><mat-icon>fact_check</mat-icon></span>
                  <div class="step-copy">
                    <span class="step-label">{{ 'sms.bulkSend.step3.label' | translate }}</span>
                    <span class="step-state">
                      @if (currentStep === 3) {
                        {{ 'sms.bulkSend.step3.inProgress' | translate }}
                      } @else {
                        {{ 'sms.bulkSend.step3.pending' | translate }}
                      }
                    </span>
                  </div>
                </div>
              </nav>

              @if (currentStep === 1) {
                <section class="wizard-panel">
                  <header class="panel-header">
                    <h2>{{ 'sms.bulkSend.step1.label' | translate }}</h2>
                    <p>{{ 'sms.bulkSend.step1.subtitle' | translate }}</p>
                  </header>

                  <form [formGroup]="form" class="sms-wizard-fields" (ngSubmit)="openContactsReview()">
                    <mat-form-field appearance="outline" class="full-width sms-control-field">
                      <mat-icon matPrefix>dialpad</mat-icon>
                      <mat-label>{{ 'sms.bulkSend.lineNumber' | translate }}</mat-label>
                      <mat-select formControlName="lineNumber">
                        @for (line of smsLines; track line) {
                          <mat-option [value]="line">{{ line | localeDigits }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <div class="schedule-block">
                      <p class="block-label">{{ 'sms.bulkSend.scheduleTitle' | translate }}</p>
                      <mat-radio-group formControlName="scheduleMode" class="schedule-options">
                        <mat-radio-button value="now">{{ 'sms.bulkSend.scheduleNow' | translate }}</mat-radio-button>
                        <mat-radio-button value="later">{{ 'sms.bulkSend.scheduleLater' | translate }}</mat-radio-button>
                      </mat-radio-group>
                      @if (form.controls.scheduleMode.value === 'later') {
                        <div class="schedule-datetime">
                          <app-datetime-filter-field
                            [fullWidth]="true"
                            [labelKey]="'sms.bulkSend.sendDate'"
                            [timeLabelKey]="'sms.bulkSend.sendTime'"
                            [hintKey]="scheduleInvalidKey ? '' : 'sms.bulkSend.sendDateTimeHint'"
                            [invalidKey]="scheduleInvalidKey"
                            [required]="true"
                            [touched]="form.controls.sendDateTime.touched"
                            [showClear]="false"
                            [minDate]="scheduleMinDate"
                            [maxDate]="scheduleMaxDate"
                            [isoValue]="scheduleIsoValue"
                            (isoValueChange)="onScheduleChange($event)">
                          </app-datetime-filter-field>
                        </div>
                      }
                    </div>

                    <mat-form-field appearance="outline" class="full-width sms-control-field">
                      <mat-icon matPrefix>groups</mat-icon>
                      <mat-label>{{ 'sms.bulkSend.mobiles' | translate }}</mat-label>
                      <textarea matInput formControlName="mobilesText" rows="6"
                                [placeholder]="'sms.bulkSend.mobilesPlaceholder' | translate"></textarea>
                      <mat-hint>{{ 'sms.bulkSend.mobilesHint' | translate:{ count: mobileAnalysis.sendable.length } }}</mat-hint>
                      @if (form.controls.mobilesText.hasError('required') && form.controls.mobilesText.touched) {
                        <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                      } @else if (form.controls.mobilesText.hasError('noSendable')) {
                        <mat-error>{{ 'sms.bulkSend.noSendableMobiles' | translate }}</mat-error>
                      } @else if (form.controls.mobilesText.hasError('maxMobiles')) {
                        <mat-error>{{ 'sms.bulkSend.mobilesMax' | translate }}</mat-error>
                      }
                    </mat-form-field>

                    <div class="wizard-actions">
                      <button mat-flat-button color="primary" type="submit">
                        {{ 'sms.bulkSend.nextStep' | translate }}
                        <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </form>
                </section>
              } @else if (currentStep === 2) {
                <section class="wizard-panel">
                  <header class="panel-header">
                    <h2>{{ 'sms.bulkSend.step2.label' | translate }}</h2>
                    <p>{{ 'sms.bulkSend.step2.subtitle' | translate }}</p>
                  </header>

                  <form [formGroup]="form" class="sms-wizard-fields" (ngSubmit)="goToSummary()">
                    <mat-form-field appearance="outline" class="full-width sms-control-field message-field">
                      <mat-icon matPrefix>sms</mat-icon>
                      <mat-label>{{ 'sms.bulkSend.messageText' | translate }}</mat-label>
                      <textarea matInput formControlName="messageText" rows="8"></textarea>
                      <mat-hint>{{ 'sms.bulkSend.charCount' | translate:{ count: messageLength, max: smsSingleLimit, parts: smsParts } }}</mat-hint>
                      @if (form.controls.messageText.hasError('required') && form.controls.messageText.touched) {
                        <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                      }
                    </mat-form-field>

                    <div class="wizard-actions">
                      <button mat-stroked-button type="button" (click)="editStep(1)">
                        <mat-icon>arrow_back</mat-icon>
                        {{ 'sms.bulkSend.previousStep' | translate }}
                      </button>
                      <button mat-flat-button color="primary" type="submit">
                        {{ 'sms.bulkSend.nextStep' | translate }}
                        <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </form>
                </section>
              } @else {
                <section class="wizard-panel">
                  <header class="panel-header">
                    <h2>{{ 'sms.bulkSend.summaryTitle' | translate }}</h2>
                    <p>{{ 'sms.bulkSend.summarySubtitle' | translate }}</p>
                  </header>

                  <div class="summary-sections">
                    <article class="summary-section">
                      <div class="summary-section-head">
                        <h3>{{ 'sms.bulkSend.sectionSender' | translate }}</h3>
                        <button mat-button type="button" class="edit-btn" (click)="editStep(1)">
                          <mat-icon>edit</mat-icon>
                          {{ 'sms.bulkSend.edit' | translate }}
                        </button>
                      </div>
                      <dl class="summary-dl">
                        <div>
                          <dt>{{ 'sms.bulkSend.lineNumber' | translate }}</dt>
                          <dd dir="ltr">{{ form.controls.lineNumber.value | localeDigits }}</dd>
                        </div>
                        <div>
                          <dt>{{ 'sms.bulkSend.recipientCount' | translate }}</dt>
                          <dd>{{ mobileAnalysis.sendable.length | localeNumber }}</dd>
                        </div>
                      </dl>
                    </article>

                    <article class="summary-section">
                      <div class="summary-section-head">
                        <h3>{{ 'sms.bulkSend.sectionMessage' | translate }}</h3>
                        <button mat-button type="button" class="edit-btn" (click)="editStep(2)">
                          <mat-icon>edit</mat-icon>
                          {{ 'sms.bulkSend.edit' | translate }}
                        </button>
                      </div>
                      <p class="message-preview">{{ form.controls.messageText.value }}</p>
                    </article>

                    <article class="summary-section">
                      <div class="summary-section-head">
                        <h3>{{ 'sms.bulkSend.sectionSchedule' | translate }}</h3>
                        <button mat-button type="button" class="edit-btn" (click)="editStep(1)">
                          <mat-icon>edit</mat-icon>
                          {{ 'sms.bulkSend.edit' | translate }}
                        </button>
                      </div>
                      <dl class="summary-dl">
                        <div>
                          <dt>{{ 'sms.bulkSend.scheduleTitle' | translate }}</dt>
                          <dd>
                            @if (form.controls.scheduleMode.value === 'now') {
                              {{ 'sms.bulkSend.sendNow' | translate }}
                            } @else {
                              <span class="cell-datetime" dir="ltr">
                                {{ form.controls.sendDateTime.value | localeDate:smsDateTimeFormat }}
                              </span>
                            }
                          </dd>
                        </div>
                      </dl>
                    </article>

                    <article class="summary-section">
                      <div class="summary-section-head">
                        <h3>{{ 'sms.bulkSend.sectionCost' | translate }}</h3>
                      </div>
                      <p class="cost-estimate">
                        {{ 'sms.bulkSend.estimatedTotal' | translate:{
                          parts: smsParts,
                          recipients: mobileAnalysis.sendable.length,
                          total: estimatedTotalSms
                        } }}
                      </p>
                    </article>
                  </div>

                  <div class="wizard-actions">
                    <button mat-stroked-button type="button" (click)="editStep(2)" [disabled]="sending">
                      <mat-icon>arrow_back</mat-icon>
                      {{ 'sms.bulkSend.previousStep' | translate }}
                    </button>
                    <button mat-flat-button color="primary" type="button"
                            (click)="confirmSend()" [disabled]="sending">
                      <mat-icon>send</mat-icon>
                      {{ 'sms.bulkSend.confirmSend' | translate }}
                    </button>
                  </div>
                </section>
              }
            </div>
          }
        }
      </div>

      @if (contactsDialogOpen) {
        <div class="dialog-backdrop" (click)="closeContactsReview()" aria-hidden="true"></div>
        <div class="contacts-dialog" role="dialog" aria-modal="true"
             [attr.aria-label]="'sms.bulkSend.contactsDialog.title' | translate">
          <h3>{{ 'sms.bulkSend.contactsDialog.title' | translate }}</h3>
          <dl class="contacts-stats">
            <div>
              <dt>{{ 'sms.bulkSend.contactsDialog.total' | translate }}</dt>
              <dd>{{ contactsReview.total | localeNumber }}</dd>
            </div>
            <div>
              <dt>{{ 'sms.bulkSend.contactsDialog.invalid' | translate }}</dt>
              <dd>{{ contactsReview.invalid | localeNumber }}</dd>
            </div>
            <div>
              <dt>{{ 'sms.bulkSend.contactsDialog.duplicates' | translate }}</dt>
              <dd>{{ contactsReview.duplicates | localeNumber }}</dd>
            </div>
            <div class="highlight">
              <dt>{{ 'sms.bulkSend.contactsDialog.sendable' | translate }}</dt>
              <dd>{{ contactsReview.sendable.length | localeNumber }}</dd>
            </div>
          </dl>
          <div class="dialog-actions">
            <button mat-button type="button" (click)="closeContactsReview()">
              {{ 'sms.bulkSend.contactsDialog.revise' | translate }}
            </button>
            <button mat-flat-button color="primary" type="button"
                    [disabled]="!contactsReview.sendable.length || contactsReview.sendable.length > 100"
                    (click)="confirmContactsAndNext()">
              {{ 'sms.bulkSend.contactsDialog.confirm' | translate }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .bulk-wrap { max-width: 820px; }

    .muted { color: var(--text-muted); font-size: 0.9rem; }

    .notice-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-secondary);
    }

    .notice-card mat-icon { color: var(--accent); }

    .wizard-card {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      padding: clamp(16px, 3vw, 24px);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }

    .stepper {
      display: flex;
      align-items: flex-start;
      gap: 0;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-light);
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      flex: 1;
      min-width: 0;
      color: var(--text-muted);
    }

    .step.active { color: var(--text-primary); }
    .step.done { color: var(--success); }

    .step-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 2px solid currentColor;
      flex-shrink: 0;
      opacity: 0.55;
    }

    .step.active .step-icon,
    .step.done .step-icon {
      opacity: 1;
      border-color: var(--accent);
      color: var(--accent);
      background: rgba(212, 175, 55, 0.1);
    }

    .step.done .step-icon {
      border-color: var(--success);
      color: var(--success);
      background: rgba(34, 197, 94, 0.1);
    }

    .step-icon mat-icon { font-size: 17px; width: 17px; height: 17px; }

    .step-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding-top: 3px;
    }

    .step-label { font-weight: 600; font-size: 0.82rem; line-height: 1.3; }
    .step-state { font-size: 0.74rem; opacity: 0.8; }

    .step-connector {
      width: 20px;
      height: 2px;
      margin-top: 17px;
      background: var(--border-color);
      flex-shrink: 0;
    }

    .step-connector.done { background: var(--success); }

    .panel-header h2 {
      margin: 0 0 6px;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .panel-header p {
      margin: 0 0 20px;
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .sms-wizard-fields { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }

    .schedule-block {
      margin: 8px 0 4px;
      padding: 14px 16px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      background: var(--bg-secondary, rgba(15, 23, 42, 0.02));
    }

    .block-label {
      margin: 0 0 10px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .schedule-options { display: flex; flex-direction: column; gap: 8px; }
    .schedule-datetime { margin-top: 12px; }

    .message-field textarea { min-height: 160px; resize: vertical; }

    .wizard-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
    }

    .summary-sections { display: flex; flex-direction: column; gap: 12px; }

    .summary-section {
      padding: 14px 16px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      background: var(--bg-secondary, rgba(15, 23, 42, 0.02));
    }

    .summary-section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .summary-section-head h3 {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .edit-btn {
      flex-shrink: 0;
      min-width: 0;
      padding: 0 8px;
      font-size: 0.82rem;
      color: var(--accent);
    }

    .edit-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-inline-end: 4px;
    }

    .summary-dl { margin: 0; display: grid; gap: 8px; }

    .summary-dl div {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      align-items: baseline;
    }

    .summary-dl dt {
      margin: 0;
      font-size: 0.82rem;
      color: var(--text-muted);
      min-width: 7rem;
    }

    .summary-dl dd {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .message-preview {
      margin: 0;
      padding: 12px;
      border-radius: var(--radius-sm, 6px);
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    .cost-estimate {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .result-card { text-align: start; }

    .result-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .result-header h2 { margin: 0; font-size: 1.1rem; color: var(--success); }

    .result-icon { color: var(--success); font-size: 28px; width: 28px; height: 28px; }

    .result-details {
      margin-bottom: 20px;
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .result-details p { margin: 0 0 4px; }
    .result-ids { margin: 0; word-break: break-all; }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(12, 17, 27, 0.55);
      z-index: 200;
    }

    .contacts-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 201;
      width: min(420px, calc(100vw - 32px));
      padding: 24px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-primary);
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
    }

    .contacts-dialog h3 {
      margin: 0 0 16px;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .contacts-stats {
      margin: 0 0 20px;
      display: grid;
      gap: 10px;
    }

    .contacts-stats div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .contacts-stats div.highlight dt,
    .contacts-stats div.highlight dd {
      color: var(--accent-dark, var(--accent));
      font-weight: 700;
    }

    .contacts-stats dt {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-secondary);
    }

    .contacts-stats dd {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }

    @media (max-width: 720px) {
      .stepper { flex-direction: column; gap: 10px; }
      .step-connector { width: 2px; height: 16px; margin: 0 0 0 16px; }
    }
  `]
})
export class BulkSmsSendComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly smsConfigService = inject(SmsConfigService);
  private readonly smsService = inject(SmsService);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly scheduleMinDate = new Date(Date.now() + 60 * 60 * 1000);
  readonly scheduleMaxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  readonly smsDateTimeFormat = SMS_DATETIME_FORMAT;

  configLoading = true;
  apiKeyConfigured = false;
  linesLoading = false;
  linesLoadFailed = false;
  smsLines: string[] = [];
  defaultLine = '';
  currentStep: 1 | 2 | 3 = 1;
  sending = false;
  contactsDialogOpen = false;
  contactsReview: MobileAnalysis = { total: 0, invalid: 0, duplicates: 0, sendable: [] };
  completedResult: SmsBulkSendResult | null = null;

  form = this.fb.nonNullable.group({
    lineNumber: ['', Validators.required],
    mobilesText: ['', [Validators.required, this.mobilesValidator.bind(this)]],
    scheduleMode: ['now' as 'now' | 'later', Validators.required],
    sendDateTime: [null as string | null, this.scheduleDateTimeValidator.bind(this)],
    messageText: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  get mobileAnalysis(): MobileAnalysis {
    return this.analyzeMobiles(this.form.controls.mobilesText.value);
  }

  get scheduleIsoValue(): string | null {
    return this.form.controls.sendDateTime.value;
  }

  get scheduleInvalidKey(): string {
    const control = this.form.controls.sendDateTime;
    if (!control.touched || !control.hasError('scheduleInvalid')) {
      return '';
    }
    return 'sms.bulkSend.sendDateTimeInvalid';
  }

  get messageLength(): number {
    return this.form.controls.messageText.value.length;
  }

  get smsSingleLimit(): number {
    return this.isPersianOrArabicSmsContent(this.form.controls.messageText.value) ? 70 : 160;
  }

  get smsMultipartUnit(): number {
    return this.isPersianOrArabicSmsContent(this.form.controls.messageText.value) ? 67 : 153;
  }

  get smsParts(): number {
    const length = this.messageLength;
    if (length === 0) {
      return 0;
    }
    return length <= this.smsSingleLimit ? 1 : Math.ceil(length / this.smsMultipartUnit);
  }

  get estimatedTotalSms(): number {
    return this.smsParts * this.mobileAnalysis.sendable.length;
  }

  ngOnInit(): void {
    this.form.controls.scheduleMode.valueChanges.subscribe((mode) => {
      const sendDateTime = this.form.controls.sendDateTime;
      if (mode === 'later') {
        sendDateTime.setValidators([Validators.required, this.scheduleDateTimeValidator.bind(this)]);
      } else {
        sendDateTime.clearValidators();
        sendDateTime.setValue(null);
      }
      sendDateTime.updateValueAndValidity({ emitEvent: false });
    });

    this.smsConfigService.getConfig().subscribe({
      next: (config) => {
        this.configLoading = false;
        this.apiKeyConfigured = config.apiKeyConfigured;
        this.defaultLine = config.defaultLine ?? '';
        if (config.apiKeyConfigured) {
          this.loadLines();
        }
      },
      error: (error) => {
        this.configLoading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  loadLines(): void {
    this.linesLoading = true;
    this.linesLoadFailed = false;
    this.smsConfigService.getLines().subscribe({
      next: (linesResult) => {
        this.linesLoading = false;
        this.smsLines = linesResult.success && linesResult.lines ? [...linesResult.lines] : [];
        if (!linesResult.success) {
          this.linesLoadFailed = true;
          this.showError(this.resolveProviderMessage(linesResult, 'sms.bulkSend.linesUnavailable'));
          return;
        }
        this.syncLineField();
      },
      error: (error) => {
        this.linesLoading = false;
        this.smsLines = [];
        this.linesLoadFailed = true;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  openContactsReview(): void {
    if (!this.validateStep1()) {
      return;
    }
    this.contactsReview = this.mobileAnalysis;
    this.contactsDialogOpen = true;
  }

  closeContactsReview(): void {
    this.contactsDialogOpen = false;
  }

  confirmContactsAndNext(): void {
    if (!this.contactsReview.sendable.length || this.contactsReview.sendable.length > 100) {
      return;
    }
    this.contactsDialogOpen = false;
    this.currentStep = 2;
  }

  goToSummary(): void {
    if (this.form.controls.messageText.invalid) {
      this.form.controls.messageText.markAsTouched();
      return;
    }
    this.currentStep = 3;
  }

  editStep(step: 1 | 2 | 3): void {
    this.currentStep = step;
  }

  confirmSend(): void {
    if (!this.validateStep1() || this.form.controls.messageText.invalid) {
      if (this.form.controls.messageText.invalid) {
        this.editStep(2);
        this.form.controls.messageText.markAsTouched();
      } else {
        this.editStep(1);
        this.form.markAllAsTouched();
      }
      return;
    }

    const raw = this.form.getRawValue();
    const mobiles = this.mobileAnalysis.sendable;
    let sendDateTime: number | undefined;
    if (raw.scheduleMode === 'later' && raw.sendDateTime) {
      const epochMs = new Date(raw.sendDateTime).getTime();
      if (!Number.isNaN(epochMs)) {
        sendDateTime = Math.floor(epochMs / 1000);
      }
    }

    this.sending = true;
    this.smsService.sendBulk({
      lineNumber: raw.lineNumber,
      messageText: raw.messageText.trim(),
      mobiles,
      sendDateTime,
      sendSource: 'BULK'
    }).subscribe({
      next: (sendResult) => {
        this.sending = false;
        if (sendResult.success) {
          this.completedResult = sendResult;
          this.snack(this.translate.instant('sms.bulkSend.success'));
          return;
        }
        this.showError(this.resolveProviderMessage(sendResult, 'sms.bulkSend.failed'));
      },
      error: (error) => {
        this.sending = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  startAnother(): void {
    this.completedResult = null;
    this.currentStep = 1;
    this.contactsDialogOpen = false;
    this.form.reset({
      lineNumber: this.defaultLine && this.smsLines.includes(this.defaultLine)
        ? this.defaultLine
        : this.smsLines[0] ?? '',
      mobilesText: '',
      scheduleMode: 'now',
      sendDateTime: null,
      messageText: ''
    });
  }

  onScheduleChange(value: string | null): void {
    const control = this.form.controls.sendDateTime;
    control.setValue(value);
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  private validateStep1(): boolean {
    const mobilesControl = this.form.controls.mobilesText;
    const analysis = this.mobileAnalysis;
    if (!analysis.sendable.length) {
      mobilesControl.setErrors({ ...(mobilesControl.errors ?? {}), noSendable: true });
      mobilesControl.markAsTouched();
    }
    if (analysis.sendable.length > 100) {
      mobilesControl.setErrors({ ...(mobilesControl.errors ?? {}), maxMobiles: true });
      mobilesControl.markAsTouched();
    }
    if (this.form.controls.scheduleMode.value === 'later') {
      this.form.controls.sendDateTime.markAsTouched();
      this.form.controls.sendDateTime.updateValueAndValidity();
    }
    if (this.form.controls.lineNumber.invalid || mobilesControl.invalid) {
      this.form.markAllAsTouched();
      return false;
    }
    if (this.form.controls.scheduleMode.value === 'later' && this.form.controls.sendDateTime.invalid) {
      return false;
    }
    return true;
  }

  private analyzeMobiles(text: string): MobileAnalysis {
    const entries = text.split(/[\n,;]+/).map((entry) => entry.trim()).filter(Boolean);
    const seen = new Set<string>();
    let invalid = 0;
    let duplicates = 0;
    const sendable: string[] = [];

    for (const entry of entries) {
      const normalized = this.normalizeMobile(entry);
      if (!/^9\d{9}$/.test(normalized)) {
        invalid++;
        continue;
      }
      if (seen.has(normalized)) {
        duplicates++;
        continue;
      }
      seen.add(normalized);
      sendable.push(normalized);
    }

    return { total: entries.length, invalid, duplicates, sendable };
  }

  private mobilesValidator(control: AbstractControl): ValidationErrors | null {
    const analysis = this.analyzeMobiles(String(control.value ?? ''));
    if (!analysis.sendable.length && String(control.value ?? '').trim()) {
      return { noSendable: true };
    }
    if (analysis.sendable.length > 100) {
      return { maxMobiles: true };
    }
    return null;
  }

  private scheduleDateTimeValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }
    const scheduled = new Date(value);
    if (Number.isNaN(scheduled.getTime())) {
      return { scheduleInvalid: true };
    }
    if (scheduled.getTime() < this.scheduleMinDate.getTime()) {
      return { scheduleInvalid: true };
    }
    if (scheduled.getTime() > this.scheduleMaxDate.getTime()) {
      return { scheduleInvalid: true };
    }
    return null;
  }

  private isPersianOrArabicSmsContent(text: string): boolean {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  }

  private normalizeMobile(value: string): string {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('98') && digits.length === 12) {
      digits = digits.slice(2);
    }
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
    return digits;
  }

  private syncLineField(): void {
    const preferred = this.defaultLine && this.smsLines.includes(this.defaultLine)
      ? this.defaultLine
      : this.smsLines[0] ?? '';
    if (preferred) {
      this.form.patchValue({ lineNumber: preferred }, { emitEvent: false });
    }
  }

  private resolveProviderMessage(result: SmsProviderResult, fallbackKey: string): string {
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

  private snack(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3500 });
  }

  private showError(message: string): void {
    this.snackBar.open(message, this.translate.instant('common.close'), {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
