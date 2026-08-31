import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslationService } from './services/translation.service';
import { ThemeService } from './services/theme.service';
import { LocaleDigitsDomService } from './services/locale-digits-dom.service';
import { ScrollToTopComponent } from './components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ScrollToTopComponent],
  template: `
    <router-outlet></router-outlet>
    <app-scroll-to-top />
  `,
  styles: []
})
export class AppComponent implements OnInit {
  private translationService = inject(TranslationService);
  private themeService = inject(ThemeService);
  private localeDigitsDom = inject(LocaleDigitsDomService);

  ngOnInit(): void {
    const theme = this.themeService.theme();
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
    this.translationService.initialize();
    this.localeDigitsDom.start();
  }
}
