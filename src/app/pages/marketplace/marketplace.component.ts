import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleCurrencyPipe, LocaleCompactPipe } from '../../pipes/locale-format.pipe';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe,
    LocaleCompactPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'marketplace.eyebrow' | translate"
        [title]="'marketplace.title' | translate"
        [subtitle]="'marketplace.subtitle' | translate">
      </app-page-hero>

      <div class="page-body">
        <section class="section">
          <h2 class="section-title">{{ 'marketplace.featured' | translate }}</h2>
          <p class="section-subtitle">{{ 'marketplace.featuredSubtitle' | translate }}</p>
          <div class="listing-grid stagger-children">
            @for (domain of featuredDomains; track domain.name) {
              <article class="listing-tile featured">
                <h3>{{ domain.name }}</h3>
                <p class="listing-desc">{{ domain.descriptionKey | translate }}</p>
                <div class="listing-tags">
                  @for (tag of domain.tags; track tag) {
                    <span class="listing-tag">{{ ('marketplace.tags.' + tag) | translate }}</span>
                  }
                </div>
                <div class="listing-footer">
                  <span class="listing-price">{{ domain.price | localeCurrency }}</span>
                  <button mat-flat-button color="primary" type="button">{{ 'marketplace.makeOffer' | translate }}</button>
                </div>
              </article>
            }
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">{{ 'marketplace.recentlyAdded' | translate }}</h2>
          <p class="section-subtitle">{{ 'marketplace.recentSubtitle' | translate }}</p>
          <div class="listing-grid stagger-children">
            @for (domain of recentDomains; track domain.name) {
              <article class="listing-tile">
                <h3>{{ domain.name }}</h3>
                <div class="listing-tags">
                  @for (tag of domain.tags; track tag) {
                    <span class="listing-tag">{{ ('marketplace.tags.' + tag) | translate }}</span>
                  }
                </div>
                <div class="listing-footer">
                  <span class="listing-price">{{ domain.price | localeCurrency }}</span>
                  <button mat-stroked-button type="button">{{ 'marketplace.viewDetails' | translate }}</button>
                </div>
              </article>
            }
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">{{ 'marketplace.topSelling' | translate }}</h2>
          <p class="section-subtitle">{{ 'marketplace.topSellingSubtitle' | translate }}</p>
          <div class="listing-grid stagger-children">
            @for (domain of topSellingDomains; track domain.name) {
              <article class="listing-tile">
                <h3>{{ domain.name }}</h3>
                <div class="meta-row">
                  <span><mat-icon>visibility</mat-icon> {{ domain.views | localeCompact }}</span>
                  <span><mat-icon>local_offer</mat-icon> {{ 'marketplace.offers' | translate:{ count: domain.offers } }}</span>
                </div>
                <div class="listing-footer">
                  <span class="listing-price">{{ domain.price | localeCurrency }}</span>
                  <button mat-flat-button color="primary" type="button">{{ 'marketplace.buyNow' | translate }}</button>
                </div>
              </article>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .meta-row {
      display: flex;
      gap: 14px;
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .meta-row span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .meta-row mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `]
})
export class MarketplaceComponent {
  featuredDomains = [
    {
      name: 'crypto.com',
      descriptionKey: 'marketplace.descriptions.cryptoCom',
      price: 250000,
      tags: ['premium', 'crypto', 'finance']
    },
    {
      name: 'ai-startup.io',
      descriptionKey: 'marketplace.descriptions.aiStartup',
      price: 45000,
      tags: ['ai', 'startup', 'tech']
    },
    {
      name: 'cloud-saas.com',
      descriptionKey: 'marketplace.descriptions.cloudSaas',
      price: 28000,
      tags: ['saas', 'cloud', 'business']
    }
  ];

  recentDomains = [
    { name: 'nftmarket.xyz', price: 3200, tags: ['nft', 'marketplace'] },
    { name: 'green-energy.org', price: 5500, tags: ['green', 'energy'] },
    { name: 'fintech-hub.com', price: 8900, tags: ['fintech', 'hub'] },
    { name: 'remote-work.io', price: 4100, tags: ['remote', 'work'] },
    { name: 'data-pipeline.dev', price: 6700, tags: ['data', 'devops'] },
    { name: 'health-tech.com', price: 12000, tags: ['health', 'tech'] }
  ];

  topSellingDomains = [
    { name: 'web3.xyz', price: 12000, views: 8200, offers: 15 },
    { name: 'metaverse.app', price: 8500, views: 6500, offers: 12 },
    { name: 'quantum.tech', price: 95000, views: 4300, offers: 8 },
    { name: 'blockchain.dev', price: 15500, views: 5100, offers: 10 }
  ];
}
