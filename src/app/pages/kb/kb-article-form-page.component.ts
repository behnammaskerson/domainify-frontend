import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ApiErrorService } from '../../services/api-error.service';
import { KbCategory, KnowledgeBaseService } from '../../services/knowledge-base.service';

@Component({
  selector: 'app-kb-article-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'kb.articlesPage.eyebrow' | translate"
        [title]="(isEditing ? 'kb.admin.editArticle' : 'kb.admin.createArticle') | translate"
        [subtitle]="(isEditing ? 'kb.articleForm.editSubtitle' : 'kb.articleForm.createSubtitle') | translate">
        <div heroActions>
          <a mat-stroked-button routerLink="/kb/admin/articles">
            <mat-icon>arrow_back</mat-icon>
            {{ 'kb.articleForm.backToList' | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body">
        <section class="panel-surface form-card">
          @if (loading) {
            <p class="muted">{{ 'common.loading' | translate }}</p>
          } @else if (loadError) {
            <div class="empty-state">
              <mat-icon class="empty-icon" aria-hidden="true">error_outline</mat-icon>
              <h3>{{ 'kb.articleForm.loadErrorTitle' | translate }}</h3>
              <p>{{ 'kb.articleForm.loadErrorSubtitle' | translate }}</p>
              <a mat-flat-button color="primary" routerLink="/kb/admin/articles">
                <mat-icon>arrow_back</mat-icon>
                {{ 'kb.articleForm.backToList' | translate }}
              </a>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="save()">
              <div class="grid">
                <mat-form-field appearance="outline" class="full">
                  <mat-label>{{ 'kb.admin.titleField' | translate }}</mat-label>
                  <input matInput formControlName="title" (blur)="maybeFillSlug()" maxlength="200">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'kb.admin.slug' | translate }}</mat-label>
                  <input matInput formControlName="slug" maxlength="160" dir="ltr">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'kb.admin.category' | translate }}</mat-label>
                  <mat-select formControlName="categoryId">
                    @for (cat of categories; track cat.id) {
                      <mat-option [value]="cat.id">
                        <span [style.paddingInlineStart.px]="(cat.depth || 0) * 12">{{ cat.name }}</span>
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>{{ 'kb.admin.locale' | translate }}</mat-label>
                  <mat-select formControlName="locale">
                    @for (loc of locales; track loc) {
                      <mat-option [value]="loc">{{ ('kb.admin.locales.' + loc) | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="narrow">
                  <mat-label>{{ 'kb.admin.sortOrder' | translate }}</mat-label>
                  <input matInput type="number" formControlName="sortOrder">
                </mat-form-field>

                <div class="toggle-row">
                  <mat-slide-toggle formControlName="published" color="primary">
                    {{ 'kb.admin.published' | translate }}
                  </mat-slide-toggle>
                </div>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>{{ 'kb.admin.summary' | translate }}</mat-label>
                  <input matInput formControlName="summary" maxlength="500">
                </mat-form-field>

                <mat-form-field appearance="outline" class="full body-field">
                  <mat-label>{{ 'kb.admin.body' | translate }}</mat-label>
                  <textarea matInput rows="14" formControlName="body"></textarea>
                </mat-form-field>
              </div>

              <div class="actions">
                <a mat-stroked-button routerLink="/kb/admin/articles" [attr.disabled]="saving ? true : null">
                  {{ 'common.cancel' | translate }}
                </a>
                <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
                  <mat-icon>{{ isEditing ? 'save' : 'add' }}</mat-icon>
                  {{ (isEditing ? 'common.save' : 'kb.admin.addArticle') | translate }}
                </button>
              </div>
            </form>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .form-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .muted { margin: 0; color: var(--text-muted); }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      align-items: start;
    }

    .full { grid-column: 1 / -1; }
    .narrow { max-width: 140px; }

    .toggle-row {
      display: flex;
      align-items: center;
      min-height: 56px;
    }

    .body-field textarea {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .actions button mat-icon,
    .empty-state a mat-icon {
      margin-inline-end: 6px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 16px;
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

    .empty-state h3 {
      margin: 0 0 8px;
      color: var(--text-primary);
      font-family: var(--font-display);
    }

    .empty-state p {
      margin: 0 auto 18px;
      max-width: 420px;
      line-height: 1.5;
    }

    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; }
      .full { grid-column: auto; }
      .actions { justify-content: stretch; }
      .actions > * { flex: 1; }
    }
  `]
})
export class KbArticleFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly kb = inject(KnowledgeBaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly locales = ['en', 'fa', 'ar', 'tr', 'all'];
  categories: KbCategory[] = [];
  isEditing = false;
  loading = true;
  loadError = false;
  saving = false;
  private articleId: number | null = null;

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    slug: ['', Validators.required],
    summary: [''],
    body: ['', Validators.required],
    locale: ['en', Validators.required],
    categoryId: this.fb.nonNullable.control<number | null>(null, Validators.required),
    published: [false],
    sortOrder: [0]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (!Number.isFinite(id) || id <= 0) {
        this.loading = false;
        this.loadError = true;
        return;
      }
      this.isEditing = true;
      this.articleId = id;
      this.loadForEdit(id);
    } else {
      this.loadForCreate();
    }
  }

  maybeFillSlug(): void {
    const slug = this.form.controls.slug.value?.trim();
    const title = this.form.controls.title.value?.trim();
    if (!slug && title) {
      this.form.controls.slug.setValue(this.slugify(title));
    }
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      title: raw.title.trim(),
      slug: raw.slug.trim() || this.slugify(raw.title),
      summary: raw.summary?.trim() || null,
      body: raw.body.trim(),
      locale: raw.locale,
      categoryId: Number(raw.categoryId),
      published: raw.published,
      sortOrder: Number(raw.sortOrder) || 0
    };
    this.saving = true;
    const req$ = this.articleId
      ? this.kb.updateArticle(this.articleId, payload)
      : this.kb.createArticle(payload);
    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open(
          this.translate.instant(this.articleId ? 'kb.admin.articleUpdated' : 'kb.admin.articleCreated'),
          undefined,
          { duration: 3000 }
        );
        void this.router.navigate(['/kb/admin/articles']);
      },
      error: (e) => {
        this.saving = false;
        this.toastError(e);
      }
    });
  }

  private loadForCreate(): void {
    this.kb.listAdminCategories({ flat: true }).subscribe({
      next: (cats) => {
        this.categories = cats ?? [];
        this.form.patchValue({ categoryId: this.categories[0]?.id ?? null });
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.loadError = true;
        this.toastError(e);
      }
    });
  }

  private loadForEdit(id: number): void {
    this.kb.listAdminCategories({ flat: true }).subscribe({
      next: (cats) => {
        this.categories = cats ?? [];
        this.kb.getAdminArticle(id).subscribe({
          next: (article) => {
            this.form.patchValue({
              title: article.title,
              slug: article.slug,
              summary: article.summary || '',
              body: article.body || '',
              locale: article.locale,
              categoryId: article.categoryId,
              published: article.published,
              sortOrder: article.sortOrder
            });
            this.loading = false;
          },
          error: (e) => {
            this.loading = false;
            this.loadError = true;
            this.toastError(e);
          }
        });
      },
      error: (e) => {
        this.loading = false;
        this.loadError = true;
        this.toastError(e);
      }
    });
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private toastError(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
  }
}
