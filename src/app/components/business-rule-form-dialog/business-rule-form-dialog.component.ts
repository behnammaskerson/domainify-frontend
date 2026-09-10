import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  BusinessRule,
  BusinessRuleAction,
  BusinessRuleActionType,
  BusinessRuleCondition,
  BusinessRuleOperator,
  BusinessRuleService,
  BusinessRuleTrigger
} from '../../services/business-rule.service';
import { ApiErrorService } from '../../services/api-error.service';

@Component({
  selector: 'app-business-rule-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (isEditing ? 'tickets.businessRules.editRule' : 'tickets.businessRules.createRule') | translate }}
    </h2>

    <form [formGroup]="form" (ngSubmit)="onSave()">
      <mat-dialog-content>
        <section class="form-section">
          <h3>{{ 'tickets.businessRules.basicInfo' | translate }}</h3>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'tickets.businessRules.name' | translate }}</mat-label>
            <input matInput formControlName="name" maxlength="100" required>
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <mat-error>{{ 'tickets.businessRules.validation.nameRequired' | translate }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'tickets.businessRules.description' | translate }}</mat-label>
            <textarea matInput formControlName="description" rows="2" maxlength="500"></textarea>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>{{ 'tickets.businessRules.trigger' | translate }}</mat-label>
              <mat-select formControlName="triggerEvent" required>
                @for (trigger of triggers; track trigger) {
                  <mat-option [value]="trigger">
                    {{ getTriggerLabel(trigger) | translate }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ 'tickets.businessRules.priority' | translate }}</mat-label>
              <input matInput type="number" formControlName="priority" min="1" max="1000" required>
              <mat-hint>{{ 'tickets.businessRules.priorityHint' | translate }}</mat-hint>
            </mat-form-field>

            <mat-slide-toggle formControlName="enabled" color="primary">
              {{ 'tickets.businessRules.enabled' | translate }}
            </mat-slide-toggle>
          </div>
        </section>

        <section class="form-section">
          <h3>{{ 'tickets.businessRules.conditionsSection.title' | translate }}</h3>
          <p class="hint">{{ 'tickets.businessRules.conditionsSection.hint' | translate }}</p>

          <div formArrayName="conditions" class="stack">
            @for (conditionCtrl of conditionsArray.controls; track $index) {
              <div class="row-card" [formGroupName]="$index">
                <div class="row-head">
                  <span>{{ 'tickets.businessRules.conditionsSection.condition' | translate }} {{ $index + 1 }}</span>
                  <button type="button"
                          mat-icon-button
                          color="warn"
                          [disabled]="conditionsArray.length <= 1"
                          (click)="removeCondition($index)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>

                <div class="row-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'tickets.businessRules.conditionsSection.field' | translate }}</mat-label>
                    <mat-select formControlName="field" (selectionChange)="onFieldChange($index)">
                      @for (field of conditionFields; track field.field) {
                        <mat-option [value]="field.field">{{ field.labelKey | translate }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>{{ 'tickets.businessRules.conditionsSection.operator' | translate }}</mat-label>
                    <mat-select formControlName="operator">
                      @for (op of getOperatorsForCondition($index); track op.operator) {
                        <mat-option [value]="op.operator">{{ op.labelKey | translate }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  @if (!isEmptyOperator(conditionCtrl.get('operator')?.value)) {
                    <mat-form-field appearance="outline">
                      <mat-label>{{ 'tickets.businessRules.conditionsSection.value' | translate }}</mat-label>
                      @if (isSelectField(conditionCtrl.get('field')?.value)) {
                        <mat-select formControlName="value">
                          @for (opt of getSelectOptions(conditionCtrl.get('field')?.value); track opt.value) {
                            <mat-option [value]="opt.value">{{ opt.labelKey | translate }}</mat-option>
                          }
                        </mat-select>
                      } @else {
                        <input matInput formControlName="value">
                      }
                    </mat-form-field>
                  }
                </div>
              </div>
            }
          </div>

          <button type="button" mat-stroked-button (click)="addCondition()">
            <mat-icon>add</mat-icon>
            {{ 'tickets.businessRules.conditionsSection.addCondition' | translate }}
          </button>
        </section>

        <section class="form-section last">
          <h3>{{ 'tickets.businessRules.actionsSection.title' | translate }}</h3>
          <p class="hint">{{ 'tickets.businessRules.actionsSection.hint' | translate }}</p>

          <div formArrayName="actions" class="stack">
            @for (actionCtrl of actionsArray.controls; track $index) {
              <div class="row-card" [formGroupName]="$index">
                <div class="row-head">
                  <span>{{ 'tickets.businessRules.actionsSection.action' | translate }} {{ $index + 1 }}</span>
                  <button type="button"
                          mat-icon-button
                          color="warn"
                          [disabled]="actionsArray.length <= 1"
                          (click)="removeAction($index)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'tickets.businessRules.actionsSection.type' | translate }}</mat-label>
                  <mat-select formControlName="actionType" (selectionChange)="onActionTypeChange($index)">
                    @for (actionType of actionTypes; track actionType.type) {
                      <mat-option [value]="actionType.type">{{ actionType.labelKey | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <div formGroupName="parameters" class="params">
                  @switch (actionCtrl.get('actionType')?.value) {
                    @case ('SET_STATUS') {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>{{ 'tickets.businessRules.actionsSection.status' | translate }}</mat-label>
                        <mat-select formControlName="status" required>
                          @for (opt of statusOptions; track opt.value) {
                            <mat-option [value]="opt.value">{{ opt.labelKey | translate }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    }
                    @case ('SET_PRIORITY') {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>{{ 'tickets.businessRules.actionsSection.priority' | translate }}</mat-label>
                        <mat-select formControlName="priority" required>
                          @for (opt of priorityOptions; track opt.value) {
                            <mat-option [value]="opt.value">{{ opt.labelKey | translate }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    }
                    @case ('ASSIGN_TO_USER') {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>{{ 'tickets.businessRules.actionsSection.assigneeEmail' | translate }}</mat-label>
                        <input matInput type="email" formControlName="assigneeEmail" required>
                      </mat-form-field>
                    }
                    @case ('ADD_TAGS') {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>{{ 'tickets.businessRules.actionsSection.tags' | translate }}</mat-label>
                        <input matInput formControlName="tags"
                               [placeholder]="'tickets.businessRules.actionsSection.tagsPlaceholder' | translate"
                               required>
                        <mat-hint>{{ 'tickets.businessRules.actionsSection.tagsHint' | translate }}</mat-hint>
                      </mat-form-field>
                    }
                    @case ('ADD_INTERNAL_NOTE') {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>{{ 'tickets.businessRules.actionsSection.note' | translate }}</mat-label>
                        <textarea matInput formControlName="note" rows="3" required></textarea>
                      </mat-form-field>
                    }
                    @case ('SET_DUE_DATE') {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>{{ 'tickets.businessRules.actionsSection.daysFromNow' | translate }}</mat-label>
                        <input matInput type="number" formControlName="daysFromNow" min="1" required>
                        <mat-hint>{{ 'tickets.businessRules.actionsSection.daysFromNowHint' | translate }}</mat-hint>
                      </mat-form-field>
                    }
                  }
                </div>
              </div>
            }
          </div>

          <button type="button" mat-stroked-button (click)="addAction()">
            <mat-icon>add</mat-icon>
            {{ 'tickets.businessRules.actionsSection.addAction' | translate }}
          </button>
        </section>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button type="button" mat-button mat-dialog-close [disabled]="saving">
          {{ 'common.cancel' | translate }}
        </button>
        <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid || saving">
          {{ (isEditing ? 'common.save' : 'tickets.businessRules.createRule') | translate }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    mat-dialog-content {
      max-height: min(70vh, 720px);
      overflow-y: auto;
      min-width: min(760px, 86vw);
    }

    .form-section {
      margin-bottom: 22px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .form-section.last {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .form-section h3 {
      margin: 0 0 8px;
      font-size: 1rem;
      color: var(--text-primary);
    }

    .hint {
      margin: 0 0 14px;
      color: var(--text-muted);
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .full-width { width: 100%; }

    .form-row {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(120px, 0.7fr) auto;
      gap: 12px;
      align-items: center;
    }

    .stack { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }

    .row-card {
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-secondary);
    }

    .row-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .row-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .params { display: grid; gap: 8px; }

    @media (max-width: 760px) {
      mat-dialog-content { min-width: auto; }
      .form-row, .row-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class BusinessRuleFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly businessRuleService = inject(BusinessRuleService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialogRef = inject(MatDialogRef<BusinessRuleFormDialogComponent, boolean>);

  readonly isEditing: boolean;
  saving = false;

  readonly triggers: BusinessRuleTrigger[] = ['ON_CREATE', 'ON_UPDATE', 'ON_REPLY', 'ON_SCHEDULE'];
  readonly conditionFields = this.businessRuleService.getConditionFields();
  readonly actionTypes = this.businessRuleService.getActionTypes();
  readonly statusOptions = [
    { value: 'NEW', labelKey: 'tickets.statuses.NEW' },
    { value: 'OPEN', labelKey: 'tickets.statuses.OPEN' },
    { value: 'PENDING', labelKey: 'tickets.statuses.PENDING' },
    { value: 'ON_HOLD', labelKey: 'tickets.statuses.ON_HOLD' },
    { value: 'RESOLVED', labelKey: 'tickets.statuses.RESOLVED' },
    { value: 'CLOSED', labelKey: 'tickets.statuses.CLOSED' }
  ];
  readonly priorityOptions = [
    { value: 'LOW', labelKey: 'tickets.priorities.LOW' },
    { value: 'MEDIUM', labelKey: 'tickets.priorities.MEDIUM' },
    { value: 'HIGH', labelKey: 'tickets.priorities.HIGH' },
    { value: 'URGENT', labelKey: 'tickets.priorities.URGENT' }
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    enabled: [true],
    triggerEvent: this.fb.nonNullable.control<BusinessRuleTrigger>('ON_CREATE', Validators.required),
    priority: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
    conditions: this.fb.array<FormGroup>([]),
    actions: this.fb.array<FormGroup>([])
  });

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: BusinessRule | null) {
    this.isEditing = !!data?.id;
  }

  ngOnInit(): void {
    if (this.data) {
      this.populateForm(this.data);
    } else {
      this.addCondition();
      this.addAction();
    }
  }

  get conditionsArray(): FormArray<FormGroup> {
    return this.form.controls.conditions;
  }

  get actionsArray(): FormArray<FormGroup> {
    return this.form.controls.actions;
  }

  addCondition(condition?: BusinessRuleCondition): void {
    this.conditionsArray.push(this.createConditionGroup(condition));
  }

  removeCondition(index: number): void {
    if (this.conditionsArray.length > 1) {
      this.conditionsArray.removeAt(index);
    }
  }

  addAction(action?: BusinessRuleAction): void {
    this.actionsArray.push(this.createActionGroup(action));
  }

  removeAction(index: number): void {
    if (this.actionsArray.length > 1) {
      this.actionsArray.removeAt(index);
    }
  }

  onFieldChange(index: number): void {
    const group = this.conditionsArray.at(index);
    const field = group.get('field')?.value as string;
    const fieldMeta = this.conditionFields.find((f) => f.field === field);
    const ops = this.businessRuleService.getOperatorsForField(fieldMeta?.type || 'text');
    group.patchValue({
      operator: ops[0]?.operator || 'EQUALS',
      value: ''
    });
  }

  onActionTypeChange(index: number): void {
    const group = this.actionsArray.at(index);
    const actionType = group.get('actionType')?.value as BusinessRuleActionType;
    group.setControl('parameters', this.createParametersGroup(actionType));
  }

  getOperatorsForCondition(index: number): { operator: BusinessRuleOperator; labelKey: string }[] {
    const field = this.conditionsArray.at(index).get('field')?.value as string;
    const fieldMeta = this.conditionFields.find((f) => f.field === field);
    return this.businessRuleService.getOperatorsForField(fieldMeta?.type || 'text');
  }

  isEmptyOperator(operator: BusinessRuleOperator | null | undefined): boolean {
    return operator === 'IS_EMPTY' || operator === 'IS_NOT_EMPTY';
  }

  isSelectField(field: string | null | undefined): boolean {
    return field === 'status' || field === 'priority';
  }

  getSelectOptions(field: string | null | undefined): { value: string; labelKey: string }[] {
    if (field === 'status') {
      return this.statusOptions;
    }
    if (field === 'priority') {
      return this.priorityOptions;
    }
    return [];
  }

  getTriggerLabel(trigger: BusinessRuleTrigger): string {
    const map: Record<BusinessRuleTrigger, string> = {
      ON_CREATE: 'tickets.businessRules.triggers.onCreate',
      ON_UPDATE: 'tickets.businessRules.triggers.onUpdate',
      ON_REPLY: 'tickets.businessRules.triggers.onReply',
      ON_SCHEDULE: 'tickets.businessRules.triggers.onSchedule'
    };
    return map[trigger];
  }

  onSave(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const raw = this.form.getRawValue();
    const rule: BusinessRule = {
      id: this.data?.id,
      name: raw.name.trim(),
      description: raw.description?.trim() || undefined,
      enabled: raw.enabled,
      triggerEvent: raw.triggerEvent,
      priority: Number(raw.priority),
      conditions: raw.conditions.map((c: any) => ({
        field: c.field,
        operator: c.operator,
        value: this.isEmptyOperator(c.operator)
          ? null
          : this.normalizeConditionValue(c.field, c.value)
      })),
      actions: raw.actions.map((a: any) => ({
        actionType: a.actionType,
        parameters: this.normalizeActionParameters(a.actionType, a.parameters || {})
      }))
    };

    const request$ = this.isEditing && rule.id
      ? this.businessRuleService.updateRule(rule.id, rule)
      : this.businessRuleService.createRule(rule);

    request$.subscribe({
      next: () => {
        this.snackBar.open(
          this.translate.instant(this.isEditing ? 'tickets.businessRules.updated' : 'tickets.businessRules.created'),
          undefined,
          { duration: 3000 }
        );
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.saving = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
      }
    });
  }

  private populateForm(rule: BusinessRule): void {
    this.form.patchValue({
      name: rule.name,
      description: rule.description || '',
      enabled: rule.enabled !== false,
      triggerEvent: rule.triggerEvent || 'ON_CREATE',
      priority: rule.priority ?? 100
    });

    this.conditionsArray.clear();
    (rule.conditions?.length ? rule.conditions : [undefined]).forEach((c) => this.addCondition(c));

    this.actionsArray.clear();
    (rule.actions?.length ? rule.actions : [undefined]).forEach((a) => this.addAction(a));
  }

  private createConditionGroup(condition?: BusinessRuleCondition): FormGroup {
    return this.fb.group({
      field: [condition?.field || 'priority', Validators.required],
      operator: [condition?.operator || 'EQUALS', Validators.required],
      value: [condition?.value ?? '']
    });
  }

  private createActionGroup(action?: BusinessRuleAction): FormGroup {
    const actionType = action?.actionType || 'SET_PRIORITY';
    return this.fb.group({
      actionType: [actionType, Validators.required],
      parameters: this.createParametersGroup(actionType, action?.parameters)
    });
  }

  private createParametersGroup(
    actionType: BusinessRuleActionType,
    params?: Record<string, unknown>
  ): FormGroup {
    switch (actionType) {
      case 'SET_STATUS':
        return this.fb.group({
          status: [String(params?.['status'] ?? 'OPEN'), Validators.required]
        });
      case 'SET_PRIORITY':
        return this.fb.group({
          priority: [String(params?.['priority'] ?? 'HIGH'), Validators.required]
        });
      case 'ASSIGN_TO_USER':
        return this.fb.group({
          assigneeEmail: [String(params?.['assigneeEmail'] ?? ''), [Validators.required, Validators.email]]
        });
      case 'ADD_TAGS': {
        const tags = Array.isArray(params?.['tags'])
          ? (params?.['tags'] as string[]).join(', ')
          : String(params?.['tags'] ?? '');
        return this.fb.group({
          tags: [tags, Validators.required]
        });
      }
      case 'ADD_INTERNAL_NOTE':
        return this.fb.group({
          note: [String(params?.['note'] ?? ''), Validators.required]
        });
      case 'SET_DUE_DATE':
        return this.fb.group({
          daysFromNow: [Number(params?.['daysFromNow'] ?? 7), [Validators.required, Validators.min(1)]]
        });
      default:
        return this.fb.group({});
    }
  }

  private normalizeConditionValue(field: string, value: unknown): unknown {
    if (field === 'age') {
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }
    return typeof value === 'string' ? value.trim() : value;
  }

  private normalizeActionParameters(
    actionType: BusinessRuleActionType,
    params: Record<string, unknown>
  ): Record<string, unknown> {
    if (actionType === 'ADD_TAGS') {
      const raw = String(params['tags'] ?? '');
      return {
        tags: raw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      };
    }
    if (actionType === 'SET_DUE_DATE') {
      return { daysFromNow: Number(params['daysFromNow']) };
    }
    return { ...params };
  }
}
