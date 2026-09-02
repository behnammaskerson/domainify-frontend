import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ApiErrorService } from '../../services/api-error.service';
import { TicketCategory, TicketService } from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-categories-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  template: `
    <div class="categories-panel">
      @if (loading) {
        <p class="muted">{{ 'settings.ticketCategories.loading' | translate }}</p>
      } @else {
        <form class="add-row" [formGroup]="form" (ngSubmit)="addCategory()">
          <mat-form-field appearance="outline" class="name-field">
            <mat-label>{{ 'settings.ticketCategories.name' | translate }}</mat-label>
            <input matInput formControlName="name" maxlength="100">
          </mat-form-field>
          <mat-form-field appearance="outline" class="code-field">
            <mat-label>{{ 'settings.ticketCategories.code' | translate }}</mat-label>
            <input matInput formControlName="code" maxlength="64">
            <mat-hint>{{ 'settings.ticketCategories.codeHint' | translate }}</mat-hint>
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
            <mat-icon>add</mat-icon>
            {{ 'settings.ticketCategories.add' | translate }}
          </button>
        </form>

        <ul class="category-list">
          @for (category of categories; track category.id) {
            <li [class.inactive]="!category.active">
              <div class="meta">
                <strong>{{ category.name }}</strong>
                <code dir="ltr">{{ category.code }}</code>
                @if (!category.active) {
                  <span class="badge">{{ 'settings.ticketCategories.inactive' | translate }}</span>
                }
              </div>
              <div class="actions">
                <mat-slide-toggle
                  color="primary"
                  [checked]="category.active"
                  [disabled]="busyId === category.id"
                  (change)="toggleActive(category, $event.checked)">
                </mat-slide-toggle>
                <button mat-icon-button
                        type="button"
                        [disabled]="busyId === category.id"
                        [attr.aria-label]="'common.delete' | translate"
                        (click)="confirmRemove(category)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </li>
          } @empty {
            <li class="empty">{{ 'settings.ticketCategories.empty' | translate }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .categories-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .add-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-start;
    }

    .name-field {
      flex: 1 1 220px;
    }

    .code-field {
      flex: 1 1 160px;
    }

    .category-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .category-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-primary);
    }

    .category-list li.inactive {
      opacity: 0.7;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .meta code {
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--bg-secondary);
      font-size: 0.8rem;
    }

    .badge {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--warning-light, #fff3cd);
      color: var(--warning, #856404);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .empty,
    .muted {
      color: var(--text-muted);
    }
  `]
})
export class TicketCategoriesSettingsComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  categories: TicketCategory[] = [];
  loading = true;
  saving = false;
  busyId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    code: ['', [Validators.maxLength(64)]]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.ticketService.listAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  addCategory(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    this.saving = true;
    this.ticketService.createCategory({
      name: raw.name.trim(),
      code: raw.code.trim() || undefined,
      active: true
    }).subscribe({
      next: () => {
        this.saving = false;
        this.form.reset({ name: '', code: '' });
        this.snack(this.translate.instant('settings.ticketCategories.added'));
        this.load();
      },
      error: (error) => {
        this.saving = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  toggleActive(category: TicketCategory, active: boolean): void {
    this.busyId = category.id;
    this.ticketService.updateCategory(category.id, {
      name: category.name,
      code: category.code,
      active,
      sortOrder: category.sortOrder
    }).subscribe({
      next: () => {
        this.busyId = null;
        this.load();
      },
      error: (error) => {
        this.busyId = null;
        this.showError(this.apiError.resolve(error));
        this.load();
      }
    });
  }

  confirmRemove(category: TicketCategory): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: {
        titleKey: 'settings.ticketCategories.removeTitle',
        messageKey: 'settings.ticketCategories.removeMessage',
        messageParams: { name: category.name },
        confirmKey: 'common.delete',
        confirmColor: 'warn'
      }
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.remove(category);
      }
    });
  }

  private remove(category: TicketCategory): void {
    this.busyId = category.id;
    this.ticketService.deleteCategory(category.id).subscribe({
      next: () => {
        this.busyId = null;
        this.snack(this.translate.instant('settings.ticketCategories.removed'));
        this.load();
      },
      error: (error) => {
        this.busyId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private snack(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
