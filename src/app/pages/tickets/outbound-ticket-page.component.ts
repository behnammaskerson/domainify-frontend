import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Subject,
  Subscription,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap
} from 'rxjs';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { MarkdownEditorComponent } from '../../components/markdown-editor/markdown-editor.component';
import { ApiErrorService } from '../../services/api-error.service';
import {
  TicketAssigneeOption,
  TicketAttachmentPolicy,
  TicketCategory,
  TicketPriority,
  TicketQueue,
  TicketService
} from '../../services/ticket.service';
import { ManagedUser, UsersService } from '../../services/users.service';

@Component({
  selector: 'app-outbound-ticket-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent,
    MarkdownEditorComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.outbound.eyebrow' | translate"
        [title]="'tickets.outbound.title' | translate"
        [subtitle]="'tickets.outbound.intro' | translate">
        <div heroActions>
          <a mat-stroked-button routerLink="/admin/tickets/inbox">
            <mat-icon>arrow_back</mat-icon>
            {{ 'tickets.outbound.backInbox' | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body">
        @if (metaLoading) {
          <p class="muted">{{ 'tickets.outbound.loading' | translate }}</p>
        } @else if (!categories.length) {
          <div class="notice-card panel-surface">
            <mat-icon>info</mat-icon>
            <div>
              <h2>{{ 'tickets.create.noCategoriesTitle' | translate }}</h2>
              <p>{{ 'tickets.create.noCategoriesMessage' | translate }}</p>
            </div>
          </div>
        } @else {
          <form class="layout" [formGroup]="form" (ngSubmit)="submit()">
            <section class="panel-surface block">
              <header class="block-header">
                <h2>{{ 'tickets.outbound.customerSection' | translate }}</h2>
                <p>{{ 'tickets.outbound.customerHint' | translate }}</p>
              </header>

              @if (selectedCustomer) {
                <div class="selected-customer">
                  <div class="selected-copy">
                    <strong>{{ displayName(selectedCustomer) }}</strong>
                    <span dir="ltr">{{ selectedCustomer.email }}</span>
                  </div>
                  <button mat-stroked-button type="button" (click)="clearCustomer()">
                    {{ 'tickets.outbound.changeCustomer' | translate }}
                  </button>
                </div>
              } @else {
                <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.outbound.searchCustomer' | translate }}</mat-label>
                  <input matInput
                         [value]="customerQuery"
                         (input)="onCustomerQuery($event)"
                         [placeholder]="'tickets.outbound.searchPlaceholder' | translate"
                         autocomplete="off">
                  <mat-icon matPrefix>search</mat-icon>
                </mat-form-field>

                <div class="results" role="listbox">
                  @if (searchingCustomers) {
                    <div class="state"><mat-spinner diameter="28"></mat-spinner></div>
                  } @else if (customerQuery.trim().length < 2) {
                    <p class="state muted">{{ 'tickets.outbound.searchHint' | translate }}</p>
                  } @else if (!customerResults.length) {
                    <p class="state muted">{{ 'tickets.outbound.searchEmpty' | translate }}</p>
                  } @else {
                    <ul class="result-list">
                      @for (user of customerResults; track user.id) {
                        <li>
                          <button type="button" class="result-btn" (click)="selectCustomer(user)">
                            <strong>{{ displayName(user) }}</strong>
                            <span class="muted" dir="ltr">{{ user.email }}</span>
                          </button>
                        </li>
                      }
                    </ul>
                  }
                </div>
              }

              @if (form.controls.requesterUserId.touched && form.controls.requesterUserId.invalid) {
                <p class="field-error">{{ 'tickets.outbound.customerRequired' | translate }}</p>
              }
            </section>

            <section class="panel-surface block">
              <header class="block-header">
                <h2>{{ 'tickets.outbound.ticketSection' | translate }}</h2>
                <p>{{ 'tickets.outbound.ticketHint' | translate }}</p>
              </header>

              <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
                <mat-label>{{ 'tickets.outbound.subject' | translate }}</mat-label>
                <input matInput formControlName="subject" maxlength="200" autocomplete="off">
              </mat-form-field>

              <div class="row">
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.outbound.category' | translate }}</mat-label>
                  <mat-select formControlName="categoryId">
                    @for (cat of categories; track cat.id) {
                      <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.outbound.priority' | translate }}</mat-label>
                  <mat-select formControlName="priority">
                    @for (p of priorities; track p) {
                      <mat-option [value]="p">{{ ('tickets.priorities.' + p) | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="row">
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.outbound.queue' | translate }}</mat-label>
                  <mat-select formControlName="queueId">
                    <mat-option [value]="null">{{ 'tickets.outbound.queueDefault' | translate }}</mat-option>
                    @for (queue of queues; track queue.id) {
                      <mat-option [value]="queue.id">{{ queue.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.outbound.assignee' | translate }}</mat-label>
                  <mat-select formControlName="assigneeId">
                    <mat-option [value]="null">{{ 'tickets.outbound.assigneeAuto' | translate }}</mat-option>
                    @for (agent of assignees; track agent.id) {
                      <mat-option [value]="agent.id">{{ agent.name || agent.email }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <label class="field-label">{{ 'tickets.outbound.message' | translate }}</label>
              <app-markdown-editor
                formControlName="description"
                [rows]="8"
                [maxLength]="10000"
                labelKey="tickets.outbound.message"
                placeholderKey="tickets.outbound.messagePlaceholder"
                [invalid]="form.controls.description.touched && form.controls.description.invalid">
              </app-markdown-editor>
              @if (form.controls.description.touched && form.controls.description.invalid) {
                <p class="field-error">{{ 'tickets.outbound.messageRequired' | translate }}</p>
              }

              <div class="attachments">
                <div class="attachments-header">
                  <div>
                    <h3>{{ 'tickets.outbound.attachments' | translate }}</h3>
                    <p>{{ attachmentsHint }}</p>
                  </div>
                  <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="submitting || files.length >= maxFiles">
                    <mat-icon>attach_file</mat-icon>
                    {{ 'tickets.create.addFiles' | translate }}
                  </button>
                  <input #fileInput type="file" hidden multiple [attr.accept]="acceptAttr" (change)="onFilesSelected($event)">
                </div>
                @if (files.length) {
                  <ul class="file-list">
                    @for (file of files; track file.name + file.size) {
                      <li>
                        <mat-icon>description</mat-icon>
                        <span class="file-name">{{ file.name }}</span>
                        <button mat-icon-button type="button" (click)="removeFile(file)" [attr.aria-label]="'common.close' | translate">
                          <mat-icon>close</mat-icon>
                        </button>
                      </li>
                    }
                  </ul>
                }
              </div>

              <div class="notify-group">
                <mat-checkbox formControlName="notifyCustomer" color="primary" class="notify">
                  {{ 'tickets.outbound.notifyCustomer' | translate }}
                </mat-checkbox>
                <mat-checkbox formControlName="notifySms" color="primary" class="notify">
                  {{ 'tickets.outbound.notifySms' | translate }}
                </mat-checkbox>
              </div>
            </section>

            @if (errorMessage) {
              <p class="field-error page-error" role="alert">{{ errorMessage }}</p>
            }

            <div class="actions">
              <a mat-button type="button" routerLink="/admin/tickets/inbox">{{ 'common.cancel' | translate }}</a>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || submitting">
                @if (submitting) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  {{ 'tickets.outbound.submit' | translate }}
                }
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    .page {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .page-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .layout {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .block {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 24px;
    }

    .block-header h2 {
      margin: 0 0 6px;
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .block-header p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .full,
    .row > mat-form-field {
      width: 100%;
    }

    .row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .field-label {
      display: block;
      margin: 4px 0 0;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .field-error {
      margin: 0;
      font-size: 0.78rem;
      color: var(--mat-form-field-error-text-color, #f44336);
    }

    .page-error {
      margin: 0 4px;
    }

    .muted {
      color: var(--text-muted);
    }

    .notice-card {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      padding: 20px;
    }

    .notice-card h2 {
      margin: 0 0 6px;
      font-size: 1.05rem;
    }

    .notice-card p {
      margin: 0;
      color: var(--text-muted);
    }

    .selected-customer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-secondary);
    }

    .selected-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .selected-copy strong {
      color: var(--text-primary);
    }

    .selected-copy span {
      color: var(--text-muted);
      font-size: 0.88rem;
    }

    .results {
      border: 1px solid var(--border-color);
      border-radius: 10px;
      min-height: 140px;
      max-height: 260px;
      overflow: auto;
      background: var(--bg-secondary);
    }

    .state {
      margin: 0;
      padding: 28px 16px;
      text-align: center;
      color: var(--text-muted);
    }

    .result-list {
      list-style: none;
      margin: 0;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .result-btn {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 12px 14px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }

    .result-btn:hover {
      background: var(--bg-primary, #fff);
    }

    .attachments {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border: 1px dashed var(--border-color);
      border-radius: 10px;
      margin-top: 4px;
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
      border-radius: 8px;
      background: var(--bg-secondary);
    }

    .file-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notify-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }

    .notify {
      margin-top: 0;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      padding-bottom: 24px;
    }

    @media (max-width: 720px) {
      .row,
      .attachments-header,
      .selected-customer,
      .actions {
        grid-template-columns: 1fr;
        flex-direction: column;
        align-items: stretch;
      }

      .actions {
        justify-content: stretch;
      }

      .actions a,
      .actions button {
        width: 100%;
      }
    }
  `]
})
export class OutboundTicketPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly ticketService = inject(TicketService);
  private readonly usersService = inject(UsersService);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  readonly form = this.fb.nonNullable.group({
    requesterUserId: this.fb.control<number | null>(null, Validators.required),
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(10000)]],
    categoryId: this.fb.control<number | null>(null, Validators.required),
    priority: this.fb.nonNullable.control<TicketPriority>('MEDIUM', Validators.required),
    queueId: this.fb.control<number | null>(null),
    assigneeId: this.fb.control<number | null>(null),
    notifyCustomer: this.fb.nonNullable.control(true),
    notifySms: this.fb.nonNullable.control(true)
  });

  categories: TicketCategory[] = [];
  queues: TicketQueue[] = [];
  assignees: TicketAssigneeOption[] = [];
  customerResults: ManagedUser[] = [];
  selectedCustomer: ManagedUser | null = null;
  customerQuery = '';
  searchingCustomers = false;
  metaLoading = true;
  submitting = false;
  errorMessage = '';
  files: File[] = [];
  acceptAttr = '.jpg,.jpeg,.png,.webp,.pdf,.txt,.log,.doc,.docx';
  attachmentsHint = '';
  maxFiles = 5;
  private maxFileBytes = 5 * 1024 * 1024;
  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit(): void {
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        const query = q.trim();
        if (query.length < 2) {
          this.searchingCustomers = false;
          return of([] as ManagedUser[]);
        }
        this.searchingCustomers = true;
        return forkJoin({
          byEmail: this.usersService.list({ email: query, enabled: true, size: 12 }).pipe(
            catchError(() => of({ content: [] as ManagedUser[] }))
          ),
          byName: this.usersService.list({ firstName: query, enabled: true, size: 12 }).pipe(
            catchError(() => of({ content: [] as ManagedUser[] }))
          )
        }).pipe(
          map(({ byEmail, byName }) => {
            const merged = new Map<number, ManagedUser>();
            for (const user of [...(byEmail.content ?? []), ...(byName.content ?? [])]) {
              if (user?.id != null && user.role !== 'ADMIN') {
                merged.set(user.id, user);
              }
            }
            return [...merged.values()].slice(0, 12);
          })
        );
      })
    ).subscribe({
      next: (users) => {
        this.customerResults = users;
        this.searchingCustomers = false;
      },
      error: () => {
        this.customerResults = [];
        this.searchingCustomers = false;
      }
    });

    forkJoin({
      categories: this.ticketService.listActiveCategories(),
      queues: this.ticketService.listAllQueues(),
      assignees: this.ticketService.listAdminAssignees(),
      policy: this.ticketService.getAttachmentPolicy().pipe(
        catchError(() => of(null as TicketAttachmentPolicy | null))
      )
    }).subscribe({
      next: ({ categories, queues, assignees, policy }) => {
        this.categories = (categories ?? []).filter((c) => c.active !== false);
        this.queues = (queues ?? []).filter((q) => q.active !== false);
        this.assignees = assignees ?? [];
        this.applyPolicy(policy);
        this.metaLoading = false;
      },
      error: (error) => {
        this.metaLoading = false;
        this.errorMessage = this.apiError.resolve(error);
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onCustomerQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.customerQuery = value;
    this.search$.next(value);
  }

  selectCustomer(user: ManagedUser): void {
    this.selectedCustomer = user;
    this.form.controls.requesterUserId.setValue(user.id);
    this.form.controls.requesterUserId.markAsTouched();
    this.customerQuery = '';
    this.customerResults = [];
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
    this.form.controls.requesterUserId.setValue(null);
  }

  displayName(user: ManagedUser): string {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.email || String(user.id);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    for (const file of selected) {
      if (this.files.length >= this.maxFiles) {
        break;
      }
      if (file.size > this.maxFileBytes) {
        continue;
      }
      if (!this.files.some((f) => f.name === file.name && f.size === file.size)) {
        this.files.push(file);
      }
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
    if (value.requesterUserId == null || value.categoryId == null) {
      return;
    }
    this.submitting = true;
    this.errorMessage = '';
    this.ticketService.createAdminOutboundTicket({
      requesterUserId: value.requesterUserId,
      subject: value.subject.trim(),
      description: value.description.trim(),
      categoryId: value.categoryId,
      priority: value.priority,
      queueId: value.queueId,
      assigneeId: value.assigneeId,
      notifyCustomer: value.notifyCustomer,
      notifySms: value.notifySms,
      attachments: this.files
    }).subscribe({
      next: (ticket) => {
        this.submitting = false;
        this.snackBar.open(
          this.translate.instant('tickets.outbound.success', {
            number: ticket.publicNumber || ticket.id
          }),
          undefined,
          { duration: 4000 }
        );
        void this.router.navigate(['/admin/tickets', ticket.id]);
      },
      error: (error) => {
        this.submitting = false;
        this.errorMessage = this.apiError.resolve(error);
      }
    });
  }

  private applyPolicy(policy: TicketAttachmentPolicy | null): void {
    if (!policy) {
      this.attachmentsHint = this.translate.instant('tickets.outbound.attachmentsHintFallback');
      return;
    }
    this.maxFiles = policy.maxAttachments || this.maxFiles;
    this.maxFileBytes = policy.maxAttachmentBytes || this.maxFileBytes;
    const extensions = policy.allowedExtensions?.length
      ? policy.allowedExtensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
      : ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.log', '.doc', '.docx'];
    this.acceptAttr = [
      ...extensions,
      ...(policy.allowedContentTypes ?? [])
    ].join(',');
    this.attachmentsHint = this.translate.instant('tickets.outbound.attachmentsHint', {
      max: this.maxFiles,
      mb: policy.maxAttachmentSizeMb ?? Math.round(this.maxFileBytes / (1024 * 1024))
    });
  }
}
