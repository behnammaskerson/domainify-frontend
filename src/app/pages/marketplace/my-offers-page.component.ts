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
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { OfferDialogComponent } from '../../components/offer-dialog/offer-dialog.component';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleCurrencyPipe, LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import {
  DomainListingOfferStatus,
  ListingOffer,
  OffersService
} from '../../services/offers.service';

@Component({
  selector: 'app-my-offers',
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
        [eyebrow]="'offers.eyebrow' | translate"
        [title]="'offers.title' | translate"
        [subtitle]="'offers.subtitle' | translate">
        <a mat-stroked-button type="button" class="hero-cta" routerLink="/marketplace">
          <mat-icon>storefront</mat-icon>
          {{ 'offers.browseMarketplace' | translate }}
        </a>
      </app-page-hero>

      <div class="page-body">
        <div class="toolbar-row">
          <mat-form-field appearance="outline" class="status-field" subscriptSizing="dynamic">
            <mat-label>{{ 'offers.statusFilter' | translate }}</mat-label>
            <mat-select [(ngModel)]="statusFilter" (selectionChange)="reload(true)">
              <mat-option value="all">{{ 'offers.status.all' | translate }}</mat-option>
              <mat-option value="PENDING">{{ 'offers.status.PENDING' | translate }}</mat-option>
              <mat-option value="COUNTERED">{{ 'offers.status.COUNTERED' | translate }}</mat-option>
              <mat-option value="ACCEPTED">{{ 'offers.status.ACCEPTED' | translate }}</mat-option>
              <mat-option value="REJECTED">{{ 'offers.status.REJECTED' | translate }}</mat-option>
              <mat-option value="WITHDRAWN">{{ 'offers.status.WITHDRAWN' | translate }}</mat-option>
              <mat-option value="EXPIRED">{{ 'offers.status.EXPIRED' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="panel-surface table-wrap">
          <div class="table-scroll">
            <table mat-table
                   [dataSource]="offers"
                   class="mat-mdc-table offers-table"
                   [attr.aria-label]="'offers.title' | translate">
              <ng-container matColumnDef="domain">
                <th mat-header-cell *matHeaderCellDef>{{ 'offers.table.domain' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <span class="cell-strong" dir="ltr">{{ row.domainName }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>{{ 'offers.table.amount' | translate }}</th>
                <td mat-cell *matCellDef="let row" dir="ltr">{{ row.amount | localeCurrency }}</td>
              </ng-container>

              <ng-container matColumnDef="asking">
                <th mat-header-cell *matHeaderCellDef>{{ 'offers.table.asking' | translate }}</th>
                <td mat-cell *matCellDef="let row" dir="ltr">{{ row.askingPrice | localeCurrency }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'offers.table.status' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <span class="status-pill"
                        [class.active]="row.status === 'ACCEPTED' || row.status === 'PENDING'"
                        [class.pending]="row.status === 'COUNTERED'"
                        [class.sold]="row.status === 'REJECTED' || row.status === 'WITHDRAWN' || row.status === 'EXPIRED'">
                    {{ ('offers.status.' + row.status) | translate }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef>{{ 'offers.table.updated' | translate }}</th>
                <td mat-cell *matCellDef="let row" class="cell-datetime">
                  {{ row.updatedAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric' } }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="col-actions"></th>
                <td mat-cell *matCellDef="let row" class="col-actions">
                  <button mat-icon-button type="button" [matMenuTriggerFor]="menu"
                          [matTooltip]="'a11y.actions' | translate"
                          [disabled]="!canAct(row)">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    @if (row.status === 'COUNTERED') {
                      <button mat-menu-item type="button" (click)="accept(row)">
                        <mat-icon>check</mat-icon>
                        {{ 'offers.actions.accept' | translate }}
                      </button>
                      <button mat-menu-item type="button" (click)="counter(row)">
                        <mat-icon>sync_alt</mat-icon>
                        {{ 'offers.actions.counter' | translate }}
                      </button>
                      <button mat-menu-item type="button" (click)="reject(row)">
                        <mat-icon>close</mat-icon>
                        {{ 'offers.actions.reject' | translate }}
                      </button>
                    }
                    @if (row.status === 'PENDING') {
                      <button mat-menu-item type="button" (click)="withdraw(row)">
                        <mat-icon>undo</mat-icon>
                        {{ 'offers.actions.withdraw' | translate }}
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
                    {{ loading ? ('common.loading' | translate) : ('offers.empty' | translate) }}
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
    .status-field { width: min(100%, 200px); }
  `]
})
export class MyOffersPageComponent implements OnInit, OnDestroy {
  private readonly offersService = inject(OffersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);

  readonly displayedColumns = ['domain', 'amount', 'asking', 'status', 'updated', 'actions'];
  offers: ListingOffer[] = [];
  loading = false;
  statusFilter: 'all' | DomainListingOfferStatus = 'all';
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {}

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.reload();
  }

  canAct(row: ListingOffer): boolean {
    return row.status === 'PENDING' || row.status === 'COUNTERED';
  }

  reload(resetPage = false): void {
    if (resetPage) {
      this.pageIndex = 0;
    }
    this.loading = true;
    this.offersService.listMine({
      status: this.statusFilter === 'all' ? undefined : this.statusFilter,
      page: this.pageIndex,
      size: this.pageSize,
      sort: 'createdAt,desc'
    }).subscribe({
      next: (page) => {
        this.loading = false;
        this.offers = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
      },
      error: (error) => {
        this.loading = false;
        this.offers = [];
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  accept(offer: ListingOffer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'offers.confirm.acceptTitle',
        messageKey: 'offers.confirm.acceptMessage',
        messageParams: { domain: offer.domainName },
        confirmKey: 'offers.actions.accept',
        confirmColor: 'primary' as const
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.offersService.accept(offer.id).subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('offers.toast.accepted'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (error) => this.fail(error)
      });
    });
  }

  reject(offer: ListingOffer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'offers.confirm.rejectTitle',
        messageKey: 'offers.confirm.rejectMessage',
        messageParams: { domain: offer.domainName },
        confirmKey: 'offers.actions.reject',
        confirmColor: 'warn' as const
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.offersService.reject(offer.id).subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('offers.toast.rejected'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (error) => this.fail(error)
      });
    });
  }

  counter(offer: ListingOffer): void {
    const ref = this.dialog.open(OfferDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'app-dialog',
      data: { mode: 'counter', offer }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.reload();
    });
  }

  withdraw(offer: ListingOffer): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'offers.confirm.withdrawTitle',
        messageKey: 'offers.confirm.withdrawMessage',
        messageParams: { domain: offer.domainName },
        confirmKey: 'offers.actions.withdraw',
        confirmColor: 'warn' as const
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.offersService.withdraw(offer.id).subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('offers.toast.withdrawn'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (error) => this.fail(error)
      });
    });
  }

  private fail(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
