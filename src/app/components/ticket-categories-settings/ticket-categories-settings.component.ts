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
import {
  TicketAssigneeOption,
  TicketCategory,
  TicketCategoryRequest,
  TicketPriority,
  TicketService
} from '../../services/ticket.service';

interface CategorySlaDraft {
  firstResponseSlaUrgentHours: string;
  firstResponseSlaHighHours: string;
  firstResponseSlaMediumHours: string;
  firstResponseSlaLowHours: string;
  resolveSlaUrgentHours: string;
  resolveSlaHighHours: string;
  resolveSlaMediumHours: string;
  resolveSlaLowHours: string;
}

@Component({
  selector: 'app-ticket-categories-settings',
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
    <div class="categories-panel">
      @if (loading) {
        <p class="muted">{{ 'settings.ticketCategories.loading' | translate }}</p>
      } @else {
        <p class="intro">{{ 'settings.ticketCategories.skillsIntro' | translate }}</p>
        <form class="add-row" [formGroup]="form" (ngSubmit)="addCategory()">
          <mat-form-field appearance="outline" class="name-field">
            <mat-label>{{ 'settings.ticketCategories.name' | translate }}</mat-label>
            <input matInput formControlName="name" maxlength="100">
          </mat-form-field>
          <mat-form-field appearance="outline" class="code-field">
            <mat-label>{{ 'settings.ticketCategories.code' | translate }}</mat-label>
            <input matInput formControlName="code" maxlength="64">
            <mat-hint>{{ 'settings.ticketCategories.codeHint' | translate }}</mat-hint>
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
            <mat-icon>add</mat-icon>
            {{ 'settings.ticketCategories.add' | translate }}
          </button>
        </form>

        <ul class="category-list">
          @for (category of categories; track category.id; let i = $index) {
            <li [class.inactive]="!category.active">
              <div class="row-main">
                <div class="meta">
                  <span class="col-row-num">{{ i + 1 }}</span>
                  <strong>{{ category.name }}</strong>
                  <code dir="ltr">{{ category.code }}</code>
                  @if (!category.active) {
                    <span class="badge">{{ 'settings.ticketCategories.inactive' | translate }}</span>
                  }
                </div>
                <div class="actions">
                  <mat-slide-toggle
                    color="primary"
                    class="labeled-toggle"
                    [checked]="category.emailNotificationsEnabled !== false"
                    [disabled]="busyId === category.id"
                    (change)="toggleEmailNotifications(category, $event.checked)">
                    {{ 'settings.ticketCategories.emailToggleLabel' | translate }}
                  </mat-slide-toggle>
                  <mat-slide-toggle
                    color="primary"
                    class="labeled-toggle"
                    [checked]="category.smsNotificationsEnabled !== false"
                    [disabled]="busyId === category.id"
                    (change)="toggleSmsNotifications(category, $event.checked)">
                    {{ 'settings.ticketCategories.smsToggleLabel' | translate }}
                  </mat-slide-toggle>
                  <mat-slide-toggle
                    color="primary"
                    class="labeled-toggle"
                    [checked]="category.active"
                    [disabled]="busyId === category.id"
                    (change)="toggleActive(category, $event.checked)">
                    {{ 'settings.ticketCategories.activeToggleLabel' | translate }}
                  </mat-slide-toggle>
                  <button mat-icon-button
                          type="button"
                          [disabled]="busyId === category.id"
                          [attr.aria-label]="'common.delete' | translate"
                          (click)="confirmRemove(category)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <mat-form-field appearance="outline" class="agents-field" subscriptSizing="dynamic">
                <mat-label>{{ 'settings.ticketCategories.skilledAgents' | translate }}</mat-label>
                <mat-select
                  multiple
                  [value]="category.agentIds ?? []"
                  [disabled]="busyId === category.id || agentsLoading"
                  (selectionChange)="onAgentsChange(category, $event.value)">
                  @for (agent of agents; track agent.id) {
                    <mat-option [value]="agent.id">
                      {{ agent.name || agent.email }}
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>{{ 'settings.ticketCategories.skilledAgentsHint' | translate }}</mat-hint>
              </mat-form-field>

              <div class="sla-block">
                <button type="button" class="sla-toggle" (click)="toggleSlaExpanded(category.id)">
                  <mat-icon>{{ isSlaExpanded(category.id) ? 'expand_less' : 'expand_more' }}</mat-icon>
                  <span>{{ 'settings.ticketCategories.slaOverridesTitle' | translate }}</span>
                  @if (hasSlaOverrides(category)) {
                    <span class="sla-badge">{{ 'settings.ticketCategories.slaOverridesActive' | translate }}</span>
                  }
                </button>
                @if (isSlaExpanded(category.id)) {
                  <div class="sla-panel">
                    <p class="sla-hint">{{ 'settings.ticketCategories.slaOverridesHint' | translate }}</p>
                    <p class="sla-group-label">{{ 'settings.ticketCategories.slaFirstResponseGroup' | translate }}</p>
                    <div class="sla-grid">
                      @for (priority of priorities; track priority) {
                        <mat-form-field appearance="outline" subscriptSizing="dynamic">
                          <mat-label>{{ ('tickets.priorities.' + priority) | translate }}</mat-label>
                          <input matInput type="number" min="1" max="8760"
                                 [disabled]="busyId === category.id"
                                 [value]="getSlaDraftValue(category.id, firstResponseField(priority))"
                                 (input)="setSlaDraftField(category.id, firstResponseField(priority), $any($event.target).value)"
                                 [attr.aria-label]="('settings.ticketCategories.slaFirstResponseGroup' | translate) + ' ' + (('tickets.priorities.' + priority) | translate)">
                          <mat-hint>{{ 'settings.ticketCategories.slaInheritHint' | translate }}</mat-hint>
                        </mat-form-field>
                      }
                    </div>
                    <p class="sla-group-label">{{ 'settings.ticketCategories.slaResolveGroup' | translate }}</p>
                    <div class="sla-grid">
                      @for (priority of priorities; track priority) {
                        <mat-form-field appearance="outline" subscriptSizing="dynamic">
                          <mat-label>{{ ('tickets.priorities.' + priority) | translate }}</mat-label>
                          <input matInput type="number" min="1" max="8760"
                                 [disabled]="busyId === category.id"
                                 [value]="getSlaDraftValue(category.id, resolveField(priority))"
                                 (input)="setSlaDraftField(category.id, resolveField(priority), $any($event.target).value)"
                                 [attr.aria-label]="('settings.ticketCategories.slaResolveGroup' | translate) + ' ' + (('tickets.priorities.' + priority) | translate)">
                          <mat-hint>{{ 'settings.ticketCategories.slaInheritHint' | translate }}</mat-hint>
                        </mat-form-field>
                      }
                    </div>
                    <div class="sla-actions">
                      <button mat-stroked-button type="button"
                              [disabled]="busyId === category.id"
                              (click)="resetSlaDraft(category)">
                        {{ 'common.cancel' | translate }}
                      </button>
                      <button mat-flat-button color="primary" type="button"
                              [disabled]="busyId === category.id"
                              (click)="saveSlaOverrides(category)">
                        {{ 'settings.ticketCategories.slaOverridesSave' | translate }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            </li>
          } @empty {
            <li class="empty">{{ 'settings.ticketCategories.empty' | translate }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .categories-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .intro {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .add-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-start;
    }

    .name-field {
      flex: 1 1 220px;
    }

    .code-field {
      flex: 1 1 160px;
    }

    .category-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .category-list li {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-primary);
    }

    .category-list li.inactive {
      opacity: 0.7;
    }

    .row-main {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1 1 200px;
    }

    .col-row-num {
      width: 28px;
      text-align: center;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .meta code {
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--bg-secondary);
      font-size: 0.8rem;
    }

    .badge {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--warning-light, #fff3cd);
      color: var(--warning, #856404);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 10px 14px;
      flex: 1 1 280px;
    }

    .labeled-toggle {
      font-size: 0.85rem;
      white-space: nowrap;
    }

    .agents-field {
      width: 100%;
    }

    .sla-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-top: 1px solid var(--border-color);
      padding-top: 8px;
    }

    .sla-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      border: none;
      background: none;
      color: var(--text-primary);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
    }

    .sla-toggle mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .sla-badge {
      font-size: 0.72rem;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--primary, #1976d2) 12%, transparent);
      color: var(--primary, #1976d2);
    }

    .sla-panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-secondary);
    }

    .sla-hint,
    .sla-group-label {
      margin: 0;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .sla-group-label {
      font-weight: 600;
      color: var(--text-primary);
    }

    .sla-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 12px;
    }

    .sla-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }

    .empty,
    .muted {
      color: var(--text-muted);
    }

    @media (max-width: 720px) {
      .sla-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TicketCategoriesSettingsComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  categories: TicketCategory[] = [];
  agents: TicketAssigneeOption[] = [];
  loading = true;
  agentsLoading = true;
  saving = false;
  busyId: number | null = null;
  readonly priorities: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  private readonly slaExpanded = new Set<number>();
  private readonly slaDrafts = new Map<number, CategorySlaDraft>();

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
    this.ticketService.listAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
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

  addCategory(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    this.saving = true;
    this.ticketService.createCategory({
      name: raw.name.trim(),
      code: raw.code.trim() || undefined,
      active: true
    }).subscribe({
      next: () => {
        this.saving = false;
        this.form.reset({ name: '', code: '' });
        this.snack(this.translate.instant('settings.ticketCategories.added'));
        this.load();
      },
      error: (error) => {
        this.saving = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  toggleSlaExpanded(categoryId: number): void {
    if (this.slaExpanded.has(categoryId)) {
      this.slaExpanded.delete(categoryId);
      return;
    }
    this.slaExpanded.add(categoryId);
    const category = this.categories.find((item) => item.id === categoryId);
    if (category) {
      this.syncSlaDraft(category);
    }
  }

  isSlaExpanded(categoryId: number): boolean {
    return this.slaExpanded.has(categoryId);
  }

  hasSlaOverrides(category: TicketCategory): boolean {
    return [
      category.firstResponseSlaUrgentHours,
      category.firstResponseSlaHighHours,
      category.firstResponseSlaMediumHours,
      category.firstResponseSlaLowHours,
      category.resolveSlaUrgentHours,
      category.resolveSlaHighHours,
      category.resolveSlaMediumHours,
      category.resolveSlaLowHours
    ].some((value) => value != null);
  }

  firstResponseField(priority: TicketPriority): keyof CategorySlaDraft {
    switch (priority) {
      case 'URGENT': return 'firstResponseSlaUrgentHours';
      case 'HIGH': return 'firstResponseSlaHighHours';
      case 'MEDIUM': return 'firstResponseSlaMediumHours';
      default: return 'firstResponseSlaLowHours';
    }
  }

  resolveField(priority: TicketPriority): keyof CategorySlaDraft {
    switch (priority) {
      case 'URGENT': return 'resolveSlaUrgentHours';
      case 'HIGH': return 'resolveSlaHighHours';
      case 'MEDIUM': return 'resolveSlaMediumHours';
      default: return 'resolveSlaLowHours';
    }
  }

  getSlaDraftValue(categoryId: number, field: keyof CategorySlaDraft): string {
    return this.getSlaDraft(categoryId)[field];
  }

  getSlaDraft(categoryId: number): CategorySlaDraft {
    const category = this.categories.find((item) => item.id === categoryId);
    if (!this.slaDrafts.has(categoryId) && category) {
      this.syncSlaDraft(category);
    }
    return this.slaDrafts.get(categoryId) ?? this.emptySlaDraft();
  }

  setSlaDraftField(categoryId: number, field: keyof CategorySlaDraft, value: string): void {
    const draft = { ...this.getSlaDraft(categoryId), [field]: value };
    this.slaDrafts.set(categoryId, draft);
  }

  resetSlaDraft(category: TicketCategory): void {
    this.syncSlaDraft(category);
  }

  saveSlaOverrides(category: TicketCategory): void {
    const draft = this.getSlaDraft(category.id);
    if (!this.isSlaDraftValid(draft)) {
      this.showError(this.translate.instant('settings.ticketCategories.slaOverridesInvalid'));
      return;
    }
    this.busyId = category.id;
    this.ticketService.updateCategory(category.id, {
      ...this.categoryPayload(category),
      ...this.slaPayloadFromDraft(draft)
    }).subscribe({
      next: (updated) => {
        const index = this.categories.findIndex((item) => item.id === category.id);
        if (index >= 0) {
          this.categories[index] = updated;
        }
        this.syncSlaDraft(updated);
        this.busyId = null;
        this.snack(this.translate.instant('settings.ticketCategories.slaOverridesSaved'));
      },
      error: (error) => {
        this.busyId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  toggleActive(category: TicketCategory, active: boolean): void {
    this.busyId = category.id;
    this.ticketService.updateCategory(category.id, {
      ...this.categoryPayload(category),
      active
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

  toggleEmailNotifications(category: TicketCategory, enabled: boolean): void {
    this.busyId = category.id;
    this.ticketService.updateCategory(category.id, {
      ...this.categoryPayload(category),
      emailNotificationsEnabled: enabled
    }).subscribe({
      next: () => {
        this.busyId = null;
        this.load();
        this.snack(this.translate.instant(
          enabled
            ? 'settings.ticketCategories.emailNotificationsOn'
            : 'settings.ticketCategories.emailNotificationsOff'
        ));
      },
      error: (error) => {
        this.busyId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  toggleSmsNotifications(category: TicketCategory, enabled: boolean): void {
    this.busyId = category.id;
    this.ticketService.updateCategory(category.id, {
      ...this.categoryPayload(category),
      smsNotificationsEnabled: enabled
    }).subscribe({
      next: () => {
        this.busyId = null;
        this.load();
        this.snack(this.translate.instant(
          enabled
            ? 'settings.ticketCategories.smsNotificationsOn'
            : 'settings.ticketCategories.smsNotificationsOff'
        ));
      },
      error: (error) => {
        this.busyId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  onAgentsChange(category: TicketCategory, agentIds: number[]): void {
    const next = [...(agentIds ?? [])].map(Number).filter((id) => !Number.isNaN(id)).sort((a, b) => a - b);
    const current = [...(category.agentIds ?? [])].sort((a, b) => a - b);
    if (next.length === current.length && next.every((id, i) => id === current[i])) {
      return;
    }
    this.busyId = category.id;
    this.ticketService.updateCategoryAgents(category.id, next).subscribe({
      next: (updated) => {
        category.agentIds = updated.agentIds ?? next;
        this.busyId = null;
        this.snack(this.translate.instant('settings.ticketCategories.skillsSaved'));
      },
      error: (error) => {
        this.busyId = null;
        this.load();
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  confirmRemove(category: TicketCategory): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'settings.ticketCategories.removeTitle',
        messageKey: 'settings.ticketCategories.removeMessage',
        messageParams: { name: category.name },
        confirmKey: 'common.delete',
        confirmColor: 'warn'
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busyId = category.id;
      this.ticketService.deleteCategory(category.id).subscribe({
        next: () => {
          this.busyId = null;
          this.snack(this.translate.instant('settings.ticketCategories.removed'));
          this.load();
        },
        error: (error) => {
          this.busyId = null;
          this.showError(this.apiError.resolve(error));
        }
      });
    });
  }

  private categoryPayload(category: TicketCategory): TicketCategoryRequest {
    return {
      name: category.name,
      code: category.code,
      active: category.active,
      emailNotificationsEnabled: category.emailNotificationsEnabled !== false,
      smsNotificationsEnabled: category.smsNotificationsEnabled !== false,
      sortOrder: category.sortOrder,
      firstResponseSlaUrgentHours: category.firstResponseSlaUrgentHours ?? null,
      firstResponseSlaHighHours: category.firstResponseSlaHighHours ?? null,
      firstResponseSlaMediumHours: category.firstResponseSlaMediumHours ?? null,
      firstResponseSlaLowHours: category.firstResponseSlaLowHours ?? null,
      resolveSlaUrgentHours: category.resolveSlaUrgentHours ?? null,
      resolveSlaHighHours: category.resolveSlaHighHours ?? null,
      resolveSlaMediumHours: category.resolveSlaMediumHours ?? null,
      resolveSlaLowHours: category.resolveSlaLowHours ?? null
    };
  }

  private syncSlaDraft(category: TicketCategory): void {
    this.slaDrafts.set(category.id, {
      firstResponseSlaUrgentHours: this.hoursToDraft(category.firstResponseSlaUrgentHours),
      firstResponseSlaHighHours: this.hoursToDraft(category.firstResponseSlaHighHours),
      firstResponseSlaMediumHours: this.hoursToDraft(category.firstResponseSlaMediumHours),
      firstResponseSlaLowHours: this.hoursToDraft(category.firstResponseSlaLowHours),
      resolveSlaUrgentHours: this.hoursToDraft(category.resolveSlaUrgentHours),
      resolveSlaHighHours: this.hoursToDraft(category.resolveSlaHighHours),
      resolveSlaMediumHours: this.hoursToDraft(category.resolveSlaMediumHours),
      resolveSlaLowHours: this.hoursToDraft(category.resolveSlaLowHours)
    });
  }

  private slaPayloadFromDraft(draft: CategorySlaDraft): Pick<
    TicketCategoryRequest,
    | 'firstResponseSlaUrgentHours'
    | 'firstResponseSlaHighHours'
    | 'firstResponseSlaMediumHours'
    | 'firstResponseSlaLowHours'
    | 'resolveSlaUrgentHours'
    | 'resolveSlaHighHours'
    | 'resolveSlaMediumHours'
    | 'resolveSlaLowHours'
  > {
    return {
      firstResponseSlaUrgentHours: this.draftToHours(draft.firstResponseSlaUrgentHours),
      firstResponseSlaHighHours: this.draftToHours(draft.firstResponseSlaHighHours),
      firstResponseSlaMediumHours: this.draftToHours(draft.firstResponseSlaMediumHours),
      firstResponseSlaLowHours: this.draftToHours(draft.firstResponseSlaLowHours),
      resolveSlaUrgentHours: this.draftToHours(draft.resolveSlaUrgentHours),
      resolveSlaHighHours: this.draftToHours(draft.resolveSlaHighHours),
      resolveSlaMediumHours: this.draftToHours(draft.resolveSlaMediumHours),
      resolveSlaLowHours: this.draftToHours(draft.resolveSlaLowHours)
    };
  }

  private hoursToDraft(value?: number | null): string {
    return value == null ? '' : String(value);
  }

  private draftToHours(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const hours = Number.parseInt(trimmed, 10);
    return Number.isFinite(hours) ? hours : null;
  }

  private isSlaDraftValid(draft: CategorySlaDraft): boolean {
    const values = Object.values(draft);
    return values.every((value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return true;
      }
      const hours = Number.parseInt(trimmed, 10);
      return Number.isFinite(hours) && hours >= 1 && hours <= 8760;
    });
  }

  private emptySlaDraft(): CategorySlaDraft {
    return {
      firstResponseSlaUrgentHours: '',
      firstResponseSlaHighHours: '',
      firstResponseSlaMediumHours: '',
      firstResponseSlaLowHours: '',
      resolveSlaUrgentHours: '',
      resolveSlaHighHours: '',
      resolveSlaMediumHours: '',
      resolveSlaLowHours: ''
    };
  }

  private snack(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, { duration: 6000, panelClass: ['error-snackbar'] });
  }
}
