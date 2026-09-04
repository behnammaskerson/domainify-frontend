import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketQueuesSettingsComponent } from '../../components/ticket-queues-settings/ticket-queues-settings.component';

@Component({
  selector: 'app-ticket-queues-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PageHeroComponent,
    TicketQueuesSettingsComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.queuesPage.eyebrow' | translate"
        [title]="'tickets.queuesPage.title' | translate"
        [subtitle]="'tickets.queuesPage.subtitle' | translate">
      </app-page-hero>

      <div class="page-body">
        <div class="panel-surface queues-card">
          <app-ticket-queues-settings></app-ticket-queues-settings>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .queues-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
  `]
})
export class TicketQueuesPageComponent {}
