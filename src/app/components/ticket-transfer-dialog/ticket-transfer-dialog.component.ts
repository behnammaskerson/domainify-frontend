import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { TicketAssigneeOption, TicketQueue } from '../../services/ticket.service';

export interface TicketTransferDialogData {
  publicNumber?: string;
  assigneeId?: number | null;
  queueId?: number | null;
  assignees: TicketAssigneeOption[];
  queues: TicketQueue[];
}

export interface TicketTransferDialogResult {
  assigneeId: number | null;
  assigneeChanged: boolean;
  queueId: number | null;
  queueChanged: boolean;
  note: string;
}

@Component({
  selector: 'app-ticket-transfer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.transferTitle' | translate }}</h2>
    <mat-dialog-content class="transfer-content">
      <p class="intro">
        {{ 'tickets.detail.transferIntro' | translate: { number: data.publicNumber || '—' } }}
      </p>

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.transferAssignee' | translate }}</mat-label>
        <mat-select [(ngModel)]="assigneeId">
          <mat-option [value]="null">{{ 'tickets.detail.unassigned' | translate }}</mat-option>
          @for (assignee of data.assignees; track assignee.id) {
            <mat-option [value]="assignee.id">{{ assignee.name || assignee.email }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.transferQueue' | translate }}</mat-label>
        <mat-select [(ngModel)]="queueId">
          <mat-option [value]="null">{{ 'tickets.detail.noQueue' | translate }}</mat-option>
          @for (queue of data.queues; track queue.id) {
            <mat-option [value]="queue.id">{{ queue.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.transferNote' | translate }}</mat-label>
        <textarea matInput
                  rows="4"
                  maxlength="2000"
                  [(ngModel)]="note"
                  [placeholder]="'tickets.detail.transferNotePlaceholder' | translate"></textarea>
      </mat-form-field>
      @if (!hasChange) {
        <p class="hint warn">{{ 'tickets.detail.transferNeedChange' | translate }}</p>
      } @else {
        <p class="hint">{{ 'tickets.detail.transferNoteHint' | translate }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!hasChange" (click)="confirm()">
        <mat-icon>swap_horiz</mat-icon>
        {{ 'tickets.detail.transferConfirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .transfer-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: min(440px, 86vw);
      padding-top: 4px;
    }
    .intro {
      margin: 0 0 12px;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .full { width: 100%; }
    .hint {
      margin: 0 0 4px;
      color: var(--text-muted);
      font-size: 0.82rem;
    }
    .hint.warn { color: var(--warning, #c47d0e); }
    mat-dialog-actions mat-icon {
      margin-inline-end: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class TicketTransferDialogComponent {
  readonly data = inject<TicketTransferDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TicketTransferDialogComponent, TicketTransferDialogResult>);

  assigneeId: number | null = this.data.assigneeId ?? null;
  queueId: number | null = this.data.queueId ?? null;
  note = '';

  get hasChange(): boolean {
    const originalAssignee = this.data.assigneeId ?? null;
    const originalQueue = this.data.queueId ?? null;
    return this.assigneeId !== originalAssignee || this.queueId !== originalQueue;
  }

  confirm(): void {
    if (!this.hasChange) {
      return;
    }
    const originalAssignee = this.data.assigneeId ?? null;
    const originalQueue = this.data.queueId ?? null;
    this.dialogRef.close({
      assigneeId: this.assigneeId,
      assigneeChanged: this.assigneeId !== originalAssignee,
      queueId: this.queueId,
      queueChanged: this.queueId !== originalQueue,
      note: this.note.trim()
    });
  }
}
