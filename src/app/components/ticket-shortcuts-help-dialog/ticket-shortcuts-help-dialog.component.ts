import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import {
  TicketShortcutHelpGroup,
  TicketShortcutScope,
  ticketShortcutHelpGroups
} from '../../utils/ticket-keyboard.util';

export interface TicketShortcutsHelpDialogData {
  scope: TicketShortcutScope;
}

@Component({
  selector: 'app-ticket-shortcuts-help-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon aria-hidden="true">keyboard</mat-icon>
      {{ 'tickets.shortcuts.helpTitle' | translate }}
    </h2>
    <mat-dialog-content>
      <p class="hint">{{ 'tickets.shortcuts.helpHint' | translate }}</p>
      @for (group of groups; track group.titleKey) {
        <section class="group">
          <h3>{{ group.titleKey | translate }}</h3>
          <ul>
            @for (item of group.items; track item.actionKey) {
              <li>
                <kbd dir="ltr">{{ item.keys }}</kbd>
                <span>{{ item.actionKey | translate }}</span>
              </li>
            }
          </ul>
        </section>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>
        {{ 'common.close' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-family: var(--font-display);
      font-weight: 700;
    }
    .hint {
      margin: 0 0 1rem;
      color: var(--text-muted);
      font-size: 0.88rem;
      line-height: 1.45;
    }
    .group {
      margin: 0 0 1rem;
    }
    .group h3 {
      margin: 0 0 0.55rem;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    li {
      display: grid;
      grid-template-columns: minmax(7.5rem, auto) 1fr;
      gap: 0.75rem;
      align-items: center;
      padding: 0.45rem 0.55rem;
      border-radius: 10px;
      background: var(--bg-secondary);
      font-size: 0.88rem;
    }
    kbd {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-height: 1.6rem;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-primary);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.78rem;
      font-weight: 600;
      white-space: nowrap;
    }
  `
})
export class TicketShortcutsHelpDialogComponent {
  private readonly data = inject<TicketShortcutsHelpDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TicketShortcutsHelpDialogComponent>);

  readonly groups: TicketShortcutHelpGroup[] = ticketShortcutHelpGroups(this.data.scope);

  constructor() {
    // Ensure Escape closes even if parent also listens
    this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        this.dialogRef.close();
      }
    });
  }
}
