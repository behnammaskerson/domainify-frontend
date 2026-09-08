import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import {
  TicketSavedViewDialogComponent,
  TicketSavedViewDialogResult
} from '../ticket-saved-view-dialog/ticket-saved-view-dialog.component';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketInboxSavedView, TicketService } from '../../services/ticket.service';

export interface TicketManageSavedViewsDialogData {
  views: TicketInboxSavedView[];
}

export interface TicketManageSavedViewsDialogResult {
  views: TicketInboxSavedView[];
  changed: boolean;
}

@Component({
  selector: 'app-ticket-manage-saved-views-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.adminInbox.savedViews.manageTitle' | translate }}</h2>
    <mat-dialog-content>
      @if (busy) {
        <div class="loading"><mat-spinner diameter="28"></mat-spinner></div>
      } @else if (!views.length) {
        <p class="empty">{{ 'tickets.adminInbox.savedViews.empty' | translate }}</p>
      } @else {
        <ul class="view-list">
          @for (view of views; track view.id) {
            <li>
              <div class="view-main">
                <strong>{{ view.name }}</strong>
                @if (view.isDefault) {
                  <span class="default-pill">{{ 'tickets.adminInbox.savedViews.default' | translate }}</span>
                }
              </div>
              <button mat-icon-button type="button" [matMenuTriggerFor]="menu"
                      [matTooltip]="'a11y.actions' | translate"
                      [disabled]="busy">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item type="button" (click)="rename(view)">
                  <mat-icon>edit</mat-icon>
                  {{ 'tickets.adminInbox.savedViews.rename' | translate }}
                </button>
                @if (!view.isDefault) {
                  <button mat-menu-item type="button" (click)="makeDefault(view)">
                    <mat-icon>star</mat-icon>
                    {{ 'tickets.adminInbox.savedViews.setDefault' | translate }}
                  </button>
                }
                <button mat-menu-item type="button" class="danger" (click)="remove(view)">
                  <mat-icon>delete</mat-icon>
                  {{ 'tickets.adminInbox.savedViews.delete' | translate }}
                </button>
              </mat-menu>
            </li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" (click)="close()">
        {{ 'common.close' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .loading, .empty { text-align: center; padding: 1.5rem 0; color: var(--text-muted); }
    .view-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; min-width: min(100%, 420px); }
    li {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.55rem 0.65rem; border-radius: 10px; background: var(--bg-secondary);
    }
    .view-main { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .view-main strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .default-pill {
      font-size: 0.72rem; padding: 0.1rem 0.45rem; border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 14%, var(--bg-primary));
    }
    .danger { color: #b42318; }
  `
})
export class TicketManageSavedViewsDialogComponent implements OnInit {
  private readonly data = inject<TicketManageSavedViewsDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<TicketManageSavedViewsDialogComponent, TicketManageSavedViewsDialogResult>
  );
  private readonly ticketService = inject(TicketService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);

  views: TicketInboxSavedView[] = [];
  busy = false;
  private changed = false;

  ngOnInit(): void {
    this.views = [...(this.data.views ?? [])];
  }

  close(): void {
    this.dialogRef.close({ views: this.views, changed: this.changed });
  }

  rename(view: TicketInboxSavedView): void {
    const ref = this.dialog.open(TicketSavedViewDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: ['app-dialog', 'ticket-saved-view-dialog-panel'],
      data: { mode: 'rename' as const, name: view.name, isDefault: view.isDefault }
    });
    ref.afterClosed().subscribe((result: TicketSavedViewDialogResult | null | undefined) => {
      if (!result) return;
      this.busy = true;
      this.ticketService.updateInboxSavedView(view.id, {
        name: result.name,
        filter: view.filter ?? {},
        isDefault: result.isDefault
      }).subscribe({
        next: (updated) => {
          this.busy = false;
          this.changed = true;
          this.views = this.views.map((v) => {
            if (v.id === updated.id) return updated;
            if (updated.isDefault) return { ...v, isDefault: false };
            return v;
          });
          this.snackBar.open(this.translate.instant('tickets.adminInbox.savedViews.updated'), undefined, {
            duration: 2500
          });
        },
        error: (err) => {
          this.busy = false;
          this.snackBar.open(this.apiError.resolve(err), undefined, {
            duration: 6000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  makeDefault(view: TicketInboxSavedView): void {
    this.busy = true;
    this.ticketService.setDefaultInboxSavedView(view.id).subscribe({
      next: (updated) => {
        this.busy = false;
        this.changed = true;
        this.views = this.views.map((v) => ({
          ...v,
          isDefault: v.id === updated.id
        }));
        this.snackBar.open(this.translate.instant('tickets.adminInbox.savedViews.updated'), undefined, {
          duration: 2500
        });
      },
      error: (err) => {
        this.busy = false;
        this.snackBar.open(this.apiError.resolve(err), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  remove(view: TicketInboxSavedView): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'tickets.adminInbox.savedViews.deleteTitle',
        messageKey: 'tickets.adminInbox.savedViews.deleteConfirm',
        messageParams: { name: view.name },
        confirmKey: 'tickets.adminInbox.savedViews.delete',
        confirmColor: 'warn' as const
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.busy = true;
      this.ticketService.deleteInboxSavedView(view.id).subscribe({
        next: () => {
          this.busy = false;
          this.changed = true;
          this.views = this.views.filter((v) => v.id !== view.id);
          this.snackBar.open(this.translate.instant('tickets.adminInbox.savedViews.deleted'), undefined, {
            duration: 2500
          });
        },
        error: (err) => {
          this.busy = false;
          this.snackBar.open(this.apiError.resolve(err), undefined, {
            duration: 6000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }
}
