import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { CalendarLocaleService } from '../../services/calendar-locale.service';
import {
  BusinessHoliday,
  BusinessHoursWeek,
  TicketAttachmentKind,
  TicketAssigneeOption,
  TicketAutoAssignMode,
  TicketNoReplyAction,
  TicketPriority,
  TicketQueue,
  TicketService
} from '../../services/ticket.service';

type WeekdayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface HolidayDraft {
  date: Date | null;
  name: string;
}

@Component({
  selector: 'app-ticket-settings-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <div class="settings-panel">
      @if (loading) {
        <p class="muted">{{ 'settings.ticketSettings.loading' | translate }}</p>
      } @else {
        <p class="intro">{{ 'settings.ticketSettings.intro' | translate }}</p>
        <form class="form" [formGroup]="form" (ngSubmit)="save()">
          <section class="section">
            <h3>{{ 'settings.ticketSettings.reopenSection' | translate }}</h3>
            <mat-form-field appearance="outline" class="full-field">
              <mat-label>{{ 'settings.ticketSettings.reopenWindowDays' | translate }}</mat-label>
              <input matInput type="number" formControlName="reopenWindowDays" min="1" max="3650">
              <mat-hint>{{ 'settings.ticketSettings.reopenWindowDaysHint' | translate }}</mat-hint>
              @if (form.controls.reopenWindowDays.touched && form.controls.reopenWindowDays.invalid) {
                <mat-error>{{ 'settings.ticketSettings.reopenWindowDaysInvalid' | translate }}</mat-error>
              }
            </mat-form-field>
          </section>

          <section class="section">
            <h3>{{ 'settings.ticketSettings.archiveSection' | translate }}</h3>
            <p class="section-hint">{{ 'settings.ticketSettings.archiveIntro' | translate }}</p>
            <mat-form-field appearance="outline" class="full-field">
              <mat-label>{{ 'settings.ticketSettings.autoArchiveClosedAfterDays' | translate }}</mat-label>
              <input matInput type="number" formControlName="autoArchiveClosedAfterDays" min="0" max="3650">
              <mat-hint>{{ 'settings.ticketSettings.autoArchiveClosedAfterDaysHint' | translate }}</mat-hint>
              @if (form.controls.autoArchiveClosedAfterDays.touched && form.controls.autoArchiveClosedAfterDays.invalid) {
                <mat-error>{{ 'settings.ticketSettings.autoArchiveClosedAfterDaysInvalid' | translate }}</mat-error>
              }
            </mat-form-field>
          </section>

          <section class="section">
            <h3>{{ 'settings.ticketSettings.slaSection' | translate }}</h3>
            <p class="section-hint">{{ 'settings.ticketSettings.slaIntro' | translate }}</p>

            <h4 class="subsection-title">{{ 'settings.ticketSettings.firstResponseSlaSection' | translate }}</h4>
            <p class="section-hint">{{ 'settings.ticketSettings.firstResponseSlaIntro' | translate }}</p>
            <div class="limits-row">
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.firstResponseSlaUrgentHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="firstResponseSlaUrgentHours" min="1" max="8760">
              </mat-form-field>
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.firstResponseSlaHighHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="firstResponseSlaHighHours" min="1" max="8760">
              </mat-form-field>
            </div>
            <div class="limits-row">
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.firstResponseSlaMediumHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="firstResponseSlaMediumHours" min="1" max="8760">
              </mat-form-field>
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.firstResponseSlaLowHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="firstResponseSlaLowHours" min="1" max="8760">
              </mat-form-field>
            </div>

            <h4 class="subsection-title">{{ 'settings.ticketSettings.resolveSlaSection' | translate }}</h4>
            <p class="section-hint">{{ 'settings.ticketSettings.resolveSlaIntro' | translate }}</p>
            <div class="limits-row">
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.slaUrgentHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="slaUrgentHours" min="1" max="8760">
              </mat-form-field>
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.slaHighHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="slaHighHours" min="1" max="8760">
              </mat-form-field>
            </div>
            <div class="limits-row">
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.slaMediumHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="slaMediumHours" min="1" max="8760">
              </mat-form-field>
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.slaLowHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="slaLowHours" min="1" max="8760">
              </mat-form-field>
            </div>
            <p class="section-hint">{{ 'settings.ticketSettings.slaHint' | translate }}</p>

            <h4 class="subsection-title">{{ 'settings.ticketSettings.businessHoursSection' | translate }}</h4>
            <p class="section-hint">{{ 'settings.ticketSettings.businessHoursIntro' | translate }}</p>
            <mat-checkbox formControlName="slaUseBusinessHours" color="primary">
              {{ 'settings.ticketSettings.slaUseBusinessHours' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.slaUseBusinessHoursHint' | translate }}</p>
            <div class="limits-row">
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.slaTimezoneArea' | translate }}</mat-label>
                <mat-select [value]="timezoneArea" (selectionChange)="onTimezoneAreaChange($event.value)">
                  @for (area of timezoneAreas; track area) {
                    <mat-option [value]="area">{{ area }}</mat-option>
                  }
                </mat-select>
                <mat-hint>{{ 'settings.ticketSettings.slaTimezoneHint' | translate }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.slaTimezoneRegion' | translate }}</mat-label>
                <mat-select
                  [value]="timezoneRegion"
                  [disabled]="timezoneArea === 'UTC'"
                  (selectionChange)="onTimezoneRegionChange($event.value)">
                  @for (region of timezoneRegions; track region) {
                    <mat-option [value]="region">{{ region }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <p class="section-hint timezone-selected" dir="ltr">{{ form.controls.slaTimezone.value }}</p>
            @for (day of weekdays; track day) {
              <div class="weekday-row">
                <mat-checkbox
                  [formControlName]="weekdayOpenControl(day)"
                  color="primary">
                  {{ ('settings.ticketSettings.weekdays.' + day) | translate }}
                </mat-checkbox>
                <mat-form-field appearance="outline" class="weekday-time">
                  <mat-label>{{ 'settings.ticketSettings.weekdayStart' | translate }}</mat-label>
                  <input matInput type="time" [formControlName]="weekdayStartControl(day)" dir="ltr">
                </mat-form-field>
                <mat-form-field appearance="outline" class="weekday-time">
                  <mat-label>{{ 'settings.ticketSettings.weekdayEnd' | translate }}</mat-label>
                  <input matInput type="time" [formControlName]="weekdayEndControl(day)" dir="ltr">
                </mat-form-field>
              </div>
            }
            <h4 class="subsection-title">{{ 'settings.ticketSettings.holidaysSection' | translate }}</h4>
            <p class="section-hint">{{ 'settings.ticketSettings.holidaysIntro' | translate }}</p>
            @for (holiday of businessHolidays; track $index) {
              <div class="holiday-row">
                <mat-form-field appearance="outline" class="holiday-date">
                  <mat-label>{{ 'settings.ticketSettings.holidayDate' | translate }}</mat-label>
                  <input
                    matInput
                    [matDatepicker]="holidayPicker"
                    [(ngModel)]="holiday.date"
                    [ngModelOptions]="{standalone: true}"
                    [placeholder]="calendar.isJalali() ? 'YYYY/MM/DD' : 'YYYY-MM-DD'">
                  <mat-datepicker-toggle matIconSuffix [for]="holidayPicker"></mat-datepicker-toggle>
                  <mat-datepicker #holidayPicker></mat-datepicker>
                </mat-form-field>
                <mat-form-field appearance="outline" class="holiday-name">
                  <mat-label>{{ 'settings.ticketSettings.holidayName' | translate }}</mat-label>
                  <input matInput [(ngModel)]="holiday.name" [ngModelOptions]="{standalone: true}">
                </mat-form-field>
                <button mat-icon-button type="button" color="warn"
                        [attr.aria-label]="'settings.ticketSettings.removeHoliday' | translate"
                        (click)="removeHoliday($index)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
            <button mat-stroked-button type="button" color="primary" (click)="addHoliday()">
              {{ 'settings.ticketSettings.addHoliday' | translate }}
            </button>

            <h4 class="subsection-title">{{ 'settings.ticketSettings.breachSection' | translate }}</h4>
            <p class="section-hint">{{ 'settings.ticketSettings.breachIntro' | translate }}</p>
            <mat-checkbox formControlName="slaWarnEnabled" color="primary">
              {{ 'settings.ticketSettings.slaWarnEnabled' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.slaWarnEnabledHint' | translate }}</p>
            <mat-form-field appearance="outline" class="limit-field">
              <mat-label>{{ 'settings.ticketSettings.slaWarnHoursBefore' | translate }}</mat-label>
              <input matInput type="number" formControlName="slaWarnHoursBefore" min="1" max="8760"
                     [disabled]="!form.controls.slaWarnEnabled.value">
              <mat-hint>{{ 'settings.ticketSettings.slaWarnHoursBeforeHint' | translate }}</mat-hint>
              @if (form.controls.slaWarnHoursBefore.touched && form.controls.slaWarnHoursBefore.invalid) {
                <mat-error>{{ 'settings.ticketSettings.slaWarnHoursBeforeInvalid' | translate }}</mat-error>
              }
            </mat-form-field>

            <mat-checkbox formControlName="slaBreachEscalationEnabled" color="primary">
              {{ 'settings.ticketSettings.slaBreachEscalationEnabled' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.slaBreachEscalationEnabledHint' | translate }}</p>
            <mat-checkbox formControlName="slaBreachBumpPriority" color="primary"
                          [disabled]="!form.controls.slaBreachEscalationEnabled.value">
              {{ 'settings.ticketSettings.slaBreachBumpPriority' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.slaBreachBumpPriorityHint' | translate }}</p>
            <div class="limits-row">
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.slaBreachAssignee' | translate }}</mat-label>
                <mat-select formControlName="slaBreachAssigneeId"
                            [disabled]="!form.controls.slaBreachEscalationEnabled.value">
                  <mat-option [value]="null">{{ 'settings.ticketSettings.slaBreachAssigneeNone' | translate }}</mat-option>
                  @for (assignee of assignees; track assignee.id) {
                    <mat-option [value]="assignee.id">{{ assignee.name }} ({{ assignee.email }})</mat-option>
                  }
                </mat-select>
                <mat-hint>{{ 'settings.ticketSettings.slaBreachAssigneeHint' | translate }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.slaBreachQueue' | translate }}</mat-label>
                <mat-select formControlName="slaBreachQueueId"
                            [disabled]="!form.controls.slaBreachEscalationEnabled.value">
                  <mat-option [value]="null">{{ 'settings.ticketSettings.slaBreachQueueNone' | translate }}</mat-option>
                  @for (queue of queues; track queue.id) {
                    <mat-option [value]="queue.id">{{ queue.name }}</mat-option>
                  }
                </mat-select>
                <mat-hint>{{ 'settings.ticketSettings.slaBreachQueueHint' | translate }}</mat-hint>
              </mat-form-field>
            </div>
          </section>

          <section class="section">
            <h3>{{ 'settings.ticketSettings.emailSection' | translate }}</h3>
            <p class="section-hint">{{ 'settings.ticketSettings.emailIntro' | translate }}</p>
            <mat-checkbox formControlName="ticketEmailNotificationsEnabled" color="primary">
              {{ 'settings.ticketSettings.ticketEmailNotificationsEnabled' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.ticketEmailNotificationsHint' | translate }}</p>
            <div class="kinds" role="group" [attr.aria-label]="'settings.ticketSettings.emailPriorities' | translate">
              <p class="kinds-label">{{ 'settings.ticketSettings.emailPriorities' | translate }}</p>
              @for (priority of priorities; track priority) {
                <mat-checkbox
                  [checked]="isEmailPrioritySelected(priority)"
                  [disabled]="!form.controls.ticketEmailNotificationsEnabled.value"
                  (change)="toggleEmailPriority(priority, $event.checked)">
                  {{ ('tickets.priorities.' + priority) | translate }}
                </mat-checkbox>
              }
              @if (form.controls.emailNotificationPriorities.touched && form.controls.emailNotificationPriorities.invalid) {
                <p class="field-error">{{ 'settings.ticketSettings.prioritiesInvalid' | translate }}</p>
              }
            </div>

            <mat-checkbox formControlName="ticketSmsNotificationsEnabled" color="primary">
              {{ 'settings.ticketSettings.ticketSmsNotificationsEnabled' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.ticketSmsNotificationsHint' | translate }}</p>
            <div class="kinds" role="group" [attr.aria-label]="'settings.ticketSettings.smsPriorities' | translate">
              <p class="kinds-label">{{ 'settings.ticketSettings.smsPriorities' | translate }}</p>
              @for (priority of priorities; track priority) {
                <mat-checkbox
                  [checked]="isSmsPrioritySelected(priority)"
                  [disabled]="!form.controls.ticketSmsNotificationsEnabled.value"
                  (change)="toggleSmsPriority(priority, $event.checked)">
                  {{ ('tickets.priorities.' + priority) | translate }}
                </mat-checkbox>
              }
              @if (form.controls.smsNotificationPriorities.touched && form.controls.smsNotificationPriorities.invalid) {
                <p class="field-error">{{ 'settings.ticketSettings.prioritiesInvalid' | translate }}</p>
              }
            </div>
          </section>

          <section class="section">
            <h3>{{ 'settings.ticketSettings.digestSection' | translate }}</h3>
            <p class="section-hint">{{ 'settings.ticketSettings.digestIntro' | translate }}</p>
            <mat-checkbox formControlName="agentDigestEnabled" color="primary">
              {{ 'settings.ticketSettings.agentDigestEnabled' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.agentDigestHint' | translate }}</p>
            <mat-form-field appearance="outline" class="full-field">
              <mat-icon matPrefix>schedule</mat-icon>
              <mat-label>{{ 'settings.ticketSettings.agentDigestSendTime' | translate }}</mat-label>
              <input matInput type="time" formControlName="agentDigestSendTime" dir="ltr">
              <mat-hint>{{ 'settings.ticketSettings.agentDigestTimeHint' | translate }}</mat-hint>
              @if (form.controls.agentDigestSendTime.touched && form.controls.agentDigestSendTime.invalid) {
                <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
              }
            </mat-form-field>
            <button mat-stroked-button type="button" color="primary"
                    [disabled]="digestRunning || !form.controls.agentDigestEnabled.value"
                    (click)="runDigestNow()">
              {{ (digestRunning
                ? 'settings.ticketSettings.digestRunning'
                : 'settings.ticketSettings.digestRunNow') | translate }}
            </button>
          </section>

          <section class="section">
            <h3>{{ 'settings.ticketSettings.autoAssignSection' | translate }}</h3>
            <p class="section-hint">{{ 'settings.ticketSettings.autoAssignIntro' | translate }}</p>
            <mat-form-field appearance="outline" class="full-field">
              <mat-label>{{ 'settings.ticketSettings.autoAssignMode' | translate }}</mat-label>
              <mat-select formControlName="autoAssignMode">
                @for (mode of autoAssignModes; track mode) {
                  <mat-option [value]="mode">
                    {{ ('settings.ticketSettings.autoAssignModes.' + mode) | translate }}
                  </mat-option>
                }
              </mat-select>
              <mat-hint>{{ 'settings.ticketSettings.autoAssignModeHint' | translate }}</mat-hint>
            </mat-form-field>
            @if (form.controls.autoAssignMode.value === 'CATEGORY_SKILL'
                || form.controls.autoAssignMode.value === 'QUEUE_MEMBERSHIP') {
              <mat-checkbox formControlName="autoAssignFallbackRoundRobin" color="primary">
                {{ 'settings.ticketSettings.autoAssignFallbackRoundRobin' | translate }}
              </mat-checkbox>
              <p class="section-hint">{{ 'settings.ticketSettings.autoAssignFallbackHint' | translate }}</p>
            }
            <mat-form-field appearance="outline" class="full-field">
              <mat-label>{{ 'settings.ticketSettings.defaultQueue' | translate }}</mat-label>
              <mat-select formControlName="defaultQueueId">
                <mat-option [value]="null">{{ 'settings.ticketSettings.defaultQueueNone' | translate }}</mat-option>
                @for (queue of queues; track queue.id) {
                  <mat-option [value]="queue.id">{{ queue.name }}</mat-option>
                }
              </mat-select>
              <mat-hint>{{ 'settings.ticketSettings.defaultQueueHint' | translate }}</mat-hint>
            </mat-form-field>
          </section>

          <section class="section">
            <h3>{{ 'settings.ticketSettings.automationsSection' | translate }}</h3>
            <p class="section-hint">{{ 'settings.ticketSettings.automationsIntro' | translate }}</p>

            <h4 class="subsection-title">{{ 'settings.ticketSettings.automationsCreateSection' | translate }}</h4>
            <mat-form-field appearance="outline" class="full-field">
              <mat-label>{{ 'settings.ticketSettings.automationDefaultPriority' | translate }}</mat-label>
              <mat-select formControlName="automationDefaultPriority">
                <mat-option [value]="null">{{ 'settings.ticketSettings.automationDefaultPriorityNone' | translate }}</mat-option>
                @for (priority of priorities; track priority) {
                  <mat-option [value]="priority">{{ ('tickets.priorities.' + priority) | translate }}</mat-option>
                }
              </mat-select>
              <mat-hint>{{ 'settings.ticketSettings.automationDefaultPriorityHint' | translate }}</mat-hint>
            </mat-form-field>
            <mat-checkbox formControlName="automationCustomerAckEnabled" color="primary">
              {{ 'settings.ticketSettings.automationCustomerAckEnabled' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.automationCustomerAckHint' | translate }}</p>
            <p class="section-hint">{{ 'settings.ticketSettings.automationQueueAssignHint' | translate }}</p>

            <h4 class="subsection-title">{{ 'settings.ticketSettings.automationsNoReplySection' | translate }}</h4>
            <mat-checkbox formControlName="automationNoReplyEnabled" color="primary">
              {{ 'settings.ticketSettings.automationNoReplyEnabled' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.automationNoReplyEnabledHint' | translate }}</p>
            <div class="limits-row">
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.automationNoReplyHours' | translate }}</mat-label>
                <input matInput type="number" formControlName="automationNoReplyHours" min="1" max="8760"
                       [disabled]="!form.controls.automationNoReplyEnabled.value">
                <mat-hint>{{ 'settings.ticketSettings.automationNoReplyHoursHint' | translate }}</mat-hint>
                @if (form.controls.automationNoReplyHours.touched && form.controls.automationNoReplyHours.invalid) {
                  <mat-error>{{ 'settings.ticketSettings.automationNoReplyHoursInvalid' | translate }}</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.automationNoReplyAction' | translate }}</mat-label>
                <mat-select formControlName="automationNoReplyAction"
                            [disabled]="!form.controls.automationNoReplyEnabled.value">
                  @for (action of noReplyActions; track action) {
                    <mat-option [value]="action">
                      {{ ('settings.ticketSettings.noReplyActions.' + action) | translate }}
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>{{ 'settings.ticketSettings.automationNoReplyActionHint' | translate }}</mat-hint>
              </mat-form-field>
            </div>

            <h4 class="subsection-title">{{ 'settings.ticketSettings.automationsCsatSection' | translate }}</h4>
            <mat-checkbox formControlName="automationCsatInviteEnabled" color="primary">
              {{ 'settings.ticketSettings.automationCsatInviteEnabled' | translate }}
            </mat-checkbox>
            <p class="section-hint">{{ 'settings.ticketSettings.automationCsatInviteHint' | translate }}</p>
          </section>

          <section class="section">
            <h3>{{ 'settings.ticketSettings.attachmentsSection' | translate }}</h3>
            <p class="section-hint">{{ 'settings.ticketSettings.attachmentsIntro' | translate }}</p>

            <div class="limits-row">
              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.maxAttachments' | translate }}</mat-label>
                <input matInput type="number" formControlName="maxAttachments" min="1" max="20">
                <mat-hint>{{ 'settings.ticketSettings.maxAttachmentsHint' | translate }}</mat-hint>
                @if (form.controls.maxAttachments.touched && form.controls.maxAttachments.invalid) {
                  <mat-error>{{ 'settings.ticketSettings.maxAttachmentsInvalid' | translate }}</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="limit-field">
                <mat-label>{{ 'settings.ticketSettings.maxAttachmentSizeMb' | translate }}</mat-label>
                <input matInput type="number" formControlName="maxAttachmentSizeMb" min="1" max="50">
                <mat-hint>{{ 'settings.ticketSettings.maxAttachmentSizeMbHint' | translate }}</mat-hint>
                @if (form.controls.maxAttachmentSizeMb.touched && form.controls.maxAttachmentSizeMb.invalid) {
                  <mat-error>{{ 'settings.ticketSettings.maxAttachmentSizeMbInvalid' | translate }}</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="kinds" role="group" [attr.aria-label]="'settings.ticketSettings.allowedKinds' | translate">
              <p class="kinds-label">{{ 'settings.ticketSettings.allowedKinds' | translate }}</p>
              @for (kind of attachmentKinds; track kind) {
                <mat-checkbox
                  [checked]="isKindSelected(kind)"
                  (change)="toggleKind(kind, $event.checked)">
                  {{ ('settings.ticketSettings.kinds.' + kind) | translate }}
                </mat-checkbox>
              }
              @if (form.controls.allowedAttachmentKinds.touched && form.controls.allowedAttachmentKinds.invalid) {
                <p class="field-error">{{ 'settings.ticketSettings.allowedKindsInvalid' | translate }}</p>
              }
            </div>
          </section>

          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving || !hasKinds || !hasPriorities">
              {{ (saving ? 'settings.ticketSettings.saving' : 'common.save') | translate }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .settings-panel { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 100%; }
    .muted, .intro, .section-hint { margin: 0; color: var(--text-muted); }
    .form { display: flex; flex-direction: column; gap: 20px; width: 100%; }
    .section { display: flex; flex-direction: column; gap: 10px; }
    .section h3 { margin: 0; font-size: 1rem; }
    .subsection-title { margin: 8px 0 0; font-size: 0.92rem; font-weight: 600; }
    .full-field { width: 100%; }
    .limits-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .limit-field { width: 100%; }
    .kinds {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-secondary);
    }
    .kinds-label { margin: 0 0 4px; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
    .field-error {
      margin: 4px 0 0;
      font-size: 0.75rem;
      color: var(--mat-form-field-error-text-color, #f44336);
    }
    .weekday-row {
      display: grid;
      grid-template-columns: minmax(120px, 1fr) repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: center;
    }
    .weekday-time { width: 100%; }
    .timezone-selected {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.85rem;
    }
    .holiday-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) auto;
      gap: 12px;
      align-items: center;
    }
    .holiday-date, .holiday-name { width: 100%; }
    .actions { display: flex; justify-content: flex-end; }
    @media (max-width: 720px) {
      .limits-row { grid-template-columns: 1fr; }
      .weekday-row { grid-template-columns: 1fr; }
      .holiday-row { grid-template-columns: 1fr; }
    }
  `]
})
export class TicketSettingsFormComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  readonly calendar = inject(CalendarLocaleService);

  loading = true;
  saving = false;
  digestRunning = false;

  readonly attachmentKinds: TicketAttachmentKind[] = ['IMAGE', 'PDF', 'LOG', 'DOCUMENT'];
  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  readonly autoAssignModes: TicketAutoAssignMode[] = ['OFF', 'ROUND_ROBIN', 'CATEGORY_SKILL', 'QUEUE_MEMBERSHIP'];
  readonly noReplyActions: TicketNoReplyAction[] = ['REMIND', 'ESCALATE', 'REMIND_AND_ESCALATE'];
  readonly weekdays: WeekdayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  timezoneZonesByArea: Record<string, string[]> = this.buildTimezoneZonesByArea();
  timezoneAreas: string[] = this.buildTimezoneAreas();
  timezoneArea = 'UTC';
  timezoneRegion = 'UTC';
  queues: TicketQueue[] = [];
  assignees: TicketAssigneeOption[] = [];
  businessHolidays: HolidayDraft[] = [];

  get timezoneRegions(): string[] {
    if (this.timezoneArea === 'UTC') {
      return ['UTC'];
    }
    return this.timezoneZonesByArea[this.timezoneArea] ?? [];
  }

  readonly form = this.fb.nonNullable.group({
    reopenWindowDays: [14, [Validators.required, Validators.min(1), Validators.max(3650)]],
    autoArchiveClosedAfterDays: [90, [Validators.required, Validators.min(0), Validators.max(3650)]],
    firstResponseSlaUrgentHours: [1, [Validators.required, Validators.min(1), Validators.max(8760)]],
    firstResponseSlaHighHours: [4, [Validators.required, Validators.min(1), Validators.max(8760)]],
    firstResponseSlaMediumHours: [8, [Validators.required, Validators.min(1), Validators.max(8760)]],
    firstResponseSlaLowHours: [24, [Validators.required, Validators.min(1), Validators.max(8760)]],
    slaUrgentHours: [4, [Validators.required, Validators.min(1), Validators.max(8760)]],
    slaHighHours: [24, [Validators.required, Validators.min(1), Validators.max(8760)]],
    slaMediumHours: [72, [Validators.required, Validators.min(1), Validators.max(8760)]],
    slaLowHours: [168, [Validators.required, Validators.min(1), Validators.max(8760)]],
    autoAssignMode: this.fb.nonNullable.control<TicketAutoAssignMode>('OFF', [Validators.required]),
    autoAssignFallbackRoundRobin: [true],
    defaultQueueId: this.fb.control<number | null>(null),
    ticketEmailNotificationsEnabled: [true],
    ticketSmsNotificationsEnabled: [true],
    emailNotificationPriorities: this.fb.nonNullable.control<TicketPriority[]>(
      ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      [Validators.required, Validators.minLength(1)]
    ),
    smsNotificationPriorities: this.fb.nonNullable.control<TicketPriority[]>(
      ['URGENT'],
      [Validators.required, Validators.minLength(1)]
    ),
    agentDigestEnabled: [false],
    agentDigestSendTime: ['08:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    maxAttachments: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
    maxAttachmentSizeMb: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
    allowedAttachmentKinds: this.fb.nonNullable.control<TicketAttachmentKind[]>(
      ['IMAGE', 'PDF', 'LOG', 'DOCUMENT'],
      [Validators.required, Validators.minLength(1)]
    ),
    slaUseBusinessHours: [false],
    slaTimezone: ['UTC', [Validators.required, Validators.maxLength(64)]],
    mondayOpen: [true],
    mondayStart: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    mondayEnd: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    tuesdayOpen: [true],
    tuesdayStart: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    tuesdayEnd: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    wednesdayOpen: [true],
    wednesdayStart: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    wednesdayEnd: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    thursdayOpen: [true],
    thursdayStart: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    thursdayEnd: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    fridayOpen: [true],
    fridayStart: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    fridayEnd: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    saturdayOpen: [false],
    saturdayStart: ['09:00', [Validators.pattern(/^\d{2}:\d{2}$/)]],
    saturdayEnd: ['17:00', [Validators.pattern(/^\d{2}:\d{2}$/)]],
    sundayOpen: [false],
    sundayStart: ['09:00', [Validators.pattern(/^\d{2}:\d{2}$/)]],
    sundayEnd: ['17:00', [Validators.pattern(/^\d{2}:\d{2}$/)]],
    slaWarnEnabled: [false],
    slaWarnHoursBefore: [2, [Validators.required, Validators.min(1), Validators.max(8760)]],
    slaBreachEscalationEnabled: [true],
    slaBreachBumpPriority: [true],
    slaBreachAssigneeId: this.fb.control<number | null>(null),
    slaBreachQueueId: this.fb.control<number | null>(null),
    automationDefaultPriority: this.fb.control<TicketPriority | null>(null),
    automationCustomerAckEnabled: [true],
    automationNoReplyEnabled: [false],
    automationNoReplyHours: [48, [Validators.required, Validators.min(1), Validators.max(8760)]],
    automationNoReplyAction: this.fb.nonNullable.control<TicketNoReplyAction>('REMIND', [Validators.required]),
    automationCsatInviteEnabled: [true]
  });

  get hasKinds(): boolean {
    return (this.form.controls.allowedAttachmentKinds.value?.length ?? 0) > 0;
  }

  get hasPriorities(): boolean {
    return (this.form.controls.emailNotificationPriorities.value?.length ?? 0) > 0
      && (this.form.controls.smsNotificationPriorities.value?.length ?? 0) > 0;
  }

  ngOnInit(): void {
    this.ticketService.listAllQueues().subscribe({
      next: (queues) => { this.queues = (queues ?? []).filter((q) => q.active); },
      error: () => { this.queues = []; }
    });
    this.ticketService.listAdminAssignees().subscribe({
      next: (assignees) => { this.assignees = assignees ?? []; },
      error: () => { this.assignees = []; }
    });
    this.load();
  }

  isKindSelected(kind: TicketAttachmentKind): boolean {
    return this.form.controls.allowedAttachmentKinds.value.includes(kind);
  }

  toggleKind(kind: TicketAttachmentKind, checked: boolean): void {
    const current = [...this.form.controls.allowedAttachmentKinds.value];
    const next = checked
      ? (current.includes(kind) ? current : [...current, kind])
      : current.filter((item) => item !== kind);
    this.form.controls.allowedAttachmentKinds.setValue(next);
    this.form.controls.allowedAttachmentKinds.markAsTouched();
    this.form.controls.allowedAttachmentKinds.updateValueAndValidity();
  }

  isEmailPrioritySelected(priority: TicketPriority): boolean {
    return this.form.controls.emailNotificationPriorities.value.includes(priority);
  }

  toggleEmailPriority(priority: TicketPriority, checked: boolean): void {
    const current = [...this.form.controls.emailNotificationPriorities.value];
    const next = checked
      ? (current.includes(priority) ? current : [...current, priority])
      : current.filter((item) => item !== priority);
    this.form.controls.emailNotificationPriorities.setValue(next);
    this.form.controls.emailNotificationPriorities.markAsTouched();
    this.form.controls.emailNotificationPriorities.updateValueAndValidity();
  }

  isSmsPrioritySelected(priority: TicketPriority): boolean {
    return this.form.controls.smsNotificationPriorities.value.includes(priority);
  }

  weekdayOpenControl(day: WeekdayKey): string {
    return `${day}Open`;
  }

  weekdayStartControl(day: WeekdayKey): string {
    return `${day}Start`;
  }

  weekdayEndControl(day: WeekdayKey): string {
    return `${day}End`;
  }

  onTimezoneAreaChange(area: string): void {
    this.timezoneArea = area || 'UTC';
    if (this.timezoneArea === 'UTC') {
      this.timezoneRegion = 'UTC';
    } else {
      const regions = this.timezoneZonesByArea[this.timezoneArea] ?? [];
      this.timezoneRegion = regions.includes(this.timezoneRegion)
        ? this.timezoneRegion
        : (regions[0] ?? '');
    }
    this.syncTimezoneControl();
  }

  onTimezoneRegionChange(region: string): void {
    this.timezoneRegion = region || '';
    this.syncTimezoneControl();
  }

  private syncTimezoneControl(): void {
    const zone = this.timezoneArea === 'UTC'
      ? 'UTC'
      : (this.timezoneRegion ? `${this.timezoneArea}/${this.timezoneRegion}` : 'UTC');
    this.form.controls.slaTimezone.setValue(zone);
    this.form.controls.slaTimezone.markAsDirty();
  }

  private applyTimezoneSelection(zone: string): void {
    const normalized = (zone || 'UTC').trim();
    if (!normalized || normalized.toUpperCase() === 'UTC' || normalized === 'Etc/UTC') {
      this.timezoneArea = 'UTC';
      this.timezoneRegion = 'UTC';
      this.form.controls.slaTimezone.setValue('UTC');
      return;
    }
    const slash = normalized.indexOf('/');
    if (slash <= 0 || slash === normalized.length - 1) {
      this.timezoneArea = 'UTC';
      this.timezoneRegion = 'UTC';
      this.form.controls.slaTimezone.setValue('UTC');
      return;
    }
    const area = normalized.slice(0, slash);
    const region = normalized.slice(slash + 1);
    if (!this.timezoneZonesByArea[area]) {
      // Keep unknown zones selectable by injecting the area/region.
      this.timezoneZonesByArea[area] = [region];
      if (!this.timezoneAreas.includes(area)) {
        this.timezoneAreas.push(area);
        this.timezoneAreas.sort((a, b) => {
          if (a === 'UTC') return -1;
          if (b === 'UTC') return 1;
          return a.localeCompare(b);
        });
      }
    } else if (!this.timezoneZonesByArea[area].includes(region)) {
      this.timezoneZonesByArea[area] = [...this.timezoneZonesByArea[area], region]
        .sort((a, b) => a.localeCompare(b));
    }
    this.timezoneArea = area;
    this.timezoneRegion = region;
    this.form.controls.slaTimezone.setValue(`${area}/${region}`);
  }

  private buildTimezoneZonesByArea(): Record<string, string[]> {
    const zones = this.listIanaTimeZones();
    const byArea: Record<string, string[]> = {};
    for (const zone of zones) {
      const slash = zone.indexOf('/');
      if (slash <= 0) {
        continue;
      }
      const area = zone.slice(0, slash);
      const region = zone.slice(slash + 1);
      if (!byArea[area]) {
        byArea[area] = [];
      }
      if (!byArea[area].includes(region)) {
        byArea[area].push(region);
      }
    }
    for (const area of Object.keys(byArea)) {
      byArea[area].sort((a, b) => a.localeCompare(b));
    }
    return byArea;
  }

  private buildTimezoneAreas(): string[] {
    const areas = Object.keys(this.timezoneZonesByArea).sort((a, b) => a.localeCompare(b));
    return ['UTC', ...areas.filter((area) => area !== 'UTC')];
  }

  private listIanaTimeZones(): string[] {
    try {
      const intlWithZones = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
      const supported = intlWithZones.supportedValuesOf?.('timeZone');
      if (supported?.length) {
        return supported;
      }
    } catch {
      // Fall through to curated list.
    }
    return [
      'Africa/Cairo',
      'America/Chicago',
      'America/Los_Angeles',
      'America/New_York',
      'Asia/Baghdad',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Kuwait',
      'Asia/Riyadh',
      'Asia/Shanghai',
      'Asia/Tehran',
      'Asia/Tokyo',
      'Australia/Sydney',
      'Europe/Berlin',
      'Europe/Istanbul',
      'Europe/London',
      'Europe/Paris'
    ];
  }

  addHoliday(): void {
    this.businessHolidays = [...this.businessHolidays, { date: null, name: '' }];
  }

  removeHoliday(index: number): void {
    this.businessHolidays = this.businessHolidays.filter((_, i) => i !== index);
  }

  toggleSmsPriority(priority: TicketPriority, checked: boolean): void {
    const current = [...this.form.controls.smsNotificationPriorities.value];
    const next = checked
      ? (current.includes(priority) ? current : [...current, priority])
      : current.filter((item) => item !== priority);
    this.form.controls.smsNotificationPriorities.setValue(next);
    this.form.controls.smsNotificationPriorities.markAsTouched();
    this.form.controls.smsNotificationPriorities.updateValueAndValidity();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving || !this.hasKinds || !this.hasPriorities) {
      return;
    }
    this.saving = true;
    const value = this.form.getRawValue();
    this.ticketService.saveTicketSettings({
      reopenWindowDays: Number(value.reopenWindowDays),
      autoArchiveClosedAfterDays: Number(value.autoArchiveClosedAfterDays),
      firstResponseSlaUrgentHours: Number(value.firstResponseSlaUrgentHours),
      firstResponseSlaHighHours: Number(value.firstResponseSlaHighHours),
      firstResponseSlaMediumHours: Number(value.firstResponseSlaMediumHours),
      firstResponseSlaLowHours: Number(value.firstResponseSlaLowHours),
      slaUrgentHours: Number(value.slaUrgentHours),
      slaHighHours: Number(value.slaHighHours),
      slaMediumHours: Number(value.slaMediumHours),
      slaLowHours: Number(value.slaLowHours),
      autoAssignMode: value.autoAssignMode,
      autoAssignFallbackRoundRobin: !!value.autoAssignFallbackRoundRobin,
      defaultQueueId: value.defaultQueueId ?? null,
      ticketEmailNotificationsEnabled: !!value.ticketEmailNotificationsEnabled,
      ticketSmsNotificationsEnabled: !!value.ticketSmsNotificationsEnabled,
      emailNotificationPriorities: [...value.emailNotificationPriorities],
      smsNotificationPriorities: [...value.smsNotificationPriorities],
      agentDigestEnabled: !!value.agentDigestEnabled,
      agentDigestSendHour: this.parseDigestHour(value.agentDigestSendTime),
      agentDigestSendMinute: this.parseDigestMinute(value.agentDigestSendTime),
      maxAttachments: Number(value.maxAttachments),
      maxAttachmentSizeMb: Number(value.maxAttachmentSizeMb),
      allowedAttachmentKinds: [...value.allowedAttachmentKinds],
      slaUseBusinessHours: !!value.slaUseBusinessHours,
      slaTimezone: String(value.slaTimezone || 'UTC').trim(),
      businessHours: this.buildBusinessHoursWeek(value),
      businessHolidays: this.businessHolidays
        .map((h) => ({
          date: this.formatDateOnly(h.date),
          name: h.name?.trim() || undefined
        }))
        .filter((h): h is { date: string; name: string | undefined } => !!h.date),
      slaWarnEnabled: !!value.slaWarnEnabled,
      slaWarnHoursBefore: Number(value.slaWarnHoursBefore),
      slaBreachEscalationEnabled: !!value.slaBreachEscalationEnabled,
      slaBreachBumpPriority: !!value.slaBreachBumpPriority,
      slaBreachAssigneeId: value.slaBreachAssigneeId ?? null,
      slaBreachQueueId: value.slaBreachQueueId ?? null,
      automationDefaultPriority: value.automationDefaultPriority ?? null,
      automationCustomerAckEnabled: !!value.automationCustomerAckEnabled,
      automationNoReplyEnabled: !!value.automationNoReplyEnabled,
      automationNoReplyHours: Number(value.automationNoReplyHours),
      automationNoReplyAction: value.automationNoReplyAction,
      automationCsatInviteEnabled: !!value.automationCsatInviteEnabled
    }).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.saving = false;
        this.snackBar.open(this.translate.instant('settings.ticketSettings.saved'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.saving = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  runDigestNow(): void {
    if (this.digestRunning || !this.form.controls.agentDigestEnabled.value) {
      return;
    }
    this.digestRunning = true;
    this.ticketService.runAgentDigestNow().subscribe({
      next: (result) => {
        this.digestRunning = false;
        this.snackBar.open(
          this.translate.instant('settings.ticketSettings.digestRunNowDone', { count: result?.emailsSent ?? 0 }),
          undefined,
          { duration: 4000 }
        );
      },
      error: (error) => {
        this.digestRunning = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private load(): void {
    this.loading = true;
    this.ticketService.getTicketSettings().subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private applySettings(settings: {
    reopenWindowDays: number;
    autoArchiveClosedAfterDays?: number;
    firstResponseSlaUrgentHours?: number;
    firstResponseSlaHighHours?: number;
    firstResponseSlaMediumHours?: number;
    firstResponseSlaLowHours?: number;
    slaUrgentHours?: number;
    slaHighHours?: number;
    slaMediumHours?: number;
    slaLowHours?: number;
    autoAssignMode?: TicketAutoAssignMode;
    autoAssignFallbackRoundRobin?: boolean;
    defaultQueueId?: number | null;
    ticketEmailNotificationsEnabled?: boolean;
    ticketSmsNotificationsEnabled?: boolean;
    emailNotificationPriorities?: TicketPriority[];
    smsNotificationPriorities?: TicketPriority[];
    agentDigestEnabled?: boolean;
    agentDigestSendHour?: number;
    agentDigestSendMinute?: number;
    maxAttachments?: number;
    maxAttachmentSizeMb?: number;
    allowedAttachmentKinds?: TicketAttachmentKind[];
    slaUseBusinessHours?: boolean;
    slaTimezone?: string;
    businessHours?: BusinessHoursWeek;
    businessHolidays?: BusinessHoliday[];
    slaWarnEnabled?: boolean;
    slaWarnHoursBefore?: number;
    slaBreachEscalationEnabled?: boolean;
    slaBreachBumpPriority?: boolean;
    slaBreachAssigneeId?: number | null;
    slaBreachQueueId?: number | null;
    automationDefaultPriority?: TicketPriority | null;
    automationCustomerAckEnabled?: boolean;
    automationNoReplyEnabled?: boolean;
    automationNoReplyHours?: number;
    automationNoReplyAction?: TicketNoReplyAction;
    automationCsatInviteEnabled?: boolean;
  }): void {
    const kinds = (settings.allowedAttachmentKinds?.length
      ? settings.allowedAttachmentKinds
      : this.attachmentKinds) as TicketAttachmentKind[];
    const emailPriorities = (settings.emailNotificationPriorities?.length
      ? settings.emailNotificationPriorities
      : this.priorities) as TicketPriority[];
    const smsPriorities = (settings.smsNotificationPriorities?.length
      ? settings.smsNotificationPriorities
      : (['URGENT'] as TicketPriority[]));
    this.form.reset({
      reopenWindowDays: settings.reopenWindowDays ?? 14,
      autoArchiveClosedAfterDays: settings.autoArchiveClosedAfterDays ?? 90,
      firstResponseSlaUrgentHours: settings.firstResponseSlaUrgentHours ?? 1,
      firstResponseSlaHighHours: settings.firstResponseSlaHighHours ?? 4,
      firstResponseSlaMediumHours: settings.firstResponseSlaMediumHours ?? 8,
      firstResponseSlaLowHours: settings.firstResponseSlaLowHours ?? 24,
      slaUrgentHours: settings.slaUrgentHours ?? 4,
      slaHighHours: settings.slaHighHours ?? 24,
      slaMediumHours: settings.slaMediumHours ?? 72,
      slaLowHours: settings.slaLowHours ?? 168,
      autoAssignMode: settings.autoAssignMode ?? 'OFF',
      autoAssignFallbackRoundRobin: settings.autoAssignFallbackRoundRobin !== false,
      defaultQueueId: settings.defaultQueueId ?? null,
      ticketEmailNotificationsEnabled: settings.ticketEmailNotificationsEnabled !== false,
      ticketSmsNotificationsEnabled: settings.ticketSmsNotificationsEnabled !== false,
      emailNotificationPriorities: [...emailPriorities],
      smsNotificationPriorities: [...smsPriorities],
      agentDigestEnabled: settings.agentDigestEnabled === true,
      agentDigestSendTime: this.formatDigestTime(settings.agentDigestSendHour, settings.agentDigestSendMinute),
      maxAttachments: settings.maxAttachments ?? 5,
      maxAttachmentSizeMb: settings.maxAttachmentSizeMb ?? 5,
      allowedAttachmentKinds: [...kinds],
      slaUseBusinessHours: settings.slaUseBusinessHours === true,
      slaTimezone: settings.slaTimezone ?? 'UTC',
      slaWarnEnabled: settings.slaWarnEnabled === true,
      slaWarnHoursBefore: settings.slaWarnHoursBefore ?? 2,
      slaBreachEscalationEnabled: settings.slaBreachEscalationEnabled !== false,
      slaBreachBumpPriority: settings.slaBreachBumpPriority !== false,
      slaBreachAssigneeId: settings.slaBreachAssigneeId ?? null,
      slaBreachQueueId: settings.slaBreachQueueId ?? null,
      automationDefaultPriority: settings.automationDefaultPriority ?? null,
      automationCustomerAckEnabled: settings.automationCustomerAckEnabled !== false,
      automationNoReplyEnabled: settings.automationNoReplyEnabled === true,
      automationNoReplyHours: settings.automationNoReplyHours ?? 48,
      automationNoReplyAction: settings.automationNoReplyAction ?? 'REMIND',
      automationCsatInviteEnabled: settings.automationCsatInviteEnabled !== false,
      ...this.weekdayFormValues(settings.businessHours)
    });
    this.applyTimezoneSelection(settings.slaTimezone ?? 'UTC');
    this.businessHolidays = (settings.businessHolidays ?? []).map((h) => ({
      date: this.parseDateOnly(h.date),
      name: h.name ?? ''
    }));
  }

  private parseDateOnly(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) {
      return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatDateOnly(value: Date | null | undefined): string | null {
    if (!value || Number.isNaN(value.getTime())) {
      return null;
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private weekdayFormValues(week?: BusinessHoursWeek | null): Record<string, boolean | string> {
    const defaults: BusinessHoursWeek = {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: null,
      sunday: null
    };
    const source = week ?? defaults;
    const values: Record<string, boolean | string> = {};
    for (const day of this.weekdays) {
      const schedule = source[day];
      const open = !!schedule?.start && !!schedule?.end;
      values[`${day}Open`] = open;
      values[`${day}Start`] = schedule?.start ?? '09:00';
      values[`${day}End`] = schedule?.end ?? '17:00';
    }
    return values;
  }

  private buildBusinessHoursWeek(value: Record<string, unknown>): BusinessHoursWeek {
    const week: BusinessHoursWeek = {};
    for (const day of this.weekdays) {
      const open = !!value[`${day}Open`];
      if (!open) {
        week[day] = null;
        continue;
      }
      week[day] = {
        start: String(value[`${day}Start`] || '09:00'),
        end: String(value[`${day}End`] || '17:00')
      };
    }
    return week;
  }

  private formatDigestTime(hour?: number, minute?: number): string {
    const h = Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.trunc(hour as number))) : 8;
    const m = Number.isFinite(minute) ? Math.min(59, Math.max(0, Math.trunc(minute as number))) : 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private parseDigestHour(value: string | null | undefined): number {
    const [hourPart] = String(value || '08:00').split(':');
    const hour = Number.parseInt(hourPart, 10);
    return Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 8;
  }

  private parseDigestMinute(value: string | null | undefined): number {
    const parts = String(value || '08:00').split(':');
    const minute = Number.parseInt(parts[1] ?? '0', 10);
    return Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0;
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, { duration: 6000, panelClass: ['error-snackbar'] });
  }
}
