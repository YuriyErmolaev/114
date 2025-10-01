import { AfterViewInit, Directive, ElementRef, OnDestroy } from '@angular/core';
import { AutofillMonitor } from '@angular/cdk/text-field';
import { ControlContainer } from '@angular/forms';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appAutofillSync]',
  standalone: true
})
export class AutofillSyncDirective implements AfterViewInit, OnDestroy {
  private sub?: Subscription;

  constructor(
    private readonly el: ElementRef<HTMLInputElement | HTMLTextAreaElement>,
    private readonly autofill: AutofillMonitor,
    private readonly controlContainer: ControlContainer
  ) {}

  ngAfterViewInit(): void {
    // Start monitoring autofill on the element
    this.sub = this.autofill.monitor(this.el.nativeElement).subscribe(event => {
      if (event.isAutofilled) {
        const ctrlName = this.el.nativeElement.getAttribute('formControlName');
        const containerControl = this.controlContainer?.control as any;
        if (ctrlName && containerControl && typeof containerControl.get === 'function') {
          const ctrl = containerControl.get(ctrlName);
          if (ctrl) {
            ctrl.markAsTouched();
            ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: true });
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.autofill.stopMonitoring(this.el.nativeElement);
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = undefined;
    }
  }
}
