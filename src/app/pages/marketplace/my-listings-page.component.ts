import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { ListingDialogComponent } from '../../components/listing-dialog/listing-dialog.component';
import { ListingOffersDialogComponent } from '../../components/listing-offers-dialog/listing-offers-dialog.component';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleCurrencyPipe, LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { DomainListing, DomainListingStatus, ListingsService } from '../../services/listings.service';

@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe,
    LocaleDatePipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'listings.eyebrow' | translate"
        [title]="'listings.title' | translate"
        [subtitle]="'listings.subtitle' | translate">
        <a mat-stroked-button type="button" class="hero-cta" routerLink="/marketplace">
          <mat-icon>storefront</mat-icon>
          {{ 'listings.browseMarketplace' | translate }}
        </a>
        <a mat-flat-button type="button" class="hero-cta" routerLink="/domains">
          <mat-icon>add</mat-icon>
          {{ 'listings.listFromDomains' | translate }}
        </a>
      </app-page-hero>

      <div class="page-body">
        <div class="toolbar-row">
          <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>{{ 'listings.search' | translate }}</mat-label>
            <input matInput [(ngModel)]="search" (ngModelChange)="onSearchChange($event)">
          </mat-form-field>
          <mat-form-field appearance="outline" class="status-field" subscriptSizing="dynamic">
            <mat-label>{{ 'listings.statusFilter' | translate }}</mat-label>
            <mat-select [(ngModel)]="statusFilter" (selectionChange)="reload(true)">
              <mat-option value="all">{{ 'listings.status.all' | translate }}</mat-option>
              <mat-option value="ACTIVE">{{ 'listings.status.ACTIVE' | translate }}</mat-option>
              <mat-option value="INACTIVE">{{ 'listings.status.INACTIVE' | translate }}</mat-option>
              <mat-option value="SOLD">{{ 'listings.status.SOLD' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="panel-surface table-wrap">
          <div class="table-scroll">
            <table mat-table
                   [dataSource]="listings"
                   class="mat-mdc-table listings-table"
                   [attr.aria-label]="'listings.title' | translate">
              <ng-container matColumnDef="domain">
                <th mat-header-cell *matHeaderCellDef>{{ 'listings.table.domain' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <div class="domain-cell">
                    <span class="cell-strong" dir="ltr">{{ row.domainName }}</span>
                    @if (row.featured) {
                      <span class="method-pill">{{ 'listings.featured' | translate }}</span>
                    }
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="price">
                <th mat-header-cell *matHeaderCellDef>{{ 'listings.table.price' | translate }}</th>
                <td mat-cell *matCellDef="let row" dir="ltr">{{ row.askingPrice | localeCurrency }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'listings.table.status' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <span class="status-pill"
                        [class.active]="row.status === 'ACTIVE'"
                        [class.sold]="row.status === 'SOLD'"
                        [class.expired]="row.status === 'INACTIVE'">
                    {{ ('listings.status.' + row.status) | translate }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef>{{ 'listings.table.updated' | translate }}</th>
                <td mat-cell *matCellDef="let row" class="cell-datetime">
                  {{ row.updatedAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric' } }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="col-actions"></th>
                <td mat-cell *matCellDef="let row" class="col-actions">
                  <button mat-icon-button type="button" [matMenuTriggerFor]="menu"
                          [matTooltip]="'a11y.actions' | translate">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item type="button" (click)="openOffers(row)">
                      <mat-icon>handshake</mat-icon>
                      {{ 'listings.actions.offers' | translate }}
                    </button>
                    <button mat-menu-item type="button" (click)="openEdit(row)"
                            [disabled]="row.status === 'SOLD'">
                      <mat-icon>edit</mat-icon>
                      {{ 'common.edit' | translate }}
                    </button>
                    @if (row.status === 'ACTIVE') {
                      <button mat-menu-item type="button" (click)="deactivate(row)">
                        <mat-icon>visibility_off</mat-icon>
                        {{ 'listings.actions.deactivate' | translate }}
                      </button>
                    }
                    @if (row.status === 'INACTIVE') {
                      <button mat-menu-item type="button" (click)="activate(row)">
                        <mat-icon>visibility</mat-icon>
                        {{ 'listings.actions.activate' | translate }}
                      </button>
                    }
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                  <div class="table-empty">
                    {{ loading ? ('common.loading' | translate) : ('listings.empty' | translate) }}
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
            (page)="onPage($event)">
          </mat-paginator>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    .search-field { width: min(100%, 280px); }
    .status-field { width: min(100%, 180px); }
    .domain-cell {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class MyListingsPageComponent implements OnInit, OnDestroy {
  private readonly listingsService = inject(ListingsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);

  readonly displayedColumns = ['domain', 'price', 'status', 'updated', 'actions'];
  listings: DomainListing[] = [];
  loading = false;
  search = '';
  statusFilter: 'all' | DomainListingStatus = 'all';
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit(): void {
    this.searchSub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pageIndex = 0;
      this.reload();
    });
    this.reload();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchChange(value: string): void {
    this.search$.next(value.trim());
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.reload();
  }

  reload(resetPage = false): void {
    if (resetPage) {
      this.pageIndex = 0;
    }
    this.loading = true;
    this.listingsService.listMine({
      q: this.search.trim() || undefined,
      status: this.statusFilter === 'all' ? undefined : this.statusFilter,
      page: this.pageIndex,
      size: this.pageSize,
      sort: 'createdAt,desc'
    }).subscribe({
      next: (page) => {
        this.loading = false;
        this.listings = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
      },
      error: (error) => {
        this.loading = false;
        this.listings = [];
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  openEdit(listing: DomainListing): void {
    const ref = this.dialog.open(ListingDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'app-dialog',
      data: { mode: 'edit', listing }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.reload();
      }
    });
  }

  openOffers(listing: DomainListing): void {
    const ref = this.dialog.open(ListingOffersDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'app-dialog',
      data: { listing }
    });
    ref.afterClosed().subscribe((changed) => {
      if (changed) {
        this.reload();
      }
    });
  }

  deactivate(listing: DomainListing): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'listings.confirm.deactivateTitle',
        messageKey: 'listings.confirm.deactivateMessage',
        messageParams: { domain: listing.domainName },
        confirmKey: 'listings.actions.deactivate',
        confirmColor: 'warn' as const
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.listingsService.deactivate(listing.id).subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('listings.toast.deactivated'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (error) => this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        })
      });
    });
  }

  activate(listing: DomainListing): void {
    this.listingsService.activate(listing.id).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('listings.toast.activated'), undefined, { duration: 3000 });
        this.reload();
      },
      error: (error) => this.snackBar.open(this.apiError.resolve(error), undefined, {
        duration: 6000,
        panelClass: ['error-snackbar']
      })
    });
  }
}
