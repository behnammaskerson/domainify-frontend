import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketReplyTemplatesSettingsComponent } from '../../components/ticket-reply-templates-settings/ticket-reply-templates-settings.component';

@Component({
  selector: 'app-ticket-reply-templates-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PageHeroComponent,
    TicketReplyTemplatesSettingsComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.replyTemplatesPage.eyebrow' | translate"
        [title]="'tickets.replyTemplatesPage.title' | translate"
        [subtitle]="'tickets.replyTemplatesPage.subtitle' | translate">
      </app-page-hero>
      <div class="page-body">
        <div class="panel-surface templates-card">
          <app-ticket-reply-templates-settings></app-ticket-reply-templates-settings>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .templates-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
  `]
})
export class TicketReplyTemplatesPageComponent {}
