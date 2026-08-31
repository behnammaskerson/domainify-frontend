import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, TranslateModule],
  template: `
    <button type="button"
            class="scroll-top-btn"
            [class.visible]="visible"
            [attr.aria-label]="'a11y.backToTop' | translate"
            [matTooltip]="'common.backToTop' | translate"
            matTooltipPosition="before"
            (click)="scrollToTop()">
      <mat-icon>keyboard_arrow_up</mat-icon>
    </button>
  `,
  styles: [`
    .scroll-top-btn {
      position: fixed;
      inset-block-end: 24px;
      inset-inline-end: 24px;
      z-index: 1200;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid var(--border-color);
      border-radius: 50%;
      background: var(--bg-primary);
      color: var(--accent-dark);
      box-shadow: 0 8px 24px rgba(18, 21, 28, 0.12);
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: translateY(12px);
      pointer-events: none;
      transition:
        opacity 0.2s ease,
        transform 0.2s ease,
        visibility 0.2s ease,
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .scroll-top-btn.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    }

    .scroll-top-btn:hover {
      border-color: var(--accent);
      background: var(--accent-light);
    }

    .scroll-top-btn mat-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }

    :host-context(body.dark-theme) .scroll-top-btn {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      color: var(--accent);
    }

    @media (max-width: 640px) {
      .scroll-top-btn {
        inset-block-end: 16px;
        inset-inline-end: 16px;
        width: 40px;
        height: 40px;
      }
    }
  `]
})
export class ScrollToTopComponent implements OnInit, OnDestroy {
  private readonly showAfterPx = 320;
  private contentEl: HTMLElement | null = null;
  private routerSub?: Subscription;
  private readonly onAnyScroll = () => this.updateVisibility();

  visible = false;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    window.addEventListener('scroll', this.onAnyScroll, { passive: true });
    this.bindContentScroll();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        // Layout may remount content after navigation
        setTimeout(() => this.bindContentScroll(), 0);
        this.updateVisibility();
      });
    this.updateVisibility();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onAnyScroll);
    this.contentEl?.removeEventListener('scroll', this.onAnyScroll);
    this.routerSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateVisibility();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.contentEl?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private bindContentScroll(): void {
    const next = document.querySelector<HTMLElement>('.admin-layout .content');
    if (this.contentEl === next) {
      return;
    }
    this.contentEl?.removeEventListener('scroll', this.onAnyScroll);
    this.contentEl = next;
    this.contentEl?.addEventListener('scroll', this.onAnyScroll, { passive: true });
  }

  private updateVisibility(): void {
    const windowY = window.scrollY || document.documentElement.scrollTop || 0;
    const contentY = this.contentEl?.scrollTop ?? 0;
    this.visible = Math.max(windowY, contentY) > this.showAfterPx;
  }
}
