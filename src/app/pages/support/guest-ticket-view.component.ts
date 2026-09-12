import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { GuestTicketService } from '../../services/guest-ticket.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { TicketDetail, TicketMessage } from '../../services/ticket.service';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

@Component({
  selector: 'app-guest-ticket-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule,
    MarkdownEditorComponent,
    MarkdownPipe,
    LocaleDatePipe
  ],
  template: `
    <div class="guest-page" [class.dark]="themeService.theme() === 'dark'">
      <header class="topbar">
        <a class="brand" routerLink="/login">{{ 'app.name' | translate }}</a>
        <div class="topbar-actions">
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
      </header>

      <main class="shell">
        @if (loading) {
          <div class="state-card">
            <mat-progress-spinner diameter="40" mode="indeterminate"></mat-progress-spinner>
            <p>{{ 'guestSupport.view.loading' | translate }}</p>
          </div>
        } @else if (errorKey) {
          <div class="state-card">
            <mat-icon class="state-icon">link_off</mat-icon>
            <h1>{{ 'guestSupport.view.title' | translate }}</h1>
            <p>{{ errorKey | translate }}</p>
            <a mat-flat-button color="primary" routerLink="/support/new">
              {{ 'guestSupport.view.newRequest' | translate }}
            </a>
          </div>
        } @else if (detail) {
          <section class="ticket-card">
            <div class="ticket-head">
              <p class="eyebrow">{{ 'guestSupport.view.heroTitle' | translate }}</p>
              <h1>{{ ticketPublicNumber }}</h1>
              <p class="subject">{{ ticketSubject }}</p>
              <div class="meta">
                @if (ticketStatus) {
                  <span class="chip">{{ ('tickets.statuses.' + ticketStatus) | translate }}</span>
                }
                @if (ticketPriority) {
                  <span class="chip">{{ ('tickets.priorities.' + ticketPriority) | translate }}</span>
                }
                @if (ticketCategoryName) {
                  <span class="chip">{{ ticketCategoryName }}</span>
                }
              </div>
              <p class="hint">{{ 'guestSupport.view.heroSupport' | translate }}</p>
              <div class="head-actions">
                <a mat-stroked-button [routerLink]="['/support/tickets']" [queryParams]="{ token: token }">
                  <mat-icon>list</mat-icon>
                  {{ 'guestSupport.list.myTickets' | translate }}
                </a>
              </div>
            </div>

            <div class="thread">
              @for (msg of visibleMessages; track trackMessage($index, msg)) {
                <article class="bubble" [class.mine]="msg.mine" [class.staff]="msg.staff">
                  <div class="bubble-meta">
                    <strong>{{ msg.authorName || ('guestSupport.view.unknownAuthor' | translate) }}</strong>
                    <time dir="ltr">{{ msg.createdAt | localeDate:dateTimeFormat }}</time>
                  </div>
                  <div class="bubble-body markdown-body" [innerHTML]="msg.body | markdown"></div>
                </article>
              }
            </div>

            @if (canGuestReply) {
              <form class="reply-form" [formGroup]="replyForm" (ngSubmit)="sendReply()">
                <label class="field-label">{{ 'guestSupport.view.reply' | translate }}</label>
                <app-markdown-editor
                  formControlName="body"
                  [rows]="5"
                  [maxLength]="10000"
                  labelKey="guestSupport.view.reply"
                  placeholderKey="tickets.markdown.replyPlaceholder"
                  [invalid]="replyForm.controls.body.touched && replyForm.controls.body.invalid">
                </app-markdown-editor>
                <div class="reply-actions">
                  <button mat-flat-button color="primary" type="submit"
                          [disabled]="replyForm.invalid || replying">
                    @if (replying) {
                      <mat-progress-spinner diameter="18" mode="indeterminate"></mat-progress-spinner>
                    } @else {
                      {{ 'guestSupport.view.send' | translate }}
                    }
                  </button>
                </div>
              </form>
            } @else {
              <p class="closed-note">{{ 'guestSupport.view.closed' | translate }}</p>
            }
          </section>
        }
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
      color: var(--text-primary);
      background: var(--bg-primary);
    }

    .guest-page {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(120% 70% at 0% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 55%),
        radial-gradient(90% 60% at 100% 100%, color-mix(in srgb, var(--primary, #d4af37) 10%, transparent), transparent 50%),
        var(--bg-primary);
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem clamp(1rem, 4vw, 2rem);
      border-bottom: 1px solid var(--border-color);
      background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
      backdrop-filter: blur(12px);
    }

    .brand {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--text-primary);
      text-decoration: none;
    }

    .brand:hover {
      color: var(--accent);
    }

    .topbar-actions {
      display: flex;
      gap: 0.35rem;
    }

    .control-btn {
      color: var(--text-secondary) !important;
    }

    .lang-code {
      display: inline-flex;
      min-width: 28px;
      margin-inline-end: 10px;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
    }

    .active-lang {
      background: var(--accent-light) !important;
    }

    .shell {
      flex: 1;
      width: min(760px, 100%);
      margin: 0 auto;
      padding: 1.5rem clamp(1rem, 4vw, 1.75rem) 2.5rem;
    }

    .state-card,
    .ticket-card {
      border: 1px solid var(--border-color);
      border-radius: 18px;
      background: color-mix(in srgb, var(--bg-primary) 92%, var(--accent-light));
      box-shadow: 0 18px 40px color-mix(in srgb, #000 8%, transparent);
    }

    .state-card {
      display: grid;
      justify-items: center;
      gap: 0.85rem;
      text-align: center;
      padding: 3rem 1.5rem;
    }

    .state-card h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.5rem;
    }

    .state-card p {
      margin: 0;
      color: var(--text-secondary);
      max-width: 28rem;
      line-height: 1.5;
    }

    .state-icon {
      font-size: 2.75rem;
      width: 2.75rem;
      height: 2.75rem;
      color: var(--accent);
    }

    .ticket-head {
      padding: 1.5rem 1.35rem 1.15rem;
      border-bottom: 1px solid var(--border-color);
    }

    .eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .ticket-head h1 {
      margin: 0 0 0.4rem;
      font-family: var(--font-display);
      font-size: clamp(1.45rem, 3vw, 1.9rem);
      letter-spacing: -0.03em;
    }

    .subject {
      margin: 0 0 0.9rem;
      color: var(--text-secondary);
      line-height: 1.45;
      font-size: 1.02rem;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.85rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border-color));
      border-radius: 999px;
      padding: 0.2rem 0.7rem;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--text-primary);
      background: color-mix(in srgb, var(--accent-light) 70%, transparent);
    }

    .hint {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .head-actions {
      margin-top: 14px;
    }

    .head-actions a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .thread {
      display: grid;
      gap: 0.85rem;
      padding: 1.15rem 1.35rem;
    }

    .bubble {
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 0.9rem 1rem;
      background: var(--bg-primary);
    }

    .bubble.mine {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border-color));
      background: color-mix(in srgb, var(--accent-light) 55%, var(--bg-primary));
    }

    .bubble.staff {
      border-color: color-mix(in srgb, var(--primary, #d4af37) 35%, var(--border-color));
      background: color-mix(in srgb, var(--primary, #d4af37) 8%, var(--bg-primary));
    }

    .bubble-meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.75rem;
      margin-bottom: 0.55rem;
      font-size: 0.82rem;
    }

    .bubble-meta strong {
      color: var(--text-primary);
    }

    .bubble-meta time {
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .bubble-body {
      margin: 0;
      word-break: break-word;
      font-size: 0.98rem;
      line-height: 1.5;
      color: var(--text-primary);
    }

    .reply-form {
      display: grid;
      gap: 0.65rem;
      padding: 0 1.35rem 1.35rem;
      border-top: 1px solid var(--border-color);
      padding-top: 1.15rem;
    }

    .field-label {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .full-width {
      width: 100%;
    }

    .reply-actions {
      display: flex;
      justify-content: flex-end;
    }

    .closed-note {
      margin: 0;
      padding: 1rem 1.35rem 1.35rem;
      color: var(--text-secondary);
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 640px) {
      .bubble-meta {
        flex-direction: column;
        gap: 0.2rem;
      }

      .bubble-meta time {
        white-space: normal;
      }
    }
  `]
})
export class GuestTicketViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly guestTickets = inject(GuestTicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  readonly themeService = inject(ThemeService);
  readonly translationService = inject(TranslationService);
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;

  token = '';
  loading = true;
  replying = false;
  errorKey: string | null = null;
  detail: TicketDetail | null = null;

  readonly replyForm = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(10000)]]
  });

  get canGuestReply(): boolean {
    return !!this.detail?.canReply;
  }

  get ticketPublicNumber(): string {
    return this.detail?.ticket?.publicNumber ?? '';
  }

  get ticketSubject(): string {
    return this.detail?.ticket?.subject ?? '';
  }

  get ticketStatus(): string {
    return this.detail?.ticket?.status ?? '';
  }

  get ticketPriority(): string {
    return this.detail?.ticket?.priority ?? '';
  }

  get ticketCategoryName(): string | null {
    return this.detail?.ticket?.category?.name ?? null;
  }

  get visibleMessages(): TicketMessage[] {
    return (this.detail?.messages ?? []).filter((m) => !m.deleted && !m.internalNote);
  }

  trackMessage(index: number, msg: TicketMessage): string | number {
    return msg.id ?? `initial-${msg.createdAt ?? index}`;
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.loading = false;
      this.errorKey = 'guestSupport.view.invalidLink';
      return;
    }
    this.guestTickets.getByToken(this.token).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorKey = 'guestSupport.view.invalidLink';
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 4000 });
      }
    });
  }

  sendReply(): void {
    if (!this.token || this.replyForm.invalid || this.replying) {
      this.replyForm.markAllAsTouched();
      return;
    }
    this.replying = true;
    this.guestTickets.reply(this.token, this.replyForm.controls.body.value.trim()).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.replyForm.reset({ body: '' });
        this.replying = false;
      },
      error: (error) => {
        this.replying = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
      }
    });
  }
}
