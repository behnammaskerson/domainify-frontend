import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

export interface ConfirmDialogData {
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, unknown>;
  hintKey?: string;
  hintParams?: Record<string, unknown>;
  confirmKey?: string;
  cancelKey?: string;
  confirmColor?: 'primary' | 'warn' | 'accent';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
    <mat-dialog-content>
      <p class="confirm-message">{{ data.messageKey | translate: data.messageParams }}</p>
      @if (data.hintKey) {
        <p class="confirm-hint">{{ data.hintKey | translate: data.hintParams }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>
        {{ (data.cancelKey ?? 'common.cancel') | translate }}
      </button>
      <button mat-flat-button
              type="button"
              [color]="data.confirmColor ?? 'primary'"
              (click)="confirm()">
        {{ (data.confirmKey ?? 'common.confirm') | translate }}
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

    .confirm-message {
      margin: 0;
      color: var(--text-secondary);
      line-height: 1.5;
      font-size: 0.92rem;
    }

    .confirm-hint {
      margin: 12px 0 0;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--warning) 10%, var(--bg-secondary));
      border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border-color));
      color: var(--text-secondary);
      font-size: 0.84rem;
      line-height: 1.45;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmDialogData
  ) {}

  confirm(): void {
    this.dialogRef.close(true);
  }
}
