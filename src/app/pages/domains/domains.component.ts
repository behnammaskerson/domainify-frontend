import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { DomainDialogComponent } from '../../components/domain-dialog/domain-dialog.component';
import { LocaleCurrencyPipe, LocaleDatePipe, LocaleDigitsPipe, LocaleNumberPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import {
  DomainItem,
  DomainStatus,
  DomainsService
} from '../../services/domains.service';

type StatusFilter = 'all' | 'active' | 'pending' | 'sold' | 'expired';

@Component({
  selector: 'app-domains',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe,
    LocaleDatePipe,
    LocaleDigitsPipe,
    LocaleNumberPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'domains.portfolio' | translate"
        [title]="'domains.title' | translate"
        [subtitle]="'domains.subtitle' | translate">
        <div heroActions>
          <button mat-stroked-button type="button" (click)="reload()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            {{ 'domains.refresh' | translate }}
          </button>
          <button mat-flat-button type="button" class="hero-cta" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            {{ 'domains.addNew' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <div class="filter-bar">
          <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput
                   [(ngModel)]="searchInput"
                   (ngModelChange)="onSearchInput($event)"
                   [placeholder]="'domains.search' | translate">
            @if (searchInput) {
              <button matSuffix mat-icon-button type="button" (click)="clearSearch()"
                      [attr.aria-label]="'domains.clearSearch' | translate">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>
          <div class="filter-tabs" role="tablist" [attr.aria-label]="'domains.filtersLabel' | translate">
            @for (status of statusFilters; track status.value) {
              <button type="button"
                      class="filter-tab"
                      role="tab"
                      [class.active]="activeFilter === status.value"
                      [attr.aria-selected]="activeFilter === status.value"
                      (click)="setStatusFilter(status.value)">
                {{ ('domains.filters.' + status.value) | translate }}
                <span class="count">{{ status.count | localeNumber }}</span>
              </button>
            }
          </div>
        </div>

        <div class="panel-surface table-wrap">
          @if (loading && domains.length === 0) {
            <p class="muted state-msg">{{ 'domains.loading' | translate }}</p>
          } @else if (!loading && domains.length === 0) {
            <div class="empty-state">
              <mat-icon>language</mat-icon>
              <p>{{ 'domains.empty' | translate }}</p>
              <button mat-flat-button color="primary" type="button" (click)="openCreate()">
                {{ 'domains.addNew' | translate }}
              </button>
            </div>
          } @else {
            <div class="table-scroll">
              <table mat-table
                     [dataSource]="domains"
                     class="domains-table"
                     matSort
                     [matSortActive]="sortActive"
                     [matSortDirection]="sortDirection"
                     matSortDisableClear
                     (matSortChange)="onSortChange($event)">
                <ng-container matColumnDef="rowNumber">
                  <th mat-header-cell *matHeaderCellDef class="col-row-num">{{ 'common.rowNumber' | translate }}</th>
                  <td mat-cell *matCellDef="let domain; let i = index" class="col-row-num">
                    {{ (pageIndex * pageSize + i + 1) | localeDigits }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header="name">{{ 'domains.table.name' | translate }}</th>
                  <td mat-cell *matCellDef="let domain">
                    <div class="domain-cell">
                      <div>
                        <div class="domain-name">{{ domain.name }}</div>
                        <div class="domain-category">{{ domain.categoryName || '—' }}</div>
                      </div>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header="status">{{ 'domains.table.status' | translate }}</th>
                  <td mat-cell *matCellDef="let domain">
                    <span class="status-pill" [class]="(domain.status || '').toLowerCase()">
                      {{ 'domains.status.' + (domain.status || '').toLowerCase() | translate }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="price">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header="price">{{ 'domains.table.price' | translate }}</th>
                  <td mat-cell *matCellDef="let domain">
                    <span class="price">{{ domain.price | localeCurrency }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="expires">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header="expiresAt">{{ 'domains.table.expires' | translate }}</th>
                  <td mat-cell *matCellDef="let domain">
                    @if (domain.expiresAt) {
                      <span class="expires">{{ domain.expiresAt | localeDate:{ month: 'short', year: 'numeric', day: 'numeric' } }}</span>
                    } @else {
                      <span class="expires">—</span>
                    }
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
                      <button mat-menu-item type="button" (click)="openView(domain)">
                        <mat-icon>visibility</mat-icon>
                        {{ 'common.view' | translate }}
                      </button>
                      <button mat-menu-item type="button" (click)="openEdit(domain)">
                        <mat-icon>edit</mat-icon>
                        {{ 'common.edit' | translate }}
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

            <mat-paginator
              [length]="totalElements"
              [pageIndex]="pageIndex"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 25, 50]"
              [disabled]="loading"
              (page)="onPage($event)"
              [attr.aria-label]="'domains.pagination' | translate">
            </mat-paginator>
          }
        </div>

        @if (totalElements > 0) {
          <p class="result-count muted">
            {{ 'domains.resultCount' | translate:{ count: (totalElements | localeDigits) } }}
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    .search-field {
      width: min(100%, 280px);
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filter-tab {
      border: 1px solid var(--border-color);
      background: transparent;
      color: var(--text-secondary);
      border-radius: 999px;
      padding: 6px 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: inherit;
    }

    .filter-tab.active {
      border-color: var(--primary-color, var(--primary));
      color: var(--text-primary);
      background: color-mix(in srgb, var(--primary-color, var(--primary)) 12%, transparent);
    }

    .filter-tab .count {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .table-wrap {
      padding: 0;
      overflow: hidden;
    }

    .table-scroll {
      overflow-x: auto;
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

    .muted { color: var(--text-muted); }
    .state-msg { padding: 24px 20px; margin: 0; }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 40px 20px;
      text-align: center;
      color: var(--text-muted);
    }
    .result-count { margin: 10px 4px 0; font-size: 0.85rem; }

    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: color-mix(in srgb, #64748b 12%, transparent);
    }
    .status-pill.active { background: color-mix(in srgb, #16a34a 14%, transparent); }
    .status-pill.pending { background: color-mix(in srgb, #d97706 14%, transparent); }
    .status-pill.sold { background: color-mix(in srgb, #2563eb 14%, transparent); }
    .status-pill.expired { background: color-mix(in srgb, #dc2626 12%, transparent); }
  `]
})
export class DomainsComponent implements OnInit, OnDestroy {
  private readonly domainsService = inject(DomainsService);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);

  displayedColumns = ['rowNumber', 'name', 'status', 'price', 'expires', 'actions'];
  activeFilter: StatusFilter = 'all';
  domains: DomainItem[] = [];
  loading = false;
  searchInput = '';
  searchQuery = '';
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;
  sortActive = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  statusFilters: { value: StatusFilter; count: number }[] = [
    { value: 'all', count: 0 },
    { value: 'active', count: 0 },
    { value: 'pending', count: 0 },
    { value: 'sold', count: 0 },
    { value: 'expired', count: 0 }
  ];

  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  private loadSub?: Subscription;

  ngOnInit(): void {
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((value) => {
      this.searchQuery = value.trim();
      this.pageIndex = 0;
      this.load();
    });
    this.loadCounts();
    this.load();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.search$.next(value ?? '');
  }

  clearSearch(): void {
    this.searchInput = '';
    this.search$.next('');
  }

  setStatusFilter(value: StatusFilter): void {
    if (this.activeFilter === value) {
      return;
    }
    this.activeFilter = value;
    this.pageIndex = 0;
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  onSortChange(sort: Sort): void {
    this.sortActive = sort.active || 'name';
    this.sortDirection = sort.direction === 'desc' ? 'desc' : 'asc';
    this.pageIndex = 0;
    this.load();
  }

  reload(): void {
    this.loadCounts();
    this.load();
  }

  openCreate(): void {
    const ref = this.dialog.open(DomainDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: { mode: 'create' }
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) {
        return;
      }
      this.domainsService.create(payload).subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('domains.created'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (error) => this.showError(error)
      });
    });
  }

  openEdit(domain: DomainItem): void {
    const ref = this.dialog.open(DomainDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: { mode: 'edit', domain }
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload || !domain.id) {
        return;
      }
      this.domainsService.update(domain.id, payload).subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('domains.updated'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (error) => this.showError(error)
      });
    });
  }

  openView(domain: DomainItem): void {
    this.dialog.open(DomainDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: { mode: 'view', domain }
    });
  }

  onDelete(domain: DomainItem): void {
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
      if (!confirmed || !domain.id) {
        return;
      }
      this.domainsService.delete(domain.id).subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('domains.deleted'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (error) => this.showError(error)
      });
    });
  }

  private load(): void {
    this.loading = true;
    this.loadSub?.unsubscribe();
    const status = this.toApiStatus(this.activeFilter);
    this.loadSub = this.domainsService.list({
      q: this.searchQuery || undefined,
      status,
      page: this.pageIndex,
      size: this.pageSize,
      sort: `${this.sortActive},${this.sortDirection}`
    }).subscribe({
      next: (page) => {
        this.domains = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
        this.pageIndex = page.number ?? this.pageIndex;
        this.pageSize = page.size ?? this.pageSize;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.domains = [];
        this.totalElements = 0;
        this.showError(error);
      }
    });
  }

  private loadCounts(): void {
    this.domainsService.statusCounts().subscribe({
      next: (counts) => {
        const byStatus = counts.byStatus ?? {};
        this.statusFilters = [
          { value: 'all', count: counts.all ?? 0 },
          { value: 'active', count: byStatus['active'] ?? 0 },
          { value: 'pending', count: byStatus['pending'] ?? 0 },
          { value: 'sold', count: byStatus['sold'] ?? 0 },
          { value: 'expired', count: byStatus['expired'] ?? 0 }
        ];
      },
      error: () => {
        // keep previous counts
      }
    });
  }

  private toApiStatus(filter: StatusFilter): DomainStatus | undefined {
    if (filter === 'all') {
      return undefined;
    }
    return filter.toUpperCase() as DomainStatus;
  }

  private showError(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
