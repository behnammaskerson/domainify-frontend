import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { OfferDialogComponent } from '../../components/offer-dialog/offer-dialog.component';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleCurrencyPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { AuthService } from '../../services/auth.service';
import { DomainListing, ListingsService } from '../../services/listings.service';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'marketplace.eyebrow' | translate"
        [title]="'marketplace.title' | translate"
        [subtitle]="'marketplace.subtitle' | translate">
        <a mat-stroked-button type="button" class="hero-cta" routerLink="/marketplace/my-listings">
          <mat-icon>sell</mat-icon>
          {{ 'marketplace.myListings' | translate }}
        </a>
        <a mat-stroked-button type="button" class="hero-cta" routerLink="/marketplace/my-offers">
          <mat-icon>handshake</mat-icon>
          {{ 'marketplace.myOffers' | translate }}
        </a>
      </app-page-hero>

      <div class="page-body">
        <div class="toolbar-row">
          <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <mat-label>{{ 'marketplace.search' | translate }}</mat-label>
            <input matInput [(ngModel)]="search" (keyup.enter)="reload()">
          </mat-form-field>
          <button mat-flat-button color="primary" type="button" (click)="reload()">
            {{ 'common.search' | translate }}
          </button>
        </div>

        @if (loading) {
          <div class="loading-wrap">
            <mat-spinner diameter="36"></mat-spinner>
          </div>
        } @else {
          @if (featured.length) {
            <section class="section">
              <h2 class="section-title">{{ 'marketplace.featured' | translate }}</h2>
              <p class="section-subtitle">{{ 'marketplace.featuredSubtitle' | translate }}</p>
              <div class="listing-grid stagger-children">
                @for (item of featured; track item.id) {
                  <article class="listing-tile featured">
                    <h3 dir="ltr">{{ item.domainName }}</h3>
                    @if (item.description) {
                      <p class="listing-desc">{{ item.description }}</p>
                    }
                    <div class="listing-tags">
                      @if (item.categoryName) {
                        <span class="listing-tag">{{ item.categoryName }}</span>
                      }
                      <span class="listing-tag">{{ 'marketplace.tags.premium' | translate }}</span>
                    </div>
                    <div class="listing-footer">
                      <span class="listing-price">{{ item.askingPrice | localeCurrency }}</span>
                      @if (item.sellerName) {
                        <span class="seller">{{ item.sellerName }}</span>
                      }
                    </div>
                    @if (canOffer(item)) {
                      <button mat-stroked-button type="button" class="offer-btn" (click)="makeOffer(item)">
                        <mat-icon>handshake</mat-icon>
                        {{ 'marketplace.makeOffer' | translate }}
                      </button>
                    }
                  </article>
                }
              </div>
            </section>
          }

          <section class="section">
            <h2 class="section-title">{{ 'marketplace.recentlyAdded' | translate }}</h2>
            <p class="section-subtitle">{{ 'marketplace.recentSubtitle' | translate }}</p>
            @if (!recent.length) {
              <div class="empty-state">{{ 'marketplace.empty' | translate }}</div>
            } @else {
              <div class="listing-grid stagger-children">
                @for (item of recent; track item.id) {
                  <article class="listing-tile">
                    <h3 dir="ltr">{{ item.domainName }}</h3>
                    @if (item.description) {
                      <p class="listing-desc">{{ item.description }}</p>
                    }
                    <div class="listing-tags">
                      @if (item.categoryName) {
                        <span class="listing-tag">{{ item.categoryName }}</span>
                      }
                    </div>
                    <div class="listing-footer">
                      <span class="listing-price">{{ item.askingPrice | localeCurrency }}</span>
                      @if (item.sellerName) {
                        <span class="seller">{{ item.sellerName }}</span>
                      }
                    </div>
                    @if (canOffer(item)) {
                      <button mat-stroked-button type="button" class="offer-btn" (click)="makeOffer(item)">
                        <mat-icon>handshake</mat-icon>
                        {{ 'marketplace.makeOffer' | translate }}
                      </button>
                    }
                  </article>
                }
              </div>
            }
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 20px;
      align-items: center;
    }
    .search-field { width: min(100%, 320px); }
    .loading-wrap {
      display: flex;
      justify-content: center;
      padding: 48px 0;
    }
    .empty-state {
      padding: 24px;
      color: var(--text-muted);
      text-align: center;
    }
    .seller {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .listing-desc {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .offer-btn {
      margin-top: 10px;
      width: 100%;
    }
  `]
})
export class MarketplaceComponent implements OnInit, OnDestroy {
  private readonly listingsService = inject(ListingsService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);

  loading = false;
  search = '';
  featured: DomainListing[] = [];
  recent: DomainListing[] = [];
  private userId: number | null = null;
  private userSub?: Subscription;

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.userId = user?.id ?? null;
    });
    this.reload();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  canOffer(item: DomainListing): boolean {
    return this.userId != null && item.sellerId != null && item.sellerId !== this.userId;
  }

  makeOffer(item: DomainListing): void {
    const ref = this.dialog.open(OfferDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'app-dialog',
      data: { mode: 'create', listing: item }
    });
    ref.afterClosed().subscribe();
  }

  reload(): void {
    this.loading = true;
    const q = this.search.trim() || undefined;
    this.listingsService.browseMarketplace({
      q,
      featured: true,
      page: 0,
      size: 6,
      sort: 'createdAt,desc'
    }).subscribe({
      next: (featuredPage) => {
        this.featured = featuredPage.content ?? [];
        this.listingsService.browseMarketplace({
          q,
          page: 0,
          size: 12,
          sort: 'createdAt,desc'
        }).subscribe({
          next: (recentPage) => {
            this.loading = false;
            const featuredIds = new Set(this.featured.map((f) => f.id));
            this.recent = (recentPage.content ?? []).filter((item) => !featuredIds.has(item.id));
            if (!this.recent.length && !this.featured.length) {
              this.recent = recentPage.content ?? [];
            }
          },
          error: (error) => this.fail(error)
        });
      },
      error: (error) => this.fail(error)
    });
  }

  private fail(error: unknown): void {
    this.loading = false;
    this.featured = [];
    this.recent = [];
    this.snackBar.open(this.apiError.resolve(error), undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
