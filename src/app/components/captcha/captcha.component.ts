import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

export interface CaptchaResult {
  token: string;
  answer: string;
}

interface CaptchaResponse {
  token: string;
  imageDataUrl: string;
}

@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
    <div class="captcha-container" [class.compact]="compact">
      <div class="captcha-image-container">
        @if (loading) {
          <div class="captcha-loading">
            <mat-progress-spinner diameter="24" mode="indeterminate"></mat-progress-spinner>
            @if (!compact) {
              <p>{{ 'captcha.loading' | translate }}</p>
            }
          </div>
        } @else if (imageDataUrl) {
          <img [src]="imageDataUrl"
               [alt]="'captcha.imageAlt' | translate"
               class="captcha-image">
        } @else {
          <div class="captcha-error">
            <mat-icon>error</mat-icon>
            @if (!compact) {
              <p>{{ 'captcha.loadError' | translate }}</p>
            }
          </div>
        }

        <button mat-icon-button
                type="button"
                class="refresh-btn"
                (click)="refreshCaptcha()"
                [disabled]="loading"
                [attr.aria-label]="'captcha.refresh' | translate">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <mat-form-field appearance="outline" class="captcha-input" subscriptSizing="dynamic">
        <mat-label>{{ 'captcha.enterCode' | translate }}</mat-label>
        <input matInput
               [formControl]="answerControl"
               autocomplete="off"
               [placeholder]="'captcha.placeholder' | translate">
        @if (answerControl.hasError('required')) {
          <mat-error>{{ 'captcha.required' | translate }}</mat-error>
        }
      </mat-form-field>
    </div>
  `,
  styles: [`
    .captcha-container {
      display: grid;
      gap: 0.75rem;
      max-width: 300px;
    }

    .captcha-container.compact {
      max-width: none;
      grid-template-columns: minmax(140px, 180px) minmax(0, 1fr);
      align-items: center;
      gap: 0.65rem;
    }

    .captcha-image-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }

    .compact .captcha-image-container {
      min-height: 44px;
    }

    .captcha-image {
      display: block;
      max-width: 100%;
      height: auto;
      max-height: 56px;
    }

    .compact .captcha-image {
      max-height: 44px;
    }

    .captcha-loading,
    .captcha-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 0.5rem;
      color: var(--text-secondary);
    }

    .captcha-error mat-icon {
      color: var(--error);
    }

    .refresh-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-primary);
    }

    .captcha-input {
      width: 100%;
    }

    .captcha-loading p,
    .captcha-error p {
      margin: 0;
      font-size: 0.8rem;
    }

    @media (max-width: 520px) {
      .captcha-container.compact {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CaptchaComponent implements OnInit {
  @Input() required = true;
  @Input() compact = false;
  @Output() captchaResult = new EventEmitter<CaptchaResult | null>();

  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly API_URL = 'http://localhost:8080/api';

  loading = false;
  imageDataUrl = '';
  currentToken = '';

  readonly answerControl = this.fb.control('', this.required ? [Validators.required] : []);

  ngOnInit(): void {
    this.refreshCaptcha();
    
    // Emit result when answer changes
    this.answerControl.valueChanges.subscribe(answer => {
      if (this.currentToken && answer) {
        this.captchaResult.emit({
          token: this.currentToken,
          answer: answer.trim()
        });
      } else {
        this.captchaResult.emit(null);
      }
    });
  }

  refreshCaptcha(): void {
    this.loading = true;
    this.imageDataUrl = '';
    this.currentToken = '';
    this.answerControl.setValue('');

    this.http.post<CaptchaResponse>(`${this.API_URL}/public/captcha/generate`, {}).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.token && response.imageDataUrl) {
          this.currentToken = response.token;
          this.imageDataUrl = response.imageDataUrl;
        }
      },
      error: () => {
        this.loading = false;
        // CAPTCHA generation failed, component will show error state
      }
    });
  }

  reset(): void {
    this.answerControl.setValue('');
    this.refreshCaptcha();
  }

  isValid(): boolean {
    return this.answerControl.valid && !!this.currentToken && !!this.answerControl.value?.trim();
  }
}