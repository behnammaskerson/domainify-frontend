import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketAttachmentKind, TicketService } from '../../services/ticket.service';

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
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving || !hasKinds">
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

  readonly form = this.fb.nonNullable.group({
    reopenWindowDays: [14, [Validators.required, Validators.min(1), Validators.max(3650)]],
    autoArchiveClosedAfterDays: [90, [Validators.required, Validators.min(0), Validators.max(3650)]],
    slaUrgentHours: [4, [Validators.required, Validators.min(1), Validators.max(8760)]],
    slaHighHours: [24, [Validators.required, Validators.min(1), Validators.max(8760)]],
    slaMediumHours: [72, [Validators.required, Validators.min(1), Validators.max(8760)]],
    slaLowHours: [168, [Validators.required, Validators.min(1), Validators.max(8760)]],
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

  ngOnInit(): void {
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

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving || !this.hasKinds) {
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
    maxAttachments?: number;
    maxAttachmentSizeMb?: number;
    allowedAttachmentKinds?: TicketAttachmentKind[];
  }): void {
    const kinds = (settings.allowedAttachmentKinds?.length
      ? settings.allowedAttachmentKinds
      : this.attachmentKinds) as TicketAttachmentKind[];
    this.form.reset({
      reopenWindowDays: settings.reopenWindowDays ?? 14,
      autoArchiveClosedAfterDays: settings.autoArchiveClosedAfterDays ?? 90,
      slaUrgentHours: settings.slaUrgentHours ?? 4,
      slaHighHours: settings.slaHighHours ?? 24,
      slaMediumHours: settings.slaMediumHours ?? 72,
      slaLowHours: settings.slaLowHours ?? 168,
      maxAttachments: settings.maxAttachments ?? 5,
      maxAttachmentSizeMb: settings.maxAttachmentSizeMb ?? 5,
      allowedAttachmentKinds: [...kinds]
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, { duration: 6000, panelClass: ['error-snackbar'] });
  }
}
