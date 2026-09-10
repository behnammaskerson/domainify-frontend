import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ApiErrorService } from '../../services/api-error.service';
import { TranslationService } from '../../services/translation.service';
import { KbArticle, KbCategory, KnowledgeBaseService } from '../../services/knowledge-base.service';

@Component({
  selector: 'app-kb-help-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'kb.help.eyebrow' | translate"
        [title]="'kb.help.title' | translate"
        [subtitle]="'kb.help.subtitle' | translate">
        <div heroActions>
          <mat-form-field appearance="outline" class="hero-search" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>{{ 'kb.help.search' | translate }}</mat-label>
            <input matInput [(ngModel)]="searchInput" (ngModelChange)="onSearch($event)"
                   [placeholder]="'kb.help.searchPlaceholder' | translate">
            @if (searchInput) {
              <button matSuffix mat-icon-button type="button" (click)="clearSearch()">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>
          <a mat-stroked-button routerLink="/tickets/new">
            <mat-icon>support_agent</mat-icon>
            {{ 'kb.help.createTicket' | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body stack">
        <div class="panel-surface filter-bar">
          <div class="filter-label">{{ 'kb.help.filterByCategory' | translate }}</div>
          <div class="filter-tabs" role="tablist">
            <button type="button" class="filter-tab" [class.active]="!selectedCategoryId"
                    (click)="selectCategory(null)">
              {{ 'kb.help.allCategories' | translate }}
            </button>
            @for (cat of categories; track cat.id) {
              <button type="button" class="filter-tab"
                      [class.active]="selectedCategoryId === cat.id"
                      [style.marginInlineStart.px]="(cat.depth || 0) * 8"
                      (click)="selectCategory(cat.id)">
                {{ cat.name }}
                @if (cat.articleCount) {
                  <span class="count">{{ cat.articleCount }}</span>
                }
              </button>
            }
          </div>
        </div>

        <section class="panel-surface results-card">
          <div class="section-header">
            <div>
              <h2 class="section-title">{{ 'kb.help.resultsTitle' | translate }}</h2>
              <p class="section-subtitle">
                {{ (searchInput || selectedCategoryId
                    ? 'kb.help.resultsFiltered'
                    : 'kb.help.resultsAll') | translate }}
              </p>
            </div>
          </div>

          @if (loading) {
            <p class="muted">{{ 'kb.help.loading' | translate }}</p>
          } @else if (!articles.length) {
            <div class="empty-state">
              <mat-icon class="empty-icon" aria-hidden="true">menu_book</mat-icon>
              <h3>{{ 'kb.help.emptyTitle' | translate }}</h3>
              <p>{{ 'kb.help.empty' | translate }}</p>
              <a mat-stroked-button routerLink="/tickets/new" class="empty-cta">
                <mat-icon>support_agent</mat-icon>
                {{ 'kb.help.contactSupport' | translate }}
              </a>
            </div>
          } @else {
            <div class="listing-grid">
              @for (article of articles; track article.id) {
                <a [routerLink]="['/help', article.slug]" class="listing-tile article-tile">
                  <div class="tile-top">
                    <span class="category-chip">{{ article.categoryName || ('kb.help.eyebrow' | translate) }}</span>
                    <span class="locale-chip" dir="ltr">{{ article.locale }}</span>
                  </div>
                  <h3>{{ article.title }}</h3>
                  @if (article.summary) {
                    <p class="listing-desc">{{ article.summary }}</p>
                  }
                  <span class="read-more">
                    {{ 'kb.help.readMore' | translate }}
                    <mat-icon>arrow_forward</mat-icon>
                  </span>
                </a>
              }
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
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .filter-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .results-card {
      padding: 20px;
    }

    .muted { color: var(--text-muted); margin: 0; }

    .article-tile {
      text-decoration: none;
      color: inherit;
      min-height: 160px;
    }

    .tile-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .category-chip,
    .locale-chip {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      background: var(--bg-secondary);
    }

    .locale-chip {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      text-transform: uppercase;
    }

    .read-more {
      margin-top: auto;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--accent-dark);
    }

    .read-more mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    body.dark-theme .read-more {
      color: var(--accent);
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

    .empty-cta mat-icon {
      margin-inline-end: 6px;
    }

    @media (max-width: 960px) {
      .listing-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .listing-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class KbHelpPageComponent implements OnInit {
  private readonly kb = inject(KnowledgeBaseService);
  private readonly translation = inject(TranslationService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly search$ = new Subject<string>();

  categories: KbCategory[] = [];
  articles: KbArticle[] = [];
  selectedCategoryId: number | null = null;
  searchInput = '';
  loading = true;

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.loadArticles());
    this.loadCategories();
    this.loadArticles();
  }

  onSearch(value: string): void {
    this.search$.next(value ?? '');
  }

  clearSearch(): void {
    this.searchInput = '';
    this.loadArticles();
  }

  selectCategory(id: number | null): void {
    this.selectedCategoryId = id;
    this.loadArticles();
  }

  private locale(): string {
    return this.translation.currentLang();
  }

  private loadCategories(): void {
    this.kb.listPublicCategories(this.locale()).subscribe({
      next: (cats) => (this.categories = cats ?? []),
      error: (e) => this.snackBar.open(this.apiError.resolve(e), undefined, { duration: 5000 })
    });
  }

  private loadArticles(): void {
    this.loading = true;
    this.kb.searchPublicArticles({
      q: this.searchInput,
      categoryId: this.selectedCategoryId,
      locale: this.locale(),
      size: 50
    }).subscribe({
      next: (page) => {
        this.articles = page.content ?? [];
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.snackBar.open(this.apiError.resolve(e), undefined, { duration: 5000 });
      }
    });
  }
}
