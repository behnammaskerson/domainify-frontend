import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { LocaleCurrencyPipe, LocaleCompactPipe, LocaleMonthPipe, LocaleNumberPipe, LocalePercentPipe } from '../../pipes/locale-format.pipe';
import { LocaleService } from '../../services/locale.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    TranslateModule,
    PageHeroComponent,
    LocaleCurrencyPipe,
    LocaleCompactPipe,
    LocaleMonthPipe,
    LocaleNumberPipe,
    LocalePercentPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'app.name' | translate"
        [title]="'dashboard.welcome' | translate"
        [subtitle]="'dashboard.subtitle' | translate">
        <div heroActions>
          <mat-form-field appearance="outline" class="hero-search">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [placeholder]="'dashboard.searchDomains' | translate">
          </mat-form-field>
          <button mat-flat-button type="button" class="hero-cta">
            <mat-icon>add</mat-icon>
            {{ 'dashboard.addDomain' | translate }}
          </button>
        </div>
      </app-page-hero>

      <div class="page-body">
        <div class="stat-row stagger-children">
          @for (stat of stats; track stat.titleKey) {
            <div class="stat-item">
              <div class="stat-item-top">
                <span class="stat-label">{{ stat.titleKey | translate }}</span>
                <span class="stat-change" [class.positive]="stat.change > 0" [class.negative]="stat.change < 0">
                  {{ stat.change | localePercent }}
                </span>
              </div>
              <h2 class="stat-value">
                @if (stat.type === 'currency') {
                  {{ stat.value | localeCurrency }}
                } @else {
                  {{ stat.value | localeNumber }}
                }
              </h2>
            </div>
          }
        </div>

        <div class="dash-grid">
          <section class="section panel-surface">
            <div class="section-header">
              <div>
                <h2 class="section-title">{{ 'dashboard.domainValue' | translate }}</h2>
                <p class="section-subtitle">{{ 'dashboard.trends' | translate }}</p>
              </div>
              <div class="period-tabs">
                @for (period of periods; track period) {
                  <button type="button"
                          class="filter-tab"
                          [class.active]="selectedPeriod === period"
                          (click)="selectedPeriod = period">
                    {{ ('dashboard.periods.' + period) | translate }}
                  </button>
                }
              </div>
            </div>
            <div class="chart-bars">
              @for (bar of chartBars; track bar.month) {
                <div class="chart-bar-wrapper">
                  <div class="chart-bar"
                       [style.height.%]="bar.height"
                       [class.highlight]="bar.highlight"
                       [attr.title]="locale.formatCurrency(bar.value * 1000)"></div>
                  <span class="chart-label">{{ bar.month | localeMonth }}</span>
                </div>
              }
            </div>
          </section>

          <div class="side-stack">
            <section class="section panel-surface">
              <div class="section-header">
                <h2 class="section-title">{{ 'dashboard.recentActivity' | translate }}</h2>
              </div>
              <div class="activity-list">
                @for (activity of activities; track activity.id) {
                  <div class="activity-item">
                    <div class="activity-copy">
                      <span class="activity-text">{{ activity.textKey | translate:activity.params }}</span>
                      <span class="activity-time">{{ activity.timeKey | translate:activity.timeParams }}</span>
                    </div>
                    @if (activity.amount) {
                      <span class="activity-amount">{{ activity.amount | localeCurrency }}</span>
                    }
                  </div>
                }
              </div>
            </section>

            <section class="section panel-surface">
              <h2 class="section-title">{{ 'dashboard.quickActions' | translate }}</h2>
              <div class="actions-grid">
                @for (action of quickActions; track action.labelKey) {
                  <button type="button" class="action-btn">
                    <mat-icon>{{ action.icon }}</mat-icon>
                    <span>{{ action.labelKey | translate }}</span>
                  </button>
                }
              </div>
            </section>
          </div>
        </div>

        <section class="section panel-surface">
          <div class="section-header">
            <div>
              <h2 class="section-title">{{ 'dashboard.topDomainsTitle' | translate }}</h2>
              <p class="section-subtitle">{{ 'dashboard.topDomainsSubtitle' | translate }}</p>
            </div>
            <button mat-button type="button" color="primary">{{ 'common.view' | translate }}</button>
          </div>
          <div class="data-head top-grid">
            <span>{{ 'domains.table.name' | translate }}</span>
            <span>{{ 'domains.table.status' | translate }}</span>
            <span>{{ 'domains.table.price' | translate }}</span>
            <span>{{ 'dashboard.views' | translate }}</span>
          </div>
          @for (domain of topDomains; track domain.name) {
            <div class="data-row top-grid">
              <div>
                <div class="domain-name">{{ domain.name }}</div>
                <div class="domain-meta">{{ ('dashboard.categories.' + domain.categoryKey) | translate }}</div>
              </div>
              <span class="status-pill active">{{ 'domains.status.active' | translate }}</span>
              <span class="domain-value">{{ domain.value | localeCurrency }}</span>
              <span class="domain-meta">{{ domain.views | localeCompact }}</span>
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .dash-grid {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 20px;
      margin-bottom: 8px;
    }

    .side-stack {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .period-tabs {
      display: flex;
      gap: 6px;
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 200px;
      margin-top: 8px;
    }

    .chart-bar-wrapper {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
    }

    .chart-bar {
      width: 100%;
      min-height: 12px;
      border-radius: 4px 4px 0 0;
      background: var(--accent-light);
      transition: background 0.2s ease;
    }

    .chart-bar.highlight,
    .chart-bar:hover {
      background: var(--accent);
    }

    .chart-label {
      font-size: 0.68rem;
      color: var(--text-muted);
    }

    .activity-list {
      display: flex;
      flex-direction: column;
    }

    .activity-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .activity-text {
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .activity-time {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .activity-amount {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--success);
      white-space: nowrap;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 14px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      text-align: start;
    }

    .action-btn mat-icon {
      color: var(--accent);
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .action-btn:hover {
      border-color: var(--accent);
    }

    .top-grid {
      grid-template-columns: 2fr 1fr 1fr 0.8fr;
    }

    .domain-name {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .domain-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .domain-value {
      font-weight: 700;
      color: var(--success);
    }

    @media (max-width: 1100px) {
      .dash-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .top-grid {
        grid-template-columns: 1.4fr 1fr 1fr;
      }

      .top-grid > :nth-child(4) {
        display: none;
      }
    }
  `]
})
export class DashboardComponent {
  readonly locale = inject(LocaleService);

  selectedPeriod = '1Y';
  periods = ['1W', '1M', '3M', '1Y'];

  stats = [
    { titleKey: 'dashboard.stats.totalDomains', value: 1247, type: 'number' as const, change: 12.5 },
    { titleKey: 'dashboard.stats.activeListings', value: 389, type: 'number' as const, change: 8.2 },
    { titleKey: 'dashboard.stats.totalRevenue', value: 284000, type: 'currency' as const, change: 23.1 },
    { titleKey: 'dashboard.stats.pendingSales', value: 42, type: 'number' as const, change: -3.4 }
  ];

  chartBars = [
    { height: 45, value: 12, highlight: false, month: 0 },
    { height: 62, value: 18, highlight: false, month: 1 },
    { height: 38, value: 9, highlight: false, month: 2 },
    { height: 75, value: 22, highlight: false, month: 3 },
    { height: 55, value: 15, highlight: false, month: 4 },
    { height: 82, value: 25, highlight: false, month: 5 },
    { height: 68, value: 19, highlight: false, month: 6 },
    { height: 90, value: 28, highlight: true, month: 7 },
    { height: 45, value: 11, highlight: false, month: 8 },
    { height: 72, value: 21, highlight: false, month: 9 },
    { height: 58, value: 16, highlight: false, month: 10 },
    { height: 85, value: 26, highlight: false, month: 11 }
  ];

  activities = [
    { id: 1, textKey: 'dashboard.activities.sold', params: { domain: 'crypto.com' }, timeKey: 'time.minutesAgo', timeParams: { count: 2 }, amount: 25000 },
    { id: 2, textKey: 'dashboard.activities.added', params: { domain: 'ai-startup.io' }, timeKey: 'time.hoursAgo', timeParams: { count: 1 }, amount: null },
    { id: 3, textKey: 'dashboard.activities.priceUpdated', params: { domain: 'blockchain.dev' }, timeKey: 'time.hoursAgo', timeParams: { count: 3 }, amount: 8500 },
    { id: 4, textKey: 'dashboard.activities.offerReceived', params: { domain: 'web3.xyz' }, timeKey: 'time.hoursAgo', timeParams: { count: 5 }, amount: 12000 },
    { id: 5, textKey: 'dashboard.activities.verified', params: { domain: 'cloud-saas.com' }, timeKey: 'time.daysAgo', timeParams: { count: 1 }, amount: null }
  ];

  quickActions = [
    { icon: 'add', labelKey: 'dashboard.quickActionLabels.addDomain' },
    { icon: 'analytics', labelKey: 'dashboard.quickActionLabels.analyze' },
    { icon: 'sell', labelKey: 'dashboard.quickActionLabels.listForSale' },
    { icon: 'description', labelKey: 'dashboard.quickActionLabels.generateReport' }
  ];

  topDomains = [
    { name: 'crypto.com', categoryKey: 'technology', value: 250000, views: 12500 },
    { name: 'ai-startup.io', categoryKey: 'ai', value: 45000, views: 8200 },
    { name: 'cloud-saas.com', categoryKey: 'saas', value: 28000, views: 6700 },
    { name: 'blockchain.dev', categoryKey: 'blockchain', value: 15500, views: 4300 },
    { name: 'web3.xyz', categoryKey: 'web3', value: 12000, views: 3800 }
  ];
}
