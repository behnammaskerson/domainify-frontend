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

@Component({
  selector: 'app-single-sms-send',
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
        [eyebrow]="'sms.singleSend.eyebrow' | translate"
        [title]="'sms.singleSend.title' | translate"
        [subtitle]="'sms.singleSend.subtitle' | translate">
      </app-page-hero>

      <div class="page-body single-wrap">
        @if (configLoading) {
          <p class="muted">{{ 'sms.singleSend.loading' | translate }}</p>
        } @else if (!apiKeyConfigured) {
          <div class="notice-card">
            <mat-icon>info</mat-icon>
            <p>{{ 'sms.singleSend.configRequired' | translate }}</p>
            <a mat-stroked-button routerLink="/settings" fragment="sms-config">
              {{ 'sms.singleSend.openSettings' | translate }}
            </a>
          </div>
        } @else if (linesLoading) {
          <p class="muted">{{ 'sms.singleSend.linesLoading' | translate }}</p>
        } @else if (linesLoadFailed) {
          <p class="muted">{{ 'sms.singleSend.linesUnavailable' | translate }}</p>
          <button mat-stroked-button type="button" (click)="loadLines()">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.singleSend.retry' | translate }}
          </button>
        } @else if (!smsLines.length) {
          <p class="muted">{{ 'sms.singleSend.linesEmpty' | translate }}</p>
          <button mat-stroked-button type="button" (click)="loadLines()">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.singleSend.retry' | translate }}
          </button>
        } @else {
          @if (completedResult?.success && completedResult?.data; as sendData) {
            <div class="wizard-card result-card">
              <div class="result-header">
                <mat-icon class="result-icon">check_circle</mat-icon>
                <h2>{{ 'sms.singleSend.success' | translate }}</h2>
              </div>
              <div class="result-details">
                <p>{{ 'sms.singleSend.packId' | translate }}: <span dir="ltr">{{ sendData.packId }}</span></p>
                <p>{{ 'sms.singleSend.cost' | translate }}: {{ sendData.cost ?? 0 | localeNumber }}</p>
                @if (sendData.messageIds?.length) {
                  <p>{{ 'sms.singleSend.messageIds' | translate }}:</p>
                  <p class="result-ids" dir="ltr">{{ sendData.messageIds!.join(', ') | localeDigits }}</p>
                }
              </div>
              <button mat-flat-button color="primary" type="button" (click)="startAnother()">
                <mat-icon>add</mat-icon>
                {{ 'sms.singleSend.sendAnother' | translate }}
              </button>
            </div>
          } @else {
          <div class="wizard-card">
            <nav class="stepper" aria-label="SMS send steps">
              <div class="step" [class.active]="currentStep === 1" [class.done]="currentStep > 1">
                <span class="step-icon">
                  @if (currentStep > 1) {
                    <mat-icon>check</mat-icon>
                  } @else {
                    <mat-icon>edit</mat-icon>
                  }
                </span>
                <div class="step-copy">
                  <span class="step-label">{{ 'sms.singleSend.step1.label' | translate }}</span>
                  <span class="step-state">
                    @if (currentStep === 1) {
                      {{ 'sms.singleSend.step1.inProgress' | translate }}
                    } @else {
                      {{ 'sms.singleSend.step1.done' | translate }}
                    }
                  </span>
                </div>
              </div>
              <div class="step-connector" [class.done]="currentStep > 1"></div>
              <div class="step" [class.active]="currentStep === 2">
                <span class="step-icon">
                  <mat-icon>fact_check</mat-icon>
                </span>
                <div class="step-copy">
                  <span class="step-label">{{ 'sms.singleSend.step2.label' | translate }}</span>
                  <span class="step-state">
                    @if (currentStep === 2) {
                      {{ 'sms.singleSend.step2.inProgress' | translate }}
                    } @else {
                      {{ 'sms.singleSend.step2.pending' | translate }}
                    }
                  </span>
                </div>
              </div>
            </nav>

            @if (currentStep === 1) {
              <section class="wizard-panel">
                <header class="panel-header">
                  <h2>{{ 'sms.singleSend.step1.label' | translate }}</h2>
                  <p>{{ 'sms.singleSend.step1.subtitle' | translate }}</p>
                </header>

                <form [formGroup]="form" class="sms-wizard-fields" (ngSubmit)="goToSummary()">
                  <div class="field-row">
                    <mat-form-field appearance="outline" class="full-width sms-control-field">
                      <mat-icon matPrefix>dialpad</mat-icon>
                      <mat-label>{{ 'sms.singleSend.lineNumber' | translate }}</mat-label>
                      <mat-select formControlName="lineNumber">
                        @for (line of smsLines; track line) {
                          <mat-option [value]="line">{{ line | localeDigits }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width sms-control-field">
                      <mat-icon matPrefix>phone_iphone</mat-icon>
                      <mat-label>{{ 'sms.singleSend.mobile' | translate }}</mat-label>
                      <input matInput formControlName="mobile" dir="ltr" inputmode="tel"
                             [placeholder]="'sms.singleSend.mobilePlaceholder' | translate">
                      @if (form.controls.mobile.hasError('required') && form.controls.mobile.touched) {
                        <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                      } @else if (form.controls.mobile.hasError('mobileInvalid')) {
                        <mat-error>{{ 'sms.singleSend.mobileInvalid' | translate }}</mat-error>
                      }
                    </mat-form-field>
                  </div>

                  <div class="schedule-block">
                    <p class="block-label">{{ 'sms.singleSend.scheduleTitle' | translate }}</p>
                    <mat-radio-group formControlName="scheduleMode" class="schedule-options">
                      <mat-radio-button value="now">{{ 'sms.singleSend.scheduleNow' | translate }}</mat-radio-button>
                      <mat-radio-button value="later">{{ 'sms.singleSend.scheduleLater' | translate }}</mat-radio-button>
                    </mat-radio-group>
                    @if (form.controls.scheduleMode.value === 'later') {
                      <div class="schedule-datetime">
                        <app-datetime-filter-field
                          [fullWidth]="true"
                          [labelKey]="'sms.singleSend.sendDate'"
                          [timeLabelKey]="'sms.singleSend.sendTime'"
                          [hintKey]="scheduleInvalidKey ? '' : 'sms.singleSend.sendDateTimeHint'"
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

                  <mat-form-field appearance="outline" class="full-width sms-control-field message-field">
                    <mat-icon matPrefix>sms</mat-icon>
                    <mat-label>{{ 'sms.singleSend.messageText' | translate }}</mat-label>
                    <textarea matInput formControlName="messageText" rows="5"></textarea>
                    <mat-hint>{{ 'sms.singleSend.charCount' | translate:{ count: messageLength, max: smsSingleLimit, parts: smsParts } }}</mat-hint>
                    @if (form.controls.messageText.hasError('required') && form.controls.messageText.touched) {
                      <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                    }
                  </mat-form-field>

                  <div class="wizard-actions">
                    <button mat-flat-button color="primary" type="submit">
                      {{ 'sms.singleSend.nextStep' | translate }}
                      <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                    </button>
                  </div>
                </form>
              </section>
            } @else {
              <section class="wizard-panel">
                <header class="panel-header">
                  <h2>{{ 'sms.singleSend.summaryTitle' | translate }}</h2>
                  <p>{{ 'sms.singleSend.summarySubtitle' | translate }}</p>
                </header>

                <div class="summary-sections">
                  <article class="summary-section">
                    <div class="summary-section-head">
                      <h3>{{ 'sms.singleSend.sectionSender' | translate }}</h3>
                      <button mat-button type="button" class="edit-btn" (click)="editStep(1)">
                        <mat-icon>edit</mat-icon>
                        {{ 'sms.singleSend.edit' | translate }}
                      </button>
                    </div>
                    <dl class="summary-dl">
                      <div>
                        <dt>{{ 'sms.singleSend.lineNumber' | translate }}</dt>
                        <dd dir="ltr">{{ form.controls.lineNumber.value | localeDigits }}</dd>
                      </div>
                      <div>
                        <dt>{{ 'sms.singleSend.mobile' | translate }}</dt>
                        <dd dir="ltr">{{ form.controls.mobile.value | localeDigits }}</dd>
                      </div>
                    </dl>
                  </article>

                  <article class="summary-section">
                    <div class="summary-section-head">
                      <h3>{{ 'sms.singleSend.sectionMessage' | translate }}</h3>
                      <button mat-button type="button" class="edit-btn" (click)="editStep(1)">
                        <mat-icon>edit</mat-icon>
                        {{ 'sms.singleSend.edit' | translate }}
                      </button>
                    </div>
                    <p class="message-preview">{{ form.controls.messageText.value }}</p>
                  </article>

                  <article class="summary-section">
                    <div class="summary-section-head">
                      <h3>{{ 'sms.singleSend.sectionSchedule' | translate }}</h3>
                      <button mat-button type="button" class="edit-btn" (click)="editStep(1)">
                        <mat-icon>edit</mat-icon>
                        {{ 'sms.singleSend.edit' | translate }}
                      </button>
                    </div>
                    <dl class="summary-dl">
                      <div>
                        <dt>{{ 'sms.singleSend.scheduleTitle' | translate }}</dt>
                        <dd>
                          @if (form.controls.scheduleMode.value === 'now') {
                            {{ 'sms.singleSend.sendNow' | translate }}
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
                      <h3>{{ 'sms.singleSend.sectionCost' | translate }}</h3>
                    </div>
                    <p class="cost-estimate">
                      {{ 'sms.singleSend.estimatedParts' | translate:{ parts: smsParts } }}
                    </p>
                  </article>
                </div>

                <div class="wizard-actions">
                  <button mat-stroked-button type="button" (click)="editStep(1)" [disabled]="sending">
                    <mat-icon>arrow_back</mat-icon>
                    {{ 'sms.singleSend.previousStep' | translate }}
                  </button>
                  <button mat-flat-button color="primary" type="button"
                          (click)="confirmSend()" [disabled]="sending">
                    <mat-icon>send</mat-icon>
                    {{ 'sms.singleSend.confirmSend' | translate }}
                  </button>
                </div>
              </section>
            }
          </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .single-wrap {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .muted {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

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

    .notice-card mat-icon {
      color: var(--accent);
    }

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
      gap: 12px;
      flex: 1;
      min-width: 0;
      color: var(--text-muted);
    }

    .step.active {
      color: var(--text-primary);
    }

    .step.done {
      color: var(--success);
    }

    .step-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
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

    .step-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .step-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding-top: 4px;
    }

    .step-label {
      font-weight: 600;
      font-size: 0.9rem;
      line-height: 1.3;
    }

    .step-state {
      font-size: 0.78rem;
      opacity: 0.8;
    }

    .step-connector {
      width: 32px;
      height: 2px;
      margin-top: 18px;
      background: var(--border-color);
      flex-shrink: 0;
    }

    .step-connector.done {
      background: var(--success);
    }

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

    .sms-wizard-fields {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .full-width {
      width: 100%;
    }

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

    .schedule-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .schedule-field {
      margin-top: 12px;
    }

    .schedule-datetime {
      margin-top: 12px;
    }

    .schedule-datetime ::ng-deep .datetime-filter.full-width .date-field,
    .schedule-datetime ::ng-deep .datetime-filter.full-width .time-field {
      font-size: inherit;
    }

    .message-field textarea {
      min-height: 120px;
      resize: vertical;
    }

    .wizard-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
    }

    .summary-sections {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

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

    .summary-dl {
      margin: 0;
      display: grid;
      gap: 8px;
    }

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

    .result-card {
      text-align: start;
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .result-header h2 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--success);
    }

    .result-icon {
      color: var(--success);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .result-details {
      margin-bottom: 20px;
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .result-details p {
      margin: 0 0 4px;
    }

    .result-ids {
      margin: 0;
      word-break: break-all;
    }

    @media (max-width: 640px) {
      .field-row {
        grid-template-columns: 1fr;
      }

      .stepper {
        flex-direction: column;
        gap: 12px;
      }

      .step-connector {
        width: 2px;
        height: 20px;
        margin: 0 0 0 17px;
      }
    }
  `]
})
export class SingleSmsSendComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly smsConfigService = inject(SmsConfigService);
  private readonly smsService = inject(SmsService);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly scheduleMinDate = new Date(Date.now() + 60 * 60 * 1000);
  readonly scheduleMaxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  configLoading = true;
  apiKeyConfigured = false;
  linesLoading = false;
  linesLoadFailed = false;
  smsLines: string[] = [];
  defaultLine = '';
  currentStep: 1 | 2 = 1;
  sending = false;
  completedResult: SmsBulkSendResult | null = null;

  form = this.fb.nonNullable.group({
    lineNumber: ['', Validators.required],
    mobile: ['', [Validators.required, this.mobileValidator.bind(this)]],
    messageText: ['', [Validators.required, Validators.maxLength(2000)]],
    scheduleMode: ['now' as 'now' | 'later', Validators.required],
    sendDateTime: [null as string | null, this.scheduleDateTimeValidator.bind(this)]
  });

  get scheduleIsoValue(): string | null {
    return this.form.controls.sendDateTime.value;
  }

  get scheduleInvalidKey(): string {
    const control = this.form.controls.sendDateTime;
    if (!control.touched) {
      return '';
    }
    if (control.hasError('scheduleInvalid')) {
      return 'sms.singleSend.sendDateTimeInvalid';
    }
    return '';
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

  readonly smsDateTimeFormat = SMS_DATETIME_FORMAT;

  get smsParts(): number {
    const length = this.messageLength;
    if (length === 0) {
      return 0;
    }
    return length <= this.smsSingleLimit ? 1 : Math.ceil(length / this.smsMultipartUnit);
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
          this.showError(this.resolveProviderMessage(linesResult, 'sms.singleSend.linesUnavailable'));
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

  onScheduleChange(value: string | null): void {
    const control = this.form.controls.sendDateTime;
    control.setValue(value);
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  goToSummary(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.currentStep = 2;
  }

  editStep(step: 1 | 2): void {
    this.currentStep = step;
  }

  confirmSend(): void {
    if (this.form.invalid) {
      this.editStep(1);
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const mobile = this.normalizeMobile(raw.mobile);
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
      mobiles: [mobile],
      sendDateTime,
      sendSource: 'SINGLE'
    }).subscribe({
      next: (sendResult) => {
        this.sending = false;
        if (sendResult.success) {
          this.completedResult = sendResult;
          this.snack(this.translate.instant('sms.singleSend.success'));
          return;
        }
        this.showError(this.resolveProviderMessage(sendResult, 'sms.singleSend.failed'));
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
    this.form.reset({
      lineNumber: this.defaultLine && this.smsLines.includes(this.defaultLine)
        ? this.defaultLine
        : this.smsLines[0] ?? '',
      mobile: '',
      messageText: '',
      scheduleMode: 'now',
      sendDateTime: null
    });
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

  private syncLineField(): void {
    const preferred = this.defaultLine && this.smsLines.includes(this.defaultLine)
      ? this.defaultLine
      : this.smsLines[0] ?? '';
    if (preferred) {
      this.form.patchValue({ lineNumber: preferred }, { emitEvent: false });
    }
  }

  private mobileValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }
    const normalized = this.normalizeMobile(value);
    if (!/^9\d{9}$/.test(normalized)) {
      return { mobileInvalid: true };
    }
    return null;
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
