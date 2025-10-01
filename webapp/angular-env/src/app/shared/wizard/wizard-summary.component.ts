import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

export interface WizardSummaryItem {
  label?: string;
  value?: unknown;
  multiline?: boolean;
  separator?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-wizard-summary',
  imports: [CommonModule],
  templateUrl: './wizard-summary.component.html',
  styleUrls: ['./wizard-summary.component.css'],
  providers: [DatePipe]
})
export class WizardSummaryComponent {
  @Input() items: WizardSummaryItem[] = [];

  constructor(private datePipe: DatePipe) {}

  displayValue(val: unknown): string {
    if (val === null || val === undefined || val === '') return '—';
    if (val instanceof Date) {
      return this.datePipe.transform(val, 'mediumDate') ?? '—';
    }
    return String(val);
  }
}
