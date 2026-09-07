import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketService, TicketWorkloadRow } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-workload-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent,
    LocaleDigitsPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.workloadPage.eyebrow' | translate"
        [title]="'tickets.workloadPage.title' | translate"
        [subtitle]="'tickets.workloadPage.subtitle' | translate">
        <div heroActions>
          <button mat-stroked-button type="button" (click)="reload()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            {{ 'tickets.workloadPage.refresh' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <div class="panel-surface table-wrap">
          @if (loading) {
            <p class="table-empty">{{ 'tickets.workloadPage.loading' | translate }}</p>
          } @else if (!rows.length) {
            <p class="table-empty">{{ 'tickets.workloadPage.empty' | translate }}</p>
          } @else {
            <div class="table-scroll">
              <table mat-table
                     [dataSource]="rows"
                     class="mat-mdc-table workload-table"
                     [attr.aria-label]="'tickets.workloadPage.title' | translate">
                <ng-container matColumnDef="rowNumber">
                  <th mat-header-cell *matHeaderCellDef class="col-row-num">{{ 'common.rowNumber' | translate }}</th>
                  <td mat-cell *matCellDef="let row; let i = index" class="col-row-num cell-muted" dir="ltr">
                    {{ (i + 1) | localeDigits }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="agent">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.workloadPage.columns.agent' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    @if (row.agentId == null) {
                      <span class="cell-strong">{{ 'tickets.workloadPage.unassigned' | translate }}</span>
                    } @else {
                      <div class="agent-cell">
                        <span class="cell-strong">{{ row.name || row.email || '—' }}</span>
                        @if (row.email) {
                          <span class="cell-muted" dir="ltr">{{ row.email }}</span>
                        }
                      </div>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="availability">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.workloadPage.columns.availability' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    @if (row.agentId == null) {
                      <span class="cell-muted">—</span>
                    } @else if (row.available === false) {
                      <span class="status-pill pending">{{ 'tickets.workloadPage.away' | translate }}</span>
                    } @else {
                      <span class="status-pill active">{{ 'tickets.workloadPage.available' | translate }}</span>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="openCount">
                  <th mat-header-cell *matHeaderCellDef>{{ 'tickets.workloadPage.columns.openCount' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="cell-strong" dir="ltr">{{ row.openCount | localeDigits }}</span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
                <tr mat-row
                    *matRowDef="let row; columns: displayedColumns"
                    class="clickable-row"
                    (click)="openInbox(row)"
                    [matTooltip]="'tickets.workloadPage.openInboxHint' | translate"></tr>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .col-row-num {
      width: 3.5rem;
      font-variant-numeric: tabular-nums;
    }
    .agent-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .clickable-row {
      cursor: pointer;
    }
  `]
})
export class TicketWorkloadPageComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly displayedColumns = ['rowNumber', 'agent', 'availability', 'openCount'];
  rows: TicketWorkloadRow[] = [];
  loading = false;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.ticketService.listAdminWorkload().subscribe({
      next: (rows) => {
        this.rows = rows ?? [];
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 4000 });
      }
    });
  }

  openInbox(row: TicketWorkloadRow): void {
    if (row.agentId == null) {
      void this.router.navigate(['/admin/tickets/inbox'], {
        queryParams: { view: 'all', unassigned: '1' }
      });
      return;
    }
    void this.router.navigate(['/admin/tickets/inbox'], {
      queryParams: { view: 'all', assigneeId: row.agentId }
    });
  }
}
