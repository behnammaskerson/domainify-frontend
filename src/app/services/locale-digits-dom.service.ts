import { Injectable, OnDestroy, inject, effect } from '@angular/core';
import { TranslationService } from './translation.service';
import { toLatinDigits, toLocaleDigits, usesLocaleDigits } from '../utils/locale-digits';

/** Elements that must keep Latin digits (inputs, emails, phones, secrets, code). */
const SKIP_SELECTOR = [
  'script',
  'style',
  'textarea',
  'input',
  'code',
  'pre',
  'kbd',
  'samp',
  'mat-icon',
  '[contenteditable="true"]',
  '[data-no-locale-digits]',
  '[dir="ltr"]',
  '.mat-mdc-input-element',
  '.mdc-text-field__input',
  '.cell-email',
  '.mobile-number',
  '.profile-email',
  '.dial-prefix',
  '.domain-name'
].join(',');

@Injectable({ providedIn: 'root' })
export class LocaleDigitsDomService implements OnDestroy {
  private readonly translation = inject(TranslationService);
  private observer: MutationObserver | null = null;
  private rafId = 0;
  private started = false;
  private applying = false;
  private pending = false;

  constructor() {
    effect(() => {
      const lang = this.translation.currentLang();
      if (!this.started) {
        return;
      }
      queueMicrotask(() => this.refreshAll());
      void lang;
    });
  }

  start(): void {
    if (this.started || typeof document === 'undefined') {
      return;
    }
    this.started = true;
    this.refreshAll();
    this.observer = new MutationObserver(() => this.scheduleRefresh());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  private scheduleRefresh(): void {
    if (this.applying) {
      this.pending = true;
      return;
    }
    if (this.rafId) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.refreshAll();
    });
  }

  private refreshAll(): void {
    this.applying = true;
    try {
      this.processRoot(document.body, this.translation.currentLang());
    } finally {
      this.applying = false;
      if (this.pending) {
        this.pending = false;
        this.scheduleRefresh();
      }
    }
  }

  private processRoot(root: Node, lang: string): void {
    if (!root) {
      return;
    }
    if (root.nodeType === Node.TEXT_NODE) {
      this.convertTextNode(root as Text, lang);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      return;
    }

    const el = root as Element;
    if (el.nodeType === Node.ELEMENT_NODE) {
      if (el.matches?.(SKIP_SELECTOR) || el.closest?.(SKIP_SELECTOR)) {
        return;
      }
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP_SELECTOR)) {
          return NodeFilter.FILTER_REJECT;
        }
        const value = node.nodeValue;
        if (!value || !/[0-9۰-۹٠-٩]/.test(value)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current as Text);
      current = walker.nextNode();
    }
    for (const node of nodes) {
      this.convertTextNode(node, lang);
    }
  }

  private convertTextNode(node: Text, lang: string): void {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP_SELECTOR)) {
      return;
    }
    const value = node.nodeValue;
    if (!value || !/[0-9۰-۹٠-٩]/.test(value)) {
      return;
    }
    const next = usesLocaleDigits(lang)
      ? toLocaleDigits(value, lang)
      : toLatinDigits(value);
    if (next !== value) {
      node.nodeValue = next;
    }
  }
}
