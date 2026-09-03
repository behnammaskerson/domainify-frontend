import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleDatePipe } from '../../pipes/locale-format.pipe';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { TicketMessageRevision } from '../../services/ticket.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';

export interface TicketMessageRevisionsDialogData {
  authorName?: string;
  revisions: TicketMessageRevision[];
}

@Component({
  selector: 'app-ticket-message-revisions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    LocaleDatePipe,
    MarkdownPipe
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.messageHistoryTitle' | translate }}</h2>
    <mat-dialog-content class="history-content">
      @if (data.authorName) {
        <p class="history-intro">
          {{ 'tickets.detail.messageHistoryIntro' | translate:{ author: data.authorName } }}
        </p>
      }
      <ol class="revision-list">
        @for (revision of data.revisions; track revision.id) {
          <li class="revision-item">
            <header class="revision-header">
              <span class="revision-action" [attr.data-action]="revision.action">
                {{ ('tickets.detail.revisionAction.' + revision.action) | translate }}
              </span>
              <strong>{{ revision.actorName || revision.actorEmail || '—' }}</strong>
              <time dir="ltr">{{ revision.createdAt | localeDate:dateTimeFormat }}</time>
            </header>
            @if (revision.previousBody) {
              <div class="revision-block">
                <span class="revision-label">{{ 'tickets.detail.revisionBefore' | translate }}</span>
                <div class="revision-body markdown-body" [innerHTML]="revision.previousBody | markdown"></div>
              </div>
            }
            @if (revision.newBody) {
              <div class="revision-block">
                <span class="revision-label">{{ 'tickets.detail.revisionAfter' | translate }}</span>
                <div class="revision-body markdown-body" [innerHTML]="revision.newBody | markdown"></div>
              </div>
            }
          </li>
        }
      </ol>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ 'common.close' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .history-content {
      min-width: 480px;
      max-width: 720px;
      max-height: 70vh;
    }

    .history-intro {
      margin: 0 0 12px;
      color: var(--text-secondary);
      font-size: 0.92rem;
    }

    .revision-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .revision-item {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      background: var(--bg-secondary);
    }

    .revision-header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 0.82rem;
    }

    .revision-action {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 2px 6px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary);
    }

    .revision-action[data-action='DELETE'] {
      background: color-mix(in srgb, var(--danger) 12%, transparent);
      color: var(--danger);
    }

    .revision-header time {
      color: var(--text-muted);
      margin-inline-start: auto;
    }

    .revision-block + .revision-block {
      margin-top: 10px;
    }

    .revision-label {
      display: block;
      margin-bottom: 4px;
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .revision-body {
      font-size: 0.9rem;
      line-height: 1.5;
    }
  `]
})
export class TicketMessageRevisionsDialogComponent {
  readonly data = inject<TicketMessageRevisionsDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<TicketMessageRevisionsDialogComponent>);
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;
}
