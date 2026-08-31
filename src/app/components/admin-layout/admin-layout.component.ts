import { Component, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
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
    ToolbarComponent
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
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
      @if (sidebarOpen && isMobile) {
        <div class="overlay" (click)="sidebarOpen = false" aria-hidden="true"></div>
      }
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
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

    .content {
      flex: 1;
      padding: 0;
      overflow-y: auto;
      background: var(--bg-secondary);
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
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  translationService = inject(TranslationService);
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  sidebarCollapsed = false;
  sidebarOpen = false;
  isMobile = typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;

  ngOnInit(): void {
    this.usersService.getMe().subscribe({
      next: (user) => this.authService.setCurrentUser(user),
      error: () => {
        // keep cached user if refresh fails
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
