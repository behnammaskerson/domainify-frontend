import { marked } from 'marked';
import DOMPurify from 'dompurify';

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

/** Convert Markdown to sanitized HTML safe for `[innerHTML]`. */
export function renderMarkdown(source: string | null | undefined): string {
  const text = (source ?? '').trim();
  if (!text) {
    return '';
  }
  ensureSanitizeHooks();
  const raw = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false
  });
}
