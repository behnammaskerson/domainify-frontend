import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged, fromEvent } from 'rxjs';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { DatetimeFilterFieldComponent } from '../../components/datetime-filter-field/datetime-filter-field.component';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import {
  TicketManageSavedViewsDialogComponent,
  TicketManageSavedViewsDialogResult
} from '../../components/ticket-manage-saved-views-dialog/ticket-manage-saved-views-dialog.component';
import {
  TicketSavedViewDialogComponent,
  TicketSavedViewDialogResult
} from '../../components/ticket-saved-view-dialog/ticket-saved-view-dialog.component';
import { TicketShortcutsHelpDialogComponent } from '../../components/ticket-shortcuts-help-dialog/ticket-shortcuts-help-dialog.component';
import { LocaleDatePipe, LocaleDigitsPipe } from '../../pipes/locale-format.pipe';
import { ApiErrorService } from '../../services/api-error.service';
import { AuthService } from '../../services/auth.service';
import {
  BulkTicketActionPayload,
  Ticket,
  TicketAssigneeOption,
  TicketCategory,
  TicketInboxSavedView,
  TicketInboxSavedViewFilter,
  TicketInboxView,
  TicketPriority,
  TicketQueue,
  TicketService,
  TicketStatus,
  TicketTag
} from '../../services/ticket.service';
import { UsersService } from '../../services/users.service';
import { SMS_DATETIME_FORMAT } from '../../utils/jalali-date';
import {
  hasOpenMaterialOverlay,
  isEditableKeyboardTarget,
  isPlainLetterKey
} from '../../utils/ticket-keyboard.util';

const UNASSIGNED_VALUE = '__unassigned__';

@Component({
  selector: 'app-admin-tickets-inbox',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatMenuModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
    PageHeroComponent,
    LocaleDatePipe,
    LocaleDigitsPipe,
    DatetimeFilterFieldComponent
  ],
  template: `
    <div class="page">
      <app-page-hero
        [eyebrow]="'tickets.adminInbox.eyebrow' | translate"
        [title]="'tickets.adminInbox.title' | translate"
        [subtitle]="'tickets.adminInbox.subtitle' | translate">
        <div heroActions>
          <button mat-stroked-button
                  type="button"
                  class="presence-btn"
                  [class.away]="!ticketAvailable"
                  [disabled]="ticketAvailabilitySaving"
                  (click)="toggleTicketAvailability()"
                  [matTooltip]="'tickets.adminInbox.presenceHint' | translate">
            <mat-icon>{{ ticketAvailable ? 'check_circle' : 'do_not_disturb_on' }}</mat-icon>
            {{ (ticketAvailable ? 'tickets.adminInbox.presenceAvailable' : 'tickets.adminInbox.presenceAway') | translate }}
          </button>
          <button mat-stroked-button type="button" (click)="reload()" [disabled]="loading">
            <mat-icon>refresh</mat-icon>
            {{ 'tickets.adminInbox.refresh' | translate }}
          </button>
          <button mat-icon-button
                  type="button"
                  (click)="openShortcutsHelp()"
                  [matTooltip]="'tickets.shortcuts.helpTitle' | translate"
                  [attr.aria-keyshortcuts]="'?'"
                  [attr.aria-label]="'tickets.shortcuts.helpTitle' | translate">
            <mat-icon>keyboard</mat-icon>
          </button>
        </div>
      </app-page-hero>

      <mat-sidenav-container class="inbox-shell">
        <mat-sidenav #filterNav
                     class="filters-sidenav"
                     mode="over"
                     position="end"
                     [autoFocus]="false"
                     [attr.aria-label]="'tickets.adminInbox.filters.title' | translate">
          <div class="filters-sidenav-inner">
            <header class="filters-sidenav-header">
              <div class="filters-heading">
                <mat-icon class="filters-heading-icon" aria-hidden="true">tune</mat-icon>
                <div class="filters-heading-copy">
                  <h2 class="filters-title">{{ 'tickets.adminInbox.filters.title' | translate }}</h2>
                  @if (activeFilterCount > 0) {
                    <span class="filters-active-count">
                      {{ 'tickets.adminInbox.filters.activeCount' | translate:{ count: (activeFilterCount | localeDigits) } }}
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
                <p class="filter-section-label">{{ 'tickets.adminInbox.filters.ticket' | translate }}</p>
                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.status' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterStatus" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (status of statuses; track status) {
                      <mat-option [value]="status">{{ ('tickets.statuses.' + status) | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.priority' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterPriority" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (priority of priorities; track priority) {
                      <mat-option [value]="priority">{{ ('tickets.priorities.' + priority) | translate }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.category' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterCategoryId" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (category of categories; track category.id) {
                      <mat-option [value]="category.id">{{ category.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.queue' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterQueueId" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (queue of queues; track queue.id) {
                      <mat-option [value]="queue.id">{{ queue.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.tag' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterTagId" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    @for (tag of tags; track tag.id) {
                      <mat-option [value]="tag.id">{{ tag.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="filter-section">
                <p class="filter-section-label">{{ 'tickets.adminInbox.filters.people' | translate }}</p>
                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.assignee' | translate }}</mat-label>
                  <mat-select [(ngModel)]="filterAssigneeValue" (selectionChange)="onFiltersChanged()">
                    <mat-option [value]="''">{{ 'tickets.adminInbox.filters.any' | translate }}</mat-option>
                    <mat-option [value]="unassignedValue">{{ 'tickets.adminInbox.unassigned' | translate }}</mat-option>
                    @for (assignee of assignees; track assignee.id) {
                      <mat-option [value]="assignee.id">
                        {{ assignee.name || assignee.email }}
                        @if (assignee.available === false) {
                          — {{ 'tickets.agentUnavailable' | translate }}
                        }
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="filter-control" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.filters.customer' | translate }}</mat-label>
                  <input matInput
                         [(ngModel)]="filterCustomerInput"
                         (ngModelChange)="onCustomerInput($event)"
                         [placeholder]="'tickets.adminInbox.filters.customerPlaceholder' | translate">
                  <mat-icon matPrefix>person_search</mat-icon>
                </mat-form-field>
              </div>

              <div class="filter-section">
                <p class="filter-section-label">{{ 'tickets.adminInbox.filters.dates' | translate }}</p>
                <app-datetime-filter-field
                  [compact]="true"
                  [showClear]="true"
                  labelKey="tickets.adminInbox.filters.createdFrom"
                  [isoValue]="filterCreatedFrom"
                  (isoValueChange)="setCreatedFrom($event)">
                </app-datetime-filter-field>
                <app-datetime-filter-field
                  [compact]="true"
                  [showClear]="true"
                  labelKey="tickets.adminInbox.filters.createdTo"
                  [isoValue]="filterCreatedTo"
                  (isoValueChange)="setCreatedTo($event)">
                </app-datetime-filter-field>
              </div>
            </div>

            <footer class="filters-sidenav-footer">
              <button mat-stroked-button type="button" class="filters-save-view" (click)="saveCurrentView()">
                <mat-icon>bookmark_add</mat-icon>
                {{ 'tickets.adminInbox.savedViews.saveCurrent' | translate }}
              </button>
              @if (activeFilterCount > 0) {
                <button mat-stroked-button type="button" class="filters-clear" (click)="clearAllFilters()">
                  <mat-icon>filter_alt_off</mat-icon>
                  {{ 'tickets.adminInbox.filters.clearAll' | translate }}
                </button>
              }
              <button mat-flat-button color="primary" type="button" class="filters-done" (click)="filterNav.close()">
                {{ 'tickets.adminInbox.filters.done' | translate }}
              </button>
            </footer>
          </div>
        </mat-sidenav>

        <mat-sidenav-content>
          <div class="page-body">
            <div class="filter-bar panel-surface">
              <div class="filter-tabs" role="tablist" [attr.aria-label]="'tickets.adminInbox.viewsLabel' | translate">
                @for (tab of inboxTabs; track tab.id) {
                  <button type="button"
                          class="filter-tab"
                          role="tab"
                          [class.active]="inboxView === tab.id && activeSavedViewId == null"
                          [attr.aria-selected]="inboxView === tab.id && activeSavedViewId == null"
                          (click)="setView(tab.id)">
                    {{ tab.labelKey | translate }}
                  </button>
                }
              </div>

              <div class="toolbar-end">
                <button mat-stroked-button
                        type="button"
                        class="saved-views-btn"
                        [class.active]="activeSavedViewId != null"
                        [matMenuTriggerFor]="savedViewsMenu"
                        [matTooltip]="'tickets.adminInbox.savedViews.menuHint' | translate">
                  <mat-icon>bookmark</mat-icon>
                  @if (activeSavedView; as view) {
                    <span class="saved-view-label">{{ view.name }}</span>
                  } @else {
                    {{ 'tickets.adminInbox.savedViews.menu' | translate }}
                  }
                  <mat-icon class="chevron">expand_more</mat-icon>
                </button>
                <mat-menu #savedViewsMenu="matMenu" panelClass="saved-views-menu">
                  <button mat-menu-item type="button" (click)="saveCurrentView()">
                    <mat-icon>bookmark_add</mat-icon>
                    {{ 'tickets.adminInbox.savedViews.saveCurrent' | translate }}
                  </button>
                  <button mat-menu-item type="button" (click)="openManageSavedViews()">
                    <mat-icon>settings</mat-icon>
                    {{ 'tickets.adminInbox.savedViews.manage' | translate }}
                  </button>
                  @if (savedViews.length) {
                    <div class="saved-views-divider" role="separator" aria-hidden="true"></div>
                    @for (view of savedViews; track view.id) {
                      <button mat-menu-item
                              type="button"
                              class="saved-views-item"
                              [class.active-saved]="activeSavedViewId === view.id"
                              (click)="applySavedView(view)">
                        <mat-icon>{{ view.isDefault ? 'star' : 'bookmark' }}</mat-icon>
                        <span class="saved-menu-name">{{ view.name }}</span>
                        @if (view.isDefault) {
                          <span class="saved-menu-default">{{ 'tickets.adminInbox.savedViews.default' | translate }}</span>
                        }
                      </button>
                    }
                  }
                </mat-menu>

                <button mat-stroked-button type="button" class="filters-open-btn" (click)="openFilters()">
                  <mat-icon>filter_list</mat-icon>
                  {{ 'tickets.adminInbox.filters.title' | translate }}
                  @if (activeFilterCount > 0) {
                    <span class="filters-badge">{{ activeFilterCount | localeDigits }}</span>
                  }
                </button>

                <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
                  <mat-label>{{ 'tickets.adminInbox.search' | translate }}</mat-label>
                  <input matInput
                         #searchInputEl
                         [(ngModel)]="searchInput"
                         (ngModelChange)="onSearchInput($event)"
                         [placeholder]="'tickets.adminInbox.searchPlaceholder' | translate">
                  <mat-icon matPrefix>search</mat-icon>
                  @if (searchInput) {
                    <button matSuffix mat-icon-button type="button" (click)="clearSearch()"
                            [attr.aria-label]="'tickets.adminInbox.clearSearch' | translate">
                      <mat-icon>close</mat-icon>
                    </button>
                  }
                </mat-form-field>
              </div>
            </div>

            @if (selectedCount > 0) {
              <div class="bulk-bar panel-surface" role="region" [attr.aria-label]="'tickets.adminInbox.bulk.title' | translate">
                <div class="bulk-summary">
                  <strong>{{ 'tickets.adminInbox.bulk.selected' | translate:{ count: (selectedCount | localeDigits) } }}</strong>
                  <button mat-button type="button" (click)="clearSelection()" [disabled]="bulkBusy">
                    {{ 'tickets.adminInbox.bulk.clear' | translate }}
                  </button>
                </div>
                <div class="bulk-actions">
                  <mat-form-field appearance="outline" class="bulk-field" subscriptSizing="dynamic">
                    <mat-label>{{ 'tickets.adminInbox.bulk.assign' | translate }}</mat-label>
                    <mat-select [(ngModel)]="bulkAssigneeValue" [disabled]="bulkBusy">
                      <mat-option [value]="unassignedValue">{{ 'tickets.adminInbox.unassigned' | translate }}</mat-option>
                      @for (agent of assignees; track agent.id) {
                        <mat-option [value]="agent.id">
                          {{ agent.name || agent.email }}
                          @if (agent.available === false) {
                            ({{ 'tickets.agentUnavailable' | translate }})
                          }
                        </mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-stroked-button type="button"
                          [disabled]="bulkBusy || bulkAssigneeValue === ''"
                          (click)="runBulkAssign()">
                    {{ 'tickets.adminInbox.bulk.applyAssign' | translate }}
                  </button>

                  <mat-form-field appearance="outline" class="bulk-field" subscriptSizing="dynamic">
                    <mat-label>{{ 'tickets.adminInbox.bulk.status' | translate }}</mat-label>
                    <mat-select [(ngModel)]="bulkStatus" [disabled]="bulkBusy">
                      @for (status of statuses; track status) {
                        <mat-option [value]="status">{{ ('tickets.statuses.' + status) | translate }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-stroked-button type="button"
                          [disabled]="bulkBusy || !bulkStatus"
                          (click)="runBulkStatus()">
                    {{ 'tickets.adminInbox.bulk.applyStatus' | translate }}
                  </button>

                  <mat-form-field appearance="outline" class="bulk-field" subscriptSizing="dynamic">
                    <mat-label>{{ 'tickets.adminInbox.bulk.tag' | translate }}</mat-label>
                    <mat-select [(ngModel)]="bulkTagId" [disabled]="bulkBusy">
                      @for (tag of tags; track tag.id) {
                        <mat-option [value]="tag.id">{{ tag.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-stroked-button type="button"
                          [disabled]="bulkBusy || bulkTagId === null"
                          (click)="runBulkAddTag()">
                    {{ 'tickets.adminInbox.bulk.applyTag' | translate }}
                  </button>

                  <button mat-flat-button color="warn" type="button"
                          [disabled]="bulkBusy"
                          (click)="runBulkClose()">
                    {{ 'tickets.adminInbox.bulk.close' | translate }}
                  </button>
                </div>
              </div>
            }

            <div class="panel-surface table-wrap">
              @if (loading && tickets.length === 0) {
                <p class="muted state-msg">{{ 'tickets.adminInbox.loading' | translate }}</p>
              } @else if (!loading && tickets.length === 0) {
                <div class="empty-state">
                  <mat-icon>inbox</mat-icon>
                  <p>{{ 'tickets.adminInbox.empty' | translate }}</p>
                </div>
              } @else {
                <div class="table-scroll">
                  <table mat-table [dataSource]="tickets" class="mat-mdc-table tickets-table"
                         [attr.aria-label]="'tickets.adminInbox.title' | translate">

                    <ng-container matColumnDef="select">
                      <th mat-header-cell *matHeaderCellDef class="col-select">
                        <mat-checkbox
                          [checked]="allPageSelected"
                          [indeterminate]="somePageSelected"
                          [disabled]="loading || bulkBusy || tickets.length === 0"
                          (change)="toggleSelectAllPage($event.checked)"
                          [attr.aria-label]="'tickets.adminInbox.bulk.selectAllPage' | translate">
                        </mat-checkbox>
                      </th>
                      <td mat-cell *matCellDef="let ticket" class="col-select">
                        <mat-checkbox
                          [checked]="isSelected(ticket.id)"
                          [disabled]="bulkBusy || !ticket.id"
                          (click)="$event.stopPropagation()"
                          (change)="toggleSelect(ticket.id, $event.checked)"
                          [attr.aria-label]="'tickets.adminInbox.bulk.selectRow' | translate">
                        </mat-checkbox>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="rowNumber">
                      <th mat-header-cell *matHeaderCellDef class="col-row-num">{{ 'common.rowNumber' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket; let i = index" class="col-row-num">
                        {{ pageIndex * pageSize + i + 1 }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="publicNumber">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.id' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <a class="ticket-link" [routerLink]="['/admin/tickets', ticket.id]">
                          <code class="ticket-id" dir="ltr">{{ ticket.publicNumber || '—' }}</code>
                        </a>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="subject">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.subject' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <a class="ticket-link subject" [routerLink]="['/admin/tickets', ticket.id]" [matTooltip]="ticket.subject || ''">
                          {{ ticket.subject || '—' }}
                        </a>
                        @if (ticket.tags?.length) {
                          <div class="tag-row">
                            @for (tag of ticket.tags; track tag.id) {
                              <span class="tag-chip">{{ tag.name }}</span>
                            }
                          </div>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="requester">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.requester' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <span class="requester">{{ ticket.requesterName || ticket.requesterEmail || '—' }}</span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="queue">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.queue' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        {{ ticket.queue?.name || '—' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="assignee">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.assignee' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        @if (ticket.assigneeName || ticket.assigneeEmail) {
                          <span>{{ ticket.assigneeName || ticket.assigneeEmail }}</span>
                        } @else {
                          <span class="unassigned">{{ 'tickets.adminInbox.unassigned' | translate }}</span>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="priority">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.priority' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <span class="priority-pill" [attr.data-priority]="ticket.priority">
                          {{ ('tickets.priorities.' + ticket.priority) | translate }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.status' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <span class="status-pill" [attr.data-status]="ticket.status">
                          {{ ('tickets.statuses.' + ticket.status) | translate }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="dueAt">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.dueAt' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <div class="due-cell">
                          @if (ticket.dueAt) {
                            <span class="due-at"
                                  [class.overdue]="ticket.resolveOverdue"
                                  [class.approaching]="ticket.approachingSla && !ticket.resolveOverdue && !ticket.slaPaused"
                                  dir="ltr">
                              {{ ticket.dueAt | localeDate:dateTimeFormat }}
                            </span>
                          } @else {
                            <span>—</span>
                          }
                          @if (ticket.slaPaused) {
                            <span class="sla-paused" [matTooltip]="'tickets.adminInbox.table.slaPaused' | translate">
                              <mat-icon>pause_circle</mat-icon>
                            </span>
                          }
                          @if (ticket.firstResponseOverdue) {
                            <span class="fr-overdue" [matTooltip]="'tickets.adminInbox.table.firstResponseOverdue' | translate">
                              <mat-icon>reply</mat-icon>
                            </span>
                          }
                        </div>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="updatedAt">
                      <th mat-header-cell *matHeaderCellDef>{{ 'tickets.adminInbox.table.updatedAt' | translate }}</th>
                      <td mat-cell *matCellDef="let ticket">
                        <span class="cell-datetime" dir="ltr">{{ ticket.updatedAt | localeDate:dateTimeFormat }}</span>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row
                        *matRowDef="let row; columns: displayedColumns;"
                        [class.overdue-row]="row.overdue"
                        [class.row-focused]="isFocusedRow(row)"
                        (click)="focusRow(row)"></tr>
                  </table>
                </div>

                <mat-paginator
                  [length]="totalElements"
                  [pageIndex]="pageIndex"
                  [pageSize]="pageSize"
                  [pageSizeOptions]="[10, 25, 50]"
                  [disabled]="loading"
                  (page)="onPage($event)"
                  [attr.aria-label]="'tickets.adminInbox.pagination' | translate">
                </mat-paginator>
              }
            </div>

            @if (totalElements > 0) {
              <p class="result-count muted">
                {{ 'tickets.adminInbox.resultCount' | translate:{ count: (totalElements | localeDigits) } }}
              </p>
            }
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .inbox-shell {
      min-height: 60vh;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      background: transparent;
    }

    .inbox-shell ::ng-deep .mat-drawer-backdrop.mat-drawer-shown {
      background: color-mix(in srgb, #14110d 35%, transparent);
    }

    .filters-sidenav {
      width: min(380px, 100%);
      max-width: 100%;
      background: var(--bg-primary);
      border-inline-start: 1px solid var(--border-color);
    }

    .filters-sidenav-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .filters-sidenav-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding: 18px 16px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .filters-heading {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .filters-heading-icon {
      color: var(--accent-dark, var(--primary));
    }

    .filters-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
    }

    .filters-active-count {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .filters-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 16px;
      flex: 1 1 auto;
      overflow: auto;
    }

    .filter-section-label {
      margin: 0 0 8px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .filter-control {
      width: 100%;
      margin-bottom: 8px;
    }

    .filters-sidenav-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 12px 16px 16px;
      border-top: 1px solid var(--border-color);
    }

    .filters-save-view {
      margin-inline-end: auto;
    }

    .page-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 16px;
      padding: 14px 16px;
    }

    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      flex: 1 1 auto;
    }

    .filter-tab {
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-muted);
      border-radius: 999px;
      padding: 6px 12px;
      font: inherit;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .filter-tab.active {
      background: color-mix(in srgb, var(--primary) 14%, transparent);
      border-color: color-mix(in srgb, var(--primary) 45%, var(--border-color));
      color: var(--text-primary);
      font-weight: 600;
    }

    .toolbar-end {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .saved-views-btn {
      max-width: 220px;
    }

    .saved-views-btn.active {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border-color));
      color: var(--accent);
    }

    .saved-views-btn .saved-view-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
    }

    .saved-views-btn .chevron {
      margin-inline-start: -2px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .filters-open-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .filters-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.35rem;
      height: 1.35rem;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--primary);
      color: #14110d;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .search-field {
      width: min(100%, 280px);
    }

    .table-wrap {
      overflow: hidden;
      max-width: 100%;
      min-width: 0;
    }
    .table-scroll {
      overflow-x: auto;
      max-width: 100%;
    }
    .tickets-table {
      width: 100%;
      min-width: 960px;
    }

    .col-row-num {
      width: 48px;
      max-width: 48px;
      text-align: center;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .ticket-id {
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .ticket-link {
      color: inherit;
      text-decoration: none;
    }

    .ticket-link:hover {
      color: var(--primary);
      text-decoration: underline;
    }

    tr.row-focused {
      outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
      outline-offset: -2px;
      background: color-mix(in srgb, var(--accent) 8%, var(--bg-primary));
    }

    .subject {
      display: inline-block;
      max-width: 20rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }

    .tag-chip {
      display: inline-flex;
      padding: 1px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .requester {
      display: inline-block;
      max-width: 12rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .unassigned {
      color: var(--text-muted);
      font-style: italic;
    }

    .due-cell {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .due-at.approaching {
      color: var(--warning, #ed6c02);
      font-weight: 600;
    }
    .due-at.overdue {
      color: #dc2626;
      font-weight: 600;
    }

    .sla-paused {
      display: inline-flex;
      align-items: center;
      color: var(--text-muted, #6b7280);
    }

    .sla-paused mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .fr-overdue {
      display: inline-flex;
      align-items: center;
      color: #dc2626;
    }

    .fr-overdue mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .overdue-row {
      background: color-mix(in srgb, #dc2626 4%, transparent);
    }

    .status-pill,
    .priority-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      white-space: nowrap;
    }

    .status-pill[data-status='NEW'] { background: color-mix(in srgb, #2563eb 12%, transparent); }
    .status-pill[data-status='OPEN'] { background: color-mix(in srgb, #0891b2 12%, transparent); }
    .status-pill[data-status='PENDING'],
    .status-pill[data-status='ON_HOLD'] { background: color-mix(in srgb, #d97706 12%, transparent); }
    .status-pill[data-status='RESOLVED'] { background: color-mix(in srgb, #16a34a 12%, transparent); }
    .status-pill[data-status='CLOSED'] { background: color-mix(in srgb, #64748b 12%, transparent); }
    .priority-pill[data-priority='URGENT'],
    .priority-pill[data-priority='HIGH'] { background: color-mix(in srgb, #dc2626 10%, transparent); }

    .cell-datetime {
      white-space: nowrap;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .empty-state,
    .state-msg {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 48px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-state mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.7;
    }

    .muted { color: var(--text-muted); }
    .result-count { margin: 0; font-size: 0.85rem; }
    .bulk-bar {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }
    .bulk-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .bulk-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 10px;
    }
    .bulk-field {
      width: min(200px, 100%);
    }
    .col-select {
      width: 48px;
      padding-inline-end: 4px;
    }
    .presence-btn.away {
      border-color: color-mix(in srgb, var(--warning) 55%, var(--border-color));
      color: var(--warning);
    }

    @media (max-width: 720px) {
      .search-field { width: 100%; }
      .toolbar-end { width: 100%; }
    }
  `]
})
export class AdminTicketsInboxComponent implements OnInit, OnDestroy {
  @ViewChild('filterNav') filterNav?: MatSidenav;
  @ViewChild('searchInputEl') searchInputEl?: ElementRef<HTMLInputElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly apiError = inject(ApiErrorService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly unassignedValue = UNASSIGNED_VALUE;
  readonly statuses: TicketStatus[] = ['NEW', 'OPEN', 'PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'];
  readonly priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  readonly inboxTabs: { id: TicketInboxView; labelKey: string }[] = [
    { id: 'ALL', labelKey: 'tickets.adminInbox.views.all' },
    { id: 'UNASSIGNED', labelKey: 'tickets.adminInbox.views.unassigned' },
    { id: 'MINE', labelKey: 'tickets.adminInbox.views.mine' },
    { id: 'MY_QUEUE', labelKey: 'tickets.adminInbox.views.myQueue' },
    { id: 'WATCHING', labelKey: 'tickets.adminInbox.views.watching' },
    { id: 'MENTIONS', labelKey: 'tickets.adminInbox.views.mentions' },
    { id: 'OVERDUE', labelKey: 'tickets.adminInbox.views.overdue' },
    { id: 'ESCALATED', labelKey: 'tickets.adminInbox.views.escalated' },
    { id: 'ARCHIVED', labelKey: 'tickets.adminInbox.views.archived' },
    { id: 'DELETED', labelKey: 'tickets.adminInbox.views.deleted' }
  ];
  readonly displayedColumns = [
    'select', 'rowNumber', 'publicNumber', 'subject', 'requester', 'queue', 'assignee', 'priority', 'status', 'dueAt', 'updatedAt'
  ];
  readonly dateTimeFormat = SMS_DATETIME_FORMAT;

  tickets: Ticket[] = [];
  categories: TicketCategory[] = [];
  queues: TicketQueue[] = [];
  assignees: TicketAssigneeOption[] = [];
  tags: TicketTag[] = [];
  loading = false;
  bulkBusy = false;
  selectedIds = new Set<number>();
  bulkAssigneeValue: number | typeof UNASSIGNED_VALUE | '' = '';
  bulkStatus: TicketStatus | '' = '';
  bulkTagId: number | null = null;
  ticketAvailable = true;
  ticketAvailabilitySaving = false;
  inboxView: TicketInboxView = 'ALL';
  searchInput = '';
  searchQuery = '';
  focusedIndex = -1;
  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  filterStatus: TicketStatus | '' = '';
  filterPriority: TicketPriority | '' = '';
  filterCategoryId: number | '' = '';
  filterQueueId: number | '' = '';
  filterTagId: number | '' = '';
  filterAssigneeValue: number | typeof UNASSIGNED_VALUE | '' = '';
  filterCustomerInput = '';
  filterCustomer = '';
  filterCreatedFrom = '';
  filterCreatedTo = '';

  savedViews: TicketInboxSavedView[] = [];
  activeSavedViewId: number | null = null;
  private defaultSavedViewApplied = false;
  private applyingSavedView = false;

  private readonly search$ = new Subject<string>();
  private readonly customer$ = new Subject<string>();
  private searchSub?: Subscription;
  private customerSub?: Subscription;
  private loadSub?: Subscription;
  private querySub?: Subscription;

  get activeSavedView(): TicketInboxSavedView | null {
    if (this.activeSavedViewId == null) return null;
    return this.savedViews.find((v) => v.id === this.activeSavedViewId) ?? null;
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filterStatus) count++;
    if (this.filterPriority) count++;
    if (this.filterCategoryId !== '') count++;
    if (this.filterQueueId !== '') count++;
    if (this.filterTagId !== '') count++;
    if (this.filterAssigneeValue !== '') count++;
    if (this.filterCustomer.trim()) count++;
    if (this.filterCreatedFrom) count++;
    if (this.filterCreatedTo) count++;
    return count;
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get allPageSelected(): boolean {
    const ids = this.pageTicketIds();
    return ids.length > 0 && ids.every((id) => this.selectedIds.has(id));
  }

  get somePageSelected(): boolean {
    const ids = this.pageTicketIds();
    const selectedOnPage = ids.filter((id) => this.selectedIds.has(id)).length;
    return selectedOnPage > 0 && selectedOnPage < ids.length;
  }

  isSelected(id: number | null | undefined): boolean {
    return id != null && this.selectedIds.has(id);
  }

  toggleSelect(id: number | null | undefined, checked: boolean): void {
    if (id == null) {
      return;
    }
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
    this.selectedIds = new Set(this.selectedIds);
  }

  toggleSelectAllPage(checked: boolean): void {
    for (const id of this.pageTicketIds()) {
      if (checked) {
        this.selectedIds.add(id);
      } else {
        this.selectedIds.delete(id);
      }
    }
    this.selectedIds = new Set(this.selectedIds);
  }

  clearSelection(): void {
    this.selectedIds = new Set();
  }

  runBulkAssign(): void {
    if (this.bulkAssigneeValue === '') {
      return;
    }
    const assigneeId = this.bulkAssigneeValue === UNASSIGNED_VALUE ? null : Number(this.bulkAssigneeValue);
    this.runBulk({
      ticketIds: [...this.selectedIds],
      action: 'ASSIGN',
      assigneeId
    });
  }

  runBulkStatus(): void {
    if (!this.bulkStatus) {
      return;
    }
    this.runBulk({
      ticketIds: [...this.selectedIds],
      action: 'CHANGE_STATUS',
      status: this.bulkStatus
    });
  }

  runBulkAddTag(): void {
    if (this.bulkTagId == null) {
      return;
    }
    this.runBulk({
      ticketIds: [...this.selectedIds],
      action: 'ADD_TAG',
      tagIds: [this.bulkTagId]
    });
  }

  runBulkClose(): void {
    if (this.selectedCount === 0 || this.bulkBusy) {
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        titleKey: 'tickets.adminInbox.bulk.closeTitle',
        messageKey: 'tickets.adminInbox.bulk.closeMessage',
        messageParams: { count: this.selectedCount },
        confirmKey: 'tickets.adminInbox.bulk.close',
        confirmColor: 'warn' as const
      }
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.runBulk({
        ticketIds: [...this.selectedIds],
        action: 'CLOSE'
      });
    });
  }

  private runBulk(payload: BulkTicketActionPayload): void {
    if (this.bulkBusy || !payload.ticketIds.length) {
      return;
    }
    this.bulkBusy = true;
    this.ticketService.bulkAdminTickets(payload).subscribe({
      next: (result) => {
        this.bulkBusy = false;
        const ok = result.succeeded?.length ?? 0;
        const fail = result.failed?.length ?? 0;
        for (const id of result.succeeded ?? []) {
          this.selectedIds.delete(id);
        }
        this.selectedIds = new Set(this.selectedIds);
        if (fail === 0) {
          this.snackBar.open(
            this.translate.instant('tickets.adminInbox.bulk.success', { count: ok }),
            undefined,
            { duration: 3500 }
          );
        } else {
          const first = result.failed?.[0]?.message;
          this.snackBar.open(
            this.translate.instant('tickets.adminInbox.bulk.partial', {
              ok,
              fail,
              detail: first || ''
            }),
            undefined,
            { duration: 7000, panelClass: ['error-snackbar'] }
          );
        }
        this.load();
      },
      error: (error) => {
        this.bulkBusy = false;
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private pageTicketIds(): number[] {
    return this.tickets.map((t) => t.id).filter((id): id is number => id != null);
  }

  ngOnInit(): void {
    this.authService.refreshCurrentUser().subscribe({
      next: (user) => { this.ticketAvailable = user.ticketAvailable !== false; },
      error: () => { this.ticketAvailable = true; }
    });
    this.ticketService.listAllCategories().subscribe({
      next: (categories) => { this.categories = categories ?? []; },
      error: () => { this.categories = []; }
    });
    this.ticketService.listAllQueues().subscribe({
      next: (queues) => { this.queues = (queues ?? []).filter((q) => q.active); },
      error: () => { this.queues = []; }
    });
    this.ticketService.listAdminAssignees().subscribe({
      next: (assignees) => { this.assignees = assignees ?? []; },
      error: () => { this.assignees = []; }
    });
    this.ticketService.listAdminTags().subscribe({
      next: (tags) => { this.tags = tags ?? []; },
      error: () => { this.tags = []; }
    });
    this.loadSavedViews();

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onShortcutKeydown(event));

    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const view = (params.get('view') ?? 'ALL').toUpperCase() as TicketInboxView;
      const nextView = this.inboxTabs.some((tab) => tab.id === view) ? view : 'ALL';
      if (nextView !== this.inboxView) {
        this.clearSelection();
      }
      this.inboxView = nextView;

      const unassigned = params.get('unassigned');
      const assigneeIdRaw = params.get('assigneeId');
      if (unassigned === '1' || unassigned === 'true') {
        this.filterAssigneeValue = UNASSIGNED_VALUE;
      } else if (assigneeIdRaw && /^\d+$/.test(assigneeIdRaw)) {
        this.filterAssigneeValue = Number(assigneeIdRaw);
      } else if (params.has('assigneeId') || params.has('unassigned')) {
        this.filterAssigneeValue = '';
      }

      if (!this.applyingSavedView) {
        this.activeSavedViewId = null;
      }
      this.applyingSavedView = false;

      this.pageIndex = 0;
      this.load();
      this.maybeApplyDefaultSavedView(params);
    });

    this.searchSub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.searchQuery = value.trim();
      this.pageIndex = 0;
      this.load();
    });

    this.customerSub = this.customer$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.filterCustomer = value.trim();
      this.pageIndex = 0;
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.customerSub?.unsubscribe();
    this.loadSub?.unsubscribe();
    this.querySub?.unsubscribe();
  }

  setView(view: TicketInboxView): void {
    this.activeSavedViewId = null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view.toLowerCase() },
      queryParamsHandling: 'merge'
    });
  }

  onSearchInput(value: string): void {
    this.activeSavedViewId = null;
    this.search$.next(value ?? '');
  }

  clearSearch(): void {
    this.activeSavedViewId = null;
    this.searchInput = '';
    this.search$.next('');
  }

  onCustomerInput(value: string): void {
    this.activeSavedViewId = null;
    this.customer$.next(value ?? '');
  }

  onFiltersChanged(): void {
    if (!this.applyingSavedView) {
      this.activeSavedViewId = null;
    }
    this.pageIndex = 0;
    this.clearSelection();
    this.load();
  }

  setCreatedFrom(value: string | null): void {
    this.filterCreatedFrom = value ?? '';
    this.onFiltersChanged();
  }

  setCreatedTo(value: string | null): void {
    this.filterCreatedTo = value ?? '';
    this.onFiltersChanged();
  }

  clearAllFilters(): void {
    this.activeSavedViewId = null;
    this.filterStatus = '';
    this.filterPriority = '';
    this.filterCategoryId = '';
    this.filterQueueId = '';
    this.filterTagId = '';
    this.filterAssigneeValue = '';
    this.filterCustomerInput = '';
    this.filterCustomer = '';
    this.filterCreatedFrom = '';
    this.filterCreatedTo = '';
    this.customer$.next('');
    this.onFiltersChanged();
  }

  saveCurrentView(): void {
    const ref = this.dialog.open(TicketSavedViewDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      panelClass: ['app-dialog', 'ticket-saved-view-dialog-panel'],
      data: { mode: 'create' as const }
    });
    ref.afterClosed().subscribe((result: TicketSavedViewDialogResult | null | undefined) => {
      if (!result) return;
      this.ticketService.createInboxSavedView({
        name: result.name,
        filter: this.collectFilterPayload(),
        isDefault: result.isDefault
      }).subscribe({
        next: (created) => {
          this.savedViews = [
            ...this.savedViews.map((v) => created.isDefault ? { ...v, isDefault: false } : v),
            created
          ].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
          this.activeSavedViewId = created.id;
          this.snackBar.open(this.translate.instant('tickets.adminInbox.savedViews.saved'), undefined, {
            duration: 2500
          });
        },
        error: (error) => {
          this.snackBar.open(this.apiError.resolve(error), undefined, {
            duration: 6000,
            panelClass: ['error-snackbar']
          });
        }
      });
    });
  }

  openManageSavedViews(): void {
    const ref = this.dialog.open(TicketManageSavedViewsDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'app-dialog',
      data: { views: this.savedViews }
    });
    ref.afterClosed().subscribe((result: TicketManageSavedViewsDialogResult | null | undefined) => {
      if (!result) return;
      this.savedViews = result.views ?? [];
      if (this.activeSavedViewId != null && !this.savedViews.some((v) => v.id === this.activeSavedViewId)) {
        this.activeSavedViewId = null;
      }
    });
  }

  applySavedView(view: TicketInboxSavedView): void {
    this.applyFilterPayload(view.filter ?? {}, view.id);
  }

  private loadSavedViews(): void {
    this.ticketService.listInboxSavedViews().subscribe({
      next: (views) => {
        this.savedViews = views ?? [];
        this.maybeApplyDefaultSavedView(this.route.snapshot.queryParamMap);
      },
      error: () => {
        this.savedViews = [];
      }
    });
  }

  private maybeApplyDefaultSavedView(params: { has(name: string): boolean }): void {
    if (this.defaultSavedViewApplied) return;
    if (params.has('view') || params.has('assigneeId') || params.has('unassigned')) {
      this.defaultSavedViewApplied = true;
      return;
    }
    if (!this.savedViews.length) return;
    const defaultView = this.savedViews.find((v) => v.isDefault);
    if (!defaultView) {
      this.defaultSavedViewApplied = true;
      return;
    }
    this.defaultSavedViewApplied = true;
    this.applyFilterPayload(defaultView.filter ?? {}, defaultView.id);
  }

  private collectFilterPayload(): TicketInboxSavedViewFilter {
    return {
      view: this.inboxView,
      q: this.searchQuery.trim() || null,
      status: this.filterStatus || null,
      priority: this.filterPriority || null,
      categoryId: this.filterCategoryId === '' ? null : Number(this.filterCategoryId),
      queueId: this.filterQueueId === '' ? null : Number(this.filterQueueId),
      tagId: this.filterTagId === '' ? null : Number(this.filterTagId),
      assigneeId: typeof this.filterAssigneeValue === 'number' ? this.filterAssigneeValue : null,
      unassigned: this.filterAssigneeValue === UNASSIGNED_VALUE ? true : null,
      customer: this.filterCustomer.trim() || null,
      createdFrom: this.filterCreatedFrom || null,
      createdTo: this.filterCreatedTo || null
    };
  }

  private applyFilterPayload(filter: TicketInboxSavedViewFilter, savedViewId: number | null): void {
    this.applyingSavedView = true;
    this.activeSavedViewId = savedViewId;

    const nextView = this.normalizeInboxView(filter.view);
    this.filterStatus = filter.status ?? '';
    this.filterPriority = filter.priority ?? '';
    this.filterCategoryId = filter.categoryId != null ? Number(filter.categoryId) : '';
    this.filterQueueId = filter.queueId != null ? Number(filter.queueId) : '';
    this.filterTagId = filter.tagId != null ? Number(filter.tagId) : '';
    if (filter.unassigned) {
      this.filterAssigneeValue = UNASSIGNED_VALUE;
    } else if (filter.assigneeId != null) {
      this.filterAssigneeValue = Number(filter.assigneeId);
    } else {
      this.filterAssigneeValue = '';
    }
    this.filterCustomerInput = filter.customer?.trim() ?? '';
    this.filterCustomer = this.filterCustomerInput;
    this.filterCreatedFrom = filter.createdFrom ?? '';
    this.filterCreatedTo = filter.createdTo ?? '';
    this.searchInput = filter.q?.trim() ?? '';
    this.searchQuery = this.searchInput;
    this.pageIndex = 0;
    this.clearSelection();

    const queryParams: Record<string, string | null> = {
      view: nextView.toLowerCase(),
      assigneeId: typeof this.filterAssigneeValue === 'number' ? String(this.filterAssigneeValue) : null,
      unassigned: this.filterAssigneeValue === UNASSIGNED_VALUE ? '1' : null
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    }).then((navigated) => {
      if (!navigated) {
        this.applyingSavedView = false;
        this.inboxView = nextView;
        this.load();
      }
    });
  }

  private normalizeInboxView(view: string | null | undefined): TicketInboxView {
    const upper = (view ?? 'ALL').toUpperCase() as TicketInboxView;
    return this.inboxTabs.some((tab) => tab.id === upper) ? upper : 'ALL';
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  reload(): void {
    this.load();
  }

  openShortcutsHelp(): void {
    this.dialog.open(TicketShortcutsHelpDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'app-dialog',
      data: { scope: 'inbox' as const }
    });
  }

  openFilters(): void {
    void this.filterNav?.open();
  }

  closeFilters(): void {
    void this.filterNav?.close();
  }

  toggleFilters(): void {
    if (this.filterNav?.opened) {
      this.closeFilters();
    } else {
      this.openFilters();
    }
  }

  focusSearch(): void {
    this.searchInputEl?.nativeElement?.focus();
    this.searchInputEl?.nativeElement?.select();
  }

  openFocusedTicket(): void {
    const ticket = this.tickets[this.focusedIndex];
    if (ticket?.id != null) {
      void this.router.navigate(['/admin/tickets', ticket.id]);
    }
  }

  isFocusedRow(row: Ticket): boolean {
    const focused = this.tickets[this.focusedIndex];
    return focused != null && focused.id != null && focused.id === row.id;
  }

  focusRow(row: Ticket): void {
    const index = this.tickets.findIndex((t) => t.id === row.id);
    this.focusedIndex = index;
  }

  private onShortcutKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (!isEditableKeyboardTarget(event.target)) {
        event.preventDefault();
        this.openShortcutsHelp();
      }
      return;
    }

    if (hasOpenMaterialOverlay() && event.key !== 'Escape') {
      return;
    }

    if (event.key === 'Escape') {
      if (this.filterNav?.opened) {
        event.preventDefault();
        this.closeFilters();
        return;
      }
      if (this.selectedCount > 0) {
        event.preventDefault();
        this.clearSelection();
        return;
      }
      if (this.focusedIndex >= 0) {
        event.preventDefault();
        this.focusedIndex = -1;
      }
      return;
    }

    if (isEditableKeyboardTarget(event.target)) {
      return;
    }

    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.focusSearch();
      return;
    }

    if (isPlainLetterKey(event, 'r')) {
      event.preventDefault();
      this.reload();
      return;
    }

    if (isPlainLetterKey(event, 'f')) {
      event.preventDefault();
      this.toggleFilters();
      return;
    }

    if (isPlainLetterKey(event, 'j')) {
      event.preventDefault();
      this.moveFocus(1);
      return;
    }

    if (isPlainLetterKey(event, 'k')) {
      event.preventDefault();
      this.moveFocus(-1);
      return;
    }

    if (isPlainLetterKey(event, 'x')) {
      event.preventDefault();
      this.toggleFocusedSelect();
      return;
    }

    if (event.key.toLowerCase() === 'a' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.toggleSelectAllPage(true);
      return;
    }

    if ((event.key === 'Enter' || isPlainLetterKey(event, 'o')) && !event.shiftKey) {
      if (this.focusedIndex >= 0) {
        event.preventDefault();
        this.openFocusedTicket();
      }
      return;
    }

    if (event.key.toLowerCase() === 'c' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (this.selectedCount > 0) {
        event.preventDefault();
        this.runBulkClose();
      }
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      const digit = event.key;
      if (/^[0-9]$/.test(digit)) {
        const index = digit === '0' ? 9 : Number(digit) - 1;
        const tab = this.inboxTabs[index];
        if (tab) {
          event.preventDefault();
          this.setView(tab.id);
        }
      }
    }
  }

  private moveFocus(delta: number): void {
    if (!this.tickets.length) {
      this.focusedIndex = -1;
      return;
    }
    if (this.focusedIndex < 0) {
      this.focusedIndex = delta > 0 ? 0 : this.tickets.length - 1;
    } else {
      this.focusedIndex = Math.max(0, Math.min(this.tickets.length - 1, this.focusedIndex + delta));
    }
  }

  private toggleFocusedSelect(): void {
    const ticket = this.tickets[this.focusedIndex];
    if (ticket?.id == null) {
      return;
    }
    this.toggleSelect(ticket.id, !this.isSelected(ticket.id));
  }

  toggleTicketAvailability(): void {
    if (this.ticketAvailabilitySaving) {
      return;
    }
    const next = !this.ticketAvailable;
    const previous = this.ticketAvailable;
    this.ticketAvailable = next;
    this.ticketAvailabilitySaving = true;
    this.usersService.setTicketAvailable(next).subscribe({
      next: (user) => {
        this.ticketAvailabilitySaving = false;
        this.ticketAvailable = user.ticketAvailable !== false;
        this.authService.setCurrentUser(user);
        this.snackBar.open(
          this.translate.instant(
            next ? 'settings.ticketAvailabilityEnabled' : 'settings.ticketAvailabilityDisabled'
          ),
          undefined,
          { duration: 2500 }
        );
      },
      error: (error) => {
        this.ticketAvailabilitySaving = false;
        this.ticketAvailable = previous;
        this.snackBar.open(this.apiError.resolve(error), undefined, { duration: 4000 });
      }
    });
  }

  private load(): void {
    this.loading = true;
    this.loadSub?.unsubscribe();
    this.loadSub = this.ticketService.listAdminInbox({
      view: this.inboxView,
      q: this.searchQuery || undefined,
      status: this.filterStatus || undefined,
      priority: this.filterPriority || undefined,
      categoryId: this.filterCategoryId === '' ? undefined : Number(this.filterCategoryId),
      queueId: this.filterQueueId === '' ? undefined : Number(this.filterQueueId),
      tagId: this.filterTagId === '' ? undefined : Number(this.filterTagId),
      unassigned: this.filterAssigneeValue === UNASSIGNED_VALUE || undefined,
      assigneeId: typeof this.filterAssigneeValue === 'number' ? this.filterAssigneeValue : undefined,
      customer: this.filterCustomer || undefined,
      createdFrom: this.filterCreatedFrom || undefined,
      createdTo: this.filterCreatedTo || undefined,
      page: this.pageIndex,
      size: this.pageSize,
      sort: 'updatedAt,desc'
    }).subscribe({
      next: (page) => {
        this.tickets = page.content ?? [];
        this.totalElements = page.totalElements ?? 0;
        this.pageIndex = page.number ?? this.pageIndex;
        this.pageSize = page.size ?? this.pageSize;
        this.focusedIndex = this.focusedIndex >= 0 && this.tickets.length
          ? Math.min(this.focusedIndex, this.tickets.length - 1)
          : -1;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.tickets = [];
        this.focusedIndex = -1;
        this.totalElements = 0;
        this.snackBar.open(this.apiError.resolve(error), undefined, {
          duration: 6000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
