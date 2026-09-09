import { Component, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { map } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    ToolbarComponent,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslateModule
  ],
  template: `
    <div class="admin-layout"
         [class.rtl]="translationService.isRtl()"
         [class.sidebar-collapsed]="sidebarCollapsed"
         [class.sidebar-open]="sidebarOpen">
      <app-sidebar
        [collapsed]="sidebarCollapsed"
        [mobileOpen]="sidebarOpen"
        (toggle)="toggleSidebar()"
        (closeMobile)="sidebarOpen = false">
      </app-sidebar>
      <div class="main-area">
        <app-toolbar (onToggleSidebar)="toggleSidebar()"></app-toolbar>
        @if (impersonating()) {
          <div class="impersonation-banner" role="status">
            <div class="impersonation-copy">
              <mat-icon>visibility</mat-icon>
              <span>{{ 'impersonation.banner' | translate:{ name: impersonationLabel } }}</span>
            </div>
            <button mat-stroked-button type="button" [disabled]="endingImpersonation" (click)="exitImpersonation()">
              <mat-icon>logout</mat-icon>
              {{ 'impersonation.exit' | translate }}
            </button>
          </div>
        }
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
      @if (sidebarOpen && isMobile) {
        <div class="overlay" (click)="sidebarOpen = false" aria-hidden="true"></div>
      }
    </div>
  `,
  styles: `
    .admin-layout {
      display: flex;
      min-height: 100vh;
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      background: var(--bg-secondary);
    }

    .main-area {
      flex: 1;
      margin-inline-start: 260px;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-width: 0;
      transition: margin-inline-start 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .sidebar-collapsed .main-area {
      margin-inline-start: 76px;
    }

    .impersonation-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      background: color-mix(in srgb, #b45309 16%, var(--bg-primary));
      border-bottom: 1px solid color-mix(in srgb, #b45309 35%, var(--border-color));
      color: var(--text-primary);
    }
    .impersonation-copy {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      min-width: 0;
    }
    .impersonation-copy span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .impersonation-copy mat-icon {
      color: #b45309;
      flex-shrink: 0;
    }

    .content {
      flex: 1;
      min-width: 0;
      max-width: 100%;
      padding: 0;
      overflow-x: hidden;
      overflow-y: auto;
      background: var(--bg-secondary);
    }

    .content > :not(router-outlet) {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(12, 17, 27, 0.55);
      z-index: 90;
    }

    @media (max-width: 1024px) {
      .main-area,
      .sidebar-collapsed .main-area {
        margin-inline-start: 0 !important;
      }
      .impersonation-banner {
        flex-wrap: wrap;
      }
    }
  `
})
export class AdminLayoutComponent implements OnInit {
  translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  readonly impersonating = toSignal(this.authService.impersonation$.pipe(map((s) => !!s)), {
    initialValue: this.authService.isImpersonating()
  });

  sidebarCollapsed = false;
  sidebarOpen = false;
  endingImpersonation = false;
  isMobile = typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;

  get impersonationLabel(): string {
    const target = this.authService.getImpersonationTarget();
    if (!target) return '';
    const name = [target.firstName, target.lastName].filter(Boolean).join(' ').trim();
    return name || target.email || String(target.id);
  }

  ngOnInit(): void {
    if (this.authService.isImpersonating()) {
      return;
    }
    this.usersService.getMe().subscribe({
      next: (user) => this.authService.setCurrentUser(user),
      error: () => {
        // keep cached user if refresh fails
      }
    });
  }

  exitImpersonation(): void {
    if (this.endingImpersonation) return;
    this.endingImpersonation = true;
    this.authService.endImpersonation().subscribe({
      next: () => {
        this.endingImpersonation = false;
        this.snackBar.open(this.translate.instant('impersonation.ended'), undefined, { duration: 3000 });
        this.router.navigate(['/user']);
      },
      error: () => {
        this.endingImpersonation = false;
        this.router.navigate(['/user']);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= 1024;
    if (!this.isMobile) {
      this.sidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    if (this.isMobile) {
      this.sidebarOpen = !this.sidebarOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }
}
