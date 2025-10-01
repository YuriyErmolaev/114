import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElementRef } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

@Component({
  standalone: true,
  selector: 'app-wizard-layout',
  imports: [CommonModule],
  templateUrl: './wizard-layout.component.html',
  styleUrls: ['./wizard-layout.component.css'],
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { floatLabel: 'always' } }
  ]
})
export class WizardLayoutComponent implements OnInit, OnChanges {
  /**
   * Deprecated: summaryWidth is ignored. Use mainCol/sideCol/sideMin instead.
   */
  @Input() summaryWidth: number | string = 380; // deprecated, ignored

  /** Left column ratio (fr) */
  @Input() mainCol: number | string = 2;
  /** Right column ratio (fr) */
  @Input() sideCol: number | string = 1;
  /** Min width for summary in px */
  @Input() sideMin: number | string = 360;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.applyCssVars();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.applyCssVars();
  }

  private applyCssVars(): void {
    const el = this.host.nativeElement;

    const main = typeof this.mainCol === 'number' ? `${this.mainCol}fr` : `${this.mainCol}`;
    const side = typeof this.sideCol === 'number' ? `${this.sideCol}fr` : `${this.sideCol}`;
    const min = typeof this.sideMin === 'number' ? `${this.sideMin}px` : `${this.sideMin}`;

    el.style.setProperty('--wiz-main-col', main);
    el.style.setProperty('--wiz-side-col', side);
    el.style.setProperty('--wiz-side-min', min);
  }
}
