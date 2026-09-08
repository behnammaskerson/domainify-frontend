import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { DomainItem } from '../../services/domains.service';
import { TicketService } from '../../services/ticket.service';

export interface TicketLinkDomainDialogData {
  ticketId: number;
  publicNumber?: string;
}

export interface TicketLinkDomainDialogResult {
  domainIds: number[];
}

@Component({
  selector: 'app-ticket-link-domain-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatTableModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.linkDomainTitle' | translate }}</h2>
    <mat-dialog-content class="link-content">
      <p class="link-intro">
        {{ 'tickets.detail.linkDomainIntro' | translate: { number: data.publicNumber || '—' } }}
      </p>

      <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput
               [placeholder]="'tickets.detail.linkDomainSearch' | translate"
               [(ngModel)]="searchQuery"
               (ngModelChange)="onSearchInput()"
               autocomplete="off" />
        @if (searchQuery) {
          <button matSuffix mat-icon-button type="button" (click)="clearSearch()">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>

      <div class="selection-bar">
        <span>{{ 'tickets.detail.linkDomainSelectedCount' | translate: { count: selectedIds.size } }}</span>
      </div>

      @if (loading) {
        <p class="table-empty">{{ 'tickets.detail.linkDomainLoading' | translate }}</p>
      } @else if (domains.length === 0) {
        <p class="table-empty">{{ 'tickets.detail.linkDomainEmpty' | translate }}</p>
      } @else {
        <div class="panel-surface table-wrap table-wrap--compact">
          <div class="table-scroll">
            <table mat-table [dataSource]="domains" class="mat-mdc-table link-table">
              <ng-container matColumnDef="select">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <mat-checkbox
                    [checked]="selectedIds.has(row.id)"
                    (change)="toggleDomain(row.id, $event.checked)"
                    (click)="$event.stopPropagation()">
                  </mat-checkbox>
                </td>
              </ng-container>
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkDomainColName' | translate }}</th>
                <td mat-cell *matCellDef="let row" class="cell-strong" dir="ltr">{{ row.name }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkDomainColStatus' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <span class="status-pill" [attr.data-status]="row.status">
                    {{ ('domains.status.' + (row.status | lowercase)) | translate }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="ownership">
                <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkDomainColOwnership' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.ownershipStatus) {
                    {{ ('domains.ownershipStatus.' + (row.ownershipStatus | lowercase)) | translate }}
                  } @else {
                    —
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row
                  *matRowDef="let row; columns: displayedColumns;"
                  [class.selected-row]="selectedIds.has(row.id)"
                  (click)="toggleDomain(row.id, !selectedIds.has(row.id))"></tr>
            </table>
          </div>

          <mat-paginator
            [length]="totalElements"
            [pageIndex]="pageIndex"
            [pageSize]="pageSize"
            [pageSizeOptions]="[5, 10, 20]"
            (page)="onPage($event)"
            [attr.aria-label]="'tickets.detail.linkDomainPagination' | translate">
          </mat-paginator>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" type="button" [disabled]="selectedIds.size === 0" (click)="confirm()">
        {{ 'tickets.detail.linkDomainConfirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host h2[mat-dialog-title] {
      color: var(--text-primary);
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .link-content { min-width: min(100%, 560px); max-height: 70vh; }
    .link-intro {
      margin: 0 0 12px;
      color: var(--text-secondary);
      line-height: 1.5;
      font-size: 0.92rem;
    }
    .search-field { width: 100%; margin-bottom: 8px; }
    .selection-bar { margin-bottom: 8px; color: var(--text-muted); font-size: 0.82rem; }
    .table-empty {
      color: var(--text-muted);
      font-size: 0.9rem;
      text-align: center;
      padding: 24px 0;
      margin: 0;
    }
    .link-table tr.mat-mdc-row { cursor: pointer; }
    .link-table tr.selected-row,
    .link-table tr.selected-row .mat-mdc-cell {
      background: color-mix(in srgb, var(--primary) 12%, transparent) !important;
    }
    .cell-strong { font-weight: 600; }
  `
})
export class TicketLinkDomainDialogComponent implements OnInit, OnDestroy {
  private readonly ticketService = inject(TicketService);
  private readonly dialogRef = inject(MatDialogRef<TicketLinkDomainDialogComponent, TicketLinkDomainDialogResult>);
  readonly data = inject<TicketLinkDomainDialogData>(MAT_DIALOG_DATA);

  readonly displayedColumns = ['select', 'name', 'status', 'ownership'];

  searchQuery = '';
  domains: DomainItem[] = [];
  loading = false;
  totalElements = 0;
  pageIndex = 0;
  pageSize = 10;
  selectedIds = new Set<number>();

  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;
  private loadSub?: Subscription;

  ngOnInit(): void {
    this.searchSub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pageIndex = 0;
      this.load();
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.loadSub?.unsubscribe();
  }

  onSearchInput(): void {
    this.search$.next(this.searchQuery.trim());
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.search$.next('');
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  toggleDomain(id: number, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  confirm(): void {
    if (!this.selectedIds.size) return;
    this.dialogRef.close({ domainIds: [...this.selectedIds] });
  }

  private load(): void {
    this.loading = true;
    this.loadSub?.unsubscribe();
    this.loadSub = this.ticketService.listAdminLinkableDomains(this.data.ticketId, {
      q: this.searchQuery.trim() || undefined,
      page: this.pageIndex,
      size: this.pageSize
    }).subscribe({
      next: (page) => {
        this.domains = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
        this.pageIndex = page.number ?? this.pageIndex;
        this.pageSize = page.size ?? this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.domains = [];
        this.totalElements = 0;
        this.loading = false;
      }
    });
  }
}
