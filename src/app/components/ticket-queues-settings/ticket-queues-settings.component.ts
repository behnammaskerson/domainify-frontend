import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketAssigneeOption, TicketQueue, TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-queues-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  template: `
    <div class="queues-panel">
      @if (loading) {
        <p class="muted">{{ 'settings.ticketQueues.loading' | translate }}</p>
      } @else {
        <p class="intro">{{ 'settings.ticketQueues.intro' | translate }}</p>
        <form class="add-row" [formGroup]="form" (ngSubmit)="addQueue()">
          <mat-form-field appearance="outline" class="name-field">
            <mat-label>{{ 'settings.ticketQueues.name' | translate }}</mat-label>
            <input matInput formControlName="name" maxlength="100">
          </mat-form-field>
          <mat-form-field appearance="outline" class="code-field">
            <mat-label>{{ 'settings.ticketQueues.code' | translate }}</mat-label>
            <input matInput formControlName="code" maxlength="64">
            <mat-hint>{{ 'settings.ticketQueues.codeHint' | translate }}</mat-hint>
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
            <mat-icon>add</mat-icon>
            {{ 'settings.ticketQueues.add' | translate }}
          </button>
        </form>

        <ul class="queue-list">
          @for (queue of queues; track queue.id; let i = $index) {
            <li [class.inactive]="!queue.active">
              <div class="row-main">
                <div class="meta">
                  <span class="col-row-num">{{ i + 1 }}</span>
                  <strong>{{ queue.name }}</strong>
                  <code dir="ltr">{{ queue.code }}</code>
                  @if (!queue.active) {
                    <span class="badge">{{ 'settings.ticketQueues.inactive' | translate }}</span>
                  }
                </div>
                <div class="actions">
                  <mat-slide-toggle
                    color="primary"
                    class="labeled-toggle"
                    [checked]="queue.active"
                    [disabled]="busyId === queue.id"
                    (change)="toggleActive(queue, $event.checked)">
                    {{ 'settings.ticketQueues.activeToggleLabel' | translate }}
                  </mat-slide-toggle>
                  <button mat-icon-button
                          type="button"
                          [disabled]="busyId === queue.id"
                          [attr.aria-label]="'common.delete' | translate"
                          (click)="confirmRemove(queue)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <mat-form-field appearance="outline" class="agents-field" subscriptSizing="dynamic">
                <mat-label>{{ 'settings.ticketQueues.members' | translate }}</mat-label>
                <mat-select
                  multiple
                  [value]="queue.agentIds ?? []"
                  [disabled]="busyId === queue.id || agentsLoading"
                  (selectionChange)="onAgentsChange(queue, $event.value)">
                  @for (agent of agents; track agent.id) {
                    <mat-option [value]="agent.id">
                      {{ agent.name || agent.email }}
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>{{ 'settings.ticketQueues.membersHint' | translate }}</mat-hint>
              </mat-form-field>
            </li>
          } @empty {
            <li class="empty">{{ 'settings.ticketQueues.empty' | translate }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .queues-panel { display: flex; flex-direction: column; gap: 16px; }
    .intro { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
    .add-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
    .name-field { flex: 1 1 220px; }
    .code-field { flex: 1 1 160px; }
    .queue-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .queue-list li {
      display: flex; flex-direction: column; gap: 10px; padding: 12px 14px;
      border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary);
    }
    .queue-list li.inactive { opacity: 0.7; }
    .row-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; min-width: 0; flex: 1 1 200px; }
    .col-row-num { width: 28px; text-align: center; color: var(--text-muted); font-variant-numeric: tabular-nums; font-size: 0.85rem; font-weight: 600; }
    .meta code { padding: 2px 8px; border-radius: 4px; background: var(--bg-secondary); font-size: 0.8rem; }
    .badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; background: var(--warning-light, #fff3cd); color: var(--warning, #856404); }
    .actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px 14px; flex: 1 1 200px; }
    .labeled-toggle { font-size: 0.85rem; white-space: nowrap; }
    .agents-field { width: 100%; }
    .empty, .muted { color: var(--text-muted); }
  `]
})
export class TicketQueuesSettingsComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  queues: TicketQueue[] = [];
  agents: TicketAssigneeOption[] = [];
  loading = true;
  agentsLoading = true;
  saving = false;
  busyId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    code: ['', [Validators.maxLength(64)]]
  });

  ngOnInit(): void {
    this.loadAgents();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.ticketService.listAllQueues().subscribe({
      next: (queues) => {
        this.queues = queues;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  loadAgents(): void {
    this.agentsLoading = true;
    this.ticketService.listAdminAssignees().subscribe({
      next: (agents) => {
        this.agents = agents ?? [];
        this.agentsLoading = false;
      },
      error: () => {
        this.agents = [];
        this.agentsLoading = false;
      }
    });
  }

  addQueue(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    this.saving = true;
    this.ticketService.createQueue({
      name: raw.name.trim(),
      code: raw.code.trim() || undefined,
      active: true
    }).subscribe({
      next: () => {
        this.saving = false;
        this.form.reset({ name: '', code: '' });
        this.snack(this.translate.instant('settings.ticketQueues.added'));
        this.load();
      },
      error: (error) => {
        this.saving = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  toggleActive(queue: TicketQueue, active: boolean): void {
    this.busyId = queue.id;
    this.ticketService.updateQueue(queue.id, {
      name: queue.name,
      code: queue.code,
      active,
      sortOrder: queue.sortOrder
    }).subscribe({
      next: () => {
        this.busyId = null;
        this.load();
      },
      error: (error) => {
        this.busyId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  onAgentsChange(queue: TicketQueue, agentIds: number[]): void {
    const next = [...(agentIds ?? [])].map(Number).filter((id) => !Number.isNaN(id)).sort((a, b) => a - b);
    const current = [...(queue.agentIds ?? [])].sort((a, b) => a - b);
    if (next.length === current.length && next.every((id, i) => id === current[i])) {
      return;
    }
    this.busyId = queue.id;
    this.ticketService.updateQueueAgents(queue.id, next).subscribe({
      next: (updated) => {
        queue.agentIds = updated.agentIds ?? next;
        this.busyId = null;
        this.snack(this.translate.instant('settings.ticketQueues.membersSaved'));
      },
      error: (error) => {
        this.busyId = null;
        this.load();
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  confirmRemove(queue: TicketQueue): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'settings.ticketQueues.removeTitle',
        messageKey: 'settings.ticketQueues.removeMessage',
        messageParams: { name: queue.name },
        confirmKey: 'common.delete',
        confirmColor: 'warn'
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busyId = queue.id;
      this.ticketService.deleteQueue(queue.id).subscribe({
        next: () => {
          this.busyId = null;
          this.snack(this.translate.instant('settings.ticketQueues.removed'));
          this.load();
        },
        error: (error) => {
          this.busyId = null;
          this.showError(this.apiError.resolve(error));
        }
      });
    });
  }

  private snack(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, { duration: 6000, panelClass: ['error-snackbar'] });
  }
}
