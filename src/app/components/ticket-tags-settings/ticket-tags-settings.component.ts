import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketService, TicketTag } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-tags-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  template: `
    <div class="tags-panel">
      @if (loading) {
        <p class="muted">{{ 'settings.ticketTags.loading' | translate }}</p>
      } @else {
        <p class="intro">{{ 'settings.ticketTags.intro' | translate }}</p>
        <form class="add-row" [formGroup]="form" (ngSubmit)="addTag()">
          <mat-form-field appearance="outline" class="name-field">
            <mat-label>{{ 'settings.ticketTags.name' | translate }}</mat-label>
            <input matInput formControlName="name" maxlength="64">
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
            <mat-icon>add</mat-icon>
            {{ 'settings.ticketTags.add' | translate }}
          </button>
        </form>

        <ul class="tag-list">
          @for (tag of tags; track tag.id) {
            <li>
              <span class="tag-chip">{{ tag.name }}</span>
              <button mat-icon-button
                      type="button"
                      [disabled]="busyId === tag.id"
                      [attr.aria-label]="'common.delete' | translate"
                      (click)="confirmRemove(tag)">
                <mat-icon>delete</mat-icon>
              </button>
            </li>
          } @empty {
            <li class="empty">{{ 'settings.ticketTags.empty' | translate }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .tags-panel { display: flex; flex-direction: column; gap: 16px; }
    .muted, .intro { margin: 0; color: var(--text-muted); }
    .add-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
    .name-field { flex: 1 1 220px; }
    .tag-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .tag-list li {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 8px;
      background: var(--bg-secondary);
    }
    .tag-chip {
      display: inline-flex; padding: 3px 10px; border-radius: 999px; font-size: 0.85rem; font-weight: 600;
      border: 1px solid var(--border-color); background: var(--bg-primary, #fff);
    }
    .empty { justify-content: center; color: var(--text-muted); }
  `]
})
export class TicketTagsSettingsComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  loading = true;
  saving = false;
  busyId: number | null = null;
  tags: TicketTag[] = [];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(64)]]
  });

  ngOnInit(): void {
    this.load();
  }

  addTag(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    this.saving = true;
    this.ticketService.createAdminTag(this.form.controls.name.value.trim()).subscribe({
      next: () => {
        this.form.reset({ name: '' });
        this.saving = false;
        this.snackBar.open(this.translate.instant('settings.ticketTags.added'), undefined, { duration: 3000 });
        this.load();
      },
      error: (error) => {
        this.saving = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  confirmRemove(tag: TicketTag): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titleKey: 'settings.ticketTags.removeTitle',
        messageKey: 'settings.ticketTags.removeMessage',
        messageParams: { name: tag.name }
      }
    }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.remove(tag);
      }
    });
  }

  private remove(tag: TicketTag): void {
    this.busyId = tag.id;
    this.ticketService.deleteAdminTag(tag.id).subscribe({
      next: () => {
        this.busyId = null;
        this.snackBar.open(this.translate.instant('settings.ticketTags.removed'), undefined, { duration: 3000 });
        this.load();
      },
      error: (error) => {
        this.busyId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private load(): void {
    this.loading = true;
    this.ticketService.listAdminManagedTags().subscribe({
      next: (tags) => {
        this.tags = tags ?? [];
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
