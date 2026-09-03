import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { TicketSettingsFormComponent } from '../../components/ticket-settings-form/ticket-settings-form.component';

@Component({
  selector: 'app-ticket-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PageHeroComponent,
    TicketSettingsFormComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.settingsPage.eyebrow' | translate"
        [title]="'tickets.settingsPage.title' | translate"
        [subtitle]="'tickets.settingsPage.subtitle' | translate">
      </app-page-hero>
      <div class="page-body">
        <div class="panel-surface settings-card">
          <app-ticket-settings-form></app-ticket-settings-form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-card {
      padding: 24px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
  `]
})
export class TicketSettingsPageComponent {}
