import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-quick-start-modal',
  imports: [CommonModule],
  templateUrl: './quick-start-modal.component.html',
  styleUrls: ['./quick-start-modal.component.css']
})
export class QuickStartModalComponent implements OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('dialog', { read: ElementRef }) dialogRef?: ElementRef<HTMLElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      // Focus first focusable element inside dialog
      setTimeout(() => this.focusInitial(), 0);
    }
  }

  private focusInitial(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    const focusable = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      // Simple focus trap
      const dialog = this.dialogRef?.nativeElement;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as HTMLElement;
    if (target.classList.contains('backdrop')) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
