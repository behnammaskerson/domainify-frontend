import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';

marked.setOptions({
  gfm: true,
  breaks: true
});

const ALLOWED_TAGS = [
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'li', 'ol', 'p', 'pre', 'strong', 'ul', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'class'];

let hooksInstalled = false;
let turndown: TurndownService | null = null;

function ensureSanitizeHooks(): void {
  if (hooksInstalled || typeof window === 'undefined') {
    return;
  }
  hooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
      const href = node.getAttribute('href') || '';
      if (href && !/^(https?:|mailto:|#)/i.test(href)) {
        node.removeAttribute('href');
      }
    }
  });
}

function getTurndown(): TurndownService {
  if (!turndown) {
    turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**'
    });
    turndown.keep(['del']);
  }
  return turndown;
}

function parseMarkdownHtml(source: string): string {
  return marked.parse(source, { async: false }) as string;
}

/** Convert Markdown to sanitized HTML safe for `[innerHTML]`. */
export function renderMarkdown(source: string | null | undefined): string {
  const text = (source ?? '').trim();
  if (!text) {
    return '';
  }
  ensureSanitizeHooks();
  const raw = parseMarkdownHtml(text);
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false
  });
}

/** Markdown → HTML for the WYSIWYG editor (sanitized allowlist). */
export function markdownToEditorHtml(source: string | null | undefined): string {
  const text = (source ?? '').trim();
  if (!text) {
    return '<p></p>';
  }
  ensureSanitizeHooks();
  const raw = parseMarkdownHtml(text);
  const cleaned = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false
  });
  return cleaned.trim() || '<p></p>';
}

/** TipTap / HTML → Markdown for storage (keeps existing Markdown pipeline). */
export function htmlToMarkdown(html: string | null | undefined): string {
  const source = (html ?? '').trim();
  if (!source || source === '<p></p>' || source === '<p><br></p>') {
    return '';
  }
  return getTurndown().turndown(source).trim();
}
