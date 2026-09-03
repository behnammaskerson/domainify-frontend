import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketStatusWorkflowSettingsComponent } from '../../components/ticket-status-workflow-settings/ticket-status-workflow-settings.component';

@Component({
  selector: 'app-ticket-status-workflow-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PageHeroComponent,
    TicketStatusWorkflowSettingsComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.statusWorkflowPage.eyebrow' | translate"
        [title]="'tickets.statusWorkflowPage.title' | translate"
        [subtitle]="'tickets.statusWorkflowPage.subtitle' | translate">
      </app-page-hero>

      <div class="page-body">
        <div class="panel-surface workflow-card">
          <app-ticket-status-workflow-settings></app-ticket-status-workflow-settings>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workflow-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
  `]
})
export class TicketStatusWorkflowPageComponent {}
