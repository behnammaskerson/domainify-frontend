import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthShellComponent } from '../../auth/auth-shell/auth-shell.component';
import { CaptchaComponent, CaptchaResult } from '../../components/captcha/captcha.component';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { ApiErrorService } from '../../services/api-error.service';
import { GuestTicketService } from '../../services/guest-ticket.service';
import { TicketCategory, TicketPriority } from '../../services/ticket.service';

@Component({
  selector: 'app-guest-create-ticket',
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
    MatProgressSpinnerModule,
    TranslateModule,
    AuthShellComponent,
    CaptchaComponent,
    MarkdownEditorComponent
  ],
  template: `
    <app-auth-shell
      [compact]="true"
      [title]="'guestSupport.create.title' | translate"
      [subtitle]="'guestSupport.create.subtitle' | translate"
      [headline]="'guestSupport.create.heroTitle' | translate"
      [support]="'guestSupport.create.heroSupport' | translate">

      <a routerLink="/login" class="back-link">
        <mat-icon>arrow_back</mat-icon>
        {{ 'guestSupport.create.backToLogin' | translate }}
      </a>

      @if (configLoading) {
        <p class="muted">{{ 'guestSupport.create.loading' | translate }}</p>
      } @else if (!createEnabled) {
        <div class="success-panel">
          <mat-icon>block</mat-icon>
          <h2>{{ 'guestSupport.create.disabledTitle' | translate }}</h2>
          <p>{{ 'guestSupport.create.disabledBody' | translate }}</p>
        </div>
      } @else if (submitted) {
        <div class="success-panel">
          <mat-icon>mark_email_read</mat-icon>
          <h2>{{ 'guestSupport.create.successTitle' | translate }}</h2>
          <p>{{ 'guestSupport.create.successBody' | translate }}</p>
        </div>
      } @else if (categoriesLoading) {
        <p class="muted">{{ 'guestSupport.create.loading' | translate }}</p>
      } @else if (!categories.length) {
        <div class="success-panel">
          <mat-icon>info</mat-icon>
          <h2>{{ 'guestSupport.create.noCategoriesTitle' | translate }}</h2>
          <p>{{ 'guestSupport.create.noCategoriesBody' | translate }}</p>
        </div>
      } @else {
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
            <mat-label>{{ 'guestSupport.create.name' | translate }}</mat-label>
            <input matInput formControlName="name" autocomplete="name">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
            <mat-label>{{ 'guestSupport.create.email' | translate }}</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
            <mat-label>{{ 'guestSupport.create.subject' | translate }}</mat-label>
            <input matInput formControlName="subject" maxlength="200">
          </mat-form-field>

          <div class="field-row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ 'guestSupport.create.category' | translate }}</mat-label>
              <mat-select formControlName="categoryId">
                @for (cat of categories; track cat.id) {
                  <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ 'guestSupport.create.priority' | translate }}</mat-label>
              <mat-select formControlName="priority">
                @for (p of priorities; track p) {
                  <mat-option [value]="p">{{ ('tickets.priorities.' + p) | translate }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="editor-field">
            <label class="field-label">{{ 'guestSupport.create.description' | translate }}</label>
            <app-markdown-editor
              formControlName="description"
              [rows]="6"
              [maxLength]="10000"
              labelKey="guestSupport.create.description"
              placeholderKey="tickets.markdown.descriptionPlaceholder"
              [invalid]="form.controls.description.touched && form.controls.description.invalid">
            </app-markdown-editor>
            @if (form.controls.description.touched && form.controls.description.invalid) {
              <p class="field-error">{{ 'guestSupport.create.descriptionRequired' | translate }}</p>
            }
          </div>

          @if (attachmentsEnabled) {
            <div class="attach-row">
              <label class="attach-label">
                <input type="file" multiple [accept]="acceptAttr" (change)="onFilesSelected($event)">
                <mat-icon>attach_file</mat-icon>
                <span>{{ 'guestSupport.create.attachments' | translate }}</span>
              </label>
              <p class="hint">{{ attachmentsHint }}</p>
              @if (files.length) {
                <ul class="file-list">
                  @for (file of files; track file.name + file.size) {
                    <li>
                      <span>{{ file.name }}</span>
                      <button mat-icon-button type="button" (click)="removeFile(file)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </li>
                  }
                </ul>
              }
            </div>
          }

          @if (captchaEnabled) {
            <app-captcha (captchaResult)="onCaptchaResult($event)"></app-captcha>
          }

          <button mat-flat-button color="primary" class="full-width submit-btn"
                  type="submit" [disabled]="form.invalid || submitting || (captchaEnabled && !captchaValid)">
            @if (submitting) {
              <mat-progress-spinner diameter="20" strokeWidth="3" mode="indeterminate"></mat-progress-spinner>
            } @else {
              {{ 'guestSupport.create.submit' | translate }}
            }
          </button>
        </form>
      }

      <p class="footer-link">
        <a routerLink="/support/tickets">{{ 'guestSupport.list.myTickets' | translate }}</a>
      </p>
    </app-auth-shell>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 20px;
      color: var(--accent, #c9a227);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .back-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: inherit;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    [dir="rtl"] .back-link mat-icon {
      transform: scaleX(-1);
    }

    .auth-form {
      display: grid;
      gap: 4px;
      width: 100%;
    }

    .editor-field {
      display: grid;
      gap: 8px;
      margin: 4px 0 8px;
    }

    .field-label {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text-secondary, #666);
    }

    .field-error {
      margin: 0;
      font-size: 0.75rem;
      color: var(--mat-form-field-error-text-color, #f44336);
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .full-width,
    .submit-btn,
    .field-row > mat-form-field {
      width: 100%;
    }

    .submit-btn {
      margin-top: 8px;
      height: 48px !important;
      font-weight: 700 !important;
    }

    .footer-link {
      text-align: center;
      margin-top: 18px;
    }

    .footer-link a {
      color: var(--accent, #c9a227);
      font-weight: 600;
      text-decoration: none;
    }

    .muted {
      color: var(--text-secondary, #666);
    }

    .success-panel {
      text-align: center;
      display: grid;
      gap: 0.75rem;
      justify-items: center;
      padding: 1rem 0;
    }

    .success-panel mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: var(--primary, #c9a227);
    }

    .attach-row {
      margin: 4px 0 8px;
    }

    .attach-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-weight: 600;
      color: var(--accent, #c9a227);
    }

    .attach-label mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .attach-label input {
      display: none;
    }

    .hint {
      font-size: 0.85rem;
      color: var(--text-secondary, #666);
      margin: 6px 0 0;
    }

    .file-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0;
    }

    .file-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.25rem 0;
    }

    @media (max-width: 560px) {
      .field-row {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }
  `]
})
export class GuestCreateTicketComponent implements OnInit {
  @ViewChild(CaptchaComponent) captchaComponent?: CaptchaComponent;
  
  private readonly fb = inject(FormBuilder);
  private readonly guestTickets = inject(GuestTicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  categories: TicketCategory[] = [];
  categoriesLoading = true;
  configLoading = true;
  createEnabled = true;
  attachmentsEnabled = true;
  captchaEnabled = false;
  captchaValid = false;
  captchaResult: CaptchaResult | null = null;
  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  files: File[] = [];
  submitting = false;
  submitted = false;
  maxFiles = 5;
  maxFileBytes = 5 * 1024 * 1024;
  acceptAttr = '.jpg,.jpeg,.png,.webp,.pdf,.txt,.log,.doc,.docx';
  attachmentsHint = '';

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10000)]],
    categoryId: this.fb.nonNullable.control<number | null>(null, Validators.required),
    priority: this.fb.nonNullable.control<TicketPriority>('MEDIUM', Validators.required)
  });

  ngOnInit(): void {
    this.refreshHint();
    this.guestTickets.getConfig().subscribe({
      next: (config) => {
        this.createEnabled = config.guestTicketCreateEnabled !== false;
        this.attachmentsEnabled = config.guestTicketAttachmentsEnabled !== false;
        // Check if CAPTCHA is enabled by trying to generate one
        this.checkCaptchaEnabled();
        this.configLoading = false;
        if (this.createEnabled) {
          this.loadCategoriesAndPolicy();
        } else {
          this.categoriesLoading = false;
        }
      },
      error: (error) => {
        this.configLoading = false;
        this.categoriesLoading = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 4000 });
      }
    });
  }

  private loadCategoriesAndPolicy(): void {
    this.guestTickets.getAttachmentPolicy().subscribe({
      next: (policy) => {
        this.maxFiles = policy.maxAttachments ?? this.maxFiles;
        this.maxFileBytes = (policy.maxAttachmentSizeMb ?? 5) * 1024 * 1024;
        this.refreshHint();
      },
      error: () => this.refreshHint()
    });
    this.guestTickets.listCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoriesLoading = false;
      },
      error: (error) => {
        this.categoriesLoading = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 4000 });
      }
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    for (const file of selected) {
      if (this.files.length >= this.maxFiles) break;
      if (file.size > this.maxFileBytes) continue;
      this.files.push(file);
    }
  }

  removeFile(file: File): void {
    this.files = this.files.filter((f) => f !== file);
  }

  submit(): void {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.categoryId == null) return;
    this.submitting = true;
    this.guestTickets.create({
      name: value.name.trim(),
      email: value.email.trim(),
      subject: value.subject.trim(),
      description: value.description.trim(),
      categoryId: value.categoryId,
      priority: value.priority,
      attachments: this.attachmentsEnabled ? this.files : [],
      captchaToken: this.captchaResult?.token,
      captchaAnswer: this.captchaResult?.answer
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
      },
      error: (error) => {
        this.submitting = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 5000 });
      }
    });
  }

  private checkCaptchaEnabled(): void {
    // Check if CAPTCHA is enabled by checking the guest config first
    this.guestTickets.getConfig().subscribe({
      next: () => {
        // If config loads successfully, try to generate CAPTCHA
        fetch('http://localhost:8080/api/public/captcha/generate', {
          method: 'POST'
        }).then(response => response.json())
          .then((result: any) => {
            this.captchaEnabled = !!(result.token && result.imageDataUrl);
          })
          .catch(() => {
            this.captchaEnabled = false;
          });
      },
      error: () => {
        this.captchaEnabled = false;
      }
    });
  }

  onCaptchaResult(result: CaptchaResult | null): void {
    this.captchaResult = result;
    this.captchaValid = !!(result?.token && result?.answer);
  }

  private refreshHint(): void {
    this.attachmentsHint = this.translate.instant('guestSupport.create.attachmentsHint', {
      max: this.maxFiles,
      mb: Math.round(this.maxFileBytes / (1024 * 1024))
    });
  }
}
