import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface BlendItem {
  categoryName: string;
  displayName?: string;
  score: number;
}

@Component({
  selector: 'app-blend-shapes-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blend-shapes-picker.component.html',
  styleUrls: ['./blend-shapes-picker.component.css']
})
export class BlendShapesPickerComponent {
  @Input() items: BlendItem[] | null = null;
  @Input() excludeNeutral = true;

  @Input() filter = '';
  @Output() filterChange = new EventEmitter<string>();

  @Input() selectedNames: string[] = [];
  @Output() selectedNamesChange = new EventEmitter<string[]>();

  get list(): BlendItem[] {
    const src = Array.isArray(this.items) ? this.items : [];
    const base = this.excludeNeutral
      ? src.filter(i => {
          const n = (i.categoryName || '').toLowerCase();
          return n !== 'neutral' && n !== '_neutral';
        })
      : src;

    const q = (this.filter || '').trim().toLowerCase();
    if (!q) return base;
    return base.filter(it => {
      const dn = (it.displayName || '').toLowerCase();
      const cn = (it.categoryName || '').toLowerCase();
      return dn.includes(q) || cn.includes(q);
    });
  }

  isChecked(name: string): boolean {
    return this.selectedNames.some(n => n.toLowerCase() === name.toLowerCase());
  }

  toggle(it: BlendItem, checked: boolean): void {
    const set = new Set(this.selectedNames);
    if (checked) set.add(it.categoryName);
    else set.delete(it.categoryName);
    this.selectedNames = Array.from(set);
    this.selectedNamesChange.emit(this.selectedNames);
  }

  onFilterChange(v: string): void {
    this.filter = v;
    this.filterChange.emit(v);
  }

  trackByName(_i: number, it: BlendItem): string {
    return it?.categoryName || String(_i);
  }

  protected readonly HTMLInputElement = HTMLInputElement;
}
