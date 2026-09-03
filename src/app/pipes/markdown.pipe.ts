import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { renderMarkdown } from '../utils/markdown';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(value));
  }
}
