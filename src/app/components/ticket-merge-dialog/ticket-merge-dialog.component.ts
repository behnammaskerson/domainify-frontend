import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { Ticket, TicketService } from '../../services/ticket.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

export interface TicketMergeDialogData {
  targetTicketId: number;
  targetPublicNumber?: string;
}

export interface TicketMergeDialogResult {
  sourceTicketId: number;
}

@Component({
  selector: 'app-ticket-merge-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatTableModule,
    TranslateModule,
    LocaleDatePipe
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.mergeTitle' | translate }}</h2>
    <mat-dialog-content class="merge-content">
      <p class="merge-intro">
        {{ 'tickets.detail.mergeIntro' | translate: { number: data.targetPublicNumber || '—' } }}
      </p>

      <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput
               [placeholder]="'tickets.detail.mergeSearch' | translate"
               [(ngModel)]="searchQuery"
               (ngModel)="onSearchInput()"
               autocomplete="off" />
        @if (searchQuery) {
          <button matSuffix mat-icon-button type="button" (click)="clearSearch()">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>

      @if (loading) {
        <p class="muted">{{ 'tickets.detail.mergeLoading' | translate }}</p>
      } @else if (tickets.length === 0) {
        <p class="muted">{{ 'tickets.detail.mergeEmpty' | translate }}</p>
      } @else {
        <div class="table-wrap">
          <table mat-table [dataSource]="tickets" class="merge-table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <mat-icon class="radio-icon">
                  {{ selectedId === row.id ? 'radio_button_checked' : 'radio_button_unchecked' }}
                </mat-icon>
              </td>
            </ng-container>
            <ng-container matColumnDef="rowNumber">
              <th mat-header-cell *matHeaderCellDef class="col-row-num">{{ 'common.rowNumber' | translate }}</th>
              <td mat-cell *matCellDef="let row; let i = index" class="col-row-num">
                {{ pageIndex * pageSize + i + 1 }}
              </td>
            </ng-container>
            <ng-container matColumnDef="publicNumber">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.mergeColNumber' | translate }}</th>
              <td mat-cell *matCellDef="let row" dir="ltr">{{ row.publicNumber }}</td>
            </ng-container>
            <ng-container matColumnDef="subject">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.mergeColSubject' | translate }}</th>
              <td mat-cell *matCellDef="let row" class="subject-cell">{{ row.subject }}</td>
            </ng-container>
            <ng-container matColumnDef="requester">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.mergeColRequester' | translate }}</th>
              <td mat-cell *matCellDef="let row">{{ row.requesterName || row.requesterEmail || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.mergeColStatus' | translate }}</th>
              <td mat-cell *matCellDef="let row">
                <span class="status-pill" [attr.data-status]="row.status">
                  {{ ('tickets.statuses.' + row.status) | translate }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="updatedAt">
              <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.mergeColUpdated' | translate }}</th>
              <td mat-cell *matCellDef="let row" dir="ltr">{{ row.updatedAt | localeDate:dateTimeFormat }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row
                *matRowDef="let row; columns: displayedColumns;"
                [class.selected-row]="selectedId === row.id"
                (click)="selectTicket(row)"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="totalElements"
          [pageIndex]="pageIndex"
          [pageSize]="pageSize"
          [pageSizeOptions]="[5, 10]"
          (page)="onPage($event)"
          [attr.aria-label]="'tickets.detail.mergePagination' | translate">
        </mat-paginator>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" type="button" [disabled]="!selectedId" (click)="confirm()">
        {{ 'tickets.detail.mergeConfirm' | translate }}
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

    .merge-content {
      min-width: 560px;
      max-height: 70vh;
    }

    .merge-intro {
      margin: 0 0 12px;
      color: var(--text-secondary);
      line-height: 1.5;
      font-size: 0.92rem;
    }

    .search-field {
      width: 100%;
      margin-bottom: 8px;
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

    .merge-table {
      width: 100%;
    }

    .col-row-num {
      width: 48px;
      max-width: 48px;
      text-align: center;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .merge-table tr.mat-mdc-row {
      cursor: pointer;
    }

    .merge-table tr.mat-mdc-row:hover {
      background: color-mix(in srgb, var(--primary) 6%, transparent);
    }

    .merge-table tr.selected-row {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
    }

    .radio-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--text-muted);
    }

    .selected-row .radio-icon {
      color: var(--primary);
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
export class TicketMergeDialogComponent implements OnInit, OnDestroy {
  private readonly ticketService = inject(TicketService);
  private readonly dialogRef = inject(MatDialogRef<TicketMergeDialogComponent, TicketMergeDialogResult>);
  readonly data = inject<TicketMergeDialogData>(MAT_DIALOG_DATA);

  readonly displayedColumns = ['select', 'rowNumber', 'publicNumber', 'subject', 'requester', 'status', 'updatedAt'];
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;

  searchQuery = '';
  tickets: Ticket[] = [];
  loading = false;
  totalElements = 0;
  pageIndex = 0;
  pageSize = 5;
  selectedId: number | null = null;

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

  selectTicket(ticket: Ticket): void {
    if (ticket.id === this.data.targetTicketId) {
      return;
    }
    this.selectedId = this.selectedId === ticket.id ? null : (ticket.id ?? null);
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTickets();
  }

  confirm(): void {
    if (this.selectedId) {
      this.dialogRef.close({ sourceTicketId: this.selectedId });
    }
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
        this.tickets = (result.content ?? []).filter(t => t.id !== this.data.targetTicketId);
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
