import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { ApiErrorService } from '../../services/api-error.service';
import { KbCategory, KnowledgeBaseService } from '../../services/knowledge-base.service';

@Component({
  selector: 'app-kb-categories-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'kb.categoriesPage.eyebrow' | translate"
        [title]="'kb.categoriesPage.title' | translate"
        [subtitle]="'kb.categoriesPage.subtitle' | translate">
        <div heroActions>
          <button mat-flat-button type="button" class="hero-cta" (click)="startCreate()">
            <mat-icon>add</mat-icon>
            {{ 'kb.admin.addCategory' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <section class="panel-surface categories-card">
          @if (showForm) {
            <form class="composer" [formGroup]="form" (ngSubmit)="save()">
              <div class="composer-head">
                <h2>{{ (editingId ? 'kb.categoriesPage.editTitle' : 'kb.categoriesPage.createTitle') | translate }}</h2>
                <button mat-icon-button type="button" (click)="cancelEdit()" [matTooltip]="'common.cancel' | translate">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <div class="composer-grid">
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'kb.admin.name' | translate }}</mat-label>
                  <input matInput formControlName="name" maxlength="120">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'kb.admin.code' | translate }}</mat-label>
                  <input matInput formControlName="code" maxlength="64" dir="ltr">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'kb.categoriesPage.parent' | translate }}</mat-label>
                  <mat-select formControlName="parentId">
                    <mat-option [value]="null">{{ 'kb.categoriesPage.root' | translate }}</mat-option>
                    @for (cat of parentOptions; track cat.id) {
                      <mat-option [value]="cat.id" [disabled]="editingId === cat.id || isDescendantOfEditing(cat)">
                        <span [style.paddingInlineStart.px]="(cat.depth || 0) * 12">{{ cat.name }}</span>
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ 'kb.admin.sortOrder' | translate }}</mat-label>
                  <input matInput type="number" formControlName="sortOrder">
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>{{ 'kb.admin.description' | translate }}</mat-label>
                  <input matInput formControlName="description" maxlength="500">
                </mat-form-field>
                <div class="composer-actions">
                  <mat-slide-toggle formControlName="active" color="primary">
                    {{ 'kb.admin.active' | translate }}
                  </mat-slide-toggle>
                  <div class="spacer"></div>
                  <button mat-stroked-button type="button" (click)="cancelEdit()" [disabled]="saving">
                    {{ 'common.cancel' | translate }}
                  </button>
                  <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
                    <mat-icon>{{ editingId ? 'save' : 'add' }}</mat-icon>
                    {{ (editingId ? 'common.save' : 'kb.admin.addCategory') | translate }}
                  </button>
                </div>
              </div>
            </form>
          }

          @if (loading) {
            <p class="muted">{{ 'kb.admin.loadingCategories' | translate }}</p>
          } @else if (!categories.length) {
            <div class="empty-state">
              <mat-icon class="empty-icon" aria-hidden="true">account_tree</mat-icon>
              <h3>{{ 'kb.categoriesPage.emptyTitle' | translate }}</h3>
              <p>{{ 'kb.categoriesPage.emptySubtitle' | translate }}</p>
              <button mat-flat-button color="primary" type="button" class="empty-cta" (click)="startCreate()">
                <mat-icon>add</mat-icon>
                {{ 'kb.admin.addCategory' | translate }}
              </button>
            </div>
          } @else {
            <p class="intro">{{ 'kb.categoriesPage.intro' | translate }}</p>
            <ul class="category-list">
              @for (category of categories; track category.id) {
                <li [class.inactive]="!category.active"
                    [class.editing]="editingId === category.id"
                    [style.--depth]="category.depth || 0">
                  <div class="tree-gutter" aria-hidden="true">
                    @if ((category.depth || 0) > 0) {
                      <mat-icon class="tree-icon">subdirectory_arrow_right</mat-icon>
                    } @else {
                      <mat-icon class="tree-icon root">folder</mat-icon>
                    }
                  </div>
                  <div class="row-body">
                    <div class="row-main">
                      <div class="meta">
                        <strong>{{ category.name }}</strong>
                        <code dir="ltr">{{ category.code }}</code>
                        @if (category.parentName) {
                          <span class="parent-chip">{{ category.parentName }}</span>
                        }
                        <span class="count">
                          {{ category.articleCount || 0 }} {{ 'kb.admin.articles' | translate }}
                        </span>
                        @if (!category.active) {
                          <span class="status-pill">{{ 'kb.admin.inactive' | translate }}</span>
                        }
                      </div>
                      <div class="actions">
                        <mat-slide-toggle
                          color="primary"
                          [checked]="category.active"
                          [disabled]="busyId === category.id"
                          (change)="toggleActive(category, $event.checked)">
                          {{ 'kb.admin.active' | translate }}
                        </mat-slide-toggle>
                        <button mat-icon-button type="button"
                                [matTooltip]="'common.edit' | translate"
                                (click)="startEdit(category)"
                                [disabled]="busyId === category.id">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button type="button" class="danger"
                                [matTooltip]="'common.delete' | translate"
                                (click)="remove(category)"
                                [disabled]="busyId === category.id">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </div>
                    @if (category.description) {
                      <p class="desc">{{ category.description }}</p>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .categories-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .intro {
      margin: 0 0 16px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .muted { margin: 0; color: var(--text-muted); }

    .composer {
      margin-bottom: 20px;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--bg-secondary);
    }

    .composer-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }

    .composer-head h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.05rem;
      color: var(--text-primary);
    }

    .composer-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    }

    .composer-grid .full { grid-column: 1 / -1; }

    .composer-actions {
      grid-column: 1 / -1;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .spacer { flex: 1; }

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
      gap: 10px;
      align-items: stretch;
      padding: 12px 14px;
      padding-inline-start: calc(14px + (var(--depth) * 18px));
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--bg-primary);
      transition: border-color var(--transition-base);
    }

    .category-list li.editing {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent-light) 35%, var(--bg-primary));
    }

    .category-list li.inactive { opacity: 0.72; }

    .tree-gutter {
      display: flex;
      align-items: flex-start;
      padding-top: 2px;
    }

    .tree-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--text-muted);
    }

    .tree-icon.root { color: var(--accent); }

    .row-body { flex: 1; min-width: 0; }

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

    .meta strong {
      color: var(--text-primary);
      font-size: 0.98rem;
    }

    code {
      font-size: 0.75rem;
      color: var(--text-muted);
      background: color-mix(in srgb, var(--border-color) 40%, transparent);
      padding: 2px 7px;
      border-radius: 6px;
    }

    .parent-chip {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      background: var(--bg-secondary);
    }

    .count {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .desc {
      margin: 8px 0 0;
      font-size: 0.86rem;
      line-height: 1.45;
      color: var(--text-muted);
    }

    .danger { color: var(--error, #c62828); }

    .empty-state {
      text-align: center;
      padding: 56px 20px;
      color: var(--text-muted);
    }

    .empty-state .empty-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      margin-bottom: 12px;
      color: var(--accent);
      opacity: 0.7;
    }

    .empty-state .empty-cta mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-inline-end: 6px;
    }

    .empty-state h3 {
      margin: 0 0 8px;
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    .empty-state p {
      margin: 0 auto 20px;
      max-width: 420px;
      line-height: 1.5;
    }

    @media (max-width: 800px) {
      .composer-grid { grid-template-columns: 1fr; }
      .composer-grid .full { grid-column: auto; }
    }
  `]
})
export class KbCategoriesPageComponent implements OnInit {
  private readonly kb = inject(KnowledgeBaseService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly apiError = inject(ApiErrorService);
  private readonly dialog = inject(MatDialog);

  categories: KbCategory[] = [];
  parentOptions: KbCategory[] = [];
  loading = true;
  saving = false;
  showForm = false;
  busyId: number | null = null;
  editingId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    code: ['', [Validators.required, Validators.maxLength(64)]],
    description: [''],
    parentId: this.fb.control<number | null>(null),
    active: [true],
    sortOrder: [0]
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.kb.listAdminCategories({ flat: true }).subscribe({
      next: (rows) => {
        this.categories = rows ?? [];
        this.parentOptions = this.categories;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.toastError(error);
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.showForm = true;
    this.form.reset({
      name: '',
      code: '',
      description: '',
      parentId: null,
      active: true,
      sortOrder: 0
    });
  }

  startEdit(category: KbCategory): void {
    this.editingId = category.id;
    this.showForm = true;
    this.form.patchValue({
      name: category.name,
      code: category.code,
      description: category.description || '',
      parentId: category.parentId ?? null,
      active: category.active,
      sortOrder: category.sortOrder
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.showForm = false;
    this.form.reset({
      name: '',
      code: '',
      description: '',
      parentId: null,
      active: true,
      sortOrder: 0
    });
  }

  isDescendantOfEditing(cat: KbCategory): boolean {
    if (this.editingId == null) {
      return false;
    }
    let parentId = cat.parentId ?? null;
    const seen = new Set<number>();
    while (parentId != null && !seen.has(parentId)) {
      if (parentId === this.editingId) {
        return true;
      }
      seen.add(parentId);
      parentId = this.categories.find((c) => c.id === parentId)?.parentId ?? null;
    }
    return false;
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name.trim(),
      code: raw.code.trim(),
      description: raw.description?.trim() || null,
      parentId: raw.parentId,
      active: raw.active,
      sortOrder: Number(raw.sortOrder) || 0
    };
    this.saving = true;
    const wasEdit = this.editingId != null;
    const request$ = wasEdit
      ? this.kb.updateCategory(this.editingId!, payload)
      : this.kb.createCategory(payload);
    request$.subscribe({
      next: () => {
        this.saving = false;
        this.cancelEdit();
        this.toast(wasEdit ? 'kb.admin.categoryUpdated' : 'kb.admin.categoryCreated');
        this.reload();
      },
      error: (error) => {
        this.saving = false;
        this.toastError(error);
      }
    });
  }

  toggleActive(category: KbCategory, active: boolean): void {
    this.busyId = category.id;
    this.kb.updateCategory(category.id, {
      name: category.name,
      code: category.code,
      description: category.description ?? null,
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
        this.toastError(error);
        this.reload();
      }
    });
  }

  remove(category: KbCategory): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'kb.admin.deleteCategoryTitle',
        messageKey: 'kb.admin.deleteCategoryMessage',
        messageParams: { name: category.name },
        confirmKey: 'common.delete',
        confirmColor: 'warn' as const
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busyId = category.id;
      this.kb.deleteCategory(category.id).subscribe({
        next: () => {
          this.busyId = null;
          if (this.editingId === category.id) {
            this.cancelEdit();
          }
          this.toast('kb.admin.categoryDeleted');
          this.reload();
        },
        error: (error) => {
          this.busyId = null;
          this.toastError(error);
        }
      });
    });
  }

  private toast(key: string): void {
    this.snackBar.open(this.translate.instant(key), undefined, { duration: 3000 });
  }

  private toastError(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
  }
}
