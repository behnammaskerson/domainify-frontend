import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import {
  TicketStatus,
  TicketStatusDefinition,
  TicketStatusWorkflow,
  TicketService
} from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-status-workflow-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <div class="workflow-panel">
      @if (loading) {
        <p class="muted">{{ 'settings.ticketStatusWorkflow.loading' | translate }}</p>
      } @else if (statuses.length) {
        <p class="intro">{{ 'settings.ticketStatusWorkflow.intro' | translate }}</p>

        <section class="status-list">
          <h3>{{ 'settings.ticketStatusWorkflow.statusesTitle' | translate }}</h3>
          @for (status of statuses; track status.status) {
            <div class="status-row" [class.inactive]="!status.active">
              <div class="status-meta">
                <span class="status-pill" [attr.data-status]="status.status">
                  {{ statusLabel(status) }}
                </span>
                <code dir="ltr">{{ status.status }}</code>
              </div>
              <mat-form-field appearance="outline" class="label-field" subscriptSizing="dynamic">
                <mat-label>{{ 'settings.ticketStatusWorkflow.customLabel' | translate }}</mat-label>
                <input matInput
                       [(ngModel)]="status.label"
                       maxlength="100"
                       [placeholder]="defaultStatusLabel(status.status)">
              </mat-form-field>
              <mat-slide-toggle
                color="primary"
                [checked]="status.active"
                [disabled]="status.status === 'NEW'"
                (change)="status.active = $event.checked; pruneInactiveTransitions()">
                {{ (status.active ? 'settings.ticketStatusWorkflow.active' : 'settings.ticketStatusWorkflow.inactive') | translate }}
              </mat-slide-toggle>
            </div>
          }
        </section>

        <section class="matrix-section">
          <h3>{{ 'settings.ticketStatusWorkflow.transitionsTitle' | translate }}</h3>
          <p class="hint">{{ 'settings.ticketStatusWorkflow.transitionsHint' | translate }}</p>
          <div class="matrix-wrap">
            <table class="matrix">
              <thead>
                <tr>
                  <th>{{ 'settings.ticketStatusWorkflow.fromTo' | translate }}</th>
                  @for (to of statuses; track to.status) {
                    <th [class.dim]="!to.active">{{ shortLabel(to) }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (from of statuses; track from.status) {
                  <tr [class.dim]="!from.active">
                    <th>{{ shortLabel(from) }}</th>
                    @for (to of statuses; track to.status) {
                      <td>
                        @if (from.status === to.status) {
                          <span class="same">—</span>
                        } @else {
                          <mat-checkbox
                            color="primary"
                            [checked]="hasTransition(from.status, to.status)"
                            [disabled]="!from.active || !to.active"
                            (change)="setTransition(from.status, to.status, $event.checked)">
                          </mat-checkbox>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <div class="actions">
          <button mat-stroked-button type="button" [disabled]="saving" (click)="resetDefaults()">
            {{ 'settings.ticketStatusWorkflow.resetDefaults' | translate }}
          </button>
          <button mat-flat-button color="primary" type="button" [disabled]="saving" (click)="save()">
            {{ (saving ? 'settings.ticketStatusWorkflow.saving' : 'common.save') | translate }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .workflow-panel { display: flex; flex-direction: column; gap: 20px; }
    .muted, .intro, .hint { color: var(--text-muted); margin: 0; }
    .hint { font-size: 0.85rem; margin-bottom: 10px; }
    h3 { margin: 0 0 10px; font-size: 1rem; }
    .status-list, .matrix-section {
      display: flex; flex-direction: column; gap: 10px;
    }
    .status-row {
      display: grid;
      grid-template-columns: minmax(140px, 1fr) minmax(160px, 1.2fr) auto;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-secondary);
    }
    .status-row.inactive { opacity: 0.7; }
    .status-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .status-meta code {
      font-size: 0.75rem; color: var(--text-muted);
      padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);
    }
    .label-field { width: 100%; }
    .status-pill {
      display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
      font-size: 0.78rem; font-weight: 600; background: var(--bg-primary, #fff);
      border: 1px solid var(--border-color);
    }
    .status-pill[data-status='NEW'] { background: color-mix(in srgb, #2563eb 12%, transparent); }
    .status-pill[data-status='OPEN'] { background: color-mix(in srgb, #0891b2 12%, transparent); }
    .status-pill[data-status='PENDING'],
    .status-pill[data-status='ON_HOLD'] { background: color-mix(in srgb, #d97706 12%, transparent); }
    .status-pill[data-status='RESOLVED'] { background: color-mix(in srgb, #16a34a 12%, transparent); }
    .status-pill[data-status='CLOSED'] { background: color-mix(in srgb, #64748b 12%, transparent); }
    .matrix-wrap {
      overflow: auto;
      max-width: 100%;
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }
    .matrix {
      width: 100%; border-collapse: collapse; min-width: 560px; background: var(--bg-primary, #fff);
    }
    .matrix th, .matrix td {
      border: 1px solid var(--border-color); padding: 8px; text-align: center; font-size: 0.82rem;
    }
    .matrix thead th, .matrix tbody th {
      background: var(--bg-secondary); font-weight: 600; white-space: nowrap;
    }
    .matrix tbody th { text-align: start; }
    .matrix tr.dim, .matrix th.dim { opacity: 0.45; }
    .same { color: var(--text-muted); }
    .actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
    @media (max-width: 800px) {
      .status-row { grid-template-columns: 1fr; }
    }
  `]
})
export class TicketStatusWorkflowSettingsComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  loading = true;
  saving = false;
  statuses: Array<TicketStatusDefinition & { label: string }> = [];
  private transitionKeys = new Set<string>();

  private readonly defaultTransitions: Array<{ from: TicketStatus; to: TicketStatus }> = [
    { from: 'NEW', to: 'OPEN' },
    { from: 'NEW', to: 'PENDING' },
    { from: 'NEW', to: 'ON_HOLD' },
    { from: 'NEW', to: 'RESOLVED' },
    { from: 'NEW', to: 'CLOSED' },
    { from: 'OPEN', to: 'PENDING' },
    { from: 'OPEN', to: 'ON_HOLD' },
    { from: 'OPEN', to: 'RESOLVED' },
    { from: 'OPEN', to: 'CLOSED' },
    { from: 'PENDING', to: 'OPEN' },
    { from: 'PENDING', to: 'ON_HOLD' },
    { from: 'PENDING', to: 'RESOLVED' },
    { from: 'PENDING', to: 'CLOSED' },
    { from: 'ON_HOLD', to: 'OPEN' },
    { from: 'ON_HOLD', to: 'PENDING' },
    { from: 'ON_HOLD', to: 'RESOLVED' },
    { from: 'ON_HOLD', to: 'CLOSED' },
    { from: 'RESOLVED', to: 'OPEN' },
    { from: 'RESOLVED', to: 'CLOSED' },
    { from: 'CLOSED', to: 'OPEN' }
  ];

  ngOnInit(): void {
    this.load();
  }

  statusLabel(status: TicketStatusDefinition): string {
    return status.label?.trim() || this.defaultStatusLabel(status.status);
  }

  shortLabel(status: TicketStatusDefinition): string {
    return this.statusLabel(status);
  }

  defaultStatusLabel(status: TicketStatus): string {
    return this.translate.instant('tickets.statuses.' + status);
  }

  hasTransition(from: TicketStatus, to: TicketStatus): boolean {
    return this.transitionKeys.has(this.key(from, to));
  }

  setTransition(from: TicketStatus, to: TicketStatus, enabled: boolean): void {
    const k = this.key(from, to);
    if (enabled) {
      this.transitionKeys.add(k);
    } else {
      this.transitionKeys.delete(k);
    }
  }

  pruneInactiveTransitions(): void {
    const active = new Set(this.statuses.filter((s) => s.active).map((s) => s.status));
    for (const key of [...this.transitionKeys]) {
      const [from, to] = key.split('>') as [TicketStatus, TicketStatus];
      if (!active.has(from) || !active.has(to)) {
        this.transitionKeys.delete(key);
      }
    }
    const newStatus = this.statuses.find((s) => s.status === 'NEW');
    if (newStatus) {
      newStatus.active = true;
    }
  }

  resetDefaults(): void {
    this.statuses = this.statuses.map((status, index) => ({
      ...status,
      active: true,
      label: '',
      sortOrder: index
    }));
    this.transitionKeys = new Set(this.defaultTransitions.map((t) => this.key(t.from, t.to)));
  }

  save(): void {
    this.pruneInactiveTransitions();
    this.saving = true;
    const payload: TicketStatusWorkflow = {
      statuses: this.statuses.map((status, index) => ({
        status: status.status,
        label: status.label?.trim() || null,
        active: status.status === 'NEW' ? true : status.active,
        sortOrder: index
      })),
      transitions: [...this.transitionKeys].map((key) => {
        const [from, to] = key.split('>') as [TicketStatus, TicketStatus];
        return { from, to };
      })
    };

    this.ticketService.saveStatusWorkflow(payload).subscribe({
      next: (workflow) => {
        this.applyWorkflow(workflow);
        this.saving = false;
        this.snackBar.open(this.translate.instant('settings.ticketStatusWorkflow.saved'), undefined, {
          duration: 3000
        });
      },
      error: (error) => {
        this.saving = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private load(): void {
    this.loading = true;
    this.ticketService.getStatusWorkflow().subscribe({
      next: (workflow) => {
        this.applyWorkflow(workflow);
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private applyWorkflow(workflow: TicketStatusWorkflow): void {
    const order = ['NEW', 'OPEN', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'] as TicketStatus[];
    const byStatus = new Map((workflow.statuses ?? []).map((s) => [s.status, s]));
    this.statuses = order.map((status, index) => {
      const existing = byStatus.get(status);
      return {
        status,
        label: existing?.label ?? '',
        active: existing?.active ?? true,
        sortOrder: existing?.sortOrder ?? index
      };
    });
    this.transitionKeys = new Set(
      (workflow.transitions ?? []).map((t) => this.key(t.from, t.to))
    );
  }

  private key(from: TicketStatus, to: TicketStatus): string {
    return `${from}>${to}`;
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
