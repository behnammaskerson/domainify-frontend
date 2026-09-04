import { Component, EventEmitter, Output, inject, computed, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  icon: string;
  labelKey: string;
  route: string;
}

interface NavGroupChild {
  icon: string;
  labelKey: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <aside class="sidebar"
           [class.collapsed]="collapsed"
           [class.mobile-open]="mobileOpen"
           [attr.aria-label]="'a11y.mainNavigation' | translate">
      <div class="brand">
        <div class="mark" aria-hidden="true">
          <mat-icon>public</mat-icon>
        </div>
        @if (!collapsed) {
          <div class="brand-text">
            <span class="name">{{ 'app.name' | translate }}</span>
            <span class="tag">{{ 'app.tagline' | translate }}</span>
          </div>
        }
      </div>

      <nav class="nav">
        @for (item of navItems; track item.route) {
          <a class="nav-link"
             [routerLink]="item.route"
             routerLinkActive="active"
             (click)="onNavigate()"
             [matTooltip]="collapsed ? (item.labelKey | translate) : ''"
             [matTooltipPosition]="tooltipPosition()">
            <mat-icon>{{ item.icon }}</mat-icon>
            @if (!collapsed) {
              <span>{{ item.labelKey | translate }}</span>
            }
          </a>
        }

        @if (collapsed) {
          <a class="nav-link"
             routerLink="/tickets/mine"
             routerLinkActive="active"
             (click)="onNavigate()"
             [matTooltip]="'menu.myTickets' | translate"
             [matTooltipPosition]="tooltipPosition()">
            <mat-icon>confirmation_number</mat-icon>
          </a>
          <a class="nav-link"
             routerLink="/tickets/new"
             routerLinkActive="active"
             (click)="onNavigate()"
             [matTooltip]="'menu.createTicket' | translate"
             [matTooltipPosition]="tooltipPosition()">
            <mat-icon>add_box</mat-icon>
          </a>
          @if (authService.isAdmin()) {
            <a class="nav-link"
               routerLink="/admin/tickets/inbox"
               routerLinkActive="active"
               (click)="onNavigate()"
               [matTooltip]="'menu.ticketInbox' | translate"
               [matTooltipPosition]="tooltipPosition()">
              <mat-icon>inbox</mat-icon>
            </a>
            <a class="nav-link"
               routerLink="/tickets/categories"
               routerLinkActive="active"
               (click)="onNavigate()"
               [matTooltip]="'menu.ticketCategories' | translate"
               [matTooltipPosition]="tooltipPosition()">
              <mat-icon>category</mat-icon>
            </a>
            <a class="nav-link"
               routerLink="/tickets/queues"
               routerLinkActive="active"
               (click)="onNavigate()"
               [matTooltip]="'menu.ticketQueues' | translate"
               [matTooltipPosition]="tooltipPosition()">
              <mat-icon>groups</mat-icon>
            </a>
          }
        } @else {
          <div class="nav-group" [class.expanded]="supportExpanded">
            <button type="button"
                    class="nav-link nav-group-trigger"
                    (click)="toggleSupportGroup()"
                    [attr.aria-expanded]="supportExpanded">
              <mat-icon>support_agent</mat-icon>
              <span class="nav-group-label">{{ 'menu.support' | translate }}</span>
              <mat-icon class="chevron">{{ supportExpanded ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
            @if (supportExpanded) {
              @for (child of visibleSupportChildren; track child.route) {
                <a class="nav-link nav-child"
                   [routerLink]="child.route"
                   routerLinkActive="active"
                   (click)="onNavigate()">
                  <mat-icon>{{ child.icon }}</mat-icon>
                  <span>{{ child.labelKey | translate }}</span>
                </a>
              }
            }
          </div>
        }

        @if (authService.isAdmin()) {
          @if (collapsed) {
            <a class="nav-link"
               routerLink="/sms/single-send"
               routerLinkActive="active"
               (click)="onNavigate()"
               [matTooltip]="'menu.singleSmsSend' | translate"
               [matTooltipPosition]="tooltipPosition()">
              <mat-icon>send</mat-icon>
            </a>
          } @else {
            <div class="nav-group" [class.expanded]="smsExpanded">
              <button type="button"
                      class="nav-link nav-group-trigger"
                      (click)="toggleSmsGroup()"
                      [attr.aria-expanded]="smsExpanded">
                <mat-icon>sms</mat-icon>
                <span class="nav-group-label">{{ 'menu.smsManagement' | translate }}</span>
                <mat-icon class="chevron">{{ smsExpanded ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
              @if (smsExpanded) {
                @for (child of smsNavChildren; track child.route) {
                  <a class="nav-link nav-child"
                     [routerLink]="child.route"
                     routerLinkActive="active"
                     (click)="onNavigate()">
                    <mat-icon>{{ child.icon }}</mat-icon>
                    <span>{{ child.labelKey | translate }}</span>
                  </a>
                }
              }
            </div>
          }
        }
      </nav>

      <div class="footer">
        <a class="nav-link"
           routerLink="/settings"
           routerLinkActive="active"
           (click)="onNavigate()"
           [matTooltip]="collapsed ? ('menu.settings' | translate) : ''"
           [matTooltipPosition]="tooltipPosition()">
          <mat-icon>settings</mat-icon>
          @if (!collapsed) {
            <span>{{ 'menu.settings' | translate }}</span>
          }
        </a>
        <a class="nav-link"
           href="#"
           (click)="$event.preventDefault()"
           [matTooltip]="collapsed ? ('menu.help' | translate) : ''"
           [matTooltipPosition]="tooltipPosition()">
          <mat-icon>help_outline</mat-icon>
          @if (!collapsed) {
            <span>{{ 'menu.help' | translate }}</span>
          }
        </a>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      height: 100vh;
      background: var(--bg-primary);
      border-inline-end: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      position: fixed;
      inset-inline-start: 0;
      top: 0;
      z-index: 100;
      transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1), transform 0.28s ease;
      overflow-x: hidden;
      overflow-y: hidden;
    }

    .sidebar.collapsed {
      width: 76px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 22px 18px;
      min-height: 76px;
      min-width: 0;
      overflow: hidden;
    }

    .mark {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1c1812;
      color: #f5d76b;
    }

    .mark mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: inherit;
    }

    .brand-text {
      min-width: 0;
      overflow: hidden;
    }

    .name {
      display: block;
      font-family: var(--font-display);
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .tag {
      display: block;
      margin-top: 3px;
      font-size: 0.68rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav {
      flex: 1;
      padding: 8px 12px;
      overflow-x: hidden;
      overflow-y: auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .footer {
      padding: 12px;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-x: hidden;
      min-width: 0;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      min-width: 0;
      max-width: 100%;
      padding: 0 12px;
      border-radius: 10px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      position: relative;
      transition: background var(--transition-base), color var(--transition-base);
      border: none;
      background: transparent;
      width: 100%;
      cursor: pointer;
      font-family: var(--font-ui);
      text-align: start;
      box-sizing: border-box;
    }

    .nav-link > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-link mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: inherit;
      flex-shrink: 0;
    }

    .nav-link:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .nav-link.active {
      background: var(--accent-light);
      color: var(--accent-dark);
      font-weight: 600;
    }

    :host-context(body.dark-theme) .nav-link.active {
      color: var(--accent);
    }

    .nav-link.active::before {
      content: '';
      position: absolute;
      inset-inline-start: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 2px;
      background: var(--accent);
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      max-width: 100%;
    }

    .nav-group-trigger {
      justify-content: flex-start;
    }

    .nav-group-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-group-trigger .chevron {
      margin-inline-start: auto;
      flex-shrink: 0;
      font-size: 18px;
      width: 18px;
      height: 18px;
      opacity: 0.7;
    }

    .nav-child {
      min-height: 40px;
      padding-inline-start: 40px;
      font-size: 0.86rem;
    }

    .nav-child.active::before {
      top: 8px;
      bottom: 8px;
    }

    .collapsed .nav-link {
      justify-content: center;
      padding: 0;
    }

    .collapsed .brand {
      justify-content: center;
      padding-inline: 12px;
    }

    @media (max-width: 1024px) {
      .sidebar {
        transform: translateX(-105%);
      }

      [dir="rtl"] .sidebar {
        transform: translateX(105%);
      }

      .sidebar.mobile-open {
        transform: translateX(0) !important;
        width: 260px;
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Output() toggle = new EventEmitter<void>();
  @Output() closeMobile = new EventEmitter<void>();

  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  translationService = inject(TranslationService);

  smsExpanded = false;
  supportExpanded = false;

  tooltipPosition = computed(() => this.translationService.isRtl() ? 'left' : 'right');

  navItems: NavItem[] = [
    { icon: 'dashboard', labelKey: 'menu.dashboard', route: '/dashboard' },
    { icon: 'notifications', labelKey: 'menu.notifications', route: '/notifications' },
    { icon: 'language', labelKey: 'menu.domains', route: '/domains' },
    { icon: 'analytics', labelKey: 'menu.analyzer', route: '/analyzer' },
    { icon: 'storefront', labelKey: 'menu.marketplace', route: '/marketplace' },
    { icon: 'bar_chart', labelKey: 'menu.analytics', route: '/analytics' },
    { icon: 'people', labelKey: 'menu.users', route: '/user' },
    { icon: 'description', labelKey: 'menu.reports', route: '/reports' }
  ];

  readonly supportNavChildren: NavGroupChild[] = [
    { icon: 'confirmation_number', labelKey: 'menu.myTickets', route: '/tickets/mine' },
    { icon: 'add_box', labelKey: 'menu.createTicket', route: '/tickets/new' },
    { icon: 'inbox', labelKey: 'menu.ticketInbox', route: '/admin/tickets/inbox' },
    { icon: 'category', labelKey: 'menu.ticketCategories', route: '/tickets/categories' },
    { icon: 'groups', labelKey: 'menu.ticketQueues', route: '/tickets/queues' },
    { icon: 'label', labelKey: 'menu.ticketTags', route: '/tickets/tags' },
    { icon: 'quickreply', labelKey: 'menu.ticketReplyTemplates', route: '/tickets/reply-templates' },
    { icon: 'tune', labelKey: 'menu.ticketSettings', route: '/tickets/settings' },
    { icon: 'account_tree', labelKey: 'menu.ticketStatusWorkflow', route: '/tickets/status-workflow' }
  ];

  readonly smsNavChildren: NavGroupChild[] = [
    { icon: 'sms', labelKey: 'menu.singleSmsSend', route: '/sms/single-send' },
    { icon: 'send', labelKey: 'menu.bulkSmsSend', route: '/sms/bulk-send' },
    { icon: 'upload_file', labelKey: 'menu.bulkSmsFileSend', route: '/sms/bulk-send-file' },
    { icon: 'schedule_send', labelKey: 'menu.scheduledSms', route: '/sms/scheduled' },
    { icon: 'mark_email_read', labelKey: 'menu.smsSendReports', route: '/sms/send-reports' },
    { icon: 'inbox', labelKey: 'menu.smsReceiveReports', route: '/sms/receive-reports' }
  ];

  get visibleSupportChildren(): NavGroupChild[] {
    if (this.authService.isAdmin()) {
      return this.supportNavChildren;
    }
    return this.supportNavChildren.filter((child) =>
      child.route !== '/tickets/categories'
      && child.route !== '/tickets/queues'
      && child.route !== '/tickets/tags'
      && child.route !== '/tickets/reply-templates'
      && child.route !== '/tickets/settings'
      && child.route !== '/admin/tickets/inbox'
      && child.route !== '/tickets/status-workflow');
  }

  ngOnInit(): void {
    this.updateGroupExpanded(this.router.url);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.updateGroupExpanded(this.router.url);
    });
  }

  toggleSmsGroup(): void {
    this.smsExpanded = !this.smsExpanded;
  }

  toggleSupportGroup(): void {
    this.supportExpanded = !this.supportExpanded;
  }

  onNavigate(): void {
    this.closeMobile.emit();
  }

  private updateGroupExpanded(url: string): void {
    this.smsExpanded = url.startsWith('/sms');
    this.supportExpanded = url.startsWith('/tickets') || url.startsWith('/admin/tickets');
  }
}
