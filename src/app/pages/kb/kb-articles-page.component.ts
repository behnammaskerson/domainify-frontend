import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { ApiErrorService } from '../../services/api-error.service';
import {
  KbArticle,
  KbCategory,
  KnowledgeBaseService,
  PagedKbArticles
} from '../../services/knowledge-base.service';

@Component({
  selector: 'app-kb-articles-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'kb.articlesPage.eyebrow' | translate"
        [title]="'kb.articlesPage.title' | translate"
        [subtitle]="'kb.articlesPage.subtitle' | translate">
        <div heroActions>
          <a mat-flat-button class="hero-cta" routerLink="/kb/admin/articles/new">
            <mat-icon>add</mat-icon>
            {{ 'kb.admin.addArticle' | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body stack">
        <div class="panel-surface filter-bar">
          <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>{{ 'kb.admin.searchArticles' | translate }}</mat-label>
            <input matInput [(ngModel)]="searchInput" (ngModelChange)="onSearch($event)"
                   [placeholder]="'kb.help.searchPlaceholder' | translate">
            @if (searchInput) {
              <button matSuffix mat-icon-button type="button" (click)="clearSearch()">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'kb.admin.category' | translate }}</mat-label>
            <mat-select [(ngModel)]="categoryId" (selectionChange)="reload(true)">
              <mat-option [value]="null">{{ 'kb.admin.allCategories' | translate }}</mat-option>
              @for (cat of categories; track cat.id) {
                <mat-option [value]="cat.id">
                  <span [style.paddingInlineStart.px]="(cat.depth || 0) * 10">{{ cat.name }}</span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'kb.admin.locale' | translate }}</mat-label>
            <mat-select [(ngModel)]="locale" (selectionChange)="reload(true)">
              <mat-option [value]="null">{{ 'kb.admin.allLocales' | translate }}</mat-option>
              @for (loc of locales; track loc) {
                <mat-option [value]="loc">{{ ('kb.admin.locales.' + loc) | translate }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'kb.admin.published' | translate }}</mat-label>
            <mat-select [(ngModel)]="published" (selectionChange)="reload(true)">
              <mat-option [value]="null">{{ 'kb.articlesPage.anyStatus' | translate }}</mat-option>
              <mat-option [value]="true">{{ 'kb.admin.publishedYes' | translate }}</mat-option>
              <mat-option [value]="false">{{ 'kb.admin.publishedNo' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <section class="panel-surface table-wrap">
          @if (loading) {
            <p class="muted pad">{{ 'kb.admin.loadingArticles' | translate }}</p>
          } @else if (paged?.content?.length) {
            <div class="table-scroll">
              <table mat-table [dataSource]="paged!.content" class="articles-table">
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>{{ 'kb.admin.titleField' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="title-cell">
                      <strong>{{ row.title }}</strong>
                      <span class="slug" dir="ltr">{{ row.slug }}</span>
                      @if (row.summary) {
                        <span class="summary">{{ row.summary }}</span>
                      }
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="category">
                  <th mat-header-cell *matHeaderCellDef>{{ 'kb.admin.category' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="category-chip">{{ row.categoryName || '—' }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="locale">
                  <th mat-header-cell *matHeaderCellDef>{{ 'kb.admin.locale' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="status-pill">{{ row.locale }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="published">
                  <th mat-header-cell *matHeaderCellDef>{{ 'kb.admin.published' | translate }}</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="status-pill" [class.active]="row.published" [class.pending]="!row.published">
                      {{ (row.published ? 'kb.admin.publishedYes' : 'kb.admin.publishedNo') | translate }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <a mat-icon-button
                       [routerLink]="['/kb/admin/articles', row.id, 'edit']"
                       [matTooltip]="'common.edit' | translate">
                      <mat-icon>edit</mat-icon>
                    </a>
                    <button mat-icon-button type="button" class="danger"
                            [matTooltip]="'common.delete' | translate"
                            (click)="deleteArticle(row)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns;"></tr>
              </table>
            </div>

            <mat-paginator
              [length]="paged!.totalElements"
              [pageSize]="pageSize"
              [pageIndex]="pageIndex"
              [pageSizeOptions]="[10, 20, 50]"
              (page)="onPage($event)">
            </mat-paginator>
          } @else {
            <div class="empty-state">
              <mat-icon class="empty-icon" aria-hidden="true">article</mat-icon>
              <h3>{{ 'kb.articlesPage.emptyTitle' | translate }}</h3>
              <p>{{ 'kb.articlesPage.emptySubtitle' | translate }}</p>
              <a mat-flat-button color="primary" class="empty-cta" routerLink="/kb/admin/articles/new">
                <mat-icon>add</mat-icon>
                {{ 'kb.admin.addArticle' | translate }}
              </a>
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .filter-bar {
      display: grid;
      grid-template-columns: minmax(180px, 1.4fr) repeat(3, minmax(140px, 1fr));
      gap: 12px;
      padding: 16px;
      align-items: center;
    }

    .search-field { width: 100%; }

    .pad { padding: 20px; }
    .muted { margin: 0; color: var(--text-muted); }

    .title-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding-block: 6px;
    }

    .title-cell strong {
      color: var(--text-primary);
    }

    .slug {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .summary {
      font-size: 0.84rem;
      color: var(--text-secondary);
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .category-chip {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-size: 0.82rem;
      white-space: nowrap;
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

    @media (max-width: 960px) {
      .filter-bar {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 640px) {
      .filter-bar {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class KbArticlesPageComponent implements OnInit {
  private readonly kb = inject(KnowledgeBaseService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly apiError = inject(ApiErrorService);
  private readonly search$ = new Subject<string>();

  categories: KbCategory[] = [];
  paged: PagedKbArticles | null = null;
  columns = ['title', 'category', 'locale', 'published', 'actions'];
  locales = ['en', 'fa', 'ar', 'tr', 'all'];

  loading = true;
  searchInput = '';
  categoryId: number | null = null;
  locale: string | null = null;
  published: boolean | null = null;
  pageIndex = 0;
  pageSize = 20;

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.reload(true));
    this.kb.listAdminCategories({ flat: true }).subscribe({
      next: (cats) => (this.categories = cats ?? []),
      error: (e) => this.toastError(e)
    });
    this.reload();
  }

  onSearch(value: string): void {
    this.search$.next(value ?? '');
  }

  clearSearch(): void {
    this.searchInput = '';
    this.reload(true);
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.reload();
  }

  reload(resetPage = false): void {
    if (resetPage) {
      this.pageIndex = 0;
    }
    this.loading = true;
    this.kb.listAdminArticles({
      q: this.searchInput,
      categoryId: this.categoryId,
      locale: this.locale,
      published: this.published,
      page: this.pageIndex,
      size: this.pageSize
    }).subscribe({
      next: (page) => {
        this.paged = page;
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.toastError(e);
      }
    });
  }

  deleteArticle(row: KbArticle): void {
    if (!row.id) {
      return;
    }
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'kb.admin.deleteArticleTitle',
        messageKey: 'kb.admin.deleteArticleMessage',
        messageParams: { title: row.title },
        confirmKey: 'common.delete',
        confirmColor: 'warn' as const
      }
    }).afterClosed().subscribe((ok) => {
      if (!ok || !row.id) {
        return;
      }
      this.kb.deleteArticle(row.id).subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('kb.admin.articleDeleted'), undefined, { duration: 3000 });
          this.reload();
        },
        error: (e) => this.toastError(e)
      });
    });
  }

  private toastError(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
  }
}
