import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSidenavModule } from '@angular/material/sidenav';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Inject } from '@angular/core';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { DatetimeFilterFieldComponent } from '../../components/datetime-filter-field/datetime-filter-field.component';
import { ApiErrorService } from '../../services/api-error.service';
import { ManagedUser, UsersService } from '../../services/users.service';
import { TranslationService } from '../../services/translation.service';
import { PasswordPolicyService } from '../../services/password-policy.service';
import { buildPasswordValidators } from '../../utils/password-policy.validators';
import { LocaleDatePipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { findPhoneCountry, formatPhoneDigits } from '../../utils/phone-countries';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.user ? 'users.editTitle' : 'users.createTitle') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'users.fields.firstName' | translate }}</mat-label>
          <input matInput formControlName="firstName">
          @if (form.controls.firstName.hasError('required')) {
            <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
          } @else if (form.controls.firstName.hasError('minlength')) {
            <mat-error>{{ 'auth.validation.minLength' | translate }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'users.fields.lastName' | translate }}</mat-label>
          <input matInput formControlName="lastName">
          @if (form.controls.lastName.hasError('required')) {
            <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
          } @else if (form.controls.lastName.hasError('minlength')) {
            <mat-error>{{ 'auth.validation.minLength' | translate }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'users.fields.email' | translate }}</mat-label>
          <input matInput type="email" formControlName="email">
          @if (form.controls.email.hasError('required')) {
            <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
          } @else if (form.controls.email.hasError('email')) {
            <mat-error>{{ 'auth.validation.email' | translate }}</mat-error>
          }
        </mat-form-field>
        @if (!data.user) {
          <mat-form-field appearance="outline">
            <mat-label>{{ 'users.fields.password' | translate }}</mat-label>
            <input matInput type="password" formControlName="password">
            @if (form.controls.password.hasError('required')) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            } @else if (form.controls.password.hasError('policyMinLength')) {
              <mat-error>{{ 'settings.passwordPolicy.reqMinLength' | translate:{ n: form.controls.password.getError('policyMinLength')?.requiredLength } }}</mat-error>
            } @else if (form.controls.password.hasError('minlength')) {
              <mat-error>{{ 'auth.validation.minLength' | translate }}</mat-error>
            } @else if (form.controls.password.hasError('policyUppercase')) {
              <mat-error>{{ 'settings.passwordPolicy.reqUppercase' | translate }}</mat-error>
            } @else if (form.controls.password.hasError('policyLowercase')) {
              <mat-error>{{ 'settings.passwordPolicy.reqLowercase' | translate }}</mat-error>
            } @else if (form.controls.password.hasError('policyDigit')) {
              <mat-error>{{ 'settings.passwordPolicy.reqDigit' | translate }}</mat-error>
            } @else if (form.controls.password.hasError('policySpecial')) {
              <mat-error>{{ 'settings.passwordPolicy.reqSpecial' | translate }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'users.fields.role' | translate }}</mat-label>
            <mat-select formControlName="role">
              @for (role of roles; track role) {
                <mat-option [value]="role">{{ ('users.roles.' + role) | translate }}</mat-option>
              }
            </mat-select>
            @if (form.controls.role.hasError('required')) {
              <mat-error>{{ 'auth.validation.required' | translate }}</mat-error>
            }
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: min(100%, 360px);
      padding-top: 8px;
    }
  `]
})
export class UserFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly passwordPolicyService = inject(PasswordPolicyService);
  readonly roles = ['USER', 'SELLER', 'ADMIN'];

  form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['USER']
  });

  constructor(
    private dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user?: ManagedUser }
  ) {
    if (data.user) {
      this.form.patchValue({
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email
      });
      this.form.controls.password.clearValidators();
      this.form.controls.role.clearValidators();
      this.form.controls.password.updateValueAndValidity();
      this.form.controls.role.updateValueAndValidity();
    } else {
      this.form.controls.role.setValidators([Validators.required]);
      this.form.controls.role.updateValueAndValidity();
      this.passwordPolicyService.getPublicPolicy().subscribe({
        next: (policy) => {
          this.form.controls.password.setValidators(buildPasswordValidators(policy));
          this.form.controls.password.updateValueAndValidity();
        },
        error: () => {
          this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
          this.form.controls.password.updateValueAndValidity();
        }
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatSidenavModule,
    TranslateModule,
    PageHeroComponent,
    LocaleDatePipe,
    LocaleDigitsPipe,
    DatetimeFilterFieldComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'users.eyebrow' | translate"
        [title]="'users.title' | translate"
        [subtitle]="'users.subtitle' | translate">
        <div heroActions>
          <button mat-flat-button type="button" class="hero-cta" (click)="openCreate()">
            <mat-icon>person_add</mat-icon>
            {{ 'users.addNew' | translate }}
          </button>
        </div>
      </app-page-hero>

      <mat-sidenav-container class="users-shell">
        <mat-sidenav #filterNav
                     class="filters-sidenav"
                     mode="over"
                     position="end"
                     [autoFocus]="false"
                     [attr.aria-label]="'users.filters.title' | translate">
          <div class="filters-sidenav-inner">
            <header class="filters-sidenav-header">
              <div class="filters-heading">
                <mat-icon class="filters-heading-icon" aria-hidden="true">tune</mat-icon>
                <div class="filters-heading-copy">
                  <h2 id="users-filters-title" class="filters-title">{{ 'users.filters.title' | translate }}</h2>
                  @if (activeFilterCount > 0) {
                    <span class="filters-active-count">
                      {{ 'users.filters.activeCount' | translate:{ count: activeFilterCount } }}
                    </span>
                  }
                </div>
              </div>
              <button mat-icon-button type="button"
                      [attr.aria-label]="'common.close' | translate"
                      (click)="filterNav.close()">
                <mat-icon>close</mat-icon>
              </button>
            </header>

            <div class="filters-body">
              <div class="filter-section">
                <p class="filter-section-label">{{ 'users.filters.identity' | translate }}</p>
                <div class="filter-identity-stack">
                  <mat-form-field appearance="outline"
                                  class="filter-control"
                                  subscriptSizing="dynamic"
                                  floatLabel="always">
                    <mat-icon matPrefix>person</mat-icon>
                    <mat-label>{{ 'users.table.firstName' | translate }}</mat-label>
                    <input matInput
                           [value]="filterFirstName"
                           (input)="onFirstNameFilter($any($event.target).value)"
                           autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline"
                                  class="filter-control"
                                  subscriptSizing="dynamic"
                                  floatLabel="always">
                    <mat-icon matPrefix>badge</mat-icon>
                    <mat-label>{{ 'users.table.lastName' | translate }}</mat-label>
                    <input matInput
                           [value]="filterLastName"
                           (input)="onLastNameFilter($any($event.target).value)"
                           autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline"
                                  class="filter-control"
                                  subscriptSizing="dynamic"
                                  floatLabel="always">
                    <mat-icon matPrefix>mail</mat-icon>
                    <mat-label>{{ 'users.table.email' | translate }}</mat-label>
                    <input matInput
                           type="email"
                           [value]="filterEmail"
                           (input)="onEmailFilter($any($event.target).value)"
                           autocomplete="off">
                  </mat-form-field>
                </div>
              </div>

              <div class="filter-section">
                <p class="filter-section-label">{{ 'users.table.status' | translate }}</p>
                <div class="filter-tabs" role="group" [attr.aria-label]="'users.table.status' | translate">
                  @for (status of statusFilters; track status.value) {
                    <button type="button"
                            class="filter-tab"
                            [class.active]="activeStatus === status.value"
                            (click)="setStatusFilter(status.value)">
                      {{ ('users.filters.' + status.value) | translate }}
                    </button>
                  }
                </div>
              </div>

              <div class="filter-section">
                <p class="filter-section-label">{{ 'users.fields.role' | translate }}</p>
                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-select [value]="activeRole" (selectionChange)="setRoleFilter($event.value)">
                    <mat-option value="all">{{ 'users.filters.allRoles' | translate }}</mat-option>
                    @for (role of roles; track role) {
                      <mat-option [value]="role">{{ ('users.roles.' + role) | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="filter-section">
                <p class="filter-section-label">{{ 'users.table.createMethod' | translate }}</p>
                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-select [value]="filterCreateMethod" (selectionChange)="setCreateMethodFilter($event.value)">
                    <mat-option value="all">{{ 'users.filters.allMethods' | translate }}</mat-option>
                    <mat-option value="REGISTER">{{ 'users.createMethods.REGISTER' | translate }}</mat-option>
                    <mat-option value="ADMIN">{{ 'users.createMethods.ADMIN' | translate }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="filter-section">
                <p class="filter-section-label">{{ 'users.filters.createdRange' | translate }}</p>
                <div class="filter-date-stack">
                  <app-datetime-filter-field
                    [compact]="true"
                    labelKey="users.filters.createdFrom"
                    [isoValue]="filterCreatedFrom"
                    (isoValueChange)="setCreatedFrom($event)">
                  </app-datetime-filter-field>
                  <app-datetime-filter-field
                    [compact]="true"
                    labelKey="users.filters.createdTo"
                    [isoValue]="filterCreatedTo"
                    (isoValueChange)="setCreatedTo($event)">
                  </app-datetime-filter-field>
                </div>
              </div>
            </div>

            <footer class="filters-sidenav-footer">
              @if (activeFilterCount > 0) {
                <button mat-stroked-button type="button" class="filters-clear" (click)="clearAllFilters()">
                  <mat-icon>filter_alt_off</mat-icon>
                  {{ 'users.filters.clearAll' | translate }}
                </button>
              }
              <button mat-flat-button color="primary" type="button" class="filters-done" (click)="filterNav.close()">
                {{ 'users.filters.done' | translate }}
              </button>
            </footer>
          </div>
        </mat-sidenav>

        <mat-sidenav-content>
          <div class="page-body">
            <div class="results-toolbar">
              <button mat-stroked-button type="button" class="filters-open-btn" (click)="filterNav.open()">
                <mat-icon>filter_list</mat-icon>
                {{ 'users.filters.title' | translate }}
                @if (activeFilterCount > 0) {
                  <span class="filters-badge">{{ activeFilterCount | localeDigits }}</span>
                }
              </button>

              <div class="view-controls">
                @if (viewMode === 'tiles') {
                  <mat-form-field appearance="outline" class="sort-filter" subscriptSizing="dynamic">
                    <mat-label>{{ 'users.sort.label' | translate }}</mat-label>
                    <mat-select [value]="sortActive" (selectionChange)="setSortField($event.value)">
                      <mat-option value="firstName">{{ 'users.table.firstName' | translate }}</mat-option>
                      <mat-option value="lastName">{{ 'users.table.lastName' | translate }}</mat-option>
                      <mat-option value="email">{{ 'users.table.email' | translate }}</mat-option>
                      <mat-option value="phoneCountryCode">{{ 'users.table.mobile' | translate }}</mat-option>
                      <mat-option value="createdAt">{{ 'users.table.createdAt' | translate }}</mat-option>
                      <mat-option value="createMethod">{{ 'users.table.createMethod' | translate }}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <button mat-icon-button type="button" class="sort-dir-btn" (click)="toggleSortDirection()"
                          [attr.aria-label]="'users.sort.direction' | translate">
                    <mat-icon>{{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                  </button>
                }
                <mat-button-toggle-group
                  class="view-toggle"
                  [value]="viewMode"
                  (change)="setViewMode($event.value)"
                  [attr.aria-label]="'users.view.label' | translate">
                  <mat-button-toggle value="tiles" [matTooltip]="'users.view.tiles' | translate">
                    <mat-icon>grid_view</mat-icon>
                  </mat-button-toggle>
                  <mat-button-toggle value="table" [matTooltip]="'users.view.table' | translate">
                    <mat-icon>view_list</mat-icon>
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>
            </div>

        @if (viewMode === 'tiles') {
          <div class="users-tiles-panel">
            @if (!loading && users.length === 0) {
              <div class="panel-surface empty-state">{{ 'common.noData' | translate }}</div>
            } @else {
              <div class="users-tiles">
                @for (user of users; track user.id) {
                  <article class="user-tile">
                    <div class="user-tile-top">
                      <div class="user-avatar user-avatar-lg" [attr.aria-hidden]="true">
                        @if (avatarUrl(user); as src) {
                          <img [src]="src" [alt]="user.firstName + ' ' + user.lastName">
                        } @else {
                          <span class="user-avatar-initials">{{ initials(user) }}</span>
                        }
                      </div>
                      <button mat-icon-button
                              type="button"
                              [matMenuTriggerFor]="tileMenu"
                              [attr.aria-label]="'a11y.actions' | translate">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #tileMenu="matMenu">
                        <button mat-menu-item type="button" (click)="openEdit(user)">
                          <mat-icon>edit</mat-icon>
                          {{ 'common.edit' | translate }}
                        </button>
                        <button mat-menu-item type="button" (click)="toggleEnabled(user)">
                          <mat-icon>{{ user.enabled ? 'block' : 'check_circle' }}</mat-icon>
                          {{ (user.enabled ? 'users.actions.disable' : 'users.actions.enable') | translate }}
                        </button>
                        <button mat-menu-item type="button" [matMenuTriggerFor]="tileRoleMenu">
                          <mat-icon>badge</mat-icon>
                          {{ 'users.actions.changeRole' | translate }}
                        </button>
                        <mat-menu #tileRoleMenu="matMenu">
                          @for (role of roles; track role) {
                            <button mat-menu-item type="button" (click)="changeRole(user, role)" [disabled]="user.role === role">
                              {{ ('users.roles.' + role) | translate }}
                            </button>
                          }
                        </mat-menu>
                        <button mat-menu-item type="button" class="delete-item" (click)="deleteUser(user)">
                          <mat-icon>delete</mat-icon>
                          {{ 'common.delete' | translate }}
                        </button>
                      </mat-menu>
                    </div>
                    <h3 class="user-tile-name">
                      <mat-icon class="tile-field-icon" aria-hidden="true">person</mat-icon>
                      <span>{{ user.firstName }} {{ user.lastName }}</span>
                    </h3>
                    <p class="user-tile-email" dir="ltr">
                      <mat-icon class="tile-field-icon" aria-hidden="true">mail</mat-icon>
                      <span>{{ user.email }}</span>
                    </p>
                    <p class="user-tile-mobile" dir="ltr">
                      <mat-icon class="tile-field-icon" aria-hidden="true">phone</mat-icon>
                      <span>{{ formatMobile(user) }}</span>
                    </p>
                    <div class="user-tile-meta">
                      <span class="role-pill">
                        <mat-icon class="tile-field-icon" aria-hidden="true">badge</mat-icon>
                        {{ ('users.roles.' + user.role) | translate }}
                      </span>
                      <span class="status-pill" [class.active]="user.enabled" [class.expired]="!user.enabled">
                        <mat-icon class="tile-field-icon" aria-hidden="true">
                          {{ user.enabled ? 'check_circle' : 'block' }}
                        </mat-icon>
                        {{ (user.enabled ? 'users.status.active' : 'users.status.disabled') | translate }}
                      </span>
                    </div>
                  </article>
                }
              </div>
            }
            <div class="tiles-paginator panel-surface">
              <mat-paginator
                [length]="totalElements"
                [pageIndex]="pageIndex"
                [pageSize]="pageSize"
                [pageSizeOptions]="[5, 10, 25, 50]"
                [showFirstLastButtons]="true"
                [attr.aria-label]="'users.table.pagination' | translate"
                (page)="onPage($event)">
              </mat-paginator>
            </div>
          </div>
        } @else {
        <div class="panel-surface table-wrap">
          <div class="table-scroll">
            <table mat-table
                   matSort
                   [matSortActive]="sortActive"
                   [matSortDirection]="sortDirection"
                   matSortDisableClear
                   [dataSource]="users"
                   class="mat-mdc-table users-table"
                   [attr.aria-label]="'users.title' | translate"
                   (matSortChange)="onSortChange($event)">

              <ng-container matColumnDef="avatar">
                <th mat-header-cell *matHeaderCellDef class="col-avatar">{{ 'users.table.avatar' | translate }}</th>
                <td mat-cell *matCellDef="let user" class="col-avatar">
                  <div class="user-avatar" [attr.aria-hidden]="true">
                    @if (avatarUrl(user); as src) {
                      <img [src]="src" [alt]="user.firstName + ' ' + user.lastName">
                    } @else {
                      <span class="user-avatar-initials">{{ initials(user) }}</span>
                    }
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="firstName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="firstName">
                  {{ 'users.table.firstName' | translate }}
                </th>
                <td mat-cell *matCellDef="let user">
                  <span class="cell-strong">{{ user.firstName }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="lastName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="lastName">
                  {{ 'users.table.lastName' | translate }}
                </th>
                <td mat-cell *matCellDef="let user">
                  <span class="cell-strong">{{ user.lastName }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="email">
                  {{ 'users.table.email' | translate }}
                </th>
                <td mat-cell *matCellDef="let user">
                  <span class="cell-email" dir="ltr">{{ user.email }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="mobile">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="phoneCountryCode">
                  {{ 'users.table.mobile' | translate }}
                </th>
                <td mat-cell *matCellDef="let user">
                  <span class="mobile-number" dir="ltr">{{ formatMobile(user) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>{{ 'users.table.role' | translate }}</th>
                <td mat-cell *matCellDef="let user">
                  <span class="role-pill">{{ ('users.roles.' + user.role) | translate }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'users.table.status' | translate }}</th>
                <td mat-cell *matCellDef="let user">
                  <span class="status-pill" [class.active]="user.enabled" [class.expired]="!user.enabled">
                    {{ (user.enabled ? 'users.status.active' : 'users.status.disabled') | translate }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="createMethod">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="createMethod">
                  {{ 'users.table.createMethod' | translate }}
                </th>
                <td mat-cell *matCellDef="let user">
                  <span class="method-pill">{{ createMethodLabel(user) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="creatorUsername">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="creatorUsername">
                  {{ 'users.table.creator' | translate }}
                </th>
                <td mat-cell *matCellDef="let user">
                  <span class="cell-muted" dir="ltr">{{ user.creatorUsername || '—' }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="createdAt">
                  {{ 'users.table.createdAt' | translate }}
                </th>
                <td mat-cell *matCellDef="let user">
                  <span class="cell-datetime" dir="ltr">
                    {{ user.createdAt
                      ? (user.createdAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="updatedAt">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="updatedAt">
                  {{ 'users.table.updatedAt' | translate }}
                </th>
                <td mat-cell *matCellDef="let user">
                  <span class="cell-datetime" dir="ltr">
                    {{ user.updatedAt
                      ? (user.updatedAt | localeDate:{ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="col-actions"></th>
                <td mat-cell *matCellDef="let user" class="col-actions">
                  <button mat-icon-button
                          type="button"
                          [matMenuTriggerFor]="actionMenu"
                          [attr.aria-label]="'a11y.domainActions' | translate:{ domain: user.email }"
                          [matTooltip]="'a11y.actions' | translate">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #actionMenu="matMenu">
                    <button mat-menu-item type="button" (click)="openEdit(user)">
                      <mat-icon>edit</mat-icon>
                      {{ 'common.edit' | translate }}
                    </button>
                    <button mat-menu-item type="button" (click)="toggleEnabled(user)">
                      <mat-icon>{{ user.enabled ? 'block' : 'check_circle' }}</mat-icon>
                      {{ (user.enabled ? 'users.actions.disable' : 'users.actions.enable') | translate }}
                    </button>
                    <button mat-menu-item type="button" [matMenuTriggerFor]="roleMenu">
                      <mat-icon>badge</mat-icon>
                      {{ 'users.actions.changeRole' | translate }}
                    </button>
                    <mat-menu #roleMenu="matMenu">
                      @for (role of roles; track role) {
                        <button mat-menu-item type="button" (click)="changeRole(user, role)" [disabled]="user.role === role">
                          {{ ('users.roles.' + role) | translate }}
                        </button>
                      }
                    </mat-menu>
                    <button mat-menu-item type="button" class="delete-item" (click)="deleteUser(user)">
                      <mat-icon>delete</mat-icon>
                      {{ 'common.delete' | translate }}
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              <tr class="mat-row empty-row" *matNoDataRow>
                <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                  <div class="empty-state">
                    {{ loading ? ('common.loading' | translate) : ('common.noData' | translate) }}
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <mat-paginator
            [length]="totalElements"
            [pageIndex]="pageIndex"
            [pageSize]="pageSize"
            [pageSizeOptions]="[5, 10, 25, 50]"
            [showFirstLastButtons]="true"
            [attr.aria-label]="'users.table.pagination' | translate"
            (page)="onPage($event)">
          </mat-paginator>
        </div>
        }
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .users-shell {
      min-height: calc(100vh - 220px);
      background: transparent;
    }

    .users-shell ::ng-deep .mat-drawer-backdrop.mat-drawer-shown {
      background: color-mix(in srgb, #14110d 35%, transparent);
    }

    .filters-sidenav {
      width: min(100vw - 24px, 380px);
      background: var(--bg-primary);
      border-inline-start: 1px solid var(--border-color);
      box-shadow: var(--shadow-lg, 0 12px 40px rgba(20, 17, 13, 0.18));
    }

    .filters-sidenav-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100%;
    }

    .filters-sidenav-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding: 18px 16px 14px;
      border-bottom: 1px solid var(--border-light);
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--bg-primary);
    }

    .filters-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .filters-heading-icon {
      color: var(--accent-dark);
      width: 22px;
      height: 22px;
      font-size: 22px;
      flex-shrink: 0;
    }

    .filters-heading-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .filters-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .filters-active-count {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .filters-body {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 16px;
      flex: 1 1 auto;
      overflow: auto;
    }

    .filter-section-label {
      margin: 0 0 8px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .filter-identity-stack,
    .filter-date-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .filter-date-stack ::ng-deep .datetime-filter {
      width: 100%;
    }

    .filter-date-stack ::ng-deep .date-field {
      max-width: none;
      flex: 1 1 auto;
    }

    .filter-control {
      width: 100%;
    }

    /* Keep docked/floated labels clear of prefix icons inside the narrow drawer. */
    .filter-control.mat-mdc-form-field-has-icon-prefix ::ng-deep .mat-mdc-text-field-wrapper {
      --mat-mdc-form-field-label-offset-x: -16px;
    }

    .filter-control ::ng-deep .mat-mdc-form-field-icon-prefix {
      padding-inline: 10px 4px;
    }

    .filter-control ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filters-sidenav-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 12px 16px 16px;
      border-top: 1px solid var(--border-light);
      background: var(--bg-primary);
      position: sticky;
      bottom: 0;
    }

    .filters-clear {
      color: var(--text-secondary) !important;
    }

    .filters-clear mat-icon,
    .filters-open-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-inline-end: 6px;
    }

    .filters-done {
      min-width: 96px;
    }

    .results-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .filters-open-btn {
      border-color: var(--border-color) !important;
    }

    .filters-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.4rem;
      height: 1.4rem;
      margin-inline-start: 6px;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--accent);
      color: #14110d;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1;
    }

    .sort-filter {
      width: min(100%, 160px);
    }

    .sort-filter ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .view-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-inline-start: auto;
    }

    .view-toggle {
      border: 1px solid var(--border-color);
      border-radius: 10px;
      overflow: hidden;
    }

    .view-toggle ::ng-deep .mat-button-toggle {
      background: var(--bg-primary);
      color: var(--text-secondary);
    }

    .view-toggle ::ng-deep .mat-button-toggle-checked {
      background: var(--accent-light);
      color: var(--accent-dark);
    }

    .view-toggle ::ng-deep .mat-button-toggle .mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .sort-dir-btn {
      width: 42px;
      height: 42px;
      padding: 0;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .sort-dir-btn mat-icon {
      margin: 0;
      font-size: 20px;
      width: 20px;
      height: 20px;
      line-height: 20px;
    }

    @media (max-width: 720px) {
      .view-controls {
        margin-inline-start: 0;
        width: 100%;
      }

      .filters-sidenav {
        width: min(100vw, 100%);
      }
    }

    .users-tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .user-tile {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 18px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
    }

    .user-tile:hover {
      border-color: color-mix(in srgb, var(--primary) 45%, var(--border-color));
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .user-tile-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      display: grid;
      place-items: center;
      background: var(--accent-light);
      border: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .user-avatar-lg {
      width: 56px;
      height: 56px;
    }

    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .user-avatar-initials {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--accent-dark);
      letter-spacing: 0.02em;
    }

    .user-avatar-lg .user-avatar-initials {
      font-size: 1rem;
    }

    .user-tile-name {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.25;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-tile-email,
    .user-tile-mobile {
      margin: 0;
      font-size: 0.84rem;
      color: var(--text-secondary);
      word-break: break-word;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .user-tile-mobile {
      font-weight: 600;
      color: var(--text-muted);
    }

    .tile-field-icon {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      font-size: 18px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .user-tile-name .tile-field-icon {
      color: var(--accent-dark);
      margin-top: 0;
    }

    .user-tile-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
      align-items: center;
    }

    .role-pill,
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .role-pill .tile-field-icon,
    .status-pill .tile-field-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
      margin-top: 0;
    }

    .role-pill .tile-field-icon {
      color: var(--accent-dark);
    }

    .status-pill.active .tile-field-icon {
      color: var(--success);
    }

    .status-pill.expired .tile-field-icon {
      color: var(--danger);
    }

    .tiles-paginator {
      padding: 0;
      overflow: hidden;
    }

    .col-avatar {
      width: 64px;
      padding-inline: 12px 8px !important;
    }

    .col-actions {
      width: 56px;
      text-align: end;
    }

    .cell-strong {
      font-weight: 650;
    }

    .cell-email {
      color: var(--text-secondary);
      font-size: 0.88rem;
    }

    .cell-muted {
      color: var(--text-muted);
      font-size: 0.86rem;
    }

    .cell-datetime {
      color: var(--text-secondary);
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .method-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .mobile-number {
      display: inline-flex;
      align-items: center;
      min-height: 1.6rem;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .role-pill {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--accent-dark);
    }

    .delete-item {
      color: var(--danger) !important;
    }

    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-row .mat-cell {
      border-bottom: none;
    }
  `]
})
export class UsersComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly usersService = inject(UsersService);
  private readonly apiError = inject(ApiErrorService);
  private readonly translate = inject(TranslateService);
  private readonly translationService = inject(TranslationService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly textFilter$ = new Subject<{ key: 'firstName' | 'lastName' | 'email'; value: string }>();

  displayedColumns = [
    'avatar',
    'firstName',
    'lastName',
    'email',
    'mobile',
    'role',
    'status',
    'createMethod',
    'creatorUsername',
    'createdAt',
    'updatedAt',
    'actions'
  ];
  roles = ['USER', 'SELLER', 'ADMIN'];
  statusFilters = [
    { value: 'all' },
    { value: 'active' },
    { value: 'disabled' }
  ];

  users: ManagedUser[] = [];
  totalElements = 0;
  pageIndex = 0;
  pageSize = 10;
  sortActive = 'firstName';
  sortDirection: 'asc' | 'desc' = 'asc';
  viewMode: 'tiles' | 'table' = 'tiles';
  filterFirstName = '';
  filterLastName = '';
  filterEmail = '';
  filterCreateMethod = 'all';
  filterCreatedFrom: string | null = null;
  filterCreatedTo: string | null = null;
  activeStatus = 'all';
  activeRole = 'all';
  loading = false;

  get activeFilterCount(): number {
    let count = 0;
    if (this.filterFirstName.trim()) count++;
    if (this.filterLastName.trim()) count++;
    if (this.filterEmail.trim()) count++;
    if (this.activeStatus !== 'all') count++;
    if (this.activeRole !== 'all') count++;
    if (this.filterCreateMethod !== 'all') count++;
    if (this.filterCreatedFrom) count++;
    if (this.filterCreatedTo) count++;
    return count;
  }

  ngOnInit(): void {
    this.textFilter$.pipe(debounceTime(300), distinctUntilChanged(
      (a, b) => a.key === b.key && a.value === b.value
    )).subscribe(() => {
      this.pageIndex = 0;
      this.loadUsers();
    });
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    const enabled =
      this.activeStatus === 'active' ? true
        : this.activeStatus === 'disabled' ? false
          : undefined;
    const role = this.activeRole === 'all' ? undefined : this.activeRole;
    const createMethod = this.filterCreateMethod === 'all' ? undefined : this.filterCreateMethod;

    this.usersService.list({
      firstName: this.filterFirstName.trim() || undefined,
      lastName: this.filterLastName.trim() || undefined,
      email: this.filterEmail.trim() || undefined,
      role,
      enabled,
      createMethod,
      createdFrom: this.filterCreatedFrom || undefined,
      createdTo: this.filterCreatedTo || undefined,
      page: this.pageIndex,
      size: this.pageSize,
      sort: `${this.sortActive},${this.sortDirection}`
    }).subscribe({
      next: (page) => {
        this.users = page.content;
        this.totalElements = page.totalElements;
        this.pageIndex = page.number;
        this.pageSize = page.size;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(error);
      }
    });
  }

  avatarUrl(user: ManagedUser): string | null {
    return this.usersService.resolveAvatarUrl(user.avatarUrl);
  }

  initials(user: ManagedUser): string {
    const first = user.firstName?.charAt(0) ?? '';
    const last = user.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
  }

  formatMobile(user: ManagedUser): string {
    const iso = user.phoneCountryCode;
    const digits = user.phoneNumber;
    if (!iso && !digits) {
      return '—';
    }
    const country = findPhoneCountry(iso, this.translationService.currentLang());
    if (country && digits) {
      return `+${country.dialCode} ${formatPhoneDigits(digits, country.iso)}`;
    }
    if (iso && digits) {
      return `${iso} ${digits}`;
    }
    return iso || digits || '—';
  }

  createMethodLabel(user: ManagedUser): string {
    const method = user.createMethod;
    if (!method) {
      return '—';
    }
    const key = `users.createMethods.${method}`;
    const translated = this.translate.instant(key);
    return translated === key ? method : translated;
  }

  onFirstNameFilter(value: string): void {
    this.filterFirstName = value;
    this.textFilter$.next({ key: 'firstName', value });
  }

  onLastNameFilter(value: string): void {
    this.filterLastName = value;
    this.textFilter$.next({ key: 'lastName', value });
  }

  onEmailFilter(value: string): void {
    this.filterEmail = value;
    this.textFilter$.next({ key: 'email', value });
  }

  setStatusFilter(value: string): void {
    this.activeStatus = value;
    this.pageIndex = 0;
    this.loadUsers();
  }

  setRoleFilter(value: string): void {
    this.activeRole = value;
    this.pageIndex = 0;
    this.loadUsers();
  }

  setCreateMethodFilter(value: string): void {
    this.filterCreateMethod = value;
    this.pageIndex = 0;
    this.loadUsers();
  }

  setCreatedFrom(iso: string | null): void {
    this.filterCreatedFrom = iso;
    this.pageIndex = 0;
    this.loadUsers();
  }

  setCreatedTo(iso: string | null): void {
    this.filterCreatedTo = iso;
    this.pageIndex = 0;
    this.loadUsers();
  }

  clearAllFilters(): void {
    this.filterFirstName = '';
    this.filterLastName = '';
    this.filterEmail = '';
    this.activeStatus = 'all';
    this.activeRole = 'all';
    this.filterCreateMethod = 'all';
    this.filterCreatedFrom = null;
    this.filterCreatedTo = null;
    this.pageIndex = 0;
    this.loadUsers();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  onSortChange(sort: Sort): void {
    this.sortActive = sort.active || 'firstName';
    this.sortDirection = sort.direction === 'desc' ? 'desc' : 'asc';
    this.pageIndex = 0;
    this.loadUsers();
  }

  setViewMode(mode: 'tiles' | 'table'): void {
    if (mode !== 'tiles' && mode !== 'table') {
      return;
    }
    this.viewMode = mode;
  }

  setSortField(field: string): void {
    this.sortActive = field || 'firstName';
    this.pageIndex = 0;
    this.loadUsers();
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.pageIndex = 0;
    this.loadUsers();
  }

  openCreate(): void {
    const ref = this.dialog.open(UserFormDialogComponent, {
      width: '420px',
      data: {}
    });
    ref.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      this.usersService.create({
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        password: result.password,
        role: result.role
      }).subscribe({
        next: () => {
          this.snack(this.translate.instant('users.messages.created'));
          this.loadUsers();
        },
        error: (error) => this.showError(error)
      });
    });
  }

  openEdit(user: ManagedUser): void {
    const ref = this.dialog.open(UserFormDialogComponent, {
      width: '420px',
      data: { user }
    });
    ref.afterClosed().subscribe(result => {
      if (!result) {
        return;
      }
      this.usersService.update(user.id, {
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email
      }).subscribe({
        next: () => {
          this.snack(this.translate.instant('users.messages.updated'));
          this.loadUsers();
        },
        error: (error) => this.showError(error)
      });
    });
  }

  toggleEnabled(user: ManagedUser): void {
    const next = !user.enabled;
    const confirmKey = next ? 'users.confirm.enable' : 'users.confirm.disable';
    if (!confirm(this.translate.instant(confirmKey, { name: `${user.firstName} ${user.lastName}` }))) {
      return;
    }
    this.usersService.setEnabled(user.id, next).subscribe({
      next: () => {
        this.snack(this.translate.instant(next ? 'users.messages.enabled' : 'users.messages.disabled'));
        this.loadUsers();
      },
      error: (error) => this.showError(error)
    });
  }

  changeRole(user: ManagedUser, role: string): void {
    this.usersService.setRole(user.id, role).subscribe({
      next: () => {
        this.snack(this.translate.instant('users.messages.roleUpdated'));
        this.loadUsers();
      },
      error: (error) => this.showError(error)
    });
  }

  deleteUser(user: ManagedUser): void {
    if (!confirm(this.translate.instant('users.confirm.delete', { name: `${user.firstName} ${user.lastName}` }))) {
      return;
    }
    this.usersService.delete(user.id).subscribe({
      next: () => {
        this.snack(this.translate.instant('users.messages.deleted'));
        this.loadUsers();
      },
      error: (error) => this.showError(error)
    });
  }

  private snack(message: string): void {
    this.snackBar.open(message, this.translate.instant('common.close'), { duration: 3000 });
  }

  private showError(error: unknown): void {
    this.snackBar.open(this.apiError.resolve(error), this.translate.instant('common.close'), {
      duration: 4000,
      panelClass: ['error-snackbar']
    });
  }
}
