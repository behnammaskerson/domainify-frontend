import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { Ticket, TicketService } from '../../services/ticket.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

export interface TicketLinkDialogData {
  targetTicketId: number;
  targetPublicNumber?: string;
  excludedTicketIds?: number[];
}

export interface TicketLinkDialogResult {
  relatedTicketIds: number[];
}

@Component({
  selector: 'app-ticket-link-dialog',
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
    TranslateModule,
    LocaleDatePipe
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.linkTitle' | translate }}</h2>
    <mat-dialog-content class="link-content">
      <p class="link-intro">
        {{ 'tickets.detail.linkIntro' | translate: { number: data.targetPublicNumber || '—' } }}
      </p>

      <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput
               [placeholder]="'tickets.detail.linkSearch' | translate"
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
        <span>{{ 'tickets.detail.linkSelectedCount' | translate: { count: selectedIds.size } }}</span>
      </div>

      @if (loading) {
        <p class="muted">{{ 'tickets.detail.linkLoading' | translate }}</p>
      } @else if (tickets.length === 0) {
        <p class="muted">{{ 'tickets.detail.linkEmpty' | translate }}</p>
      } @else {
        <div class="table-wrap">
          <table mat-table [dataSource]="tickets" class="link-table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox
                  [checked]="selectedIds.has(row.id!)"
                  (change)="toggleTicket(row.id!, $event.checked)"
                  (click)="$event.stopPropagation()">
                </mat-checkbox>
              </td>
            </ng-container>
            <ng-container matColumnDef="rowNumber">
              <th mat-header-cell *matHeaderCellDef class="col-row-num">{{ 'common.rowNumber' | translate }}</th>
              <td mat-cell *matCellDef="let row; let i = index" class="col-row-num">
                {{ pageIndex * pageSize + i + 1 }}
              </td>
            </ng-container>
            <ng-container matColumnDef="publicNumber">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkColNumber' | translate }}</th>
              <td mat-cell *matCellDef="let row" dir="ltr">{{ row.publicNumber }}</td>
            </ng-container>
            <ng-container matColumnDef="subject">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkColSubject' | translate }}</th>
              <td mat-cell *matCellDef="let row" class="subject-cell">{{ row.subject }}</td>
            </ng-container>
            <ng-container matColumnDef="requester">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkColRequester' | translate }}</th>
              <td mat-cell *matCellDef="let row">{{ row.requesterName || row.requesterEmail || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkColStatus' | translate }}</th>
              <td mat-cell *matCellDef="let row">
                <span class="status-pill" [attr.data-status]="row.status">
                  {{ ('tickets.statuses.' + row.status) | translate }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="updatedAt">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkColUpdated' | translate }}</th>
              <td mat-cell *matCellDef="let row" dir="ltr">{{ row.updatedAt | localeDate:dateTimeFormat }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row
                *matRowDef="let row; columns: displayedColumns;"
                [class.selected-row]="selectedIds.has(row.id!)"
                (click)="toggleTicket(row.id!, !selectedIds.has(row.id!))"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="totalElements"
          [pageIndex]="pageIndex"
          [pageSize]="pageSize"
          [pageSizeOptions]="[5, 10]"
          (page)="onPage($event)"
          [attr.aria-label]="'tickets.detail.linkPagination' | translate">
        </mat-paginator>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" type="button" [disabled]="selectedIds.size === 0" (click)="confirm()">
        {{ 'tickets.detail.linkConfirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host h2[mat-dialog-title] {
      color: var(--text-primary);
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .link-content {
      min-width: 560px;
      max-height: 70vh;
    }

    .link-intro {
      margin: 0 0 12px;
      color: var(--text-secondary);
      line-height: 1.5;
      font-size: 0.92rem;
    }

    .search-field { width: 100%; margin-bottom: 8px; }

    .selection-bar {
      margin-bottom: 8px;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .muted {
      color: var(--text-muted);
      font-size: 0.9rem;
      text-align: center;
      padding: 24px 0;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }

    .link-table { width: 100%; }

    .col-row-num {
      width: 48px;
      max-width: 48px;
      text-align: center;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .link-table tr.mat-mdc-row { cursor: pointer; }

    .link-table tr.mat-mdc-row:hover {
      background: color-mix(in srgb, var(--primary) 6%, transparent);
    }

    .link-table tr.selected-row {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }

    .subject-cell {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
    }
  `]
})
export class TicketLinkDialogComponent implements OnInit, OnDestroy {
  private readonly ticketService = inject(TicketService);
  private readonly dialogRef = inject(MatDialogRef<TicketLinkDialogComponent, TicketLinkDialogResult>);
  readonly data = inject<TicketLinkDialogData>(MAT_DIALOG_DATA);

  readonly displayedColumns = ['select', 'rowNumber', 'publicNumber', 'subject', 'requester', 'status', 'updatedAt'];
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;
  private readonly excluded = new Set(this.data.excludedTicketIds ?? [this.data.targetTicketId]);

  searchQuery = '';
  tickets: Ticket[] = [];
  loading = false;
  totalElements = 0;
  pageIndex = 0;
  pageSize = 5;
  readonly selectedIds = new Set<number>();

  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit(): void {
    this.searchSub = this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadTickets();
    });
    this.loadTickets();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchInput(): void {
    this.search$.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.search$.next('');
  }

  toggleTicket(id: number, checked: boolean): void {
    if (this.excluded.has(id)) {
      return;
    }
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTickets();
  }

  confirm(): void {
    if (this.selectedIds.size === 0) {
      return;
    }
    this.dialogRef.close({ relatedTicketIds: [...this.selectedIds] });
  }

  private loadTickets(): void {
    this.loading = true;
    this.ticketService.listAdminInbox({
      view: 'ALL',
      q: this.searchQuery?.trim() || undefined,
      page: this.pageIndex,
      size: this.pageSize,
      sort: 'updatedAt,desc'
    }).subscribe({
      next: (result) => {
        this.tickets = (result.content ?? []).filter((t) => t.id != null && !this.excluded.has(t.id!));
        this.totalElements = result.totalElements ?? 0;
        this.loading = false;
      },
      error: () => {
        this.tickets = [];
        this.totalElements = 0;
        this.loading = false;
      }
    });
  }
}
