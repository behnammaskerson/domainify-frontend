import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { TicketService, TicketSmsLinkType, TicketSmsLinkableItem } from '../../services/ticket.service';

export interface TicketLinkSmsDialogData {
  ticketId: number;
  publicNumber?: string;
}

export interface TicketLinkSmsDialogResult {
  items: { type: TicketSmsLinkType; externalId: string }[];
}

@Component({
  selector: 'app-ticket-link-sms-dialog',
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
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.linkSmsTitle' | translate }}</h2>
    <mat-dialog-content class="link-content">
      <p class="link-intro">{{ 'tickets.detail.linkSmsIntro' | translate: { number: data.publicNumber || '—' } }}</p>

      <div class="sms-type-tabs">
        <button mat-stroked-button type="button" [class.active]="type === 'SCHEDULED'" (click)="setType('SCHEDULED')">
          {{ 'tickets.detail.smsTypeScheduled' | translate }}
        </button>
        <button mat-stroked-button type="button" [class.active]="type === 'SEND'" (click)="setType('SEND')">
          {{ 'tickets.detail.smsTypeSend' | translate }}
        </button>
        <button mat-stroked-button type="button" [class.active]="type === 'PACK'" (click)="setType('PACK')">
          {{ 'tickets.detail.smsTypePack' | translate }}
        </button>
      </div>

      <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput
               [placeholder]="'tickets.detail.linkSmsSearch' | translate"
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
        <span>{{ 'tickets.detail.linkSmsSelectedCount' | translate: { count: selectedIds.size } }}</span>
      </div>

      @if (loading) {
        <p class="table-empty">{{ 'tickets.detail.linkSmsLoading' | translate }}</p>
      } @else if (items.length === 0) {
        <p class="table-empty">{{ 'tickets.detail.linkSmsEmpty' | translate }}</p>
      } @else {
        <div class="panel-surface table-wrap table-wrap--compact">
          <div class="table-scroll">
            <table mat-table [dataSource]="items" class="mat-mdc-table link-table">
              <ng-container matColumnDef="select">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <input type="checkbox"
                         [checked]="selectedIds.has(row.externalId)"
                         (change)="toggleItem(row.externalId, $any($event.target).checked)"
                         (click)="$event.stopPropagation()" />
                </td>
              </ng-container>

              <ng-container matColumnDef="externalId">
                <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkSmsColExternalId' | translate }}</th>
                <td mat-cell *matCellDef="let row" class="cell-strong" dir="ltr">{{ row.externalId }}</td>
              </ng-container>

              <ng-container matColumnDef="mobile">
                <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkSmsColMobile' | translate }}</th>
                <td mat-cell *matCellDef="let row" dir="ltr">{{ row.mobile || '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="preview">
                <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkSmsColPreview' | translate }}</th>
                <td mat-cell *matCellDef="let row">{{ row.messagePreview || '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'tickets.detail.linkSmsColStatus' | translate }}</th>
                <td mat-cell *matCellDef="let row">{{ row.statusLabel || '—' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row
                  *matRowDef="let row; columns: displayedColumns;"
                  [class.selected-row]="selectedIds.has(row.externalId)"
                  (click)="toggleItem(row.externalId, !selectedIds.has(row.externalId))"></tr>
            </table>
          </div>

          <mat-paginator
            [length]="totalElements"
            [pageIndex]="pageIndex"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPage($event)"
            [attr.aria-label]="'tickets.detail.linkSmsPagination' | translate">
          </mat-paginator>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button" [disabled]="selectedIds.size === 0" (click)="confirm()">
        {{ 'tickets.detail.linkSmsConfirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host h2[mat-dialog-title] { color: var(--text-primary); font-family: var(--font-display); font-weight: 700; letter-spacing: -0.01em; }
    .link-content { min-width: min(100%, 720px); max-height: 70vh; }
    .link-intro { margin: 0 0 12px; color: var(--text-secondary); line-height: 1.5; font-size: 0.92rem; }
    .sms-type-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
    .sms-type-tabs button.active { border-color: var(--primary); color: var(--primary); }
    .search-field { width: 100%; margin-bottom: 8px; }
    .selection-bar { margin-bottom: 8px; color: var(--text-muted); font-size: 0.82rem; }
    .table-empty { color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 24px 0; margin: 0; }
    .link-table tr.mat-mdc-row { cursor: pointer; }
    .link-table tr.selected-row,
    .link-table tr.selected-row .mat-mdc-cell { background: color-mix(in srgb, var(--primary) 12%, transparent) !important; }
    .cell-strong { font-weight: 600; }
  `
})
export class TicketLinkSmsDialogComponent implements OnInit, OnDestroy {
  private readonly ticketService = inject(TicketService);
  private readonly dialogRef = inject(MatDialogRef<TicketLinkSmsDialogComponent, TicketLinkSmsDialogResult>);
  readonly data = inject<TicketLinkSmsDialogData>(MAT_DIALOG_DATA);

  readonly displayedColumns = ['select', 'externalId', 'mobile', 'preview', 'status'];

  type: TicketSmsLinkType = 'SCHEDULED';
  searchQuery = '';
  items: TicketSmsLinkableItem[] = [];
  loading = false;
  totalElements = 0;
  pageIndex = 0;
  pageSize = 10;
  selectedIds = new Set<string>();

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

  setType(type: TicketSmsLinkType): void {
    if (this.type === type) return;
    this.type = type;
    this.pageIndex = 0;
    this.selectedIds.clear();
    this.load();
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

  toggleItem(externalId: string, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(externalId);
    } else {
      this.selectedIds.delete(externalId);
    }
  }

  confirm(): void {
    if (!this.selectedIds.size) return;
    const items = [...this.selectedIds].map((externalId) => ({ type: this.type, externalId }));
    this.dialogRef.close({ items });
  }

  private load(): void {
    this.loading = true;
    this.loadSub?.unsubscribe();
    this.loadSub = this.ticketService.listAdminLinkableSms(this.data.ticketId, this.type, {
      q: this.searchQuery.trim() || undefined,
      page: this.pageIndex,
      size: this.pageSize
    }).subscribe({
      next: (page) => {
        this.items = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
        this.pageIndex = page.number ?? this.pageIndex;
        this.pageSize = page.size ?? this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.items = [];
        this.totalElements = 0;
        this.loading = false;
      }
    });
  }
}
