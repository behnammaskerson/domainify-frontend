import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { DomainCategoriesSettingsComponent } from '../../components/domain-categories-settings/domain-categories-settings.component';

@Component({
  selector: 'app-domain-categories-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PageHeroComponent,
    DomainCategoriesSettingsComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'domains.categoriesPage.eyebrow' | translate"
        [title]="'domains.categoriesPage.title' | translate"
        [subtitle]="'domains.categoriesPage.subtitle' | translate">
      </app-page-hero>

      <div class="page-body">
        <div class="panel-surface categories-card">
          <app-domain-categories-settings></app-domain-categories-settings>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .categories-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
  `]
})
export class DomainCategoriesPageComponent {}
