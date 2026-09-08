import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, catchError, forkJoin, map } from 'rxjs';
import { ManagedUser, UsersService } from '../../services/users.service';

export interface TicketLinkRequesterDialogData {
  publicNumber?: string;
  currentRequesterId?: number | null;
  currentRequesterName?: string | null;
  currentRequesterEmail?: string | null;
}

export interface TicketLinkRequesterDialogResult {
  requesterId: number;
  note: string;
}

@Component({
  selector: 'app-ticket-link-requester-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.detail.linkRequesterTitle' | translate }}</h2>
    <mat-dialog-content class="link-content">
      <p class="intro">
        {{ 'tickets.detail.linkRequesterIntro' | translate: { number: data.publicNumber || '—' } }}
      </p>
      @if (data.currentRequesterEmail || data.currentRequesterName) {
        <p class="current">
          {{ 'tickets.detail.linkRequesterCurrent' | translate }}:
          <strong>{{ data.currentRequesterName || data.currentRequesterEmail }}</strong>
          @if (data.currentRequesterEmail && data.currentRequesterName) {
            <span class="muted" dir="ltr">({{ data.currentRequesterEmail }})</span>
          }
        </p>
      }

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.linkRequesterSearch' | translate }}</mat-label>
        <input matInput
               [(ngModel)]="query"
               (ngModelChange)="onQuery($event)"
               [placeholder]="'tickets.detail.linkRequesterSearchPlaceholder' | translate"
               autocomplete="off">
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>

      <div class="results" role="listbox" [attr.aria-label]="'tickets.detail.linkRequesterSearch' | translate">
        @if (searching) {
          <div class="state"><mat-spinner diameter="28"></mat-spinner></div>
        } @else if (query.trim().length < 2) {
          <p class="state muted">{{ 'tickets.detail.linkRequesterSearchHint' | translate }}</p>
        } @else if (!results.length) {
          <p class="state muted">{{ 'tickets.detail.linkRequesterEmpty' | translate }}</p>
        } @else {
          <mat-radio-group [(ngModel)]="selectedId" class="result-list">
            @for (user of results; track user.id) {
              <label class="result-row" [class.selected]="selectedId === user.id">
                <mat-radio-button [value]="user.id"></mat-radio-button>
                <span class="result-text">
                  <strong>{{ displayName(user) }}</strong>
                  <span class="muted" dir="ltr">{{ user.email }}</span>
                </span>
              </label>
            }
          </mat-radio-group>
        }
      </div>

      <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
        <mat-label>{{ 'tickets.detail.linkRequesterNote' | translate }}</mat-label>
        <textarea matInput
                  rows="3"
                  maxlength="2000"
                  [(ngModel)]="note"
                  [placeholder]="'tickets.detail.linkRequesterNotePlaceholder' | translate"></textarea>
      </mat-form-field>
      <p class="hint">{{ 'tickets.detail.linkRequesterNoteHint' | translate }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!canSubmit" (click)="confirm()">
        <mat-icon>link</mat-icon>
        {{ 'tickets.detail.linkRequesterConfirm' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .link-content {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      min-width: min(100%, 440px);
      max-height: none !important;
      overflow: visible !important;
    }
    .intro, .current, .hint, .state { margin: 0; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.45; }
    .current strong { color: var(--text-primary); }
    .muted { color: var(--text-muted); }
    .full { width: 100%; }
    .results {
      min-height: 120px;
      max-height: 220px;
      overflow-y: auto;
      overflow-x: hidden;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-secondary);
      padding: 0.4rem;
    }
    .state { display: flex; justify-content: center; padding: 1.25rem 0.5rem; }
    .result-list { display: flex; flex-direction: column; gap: 0.25rem; width: 100%; }
    .result-row {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 0.45rem 0.5rem;
      border-radius: 8px;
      cursor: pointer;
    }
    .result-row.selected, .result-row:hover {
      background: color-mix(in srgb, var(--accent) 10%, var(--bg-primary));
    }
    .result-text { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .result-text strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hint { font-size: 0.82rem; }
  `
})
export class TicketLinkRequesterDialogComponent implements OnDestroy {
  readonly data = inject<TicketLinkRequesterDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<TicketLinkRequesterDialogComponent, TicketLinkRequesterDialogResult | null>
  );
  private readonly usersService = inject(UsersService);

  query = '';
  note = '';
  selectedId: number | null = null;
  results: ManagedUser[] = [];
  searching = false;

  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;

  constructor() {
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((raw) => {
        const q = raw.trim();
        if (q.length < 2) {
          this.searching = false;
          this.results = [];
          return of([] as ManagedUser[]);
        }
        this.searching = true;
        return forkJoin({
          byEmail: this.usersService.list({ email: q, enabled: true, size: 20, sort: 'email,asc' }),
          byName: this.usersService.list({ firstName: q, enabled: true, size: 20, sort: 'email,asc' })
        }).pipe(
          map(({ byEmail, byName }) => {
            const merged = new Map<number, ManagedUser>();
            for (const user of [...(byEmail.content ?? []), ...(byName.content ?? [])]) {
              if (user.id != null) {
                merged.set(user.id, user);
              }
            }
            return [...merged.values()];
          }),
          catchError(() => of([] as ManagedUser[]))
        );
      })
    ).subscribe((users) => {
      this.searching = false;
      this.results = (users ?? []).filter((u) => u.role !== 'ADMIN');
      if (this.selectedId != null && !this.results.some((u) => u.id === this.selectedId)) {
        this.selectedId = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  get canSubmit(): boolean {
    return this.selectedId != null
      && this.selectedId !== this.data.currentRequesterId;
  }

  onQuery(value: string): void {
    this.search$.next(value ?? '');
  }

  displayName(user: ManagedUser): string {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.email;
  }

  confirm(): void {
    if (!this.canSubmit || this.selectedId == null) return;
    this.dialogRef.close({
      requesterId: this.selectedId,
      note: this.note.trim()
    });
  }
}
