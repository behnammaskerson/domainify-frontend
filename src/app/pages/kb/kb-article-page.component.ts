import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { TranslationService } from '../../services/translation.service';
import { KbArticle, KnowledgeBaseService } from '../../services/knowledge-base.service';

@Component({
  selector: 'app-kb-article-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent,
    MarkdownPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="article?.categoryName || ('kb.help.eyebrow' | translate)"
        [title]="loading
          ? ('kb.article.loading' | translate)
          : (article?.title || ('kb.article.notFoundTitle' | translate))"
        [subtitle]="article?.summary || ''">
        <div heroActions>
          <a mat-stroked-button routerLink="/help">
            <mat-icon>arrow_back</mat-icon>
            {{ 'kb.article.back' | translate }}
          </a>
          <a mat-flat-button class="hero-cta" routerLink="/tickets/new">
            <mat-icon>support_agent</mat-icon>
            {{ 'kb.help.createTicket' | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body stack">
        @if (loading) {
          <section class="panel-surface reader-card">
            <p class="muted">{{ 'kb.article.loading' | translate }}</p>
          </section>
        } @else if (article) {
          <div class="panel-surface meta-bar">
            <div class="meta-item">
              <mat-icon>folder</mat-icon>
              <span>{{ article.categoryName }}</span>
            </div>
            <div class="meta-item" dir="ltr">
              <mat-icon>language</mat-icon>
              <span>{{ article.locale }}</span>
            </div>
            @if (article.updatedAt) {
              <div class="meta-item">
                <mat-icon>update</mat-icon>
                <span>{{ article.updatedAt | date: 'mediumDate' }}</span>
              </div>
            }
          </div>

          <article class="panel-surface reader-card">
            <div class="body" [innerHTML]="article.body || '' | markdown"></div>
          </article>

          <section class="panel-surface support-card">
            <div class="support-copy">
              <h2>{{ 'kb.article.stillNeedHelpTitle' | translate }}</h2>
              <p>{{ 'kb.article.stillNeedHelpSubtitle' | translate }}</p>
            </div>
            <a mat-flat-button color="primary" routerLink="/tickets/new">
              <mat-icon>support_agent</mat-icon>
              {{ 'kb.help.contactSupport' | translate }}
            </a>
          </section>
        } @else {
          <section class="panel-surface reader-card">
            <div class="empty-state">
              <mat-icon class="empty-icon" aria-hidden="true">search_off</mat-icon>
              <h3>{{ 'kb.article.notFoundTitle' | translate }}</h3>
              <p>{{ 'kb.article.notFound' | translate }}</p>
              <a mat-flat-button color="primary" routerLink="/help" class="empty-cta">
                <mat-icon>arrow_back</mat-icon>
                {{ 'kb.article.backToHelp' | translate }}
              </a>
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 14px 22px;
      padding: 14px 18px;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      font-size: 0.88rem;
      font-weight: 500;
    }

    .meta-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--accent);
    }

    .reader-card {
      padding: 28px 32px;
      max-width: 860px;
      width: 100%;
      box-sizing: border-box;
    }

    .muted { margin: 0; color: var(--text-muted); }

    .body {
      color: var(--text-primary);
      line-height: 1.7;
      font-size: 1.02rem;
    }

    .body :is(h1, h2, h3) {
      margin-top: 1.35em;
      margin-bottom: 0.45em;
      font-family: var(--font-display);
      line-height: 1.25;
    }

    .body p { margin: 0 0 1em; }

    .body ul, .body ol {
      margin: 0 0 1em;
      padding-inline-start: 1.35em;
    }

    .body a { color: var(--accent-dark); }

    body.dark-theme .body a { color: var(--accent); }

    .body pre, .body code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.92em;
    }

    .body pre {
      padding: 14px;
      overflow-x: auto;
      border-radius: var(--radius-md);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
    }

    .body code:not(pre code) {
      padding: 1px 6px;
      border-radius: 6px;
      background: var(--bg-secondary);
    }

    .support-card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px;
      max-width: 860px;
    }

    .support-copy h2 {
      margin: 0 0 6px;
      font-family: var(--font-display);
      font-size: 1.15rem;
      color: var(--text-primary);
    }

    .support-copy p {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .support-card a mat-icon {
      margin-inline-end: 6px;
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

    @media (max-width: 700px) {
      .reader-card { padding: 20px; }
    }
  `]
})
export class KbArticlePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly kb = inject(KnowledgeBaseService);
  private readonly translation = inject(TranslationService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);

  article: KbArticle | null = null;
  loading = true;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.loading = false;
        this.article = null;
        return;
      }
      this.loading = true;
      const locale = this.translation.currentLang();
      this.kb.getPublicArticleBySlug(slug, locale).subscribe({
        next: (article) => {
          this.article = article;
          this.loading = false;
        },
        error: (e) => {
          this.article = null;
          this.loading = false;
          this.snackBar.open(this.apiError.resolve(e), undefined, { duration: 5000 });
        }
      });
    });
  }
}
