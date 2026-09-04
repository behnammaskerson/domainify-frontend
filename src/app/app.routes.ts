import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from './auth/verify-email/verify-email.component';
import { AuthGuard } from './auth/auth.guard';
import { AdminGuard } from './auth/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'domains',
        loadComponent: () => import('./pages/domains/domains.component').then(m => m.DomainsComponent)
      },
      {
        path: 'analyzer',
        loadComponent: () => import('./pages/domain-analyzer/domain-analyzer.component').then(m => m.DomainAnalyzerComponent)
      },
      {
        path: 'marketplace',
        loadComponent: () => import('./pages/marketplace/marketplace.component').then(m => m.MarketplaceComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/notifications/notifications-page.component').then(m => m.NotificationsPageComponent)
      },
      {
        path: 'admin/tickets/inbox',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/tickets/admin-tickets-inbox.component').then(m => m.AdminTicketsInboxComponent)
      },
      {
        path: 'admin/tickets/:id',
        canActivate: [AdminGuard],
        data: { mode: 'admin' },
        loadComponent: () => import('./pages/tickets/ticket-detail.component').then(m => m.TicketDetailComponent)
      },
      {
        path: 'tickets',
        pathMatch: 'full',
        redirectTo: 'tickets/mine'
      },
      {
        path: 'tickets/mine',
        loadComponent: () => import('./pages/tickets/my-tickets.component').then(m => m.MyTicketsComponent)
      },
      {
        path: 'tickets/mine/:id',
        data: { mode: 'customer' },
        loadComponent: () => import('./pages/tickets/ticket-detail.component').then(m => m.TicketDetailComponent)
      },
      {
        path: 'tickets/new',
        loadComponent: () => import('./pages/tickets/create-ticket.component').then(m => m.CreateTicketComponent)
      },
      {
        path: 'tickets/categories',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/tickets/ticket-categories-page.component').then(m => m.TicketCategoriesPageComponent)
      },
      {
        path: 'tickets/queues',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/tickets/ticket-queues-page.component').then(m => m.TicketQueuesPageComponent)
      },
      {
        path: 'tickets/tags',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/tickets/ticket-tags-page.component').then(m => m.TicketTagsPageComponent)
      },
      {
        path: 'tickets/reply-templates',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/tickets/ticket-reply-templates-page.component').then(m => m.TicketReplyTemplatesPageComponent)
      },
      {
        path: 'tickets/settings',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/tickets/ticket-settings-page.component').then(m => m.TicketSettingsPageComponent)
      },
      {
        path: 'tickets/status-workflow',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/tickets/ticket-status-workflow-page.component').then(m => m.TicketStatusWorkflowPageComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'user',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'sms/single-send',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/single-sms-send.component').then(m => m.SingleSmsSendComponent)
      },
      {
        path: 'sms/bulk-send',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/bulk-sms-send.component').then(m => m.BulkSmsSendComponent)
      },
      {
        path: 'sms/bulk-send-file',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/bulk-sms-file-send.component').then(m => m.BulkSmsFileSendComponent)
      },
      {
        path: 'sms/scheduled',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/scheduled-sms.component').then(m => m.ScheduledSmsComponent)
      },
      {
        path: 'sms/send-reports',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/sms-send-reports.component').then(m => m.SmsSendReportsComponent)
      },
      {
        path: 'sms/live-sends',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/sms-send-reports.component').then(m => m.SmsSendReportsComponent)
      },
      {
        path: 'sms/archive-sends',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/sms-send-reports.component').then(m => m.SmsSendReportsComponent)
      },
      {
        path: 'sms/daily-packs',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/sms-send-reports.component').then(m => m.SmsSendReportsComponent)
      },
      {
        path: 'sms/pack-report/:packId',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/sms-pack-report.component').then(m => m.SmsPackReportComponent)
      },
      {
        path: 'sms/receive-reports',
        canActivate: [AdminGuard],
        loadComponent: () => import('./pages/sms/sms-receive-reports.component').then(m => m.SmsReceiveReportsComponent)
      },
      {
        path: 'customers',
        redirectTo: 'user',
        pathMatch: 'full'
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
