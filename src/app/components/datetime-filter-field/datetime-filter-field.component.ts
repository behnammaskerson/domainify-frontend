import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarLocaleService } from '../../services/calendar-locale.service';

/**
 * Date + time filter control. Uses Material datepicker (Jalali when language is Persian)
 * plus a native time input; emits ISO-8601 Instant string or null.
 */
@Component({
  selector: 'app-datetime-filter-field',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule
  ],
  template: `
    <div class="datetime-filter" [class.compact]="compact" [class.jalali]="calendar.isJalali()">
      <mat-form-field appearance="outline" class="date-field" subscriptSizing="dynamic">
        <mat-label>{{ labelKey | translate }}</mat-label>
        <input matInput
               [matDatepicker]="picker"
               [(ngModel)]="dateValue"
               (dateChange)="onDateChange($event.value)"
               [placeholder]="calendar.isJalali() ? 'YYYY/MM/DD' : 'YYYY-MM-DD'">
        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-datepicker #picker></mat-datepicker>
      </mat-form-field>
      <mat-form-field appearance="outline" class="time-field" subscriptSizing="dynamic">
        <mat-label>{{ 'users.filters.time' | translate }}</mat-label>
        <input matInput
               type="time"
               [ngModel]="timeValue"
               (ngModelChange)="onTimeInput($event)"
               [disabled]="!dateValue">
      </mat-form-field>
      @if (isoValue) {
        <button mat-icon-button type="button" class="clear-btn"
                [attr.aria-label]="'common.clear' | translate"
                (click)="clear()">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>
  `,
  styles: [`
    .datetime-filter {
      display: inline-flex;
      align-items: flex-start;
      gap: 8px;
      min-width: 0;
    }

    .date-field {
      flex: 1 1 160px;
      min-width: 140px;
      max-width: 200px;
    }

    .time-field {
      flex: 0 0 118px;
      width: 118px;
    }

    .date-field ::ng-deep .mat-mdc-form-field-subscript-wrapper,
    .time-field ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .clear-btn {
      width: 40px;
      height: 40px;
      margin-top: 4px;
    }

    .compact .date-field,
    .compact .time-field {
      font-size: 0.9rem;
    }
  `]
})
export class DatetimeFilterFieldComponent implements OnChanges {
  readonly calendar = inject(CalendarLocaleService);

  @Input() labelKey = 'users.filters.createdAt';
  @Input() compact = false;
  /** ISO-8601 string or null */
  @Input() isoValue: string | null = null;
  @Output() isoValueChange = new EventEmitter<string | null>();

  dateValue: Date | null = null;
  timeValue = '00:00';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isoValue']) {
      this.hydrateFromIso(this.isoValue);
    }
  }

  onDateChange(date: Date | null): void {
    this.dateValue = date;
    this.emitCombined();
  }

  onTimeInput(value: string): void {
    this.timeValue = value || '00:00';
    this.emitCombined();
  }

  clear(): void {
    this.dateValue = null;
    this.timeValue = '00:00';
    this.isoValueChange.emit(null);
  }

  private hydrateFromIso(iso: string | null): void {
    if (!iso) {
      this.dateValue = null;
      this.timeValue = '00:00';
      return;
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      this.dateValue = null;
      this.timeValue = '00:00';
      return;
    }
    this.dateValue = d;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    this.timeValue = `${hh}:${mm}`;
  }

  private emitCombined(): void {
    if (!this.dateValue) {
      this.isoValueChange.emit(null);
      return;
    }
    const [hh, mm] = (this.timeValue || '00:00').split(':').map(n => Number(n) || 0);
    const combined = new Date(
      this.dateValue.getFullYear(),
      this.dateValue.getMonth(),
      this.dateValue.getDate(),
      hh,
      mm,
      0,
      0
    );
    this.isoValueChange.emit(combined.toISOString());
  }
}
