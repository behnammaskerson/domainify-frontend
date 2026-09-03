import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { TicketMessage } from '../../services/ticket.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

export interface TicketSplitDialogData {
  sourcePublicNumber?: string;
  messages: TicketMessage[];
}

export interface TicketSplitDialogResult {
  subject: string;
  messageIds: number[];
}

@Component({
  selector: 'app-ticket-split-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslateModule,
    LocaleDatePipe
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.splitTitle' | translate }}</h2>
    <mat-dialog-content class="split-content">
      <p class="split-intro">
        {{ 'tickets.detail.splitIntro' | translate: { number: data.sourcePublicNumber || '—' } }}
      </p>

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
          <mat-label>{{ 'tickets.detail.splitSubjectLabel' | translate }}</mat-label>
          <input matInput formControlName="subject" maxlength="200" autocomplete="off" />
          @if (form.controls.subject.hasError('required')) {
            <mat-error>{{ 'tickets.detail.splitSubjectRequired' | translate }}</mat-error>
          }
        </mat-form-field>
      </form>

      <div class="messages-header">
        <h3>{{ 'tickets.detail.splitMessagesTitle' | translate }}</h3>
        <span class="selection-count">
          {{ 'tickets.detail.splitSelectedCount' | translate: { count: selectedIds.size } }}
        </span>
      </div>
      <p class="split-hint">{{ 'tickets.detail.splitHint' | translate }}</p>

      <ul class="message-list">
        @for (message of replyMessages; track message.id) {
          <li>
            <mat-checkbox
              [checked]="selectedIds.has(message.id!)"
              (change)="toggleMessage(message.id!, $event.checked)">
              <div class="message-option">
                <div class="message-meta">
                  <strong>{{ message.authorName || message.authorEmail || '—' }}</strong>
                  <time dir="ltr">{{ message.createdAt | localeDate:dateTimeFormat }}</time>
                </div>
                <p class="message-preview">{{ previewBody(message.body) }}</p>
              </div>
            </mat-checkbox>
          </li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" type="button" [disabled]="!canSubmit" (click)="confirm()">
        {{ 'tickets.detail.splitConfirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host h2[mat-dialog-title] {
      color: var(--text-primary);
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .split-content {
      min-width: 480px;
      max-width: 640px;
      max-height: 70vh;
    }

    .split-intro,
    .split-hint {
      margin: 0 0 12px;
      color: var(--text-secondary);
      line-height: 1.5;
      font-size: 0.92rem;
    }

    .split-hint {
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .full-width { width: 100%; }

    .messages-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin: 8px 0 4px;
    }

    .messages-header h3 {
      margin: 0;
      font-size: 0.95rem;
    }

    .selection-count {
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .message-list {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .message-list li + li {
      border-top: 1px solid var(--border-color);
    }

    .message-list mat-checkbox {
      display: block;
      width: 100%;
      padding: 10px 12px;
    }

    .message-option {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .message-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: baseline;
      font-size: 0.82rem;
    }

    .message-meta time {
      color: var(--text-muted);
    }

    .message-preview {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.85rem;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      white-space: pre-wrap;
    }
  `]
})
export class TicketSplitDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TicketSplitDialogComponent, TicketSplitDialogResult>);
  readonly data = inject<TicketSplitDialogData>(MAT_DIALOG_DATA);

  readonly dateTimeFormat = SMS_DATETIME_FORMAT;
  readonly replyMessages = (this.data.messages ?? []).filter((m) => !m.initial && m.id != null);
  readonly selectedIds = new Set<number>();

  readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(200)]]
  });

  get canSubmit(): boolean {
    const subjectOk = this.form.controls.subject.value.trim().length > 0;
    const count = this.selectedIds.size;
    return subjectOk && count > 0 && count < this.replyMessages.length;
  }

  toggleMessage(id: number, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  previewBody(body?: string): string {
    const text = (body ?? '').replace(/\s+/g, ' ').trim();
    return text.length > 160 ? text.slice(0, 157) + '…' : text || '—';
  }

  confirm(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({
      subject: this.form.controls.subject.value.trim(),
      messageIds: [...this.selectedIds]
    });
  }
}
