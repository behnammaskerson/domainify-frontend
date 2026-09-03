import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketPortalNavComponent } from '../../components/ticket-portal-nav/ticket-portal-nav.component';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { TicketMergeDialogComponent } from '../../components/ticket-merge-dialog/ticket-merge-dialog.component';
import { TicketSplitDialogComponent } from '../../components/ticket-split-dialog/ticket-split-dialog.component';
import { TicketLinkDialogComponent } from '../../components/ticket-link-dialog/ticket-link-dialog.component';
import { TicketAttachmentViewerDialogComponent } from '../../components/ticket-attachment-viewer-dialog/ticket-attachment-viewer-dialog.component';
import { LocaleDatePipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import {
  TicketAttachmentMeta,
  TicketAttachmentPolicy,
  TicketDetail,
  TicketMessage,
  TicketService,
  TicketStatus,
  TicketTag,
  RelatedTicket
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
    MatDialogModule,
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
          @if (ticket && canSplit) {
            <button mat-stroked-button type="button" [disabled]="lifecycleBusy" (click)="splitTicket()">
              <mat-icon>call_split</mat-icon>
              {{ 'tickets.detail.split' | translate }}
            </button>
          }
          @if (ticket && canMerge) {
            <button mat-stroked-button type="button" [disabled]="lifecycleBusy" (click)="mergeTicket()">
              <mat-icon>merge_type</mat-icon>
              {{ 'tickets.detail.merge' | translate }}
            </button>
          }
          @if (ticket && canRestore) {
            <button mat-stroked-button type="button" [disabled]="lifecycleBusy" (click)="restoreTicket()">
              <mat-icon>restore_from_trash</mat-icon>
              {{ 'tickets.detail.restore' | translate }}
            </button>
          }
          @if (ticket && canUnarchive) {
            <button mat-stroked-button type="button" [disabled]="lifecycleBusy" (click)="unarchiveTicket()">
              <mat-icon>unarchive</mat-icon>
              {{ 'tickets.detail.unarchive' | translate }}
            </button>
          }
          @if (ticket && canArchive) {
            <button mat-stroked-button type="button" [disabled]="lifecycleBusy" (click)="archiveTicket()">
              <mat-icon>archive</mat-icon>
              {{ 'tickets.detail.archive' | translate }}
            </button>
          }
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
          @if (ticket && canSoftDelete) {
            <button mat-stroked-button type="button" color="warn" [disabled]="lifecycleBusy" (click)="softDeleteTicket()">
              <mat-icon>delete</mat-icon>
              {{ 'tickets.detail.softDelete' | translate }}
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
            <div class="meta-item meta-created">
              <span class="meta-label">{{ 'tickets.detail.meta.created' | translate }}</span>
              <span class="meta-created-value" dir="ltr">{{ ticket.createdAt | localeDate:dateTimeFormat }}</span>
            </div>
          </div>

          @if (ticket.splitFromPublicNumber) {
            <p class="lifecycle-banner panel-surface merge-banner">
              <mat-icon>call_split</mat-icon>
              <span>
                {{ 'tickets.detail.splitFromNotice' | translate }}
                @if (isAdmin && ticket.splitFromId) {
                  <a [routerLink]="['/admin/tickets', ticket.splitFromId]">
                    {{ ticket.splitFromPublicNumber }}
                  </a>
                } @else {
                  <strong dir="ltr">{{ ticket.splitFromPublicNumber }}</strong>
                }
              </span>
            </p>
          }

          @if (ticket.splitChildPublicNumbers; as splitChildren) {
            @if (splitChildren.length) {
              <p class="lifecycle-banner panel-surface merge-banner">
                <mat-icon>call_split</mat-icon>
                <span>
                  {{ 'tickets.detail.splitChildrenNotice' | translate: {
                    numbers: splitChildren.join(', ')
                  } }}
                </span>
              </p>
            }
          }

          @if (ticket.mergedIntoPublicNumber) {
            <p class="lifecycle-banner panel-surface merge-banner">
              <mat-icon>merge_type</mat-icon>
              <span>
                {{ 'tickets.detail.mergedIntoNotice' | translate }}
                @if (isAdmin && ticket.mergedIntoId) {
                  <a [routerLink]="['/admin/tickets', ticket.mergedIntoId]">
                    {{ ticket.mergedIntoPublicNumber }}
                  </a>
                } @else {
                  <strong dir="ltr">{{ ticket.mergedIntoPublicNumber }}</strong>
                }
              </span>
            </p>
          }

          @if (ticket.mergedSourcePublicNumbers; as mergedSources) {
            @if (mergedSources.length) {
              <p class="lifecycle-banner panel-surface merge-banner">
                <mat-icon>call_merge</mat-icon>
                <span>
                  {{ 'tickets.detail.mergedFromNotice' | translate: {
                    numbers: mergedSources.join(', ')
                  } }}
                </span>
              </p>
            }
          }

          @if (ticket.archived || ticket.deleted) {
            <p class="lifecycle-banner panel-surface" [class.deleted]="ticket.deleted">
              <mat-icon>{{ ticket.deleted ? 'delete' : 'archive' }}</mat-icon>
              <span>
                {{ (ticket.deleted ? 'tickets.detail.deletedNotice' : 'tickets.detail.archivedNotice') | translate }}
              </span>
            </p>
          }

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
            <div class="related-card panel-surface">
              <div class="tags-header">
                <div>
                  <h2>{{ 'tickets.detail.relatedTitle' | translate }}</h2>
                  <p>{{ 'tickets.detail.relatedHint' | translate }}</p>
                </div>
                @if (canLinkRelated) {
                  <button mat-stroked-button type="button" [disabled]="lifecycleBusy" (click)="linkRelatedTickets()">
                    <mat-icon>link</mat-icon>
                    {{ 'tickets.detail.linkRelated' | translate }}
                  </button>
                }
              </div>
              @if (relatedTickets.length === 0) {
                <p class="muted-inline">{{ 'tickets.detail.noRelated' | translate }}</p>
              } @else {
                <ul class="related-list">
                  @for (related of relatedTickets; track related.id) {
                    <li class="related-item">
                      <a class="related-link" [routerLink]="['/admin/tickets', related.id]">
                        <span class="related-number" dir="ltr">{{ related.publicNumber }}</span>
                        <span class="related-subject">{{ related.subject }}</span>
                        <span class="status-pill" [attr.data-status]="related.status">
                          {{ ('tickets.statuses.' + related.status) | translate }}
                        </span>
                      </a>
                      @if (canLinkRelated) {
                        <button mat-icon-button
                                type="button"
                                [disabled]="lifecycleBusy"
                                [matTooltip]="'tickets.detail.unlinkRelated' | translate"
                                (click)="unlinkRelatedTicket(related.id)">
                          <mat-icon>link_off</mat-icon>
                        </button>
                      }
                    </li>
                  }
                </ul>
              }
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
                          <li class="attachment-row">
                            <div class="attachment-info">
                              <mat-icon class="attachment-icon" aria-hidden="true">{{ attachmentIcon(file) }}</mat-icon>
                              <div class="attachment-copy">
                                <span class="file-name" [matTooltip]="file.fileName || ''">{{ file.fileName }}</span>
                                <span class="file-size">{{ formatSize(file.sizeBytes || 0) }}</span>
                              </div>
                            </div>
                            <div class="attachment-actions">
                              <button mat-stroked-button
                                      type="button"
                                      class="attach-action"
                                      (click)="viewAttachment(message, file)"
                                      [disabled]="!file.id || busyAttachmentId === file.id"
                                      [matTooltip]="'tickets.attachmentViewer.view' | translate">
                                <mat-icon>visibility</mat-icon>
                                <span class="action-label">{{ 'tickets.attachmentViewer.view' | translate }}</span>
                              </button>
                              <button mat-stroked-button
                                      type="button"
                                      class="attach-action"
                                      (click)="downloadAttachment(message, file)"
                                      [disabled]="!file.id || busyAttachmentId === file.id"
                                      [matTooltip]="'tickets.attachmentViewer.download' | translate">
                                <mat-icon>download</mat-icon>
                                <span class="action-label">{{ 'tickets.attachmentViewer.download' | translate }}</span>
                              </button>
                            </div>
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
                    <p>{{ attachmentsHint }}</p>
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
                         [attr.accept]="acceptAttr"
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
    .meta-created {
      align-items: center;
      text-align: center;
    }
    .meta-created-value {
      display: block;
      width: 100%;
      text-align: center;
      white-space: nowrap;
    }
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
    .lifecycle-banner {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 16px;
      color: var(--text-muted); font-size: 0.85rem;
    }
    .lifecycle-banner.deleted {
      color: var(--danger, #c62828);
      border-color: color-mix(in srgb, var(--danger, #c62828) 35%, var(--border-color));
    }
    .lifecycle-banner mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .merge-banner a {
      margin-inline-start: 6px;
      color: var(--primary);
      font-weight: 600;
      text-decoration: none;
    }
    .merge-banner a:hover { text-decoration: underline; }
    .tags-card { padding: 16px; margin-bottom: 16px; }
    .related-card { padding: 16px; margin-bottom: 16px; }
    .related-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .related-item {
      display: flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .related-link {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      text-decoration: none;
      color: inherit;
      min-width: 0;
    }
    .related-link:hover { background: color-mix(in srgb, var(--primary) 6%, transparent); }
    .related-number {
      font-weight: 600;
      color: var(--primary);
      white-space: nowrap;
    }
    .related-subject {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
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
    .attachment-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 8px;
      background: var(--bg-primary, #fff); flex-wrap: wrap;
    }
    .attachment-info { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1 1 180px; }
    .attachment-icon { color: var(--accent); flex-shrink: 0; }
    .attachment-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .attachment-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .attach-action mat-icon { font-size: 18px; width: 18px; height: 18px; margin-inline-end: 4px; }
    .file-list li {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-secondary);
    }
    .file-name {
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600;
    }
    .file-size { color: var(--text-muted); font-size: 0.8rem; white-space: nowrap; }
    @media (max-width: 600px) {
      .action-label { display: none; }
      .attach-action mat-icon { margin-inline-end: 0; }
    }
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  @ViewChild('threadEnd') threadEnd?: ElementRef<HTMLElement>;

  maxFiles = 5;
  maxFileBytes = 5 * 1024 * 1024;
  maxFileSizeMb = 5;
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;
  allowedTypes = new Set<string>([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/x-log',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);
  allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.log', '.doc', '.docx'];
  acceptAttr = this.allowedExtensions.join(',') + ',' + [...this.allowedTypes].join(',');
  attachmentsHint = '';

  mode: TicketDetailMode = 'customer';
  ticketId: number | null = null;
  ticket: TicketDetail['ticket'] | null = null;
  messages: TicketMessage[] = [];
  canReply = false;
  canClose = false;
  canReopen = false;
  canArchive = false;
  canUnarchive = false;
  canSoftDelete = false;
  canRestore = false;
  canMerge = false;
  canSplit = false;
  canLinkRelated = false;
  reopenUntil: string | null = null;
  loading = true;
  submitting = false;
  statusUpdating = false;
  lifecycleBusy = false;
  tagsSaving = false;
  busyAttachmentId: number | null = null;
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

  get relatedTickets(): RelatedTicket[] {
    return this.ticket?.relatedTickets ?? [];
  }

  get availableCatalogTags(): TicketTag[] {
    const selected = new Set(
      this.selectedTags.map((tag) => (tag.name || '').toLowerCase()).filter(Boolean)
    );
    return this.catalogTags.filter((tag) => !selected.has((tag.name || '').toLowerCase()));
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] === 'admin' ? 'admin' : 'customer';
    this.refreshAttachmentsHint();
    this.loadAttachmentPolicy();
    if (this.mode === 'admin') {
      this.loadCatalogTags();
    }

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : NaN;
      if (!Number.isFinite(id) || id <= 0) {
        this.loading = false;
        this.ticket = null;
        this.ticketId = null;
        return;
      }
      this.ticketId = id;
      this.load();
    });
  }

  private loadAttachmentPolicy(): void {
    this.ticketService.getAttachmentPolicy().subscribe({
      next: (policy) => this.applyAttachmentPolicy(policy),
      error: () => this.refreshAttachmentsHint()
    });
  }

  private applyAttachmentPolicy(policy: TicketAttachmentPolicy): void {
    this.maxFiles = Math.max(1, policy.maxAttachments || 5);
    this.maxFileSizeMb = Math.max(1, policy.maxAttachmentSizeMb || 5);
    this.maxFileBytes = policy.maxAttachmentBytes || this.maxFileSizeMb * 1024 * 1024;
    this.allowedTypes = new Set((policy.allowedContentTypes ?? []).map((t) => t.toLowerCase()));
    this.allowedExtensions = (policy.allowedExtensions ?? []).map((ext) => ext.toLowerCase());
    this.acceptAttr = [...this.allowedExtensions, ...this.allowedTypes].join(',');
    this.refreshAttachmentsHint(policy.allowedAttachmentKinds);
  }

  private refreshAttachmentsHint(kinds?: string[]): void {
    const typeLabels = (kinds?.length ? kinds : ['IMAGE', 'PDF', 'LOG', 'DOCUMENT'])
      .map((kind) => this.translate.instant('settings.ticketSettings.kinds.' + kind))
      .join(', ');
    this.attachmentsHint = this.translate.instant('tickets.detail.attachmentsHint', {
      max: this.maxFiles,
      sizeMb: this.maxFileSizeMb,
      types: typeLabels
    });
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

  archiveTicket(): void {
    if (!this.isAdmin || !this.ticketId || !this.canArchive || this.lifecycleBusy) {
      return;
    }
    this.lifecycleBusy = true;
    this.ticketService.archiveAdminTicket(this.ticketId).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.lifecycleBusy = false;
        this.snackBar.open(this.translate.instant('tickets.detail.archivedSuccess'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.lifecycleBusy = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  unarchiveTicket(): void {
    if (!this.isAdmin || !this.ticketId || !this.canUnarchive || this.lifecycleBusy) {
      return;
    }
    this.lifecycleBusy = true;
    this.ticketService.unarchiveAdminTicket(this.ticketId).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.lifecycleBusy = false;
        this.snackBar.open(this.translate.instant('tickets.detail.unarchivedSuccess'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.lifecycleBusy = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  mergeTicket(): void {
    if (!this.isAdmin || !this.ticketId || !this.canMerge || this.lifecycleBusy) {
      return;
    }
    this.dialog
      .open(TicketMergeDialogComponent, {
        width: '780px',
        maxWidth: '90vw',
        data: {
          targetTicketId: this.ticketId,
          targetPublicNumber: this.ticket?.publicNumber
        }
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result?.sourceTicketId || !this.ticketId) {
          return;
        }
        this.lifecycleBusy = true;
        this.ticketService.mergeAdminTicket(this.ticketId, result.sourceTicketId).subscribe({
          next: (detail) => {
            this.applyDetail(detail);
            this.lifecycleBusy = false;
            this.scrollToLatest();
            this.snackBar.open(this.translate.instant('tickets.detail.mergedSuccess'), undefined, { duration: 3000 });
          },
          error: (error) => {
            this.lifecycleBusy = false;
            this.showError(this.apiError.resolve(error));
          }
        });
      });
  }

  splitTicket(): void {
    if (!this.isAdmin || !this.ticketId || !this.canSplit || this.lifecycleBusy) {
      return;
    }
    this.dialog
      .open(TicketSplitDialogComponent, {
        width: '640px',
        maxWidth: '95vw',
        data: {
          sourcePublicNumber: this.ticket?.publicNumber,
          messages: this.messages
        }
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result?.messageIds.length || !this.ticketId) {
          return;
        }
        this.lifecycleBusy = true;
        this.ticketService.splitAdminTicket(this.ticketId, result).subscribe({
          next: (splitResult) => {
            this.applyDetail(splitResult.source);
            this.lifecycleBusy = false;
            const newId = splitResult.newTicket?.id;
            const snack = this.snackBar.open(
              this.translate.instant('tickets.detail.splitSuccess'),
              newId ? this.translate.instant('tickets.detail.splitOpenNew') : undefined,
              { duration: 8000 }
            );
            if (newId) {
              snack.onAction().subscribe(() => {
                void this.router.navigate(['/admin/tickets', newId]);
              });
            }
          },
          error: (error) => {
            this.lifecycleBusy = false;
            this.showError(this.apiError.resolve(error));
          }
        });
      });
  }

  linkRelatedTickets(): void {
    if (!this.isAdmin || !this.ticketId || !this.canLinkRelated || this.lifecycleBusy) {
      return;
    }
    const excludedIds = [
      this.ticketId,
      ...this.relatedTickets.map((t) => t.id)
    ];
    this.dialog
      .open(TicketLinkDialogComponent, {
        width: '780px',
        maxWidth: '90vw',
        data: {
          targetTicketId: this.ticketId,
          targetPublicNumber: this.ticket?.publicNumber,
          excludedTicketIds: excludedIds
        }
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result?.relatedTicketIds.length || !this.ticketId) {
          return;
        }
        this.lifecycleBusy = true;
        this.ticketService.linkAdminRelatedTickets(this.ticketId, result.relatedTicketIds).subscribe({
          next: (detail) => {
            this.applyDetail(detail);
            this.lifecycleBusy = false;
            this.snackBar.open(this.translate.instant('tickets.detail.linkedSuccess'), undefined, { duration: 3000 });
          },
          error: (error) => {
            this.lifecycleBusy = false;
            this.showError(this.apiError.resolve(error));
          }
        });
      });
  }

  unlinkRelatedTicket(relatedId: number): void {
    if (!this.isAdmin || !this.ticketId || !this.canLinkRelated || this.lifecycleBusy) {
      return;
    }
    this.lifecycleBusy = true;
    this.ticketService.unlinkAdminRelatedTicket(this.ticketId, relatedId).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.lifecycleBusy = false;
        this.snackBar.open(this.translate.instant('tickets.detail.unlinkedSuccess'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.lifecycleBusy = false;
        this.showError(this.apiError.resolve(error));
      }
    });
  }

  softDeleteTicket(): void {
    if (!this.isAdmin || !this.ticketId || !this.canSoftDelete || this.lifecycleBusy) {
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'tickets.detail.softDeleteTitle',
        messageKey: 'tickets.detail.softDeleteMessage',
        confirmKey: 'tickets.detail.softDelete',
        confirmColor: 'warn' as const
      }
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed || !this.ticketId) {
        return;
      }
      this.lifecycleBusy = true;
      this.ticketService.softDeleteAdminTicket(this.ticketId).subscribe({
        next: (detail) => {
          this.applyDetail(detail);
          this.lifecycleBusy = false;
          this.snackBar.open(this.translate.instant('tickets.detail.softDeletedSuccess'), undefined, { duration: 3000 });
        },
        error: (error) => {
          this.lifecycleBusy = false;
          this.showError(this.apiError.resolve(error));
        }
      });
    });
  }

  restoreTicket(): void {
    if (!this.isAdmin || !this.ticketId || !this.canRestore || this.lifecycleBusy) {
      return;
    }
    this.lifecycleBusy = true;
    this.ticketService.restoreAdminTicket(this.ticketId).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.lifecycleBusy = false;
        this.snackBar.open(this.translate.instant('tickets.detail.restoredSuccess'), undefined, { duration: 3000 });
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

  attachmentIcon(file: TicketAttachmentMeta): string {
    const type = (file.contentType || '').toLowerCase();
    const name = (file.fileName || '').toLowerCase();
    if (type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(name)) {
      return 'image';
    }
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return 'picture_as_pdf';
    }
    if (type.startsWith('text/') || /\.(txt|log|md|csv|json|xml)$/i.test(name)) {
      return 'article';
    }
    return 'attach_file';
  }

  viewAttachment(message: TicketMessage, file: TicketAttachmentMeta): void {
    if (!this.ticketId || !file.id) {
      return;
    }
    const ticketId = this.ticketId;
    const attachmentId = file.id;
    const messageId = message.id;
    const admin = this.isAdmin;

    this.dialog.open(TicketAttachmentViewerDialogComponent, {
      width: 'min(920px, 96vw)',
      maxWidth: '96vw',
      autoFocus: false,
      panelClass: 'ticket-attachment-viewer-panel',
      data: {
        fileName: file.fileName || 'attachment',
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        load: () => messageId == null
          ? this.ticketService.fetchTicketAttachment(ticketId, attachmentId, admin)
          : this.ticketService.fetchMessageAttachment(ticketId, messageId, attachmentId, admin)
      }
    });
  }

  downloadAttachment(message: TicketMessage, file: TicketAttachmentMeta): void {
    if (!this.ticketId || !file.id) {
      return;
    }
    this.busyAttachmentId = file.id;
    const fileName = file.fileName || 'attachment';
    const request$ = message.id == null
      ? this.ticketService.downloadTicketAttachment(this.ticketId, file.id, fileName, this.isAdmin)
      : this.ticketService.downloadMessageAttachment(this.ticketId, message.id, file.id, fileName, this.isAdmin);

    request$.subscribe({
      next: () => {
        this.busyAttachmentId = null;
      },
      error: (error) => {
        this.busyAttachmentId = null;
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
    this.canArchive = !!detail.canArchive;
    this.canUnarchive = !!detail.canUnarchive;
    this.canSoftDelete = !!detail.canSoftDelete;
    this.canRestore = !!detail.canRestore;
    this.canMerge = !!detail.canMerge;
    this.canSplit = !!detail.canSplit;
    this.canLinkRelated = !!detail.canLinkRelated;
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
    if (file.type && this.allowedTypes.has(file.type.toLowerCase())) {
      return true;
    }
    const name = file.name.toLowerCase();
    return this.allowedExtensions.some((ext) => name.endsWith(ext));
  }

  private showError(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 6000,
      panelClass: ['error-snackbar']
    });
  }
}
