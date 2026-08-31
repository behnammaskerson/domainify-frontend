import { Injectable, OnDestroy, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import { Subject, Subscription } from 'rxjs';
import { TranslationService } from './translation.service';
import { toLocaleDigits } from '../utils/locale-digits';

@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl implements OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly translation = inject(TranslationService);
  private readonly sub: Subscription;
  override readonly changes = new Subject<void>();

  constructor() {
    super();
    this.applyLabels();
    this.sub = this.translate.onLangChange.subscribe(() => this.applyLabels());
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    const lang = this.translation.currentLang();
    if (length === 0 || pageSize === 0) {
      return toLocaleDigits(
        this.translate.instant('paginator.rangeEmpty', { length }),
        lang
      );
    }
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, length);
    return toLocaleDigits(
      this.translate.instant('paginator.range', { start, end, length }),
      lang
    );
  };

  private applyLabels(): void {
    this.itemsPerPageLabel = this.translate.instant('paginator.itemsPerPage');
    this.nextPageLabel = this.translate.instant('paginator.nextPage');
    this.previousPageLabel = this.translate.instant('paginator.previousPage');
    this.firstPageLabel = this.translate.instant('paginator.firstPage');
    this.lastPageLabel = this.translate.instant('paginator.lastPage');
    this.changes.next();
  }
}
