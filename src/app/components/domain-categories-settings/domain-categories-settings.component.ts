import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ApiErrorService } from '../../services/api-error.service';
import { DomainCategory, DomainsService } from '../../services/domains.service';

@Component({
  selector: 'app-domain-categories-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  template: `
    <div class="categories-panel">
      @if (loading) {
        <p class="muted">{{ 'settings.domainCategories.loading' | translate }}</p>
      } @else {
        <p class="intro">{{ 'settings.domainCategories.intro' | translate }}</p>

        <form class="add-row" [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="name-field">
            <mat-label>{{ 'settings.domainCategories.name' | translate }}</mat-label>
            <input matInput formControlName="name" maxlength="100">
          </mat-form-field>
          <mat-form-field appearance="outline" class="code-field">
            <mat-label>{{ 'settings.domainCategories.code' | translate }}</mat-label>
            <input matInput formControlName="code" maxlength="64">
            <mat-hint>{{ 'settings.domainCategories.codeHint' | translate }}</mat-hint>
          </mat-form-field>
          <mat-form-field appearance="outline" class="parent-field">
            <mat-label>{{ 'settings.domainCategories.parent' | translate }}</mat-label>
            <mat-select formControlName="parentId">
              <mat-option [value]="null">{{ 'settings.domainCategories.root' | translate }}</mat-option>
              @for (cat of parentOptions; track cat.id) {
                <mat-option [value]="cat.id" [disabled]="editingId === cat.id">
                  <span [style.paddingInlineStart.px]="(cat.depth || 0) * 12">{{ cat.name }}</span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
            <mat-icon>{{ editingId ? 'save' : 'add' }}</mat-icon>
            {{ (editingId ? 'common.save' : 'settings.domainCategories.add') | translate }}
          </button>
          @if (editingId) {
            <button mat-stroked-button type="button" (click)="cancelEdit()" [disabled]="saving">
              {{ 'common.cancel' | translate }}
            </button>
          }
        </form>

        <ul class="category-list">
          @for (category of categories; track category.id) {
            <li [class.inactive]="!category.active" [style.paddingInlineStart.px]="(category.depth || 0) * 20 + 8">
              <div class="row-main">
                <div class="meta">
                  @if ((category.depth || 0) > 0) {
                    <mat-icon class="tree-icon" aria-hidden="true">subdirectory_arrow_right</mat-icon>
                  }
                  <strong>{{ category.name }}</strong>
                  <code dir="ltr">{{ category.code }}</code>
                  @if (!category.active) {
                    <span class="badge">{{ 'settings.domainCategories.inactive' | translate }}</span>
                  }
                </div>
                <div class="actions">
                  <mat-slide-toggle
                    color="primary"
                    [checked]="category.active"
                    [disabled]="busyId === category.id"
                    (change)="toggleActive(category, $event.checked)">
                    {{ 'settings.domainCategories.active' | translate }}
                  </mat-slide-toggle>
                  <button mat-icon-button type="button" (click)="startEdit(category)" [disabled]="busyId === category.id">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button type="button" color="warn" (click)="remove(category)" [disabled]="busyId === category.id">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </li>
          } @empty {
            <li class="empty">{{ 'settings.domainCategories.empty' | translate }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .intro { margin: 0 0 16px; color: var(--text-muted); }
    .muted { color: var(--text-muted); }
    .add-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .name-field { flex: 1 1 180px; }
    .code-field { flex: 1 1 140px; }
    .parent-field { flex: 1 1 180px; }
    .category-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .category-list li {
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 10px 12px;
      background: color-mix(in srgb, var(--bg-primary) 80%, transparent);
    }
    .category-list li.inactive { opacity: 0.7; }
    .row-main {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .tree-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); }
    code {
      font-size: 0.78rem;
      color: var(--text-muted);
      background: color-mix(in srgb, var(--border-color) 40%, transparent);
      padding: 2px 6px;
      border-radius: 6px;
    }
    .badge {
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: color-mix(in srgb, #64748b 16%, transparent);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }
    .empty { text-align: center; color: var(--text-muted); border-style: dashed !important; }
  `]
})
export class DomainCategoriesSettingsComponent implements OnInit {
  private readonly domainsService = inject(DomainsService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly apiError = inject(ApiErrorService);
  private readonly dialog = inject(MatDialog);

  categories: DomainCategory[] = [];
  parentOptions: DomainCategory[] = [];
  loading = true;
  saving = false;
  busyId: number | null = null;
  editingId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    code: [''],
    parentId: this.fb.control<number | null>(null)
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.domainsService.listAdminCategoriesFlat(false).subscribe({
      next: (rows) => {
        this.categories = rows ?? [];
        this.parentOptions = this.categories;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(error);
      }
    });
  }

  startEdit(category: DomainCategory): void {
    this.editingId = category.id;
    this.form.patchValue({
      name: category.name,
      code: category.code,
      parentId: category.parentId ?? null
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ name: '', code: '', parentId: null });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name.trim(),
      code: raw.code?.trim() || undefined,
      parentId: raw.parentId,
      active: true
    };
    this.saving = true;
    const wasEdit = this.editingId != null;
    const request$ = wasEdit
      ? this.domainsService.updateCategory(this.editingId!, payload)
      : this.domainsService.createCategory(payload);
    request$.subscribe({
      next: () => {
        this.saving = false;
        this.cancelEdit();
        this.snackBar.open(
          this.translate.instant(wasEdit ? 'settings.domainCategories.updated' : 'settings.domainCategories.created'),
          undefined,
          { duration: 2500 }
        );
        this.reload();
      },
      error: (error) => {
        this.saving = false;
        this.showError(error);
      }
    });
  }

  toggleActive(category: DomainCategory, active: boolean): void {
    this.busyId = category.id;
    this.domainsService.updateCategory(category.id, {
      name: category.name,
      code: category.code,
      parentId: category.parentId ?? null,
      active,
      sortOrder: category.sortOrder
    }).subscribe({
      next: () => {
        this.busyId = null;
        this.reload();
      },
      error: (error) => {
        this.busyId = null;
        this.showError(error);
        this.reload();
      }
    });
  }

  remove(category: DomainCategory): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'settings.domainCategories.deleteTitle',
        messageKey: 'settings.domainCategories.deleteConfirm',
        messageParams: { name: category.name },
        confirmKey: 'common.delete',
        confirmColor: 'warn' as const
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busyId = category.id;
      this.domainsService.deleteCategory(category.id).subscribe({
        next: () => {
          this.busyId = null;
          if (this.editingId === category.id) {
            this.cancelEdit();
          }
          this.snackBar.open(this.translate.instant('settings.domainCategories.deleted'), undefined, { duration: 2500 });
          this.reload();
        },
        error: (error) => {
          this.busyId = null;
          this.showError(error);
        }
      });
    });
  }

  private showError(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
