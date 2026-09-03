import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  forwardRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

type EditorMode = 'write' | 'preview';

export interface MentionCandidate {
  id: number;
  name: string;
  email: string;
  handle: string;
}

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTooltipModule,
    TranslateModule,
    MarkdownPipe
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true
    }
  ],
  template: `
    <div class="md-editor" [class.disabled]="disabled" [class.invalid]="invalid">
      <div class="md-toolbar">
        <div class="md-tools" role="toolbar" [attr.aria-label]="'tickets.markdown.toolbar' | translate">
          <button type="button" mat-icon-button
                  [disabled]="disabled || mode === 'preview'"
                  [matTooltip]="'tickets.markdown.bold' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyWrap('**', '**', 'bold')">
            <mat-icon>format_bold</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="disabled || mode === 'preview'"
                  [matTooltip]="'tickets.markdown.italic' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyWrap('*', '*', 'italic')">
            <mat-icon>format_italic</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="disabled || mode === 'preview'"
                  [matTooltip]="'tickets.markdown.code' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyCode()">
            <mat-icon>code</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="disabled || mode === 'preview'"
                  [matTooltip]="'tickets.markdown.link' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyLink()">
            <mat-icon>link</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="disabled || mode === 'preview'"
                  [matTooltip]="'tickets.markdown.list' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyLinePrefix('- ')">
            <mat-icon>format_list_bulleted</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="disabled || mode === 'preview'"
                  [matTooltip]="'tickets.markdown.quote' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyLinePrefix('> ')">
            <mat-icon>format_quote</mat-icon>
          </button>
        </div>
        <mat-button-toggle-group [value]="mode" (change)="mode = $event.value" hideSingleSelectionIndicator>
          <mat-button-toggle value="write">{{ 'tickets.markdown.write' | translate }}</mat-button-toggle>
          <mat-button-toggle value="preview">{{ 'tickets.markdown.preview' | translate }}</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      @if (mode === 'write') {
        <div class="md-write-wrap">
          <textarea #area
                    class="md-textarea"
                    [attr.rows]="rows"
                    [attr.maxlength]="maxLength"
                    [attr.aria-label]="labelKey ? (labelKey | translate) : ('tickets.markdown.editor' | translate)"
                    [placeholder]="placeholderKey ? (placeholderKey | translate) : ''"
                    [disabled]="disabled"
                    [value]="value"
                    (input)="onInput($event)"
                    (keydown)="onKeyDown($event)"
                    (keyup)="onKeyUp($event)"
                    (select)="captureSelection()"
                    (mouseup)="captureSelection()"
                    (blur)="onBlur()"></textarea>
          @if (mentionOpen && filteredMentionCandidates.length) {
            <ul class="mention-menu" role="listbox">
              @for (candidate of filteredMentionCandidates; track candidate.id; let i = $index) {
                <li role="option"
                    [class.active]="i === mentionActiveIndex"
                    (mousedown)="selectMention($event, candidate)">
                  <strong>{{ candidate.name }}</strong>
                  <span class="mention-meta" dir="ltr">{{ '@' + candidate.handle }}</span>
                </li>
              }
            </ul>
          }
        </div>
      } @else {
        <div class="md-preview markdown-body" [attr.aria-label]="'tickets.markdown.preview' | translate">
          @if (value.trim()) {
            <div [innerHTML]="value | markdown"></div>
          } @else {
            <p class="md-empty">{{ 'tickets.markdown.emptyPreview' | translate }}</p>
          }
        </div>
      }

      <div class="md-footer">
        <span class="md-hint">
          {{ (mentionEnabled ? 'tickets.markdown.mentionHint' : 'tickets.markdown.hint') | translate }}
        </span>
        @if (maxLength) {
          <span class="md-count" dir="ltr">{{ value.length }} / {{ maxLength }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .md-editor {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-primary, #fff);
      overflow: hidden;
    }
    .md-editor.invalid {
      border-color: var(--mat-form-field-error-text-color, #f44336);
    }
    .md-editor.disabled {
      opacity: 0.7;
      pointer-events: none;
    }
    .md-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);
    }
    .md-tools {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0;
    }
    .md-tools button mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .md-write-wrap { position: relative; }
    .md-textarea, .md-preview {
      min-height: 140px;
      padding: 12px 14px;
      font: inherit;
      line-height: 1.5;
    }
    .md-textarea {
      width: 100%;
      border: 0;
      outline: none;
      resize: vertical;
      background: transparent;
      color: inherit;
      box-sizing: border-box;
    }
    .mention-menu {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 8px;
      margin: 0;
      padding: 4px 0;
      list-style: none;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-primary, #fff);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      max-height: 180px;
      overflow: auto;
      z-index: 2;
    }
    .mention-menu li {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 12px;
      cursor: pointer;
    }
    .mention-menu li.active,
    .mention-menu li:hover {
      background: var(--bg-secondary);
    }
    .mention-meta {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .md-preview { overflow: auto; }
    .md-empty { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
    .md-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 12px 8px;
      border-top: 1px solid var(--border-color);
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .md-count { white-space: nowrap; }
  `]
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  private readonly translate = inject(TranslateService);
  private readonly codeFence = '`';

  @ViewChild('area') areaRef?: ElementRef<HTMLTextAreaElement>;

  @Input() rows = 6;
  @Input() maxLength = 10000;
  @Input() labelKey = '';
  @Input() placeholderKey = '';
  @Input() invalid = false;
  @Input() mentionEnabled = false;
  @Input() mentionCandidates: MentionCandidate[] = [];

  value = '';
  disabled = false;
  mode: EditorMode = 'write';
  mentionOpen = false;
  mentionQuery = '';
  mentionStart = -1;
  mentionActiveIndex = 0;

  private selectionStart = 0;
  private selectionEnd = 0;
  private onChange: (value: string) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  get filteredMentionCandidates(): MentionCandidate[] {
    const query = this.mentionQuery.toLowerCase();
    return this.mentionCandidates
      .filter((candidate) => {
        if (!query) {
          return true;
        }
        return candidate.name.toLowerCase().includes(query)
          || candidate.email.toLowerCase().includes(query)
          || candidate.handle.includes(query);
      })
      .slice(0, 8);
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value = target.value ?? '';
    this.captureSelectionFrom(target);
    this.onChange(this.value);
    this.updateMentionState();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.mentionOpen || !this.mentionEnabled) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const count = this.filteredMentionCandidates.length;
      if (count) {
        this.mentionActiveIndex = (this.mentionActiveIndex + 1) % count;
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const count = this.filteredMentionCandidates.length;
      if (count) {
        this.mentionActiveIndex = (this.mentionActiveIndex - 1 + count) % count;
      }
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      const candidate = this.filteredMentionCandidates[this.mentionActiveIndex];
      if (candidate) {
        event.preventDefault();
        this.insertMention(candidate);
      }
    } else if (event.key === 'Escape') {
      this.closeMentionMenu();
    }
  }

  onKeyUp(_event?: KeyboardEvent): void {
    this.captureSelection();
    this.updateMentionState();
  }

  onBlur(): void {
    this.captureSelection();
    this.onTouchedFn();
    setTimeout(() => this.closeMentionMenu(), 150);
  }

  captureSelection(): void {
    const area = this.areaRef?.nativeElement;
    if (area) {
      this.captureSelectionFrom(area);
    }
  }

  preserveSelection(event: MouseEvent): void {
    event.preventDefault();
    this.captureSelection();
  }

  selectMention(event: MouseEvent, candidate: MentionCandidate): void {
    event.preventDefault();
    this.insertMention(candidate);
  }

  applyWrap(before: string, after: string, placeholderKey: string): void {
    if (this.disabled || this.mode === 'preview') {
      return;
    }
    const placeholder = this.translate.instant(`tickets.markdown.placeholders.${placeholderKey}`);
    const start = this.selectionStart;
    const end = this.selectionEnd;
    const selected = this.value.slice(start, end);
    const insertion = selected || placeholder;
    const next = this.value.slice(0, start) + before + insertion + after + this.value.slice(end);
    this.commit(next, start + before.length, start + before.length + insertion.length);
  }

  applyCode(): void {
    this.applyWrap(this.codeFence, this.codeFence, 'code');
  }

  applyLink(): void {
    if (this.disabled || this.mode === 'preview') {
      return;
    }
    const label = this.translate.instant('tickets.markdown.placeholders.linkText');
    const url = this.translate.instant('tickets.markdown.placeholders.url');
    const start = this.selectionStart;
    const end = this.selectionEnd;
    const selected = this.value.slice(start, end);
    const insertion = selected || label;
    const after = `](${url})`;
    const next = this.value.slice(0, start) + '[' + insertion + after + this.value.slice(end);
    this.commit(next, start + 1, start + 1 + insertion.length);
  }

  applyLinePrefix(prefix: string): void {
    if (this.disabled || this.mode === 'preview') {
      return;
    }
    const start = this.selectionStart;
    const lineStart = this.value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const next = this.value.slice(0, lineStart) + prefix + this.value.slice(lineStart);
    const cursor = start + prefix.length;
    this.commit(next, cursor, cursor);
  }

  private insertMention(candidate: MentionCandidate): void {
    const area = this.areaRef?.nativeElement;
    if (!area || this.mentionStart < 0) {
      return;
    }
    const cursor = area.selectionStart ?? this.selectionEnd;
    const mentionText = `@${candidate.email}`;
    const next = this.value.slice(0, this.mentionStart) + mentionText + ' ' + this.value.slice(cursor);
    const cursorPos = this.mentionStart + mentionText.length + 1;
    this.closeMentionMenu();
    this.commit(next, cursorPos, cursorPos);
  }

  private updateMentionState(): void {
    if (!this.mentionEnabled || this.disabled || this.mode === 'preview') {
      this.closeMentionMenu();
      return;
    }
    const area = this.areaRef?.nativeElement;
    if (!area) {
      this.closeMentionMenu();
      return;
    }
    const pos = area.selectionStart ?? 0;
    const textBefore = this.value.slice(0, pos);
    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex < 0) {
      this.closeMentionMenu();
      return;
    }
    const charBefore = atIndex > 0 ? textBefore.charAt(atIndex - 1) : ' ';
    if (charBefore && !/\s|[([{]/.test(charBefore)) {
      this.closeMentionMenu();
      return;
    }
    const query = textBefore.slice(atIndex + 1);
    if (/\s/.test(query)) {
      this.closeMentionMenu();
      return;
    }
    this.mentionStart = atIndex;
    this.mentionQuery = query;
    this.mentionOpen = true;
    this.mentionActiveIndex = 0;
  }

  private closeMentionMenu(): void {
    this.mentionOpen = false;
    this.mentionQuery = '';
    this.mentionStart = -1;
    this.mentionActiveIndex = 0;
  }

  private captureSelectionFrom(area: HTMLTextAreaElement): void {
    this.selectionStart = area.selectionStart ?? 0;
    this.selectionEnd = area.selectionEnd ?? 0;
  }

  private commit(next: string, cursorStart: number, cursorEnd: number): void {
    if (this.maxLength && next.length > this.maxLength) {
      next = next.slice(0, this.maxLength);
      cursorStart = Math.min(cursorStart, next.length);
      cursorEnd = Math.min(cursorEnd, next.length);
    }
    this.value = next;
    this.selectionStart = cursorStart;
    this.selectionEnd = cursorEnd;
    this.onChange(this.value);

    queueMicrotask(() => {
      const area = this.areaRef?.nativeElement;
      if (!area) {
        return;
      }
      area.value = next;
      area.focus();
      area.setSelectionRange(cursorStart, cursorEnd);
      this.captureSelectionFrom(area);
    });
  }
}
