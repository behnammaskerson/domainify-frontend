import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Editor } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { htmlToMarkdown, markdownToEditorHtml } from '../../utils/markdown';
import {
  MarkdownLinkDialogComponent,
  MarkdownLinkDialogResult
} from '../markdown-link-dialog/markdown-link-dialog.component';

type EditorMode = 'rich' | 'write' | 'preview';

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
    MatDialogModule,
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
                  [disabled]="!canFormat"
                  [matTooltip]="'tickets.markdown.bold' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyBold()">
            <mat-icon>format_bold</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="!canFormat"
                  [matTooltip]="'tickets.markdown.italic' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyItalic()">
            <mat-icon>format_italic</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="!canFormat"
                  [matTooltip]="'tickets.markdown.code' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyCode()">
            <mat-icon>code</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="!canFormat"
                  [matTooltip]="'tickets.markdown.link' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyLink()">
            <mat-icon>link</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="!canFormat"
                  [matTooltip]="'tickets.markdown.list' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyList()">
            <mat-icon>format_list_bulleted</mat-icon>
          </button>
          <button type="button" mat-icon-button
                  [disabled]="!canFormat"
                  [matTooltip]="'tickets.markdown.quote' | translate"
                  (mousedown)="preserveSelection($event)"
                  (click)="applyQuote()">
            <mat-icon>format_quote</mat-icon>
          </button>
        </div>
        <mat-button-toggle-group [value]="mode" (change)="setMode($event.value)" hideSingleSelectionIndicator>
          <mat-button-toggle value="rich">{{ 'tickets.markdown.rich' | translate }}</mat-button-toggle>
          <mat-button-toggle value="write">{{ 'tickets.markdown.write' | translate }}</mat-button-toggle>
          <mat-button-toggle value="preview">{{ 'tickets.markdown.preview' | translate }}</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      @if (mode === 'rich') {
        <div class="md-write-wrap">
          <div #richHost
               class="md-rich markdown-body"
               [attr.aria-label]="labelKey ? (labelKey | translate) : ('tickets.markdown.richEditor' | translate)"></div>
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
      } @else if (mode === 'write') {
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
          {{ hintKey | translate }}
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
    .md-textarea, .md-preview, .md-rich {
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
    .md-rich {
      width: 100%;
      box-sizing: border-box;
      cursor: text;
    }
    .md-rich .ProseMirror {
      outline: none;
      min-height: 116px;
    }
    .md-rich .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--text-muted);
      pointer-events: none;
      height: 0;
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
export class MarkdownEditorComponent implements ControlValueAccessor, OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly codeFence = '`';

  @ViewChild('area') areaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('richHost') set richHost(ref: ElementRef<HTMLDivElement> | undefined) {
    if (ref && this.mode === 'rich' && !this.editor) {
      this.initRichEditor(ref.nativeElement);
    }
  }

  @Input() rows = 6;
  @Input() maxLength = 10000;
  @Input() labelKey = '';
  @Input() placeholderKey = '';
  @Input() invalid = false;
  @Input() mentionEnabled = false;
  @Input() mentionCandidates: MentionCandidate[] = [];

  value = '';
  disabled = false;
  mode: EditorMode = 'rich';
  mentionOpen = false;
  mentionQuery = '';
  mentionStart = -1;
  mentionActiveIndex = 0;

  private editor: Editor | null = null;
  private syncingFromForm = false;
  private selectionStart = 0;
  private selectionEnd = 0;
  private onChange: (value: string) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  get canFormat(): boolean {
    return !this.disabled && this.mode !== 'preview';
  }

  get hintKey(): string {
    if (this.mentionEnabled) {
      return 'tickets.markdown.mentionHint';
    }
    return this.mode === 'rich' ? 'tickets.markdown.richHint' : 'tickets.markdown.hint';
  }

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

  ngOnDestroy(): void {
    this.destroyRichEditor();
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
    if (this.mode === 'rich' && this.editor && !this.syncingFromForm) {
      this.syncingFromForm = true;
      this.editor.commands.setContent(markdownToEditorHtml(this.value), false);
      this.syncingFromForm = false;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.editor?.setEditable(!isDisabled);
  }

  setMode(next: EditorMode): void {
    if (!next || next === this.mode) {
      return;
    }
    if (this.mode === 'rich') {
      this.syncValueFromEditor();
      this.destroyRichEditor();
    }
    this.closeMentionMenu();
    this.mode = next;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value = target.value ?? '';
    this.captureSelectionFrom(target);
    this.onChange(this.value);
    this.updateMentionStateFromText(this.value, target.selectionStart ?? 0);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.mode === 'rich') {
      this.handleMentionKeyDown(event);
      return;
    }
    this.handleMentionKeyDown(event);
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
    if (this.mode === 'write') {
      event.preventDefault();
      this.captureSelection();
    }
  }

  selectMention(event: MouseEvent, candidate: MentionCandidate): void {
    event.preventDefault();
    this.insertMention(candidate);
  }

  applyBold(): void {
    if (!this.canFormat) {
      return;
    }
    if (this.mode === 'rich') {
      this.editor?.chain().focus().toggleBold().run();
      return;
    }
    this.applyWrap('**', '**', 'bold');
  }

  applyItalic(): void {
    if (!this.canFormat) {
      return;
    }
    if (this.mode === 'rich') {
      this.editor?.chain().focus().toggleItalic().run();
      return;
    }
    this.applyWrap('*', '*', 'italic');
  }

  applyCode(): void {
    if (!this.canFormat) {
      return;
    }
    if (this.mode === 'rich') {
      this.editor?.chain().focus().toggleCode().run();
      return;
    }
    this.applyWrap(this.codeFence, this.codeFence, 'code');
  }

  applyLink(): void {
    if (!this.canFormat) {
      return;
    }
    if (this.mode === 'rich') {
      this.applyRichLink();
      return;
    }

    const start = this.selectionStart;
    const end = this.selectionEnd;
    const selected = this.value.slice(start, end);
    this.dialog
      .open(MarkdownLinkDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        data: {
          text: selected,
          url: '',
          showText: true,
          canRemove: false
        }
      })
      .afterClosed()
      .subscribe((result: MarkdownLinkDialogResult | undefined) => {
        if (!result || result.action !== 'apply') {
          return;
        }
        const insertion = result.text || selected
          || this.translate.instant('tickets.markdown.placeholders.linkText');
        const next = this.value.slice(0, start)
          + '[' + insertion + '](' + result.url + ')'
          + this.value.slice(end);
        this.commit(next, start + 1, start + 1 + insertion.length);
      });
  }

  applyList(): void {
    if (!this.canFormat) {
      return;
    }
    if (this.mode === 'rich') {
      this.editor?.chain().focus().toggleBulletList().run();
      return;
    }
    this.applyLinePrefix('- ');
  }

  applyQuote(): void {
    if (!this.canFormat) {
      return;
    }
    if (this.mode === 'rich') {
      this.editor?.chain().focus().toggleBlockquote().run();
      return;
    }
    this.applyLinePrefix('> ');
  }

  applyWrap(before: string, after: string, placeholderKey: string): void {
    if (!this.canFormat || this.mode !== 'write') {
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

  applyLinePrefix(prefix: string): void {
    if (!this.canFormat || this.mode !== 'write') {
      return;
    }
    const start = this.selectionStart;
    const lineStart = this.value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const next = this.value.slice(0, lineStart) + prefix + this.value.slice(lineStart);
    const cursor = start + prefix.length;
    this.commit(next, cursor, cursor);
  }

  /** Focus the active editor surface (used by ticket keyboard shortcuts). */
  focus(): void {
    queueMicrotask(() => {
      if (this.mode === 'rich') {
        this.editor?.commands.focus('end');
        return;
      }
      this.areaRef?.nativeElement?.focus();
    });
  }

  private applyRichLink(): void {
    if (!this.editor) {
      return;
    }
    const previous = (this.editor.getAttributes('link')['href'] as string | undefined) || '';
    const { from, to, empty } = this.editor.state.selection;
    const selectedText = empty
      ? ''
      : this.editor.state.doc.textBetween(from, to, ' ');
    const insertingNew = empty && !previous;

    this.dialog
      .open(MarkdownLinkDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        data: {
          url: previous,
          text: selectedText,
          showText: insertingNew,
          canRemove: !!previous
        }
      })
      .afterClosed()
      .subscribe((result: MarkdownLinkDialogResult | undefined) => {
        if (!result || !this.editor) {
          return;
        }
        if (result.action === 'remove') {
          this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }
        if (insertingNew) {
          const label = result.text
            || this.translate.instant('tickets.markdown.placeholders.linkText');
          this.editor
            .chain()
            .focus()
            .insertContent({
              type: 'text',
              text: label,
              marks: [{ type: 'link', attrs: { href: result.url } }]
            })
            .run();
          return;
        }
        this.editor.chain().focus().extendMarkRange('link').setLink({ href: result.url }).run();
      });
  }

  private initRichEditor(element: HTMLDivElement): void {
    if (this.editor) {
      return;
    }
    const placeholder = this.placeholderKey
      ? this.translate.instant(this.placeholderKey)
      : '';
    this.editor = new Editor({
      element,
      editable: !this.disabled,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: false
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank'
          }
        }),
        Placeholder.configure({
          placeholder
        })
      ],
      content: markdownToEditorHtml(this.value),
      editorProps: {
        attributes: {
          class: 'md-prose',
          spellcheck: 'true'
        },
        handleKeyDown: (_view, event) => {
          if (!this.mentionOpen || !this.mentionEnabled) {
            return false;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp'
              || event.key === 'Enter' || event.key === 'Tab'
              || event.key === 'Escape') {
            this.handleMentionKeyDown(event);
            return true;
          }
          return false;
        }
      },
      onUpdate: ({ editor }) => {
        if (this.syncingFromForm) {
          return;
        }
        let markdown = htmlToMarkdown(editor.getHTML());
        if (this.maxLength && markdown.length > this.maxLength) {
          markdown = markdown.slice(0, this.maxLength);
          this.syncingFromForm = true;
          editor.commands.setContent(markdownToEditorHtml(markdown), false);
          this.syncingFromForm = false;
        }
        this.value = markdown;
        this.onChange(this.value);
        this.updateMentionStateFromRich();
      },
      onSelectionUpdate: () => {
        this.updateMentionStateFromRich();
      },
      onBlur: () => {
        this.onTouchedFn();
        setTimeout(() => this.closeMentionMenu(), 150);
      }
    });
  }

  private destroyRichEditor(): void {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }

  private syncValueFromEditor(): void {
    if (!this.editor) {
      return;
    }
    this.value = htmlToMarkdown(this.editor.getHTML());
    this.onChange(this.value);
  }

  private insertMention(candidate: MentionCandidate): void {
    const mentionText = `@${candidate.email}`;
    if (this.mode === 'rich' && this.editor) {
      if (this.mentionStart < 0) {
        return;
      }
      const { from } = this.editor.state.selection;
      const deleteFrom = this.mentionStart;
      this.closeMentionMenu();
      this.editor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContent(mentionText + ' ')
        .run();
      return;
    }

    const area = this.areaRef?.nativeElement;
    if (!area || this.mentionStart < 0) {
      return;
    }
    const cursor = area.selectionStart ?? this.selectionEnd;
    const next = this.value.slice(0, this.mentionStart) + mentionText + ' ' + this.value.slice(cursor);
    const cursorPos = this.mentionStart + mentionText.length + 1;
    this.closeMentionMenu();
    this.commit(next, cursorPos, cursorPos);
  }

  private handleMentionKeyDown(event: KeyboardEvent): void {
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

  private updateMentionState(): void {
    if (this.mode === 'rich') {
      this.updateMentionStateFromRich();
      return;
    }
    if (!this.mentionEnabled || this.disabled || this.mode === 'preview') {
      this.closeMentionMenu();
      return;
    }
    const area = this.areaRef?.nativeElement;
    if (!area) {
      this.closeMentionMenu();
      return;
    }
    this.updateMentionStateFromText(this.value, area.selectionStart ?? 0);
  }

  private updateMentionStateFromRich(): void {
    if (!this.mentionEnabled || this.disabled || !this.editor) {
      this.closeMentionMenu();
      return;
    }
    const { $from } = this.editor.state.selection;
    if (!$from.parent.isTextblock) {
      this.closeMentionMenu();
      return;
    }
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\0');
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
    this.mentionStart = $from.start() + atIndex;
    this.mentionQuery = query;
    this.mentionOpen = true;
    this.mentionActiveIndex = 0;
  }

  private updateMentionStateFromText(textBefore: string, pos: number): void {
    if (!this.mentionEnabled || this.disabled || this.mode === 'preview') {
      this.closeMentionMenu();
      return;
    }
    const before = textBefore.slice(0, pos);
    const atIndex = before.lastIndexOf('@');
    if (atIndex < 0) {
      this.closeMentionMenu();
      return;
    }
    const charBefore = atIndex > 0 ? before.charAt(atIndex - 1) : ' ';
    if (charBefore && !/\s|[([{]/.test(charBefore)) {
      this.closeMentionMenu();
      return;
    }
    const query = before.slice(atIndex + 1);
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
