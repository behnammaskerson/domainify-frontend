import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-settings-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
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
          <mat-form-field appearance="outline" class="days-field">
            <mat-label>{{ 'settings.ticketSettings.reopenWindowDays' | translate }}</mat-label>
            <input matInput type="number" formControlName="reopenWindowDays" min="1" max="3650">
            <mat-hint>{{ 'settings.ticketSettings.reopenWindowDaysHint' | translate }}</mat-hint>
            @if (form.controls.reopenWindowDays.touched && form.controls.reopenWindowDays.invalid) {
              <mat-error>{{ 'settings.ticketSettings.reopenWindowDaysInvalid' | translate }}</mat-error>
            }
          </mat-form-field>
          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
              {{ (saving ? 'settings.ticketSettings.saving' : 'common.save') | translate }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .settings-panel { display: flex; flex-direction: column; gap: 16px; }
    .muted, .intro { margin: 0; color: var(--text-muted); }
    .form { display: flex; flex-direction: column; gap: 8px; width: 100%; }
    .days-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; }
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

  readonly form = this.fb.nonNullable.group({
    reopenWindowDays: [14, [Validators.required, Validators.min(1), Validators.max(3650)]]
  });

  ngOnInit(): void {
    this.load();
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    this.saving = true;
    this.ticketService.saveTicketSettings({
      reopenWindowDays: Number(this.form.controls.reopenWindowDays.value)
    }).subscribe({
      next: (settings) => {
        this.form.reset({ reopenWindowDays: settings.reopenWindowDays });
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
        this.form.reset({ reopenWindowDays: settings.reopenWindowDays ?? 14 });
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, { duration: 6000, panelClass: ['error-snackbar'] });
  }
}
