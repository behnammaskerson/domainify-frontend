import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketPortalNavComponent } from '../../components/ticket-portal-nav/ticket-portal-nav.component';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { ApiErrorService } from '../../services/api-error.service';
import {
  TicketCategory,
  TicketPriority,
  TicketService
} from '../../services/ticket.service';

@Component({
  selector: 'app-create-ticket',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent,
    TicketPortalNavComponent,
    MarkdownEditorComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.portal.eyebrow' | translate"
        [title]="'tickets.create.title' | translate"
        [subtitle]="'tickets.create.subtitle' | translate">
        <div heroActions>
          <a mat-stroked-button routerLink="/tickets/mine">
            <mat-icon>list_alt</mat-icon>
            {{ 'tickets.create.viewMyTickets' | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body">
        <app-ticket-portal-nav active="create"></app-ticket-portal-nav>

        @if (categoriesLoading) {
          <p class="muted">{{ 'tickets.create.loadingCategories' | translate }}</p>
        } @else if (!categories.length) {
          <div class="notice-card panel-surface">
            <mat-icon>info</mat-icon>
            <div>
              <h2>{{ 'tickets.create.noCategoriesTitle' | translate }}</h2>
              <p>{{ 'tickets.create.noCategoriesMessage' | translate }}</p>
            </div>
            <a mat-stroked-button routerLink="/tickets/mine">
              {{ 'tickets.create.viewMyTickets' | translate }}
            </a>
          </div>
        } @else {
          <form class="panel-surface form-card" [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full">
              <mat-label>{{ 'tickets.create.subject' | translate }}</mat-label>
              <input matInput formControlName="subject" maxlength="200">
              @if (form.controls.subject.touched && form.controls.subject.hasError('required')) {
                <mat-error>{{ 'tickets.create.subjectRequired' | translate }}</mat-error>
              }
            </mat-form-field>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'tickets.create.category' | translate }}</mat-label>
                <mat-select formControlName="categoryId">
                  @for (category of categories; track category.id) {
                    <mat-option [value]="category.id">
                      {{ category.name }}
                    </mat-option>
                  }
                </mat-select>
                @if (form.controls.categoryId.touched && form.controls.categoryId.hasError('required')) {
                  <mat-error>{{ 'tickets.create.categoryRequired' | translate }}</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>{{ 'tickets.create.priority' | translate }}</mat-label>
                <mat-select formControlName="priority">
                  @for (priority of priorities; track priority) {
                    <mat-option [value]="priority">
                      {{ ('tickets.priorities.' + priority) | translate }}
                    </mat-option>
                  }
                </mat-select>
                @if (form.controls.priority.touched && form.controls.priority.hasError('required')) {
                  <mat-error>{{ 'tickets.create.priorityRequired' | translate }}</mat-error>
                }
              </mat-form-field>
            </div>

            <label class="field-label">{{ 'tickets.create.description' | translate }}</label>
            <app-markdown-editor
              formControlName="description"
              [rows]="8"
              [maxLength]="10000"
              labelKey="tickets.create.description"
              placeholderKey="tickets.markdown.descriptionPlaceholder"
              [invalid]="form.controls.description.touched && form.controls.description.invalid">
            </app-markdown-editor>
            @if (form.controls.description.touched && form.controls.description.hasError('required')) {
              <p class="field-error">{{ 'tickets.create.descriptionRequired' | translate }}</p>
            }

            <div class="attachments">
              <div class="attachments-header">
                <div>
                  <h3>{{ 'tickets.create.attachments' | translate }}</h3>
                  <p>{{ 'tickets.create.attachmentsHint' | translate }}</p>
                </div>
                <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="submitting || files.length >= maxFiles">
                  <mat-icon>attach_file</mat-icon>
                  {{ 'tickets.create.addFiles' | translate }}
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
              <button mat-flat-button color="primary" type="submit" [disabled]="submitting || form.invalid">
                {{ (submitting ? 'tickets.create.submitting' : 'tickets.create.submit') | translate }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .page {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .page-body {
      display: flex;
      flex-direction: column;
    }

    .form-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 20px;
    }

    .notice-card {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 14px;
      padding: 20px;
    }

    .notice-card mat-icon {
      color: var(--text-muted);
    }

    .notice-card h2 {
      margin: 0 0 6px;
      font-size: 1.05rem;
    }

    .notice-card p {
      margin: 0;
      color: var(--text-muted);
    }

    .muted {
      color: var(--text-muted);
      padding: 12px 4px;
    }

    .row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .full {
      width: 100%;
    }

    .field-label {
      display: block;
      margin: 8px 0 6px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .field-error {
      margin: 6px 0 0;
      font-size: 0.75rem;
      color: var(--mat-form-field-error-text-color, #f44336);
    }

    .attachments {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border: 1px dashed var(--border-color);
      border-radius: 8px;
      margin: 8px 0 12px;
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

    .file-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
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

    .actions {
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 720px) {
      .row,
      .attachments-header {
        grid-template-columns: 1fr;
        flex-direction: column;
      }

      .row {
        display: flex;
        flex-direction: column;
      }
    }
  `]
})
export class CreateTicketComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  categories: TicketCategory[] = [];
  categoriesLoading = true;
  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  readonly maxFiles = 5;
  readonly maxFileBytes = 5 * 1024 * 1024;
  readonly allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

  files: File[] = [];
  submitting = false;

  readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(10000)]],
    categoryId: this.fb.nonNullable.control<number | null>(null, Validators.required),
    priority: this.fb.nonNullable.control<TicketPriority>('MEDIUM', Validators.required)
  });

  ngOnInit(): void {
    this.ticketService.listActiveCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoriesLoading = false;
      },
      error: (error) => {
        this.categoriesLoading = false;
        this.showError(this.apiError.resolve(error));
      }
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

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) {
      return;
    }

    const value = this.form.getRawValue();
    if (!value.categoryId || !value.priority) {
      return;
    }

    this.submitting = true;
    this.ticketService.create({
      subject: value.subject.trim(),
      description: value.description.trim(),
      categoryId: value.categoryId,
      priority: value.priority,
      attachments: this.files
    }).subscribe({
      next: (ticket) => {
        this.submitting = false;
        this.snackBar.open(
          this.translate.instant('tickets.create.successToast', { number: ticket.publicNumber }),
          undefined,
          { duration: 5000 }
        );
        void this.router.navigate(['/tickets/mine']);
      },
      error: (error) => {
        this.submitting = false;
        this.showError(this.apiError.resolve(error));
      }
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
