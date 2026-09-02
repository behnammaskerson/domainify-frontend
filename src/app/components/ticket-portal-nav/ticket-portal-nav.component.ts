import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

export type TicketPortalTab = 'mine' | 'create';

@Component({
  selector: 'app-ticket-portal-nav',
  standalone: true,
  imports: [RouterModule, MatIconModule, TranslateModule],
  template: `
    <nav class="portal-nav panel-surface" [attr.aria-label]="'tickets.portal.navLabel' | translate">
      <a class="portal-tab"
         routerLink="/tickets/mine"
         routerLinkActive="active"
         [class.active]="active === 'mine'">
        <mat-icon>list_alt</mat-icon>
        <span>{{ 'tickets.portal.myTickets' | translate }}</span>
      </a>
      <a class="portal-tab"
         routerLink="/tickets/new"
         routerLinkActive="active"
         [class.active]="active === 'create'">
        <mat-icon>add_circle_outline</mat-icon>
        <span>{{ 'tickets.portal.createTicket' | translate }}</span>
      </a>
    </nav>
  `,
  styles: [`
    .portal-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 12px;
      margin-bottom: 16px;
    }

    .portal-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .portal-tab mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .portal-tab.active {
      color: var(--text-primary);
      border-color: color-mix(in srgb, var(--primary) 45%, var(--border-color));
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      font-weight: 600;
    }
  `]
})
export class TicketPortalNavComponent {
  @Input() active: TicketPortalTab = 'mine';
}
