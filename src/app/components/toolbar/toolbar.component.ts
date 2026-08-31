import { Component, EventEmitter, Output, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <header class="toolbar">
      <div class="toolbar-left">
        <button mat-icon-button
                type="button"
                class="control-btn"
                (click)="onToggleSidebar.emit()"
                [attr.aria-label]="'a11y.toggleSidebar' | translate"
                [matTooltip]="'a11y.menu' | translate">
          <mat-icon>menu</mat-icon>
        </button>
      </div>

      <div class="toolbar-right">
        <button mat-icon-button
                type="button"
                class="control-btn"
                [matMenuTriggerFor]="langMenu"
                [attr.aria-label]="'a11y.switchLanguage' | translate"
                [matTooltip]="'a11y.language' | translate">
          <mat-icon>translate</mat-icon>
        </button>
        <mat-menu #langMenu="matMenu">
          @for (lang of translationService.languages; track lang.code) {
            <button mat-menu-item type="button"
                    (click)="translationService.setLanguage(lang.code)"
                    [class.active-lang]="translationService.currentLang() === lang.code">
              <span class="lang-code">{{ lang.code | uppercase }}</span>
              <span>{{ lang.nativeLabel }}</span>
            </button>
          }
        </mat-menu>

        <button mat-icon-button
                type="button"
                class="control-btn"
                (click)="themeService.toggleTheme()"
                [attr.aria-label]="'a11y.toggleTheme' | translate"
                [matTooltip]="'a11y.theme' | translate">
          <mat-icon>{{ themeService.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>

        <button mat-icon-button
                type="button"
                class="control-btn"
                [matMenuTriggerFor]="notifMenu"
                [attr.aria-label]="'a11y.notifications' | translate"
                matBadge="3"
                matBadgeColor="warn"
                matBadgeSize="small"
                [matTooltip]="'a11y.notifications' | translate">
          <mat-icon>notifications_none</mat-icon>
        </button>
        <mat-menu #notifMenu="matMenu" class="notif-menu">
          <div class="menu-cap">
            <span>{{ 'toolbar.notifications' | translate }}</span>
          </div>
          <mat-divider></mat-divider>
          @for (notif of notifications; track notif.id) {
            <button mat-menu-item type="button" class="notif-item">
              <mat-icon [style.color]="notif.color">{{ notif.icon }}</mat-icon>
              <div class="notif-content">
                <span class="notif-text">{{ notif.textKey | translate }}</span>
                <span class="notif-time">{{ notif.timeKey | translate }}</span>
              </div>
            </button>
          }
        </mat-menu>

        @if (currentUser(); as user) {
          <span class="toolbar-divider" aria-hidden="true"></span>
          <button type="button"
                  class="profile-trigger"
                  [matMenuTriggerFor]="profileMenu"
                  [attr.aria-label]="'a11y.userMenu' | translate"
                  [matTooltip]="displayName()">
            <span class="avatar" aria-hidden="true">
              @if (avatarSrc()) {
                <img [src]="avatarSrc()" alt="">
              } @else {
                {{ userInitials() }}
              }
            </span>
            <span class="profile-name">{{ displayName() }}</span>
            <mat-icon class="profile-caret" aria-hidden="true">expand_more</mat-icon>
          </button>
          <mat-menu #profileMenu="matMenu" class="profile-menu">
            <div class="profile-menu-header">
              <span class="avatar-large" aria-hidden="true">
                @if (avatarSrc()) {
                  <img [src]="avatarSrc()" alt="">
                } @else {
                  {{ userInitials() }}
                }
              </span>
              <div class="profile-menu-copy">
                <div class="profile-name">{{ displayName() }}</div>
                <span class="profile-email" dir="ltr">{{ user.email }}</span>
                <span class="role-badge">{{ ('users.roles.' + user.role) | translate }}</span>
              </div>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item type="button" [routerLink]="['/settings']" fragment="profile">
              <mat-icon>person</mat-icon>
              <span>{{ 'toolbar.profile' | translate }}</span>
            </button>
            <button mat-menu-item type="button" [routerLink]="['/settings']" fragment="appearance">
              <mat-icon>settings</mat-icon>
              <span>{{ 'toolbar.settings' | translate }}</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item type="button" class="logout-btn" (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>{{ 'toolbar.logout' | translate }}</span>
            </button>
          </mat-menu>
        }
      </div>
    </header>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      padding: 0 20px;
      background: var(--bg-primary);
      color: var(--text-primary);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .control-btn {
      color: var(--text-secondary) !important;
      border: 1px solid transparent;
    }

    .control-btn:hover {
      color: var(--accent) !important;
      background: var(--accent-light) !important;
      border-color: var(--border-color);
    }

    .lang-code {
      display: inline-flex;
      min-width: 28px;
      margin-inline-end: 10px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: var(--accent);
    }

    .active-lang {
      background: var(--accent-light) !important;
    }

    .toolbar-divider {
      width: 1px;
      height: 28px;
      margin-inline: 4px 2px;
      background: var(--border-color);
      flex-shrink: 0;
    }

    .profile-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      max-width: none;
      padding: 0 8px 0 2px;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: var(--text-primary);
      cursor: pointer;
      font: inherit;
      flex-shrink: 0;
      transition: background 0.18s ease, color 0.18s ease;
    }

    .profile-trigger:hover,
    .profile-trigger[aria-expanded='true'] {
      background: var(--accent-light);
    }

    .profile-trigger:hover .profile-caret,
    .profile-trigger[aria-expanded='true'] .profile-caret {
      color: var(--accent);
    }

    .profile-trigger .profile-name {
      font-size: 0.84rem;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
    }

    .profile-caret {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      flex-shrink: 0;
      transition: color 0.18s ease, transform 0.18s ease;
    }

    .profile-trigger[aria-expanded='true'] .profile-caret {
      transform: rotate(180deg);
    }

    .avatar,
    .avatar-large {
      border-radius: 50%;
      background: linear-gradient(145deg, #1c1812 0%, #2a2318 100%);
      color: #f5d76b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
      letter-spacing: 0.02em;
      box-shadow: inset 0 0 0 1px rgba(245, 215, 107, 0.18);
    }

    .avatar {
      width: 34px;
      height: 34px;
      font-size: 0.72rem;
      overflow: hidden;
    }

    .avatar-large {
      width: 48px;
      height: 48px;
      font-size: 0.95rem;
      overflow: hidden;
    }

    .avatar img,
    .avatar-large img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .profile-menu-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 16px 16px;
      min-width: 240px;
    }

    .profile-menu-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .profile-menu-header .profile-name {
      font-weight: 700;
      font-size: 0.92rem;
      color: var(--text-primary);
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
    }

    .profile-email {
      font-size: 0.76rem;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .role-badge {
      display: inline-flex;
      align-self: flex-start;
      margin-top: 6px;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--accent-light);
      color: var(--accent-dark);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    :host-context(body.dark-theme) .role-badge {
      color: var(--accent);
    }

    .menu-cap {
      padding: 12px 16px;
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .notif-item {
      height: auto !important;
      padding: 12px 16px !important;
    }

    .notif-content {
      display: flex;
      flex-direction: column;
      margin-inline-start: 10px;
    }

    .notif-text {
      font-size: 0.82rem;
      color: var(--text-primary);
    }

    .notif-time {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .logout-btn {
      color: var(--danger) !important;
    }

    @media (max-width: 900px) {
      .profile-name,
      .profile-caret {
        display: none;
      }

      .profile-trigger {
        width: 40px;
        height: 40px;
        max-width: none;
        padding: 0;
        justify-content: center;
      }
    }

    @media (max-width: 640px) {
      .toolbar {
        padding: 0 12px;
      }
    }
  `]
})
export class ToolbarComponent {
  @Output() onToggleSidebar = new EventEmitter<void>();

  themeService = inject(ThemeService);
  translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private router = inject(Router);

  currentUser = toSignal(this.authService.currentUser$, { initialValue: null });

  displayName = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return '';
    }
    return `${user.firstName} ${user.lastName}`.trim();
  });

  userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return '?';
    }
    const first = user.firstName?.charAt(0) ?? '';
    const last = user.lastName?.charAt(0) ?? '';
    const initials = `${first}${last}`.toUpperCase();
    return initials || user.email?.charAt(0).toUpperCase() || '?';
  });

  avatarSrc = computed(() => this.usersService.resolveAvatarUrl(this.currentUser()?.avatarUrl));

  notifications = [
    { id: 1, textKey: 'toolbar.notifSold', timeKey: 'toolbar.time5m', icon: 'info', color: 'var(--info)' },
    { id: 2, textKey: 'toolbar.notifOffer', timeKey: 'toolbar.time1h', icon: 'payments', color: 'var(--success)' },
    { id: 3, textKey: 'toolbar.notifExpired', timeKey: 'toolbar.time3h', icon: 'warning', color: 'var(--warning)' }
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
