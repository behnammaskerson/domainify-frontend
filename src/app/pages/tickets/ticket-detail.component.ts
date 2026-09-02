import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketPortalNavComponent } from '../../components/ticket-portal-nav/ticket-portal-nav.component';
import { LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import {
  TicketAttachmentMeta,
  TicketDetail,
  TicketMessage,
  TicketService
} from '../../services/ticket.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent,
    TicketPortalNavComponent,
    LocaleDatePipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.portal.eyebrow' | translate"
        [title]="ticket?.subject || ('tickets.detail.title' | translate)"
        [subtitle]="ticket?.publicNumber || ('tickets.detail.subtitle' | translate)">
        <div heroActions>
          <a mat-stroked-button routerLink="/tickets/mine">
            <mat-icon>arrow_back</mat-icon>
            {{ 'tickets.detail.back' | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body">
        <app-ticket-portal-nav active="mine"></app-ticket-portal-nav>

        @if (loading) {
          <p class="muted">{{ 'tickets.detail.loading' | translate }}</p>
        } @else if (!ticket) {
          <div class="panel-surface empty-state">
            <mat-icon>error_outline</mat-icon>
            <p>{{ 'tickets.detail.notFound' | translate }}</p>
            <a mat-stroked-button routerLink="/tickets/mine">{{ 'tickets.detail.back' | translate }}</a>
          </div>
        } @else {
          <div class="meta-bar panel-surface">
            <div class="meta-item">
              <span class="meta-label">{{ 'tickets.detail.meta.status' | translate }}</span>
              <span class="status-pill" [attr.data-status]="ticket.status">
                {{ ('tickets.statuses.' + ticket.status) | translate }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">{{ 'tickets.detail.meta.priority' | translate }}</span>
              <span class="priority-pill" [attr.data-priority]="ticket.priority">
                {{ ('tickets.priorities.' + ticket.priority) | translate }}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">{{ 'tickets.detail.meta.category' | translate }}</span>
              <span>{{ ticket.category?.name || '—' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">{{ 'tickets.detail.meta.created' | translate }}</span>
              <span dir="ltr">{{ ticket.createdAt | localeDate:dateTimeFormat }}</span>
            </div>
          </div>

          <div class="thread panel-surface">
            <h2>{{ 'tickets.detail.conversation' | translate }}</h2>

            @for (message of messages; track trackMessage($index, message)) {
              <article class="message" [class.mine]="message.mine">
                <header class="message-header">
                  <div>
                    <strong>{{ message.authorName || message.authorEmail || ('tickets.detail.unknownAuthor' | translate) }}</strong>
                    @if (message.mine) {
                      <span class="you-tag">{{ 'tickets.detail.you' | translate }}</span>
                    }
                  </div>
                  <time dir="ltr">{{ message.createdAt | localeDate:dateTimeFormat }}</time>
                </header>
                <div class="message-body">{{ message.body }}</div>
                @if (message.attachments?.length) {
                  <ul class="attachment-list">
                    @for (file of message.attachments; track file.id) {
                      <li>
                        <button type="button"
                                class="attachment-btn"
                                (click)="downloadAttachment(message, file)"
                                [disabled]="!file.id || downloadingId === file.id">
                          <mat-icon>attach_file</mat-icon>
                          <span class="file-name">{{ file.fileName }}</span>
                          <span class="file-size">{{ formatSize(file.sizeBytes || 0) }}</span>
                        </button>
                      </li>
                    }
                  </ul>
                }
              </article>
            }
          </div>

          @if (canReply) {
            <form class="reply-card panel-surface" [formGroup]="replyForm" (ngSubmit)="submitReply()">
              <h2>{{ 'tickets.detail.replyTitle' | translate }}</h2>
              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'tickets.detail.replyBody' | translate }}</mat-label>
                <textarea matInput formControlName="body" rows="5" maxlength="10000"></textarea>
                @if (replyForm.controls.body.touched && replyForm.controls.body.hasError('required')) {
                  <mat-error>{{ 'tickets.detail.replyRequired' | translate }}</mat-error>
                }
              </mat-form-field>

              <div class="attachments">
                <div class="attachments-header">
                  <div>
                    <h3>{{ 'tickets.detail.attachments' | translate }}</h3>
                    <p>{{ 'tickets.detail.attachmentsHint' | translate }}</p>
                  </div>
                  <button mat-stroked-button type="button"
                          (click)="fileInput.click()"
                          [disabled]="submitting || files.length >= maxFiles">
                    <mat-icon>attach_file</mat-icon>
                    {{ 'tickets.detail.addFiles' | translate }}
                  </button>
                  <input #fileInput
                         type="file"
                         hidden
                         multiple
                         accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                         (change)="onFilesSelected($event)">
                </div>

                @if (files.length) {
                  <ul class="file-list">
                    @for (file of files; track file.name + file.size; let i = $index) {
                      <li>
                        <mat-icon>description</mat-icon>
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">{{ formatSize(file.size) }}</span>
                        <button mat-icon-button type="button" (click)="removeFile(i)" [disabled]="submitting">
                          <mat-icon>close</mat-icon>
                        </button>
                      </li>
                    }
                  </ul>
                }
              </div>

              <div class="actions">
                <button mat-flat-button color="primary" type="submit"
                        [disabled]="submitting || replyForm.invalid">
                  {{ (submitting ? 'tickets.detail.sending' : 'tickets.detail.sendReply') | translate }}
                </button>
              </div>
            </form>
          } @else {
            <div class="closed-notice panel-surface">
              <mat-icon>lock</mat-icon>
              <p>{{ 'tickets.detail.closedNotice' | translate }}</p>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .page-body {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .muted {
      color: var(--text-muted);
      padding: 12px 4px;
    }

    .empty-state,
    .closed-notice {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 32px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .meta-bar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .meta-item span[dir='ltr'] {
      white-space: nowrap;
    }

    .meta-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .status-pill,
    .priority-pill {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
    }

    .status-pill[data-status='NEW'] {
      background: color-mix(in srgb, #2563eb 12%, transparent);
      border-color: color-mix(in srgb, #2563eb 35%, var(--border-color));
    }

    .status-pill[data-status='OPEN'] {
      background: color-mix(in srgb, #0891b2 12%, transparent);
      border-color: color-mix(in srgb, #0891b2 35%, var(--border-color));
    }

    .status-pill[data-status='PENDING'],
    .status-pill[data-status='ON_HOLD'] {
      background: color-mix(in srgb, #d97706 12%, transparent);
      border-color: color-mix(in srgb, #d97706 35%, var(--border-color));
    }

    .status-pill[data-status='RESOLVED'] {
      background: color-mix(in srgb, #16a34a 12%, transparent);
      border-color: color-mix(in srgb, #16a34a 35%, var(--border-color));
    }

    .status-pill[data-status='CLOSED'] {
      background: color-mix(in srgb, #64748b 12%, transparent);
      border-color: color-mix(in srgb, #64748b 35%, var(--border-color));
    }

    .priority-pill[data-priority='URGENT'],
    .priority-pill[data-priority='HIGH'] {
      background: color-mix(in srgb, #dc2626 10%, transparent);
      border-color: color-mix(in srgb, #dc2626 30%, var(--border-color));
    }

    .thread,
    .reply-card {
      padding: 18px 16px;
      margin-bottom: 16px;
    }

    .thread h2,
    .reply-card h2 {
      margin: 0 0 14px;
      font-size: 1.05rem;
    }

    .message {
      padding: 14px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-secondary);
      margin-bottom: 10px;
    }

    .message.mine {
      border-color: color-mix(in srgb, var(--primary) 35%, var(--border-color));
      background: color-mix(in srgb, var(--primary) 8%, transparent);
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
      margin-bottom: 8px;
      font-size: 0.85rem;
    }

    .message-header time {
      color: var(--text-muted);
      white-space: nowrap;
    }

    .you-tag {
      margin-inline-start: 8px;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--primary);
    }

    .message-body {
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.5;
    }

    .attachment-list,
    .file-list {
      list-style: none;
      margin: 12px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .attachment-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-primary, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: start;
    }

    .file-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary);
    }

    .file-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      color: var(--text-muted);
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .attachments {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px;
      border: 1px dashed var(--border-color);
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .attachments-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .attachments-header h3 {
      margin: 0 0 4px;
      font-size: 0.95rem;
    }

    .attachments-header p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    .full {
      width: 100%;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 900px) {
      .meta-bar {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 600px) {
      .meta-bar {
        grid-template-columns: 1fr;
      }

      .attachments-header {
        flex-direction: column;
      }

      .message-header {
        flex-direction: column;
      }
    }
  `]
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  readonly maxFiles = 5;
  readonly maxFileBytes = 5 * 1024 * 1024;
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;
  readonly allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

  ticketId: number | null = null;
  ticket: TicketDetail['ticket'] | null = null;
  messages: TicketMessage[] = [];
  canReply = false;
  loading = true;
  submitting = false;
  downloadingId: number | null = null;
  files: File[] = [];

  readonly replyForm = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.maxLength(10000)]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      this.loading = false;
      this.ticket = null;
      return;
    }
    this.ticketId = id;
    this.load();
  }

  trackMessage(index: number, message: TicketMessage): string {
    return message.id != null ? `m-${message.id}` : `initial-${index}`;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';

    for (const file of selected) {
      if (this.files.length >= this.maxFiles) {
        this.showError(this.translate.instant('errors.TICKET_ATTACHMENTS_LIMIT'));
        break;
      }
      if (file.size > this.maxFileBytes || !this.isAllowedFile(file)) {
        this.showError(this.translate.instant('errors.TICKET_ATTACHMENT_INVALID'));
        continue;
      }
      if (this.files.some((existing) => existing.name === file.name && existing.size === file.size)) {
        continue;
      }
      this.files = [...this.files, file];
    }
  }

  removeFile(index: number): void {
    this.files = this.files.filter((_, i) => i !== index);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  downloadAttachment(message: TicketMessage, file: TicketAttachmentMeta): void {
    if (!this.ticketId || !file.id) {
      return;
    }
    this.downloadingId = file.id;
    const fileName = file.fileName || 'attachment';
    const request$ = message.id == null
      ? this.ticketService.downloadTicketAttachment(this.ticketId, file.id, fileName)
      : this.ticketService.downloadMessageAttachment(this.ticketId, message.id, file.id, fileName);

    request$.subscribe({
      next: () => {
        this.downloadingId = null;
      },
      error: (error) => {
        this.downloadingId = null;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  submitReply(): void {
    this.replyForm.markAllAsTouched();
    if (!this.ticketId || this.replyForm.invalid || this.submitting || !this.canReply) {
      return;
    }

    this.submitting = true;
    this.ticketService.reply(this.ticketId, {
      body: this.replyForm.controls.body.value.trim(),
      attachments: this.files
    }).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.replyForm.reset({ body: '' });
        this.files = [];
        this.submitting = false;
        this.snackBar.open(this.translate.instant('tickets.detail.replySent'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.submitting = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private load(): void {
    if (!this.ticketId) {
      return;
    }
    this.loading = true;
    this.ticketService.getMine(this.ticketId).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.ticket = null;
        this.messages = [];
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private applyDetail(detail: TicketDetail): void {
    this.ticket = detail.ticket;
    this.messages = detail.messages ?? [];
    this.canReply = !!detail.canReply;
  }

  private isAllowedFile(file: File): boolean {
    if (file.type && this.allowedTypes.has(file.type)) {
      return true;
    }
    const name = file.name.toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.doc', '.docx']
      .some((ext) => name.endsWith(ext));
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
