import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketPortalNavComponent } from '../../components/ticket-portal-nav/ticket-portal-nav.component';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { LocaleDatePipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import {
  TicketAttachmentMeta,
  TicketDetail,
  TicketMessage,
  TicketService,
  TicketStatus,
  TicketTag
} from '../../services/ticket.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

type TicketDetailMode = 'customer' | 'admin';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent,
    TicketPortalNavComponent,
    MarkdownEditorComponent,
    LocaleDatePipe,
    LocaleDigitsPipe,
    MarkdownPipe
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="(isAdmin ? 'tickets.adminInbox.eyebrow' : 'tickets.portal.eyebrow') | translate"
        [title]="ticket?.subject || ('tickets.detail.title' | translate)"
        [subtitle]="ticket?.publicNumber || ('tickets.detail.subtitle' | translate)">
        <div heroActions>
          @if (ticket && canReopen) {
            <button mat-stroked-button type="button" [disabled]="lifecycleBusy" (click)="reopenTicket()">
              <mat-icon>lock_open</mat-icon>
              {{ 'tickets.detail.reopen' | translate }}
            </button>
          }
          @if (ticket && canClose) {
            <button mat-stroked-button type="button" color="warn" [disabled]="lifecycleBusy" (click)="closeTicket()">
              <mat-icon>lock</mat-icon>
              {{ 'tickets.detail.closeTicket' | translate }}
            </button>
          }
          <a mat-stroked-button [routerLink]="backLink">
            <mat-icon>arrow_back</mat-icon>
            {{ (isAdmin ? 'tickets.detail.backInbox' : 'tickets.detail.back') | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body">
        @if (!isAdmin) {
          <app-ticket-portal-nav active="mine"></app-ticket-portal-nav>
        }

        @if (loading) {
          <p class="muted">{{ 'tickets.detail.loading' | translate }}</p>
        } @else if (!ticket) {
          <div class="panel-surface empty-state">
            <mat-icon>error_outline</mat-icon>
            <p>{{ 'tickets.detail.notFound' | translate }}</p>
            <a mat-stroked-button [routerLink]="backLink">
              {{ (isAdmin ? 'tickets.detail.backInbox' : 'tickets.detail.back') | translate }}
            </a>
          </div>
        } @else {
          <div class="meta-bar panel-surface">
            <div class="meta-item">
              <span class="meta-label">{{ 'tickets.detail.meta.status' | translate }}</span>
              @if (isAdmin && statusOptions.length) {
                <mat-form-field appearance="outline" class="status-field" subscriptSizing="dynamic">
                  <mat-select
                    [value]="ticket.status"
                    [disabled]="statusUpdating"
                    (selectionChange)="onStatusChange($event.value)">
                    <mat-option [value]="ticket.status">
                      {{ ('tickets.statuses.' + ticket.status) | translate }}
                    </mat-option>
                    @for (status of statusOptions; track status) {
                      <mat-option [value]="status">
                        {{ ('tickets.statuses.' + status) | translate }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              } @else {
                <span class="status-pill" [attr.data-status]="ticket.status">
                  {{ ('tickets.statuses.' + ticket.status) | translate }}
                </span>
              }
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

          @if (isAdmin) {
            <div class="tags-card panel-surface">
              <div class="tags-header">
                <div>
                  <h2>{{ 'tickets.detail.tagsTitle' | translate }}</h2>
                  <p>{{ 'tickets.detail.tagsHint' | translate }}</p>
                </div>
                <a routerLink="/tickets/tags">{{ 'tickets.detail.manageTags' | translate }}</a>
              </div>
              <div class="selected-tags">
                @for (tag of selectedTags; track trackTag(tag)) {
                  <button type="button" class="tag-chip selected" (click)="removeTag(tag)" [disabled]="tagsSaving">
                    {{ tag.name }}
                    <mat-icon>close</mat-icon>
                  </button>
                } @empty {
                  <span class="muted-inline">{{ 'tickets.detail.noTags' | translate }}</span>
                }
              </div>
              <div class="tag-picker">
                @for (tag of availableCatalogTags; track tag.id) {
                  <button type="button" class="tag-chip" (click)="addCatalogTag(tag)" [disabled]="tagsSaving">
                    <mat-icon>add</mat-icon>
                    {{ tag.name }}
                  </button>
                }
              </div>
              <div class="freeform-row">
                <mat-form-field appearance="outline" class="freeform-field" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.detail.addTag' | translate }}</mat-label>
                  <input matInput
                         [(ngModel)]="freeformTag"
                         [ngModelOptions]="{standalone: true}"
                         maxlength="64"
                         (keydown.enter)="$event.preventDefault(); addFreeformTag()">
                </mat-form-field>
                <button mat-stroked-button type="button" [disabled]="tagsSaving || !freeformTag.trim()" (click)="addFreeformTag()">
                  {{ 'tickets.detail.addTagAction' | translate }}
                </button>
              </div>
            </div>
          } @else if (ticket.tags?.length) {
            <div class="tags-card panel-surface readonly-tags">
              <h2>{{ 'tickets.detail.tagsTitle' | translate }}</h2>
              <div class="selected-tags">
                @for (tag of ticket.tags; track tag.id) {
                  <span class="tag-chip selected">{{ tag.name }}</span>
                }
              </div>
            </div>
          }

          @if (isAdmin) {
            <p class="workflow-hint panel-surface">
              <mat-icon>account_tree</mat-icon>
              <span>{{ 'tickets.detail.workflowHint' | translate }}</span>
              <a routerLink="/tickets/status-workflow">{{ 'tickets.detail.manageWorkflow' | translate }}</a>
            </p>
          }

          @if (canReopen && reopenUntil) {
            <p class="reopen-hint panel-surface">
              <mat-icon>schedule</mat-icon>
              <span>{{ 'tickets.detail.reopenUntil' | translate:{ date: (reopenUntil | localeDate:dateTimeFormat) } }}</span>
            </p>
          }

          <div class="thread panel-surface">
            <div class="thread-header">
              <h2>{{ 'tickets.detail.conversation' | translate }}</h2>
              <span class="thread-count">
                {{ 'tickets.detail.messageCount' | translate:{ count: (messages.length | localeDigits) } }}
              </span>
            </div>
            <p class="thread-hint">{{ 'tickets.detail.threadHint' | translate }}</p>

            <ol class="timeline" aria-live="polite">
              @for (message of messages; track trackMessage($index, message); let i = $index; let last = $last) {
                <li class="timeline-item"
                    [class.mine]="message.mine"
                    [class.staff]="message.staff"
                    [class.initial]="message.initial"
                    [class.last]="last">
                  <div class="timeline-rail" aria-hidden="true">
                    <span class="timeline-dot"></span>
                    @if (!last) {
                      <span class="timeline-line"></span>
                    }
                  </div>
                  <article class="message">
                    <header class="message-header">
                      <div class="author-block">
                        <span class="step">{{ (i + 1) | localeDigits }}</span>
                        <strong>{{ message.authorName || message.authorEmail || ('tickets.detail.unknownAuthor' | translate) }}</strong>
                        @if (message.initial) {
                          <span class="role-tag">{{ 'tickets.detail.originalRequest' | translate }}</span>
                        } @else if (message.staff) {
                          <span class="role-tag staff">{{ 'tickets.detail.supportStaff' | translate }}</span>
                        } @else {
                          <span class="role-tag customer">{{ 'tickets.detail.customer' | translate }}</span>
                        }
                        @if (message.mine) {
                          <span class="you-tag">{{ 'tickets.detail.you' | translate }}</span>
                        }
                      </div>
                      <time dir="ltr">{{ message.createdAt | localeDate:dateTimeFormat }}</time>
                    </header>
                    <div class="message-body markdown-body" [innerHTML]="message.body | markdown"></div>
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
                </li>
              }
            </ol>
            <div #threadEnd></div>
          </div>

          @if (canReply) {
            <form class="reply-card panel-surface" [formGroup]="replyForm" (ngSubmit)="submitReply()">
              <h2>{{ 'tickets.detail.replyTitle' | translate }}</h2>
              <label class="reply-label">{{ 'tickets.detail.replyBody' | translate }}</label>
              <app-markdown-editor
                formControlName="body"
                [rows]="6"
                [maxLength]="10000"
                labelKey="tickets.detail.replyBody"
                placeholderKey="tickets.markdown.replyPlaceholder"
                [invalid]="replyForm.controls.body.touched && replyForm.controls.body.invalid">
              </app-markdown-editor>
              @if (replyForm.controls.body.touched && replyForm.controls.body.hasError('required')) {
                <p class="field-error">{{ 'tickets.detail.replyRequired' | translate }}</p>
              }

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
              @if (canReopen) {
                <button mat-flat-button color="primary" type="button" [disabled]="lifecycleBusy" (click)="reopenTicket()">
                  {{ 'tickets.detail.reopen' | translate }}
                </button>
              } @else if (ticket.status === 'CLOSED') {
                <p class="reopen-expired">{{ 'tickets.detail.reopenExpired' | translate }}</p>
              }
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
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .muted { color: var(--text-muted); padding: 12px 4px; }
    .empty-state, .closed-notice {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 32px 20px; text-align: center; color: var(--text-muted);
    }
    .meta-bar {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px; padding: 14px 16px; margin-bottom: 16px;
    }
    .meta-item { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .meta-item span[dir='ltr'] { white-space: nowrap; }
    .meta-label {
      font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;
    }
    .status-field { width: 100%; max-width: 220px; }
    .workflow-hint {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px;
      padding: 10px 14px; margin-bottom: 16px; color: var(--text-muted); font-size: 0.85rem;
    }
    .workflow-hint mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .workflow-hint a { color: var(--primary); font-weight: 600; text-decoration: none; }
    .workflow-hint a:hover { text-decoration: underline; }
    .reopen-hint {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 16px;
      color: var(--text-muted); font-size: 0.85rem;
    }
    .reopen-hint mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .tags-card { padding: 16px; margin-bottom: 16px; }
    .tags-header {
      display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px;
    }
    .tags-header h2, .readonly-tags h2 { margin: 0 0 4px; font-size: 1.05rem; }
    .tags-header p { margin: 0; color: var(--text-muted); font-size: 0.82rem; }
    .tags-header a { color: var(--primary); font-weight: 600; text-decoration: none; white-space: nowrap; }
    .selected-tags, .tag-picker {
      display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;
    }
    .tag-chip {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px;
      border: 1px solid var(--border-color); background: var(--bg-secondary); font: inherit; cursor: pointer;
    }
    .tag-chip.selected {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--primary) 35%, var(--border-color));
    }
    .tag-chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .freeform-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
    .freeform-field { flex: 1 1 220px; }
    .muted-inline { color: var(--text-muted); font-size: 0.85rem; }
    .reopen-expired { margin: 0; color: var(--text-muted); font-size: 0.85rem; }
    .status-pill, .priority-pill {
      display: inline-flex; align-items: center; width: fit-content;
      padding: 3px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
      background: var(--bg-secondary); border: 1px solid var(--border-color);
    }
    .status-pill[data-status='NEW'] { background: color-mix(in srgb, #2563eb 12%, transparent); }
    .status-pill[data-status='OPEN'] { background: color-mix(in srgb, #0891b2 12%, transparent); }
    .status-pill[data-status='PENDING'],
    .status-pill[data-status='ON_HOLD'] { background: color-mix(in srgb, #d97706 12%, transparent); }
    .status-pill[data-status='RESOLVED'] { background: color-mix(in srgb, #16a34a 12%, transparent); }
    .status-pill[data-status='CLOSED'] { background: color-mix(in srgb, #64748b 12%, transparent); }
    .priority-pill[data-priority='URGENT'],
    .priority-pill[data-priority='HIGH'] { background: color-mix(in srgb, #dc2626 10%, transparent); }
    .thread, .reply-card { padding: 18px 16px; margin-bottom: 16px; }
    .thread-header {
      display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 4px;
    }
    .thread h2, .reply-card h2 { margin: 0; font-size: 1.05rem; }
    .thread-count { color: var(--text-muted); font-size: 0.82rem; white-space: nowrap; }
    .thread-hint { margin: 0 0 16px; color: var(--text-muted); font-size: 0.82rem; }
    .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .timeline-item {
      display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 12px; align-items: stretch;
    }
    .timeline-rail {
      display: flex; flex-direction: column; align-items: center; padding-top: 18px;
    }
    .timeline-dot {
      width: 10px; height: 10px; border-radius: 50%; background: var(--primary);
      border: 2px solid color-mix(in srgb, var(--primary) 35%, white); flex: 0 0 auto;
    }
    .timeline-item.staff .timeline-dot {
      background: #0f766e; border-color: color-mix(in srgb, #0f766e 40%, white);
    }
    .timeline-line {
      width: 2px; flex: 1 1 auto; min-height: 16px; margin-top: 6px; background: var(--border-color);
    }
    .message {
      padding: 14px; border: 1px solid var(--border-color); border-radius: 10px;
      background: var(--bg-secondary); margin-bottom: 12px;
    }
    .timeline-item.mine .message {
      border-color: color-mix(in srgb, var(--primary) 35%, var(--border-color));
      background: color-mix(in srgb, var(--primary) 8%, transparent);
    }
    .timeline-item.staff .message {
      border-color: color-mix(in srgb, #0f766e 30%, var(--border-color));
      background: color-mix(in srgb, #0f766e 7%, transparent);
    }
    .message-header {
      display: flex; justify-content: space-between; gap: 12px; align-items: baseline;
      margin-bottom: 8px; font-size: 0.85rem;
    }
    .author-block {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; min-width: 0;
    }
    .step {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 1.4rem; height: 1.4rem; padding: 0 4px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 700; background: var(--bg-primary, #fff);
      border: 1px solid var(--border-color); color: var(--text-muted);
    }
    .message-header time { color: var(--text-muted); white-space: nowrap; }
    .role-tag, .you-tag {
      font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 999px;
      border: 1px solid var(--border-color); background: var(--bg-primary, #fff); color: var(--text-muted);
    }
    .role-tag.staff { color: #0f766e; border-color: color-mix(in srgb, #0f766e 35%, var(--border-color)); }
    .role-tag.customer { color: #2563eb; border-color: color-mix(in srgb, #2563eb 35%, var(--border-color)); }
    .you-tag { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 35%, var(--border-color)); }
    .message-body { word-break: break-word; line-height: 1.5; }
    .reply-label {
      display: block; margin: 12px 0 6px; font-size: 0.85rem; font-weight: 600; color: var(--text-muted);
    }
    .field-error {
      margin: 6px 0 0; font-size: 0.75rem; color: var(--mat-form-field-error-text-color, #f44336);
    }
    .attachment-list, .file-list {
      list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px;
    }
    .attachment-btn {
      display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px;
      border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-primary, #fff);
      color: inherit; font: inherit; cursor: pointer; text-align: start;
    }
    .file-list li {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-secondary);
    }
    .file-name {
      flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .file-size { color: var(--text-muted); font-size: 0.8rem; white-space: nowrap; }
    .attachments {
      display: flex; flex-direction: column; gap: 12px; padding: 14px;
      border: 1px dashed var(--border-color); border-radius: 8px; margin: 14px 0 12px;
    }
    .attachments-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    }
    .attachments-header h3 { margin: 0 0 4px; font-size: 0.95rem; }
    .attachments-header p { margin: 0; color: var(--text-muted); font-size: 0.82rem; }
    .actions { display: flex; justify-content: flex-end; }
    @media (max-width: 900px) { .meta-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 600px) {
      .meta-bar { grid-template-columns: 1fr; }
      .attachments-header, .message-header { flex-direction: column; }
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

  @ViewChild('threadEnd') threadEnd?: ElementRef<HTMLElement>;

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

  mode: TicketDetailMode = 'customer';
  ticketId: number | null = null;
  ticket: TicketDetail['ticket'] | null = null;
  messages: TicketMessage[] = [];
  canReply = false;
  canClose = false;
  canReopen = false;
  reopenUntil: string | null = null;
  loading = true;
  submitting = false;
  statusUpdating = false;
  lifecycleBusy = false;
  tagsSaving = false;
  downloadingId: number | null = null;
  files: File[] = [];
  statusOptions: TicketStatus[] = [];
  catalogTags: TicketTag[] = [];
  selectedTags: TicketTag[] = [];
  freeformTag = '';

  readonly replyForm = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.maxLength(10000)]]
  });

  get isAdmin(): boolean {
    return this.mode === 'admin';
  }

  get backLink(): string {
    return this.isAdmin ? '/admin/tickets/inbox' : '/tickets/mine';
  }

  get availableCatalogTags(): TicketTag[] {
    const selected = new Set(
      this.selectedTags.map((tag) => (tag.name || '').toLowerCase()).filter(Boolean)
    );
    return this.catalogTags.filter((tag) => !selected.has((tag.name || '').toLowerCase()));
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] === 'admin' ? 'admin' : 'customer';
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id) || id <= 0) {
      this.loading = false;
      this.ticket = null;
      return;
    }
    this.ticketId = id;
    this.load();
    if (this.mode === 'admin') {
      this.loadCatalogTags();
    }
  }

  trackMessage(index: number, message: TicketMessage): string {
    return message.id != null ? `m-${message.id}` : `initial-${index}`;
  }

  trackTag(tag: TicketTag): number | string {
    return tag.id ?? tag.name;
  }

  closeTicket(): void {
    if (!this.ticketId || !this.canClose || this.lifecycleBusy) {
      return;
    }
    this.lifecycleBusy = true;
    const request$ = this.isAdmin
      ? this.ticketService.closeAdminTicket(this.ticketId)
      : this.ticketService.closeMineTicket(this.ticketId);
    request$.subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.lifecycleBusy = false;
        this.snackBar.open(this.translate.instant('tickets.detail.closedSuccess'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.lifecycleBusy = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  reopenTicket(): void {
    if (!this.ticketId || !this.canReopen || this.lifecycleBusy) {
      return;
    }
    this.lifecycleBusy = true;
    const request$ = this.isAdmin
      ? this.ticketService.reopenAdminTicket(this.ticketId)
      : this.ticketService.reopenMineTicket(this.ticketId);
    request$.subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.lifecycleBusy = false;
        this.snackBar.open(this.translate.instant('tickets.detail.reopenedSuccess'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.lifecycleBusy = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  addCatalogTag(tag: TicketTag): void {
    if (this.selectedTags.some((t) => t.id === tag.id || t.name?.toLowerCase() === tag.name?.toLowerCase())) {
      return;
    }
    this.selectedTags = [...this.selectedTags, tag];
    this.persistTags();
  }

  addFreeformTag(): void {
    const name = this.freeformTag.trim();
    if (!name) {
      return;
    }
    if (this.selectedTags.some((t) => t.name?.toLowerCase() === name.toLowerCase())) {
      this.freeformTag = '';
      return;
    }
    this.selectedTags = [...this.selectedTags, { id: -Date.now(), name }];
    this.freeformTag = '';
    this.persistTags();
  }

  removeTag(tag: TicketTag): void {
    this.selectedTags = this.selectedTags.filter((t) => {
      if (tag.id != null && tag.id > 0 && t.id === tag.id) {
        return false;
      }
      return t.name?.toLowerCase() !== tag.name?.toLowerCase();
    });
    this.persistTags();
  }

  private persistTags(): void {
    if (!this.ticketId || !this.isAdmin || this.tagsSaving) {
      return;
    }
    this.tagsSaving = true;
    const tagIds = this.selectedTags.filter((t) => t.id != null && t.id > 0).map((t) => t.id!);
    const names = this.selectedTags.filter((t) => t.id == null || t.id <= 0).map((t) => t.name!).filter(Boolean);
    this.ticketService.updateAdminTicketTags(this.ticketId, { tagIds, names }).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.tagsSaving = false;
        this.loadCatalogTags();
      },
      error: (error) => {
        this.tagsSaving = false;
        this.showError(this.apiError.resolve(error));
        this.selectedTags = [...(this.ticket?.tags ?? [])];
      }
    });
  }

  private loadCatalogTags(): void {
    this.ticketService.listAdminTags().subscribe({
      next: (tags) => { this.catalogTags = tags ?? []; },
      error: () => { this.catalogTags = []; }
    });
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
      ? this.ticketService.downloadTicketAttachment(this.ticketId, file.id, fileName, this.isAdmin)
      : this.ticketService.downloadMessageAttachment(this.ticketId, message.id, file.id, fileName, this.isAdmin);

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
    const payload = {
      body: this.replyForm.controls.body.value.trim(),
      attachments: this.files
    };
    const request$ = this.isAdmin
      ? this.ticketService.replyAsAdmin(this.ticketId, payload)
      : this.ticketService.reply(this.ticketId, payload);

    request$.subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.replyForm.reset({ body: '' });
        this.files = [];
        this.submitting = false;
        this.snackBar.open(this.translate.instant('tickets.detail.replySent'), undefined, { duration: 3000 });
        this.scrollToLatest();
      },
      error: (error) => {
        this.submitting = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  onStatusChange(nextStatus: TicketStatus): void {
    if (!this.isAdmin || !this.ticketId || !this.ticket || this.statusUpdating) {
      return;
    }
    if (!nextStatus || nextStatus === this.ticket.status) {
      return;
    }
    this.statusUpdating = true;
    this.ticketService.updateAdminTicketStatus(this.ticketId, nextStatus).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.statusUpdating = false;
        this.snackBar.open(this.translate.instant('tickets.detail.statusUpdated'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.statusUpdating = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  private load(): void {
    if (!this.ticketId) {
      return;
    }
    this.loading = true;
    const request$ = this.isAdmin
      ? this.ticketService.getAdminTicket(this.ticketId)
      : this.ticketService.getMine(this.ticketId);

    request$.subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.loading = false;
        this.scrollToLatest();
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
    this.messages = [...(detail.messages ?? [])].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return (a.id ?? 0) - (b.id ?? 0);
    });
    this.canReply = !!detail.canReply;
    this.canClose = !!detail.canClose;
    this.canReopen = !!detail.canReopen;
    this.reopenUntil = detail.reopenUntil ?? null;
    this.statusOptions = (detail.allowedNextStatuses ?? []).filter((status) => status !== detail.ticket?.status);
    this.selectedTags = [...(detail.ticket?.tags ?? [])];
  }

  private scrollToLatest(): void {
    queueMicrotask(() => {
      this.threadEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
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
