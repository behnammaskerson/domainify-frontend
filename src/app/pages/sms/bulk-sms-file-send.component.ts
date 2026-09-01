import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
import {
  MobileAnalysis,
  analyzeMobileEntries,
  isSupportedContactsFile,
  parseContactsFile
} from '../../utils/sms-contacts.util';

interface UploadedContactsFile {
  name: string;
  size: number;
}

@Component({
  selector: 'app-bulk-sms-file-send',
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
        [eyebrow]="'sms.bulkFileSend.eyebrow' | translate"
        [title]="'sms.bulkFileSend.title' | translate"
        [subtitle]="'sms.bulkFileSend.subtitle' | translate">
      </app-page-hero>

      <div class="page-body bulk-wrap">
        @if (configLoading) {
          <p class="muted">{{ 'sms.bulkFileSend.loading' | translate }}</p>
        } @else if (!apiKeyConfigured) {
          <div class="notice-card">
            <mat-icon>info</mat-icon>
            <p>{{ 'sms.bulkFileSend.configRequired' | translate }}</p>
            <a mat-stroked-button routerLink="/settings" fragment="sms-config">
              {{ 'sms.bulkFileSend.openSettings' | translate }}
            </a>
          </div>
        } @else if (linesLoading) {
          <p class="muted">{{ 'sms.bulkFileSend.linesLoading' | translate }}</p>
        } @else if (linesLoadFailed) {
          <p class="muted">{{ 'sms.bulkFileSend.linesUnavailable' | translate }}</p>
          <button mat-stroked-button type="button" (click)="loadLines()">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.bulkFileSend.retry' | translate }}
          </button>
        } @else if (!smsLines.length) {
          <p class="muted">{{ 'sms.bulkFileSend.linesEmpty' | translate }}</p>
          <button mat-stroked-button type="button" (click)="loadLines()">
            <mat-icon>refresh</mat-icon>
            {{ 'sms.bulkFileSend.retry' | translate }}
          </button>
        } @else {
          @if (completedResult?.success && completedResult?.data; as bulkData) {
            <div class="wizard-card result-card">
              <div class="result-header">
                <mat-icon class="result-icon">check_circle</mat-icon>
                <h2>{{ 'sms.bulkFileSend.success' | translate }}</h2>
              </div>
              <div class="result-details">
                <p>{{ 'sms.bulkFileSend.packId' | translate }}: <span dir="ltr">{{ bulkData.packId }}</span></p>
                <p>{{ 'sms.bulkFileSend.cost' | translate }}: {{ bulkData.cost ?? 0 | localeNumber }}</p>
                @if (bulkData.messageIds?.length) {
                  <p>{{ 'sms.bulkFileSend.messageIds' | translate }}:</p>
                  <p class="result-ids" dir="ltr">{{ bulkData.messageIds!.join(', ') | localeDigits }}</p>
                }
              </div>
              <button mat-flat-button color="primary" type="button" (click)="startAnother()">
                <mat-icon>add</mat-icon>
                {{ 'sms.bulkFileSend.sendAnother' | translate }}
              </button>
            </div>
          } @else {
            <div class="wizard-card">
              <nav class="stepper" aria-label="Bulk SMS file steps">
                @for (step of [1, 2, 3]; track step; let last = $last) {
                  @if (step > 1) {
                    <div class="step-connector" [class.done]="currentStep > step - 1"></div>
                  }
                  <div class="step"
                       [class.active]="currentStep === step"
                       [class.done]="currentStep > step">
                    <span class="step-icon">
                      @if (currentStep > step) {
                        <mat-icon>check</mat-icon>
                      } @else if (step === 1) {
                        <mat-icon>upload_file</mat-icon>
                      } @else if (step === 2) {
                        <mat-icon>sms</mat-icon>
                      } @else {
                        <mat-icon>fact_check</mat-icon>
                      }
                    </span>
                    <div class="step-copy">
                      <span class="step-label">{{ ('sms.bulkFileSend.step' + step + '.label') | translate }}</span>
                      <span class="step-state">{{ stepStateLabel(step) | translate }}</span>
                    </div>
                  </div>
                }
              </nav>

              @if (currentStep === 1) {
                <section class="wizard-panel">
                  <header class="panel-header">
                    <h2>{{ 'sms.bulkFileSend.step1.label' | translate }}</h2>
                    <p>{{ 'sms.bulkFileSend.step1.subtitle' | translate }}</p>
                  </header>

                  <form [formGroup]="form" class="sms-wizard-fields" (ngSubmit)="goToMessageStep()">
                    <mat-form-field appearance="outline" class="full-width sms-control-field">
                      <mat-icon matPrefix>dialpad</mat-icon>
                      <mat-label>{{ 'sms.bulkFileSend.lineNumber' | translate }}</mat-label>
                      <mat-select formControlName="lineNumber">
                        @for (line of smsLines; track line) {
                          <mat-option [value]="line">{{ line | localeDigits }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    <div class="schedule-block">
                      <p class="block-label">{{ 'sms.bulkFileSend.scheduleTitle' | translate }}</p>
                      <mat-radio-group formControlName="scheduleMode" class="schedule-options">
                        <mat-radio-button value="now">{{ 'sms.bulkFileSend.scheduleNow' | translate }}</mat-radio-button>
                        <mat-radio-button value="later">{{ 'sms.bulkFileSend.scheduleLater' | translate }}</mat-radio-button>
                      </mat-radio-group>
                      @if (form.controls.scheduleMode.value === 'later') {
                        <div class="schedule-datetime">
                          <app-datetime-filter-field
                            [fullWidth]="true"
                            [labelKey]="'sms.bulkFileSend.sendDate'"
                            [timeLabelKey]="'sms.bulkFileSend.sendTime'"
                            [hintKey]="scheduleInvalidKey ? '' : 'sms.bulkFileSend.sendDateTimeHint'"
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

                    <div class="file-section">
                      <p class="block-label">{{ 'sms.bulkFileSend.uploadTitle' | translate }}</p>
                      <div class="sample-downloads">
                        <a mat-stroked-button download href="assets/sms-samples/simple-send.txt">
                          <mat-icon>description</mat-icon>
                          {{ 'sms.bulkFileSend.sampleTxt' | translate }}
                        </a>
                        <a mat-stroked-button download href="assets/sms-samples/simple-send.xlsx">
                          <mat-icon>table_chart</mat-icon>
                          {{ 'sms.bulkFileSend.sampleExcel' | translate }}
                        </a>
                      </div>

                      <div class="upload-zone"
                           [class.dragover]="dragOver"
                           (dragover)="onDragOver($event)"
                           (dragleave)="onDragLeave()"
                           (drop)="onDrop($event)"
                           (click)="fileInput.click()">
                        <input #fileInput type="file"
                               accept=".txt,.xls,.xlsx,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                               hidden
                               (change)="onFileSelected($event)">
                        <mat-icon class="upload-icon">cloud_upload</mat-icon>
                        <p class="upload-title">{{ 'sms.bulkFileSend.uploadPrompt' | translate }}</p>
                        <p class="upload-hint">{{ 'sms.bulkFileSend.uploadFormats' | translate }}</p>
                        <button mat-stroked-button type="button" (click)="fileInput.click(); $event.stopPropagation()">
                          {{ 'sms.bulkFileSend.uploadButton' | translate }}
                        </button>
                      </div>
                      <p class="file-note">{{ 'sms.bulkFileSend.fileStructureNote' | translate }}</p>

                      @if (fileParsing) {
                        <p class="muted">{{ 'sms.bulkFileSend.fileParsing' | translate }}</p>
                      }

                      @if (uploadedFile) {
                        <div class="uploaded-file">
                          <mat-icon>insert_drive_file</mat-icon>
                          <div class="uploaded-meta">
                            <span class="uploaded-name">{{ uploadedFile.name }}</span>
                            <span class="uploaded-size">{{ formatFileSize(uploadedFile.size) }}</span>
                          </div>
                          <button mat-icon-button type="button"
                                  [attr.aria-label]="'common.clear' | translate"
                                  (click)="removeUploadedFile()">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      }
                    </div>

                    <div class="wizard-actions">
                      <button mat-flat-button color="primary" type="submit"
                              [disabled]="!contactsConfirmed || !mobileAnalysis.sendable.length || fileParsing">
                        {{ 'sms.bulkFileSend.nextStep' | translate }}
                        <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </form>
                </section>
              } @else if (currentStep === 2) {
                <section class="wizard-panel">
                  <header class="panel-header">
                    <h2>{{ 'sms.bulkFileSend.step2.label' | translate }}</h2>
                    <p>{{ 'sms.bulkFileSend.step2.subtitle' | translate }}</p>
                  </header>

                  <form [formGroup]="form" class="sms-wizard-fields" (ngSubmit)="goToSummary()">
                    <mat-form-field appearance="outline" class="full-width sms-control-field message-field">
                      <mat-icon matPrefix>sms</mat-icon>
                      <mat-label>{{ 'sms.bulkFileSend.messageText' | translate }}</mat-label>
                      <textarea matInput formControlName="messageText" rows="8"></textarea>
                      <mat-hint>{{ 'sms.bulkFileSend.charCount' | translate:{ count: messageLength, max: smsSingleLimit, parts: smsParts } }}</mat-hint>
                      @if (form.controls.messageText.hasError('required') && form.controls.messageText.touched) {
                        <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
                      }
                    </mat-form-field>

                    <div class="wizard-actions">
                      <button mat-stroked-button type="button" (click)="editStep(1)">
                        <mat-icon>arrow_back</mat-icon>
                        {{ 'sms.bulkFileSend.previousStep' | translate }}
                      </button>
                      <button mat-flat-button color="primary" type="submit">
                        {{ 'sms.bulkFileSend.nextStep' | translate }}
                        <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                      </button>
                    </div>
                  </form>
                </section>
              } @else {
                <section class="wizard-panel">
                  <header class="panel-header">
                    <h2>{{ 'sms.bulkFileSend.summaryTitle' | translate }}</h2>
                    <p>{{ 'sms.bulkFileSend.summarySubtitle' | translate }}</p>
                  </header>

                  <div class="summary-sections">
                    <article class="summary-section">
                      <div class="summary-section-head">
                        <h3>{{ 'sms.bulkFileSend.sectionSender' | translate }}</h3>
                        <button mat-button type="button" class="edit-btn" (click)="editStep(1)">
                          <mat-icon>edit</mat-icon>
                          {{ 'sms.bulkFileSend.edit' | translate }}
                        </button>
                      </div>
                      <dl class="summary-dl">
                        <div>
                          <dt>{{ 'sms.bulkFileSend.lineNumber' | translate }}</dt>
                          <dd dir="ltr">{{ form.controls.lineNumber.value | localeDigits }}</dd>
                        </div>
                        <div>
                          <dt>{{ 'sms.bulkFileSend.recipientCount' | translate }}</dt>
                          <dd>{{ mobileAnalysis.sendable.length | localeNumber }}</dd>
                        </div>
                        <div>
                          <dt>{{ 'sms.bulkFileSend.uploadedFile' | translate }}</dt>
                          <dd>{{ uploadedFile?.name }}</dd>
                        </div>
                      </dl>
                    </article>

                    <article class="summary-section">
                      <div class="summary-section-head">
                        <h3>{{ 'sms.bulkFileSend.sectionMessage' | translate }}</h3>
                        <button mat-button type="button" class="edit-btn" (click)="editStep(2)">
                          <mat-icon>edit</mat-icon>
                          {{ 'sms.bulkFileSend.edit' | translate }}
                        </button>
                      </div>
                      <p class="message-preview">{{ form.controls.messageText.value }}</p>
                    </article>

                    <article class="summary-section">
                      <div class="summary-section-head">
                        <h3>{{ 'sms.bulkFileSend.sectionSchedule' | translate }}</h3>
                        <button mat-button type="button" class="edit-btn" (click)="editStep(1)">
                          <mat-icon>edit</mat-icon>
                          {{ 'sms.bulkFileSend.edit' | translate }}
                        </button>
                      </div>
                      <dl class="summary-dl">
                        <div>
                          <dt>{{ 'sms.bulkFileSend.scheduleTitle' | translate }}</dt>
                          <dd>
                            @if (form.controls.scheduleMode.value === 'now') {
                              {{ 'sms.bulkFileSend.sendNow' | translate }}
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
                        <h3>{{ 'sms.bulkFileSend.sectionCost' | translate }}</h3>
                      </div>
                      <p class="cost-estimate">
                        {{ 'sms.bulkFileSend.estimatedTotal' | translate:{
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
                      {{ 'sms.bulkFileSend.previousStep' | translate }}
                    </button>
                    <button mat-flat-button color="primary" type="button"
                            (click)="confirmSend()" [disabled]="sending">
                      <mat-icon>send</mat-icon>
                      {{ 'sms.bulkFileSend.confirmSend' | translate }}
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
             [attr.aria-label]="'sms.bulkFileSend.contactsDialog.title' | translate">
          <h3>{{ 'sms.bulkFileSend.contactsDialog.title' | translate }}</h3>
          <dl class="contacts-stats">
            <div>
              <dt>{{ 'sms.bulkFileSend.contactsDialog.total' | translate }}</dt>
              <dd>{{ contactsReview.total | localeNumber }}</dd>
            </div>
            <div>
              <dt>{{ 'sms.bulkFileSend.contactsDialog.invalid' | translate }}</dt>
              <dd>{{ contactsReview.invalid | localeNumber }}</dd>
            </div>
            <div>
              <dt>{{ 'sms.bulkFileSend.contactsDialog.duplicates' | translate }}</dt>
              <dd>{{ contactsReview.duplicates | localeNumber }}</dd>
            </div>
            <div class="highlight">
              <dt>{{ 'sms.bulkFileSend.contactsDialog.sendable' | translate }}</dt>
              <dd>{{ contactsReview.sendable.length | localeNumber }}</dd>
            </div>
          </dl>
          <div class="dialog-actions">
            <button mat-button type="button" (click)="reviseContactsFile()">
              {{ 'sms.bulkFileSend.contactsDialog.revise' | translate }}
            </button>
            <button mat-flat-button color="primary" type="button"
                    [disabled]="!contactsReview.sendable.length || contactsReview.sendable.length > 100"
                    (click)="confirmContacts()">
              {{ 'sms.bulkFileSend.contactsDialog.confirm' | translate }}
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
      width: 16px;
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

    .schedule-block,
    .file-section {
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

    .sample-downloads {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 28px 16px;
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      cursor: pointer;
      text-align: center;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .upload-zone.dragover,
    .upload-zone:hover {
      border-color: var(--accent);
      background: rgba(212, 175, 55, 0.04);
    }

    .upload-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--accent);
    }

    .upload-title {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .upload-hint,
    .file-note {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .file-note { margin-top: 10px; }

    .uploaded-file {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      padding: 12px 14px;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }

    .uploaded-file mat-icon:first-child {
      color: var(--accent);
    }

    .uploaded-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .uploaded-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .uploaded-size {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

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

    .contacts-stats { margin: 0 0 20px; display: grid; gap: 10px; }

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
export class BulkSmsFileSendComponent implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

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
  dragOver = false;
  fileParsing = false;
  contactsDialogOpen = false;
  contactsConfirmed = false;
  uploadedFile: UploadedContactsFile | null = null;
  parsedEntries: string[] = [];
  contactsReview: MobileAnalysis = { total: 0, invalid: 0, duplicates: 0, sendable: [] };
  completedResult: SmsBulkSendResult | null = null;

  form = this.fb.nonNullable.group({
    lineNumber: ['', Validators.required],
    scheduleMode: ['now' as 'now' | 'later', Validators.required],
    sendDateTime: [null as string | null, this.scheduleDateTimeValidator.bind(this)],
    messageText: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  get mobileAnalysis(): MobileAnalysis {
    return analyzeMobileEntries(this.parsedEntries);
  }

  get scheduleIsoValue(): string | null {
    return this.form.controls.sendDateTime.value;
  }

  get scheduleInvalidKey(): string {
    const control = this.form.controls.sendDateTime;
    if (!control.touched || !control.hasError('scheduleInvalid')) {
      return '';
    }
    return 'sms.bulkFileSend.sendDateTimeInvalid';
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

  stepStateLabel(step: number): string {
    if (this.currentStep === step) {
      return `sms.bulkFileSend.step${step}.inProgress`;
    }
    if (this.currentStep > step) {
      return `sms.bulkFileSend.step${step}.done`;
    }
    return `sms.bulkFileSend.step${step}.pending`;
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
          this.showError(this.resolveProviderMessage(linesResult, 'sms.bulkFileSend.linesUnavailable'));
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

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.handleFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.handleFile(file);
    }
    input.value = '';
  }

  removeUploadedFile(): void {
    this.uploadedFile = null;
    this.parsedEntries = [];
    this.contactsConfirmed = false;
    this.contactsReview = { total: 0, invalid: 0, duplicates: 0, sendable: [] };
    this.contactsDialogOpen = false;
  }

  reviseContactsFile(): void {
    this.contactsDialogOpen = false;
    this.contactsConfirmed = false;
    this.fileInput?.nativeElement.click();
  }

  closeContactsReview(): void {
    this.contactsDialogOpen = false;
  }

  confirmContacts(): void {
    if (!this.contactsReview.sendable.length || this.contactsReview.sendable.length > 100) {
      return;
    }
    this.contactsConfirmed = true;
    this.contactsDialogOpen = false;
  }

  goToMessageStep(): void {
    if (!this.validateStep1()) {
      return;
    }
    if (!this.contactsConfirmed) {
      this.openContactsReview();
      return;
    }
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
      sendSource: 'FILE'
    }).subscribe({
      next: (sendResult) => {
        this.sending = false;
        if (sendResult.success) {
          this.completedResult = sendResult;
          this.snack(this.translate.instant('sms.bulkFileSend.success'));
          return;
        }
        this.showError(this.resolveProviderMessage(sendResult, 'sms.bulkFileSend.failed'));
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
    this.removeUploadedFile();
    this.form.reset({
      lineNumber: this.defaultLine && this.smsLines.includes(this.defaultLine)
        ? this.defaultLine
        : this.smsLines[0] ?? '',
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

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  private async handleFile(file: File): Promise<void> {
    if (!isSupportedContactsFile(file)) {
      this.showError(this.translate.instant('sms.bulkFileSend.unsupportedFormat'));
      return;
    }

    this.fileParsing = true;
    this.contactsConfirmed = false;
    try {
      const entries = await parseContactsFile(file);
      this.parsedEntries = entries;
      this.uploadedFile = { name: file.name, size: file.size };
      this.contactsReview = this.mobileAnalysis;
      this.contactsDialogOpen = true;
      if (!this.contactsReview.sendable.length) {
        this.showError(this.translate.instant('sms.bulkFileSend.noSendableMobiles'));
      } else if (this.contactsReview.sendable.length > 100) {
        this.showError(this.translate.instant('sms.bulkFileSend.mobilesMax'));
      }
    } catch {
      this.showError(this.translate.instant('sms.bulkFileSend.fileParseFailed'));
      this.removeUploadedFile();
    } finally {
      this.fileParsing = false;
    }
  }

  private openContactsReview(): void {
    if (!this.parsedEntries.length) {
      this.showError(this.translate.instant('sms.bulkFileSend.fileRequired'));
      return;
    }
    this.contactsReview = this.mobileAnalysis;
    this.contactsDialogOpen = true;
  }

  private validateStep1(): boolean {
    if (this.form.controls.scheduleMode.value === 'later') {
      this.form.controls.sendDateTime.markAsTouched();
      this.form.controls.sendDateTime.updateValueAndValidity();
    }
    if (!this.uploadedFile || !this.parsedEntries.length) {
      this.showError(this.translate.instant('sms.bulkFileSend.fileRequired'));
      return false;
    }
    if (!this.mobileAnalysis.sendable.length) {
      this.showError(this.translate.instant('sms.bulkFileSend.noSendableMobiles'));
      return false;
    }
    if (this.mobileAnalysis.sendable.length > 100) {
      this.showError(this.translate.instant('sms.bulkFileSend.mobilesMax'));
      return false;
    }
    if (this.form.controls.lineNumber.invalid) {
      this.form.markAllAsTouched();
      return false;
    }
    if (this.form.controls.scheduleMode.value === 'later' && this.form.controls.sendDateTime.invalid) {
      return false;
    }
    return true;
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
