import { Component, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '../../services/api-error.service';
import { CalendarLocaleService } from '../../services/calendar-locale.service';
import {
  DomainCategory,
  DomainExpirySource,
  DomainItem,
  DomainStatus,
  DomainsService,
  UpsertDomainPayload
} from '../../services/domains.service';
import { toLatinDigits } from '../../utils/locale-digits';

export interface DomainDialogData {
  mode: 'create' | 'edit' | 'view';
  domain?: DomainItem | null;
}

@Component({
  selector: 'app-domain-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.mode === 'create'
          ? 'domains.form.createTitle'
          : data.mode === 'view'
            ? 'domains.form.viewTitle'
            : 'domains.form.editTitle') | translate }}
    </h2>
    <mat-dialog-content class="dialog-body">
      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
          <mat-label>{{ 'domains.table.name' | translate }}</mat-label>
          <input matInput formControlName="name" autocomplete="off" [readonly]="readOnly">
          @if (form.controls.name.touched && form.controls.name.hasError('required')) {
            <mat-error>{{ 'domains.form.nameRequired' | translate }}</mat-error>
          }
          @if (form.controls.name.touched && form.controls.name.hasError('pattern')) {
            <mat-error>{{ 'domains.form.nameInvalid' | translate }}</mat-error>
          }
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="half" subscriptSizing="dynamic">
            <mat-label>{{ 'domains.table.status' | translate }}</mat-label>
            <mat-select formControlName="status" [disabled]="readOnly">
              @for (status of statuses; track status) {
                <mat-option [value]="status">{{ ('domains.status.' + status.toLowerCase()) | translate }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half" subscriptSizing="dynamic">
            <mat-label>{{ 'domains.form.category' | translate }}</mat-label>
            <mat-select formControlName="categoryId" [disabled]="readOnly">
              @for (cat of categories; track cat.id) {
                <mat-option [value]="cat.id">
                  <span [style.paddingInlineStart.px]="(cat.depth || 0) * 14">{{ cat.name }}</span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="price-block">
          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>{{ 'domains.table.price' | translate }} (IRT)</mat-label>
            <input
              matInput
              type="text"
              inputmode="numeric"
              autocomplete="off"
              dir="ltr"
              [value]="priceDisplay"
              [readonly]="readOnly"
              (input)="onPriceInput($event)"
              (blur)="form.controls.price.markAsTouched()">
            @if (form.controls.price.touched && form.controls.price.invalid) {
              <mat-error>{{ 'domains.form.priceInvalid' | translate }}</mat-error>
            }
          </mat-form-field>
          <p class="field-hint">{{ 'domains.form.priceHint' | translate }}</p>
        </div>

        <div class="expiry-block">
          <div class="expiry-row">
            <mat-form-field appearance="outline" class="expiry-field" subscriptSizing="dynamic">
              <mat-label>{{ 'domains.table.expires' | translate }}</mat-label>
              <input
                matInput
                [matDatepicker]="expiryPicker"
                formControlName="expiresAt"
                [readonly]="readOnly"
                [placeholder]="calendar.isJalali() ? 'YYYY/MM/DD' : 'YYYY-MM-DD'"
                (dateChange)="onExpiresManualEdit()">
              @if (!readOnly) {
                <mat-datepicker-toggle matIconSuffix [for]="expiryPicker"></mat-datepicker-toggle>
              }
              <mat-datepicker #expiryPicker [disabled]="readOnly"></mat-datepicker>
            </mat-form-field>
            @if (!readOnly) {
              <button
                mat-stroked-button
                type="button"
                class="fetch-btn"
                [disabled]="fetchingExpiry || form.controls.name.invalid"
                [matTooltip]="'domains.form.fetchExpiryHint' | translate"
                (click)="fetchRegistrarExpiry()">
                @if (fetchingExpiry) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <mat-icon>sync</mat-icon>
                }
                {{ 'domains.form.fetchExpiry' | translate }}
              </button>
            }
          </div>
          <p class="field-hint">
            {{ 'domains.form.expiresHint' | translate }}
            @if (expiresSource === 'REGISTRAR') {
              <span class="source-tag"> · {{ 'domains.form.expiresFromRegistrar' | translate }}</span>
              @if (expiresRegistrar) {
                <span class="source-tag"> ({{ expiresRegistrar }})</span>
              }
            } @else if (form.controls.expiresAt.value) {
              <span class="source-tag"> · {{ 'domains.form.expiresManual' | translate }}</span>
            }
          </p>
        </div>

        <div class="renewal-block">
          <mat-slide-toggle
            color="primary"
            [checked]="customRenewalEnabled"
            [disabled]="readOnly"
            (change)="onCustomRenewalToggle($event.checked)">
            {{ 'domains.form.customRenewal' | translate }}
          </mat-slide-toggle>
          <p class="field-hint">{{ 'domains.form.customRenewalHint' | translate }}</p>

          @if (customRenewalEnabled) {
            <div class="window-presets" role="group">
              @for (days of renewalWindowPresets; track days) {
                <button type="button"
                        class="window-preset"
                        [class.selected]="isRenewalWindowSelected(days)"
                        [disabled]="readOnly"
                        (click)="toggleRenewalWindow(days)">
                  {{ 'domains.form.daysShort' | translate:{ days: days } }}
                </button>
              }
            </div>

            @if (renewalWindowsSelected.length) {
              <mat-chip-set class="window-chip-set">
                @for (days of renewalWindowsSelected; track days) {
                  <mat-chip [removable]="!readOnly" (removed)="removeRenewalWindow(days)">
                    {{ 'domains.form.daysChip' | translate:{ days: days } }}
                    @if (!readOnly) {
                      <button matChipRemove type="button">
                        <mat-icon>cancel</mat-icon>
                      </button>
                    }
                  </mat-chip>
                }
              </mat-chip-set>
            } @else {
              <p class="field-error">{{ 'domains.form.windowsRequired' | translate }}</p>
            }

            @if (!readOnly) {
              <div class="window-custom-row">
                <mat-form-field appearance="outline" class="window-custom-field" subscriptSizing="dynamic">
                  <mat-label>{{ 'domains.form.customDays' | translate }}</mat-label>
                  <input matInput type="number" min="1" max="3650" dir="ltr"
                         [(ngModel)]="renewalCustomDays"
                         [ngModelOptions]="{standalone: true}"
                         (keydown.enter)="$event.preventDefault(); addCustomRenewalWindow()">
                </mat-form-field>
                <button mat-stroked-button type="button" color="primary"
                        (click)="addCustomRenewalWindow()"
                        [disabled]="!canAddCustomRenewalWindow()">
                  {{ 'domains.form.addWindow' | translate }}
                </button>
              </div>
            }
          }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      @if (!readOnly) {
        <button mat-flat-button color="primary" type="button"
                [disabled]="form.invalid || saving || (customRenewalEnabled && !renewalWindowsSelected.length)"
                (click)="submit()">
          {{ (saving ? 'domains.form.saving' : 'common.save') | translate }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body {
      display: block;
      min-width: min(100%, 480px);
      max-height: min(72vh, 720px);
      overflow-x: hidden;
      overflow-y: auto;
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
      padding-inline: 2px;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .full,
    .half {
      width: 100%;
    }

    .price-block,
    .expiry-block,
    .renewal-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .window-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .window-preset {
      min-height: 34px;
      padding: 6px 12px;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: var(--bg-primary);
      color: var(--text-secondary);
      font-family: var(--font-ui);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .window-preset:disabled {
      opacity: 0.65;
      cursor: default;
    }

    .window-preset.selected {
      border-color: var(--accent);
      background: var(--accent-light);
      color: var(--accent-dark);
    }

    .window-chip-set {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .window-custom-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 10px;
    }

    .window-custom-field {
      flex: 1 1 160px;
      min-width: 140px;
    }

    .field-error {
      margin: 0;
      font-size: 0.8rem;
      color: var(--danger);
    }

    .expiry-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 10px;
    }

    .expiry-field {
      flex: 1 1 220px;
      min-width: 0;
    }

    .fetch-btn {
      height: 56px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .field-hint {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.45;
      color: var(--text-muted);
    }

    .source-tag {
      color: var(--text-secondary);
    }

    .price-block input {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.01em;
    }

    @media (max-width: 560px) {
      .row {
        grid-template-columns: 1fr;
      }

      .dialog-body {
        min-width: 0;
      }

      .fetch-btn {
        width: 100%;
      }
    }
  `]
})
export class DomainDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly domainsService = inject(DomainsService);
  private readonly dialogRef = inject(MatDialogRef<DomainDialogComponent, UpsertDomainPayload | null>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  readonly calendar = inject(CalendarLocaleService);
  readonly data = inject<DomainDialogData>(MAT_DIALOG_DATA);

  readonly statuses: DomainStatus[] = ['ACTIVE', 'PENDING', 'SOLD', 'EXPIRED'];
  categories: DomainCategory[] = [];
  saving = false;
  fetchingExpiry = false;
  priceDisplay = '0';
  expiresSource: DomainExpirySource = 'MANUAL';
  expiresRegistrar: string | null = null;
  customRenewalEnabled = false;
  renewalWindowsSelected: number[] = [];
  renewalWindowPresets = [90, 60, 30, 14, 7];
  renewalCustomDays: number | null = null;
  private suppressNameExpiryClear = true;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/^(?=.{1,253}$)(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i)]],
    status: this.fb.nonNullable.control<DomainStatus>('ACTIVE', Validators.required),
    categoryId: this.fb.control<number | null>(null, Validators.required),
    price: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    expiresAt: this.fb.control<Date | null>(null)
  });

  get readOnly(): boolean {
    return this.data.mode === 'view';
  }

  constructor() {
    this.form.controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.suppressNameExpiryClear || this.readOnly) {
        return;
      }
      this.clearExpiry();
    });
  }

  ngOnInit(): void {
    this.domainsService.listActiveCategoriesFlat().subscribe({
      next: (cats) => {
        this.categories = cats ?? [];
        const domain = this.data.domain;
        this.suppressNameExpiryClear = true;
        if (domain) {
          const price = Math.max(0, Math.floor(Number(domain.price ?? 0)));
          this.form.patchValue({
            name: domain.name,
            status: domain.status,
            categoryId: domain.categoryId ?? null,
            price,
            expiresAt: this.parseDateOnly(domain.expiresAt)
          });
          this.priceDisplay = this.formatGrouped(price);
          this.expiresSource = domain.expiresSource === 'REGISTRAR' ? 'REGISTRAR' : 'MANUAL';
          this.expiresRegistrar = domain.expiresRegistrar ?? null;
          this.customRenewalEnabled = !!domain.customRenewalWindows;
          this.renewalWindowsSelected = (domain.renewalWindowsParsed ?? [])
            .slice()
            .sort((a, b) => b - a);
          if (this.customRenewalEnabled && !this.renewalWindowsSelected.length) {
            this.renewalWindowsSelected = [90, 60, 30];
          }
        } else if (this.categories.length && this.form.controls.categoryId.value == null) {
          this.form.controls.categoryId.setValue(this.categories[0].id);
        }
        if (this.readOnly) {
          this.form.disable({ emitEvent: false });
        }
        queueMicrotask(() => {
          this.suppressNameExpiryClear = false;
        });
      },
      error: () => {
        this.categories = [];
        this.suppressNameExpiryClear = false;
      }
    });
  }

  onPriceInput(event: Event): void {
    if (this.readOnly) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const digits = toLatinDigits(input.value).replace(/\D/g, '');
    const price = digits === '' ? 0 : Number(digits);
    if (!Number.isFinite(price) || price < 0) {
      this.form.controls.price.setValue(0);
      this.priceDisplay = '0';
      input.value = this.priceDisplay;
      return;
    }
    this.form.controls.price.setValue(price);
    this.form.controls.price.markAsDirty();
    this.priceDisplay = this.formatGrouped(price);
    input.value = this.priceDisplay;
  }

  onExpiresManualEdit(): void {
    if (this.readOnly) {
      return;
    }
    this.expiresSource = 'MANUAL';
    this.expiresRegistrar = null;
  }

  private clearExpiry(): void {
    if (this.form.controls.expiresAt.value != null
        || this.expiresSource !== 'MANUAL'
        || this.expiresRegistrar) {
      this.form.controls.expiresAt.setValue(null, { emitEvent: false });
      this.form.controls.expiresAt.markAsDirty();
    }
    this.expiresSource = 'MANUAL';
    this.expiresRegistrar = null;
  }

  fetchRegistrarExpiry(): void {
    if (this.readOnly || this.fetchingExpiry) {
      return;
    }
    this.form.controls.name.markAsTouched();
    if (this.form.controls.name.invalid) {
      return;
    }
    const name = this.form.controls.name.value.trim().toLowerCase();
    this.fetchingExpiry = true;
    this.domainsService.lookupRegistrarExpiry(name).subscribe({
      next: (result) => {
        this.fetchingExpiry = false;
        const date = this.parseDateOnly(result.expiresAt);
        if (!date) {
          this.snackBar.open(this.translate.instant('errors.DOMAIN_EXPIRY_NOT_FOUND'), undefined, {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          return;
        }
        this.form.controls.expiresAt.setValue(date);
        this.form.controls.expiresAt.markAsDirty();
        this.expiresSource = 'REGISTRAR';
        this.expiresRegistrar = result.registrar ?? null;
        this.snackBar.open(this.translate.instant('domains.form.expiryFetched'), undefined, { duration: 3000 });
      },
      error: (error) => {
        this.fetchingExpiry = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onCustomRenewalToggle(enabled: boolean): void {
    if (this.readOnly) {
      return;
    }
    this.customRenewalEnabled = enabled;
    if (enabled && !this.renewalWindowsSelected.length) {
      this.renewalWindowsSelected = [90, 60, 30];
    }
  }

  isRenewalWindowSelected(days: number): boolean {
    return this.renewalWindowsSelected.includes(days);
  }

  toggleRenewalWindow(days: number): void {
    if (this.readOnly) {
      return;
    }
    if (this.isRenewalWindowSelected(days)) {
      this.removeRenewalWindow(days);
      return;
    }
    this.renewalWindowsSelected = [...this.renewalWindowsSelected, days].sort((a, b) => b - a);
  }

  removeRenewalWindow(days: number): void {
    if (this.readOnly) {
      return;
    }
    this.renewalWindowsSelected = this.renewalWindowsSelected.filter((d) => d !== days);
  }

  canAddCustomRenewalWindow(): boolean {
    const days = Number(this.renewalCustomDays);
    return Number.isFinite(days) && days >= 1 && days <= 3650 && !this.isRenewalWindowSelected(days);
  }

  addCustomRenewalWindow(): void {
    if (this.readOnly || !this.canAddCustomRenewalWindow()) {
      return;
    }
    const days = Math.floor(Number(this.renewalCustomDays));
    this.renewalWindowsSelected = [...this.renewalWindowsSelected, days].sort((a, b) => b - a);
    this.renewalCustomDays = null;
  }

  submit(): void {
    if (this.readOnly) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    if (this.customRenewalEnabled && !this.renewalWindowsSelected.length) {
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.categoryId == null) {
      return;
    }
    const expiresAt = this.formatDateOnly(raw.expiresAt);
    this.dialogRef.close({
      name: raw.name.trim().toLowerCase(),
      status: raw.status,
      categoryId: raw.categoryId,
      price: Number(raw.price),
      expiresAt,
      expiresSource: expiresAt ? this.expiresSource : 'MANUAL',
      expiresRegistrar: expiresAt && this.expiresSource === 'REGISTRAR' ? this.expiresRegistrar : null,
      renewalWindows: this.customRenewalEnabled
        ? this.renewalWindowsSelected.slice().sort((a, b) => b - a)
        : null
    });
  }

  private parseDateOnly(value: string | Date | null | undefined): Date | null {
    if (value == null || value === '') {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const raw = String(value).slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatDateOnly(value: Date | null | undefined): string | null {
    if (!value || Number.isNaN(value.getTime())) {
      return null;
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatGrouped(value: number): string {
    return Math.floor(Math.max(0, value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
