import { Component, Inject, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import { TicketService } from '../../services/ticket.service';

export type AttachmentViewerMode = 'image' | 'pdf' | 'text' | 'unsupported';

export interface TicketAttachmentViewerData {
  fileName: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  load: () => Observable<Blob>;
}

@Component({
  selector: 'app-ticket-attachment-viewer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
    <div class="viewer-shell">
      <header class="viewer-header">
        <div class="meta">
          <mat-icon class="type-icon" aria-hidden="true">{{ typeIcon }}</mat-icon>
          <div class="meta-copy">
            <h2 mat-dialog-title>{{ data.fileName || ('tickets.attachmentViewer.untitled' | translate) }}</h2>
            <p class="sub">
              @if (data.sizeBytes != null) {
                <span>{{ formatSize(data.sizeBytes) }}</span>
              }
              @if (modeLabelKey) {
                <span>· {{ modeLabelKey | translate }}</span>
              }
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button mat-stroked-button type="button" [disabled]="!blob || downloading" (click)="download()">
            <mat-icon>download</mat-icon>
            {{ 'tickets.attachmentViewer.download' | translate }}
          </button>
          <button mat-icon-button type="button"
                  [attr.aria-label]="'common.close' | translate"
                  mat-dialog-close>
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </header>

      <mat-dialog-content class="viewer-body">
        @if (loading) {
          <div class="state">
            <mat-spinner diameter="36"></mat-spinner>
            <p>{{ 'tickets.attachmentViewer.loading' | translate }}</p>
          </div>
        } @else if (error) {
          <div class="state error">
            <mat-icon>error_outline</mat-icon>
            <p>{{ 'tickets.attachmentViewer.loadFailed' | translate }}</p>
            <button mat-stroked-button type="button" (click)="reload()">
              {{ 'tickets.attachmentViewer.retry' | translate }}
            </button>
          </div>
        } @else if (mode === 'image' && objectUrl) {
          <div class="image-wrap">
            <img [src]="objectUrl" [alt]="data.fileName || ''">
          </div>
        } @else if (mode === 'pdf' && safePdfUrl) {
          <iframe class="pdf-frame" [src]="safePdfUrl" [title]="data.fileName || 'PDF'"></iframe>
        } @else if (mode === 'text') {
          <pre class="text-preview" dir="auto">{{ textContent }}</pre>
        } @else {
          <div class="state">
            <mat-icon>visibility_off</mat-icon>
            <p>{{ 'tickets.attachmentViewer.unsupported' | translate }}</p>
            <button mat-flat-button color="primary" type="button" [disabled]="!blob" (click)="download()">
              <mat-icon>download</mat-icon>
              {{ 'tickets.attachmentViewer.download' | translate }}
            </button>
          </div>
        }
      </mat-dialog-content>
    </div>
  `,
  styles: [`
    .viewer-shell {
      display: flex;
      flex-direction: column;
      min-height: min(70vh, 720px);
      max-height: 85vh;
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .viewer-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 16px 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .meta {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .type-icon {
      color: var(--accent);
      margin-top: 2px;
    }

    .meta-copy {
      min-width: 0;
    }

    h2[mat-dialog-title] {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.3;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: min(52vw, 520px);
    }

    .sub {
      margin: 4px 0 0;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .header-actions mat-icon {
      margin-inline-end: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .viewer-body {
      flex: 1;
      min-height: 0;
      margin: 0;
      padding: 0 !important;
      max-height: none;
      overflow: auto;
      background: var(--bg-secondary);
    }

    .state {
      min-height: 280px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .state.error {
      color: var(--danger, #c62828);
    }

    .state mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    .image-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      min-height: 280px;
    }

    .image-wrap img {
      max-width: 100%;
      max-height: min(68vh, 640px);
      object-fit: contain;
      border-radius: 8px;
      box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.12));
      background: var(--bg-primary);
    }

    .pdf-frame {
      display: block;
      width: 100%;
      height: min(68vh, 640px);
      border: 0;
      background: var(--bg-primary);
    }

    .text-preview {
      margin: 0;
      padding: 16px 18px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.82rem;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--text-primary);
      background: var(--bg-primary);
      min-height: 280px;
    }

    @media (max-width: 720px) {
      .viewer-header {
        flex-direction: column;
      }

      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }

      h2[mat-dialog-title] {
        max-width: 100%;
      }
    }
  `]
})
export class TicketAttachmentViewerDialogComponent implements OnInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly ticketService = inject(TicketService);
  private loadSub?: Subscription;

  loading = true;
  error = false;
  downloading = false;
  mode: AttachmentViewerMode = 'unsupported';
  blob: Blob | null = null;
  objectUrl: string | null = null;
  safePdfUrl: SafeResourceUrl | null = null;
  textContent = '';
  typeIcon = 'attach_file';
  modeLabelKey = '';

  constructor(@Inject(MAT_DIALOG_DATA) readonly data: TicketAttachmentViewerData) {}

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.revokeUrl();
  }

  reload(): void {
    this.loadSub?.unsubscribe();
    this.loading = true;
    this.error = false;
    this.revokeUrl();
    this.blob = null;
    this.textContent = '';
    this.safePdfUrl = null;

    this.loadSub = this.data.load().subscribe({
      next: (blob) => {
        this.blob = blob;
        this.mode = this.resolveMode(blob, this.data.fileName, this.data.contentType);
        this.typeIcon = this.iconForMode(this.mode);
        this.modeLabelKey = this.labelKeyForMode(this.mode);
        this.preparePreview(blob);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  download(): void {
    if (!this.blob || this.downloading) {
      return;
    }
    this.downloading = true;
    this.ticketService.saveBlob(this.blob, this.data.fileName || 'attachment');
    this.downloading = false;
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

  private preparePreview(blob: Blob): void {
    if (this.mode === 'image') {
      this.objectUrl = URL.createObjectURL(blob);
      return;
    }
    if (this.mode === 'pdf') {
      this.objectUrl = URL.createObjectURL(blob);
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
      return;
    }
    if (this.mode === 'text') {
      blob.text().then((text) => {
        this.textContent = text;
      }).catch(() => {
        this.mode = 'unsupported';
        this.typeIcon = this.iconForMode(this.mode);
        this.modeLabelKey = this.labelKeyForMode(this.mode);
      });
    }
  }

  private resolveMode(blob: Blob, fileName?: string, contentType?: string | null): AttachmentViewerMode {
    const type = (contentType || blob.type || '').toLowerCase();
    const name = (fileName || '').toLowerCase();

    if (type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(name)) {
      return 'image';
    }
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return 'pdf';
    }
    if (
      type.startsWith('text/')
      || type === 'application/json'
      || /\.(txt|log|md|csv|json|xml)$/i.test(name)
    ) {
      return 'text';
    }
    return 'unsupported';
  }

  private iconForMode(mode: AttachmentViewerMode): string {
    switch (mode) {
      case 'image':
        return 'image';
      case 'pdf':
        return 'picture_as_pdf';
      case 'text':
        return 'article';
      default:
        return 'attach_file';
    }
  }

  private labelKeyForMode(mode: AttachmentViewerMode): string {
    switch (mode) {
      case 'image':
        return 'tickets.attachmentViewer.types.image';
      case 'pdf':
        return 'tickets.attachmentViewer.types.pdf';
      case 'text':
        return 'tickets.attachmentViewer.types.text';
      default:
        return 'tickets.attachmentViewer.types.file';
    }
  }

  private revokeUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
