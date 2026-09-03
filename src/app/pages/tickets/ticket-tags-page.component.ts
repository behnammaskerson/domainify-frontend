import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketTagsSettingsComponent } from '../../components/ticket-tags-settings/ticket-tags-settings.component';

@Component({
  selector: 'app-ticket-tags-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PageHeroComponent,
    TicketTagsSettingsComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.tagsPage.eyebrow' | translate"
        [title]="'tickets.tagsPage.title' | translate"
        [subtitle]="'tickets.tagsPage.subtitle' | translate">
      </app-page-hero>
      <div class="page-body">
        <div class="panel-surface tags-card">
          <app-ticket-tags-settings></app-ticket-tags-settings>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tags-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
  `]
})
export class TicketTagsPageComponent {}
