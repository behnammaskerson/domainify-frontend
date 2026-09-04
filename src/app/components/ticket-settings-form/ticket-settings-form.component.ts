import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketAttachmentKind, TicketAutoAssignMode, TicketPriority, TicketQueue, TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-settings-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
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
    .actions { display: flex; justify-content: flex-end; }
    @media (max-width: 720px) {
      .limits-row { grid-template-columns: 1fr; }
    }
  `]
})
export class TicketSettingsFormComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  loading = true;
  saving = false;

  readonly attachmentKinds: TicketAttachmentKind[] = ['IMAGE', 'PDF', 'LOG', 'DOCUMENT'];
  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  readonly autoAssignModes: TicketAutoAssignMode[] = ['OFF', 'ROUND_ROBIN', 'CATEGORY_SKILL', 'QUEUE_MEMBERSHIP'];
  queues: TicketQueue[] = [];

  readonly form = this.fb.nonNullable.group({
    reopenWindowDays: [14, [Validators.required, Validators.min(1), Validators.max(3650)]],
    autoArchiveClosedAfterDays: [90, [Validators.required, Validators.min(0), Validators.max(3650)]],
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
    maxAttachments: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
    maxAttachmentSizeMb: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
    allowedAttachmentKinds: this.fb.nonNullable.control<TicketAttachmentKind[]>(
      ['IMAGE', 'PDF', 'LOG', 'DOCUMENT'],
      [Validators.required, Validators.minLength(1)]
    )
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
      maxAttachments: Number(value.maxAttachments),
      maxAttachmentSizeMb: Number(value.maxAttachmentSizeMb),
      allowedAttachmentKinds: [...value.allowedAttachmentKinds]
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
    maxAttachments?: number;
    maxAttachmentSizeMb?: number;
    allowedAttachmentKinds?: TicketAttachmentKind[];
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
      maxAttachments: settings.maxAttachments ?? 5,
      maxAttachmentSizeMb: settings.maxAttachmentSizeMb ?? 5,
      allowedAttachmentKinds: [...kinds]
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, { duration: 6000, panelClass: ['error-snackbar'] });
  }
}
