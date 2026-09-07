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
import { DomainOwnershipDialogComponent } from '../../components/domain-ownership-dialog/domain-ownership-dialog.component';
import { DomainWhoisDialogComponent } from '../../components/domain-whois-dialog/domain-whois-dialog.component';
import { ListingDialogComponent } from '../../components/listing-dialog/listing-dialog.component';
import { LocaleCurrencyPipe, LocaleDatePipe, LocaleDigitsPipe, LocaleNumberPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import {
  DomainItem,
  DomainStatus,
  DomainsService
} from '../../services/domains.service';
import { ListingsService } from '../../services/listings.service';

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
          <div class="table-scroll">
            <table mat-table
                   [dataSource]="domains"
                   class="mat-mdc-table domains-table"
                   matSort
                   [matSortActive]="sortActive"
                   [matSortDirection]="sortDirection"
                   matSortDisableClear
                   [attr.aria-label]="'domains.title' | translate"
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
                    <span class="cell-strong" dir="ltr">{{ domain.name }}</span>
                    <span class="cell-muted">{{ domain.categoryName || '—' }}</span>
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

              <ng-container matColumnDef="ownership">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="ownershipStatus">{{ 'domains.table.ownership' | translate }}</th>
                <td mat-cell *matCellDef="let domain">
                  <span class="method-pill ownership-pill" [class]="(domain.ownershipStatus || 'UNVERIFIED').toLowerCase()">
                    {{ 'domains.ownershipStatus.' + (domain.ownershipStatus || 'UNVERIFIED').toLowerCase() | translate }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="price">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="price">{{ 'domains.table.price' | translate }}</th>
                <td mat-cell *matCellDef="let domain">
                  <span class="cell-strong price" dir="ltr">{{ domain.price | localeCurrency }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="expires">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="expiresAt">{{ 'domains.table.expires' | translate }}</th>
                <td mat-cell *matCellDef="let domain">
                  @if (domain.expiresAt) {
                    <span class="cell-datetime expires">
                      {{ domain.expiresAt | localeDate:{ month: 'short', year: 'numeric', day: 'numeric' } }}
                      @if (domain.expiresSource === 'REGISTRAR') {
                        <mat-icon class="expires-source" [matTooltip]="'domains.form.expiresFromRegistrar' | translate">cloud_done</mat-icon>
                      }
                    </span>
                  } @else {
                    <span class="cell-muted">—</span>
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="col-actions"></th>
                <td mat-cell *matCellDef="let domain" class="col-actions">
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
                      <button mat-menu-item type="button" (click)="openOwnership(domain)">
                        <mat-icon>{{ domain.ownershipStatus === 'VERIFIED' ? 'verified' : 'verified_user' }}</mat-icon>
                        {{ (domain.ownershipStatus === 'VERIFIED'
                            ? 'domains.ownership.reverify'
                            : domain.ownershipStatus === 'PENDING'
                              ? 'domains.ownership.continue'
                              : 'domains.ownership.verify') | translate }}
                      </button>
                      <button mat-menu-item type="button" (click)="openListForSale(domain)">
                        <mat-icon>sell</mat-icon>
                        {{ 'domains.actions.listForSale' | translate }}
                      </button>
                      <button mat-menu-item type="button" (click)="openWhois(domain)">
                        <mat-icon>travel_explore</mat-icon>
                        {{ 'domains.actions.whois' | translate }}
                      </button>
                      <button mat-menu-item type="button" (click)="refreshExpiry(domain)">
                        <mat-icon>event_repeat</mat-icon>
                        {{ 'domains.actions.refreshExpiry' | translate }}
                      </button>
                    <button mat-menu-item type="button" class="delete-item" (click)="onDelete(domain)">
                      <mat-icon>delete</mat-icon>
                      {{ 'common.delete' | translate }}
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              <tr class="mat-row empty-row" *matNoDataRow>
                <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                  <div class="empty-state">
                    {{ loading ? ('common.loading' | translate) : ('domains.empty' | translate) }}
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <mat-paginator
            [length]="totalElements"
            [pageIndex]="pageIndex"
            [pageSize]="pageSize"
            [pageSizeOptions]="[5, 10, 25, 50]"
            [showFirstLastButtons]="true"
            [disabled]="loading"
            (page)="onPage($event)"
            [attr.aria-label]="'domains.pagination' | translate">
          </mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-field {
      width: min(100%, 280px);
    }

    .domain-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .price {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .expires {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .expires-source {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
    }

    .delete-item {
      color: var(--danger) !important;
    }

    .empty-state {
      padding: 28px 16px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-row .mat-mdc-cell {
      border-bottom: none !important;
    }

    .ownership-pill.verified {
      background: var(--success-light);
      color: var(--success);
      border-color: transparent;
    }

    .ownership-pill.pending {
      background: var(--warning-light);
      color: var(--warning);
      border-color: transparent;
    }

    .ownership-pill.unverified {
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }
  `]
})
export class DomainsComponent implements OnInit, OnDestroy {
  private readonly domainsService = inject(DomainsService);
  private readonly listingsService = inject(ListingsService);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);

  displayedColumns = ['rowNumber', 'name', 'status', 'ownership', 'price', 'expires', 'actions'];
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
      width: '560px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      panelClass: 'domain-form-dialog-panel',
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
      width: '560px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      panelClass: 'domain-form-dialog-panel',
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
      width: '560px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      panelClass: 'domain-form-dialog-panel',
      data: { mode: 'view', domain }
    });
  }

  openOwnership(domain: DomainItem): void {
    const ref = this.dialog.open(DomainOwnershipDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'domain-ownership-dialog-panel',
      data: { domain }
    });
    ref.afterClosed().subscribe((updated) => {
      if (updated) {
        this.reload();
      }
    });
  }

  openWhois(domain: DomainItem): void {
    const ref = this.dialog.open(DomainWhoisDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      panelClass: 'domain-whois-dialog-panel',
      data: { domain }
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.appliedExpiry) {
        this.reload();
      }
    });
  }

  openListForSale(domain: DomainItem): void {
    if (domain.ownershipStatus !== 'VERIFIED') {
      this.snackBar.open(this.translate.instant('domains.actions.listForSaleNeedVerify'), undefined, {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    this.listingsService.getByDomain(domain.id).subscribe({
      next: (listing) => {
        const ref = this.dialog.open(ListingDialogComponent, {
          width: '480px',
          maxWidth: '95vw',
          panelClass: 'app-dialog',
          data: { mode: 'edit', domain, listing }
        });
        ref.afterClosed().subscribe();
      },
      error: () => {
        const ref = this.dialog.open(ListingDialogComponent, {
          width: '480px',
          maxWidth: '95vw',
          panelClass: 'app-dialog',
          data: { mode: 'create', domain }
        });
        ref.afterClosed().subscribe();
      }
    });
  }

  refreshExpiry(domain: DomainItem): void {
    if (!domain.id) {
      return;
    }
    this.domainsService.refreshExpiryFromRegistrar(domain.id).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('domains.form.expiryFetched'), undefined, { duration: 3000 });
        this.reload();
      },
      error: (error) => this.showError(error)
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
