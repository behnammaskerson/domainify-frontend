import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

export interface MarkdownLinkDialogData {
  url?: string;
  text?: string;
  /** When true, show a Remove action (editing an existing rich-text link). */
  canRemove?: boolean;
  /** Hide the text field when editing a rich selection that already has text. */
  showText?: boolean;
}

export type MarkdownLinkDialogResult =
  | { action: 'apply'; url: string; text: string }
  | { action: 'remove' };

@Component({
  selector: 'app-markdown-link-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'tickets.markdown.linkDialogTitle' | translate }}</h2>
    <mat-dialog-content class="link-content">
      <p class="link-intro">{{ 'tickets.markdown.linkDialogIntro' | translate }}</p>
      <form [formGroup]="form" (ngSubmit)="confirm()">
        @if (showTextField) {
          <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
            <mat-label>{{ 'tickets.markdown.linkTextLabel' | translate }}</mat-label>
            <input matInput formControlName="text" maxlength="500" autocomplete="off" />
          </mat-form-field>
        }
        <mat-form-field appearance="outline" class="full-width" subscriptSizing="dynamic">
          <mat-label>{{ 'tickets.markdown.linkUrlLabel' | translate }}</mat-label>
          <input matInput formControlName="url" type="url" maxlength="2000" autocomplete="off" dir="ltr" />
          @if (form.controls.url.hasError('required')) {
            <mat-error>{{ 'tickets.markdown.linkUrlRequired' | translate }}</mat-error>
          }
          @if (form.controls.url.hasError('pattern')) {
            <mat-error>{{ 'tickets.markdown.linkUrlInvalid' | translate }}</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.canRemove) {
        <button mat-button type="button" color="warn" class="remove-btn" (click)="remove()">
          {{ 'tickets.markdown.linkRemove' | translate }}
        </button>
      }
      <button mat-button type="button" mat-dialog-close>
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" type="button" [disabled]="!canSubmit" (click)="confirm()">
        {{ 'tickets.markdown.linkApply' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host h2[mat-dialog-title] {
      color: var(--text-primary);
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .link-content {
      min-width: 320px;
      max-width: 440px;
    }

    .link-intro {
      margin: 0 0 12px;
      color: var(--text-secondary);
      line-height: 1.5;
      font-size: 0.92rem;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions .remove-btn {
      margin-inline-end: auto;
    }
  `]
})
export class MarkdownLinkDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<MarkdownLinkDialogComponent, MarkdownLinkDialogResult>);
  readonly data = inject<MarkdownLinkDialogData>(MAT_DIALOG_DATA);

  readonly showTextField = this.data.showText !== false;

  readonly form = this.fb.nonNullable.group({
    text: [this.data.text ?? ''],
    url: [
      this.data.url ?? '',
      [
        Validators.required,
        Validators.pattern(/^(https?:\/\/|mailto:|#).+/i)
      ]
    ]
  });

  get canSubmit(): boolean {
    return this.form.controls.url.valid;
  }

  confirm(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({
      action: 'apply',
      url: this.form.controls.url.value.trim(),
      text: this.form.controls.text.value.trim()
    });
  }

  remove(): void {
    this.dialogRef.close({ action: 'remove' });
  }
}
