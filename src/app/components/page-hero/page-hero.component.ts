import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <section class="page-hero" [class.has-actions]="hasProjectedActions" [attr.aria-label]="'a11y.pageHeader' | translate">
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-orb hero-orb-a"></div>
        <div class="hero-orb hero-orb-b"></div>
        <svg class="hero-mesh" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="pageMeshStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0.06"/>
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#pageMeshStroke)" stroke-width="1.1">
            <path d="M40 80 L180 40 L340 100 L520 30 L700 90 L880 45 L1060 85 L1160 50"/>
            <path d="M20 180 L160 140 L320 200 L500 130 L680 190 L860 145 L1040 185 L1180 150"/>
            <path d="M60 260 L200 220 L360 280 L540 210 L720 270 L900 225 L1080 265"/>
            <path d="M180 40 L160 140 L200 220"/>
            <path d="M340 100 L320 200 L360 280"/>
            <path d="M520 30 L500 130 L540 210"/>
            <path d="M700 90 L680 190 L720 270"/>
            <path d="M880 45 L860 145 L900 225"/>
          </g>
          <g fill="currentColor">
            <circle cx="180" cy="40" r="4" opacity="0.85"/>
            <circle cx="340" cy="100" r="3.5" opacity="0.65"/>
            <circle cx="520" cy="30" r="5" opacity="0.9"/>
            <circle cx="700" cy="90" r="3.5" opacity="0.7"/>
            <circle cx="880" cy="45" r="4" opacity="0.8"/>
            <circle cx="500" cy="130" r="3.5" opacity="0.55"/>
            <circle cx="720" cy="270" r="4" opacity="0.65"/>
          </g>
        </svg>
      </div>

      <div class="hero-inner">
        <div class="hero-copy">
          @if (eyebrow) {
            <p class="eyebrow">{{ eyebrow }}</p>
          }
          <h1>{{ title }}</h1>
          @if (subtitle) {
            <p class="support">{{ subtitle }}</p>
          }
        </div>
        <div class="hero-actions" #actionsRef>
          <ng-content select="[heroActions]"></ng-content>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .page-hero {
      position: relative;
      overflow: hidden;
      margin: 0 0 28px;
      padding: clamp(28px, 4vh, 44px) clamp(20px, 4vw, 40px);
      color: #f7f1e4;
      background:
        radial-gradient(90% 120% at 8% 0%, rgba(212, 175, 55, 0.26), transparent 55%),
        radial-gradient(70% 100% at 92% 100%, rgba(184, 148, 31, 0.16), transparent 50%),
        linear-gradient(160deg, #14110d 0%, #1c1812 45%, #0f172a 100%);
    }

    :host-context(body.dark-theme) .page-hero {
      background:
        radial-gradient(90% 120% at 10% 0%, rgba(212, 175, 55, 0.2), transparent 55%),
        radial-gradient(70% 100% at 90% 100%, rgba(245, 215, 107, 0.08), transparent 48%),
        linear-gradient(160deg, #080b12 0%, #101826 50%, #0b1220 100%);
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
      animation: orbFloat 16s ease-in-out infinite;
    }

    .hero-orb-a {
      width: 28vmax;
      height: 28vmax;
      top: -40%;
      inset-inline-start: -8%;
      background: radial-gradient(circle, rgba(245, 215, 107, 0.2), transparent 70%);
    }

    .hero-orb-b {
      width: 22vmax;
      height: 22vmax;
      bottom: -50%;
      inset-inline-end: -6%;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.14), transparent 70%);
      animation-delay: -7s;
    }

    .hero-mesh {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.45;
      animation: meshDrift 30s linear infinite;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      animation: heroReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .hero-copy {
      max-width: 40rem;
      min-width: min(100%, 280px);
      flex: 1;
    }

    .eyebrow {
      margin: 0 0 10px;
      font-family: var(--font-ui);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #f5d76b;
    }

    h1 {
      margin: 0 0 10px;
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 3.2vw, 2.65rem);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: #f7f1e4;
    }

    .support {
      margin: 0;
      max-width: 34rem;
      font-family: var(--font-ui);
      font-size: 1rem;
      line-height: 1.5;
      color: rgba(247, 241, 228, 0.78);
    }

    .hero-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .hero-actions:empty {
      display: none;
    }

    @keyframes orbFloat {
      0%, 100% { transform: translate3d(0, 0, 0); }
      50% { transform: translate3d(2%, -3%, 0); }
    }

    @keyframes meshDrift {
      0% { transform: translate3d(0, 0, 0) scale(1.02); }
      50% { transform: translate3d(-1%, 1%, 0) scale(1.04); }
      100% { transform: translate3d(0, 0, 0) scale(1.02); }
    }

    @keyframes heroReveal {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 720px) {
      .hero-inner {
        align-items: stretch;
      }

      .hero-actions {
        width: 100%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .hero-orb,
      .hero-mesh,
      .hero-inner {
        animation: none !important;
      }
    }
  `]
})
export class PageHeroComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
  @Input() eyebrow = '';
  /** Reserved for template binding if needed later */
  hasProjectedActions = true;
}
