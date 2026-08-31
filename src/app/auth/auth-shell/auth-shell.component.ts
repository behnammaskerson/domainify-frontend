import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <div class="auth-shell" [class.dark]="themeService.theme() === 'dark'">
      <div class="auth-top-controls">
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
            <button mat-menu-item
                    type="button"
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
      </div>

      <section class="auth-hero" [attr.aria-label]="'a11y.brand' | translate">
        <div class="hero-visual" aria-hidden="true">
          <div class="hero-orb hero-orb-a"></div>
          <div class="hero-orb hero-orb-b"></div>
          <svg class="hero-mesh" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="meshStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.55"/>
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.08"/>
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#meshStroke)" stroke-width="1.2">
              <path d="M80 140 L220 90 L360 160 L500 70 L640 150 L720 100"/>
              <path d="M60 320 L180 280 L320 360 L460 250 L600 340 L740 290"/>
              <path d="M100 520 L240 470 L380 560 L520 450 L660 540 L760 490"/>
              <path d="M40 700 L200 660 L340 740 L490 630 L630 720 L780 670"/>
              <path d="M220 90 L180 280 L240 470 L200 660"/>
              <path d="M360 160 L320 360 L380 560 L340 740"/>
              <path d="M500 70 L460 250 L520 450 L490 630"/>
              <path d="M640 150 L600 340 L660 540 L630 720"/>
            </g>
            <g fill="currentColor">
              <circle cx="220" cy="90" r="5" opacity="0.85"/>
              <circle cx="360" cy="160" r="4" opacity="0.65"/>
              <circle cx="500" cy="70" r="6" opacity="0.9"/>
              <circle cx="180" cy="280" r="4" opacity="0.55"/>
              <circle cx="460" cy="250" r="5" opacity="0.75"/>
              <circle cx="600" cy="340" r="4" opacity="0.6"/>
              <circle cx="380" cy="560" r="5" opacity="0.8"/>
              <circle cx="520" cy="450" r="4" opacity="0.55"/>
              <circle cx="340" cy="740" r="5" opacity="0.7"/>
              <circle cx="630" cy="720" r="4" opacity="0.5"/>
            </g>
          </svg>
        </div>

        <div class="hero-copy">
          <p class="brand">{{ 'app.name' | translate }}</p>
          <h1>{{ headline }}</h1>
          <p class="support">{{ support }}</p>
        </div>
      </section>

      <section class="auth-panel">
        <div class="panel-inner animate-panel">
          <header class="panel-header">
            <h2>{{ title }}</h2>
            <p>{{ subtitle }}</p>
          </header>
          <ng-content></ng-content>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100dvh;
      max-height: 100dvh;
      overflow: hidden;
      color: var(--text-primary);
    }

    .auth-shell {
      height: 100%;
      max-height: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      grid-template-rows: minmax(0, 1fr);
      position: relative;
      overflow: hidden;
      background: var(--bg-primary);
    }

    .auth-top-controls {
      position: fixed;
      top: 20px;
      inset-inline-end: 20px;
      display: flex;
      gap: 8px;
      z-index: 20;
    }

    .control-btn {
      width: 42px !important;
      height: 42px !important;
      background: color-mix(in srgb, var(--bg-primary) 88%, transparent) !important;
      border: 1px solid var(--border-color) !important;
      color: var(--text-secondary) !important;
      backdrop-filter: blur(10px);
      transition: color var(--transition-base), border-color var(--transition-base),
        background var(--transition-base), transform var(--transition-fast);
    }

    .control-btn:hover {
      color: var(--accent) !important;
      border-color: var(--accent) !important;
      transform: translateY(-1px);
    }

    .lang-code {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      margin-inline-end: 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--accent);
    }

    .active-lang {
      background: var(--accent-light) !important;
      color: var(--text-primary) !important;
    }

    .auth-hero {
      position: relative;
      overflow: hidden;
      min-height: 0;
      height: 100%;
      padding: clamp(32px, 6vh, 72px) clamp(32px, 6vw, 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hero-fg, #f7f1e4);
      background:
        radial-gradient(120% 80% at 10% 10%, rgba(212, 175, 55, 0.28), transparent 55%),
        radial-gradient(90% 70% at 90% 80%, rgba(184, 148, 31, 0.2), transparent 50%),
        linear-gradient(160deg, #14110d 0%, #1c1812 42%, #0f172a 100%);
    }

    .auth-shell.dark .auth-hero {
      background:
        radial-gradient(120% 80% at 12% 8%, rgba(212, 175, 55, 0.22), transparent 55%),
        radial-gradient(90% 70% at 88% 85%, rgba(245, 215, 107, 0.1), transparent 48%),
        linear-gradient(160deg, #080b12 0%, #101826 45%, #0b1220 100%);
    }

    .hero-visual {
      position: absolute;
      inset: 0;
      pointer-events: none;
      color: #d4af37;
    }

    .hero-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(2px);
      animation: orbFloat 14s ease-in-out infinite;
    }

    .hero-orb-a {
      width: 42vmax;
      height: 42vmax;
      top: -12%;
      inset-inline-start: -8%;
      background: radial-gradient(circle, rgba(245, 215, 107, 0.22), transparent 68%);
    }

    .hero-orb-b {
      width: 34vmax;
      height: 34vmax;
      bottom: -18%;
      inset-inline-end: -10%;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.18), transparent 70%);
      animation-delay: -6s;
    }

    .hero-mesh {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.55;
      animation: meshDrift 28s linear infinite;
    }

    .hero-copy {
      position: relative;
      z-index: 1;
      max-width: 34rem;
      text-align: center;
      animation: heroReveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .brand {
      margin: 0 0 18px;
      font-family: var(--font-display);
      font-size: clamp(2.75rem, 6vw, 4.75rem);
      font-weight: 800;
      line-height: 0.95;
      letter-spacing: -0.04em;
      color: #f5d76b;
    }

    .hero-copy h1 {
      margin: 0 0 14px;
      font-family: var(--font-display);
      font-size: clamp(1.55rem, 3vw, 2.35rem);
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: #f7f1e4;
    }

    .support {
      margin: 0 auto;
      max-width: 28rem;
      font-family: var(--font-ui);
      font-size: 1.05rem;
      line-height: 1.55;
      color: rgba(247, 241, 228, 0.78);
    }

    .auth-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: clamp(40px, 6vh, 72px) clamp(24px, 5vw, 64px);
      background: var(--bg-primary);
      border-inline-start: 1px solid var(--border-color);
    }

    .panel-inner {
      width: 100%;
      max-width: 420px;
      margin-block: auto;
    }

    .panel-header {
      margin-bottom: 28px;
    }

    .panel-header h2 {
      margin: 0 0 8px;
      font-family: var(--font-display);
      font-size: clamp(1.6rem, 2.4vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--text-primary);
    }

    .panel-header p {
      margin: 0;
      font-family: var(--font-ui);
      font-size: 0.98rem;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    .animate-panel {
      animation: panelReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
    }

    @keyframes orbFloat {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(2%, -3%, 0) scale(1.05); }
    }

    @keyframes meshDrift {
      0% { transform: translate3d(0, 0, 0) scale(1.02); }
      50% { transform: translate3d(-1.5%, 1%, 0) scale(1.05); }
      100% { transform: translate3d(0, 0, 0) scale(1.02); }
    }

    @keyframes heroReveal {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes panelReveal {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 900px) {
      :host {
        height: 100dvh;
        overflow: hidden;
      }

      .auth-shell {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(0, 0.38fr) minmax(0, 0.62fr);
      }

      .auth-hero {
        min-height: 0;
        height: auto;
        padding: 56px 24px 28px;
        align-items: center;
        justify-content: center;
      }

      .brand {
        font-size: clamp(2rem, 9vw, 2.8rem);
        margin-bottom: 10px;
      }

      .hero-copy h1 {
        font-size: clamp(1.2rem, 4.5vw, 1.6rem);
        margin-bottom: 8px;
      }

      .support {
        font-size: 0.92rem;
      }

      .auth-panel {
        border-inline-start: none;
        border-top: 1px solid var(--border-color);
        padding: 28px 24px 32px;
        align-items: flex-start;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .hero-orb,
      .hero-mesh,
      .hero-copy,
      .animate-panel {
        animation: none !important;
      }
    }
  `]
})
export class AuthShellComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  @Input({ required: true }) headline!: string;
  @Input({ required: true }) support!: string;

  readonly themeService = inject(ThemeService);
  readonly translationService = inject(TranslationService);
}
