import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketCategoriesSettingsComponent } from '../../components/ticket-categories-settings/ticket-categories-settings.component';

@Component({
  selector: 'app-ticket-categories-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PageHeroComponent,
    TicketCategoriesSettingsComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.categoriesPage.eyebrow' | translate"
        [title]="'tickets.categoriesPage.title' | translate"
        [subtitle]="'tickets.categoriesPage.subtitle' | translate">
      </app-page-hero>

      <div class="page-body">
        <div class="panel-surface categories-card">
          <app-ticket-categories-settings></app-ticket-categories-settings>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .categories-card {
      padding: 24px;
      max-width: 900px;
    }
  `]
})
export class TicketCategoriesPageComponent {}
