import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import {
  DomainCategory,
  DomainItem,
  DomainStatus,
  DomainsService,
  UpsertDomainPayload
} from '../../services/domains.service';

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
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
    <mat-dialog-content>
      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'domains.table.name' | translate }}</mat-label>
          <input matInput formControlName="name" autocomplete="off" [readonly]="readOnly">
          @if (form.controls.name.touched && form.controls.name.hasError('required')) {
            <mat-error>{{ 'domains.form.nameRequired' | translate }}</mat-error>
          }
          @if (form.controls.name.touched && form.controls.name.hasError('pattern')) {
            <mat-error>{{ 'domains.form.nameInvalid' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'domains.table.status' | translate }}</mat-label>
          <mat-select formControlName="status" [disabled]="readOnly">
            @for (status of statuses; track status) {
              <mat-option [value]="status">{{ ('domains.status.' + status.toLowerCase()) | translate }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'domains.form.category' | translate }}</mat-label>
          <mat-select formControlName="categoryId" [disabled]="readOnly">
            @for (cat of categories; track cat.id) {
              <mat-option [value]="cat.id">
                <span [style.paddingInlineStart.px]="(cat.depth || 0) * 14">{{ cat.name }}</span>
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'domains.table.price' | translate }}</mat-label>
          <input matInput type="number" min="0" step="0.01" formControlName="price" [readonly]="readOnly">
          @if (form.controls.price.touched && form.controls.price.invalid) {
            <mat-error>{{ 'domains.form.priceInvalid' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'domains.table.expires' | translate }}</mat-label>
          <input matInput type="date" formControlName="expiresAt" [readonly]="readOnly">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      @if (!readOnly) {
        <button mat-flat-button color="primary" type="button" [disabled]="form.invalid || saving" (click)="submit()">
          {{ (saving ? 'domains.form.saving' : 'common.save') | translate }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: min(100%, 360px);
      padding-top: 8px;
    }
  `]
})
export class DomainDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly domainsService = inject(DomainsService);
  private readonly dialogRef = inject(MatDialogRef<DomainDialogComponent, UpsertDomainPayload | null>);
  readonly data = inject<DomainDialogData>(MAT_DIALOG_DATA);

  readonly statuses: DomainStatus[] = ['ACTIVE', 'PENDING', 'SOLD', 'EXPIRED'];
  categories: DomainCategory[] = [];
  saving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/^(?=.{1,253}$)(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i)]],
    status: this.fb.nonNullable.control<DomainStatus>('ACTIVE', Validators.required),
    categoryId: this.fb.control<number | null>(null, Validators.required),
    price: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    expiresAt: this.fb.control<string | null>(null)
  });

  get readOnly(): boolean {
    return this.data.mode === 'view';
  }

  ngOnInit(): void {
    this.domainsService.listActiveCategoriesFlat().subscribe({
      next: (cats) => {
        this.categories = cats ?? [];
        const domain = this.data.domain;
        if (domain) {
          this.form.patchValue({
            name: domain.name,
            status: domain.status,
            categoryId: domain.categoryId ?? null,
            price: Number(domain.price ?? 0),
            expiresAt: domain.expiresAt ? String(domain.expiresAt).slice(0, 10) : null
          });
        } else if (this.categories.length && this.form.controls.categoryId.value == null) {
          this.form.controls.categoryId.setValue(this.categories[0].id);
        }
        if (this.readOnly) {
          this.form.disable({ emitEvent: false });
        }
      },
      error: () => {
        this.categories = [];
      }
    });
  }

  submit(): void {
    if (this.readOnly) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.categoryId == null) {
      return;
    }
    this.dialogRef.close({
      name: raw.name.trim().toLowerCase(),
      status: raw.status,
      categoryId: raw.categoryId,
      price: Number(raw.price),
      expiresAt: raw.expiresAt || null
    });
  }
}
