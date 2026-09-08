import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CheckoutDialogComponent } from '../../components/checkout-dialog/checkout-dialog.component';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleCurrencyPipe, LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { AuthService } from '../../services/auth.service';
import { MarketplaceOrder, OrdersService } from '../../services/orders.service';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
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
        [eyebrow]="'orders.eyebrow' | translate"
        [title]="'orders.title' | translate"
        [subtitle]="'orders.subtitle' | translate">
        <a mat-stroked-button type="button" class="hero-cta" routerLink="/marketplace">
          <mat-icon>storefront</mat-icon>
          {{ 'orders.browseMarketplace' | translate }}
        </a>
      </app-page-hero>

      <div class="page-body">
        <div class="toolbar-row">
          <mat-form-field appearance="outline" class="role-field" subscriptSizing="dynamic">
            <mat-label>{{ 'orders.roleFilter' | translate }}</mat-label>
            <mat-select [(ngModel)]="roleFilter" (selectionChange)="reload(true)">
              <mat-option value="all">{{ 'orders.role.all' | translate }}</mat-option>
              <mat-option value="buyer">{{ 'orders.role.buyer' | translate }}</mat-option>
              <mat-option value="seller">{{ 'orders.role.seller' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="panel-surface table-wrap">
          <div class="table-scroll">
            <table mat-table
                   [dataSource]="orders"
                   class="mat-mdc-table orders-table"
                   [attr.aria-label]="'orders.title' | translate">
              <ng-container matColumnDef="domain">
                <th mat-header-cell *matHeaderCellDef>{{ 'orders.table.domain' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <span class="cell-strong" dir="ltr">{{ row.domainName }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>{{ 'orders.table.role' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  {{ isBuyer(row) ? ('orders.role.buyer' | translate) : ('orders.role.seller' | translate) }}
                </td>
              </ng-container>

              <ng-container matColumnDef="gross">
                <th mat-header-cell *matHeaderCellDef>{{ 'orders.table.gross' | translate }}</th>
                <td mat-cell *matCellDef="let row" dir="ltr">{{ row.grossAmount | localeCurrency }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'orders.table.status' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <span class="status-pill"
                        [class.active]="row.status === 'PAID_HELD' || row.status === 'RELEASED'"
                        [class.pending]="row.status === 'PENDING_PAYMENT'"
                        [class.sold]="row.status === 'CANCELLED' || row.status === 'REFUNDED'">
                    {{ ('orders.status.' + row.status) | translate }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="updated">
                <th mat-header-cell *matHeaderCellDef>{{ 'orders.table.updated' | translate }}</th>
                <td mat-cell *matCellDef="let row" class="cell-datetime">
                  {{ (row.updatedAt || row.createdAt) | localeDate:{ year: 'numeric', month: 'short', day: 'numeric' } }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="col-actions"></th>
                <td mat-cell *matCellDef="let row" class="col-actions">
                  @if (canPay(row)) {
                    <button mat-flat-button color="primary" type="button" (click)="openCheckout(row)">
                      <mat-icon>payments</mat-icon>
                      {{ 'orders.actions.pay' | translate }}
                    </button>
                  } @else {
                    <button mat-icon-button type="button" [matMenuTriggerFor]="menu"
                            [matTooltip]="'a11y.actions' | translate">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item type="button" (click)="refreshOne(row)">
                        <mat-icon>refresh</mat-icon>
                        {{ 'orders.actions.refresh' | translate }}
                      </button>
                    </mat-menu>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                  <div class="table-empty">
                    {{ loading ? ('common.loading' | translate) : ('orders.empty' | translate) }}
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
  styles: `
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    .role-field { width: min(100%, 200px); }
    .col-actions button mat-icon { margin-inline-end: 4px; }
  `
})
export class MyOrdersPageComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);

  readonly displayedColumns = ['domain', 'role', 'gross', 'status', 'updated', 'actions'];
  orders: MarketplaceOrder[] = [];
  loading = false;
  roleFilter: 'buyer' | 'seller' | 'all' = 'all';
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;
  private userId: number | null = null;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.userId = user?.id ?? null;
    }).unsubscribe();
    this.reload();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.reload();
  }

  isBuyer(row: MarketplaceOrder): boolean {
    return this.userId != null && row.buyerId === this.userId;
  }

  canPay(row: MarketplaceOrder): boolean {
    return row.status === 'PENDING_PAYMENT' && this.isBuyer(row);
  }

  reload(resetPage = false): void {
    if (resetPage) {
      this.pageIndex = 0;
    }
    this.loading = true;
    this.ordersService.listMine({
      role: this.roleFilter,
      page: this.pageIndex,
      size: this.pageSize,
      sort: 'createdAt,desc'
    }).subscribe({
      next: (page) => {
        this.loading = false;
        this.orders = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
      },
      error: (error) => {
        this.loading = false;
        this.orders = [];
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  openCheckout(order: MarketplaceOrder): void {
    const ref = this.dialog.open(CheckoutDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'app-dialog',
      data: { order }
    });
    ref.afterClosed().subscribe((paid) => {
      if (paid) {
        this.reload();
      }
    });
  }

  refreshOne(row: MarketplaceOrder): void {
    this.ordersService.get(row.id).subscribe({
      next: (fresh) => {
        this.orders = this.orders.map((o) => (o.id === fresh.id ? fresh : o));
        this.snackBar.open(this.translate.instant('orders.toast.refreshed'), undefined, { duration: 2000 });
      },
      error: (error) => {
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
