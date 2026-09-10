import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketSettingsFormComponent } from '../../components/ticket-settings-form/ticket-settings-form.component';

interface TicketSettingsNavItem {
  id: string;
  titleKey: string;
  icon: string;
}

@Component({
  selector: 'app-ticket-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatIconModule,
    PageHeroComponent,
    TicketSettingsFormComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.settingsPage.eyebrow' | translate"
        [title]="'tickets.settingsPage.title' | translate"
        [subtitle]="'tickets.settingsPage.subtitle' | translate">
      </app-page-hero>

      <div class="page-body settings-wrap">
        <nav class="settings-nav" aria-label="Ticket settings sections">
          @for (item of navItems; track item.id) {
            <button type="button"
                    class="settings-nav-item"
                    [class.active]="activeSection === item.id"
                    (click)="goToSection(item.id)">
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.titleKey | translate }}</span>
            </button>
          }
        </nav>

        <div class="panel-surface settings-card">
          <app-ticket-settings-form></app-ticket-settings-form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-wrap {
      width: 100%;
      max-width: none;
    }

    .settings-nav {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 8px;
      margin-bottom: 20px;
    }

    .settings-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-secondary);
      font-family: var(--font-ui);
      font-size: 0.9rem;
      font-weight: 500;
      text-align: start;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
    }

    .settings-nav-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--accent);
      flex-shrink: 0;
    }

    .settings-nav-item:hover {
      border-color: var(--accent);
      color: var(--text-primary);
    }

    .settings-nav-item.active {
      border-color: var(--accent);
      background: var(--accent-light);
      color: var(--accent-dark);
    }

    :host-context(body.dark-theme) .settings-nav-item.active {
      color: var(--accent);
    }

    .settings-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    @media (max-width: 768px) {
      .settings-nav {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 6px;
      }

      .settings-nav-item {
        min-height: 40px;
        padding: 8px 12px;
        font-size: 0.85rem;
      }

      .settings-nav-item mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }
  `]
})
export class TicketSettingsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  activeSection = 'reopen';

  readonly navItems: TicketSettingsNavItem[] = [
    { id: 'reopen', titleKey: 'settings.ticketSettings.reopenSection', icon: 'refresh' },
    { id: 'archive', titleKey: 'settings.ticketSettings.archiveSection', icon: 'archive' },
    { id: 'sla', titleKey: 'settings.ticketSettings.slaSection', icon: 'schedule' },
    { id: 'notifications', titleKey: 'settings.ticketSettings.emailSection', icon: 'notifications' },
    { id: 'digest', titleKey: 'settings.ticketSettings.digestSection', icon: 'summarize' },
    { id: 'autoassign', titleKey: 'settings.ticketSettings.autoAssignSection', icon: 'assignment_ind' },
    { id: 'automations', titleKey: 'settings.ticketSettings.automationsSection', icon: 'auto_mode' },
    { id: 'attachments', titleKey: 'settings.ticketSettings.attachmentsSection', icon: 'attach_file' }
  ];

  ngOnInit(): void {
    this.route.fragment.subscribe((fragment) => {
      if (!fragment) {
        return;
      }
      this.activeSection = fragment;
      setTimeout(() => this.scrollToAnchor(fragment), 100);
    });
  }

  goToSection(id: string): void {
    this.activeSection = id;
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: id,
      replaceUrl: true
    });
    this.scrollToAnchor(id);
  }

  private scrollToAnchor(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
