import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { TicketAssigneeOption, TicketPriority, TicketQueue } from '../../services/ticket.service';

export interface TicketEscalateDialogData {
  publicNumber?: string;
  priority: TicketPriority;
  assigneeId?: number | null;
  queueId?: number | null;
  assignees: TicketAssigneeOption[];
  queues: TicketQueue[];
}

export interface TicketEscalateDialogResult {
  bumpPriority: boolean;
  priority: TicketPriority | null;
  priorityChanged: boolean;
  assigneeId: number | null;
  assigneeChanged: boolean;
  queueId: number | null;
  queueChanged: boolean;
  note: string;
}

const PRIORITY_ORDER: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

@Component({
  selector: 'app-ticket-escalate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.escalateTitle' | translate }}</h2>
    <mat-dialog-content class="escalate-content">
      <p class="intro">
        {{ 'tickets.detail.escalateIntro' | translate: { number: data.publicNumber || '—' } }}
      </p>

      <mat-checkbox [(ngModel)]="bumpPriority" (ngModelChange)="onBumpChange()">
        {{ 'tickets.detail.escalateBumpPriority' | translate }}
      </mat-checkbox>

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.escalatePriority' | translate }}</mat-label>
        <mat-select [(ngModel)]="priority" [disabled]="bumpPriority">
          @for (p of priorities; track p) {
            <mat-option [value]="p">{{ ('tickets.priorities.' + p) | translate }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.escalateAssignee' | translate }}</mat-label>
        <mat-select [(ngModel)]="assigneeId">
          <mat-option [value]="null">{{ 'tickets.detail.unassigned' | translate }}</mat-option>
          @for (assignee of data.assignees; track assignee.id) {
            <mat-option [value]="assignee.id">{{ assignee.name || assignee.email }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.escalateQueue' | translate }}</mat-label>
        <mat-select [(ngModel)]="queueId">
          <mat-option [value]="null">{{ 'tickets.detail.noQueue' | translate }}</mat-option>
          @for (queue of data.queues; track queue.id) {
            <mat-option [value]="queue.id">{{ queue.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.escalateNote' | translate }}</mat-label>
        <textarea matInput
                  rows="4"
                  maxlength="2000"
                  [(ngModel)]="note"
                  [placeholder]="'tickets.detail.escalateNotePlaceholder' | translate"></textarea>
      </mat-form-field>
      @if (!hasChange) {
        <p class="hint warn">{{ 'tickets.detail.escalateNeedChange' | translate }}</p>
      } @else {
        <p class="hint">{{ 'tickets.detail.escalateNoteHint' | translate }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!hasChange" (click)="confirm()">
        <mat-icon>trending_up</mat-icon>
        {{ 'tickets.detail.escalateConfirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .escalate-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: min(440px, 86vw);
      padding-top: 4px;
    }
    .intro {
      margin: 0 0 8px;
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
export class TicketEscalateDialogComponent {
  readonly data = inject<TicketEscalateDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TicketEscalateDialogComponent, TicketEscalateDialogResult>);

  readonly priorities = PRIORITY_ORDER;
  bumpPriority = true;
  priority: TicketPriority = this.nextPriority(this.data.priority);
  assigneeId: number | null = this.data.assigneeId ?? null;
  queueId: number | null = this.data.queueId ?? null;
  note = '';

  get hasChange(): boolean {
    const originalAssignee = this.data.assigneeId ?? null;
    const originalQueue = this.data.queueId ?? null;
    const priorityWillChange = this.bumpPriority
      ? this.nextPriority(this.data.priority) !== this.data.priority
      : this.priority !== this.data.priority;
    return priorityWillChange
      || this.assigneeId !== originalAssignee
      || this.queueId !== originalQueue;
  }

  onBumpChange(): void {
    if (this.bumpPriority) {
      this.priority = this.nextPriority(this.data.priority);
    }
  }

  confirm(): void {
    if (!this.hasChange) {
      return;
    }
    const originalAssignee = this.data.assigneeId ?? null;
    const originalQueue = this.data.queueId ?? null;
    const targetPriority = this.bumpPriority ? this.nextPriority(this.data.priority) : this.priority;
    this.dialogRef.close({
      bumpPriority: this.bumpPriority,
      priority: this.bumpPriority ? null : targetPriority,
      priorityChanged: !this.bumpPriority && targetPriority !== this.data.priority,
      assigneeId: this.assigneeId,
      assigneeChanged: this.assigneeId !== originalAssignee,
      queueId: this.queueId,
      queueChanged: this.queueId !== originalQueue,
      note: this.note.trim()
    });
  }

  private nextPriority(current: TicketPriority): TicketPriority {
    const idx = PRIORITY_ORDER.indexOf(current);
    if (idx < 0 || idx >= PRIORITY_ORDER.length - 1) {
      return 'URGENT';
    }
    return PRIORITY_ORDER[idx + 1];
  }
}
