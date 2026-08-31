import { Component, EventEmitter, Injectable, OnDestroy } from '@angular/core';
import { Directionality } from '@angular/cdk/bidi';

@Injectable()
class LtrDirectionality implements Directionality, OnDestroy {
  readonly value = 'ltr' as const;
  readonly change = new EventEmitter<'ltr' | 'rtl'>();

  ngOnDestroy(): void {
    this.change.complete();
  }
}

/** Forces LTR layout for nested Material fields even when the app locale is RTL. */
@Component({
  selector: 'app-ltr-host',
  standalone: true,
  template: '<ng-content></ng-content>',
  providers: [{ provide: Directionality, useClass: LtrDirectionality }],
  host: {
    dir: 'ltr',
    lang: 'en',
    class: 'ltr-host'
  },
  styles: [`
    :host {
      display: block;
      direction: ltr;
      text-align: left;
      unicode-bidi: isolate;
      font-family: var(--font-ui);
    }
  `]
})
export class LtrHostComponent {}
