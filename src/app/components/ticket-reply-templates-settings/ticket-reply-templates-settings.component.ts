import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketReplyTemplate, TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-reply-templates-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  template: `
    <div class="templates-panel">
      @if (loading) {
        <p class="muted">{{ 'settings.ticketReplyTemplates.loading' | translate }}</p>
      } @else {
        <p class="intro">{{ 'settings.ticketReplyTemplates.intro' | translate }}</p>
        <p class="vars-hint">{{ 'settings.ticketReplyTemplates.variablesHint' | translate }}</p>

        <form class="editor-form" [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="title-field">
            <mat-label>{{ 'settings.ticketReplyTemplates.title' | translate }}</mat-label>
            <input matInput formControlName="title" maxlength="120">
          </mat-form-field>
          <mat-form-field appearance="outline" class="body-field">
            <mat-label>{{ 'settings.ticketReplyTemplates.body' | translate }}</mat-label>
            <textarea matInput formControlName="body" rows="6" maxlength="10000"></textarea>
          </mat-form-field>
          <div class="form-row">
            <mat-form-field appearance="outline" class="sort-field">
              <mat-label>{{ 'settings.ticketReplyTemplates.sortOrder' | translate }}</mat-label>
              <input matInput type="number" formControlName="sortOrder" min="0" max="9999">
            </mat-form-field>
            <mat-checkbox formControlName="active">
              {{ 'settings.ticketReplyTemplates.active' | translate }}
            </mat-checkbox>
          </div>
          <div class="form-actions">
            @if (editingId) {
              <button mat-button type="button" (click)="cancelEdit()" [disabled]="saving">
                {{ 'common.cancel' | translate }}
              </button>
            }
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
              <mat-icon>{{ editingId ? 'save' : 'add' }}</mat-icon>
              {{ (editingId ? 'settings.ticketReplyTemplates.save' : 'settings.ticketReplyTemplates.add') | translate }}
            </button>
          </div>
        </form>

        <ul class="template-list">
          @for (template of templates; track template.id) {
            <li>
              <div class="template-copy">
                <div class="template-head">
                  <strong>{{ template.title }}</strong>
                  @if (!template.active) {
                    <span class="inactive-badge">{{ 'settings.ticketReplyTemplates.inactive' | translate }}</span>
                  }
                  <span class="sort-badge" dir="ltr">#{{ template.sortOrder }}</span>
                </div>
                <p class="template-body">{{ template.body }}</p>
              </div>
              <div class="template-actions">
                <button mat-icon-button type="button"
                        [attr.aria-label]="'common.edit' | translate"
                        (click)="startEdit(template)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button type="button"
                        [disabled]="busyId === template.id"
                        [attr.aria-label]="'common.delete' | translate"
                        (click)="confirmRemove(template)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </li>
          } @empty {
            <li class="empty">{{ 'settings.ticketReplyTemplates.empty' | translate }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .templates-panel { display: flex; flex-direction: column; gap: 16px; }
    .muted, .intro, .vars-hint { margin: 0; color: var(--text-muted); }
    .vars-hint { font-size: 0.85rem; }
    .editor-form { display: flex; flex-direction: column; gap: 8px; }
    .title-field, .body-field { width: 100%; }
    .form-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
    .sort-field { width: 140px; }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .template-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .template-list li {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;
      background: var(--bg-secondary);
    }
    .template-copy { flex: 1; min-width: 0; }
    .template-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 6px; }
    .template-body { margin: 0; white-space: pre-wrap; font-size: 0.9rem; color: var(--text-muted); }
    .inactive-badge, .sort-badge {
      font-size: 0.75rem; padding: 2px 8px; border-radius: 999px;
      border: 1px solid var(--border-color); background: var(--bg-primary, #fff);
    }
    .template-actions { display: flex; gap: 0; flex-shrink: 0; }
    .empty { justify-content: center; color: var(--text-muted); }
  `]
})
export class TicketReplyTemplatesSettingsComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  loading = true;
  saving = false;
  busyId: number | null = null;
  editingId: number | null = null;
  templates: TicketReplyTemplate[] = [];

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    body: ['', [Validators.required, Validators.maxLength(10000)]],
    active: [true],
    sortOrder: [0, [Validators.min(0), Validators.max(9999)]]
  });

  ngOnInit(): void {
    this.load();
  }

  startEdit(template: TicketReplyTemplate): void {
    this.editingId = template.id;
    this.form.reset({
      title: template.title,
      body: template.body,
      active: template.active,
      sortOrder: template.sortOrder ?? 0
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ title: '', body: '', active: true, sortOrder: 0 });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    this.saving = true;
    const payload = {
      title: this.form.controls.title.value.trim(),
      body: this.form.controls.body.value.trim(),
      active: this.form.controls.active.value,
      sortOrder: this.form.controls.sortOrder.value
    };
    const editingId = this.editingId;
    const request$ = editingId
      ? this.ticketService.updateAdminReplyTemplate(editingId, payload)
      : this.ticketService.createAdminReplyTemplate(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.editingId = null;
        this.form.reset({ title: '', body: '', active: true, sortOrder: 0 });
        const key = editingId
          ? 'settings.ticketReplyTemplates.saved'
          : 'settings.ticketReplyTemplates.added';
        this.snackBar.open(this.translate.instant(key), undefined, { duration: 3000 });
        this.load();
      },
      error: (error) => {
        this.saving = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  confirmRemove(template: TicketReplyTemplate): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titleKey: 'settings.ticketReplyTemplates.removeTitle',
        messageKey: 'settings.ticketReplyTemplates.removeMessage',
        messageParams: { title: template.title }
      }
    }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.remove(template);
      }
    });
  }

  private remove(template: TicketReplyTemplate): void {
    this.busyId = template.id;
    this.ticketService.deleteAdminReplyTemplate(template.id).subscribe({
      next: () => {
        this.busyId = null;
        if (this.editingId === template.id) {
          this.cancelEdit();
        }
        this.snackBar.open(this.translate.instant('settings.ticketReplyTemplates.removed'), undefined, { duration: 3000 });
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
    this.ticketService.listAdminReplyTemplates().subscribe({
      next: (templates) => {
        this.templates = templates ?? [];
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
