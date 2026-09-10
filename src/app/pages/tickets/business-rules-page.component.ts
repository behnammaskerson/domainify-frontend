import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import {
  BusinessRuleService,
  BusinessRule,
  PagedBusinessRules,
  BusinessRuleTrigger
} from '../../services/business-rule.service';
import { ApiErrorService } from '../../services/api-error.service';
import { BusinessRuleFormDialogComponent } from '../../components/business-rule-form-dialog/business-rule-form-dialog.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-business-rules-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.businessRules.eyebrow' | translate"
        [title]="'tickets.businessRules.title' | translate"
        [subtitle]="'tickets.businessRules.subtitle' | translate">
        <div heroActions>
          <button mat-flat-button type="button" class="hero-cta" (click)="createRule()">
            <mat-icon>add</mat-icon>
            {{ 'tickets.businessRules.createRule' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <div class="panel-surface rules-card">
          @if (loading) {
            <p class="muted">{{ 'common.loading' | translate }}</p>
          } @else if (pagedRules && pagedRules.content.length > 0) {
            <div class="table-container">
              <table mat-table [dataSource]="pagedRules.content" class="rules-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.businessRules.name' | translate }}</th>
                  <td mat-cell *matCellDef="let rule">
                    <div class="rule-name">
                      <strong>{{ rule.name }}</strong>
                      @if (rule.description) {
                        <div class="rule-description">{{ rule.description }}</div>
                      }
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="trigger">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.businessRules.trigger' | translate }}</th>
                  <td mat-cell *matCellDef="let rule">
                    <span class="trigger-chip">{{ getTriggerLabel(rule.triggerEvent) | translate }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="priority">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.businessRules.priority' | translate }}</th>
                  <td mat-cell *matCellDef="let rule">{{ rule.priority }}</td>
                </ng-container>

                <ng-container matColumnDef="conditionsCount">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.businessRules.conditionsCount' | translate }}</th>
                  <td mat-cell *matCellDef="let rule">{{ rule.conditions?.length || 0 }}</td>
                </ng-container>

                <ng-container matColumnDef="actionsCount">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.businessRules.actionsCount' | translate }}</th>
                  <td mat-cell *matCellDef="let rule">{{ rule.actions?.length || 0 }}</td>
                </ng-container>

                <ng-container matColumnDef="executions">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.businessRules.executions' | translate }}</th>
                  <td mat-cell *matCellDef="let rule">{{ rule.executionCount || 0 }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.businessRules.status' | translate }}</th>
                  <td mat-cell *matCellDef="let rule">
                    <mat-slide-toggle
                      color="primary"
                      [checked]="rule.enabled"
                      [disabled]="togglingId === rule.id"
                      (change)="toggleRule(rule, $event.checked)">
                      {{ (rule.enabled ? 'tickets.businessRules.enabled' : 'tickets.businessRules.disabled') | translate }}
                    </mat-slide-toggle>
                  </td>
                </ng-container>

                <ng-container matColumnDef="menu">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let rule">
                    <button mat-icon-button
                            type="button"
                            [matTooltip]="'common.edit' | translate"
                            (click)="editRule(rule)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button
                            type="button"
                            class="danger"
                            [matTooltip]="'common.delete' | translate"
                            (click)="deleteRule(rule)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>

            <mat-paginator
              [length]="pagedRules.totalElements"
              [pageSize]="pagedRules.size"
              [pageIndex]="pagedRules.number"
              [pageSizeOptions]="[10, 20, 50, 100]"
              (page)="onPageChange($event)">
            </mat-paginator>
          } @else {
            <div class="empty-state">
              <mat-icon class="empty-icon" aria-hidden="true">rule</mat-icon>
              <h3>{{ 'tickets.businessRules.empty.title' | translate }}</h3>
              <p>{{ 'tickets.businessRules.empty.subtitle' | translate }}</p>
              <button mat-flat-button color="primary" type="button" class="empty-cta" (click)="createRule()">
                <mat-icon>add</mat-icon>
                {{ 'tickets.businessRules.createRule' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rules-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .muted {
      margin: 0;
      color: var(--text-muted);
    }

    .rules-table {
      width: 100%;
    }

    .rule-name strong {
      display: block;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .rule-description {
      color: var(--text-muted);
      font-size: 0.88rem;
      line-height: 1.35;
    }

    .trigger-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .danger {
      color: var(--error, #c62828);
    }

    .empty-state {
      text-align: center;
      padding: 56px 20px;
      color: var(--text-muted);
    }

    .empty-state .empty-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      margin-bottom: 12px;
      color: var(--accent);
      opacity: 0.7;
    }

    .empty-state .empty-cta mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-inline-end: 6px;
      margin-bottom: 0;
      opacity: 1;
      color: inherit;
    }

    .empty-state h3 {
      margin: 0 0 8px;
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    .empty-state p {
      margin: 0 auto 20px;
      max-width: 420px;
      line-height: 1.5;
    }

    .table-container {
      margin-bottom: 12px;
      overflow-x: auto;
    }

    @media (max-width: 900px) {
      .rules-table {
        min-width: 760px;
      }
    }
  `]
})
export class BusinessRulesPageComponent implements OnInit {
  private readonly businessRuleService = inject(BusinessRuleService);
  private readonly apiError = inject(ApiErrorService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  loading = true;
  togglingId: number | null = null;
  pagedRules: PagedBusinessRules | null = null;
  pageIndex = 0;
  pageSize = 20;

  displayedColumns = [
    'name',
    'trigger',
    'priority',
    'conditionsCount',
    'actionsCount',
    'executions',
    'status',
    'menu'
  ];

  ngOnInit(): void {
    this.loadRules();
  }

  private loadRules(page = this.pageIndex, size = this.pageSize): void {
    this.loading = true;
    this.pageIndex = page;
    this.pageSize = size;
    this.businessRuleService.getRules(page, size).subscribe({
      next: (rules) => {
        this.pagedRules = rules;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.pagedRules = null;
        this.showError(error);
      }
    });
  }

  createRule(): void {
    this.openForm(null);
  }

  editRule(rule: BusinessRule): void {
    this.openForm(rule);
  }

  private openForm(rule: BusinessRule | null): void {
    this.dialog
      .open(BusinessRuleFormDialogComponent, {
        width: '820px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        autoFocus: 'first-heading',
        data: rule
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.loadRules();
        }
      });
  }

  toggleRule(rule: BusinessRule, enabled: boolean): void {
    if (!rule.id) {
      return;
    }
    this.togglingId = rule.id;
    this.businessRuleService.toggleRule(rule.id, enabled).subscribe({
      next: (updated) => {
        rule.enabled = updated.enabled;
        this.togglingId = null;
        this.toast(
          enabled ? 'tickets.businessRules.enabledToast' : 'tickets.businessRules.disabledToast'
        );
      },
      error: (error) => {
        this.togglingId = null;
        rule.enabled = !enabled;
        this.showError(error);
      }
    });
  }

  deleteRule(rule: BusinessRule): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          titleKey: 'tickets.businessRules.deleteConfirm.title',
          messageKey: 'tickets.businessRules.deleteConfirm.message',
          messageParams: { name: rule.name },
          confirmKey: 'common.delete',
          confirmColor: 'warn' as const
        }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed || !rule.id) {
          return;
        }
        this.businessRuleService.deleteRule(rule.id).subscribe({
          next: () => {
            this.toast('tickets.businessRules.deleted');
            this.loadRules();
          },
          error: (error) => this.showError(error)
        });
      });
  }

  onPageChange(event: PageEvent): void {
    this.loadRules(event.pageIndex, event.pageSize);
  }

  getTriggerLabel(trigger: BusinessRuleTrigger): string {
    const map: Record<BusinessRuleTrigger, string> = {
      ON_CREATE: 'tickets.businessRules.triggers.onCreate',
      ON_UPDATE: 'tickets.businessRules.triggers.onUpdate',
      ON_REPLY: 'tickets.businessRules.triggers.onReply',
      ON_SCHEDULE: 'tickets.businessRules.triggers.onSchedule'
    };
    return map[trigger] || trigger;
  }

  private toast(key: string): void {
    this.snackBar.open(this.translate.instant(key), undefined, { duration: 3000 });
  }

  private showError(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
  }
}
