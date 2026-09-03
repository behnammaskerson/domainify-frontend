import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';
import { AuthService } from '../../services/auth.service';
import { ApiErrorService } from '../../services/api-error.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
    MatSnackBarModule,
    AuthShellComponent
  ],
  template: `
    <app-auth-shell
      [title]="'auth.verifyEmail.title' | translate"
      [subtitle]="subtitleKey | translate"
      [headline]="'auth.verifyEmail.heroTitle' | translate"
      [support]="'auth.verifyEmail.heroSupport' | translate">
      <div class="verify-body">
        @if (loading) {
          <mat-progress-spinner diameter="40" mode="indeterminate"></mat-progress-spinner>
        } @else if (success) {
          <div class="status success">
            <mat-icon>mark_email_read</mat-icon>
            <p>{{ 'auth.verifyEmail.success' | translate }}</p>
          </div>
          <button mat-flat-button color="primary" routerLink="/settings" fragment="profile">
            {{ 'auth.verifyEmail.goProfile' | translate }}
          </button>
        } @else {
          <div class="status error">
            <mat-icon>error_outline</mat-icon>
            <p>{{ errorMessage }}</p>
          </div>
          <button mat-stroked-button routerLink="/login">
            {{ 'auth.verifyEmail.backLogin' | translate }}
          </button>
        }
      </div>
    </app-auth-shell>
  `,
  styles: [`
    .verify-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 8px 0 16px;
      text-align: center;
    }
    .status {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--text-muted);
    }
    .status mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
    .status.success mat-icon { color: #2e7d32; }
    .status.error mat-icon { color: #c62828; }
    .status p { margin: 0; line-height: 1.5; }
  `]
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  loading = true;
  success = false;
  errorMessage = '';
  subtitleKey = 'auth.verifyEmail.subtitlePending';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      this.errorMessage = this.translate.instant('auth.verifyEmail.missingToken');
      this.subtitleKey = 'auth.verifyEmail.subtitleFailed';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.subtitleKey = 'auth.verifyEmail.subtitleSuccess';
        if (this.authService.isLoggedIn()) {
          this.authService.refreshCurrentUser().subscribe();
        }
      },
      error: (error) => {
        this.loading = false;
        this.success = false;
        this.subtitleKey = 'auth.verifyEmail.subtitleFailed';
        this.errorMessage = this.apiError.resolve(error);
      }
    });
  }
}
