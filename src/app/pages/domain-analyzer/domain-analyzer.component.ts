import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleCurrencyPipe, LocaleCompactPipe, LocaleNumberPipe, LocaleDatePipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';

@Component({
  selector: 'app-domain-analyzer',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe,
    LocaleCompactPipe,
    LocaleNumberPipe,
    LocaleDatePipe,
    LocaleDigitsPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'analyzer.eyebrow' | translate"
        [title]="'analyzer.title' | translate"
        [subtitle]="'analyzer.subtitle' | translate">
        <div heroActions>
          <mat-form-field appearance="outline" class="hero-search domain-input">
            <mat-icon matPrefix>language</mat-icon>
            <input matInput
                   [placeholder]="'analyzer.enterDomain' | translate"
                   [value]="domainName"
                   (input)="domainName = $any($event.target).value">
          </mat-form-field>
          <button mat-flat-button type="button" class="hero-cta" (click)="analyze()">
            <mat-icon>search</mat-icon>
            {{ 'analyzer.analyze' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        @if (showResults) {
          <div class="stat-row stagger-children">
            @for (metric of metrics; track metric.labelKey) {
              <div class="stat-item metric-item">
                <div class="stat-item-top">
                  <span class="stat-label">{{ metric.labelKey | translate }}</span>
                </div>
                <h2 class="stat-value">
                  @if (metric.competitionKey) {
                    {{ ('analyzer.competitionLevels.' + metric.competitionKey) | translate }}
                  } @else if (metric.type === 'currency') {
                    {{ metric.value | localeCurrency }}
                  } @else if (metric.max) {
                    {{ metric.value | localeNumber }}/{{ metric.max | localeNumber }}
                  } @else {
                    {{ metric.value | localeNumber }}
                  }
                </h2>
                <mat-progress-bar mode="determinate" [value]="metric.progress"></mat-progress-bar>
                <p class="metric-desc">{{ metric.descKey | translate }}</p>
              </div>
            }
          </div>

          <div class="analysis-grid">
            <section class="panel-surface section">
              <h2 class="section-title">{{ 'analyzer.overviewTitle' | translate }}</h2>
              <div class="detail-list">
                @for (item of overview; track item.labelKey) {
                  <div class="detail-item">
                    <span class="label">{{ item.labelKey | translate }}</span>
                    <span class="value">
                      @if (item.date) {
                        {{ item.date | localeDate }}
                      } @else if (item.length != null) {
                        {{ 'analyzer.overview.lengthValue' | translate:{ count: item.length } }}
                      } @else {
                        {{ item.value | localeDigits }}
                      }
                    </span>
                  </div>
                }
              </div>
            </section>

            <section class="panel-surface section">
              <h2 class="section-title">{{ 'analyzer.seoTitle' | translate }}</h2>
              <div class="detail-list">
                @for (item of seo; track item.labelKey) {
                  <div class="detail-item">
                    <span class="label">{{ item.labelKey | translate }}</span>
                    <span class="value" [class.highlight]="item.highlight" [class.good]="item.good">
                      @if (item.score != null && item.max) {
                        {{ item.score | localeNumber }}/{{ item.max | localeNumber }}
                      } @else if (item.compact != null) {
                        {{ item.compact | localeCompact }}
                      } @else if (item.traffic != null) {
                        {{ item.traffic | localeCompact }}/{{ 'analyzer.seo.perMonth' | translate }}
                      } @else if (item.percent != null) {
                        {{ item.percent | localeNumber }}%
                      }
                    </span>
                  </div>
                }
              </div>
            </section>

            <section class="panel-surface section">
              <h2 class="section-title">{{ 'analyzer.insightsTitle' | translate }}</h2>
              <div class="insights">
                @for (insight of insights; track insight.titleKey) {
                  <div class="insight-item">
                    <mat-icon>{{ insight.icon }}</mat-icon>
                    <div>
                      <div class="insight-title">{{ insight.titleKey | translate }}</div>
                      <div class="insight-desc">{{ insight.descKey | translate }}</div>
                    </div>
                  </div>
                }
              </div>
            </section>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .domain-input {
      min-width: min(100%, 280px);
    }

    .metric-item {
      min-height: 140px;
    }

    .metric-desc {
      margin: 8px 0 0;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .detail-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-top: 12px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .label {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .value {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .value.highlight { color: var(--accent); }
    .value.good { color: var(--success); }

    .insights {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 12px;
    }

    .insight-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .insight-item mat-icon {
      color: var(--accent);
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .insight-title {
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .insight-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    @media (max-width: 1024px) {
      .analysis-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DomainAnalyzerComponent {
  domainName = 'example.com';
  showResults = true;

  metrics = [
    { labelKey: 'analyzer.metrics.seoScore', value: 85, max: 100, progress: 85, descKey: 'analyzer.metricDesc.seoScore' },
    { labelKey: 'analyzer.metrics.brandability', value: 92, max: 100, progress: 92, descKey: 'analyzer.metricDesc.brandability' },
    { labelKey: 'analyzer.metrics.marketValue', value: 25000, type: 'currency' as const, progress: 75, descKey: 'analyzer.metricDesc.marketValue' },
    { labelKey: 'analyzer.metrics.competition', competitionKey: 'low', progress: 30, descKey: 'analyzer.metricDesc.competitionLow' }
  ];

  overview = [
    { labelKey: 'analyzer.overview.registrar', value: 'GoDaddy' },
    { labelKey: 'analyzer.overview.created', date: '2020-01-15' },
    { labelKey: 'analyzer.overview.expires', date: '2026-01-15' },
    { labelKey: 'analyzer.overview.tld', value: '.com' },
    { labelKey: 'analyzer.overview.length', length: 6 }
  ];

  seo = [
    { labelKey: 'analyzer.seo.domainAuthority', score: 72, max: 100, highlight: true, good: false },
    { labelKey: 'analyzer.seo.pageAuthority', score: 65, max: 100, highlight: false, good: false },
    { labelKey: 'analyzer.seo.backlinks', compact: 15200, highlight: false, good: false },
    { labelKey: 'analyzer.seo.organicTraffic', traffic: 45000, highlight: false, good: false },
    { labelKey: 'analyzer.seo.spamScore', percent: 2, highlight: false, good: true }
  ];

  insights = [
    { icon: 'trending_up', titleKey: 'analyzer.insights.growingDemand', descKey: 'analyzer.insights.growingDemandDesc' },
    { icon: 'local_offer', titleKey: 'analyzer.insights.priceRecommendation', descKey: 'analyzer.insights.priceRecommendationDesc' },
    { icon: 'groups', titleKey: 'analyzer.insights.buyerInterest', descKey: 'analyzer.insights.buyerInterestDesc' },
    { icon: 'schedule', titleKey: 'analyzer.insights.bestTimeToSell', descKey: 'analyzer.insights.bestTimeToSellDesc' }
  ];

  analyze(): void {
    this.showResults = true;
  }
}
