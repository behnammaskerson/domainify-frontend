import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { ApiErrorService } from '../../services/api-error.service';
import {
  TicketImportResult,
  TicketService
} from '../../services/ticket.service';

@Component({
  selector: 'app-ticket-import-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
    PageHeroComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.import.eyebrow' | translate"
        [title]="'tickets.import.title' | translate"
        [subtitle]="'tickets.import.intro' | translate">
        <div heroActions>
          <a mat-stroked-button routerLink="/admin/tickets/inbox">
            <mat-icon>arrow_back</mat-icon>
            {{ 'tickets.import.backInbox' | translate }}
          </a>
        </div>
      </app-page-hero>

      <div class="page-body">
        <section class="panel-surface block">
          <header class="block-header">
            <h2>{{ 'tickets.import.templatesTitle' | translate }}</h2>
            <p>{{ 'tickets.import.templatesHint' | translate }}</p>
          </header>
          <div class="template-actions">
            <button mat-stroked-button type="button" (click)="downloadTicketsTemplate()" [disabled]="busy">
              <mat-icon>download</mat-icon>
              {{ 'tickets.import.downloadTicketsTemplate' | translate }}
            </button>
            <button mat-stroked-button type="button" (click)="downloadMessagesTemplate()" [disabled]="busy">
              <mat-icon>download</mat-icon>
              {{ 'tickets.import.downloadMessagesTemplate' | translate }}
            </button>
          </div>
          <ul class="hints">
            <li>{{ 'tickets.import.hintDescription' | translate }}</li>
            <li>{{ 'tickets.import.hintMessages' | translate }}</li>
            <li>{{ 'tickets.import.hintCategory' | translate }}</li>
            <li>{{ 'tickets.import.hintRequester' | translate }}</li>
          </ul>
        </section>

        <section class="panel-surface block">
          <header class="block-header">
            <h2>{{ 'tickets.import.uploadTitle' | translate }}</h2>
            <p>{{ 'tickets.import.uploadHint' | translate }}</p>
          </header>

          <form class="layout" [formGroup]="form" (ngSubmit)="runImport(false)">
            <div class="file-row">
              <div class="file-picker">
                <span class="field-label">{{ 'tickets.import.ticketsFile' | translate }}</span>
                <input #ticketsInput
                       type="file"
                       accept=".csv,text/csv"
                       hidden
                       (change)="onTicketsFileSelected($event)">
                <button mat-stroked-button type="button" (click)="ticketsInput.click()" [disabled]="busy">
                  <mat-icon>upload_file</mat-icon>
                  {{ ticketsFile ? ticketsFile.name : ('tickets.import.chooseFile' | translate) }}
                </button>
                @if (ticketsFile) {
                  <button mat-icon-button type="button" (click)="clearTicketsFile()" [disabled]="busy"
                          [attr.aria-label]="'common.close' | translate">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>

              <div class="file-picker">
                <span class="field-label">{{ 'tickets.import.messagesFile' | translate }}</span>
                <input #messagesInput
                       type="file"
                       accept=".csv,text/csv"
                       hidden
                       (change)="onMessagesFileSelected($event)">
                <button mat-stroked-button type="button" (click)="messagesInput.click()" [disabled]="busy">
                  <mat-icon>attach_file</mat-icon>
                  {{ messagesFile ? messagesFile.name : ('tickets.import.chooseOptionalFile' | translate) }}
                </button>
                @if (messagesFile) {
                  <button mat-icon-button type="button" (click)="clearMessagesFile()" [disabled]="busy"
                          [attr.aria-label]="'common.close' | translate">
                    <mat-icon>close</mat-icon>
                  </button>
                }
              </div>
            </div>

            <mat-checkbox formControlName="createMissingRequesters" color="primary">
              {{ 'tickets.import.createMissingRequesters' | translate }}
            </mat-checkbox>

            @if (errorMessage) {
              <p class="field-error" role="alert">{{ errorMessage }}</p>
            }

            <div class="actions">
              <button mat-stroked-button type="button" (click)="runImport(true)" [disabled]="!ticketsFile || busy">
                @if (busy && lastDryRun) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  {{ 'tickets.import.validate' | translate }}
                }
              </button>
              <button mat-flat-button color="primary" type="submit" [disabled]="!ticketsFile || busy">
                @if (busy && !lastDryRun) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  {{ 'tickets.import.import' | translate }}
                }
              </button>
            </div>
          </form>
        </section>

        @if (result) {
          <section class="panel-surface block">
            <header class="block-header">
              <h2>{{ 'tickets.import.resultsTitle' | translate }}</h2>
              <p>
                {{ (result.dryRun ? 'tickets.import.resultsDryRun' : 'tickets.import.resultsImported') | translate:{
                  total: result.totalRows,
                  ok: result.validRows,
                  failed: result.failedCount,
                  imported: result.importedCount
                } }}
              </p>
            </header>

            @if (result.failed.length) {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{{ 'tickets.import.colRow' | translate }}</th>
                      <th>{{ 'tickets.import.colExternalId' | translate }}</th>
                      <th>{{ 'tickets.import.colCode' | translate }}</th>
                      <th>{{ 'tickets.import.colMessage' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of result.failed; track row.rowNumber + (row.externalId || '') + row.code) {
                      <tr class="fail">
                        <td>{{ row.rowNumber }}</td>
                        <td>{{ row.externalId || '—' }}</td>
                        <td dir="ltr">{{ row.code }}</td>
                        <td>{{ row.message }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @if (result.succeeded.length) {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{{ 'tickets.import.colRow' | translate }}</th>
                      <th>{{ 'tickets.import.colExternalId' | translate }}</th>
                      <th>{{ 'tickets.import.colTicket' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of result.succeeded; track row.rowNumber + (row.publicNumber || '') + (row.ticketId || '')) {
                      <tr>
                        <td>{{ row.rowNumber }}</td>
                        <td>{{ row.externalId || '—' }}</td>
                        <td>
                          @if (row.ticketId) {
                            <a [routerLink]="['/admin/tickets', row.ticketId]">{{ row.publicNumber || row.ticketId }}</a>
                          } @else {
                            {{ row.publicNumber || ('tickets.import.validRow' | translate) }}
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
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

    .layout {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .template-actions,
    .actions,
    .file-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .actions {
      justify-content: flex-end;
    }

    .file-picker {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      min-width: min(100%, 280px);
      flex: 1;
    }

    .field-label {
      width: 100%;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .hints {
      margin: 0;
      padding-inline-start: 1.2rem;
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .field-error {
      margin: 0;
      color: var(--mat-form-field-error-text-color, #f44336);
      font-size: 0.85rem;
    }

    .table-wrap {
      overflow: auto;
      border: 1px solid color-mix(in srgb, var(--text-muted) 22%, transparent);
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th, td {
      padding: 10px 12px;
      text-align: start;
      border-bottom: 1px solid color-mix(in srgb, var(--text-muted) 18%, transparent);
      vertical-align: top;
    }

    th {
      background: color-mix(in srgb, var(--text-muted) 8%, transparent);
      font-weight: 600;
    }

    tr.fail td {
      color: var(--mat-form-field-error-text-color, #c62828);
    }

    a {
      color: var(--brand, #1565c0);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    @media (max-width: 720px) {
      .block {
        padding: 16px;
      }
    }
  `]
})
export class TicketImportPageComponent {
  private readonly ticketService = inject(TicketService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('ticketsInput') ticketsInput?: ElementRef<HTMLInputElement>;
  @ViewChild('messagesInput') messagesInput?: ElementRef<HTMLInputElement>;

  readonly form = this.fb.nonNullable.group({
    createMissingRequesters: false
  });

  ticketsFile: File | null = null;
  messagesFile: File | null = null;
  busy = false;
  lastDryRun = true;
  errorMessage = '';
  result: TicketImportResult | null = null;

  onTicketsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.ticketsFile = input.files?.[0] ?? null;
    this.errorMessage = '';
  }

  onMessagesFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.messagesFile = input.files?.[0] ?? null;
    this.errorMessage = '';
  }

  clearTicketsFile(): void {
    this.ticketsFile = null;
    if (this.ticketsInput?.nativeElement) {
      this.ticketsInput.nativeElement.value = '';
    }
  }

  clearMessagesFile(): void {
    this.messagesFile = null;
    if (this.messagesInput?.nativeElement) {
      this.messagesInput.nativeElement.value = '';
    }
  }

  downloadTicketsTemplate(): void {
    this.ticketService.downloadTicketImportTemplate().subscribe({
      next: (blob) => this.ticketService.saveBlob(blob, 'ticket-import-template.csv'),
      error: (err) => this.snackBar.open(this.apiError.resolve(err), undefined, { duration: 4000 })
    });
  }

  downloadMessagesTemplate(): void {
    this.ticketService.downloadTicketImportMessagesTemplate().subscribe({
      next: (blob) => this.ticketService.saveBlob(blob, 'ticket-import-messages-template.csv'),
      error: (err) => this.snackBar.open(this.apiError.resolve(err), undefined, { duration: 4000 })
    });
  }

  runImport(dryRun: boolean): void {
    if (!this.ticketsFile || this.busy) {
      return;
    }
    this.busy = true;
    this.lastDryRun = dryRun;
    this.errorMessage = '';
    this.result = null;

    this.ticketService.importTickets({
      file: this.ticketsFile,
      messagesFile: this.messagesFile ?? undefined,
      dryRun,
      createMissingRequesters: this.form.controls.createMissingRequesters.value
    }).subscribe({
      next: (result) => {
        this.busy = false;
        this.result = result;
        const key = dryRun
          ? (result.failedCount ? 'tickets.import.validateDoneWithErrors' : 'tickets.import.validateDone')
          : (result.failedCount ? 'tickets.import.importDoneWithErrors' : 'tickets.import.importDone');
        this.snackBar.open(
          this.translate.instant(key, {
            ok: result.validRows,
            failed: result.failedCount,
            imported: result.importedCount
          }),
          undefined,
          { duration: 4500 }
        );
      },
      error: (err) => {
        this.busy = false;
        this.errorMessage = this.apiError.resolve(err);
      }
    });
  }
}
