import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { LocaleCurrencyPipe, LocaleDatePipe, LocaleNumberPipe } from '../../pipes/locale-format.pipe';

@Component({
  selector: 'app-domains',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe,
    LocaleDatePipe,
    LocaleNumberPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'domains.portfolio' | translate"
        [title]="'domains.title' | translate"
        [subtitle]="'dashboard.subtitle' | translate">
        <div heroActions>
          <button mat-flat-button type="button" class="hero-cta">
            <mat-icon>add</mat-icon>
            {{ 'domains.addNew' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <div class="filter-bar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [placeholder]="'domains.search' | translate">
          </mat-form-field>
          <div class="filter-tabs">
            @for (status of statusFilters; track status.value) {
              <button type="button"
                      class="filter-tab"
                      [class.active]="activeFilter === status.value"
                      (click)="activeFilter = status.value">
                {{ ('domains.filters.' + status.value) | translate }}
                <span class="count">{{ status.count | localeNumber }}</span>
              </button>
            }
          </div>
        </div>

        <div class="panel-surface table-wrap">
          <table mat-table [dataSource]="filteredDomains" class="domains-table">
            <ng-container matColumnDef="rowNumber">
              <th mat-header-cell *matHeaderCellDef class="col-row-num">{{ 'common.rowNumber' | translate }}</th>
              <td mat-cell *matCellDef="let domain; let i = index" class="col-row-num">{{ i + 1 }}</td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ 'domains.table.name' | translate }}</th>
              <td mat-cell *matCellDef="let domain">
                <div class="domain-cell">
                  <div>
                    <div class="domain-name">{{ domain.name }}</div>
                    <div class="domain-category">{{ ('domains.categories.' + domain.categoryKey) | translate }}</div>
                  </div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ 'domains.table.status' | translate }}</th>
              <td mat-cell *matCellDef="let domain">
                <span class="status-pill" [class]="domain.status">
                  {{ 'domains.status.' + domain.status | translate }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>{{ 'domains.table.price' | translate }}</th>
              <td mat-cell *matCellDef="let domain">
                <span class="price">{{ domain.price | localeCurrency }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="expires">
              <th mat-header-cell *matHeaderCellDef>{{ 'domains.table.expires' | translate }}</th>
              <td mat-cell *matCellDef="let domain">
                <span class="expires">{{ domain.expires | localeDate:{ month: 'short', year: 'numeric' } }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let domain">
                <button mat-icon-button
                        type="button"
                        [matMenuTriggerFor]="actionMenu"
                        [attr.aria-label]="'a11y.domainActions' | translate:{ domain: domain.name }"
                        [matTooltip]="'a11y.actions' | translate">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #actionMenu="matMenu">
                  <button mat-menu-item type="button">
                    <mat-icon>edit</mat-icon>
                    {{ 'common.edit' | translate }}
                  </button>
                  <button mat-menu-item type="button">
                    <mat-icon>visibility</mat-icon>
                    {{ 'common.view' | translate }}
                  </button>
                  <button mat-menu-item type="button" class="delete-item" (click)="onDelete(domain)">
                    <mat-icon>delete</mat-icon>
                    {{ 'common.delete' | translate }}
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-field {
      width: min(100%, 280px);
    }

    .search-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .table-wrap {
      padding: 0;
      overflow: hidden;
    }

    .domains-table {
      width: 100%;
    }

    .col-row-num {
      width: 48px;
      max-width: 48px;
      text-align: center;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .mat-mdc-header-cell {
      font-weight: 700;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-color);
      background: transparent;
    }

    .mat-mdc-cell {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-light);
      color: var(--text-primary);
    }

    .mat-mdc-row:last-child .mat-mdc-cell {
      border-bottom: none;
    }

    .domain-name {
      font-weight: 700;
      font-size: 0.92rem;
      color: var(--text-primary);
    }

    .domain-category {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .price {
      font-weight: 700;
    }

    .expires {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    .delete-item {
      color: var(--danger) !important;
    }
  `]
})
export class DomainsComponent {
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);

  displayedColumns = ['rowNumber', 'name', 'status', 'price', 'expires', 'actions'];
  activeFilter = 'all';

  statusFilters = [
    { value: 'all', count: 128 },
    { value: 'active', count: 89 },
    { value: 'pending', count: 23 },
    { value: 'sold', count: 12 },
    { value: 'expired', count: 4 }
  ];

  domains = [
    { name: 'crypto.com', categoryKey: 'technology', status: 'active', price: 250000, expires: '2025-12-01' },
    { name: 'ai-startup.io', categoryKey: 'ai', status: 'active', price: 45000, expires: '2026-03-15' },
    { name: 'cloud-saas.com', categoryKey: 'saas', status: 'pending', price: 28000, expires: '2025-06-20' },
    { name: 'blockchain.dev', categoryKey: 'blockchain', status: 'sold', price: 15500, expires: '2026-01-10' },
    { name: 'web3.xyz', categoryKey: 'web3', status: 'active', price: 12000, expires: '2025-09-30' },
    { name: 'metaverse.app', categoryKey: 'vr', status: 'pending', price: 8500, expires: '2025-11-05' },
    { name: 'quantum.tech', categoryKey: 'quantum', status: 'active', price: 95000, expires: '2026-02-28' },
    { name: 'green-energy.org', categoryKey: 'energy', status: 'expired', price: 5200, expires: '2024-08-01' }
  ];

  get filteredDomains() {
    if (this.activeFilter === 'all') return this.domains;
    return this.domains.filter(d => d.status === this.activeFilter);
  }

  onDelete(domain: { name: string }): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      restoreFocus: true,
      data: {
        titleKey: 'domains.deleteTitle',
        messageKey: 'domains.deleteConfirm',
        messageParams: { domain: domain.name },
        confirmKey: 'common.delete',
        confirmColor: 'warn'
      }
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      const index = this.domains.indexOf(domain as (typeof this.domains)[number]);
      if (index > -1) {
        this.domains.splice(index, 1);
      }
    });
  }
}
