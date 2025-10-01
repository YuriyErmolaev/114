import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-video-display-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-display-controls.component.html',
  styleUrls: ['./video-display-controls.component.css']
})
export class VideoDisplayControlsComponent {
  @Input() showGrid = false;
  @Output() showGridChange = new EventEmitter<boolean>();

  @Input() landmarksEnabled = true;
  @Output() landmarksEnabledChange = new EventEmitter<boolean>();

  @Input() filter = '';
  @Output() filterChange = new EventEmitter<string>();

  onToggleGrid(event: Event): void {
    const v = (event.target as HTMLInputElement).checked;
    this.showGrid = v;
    this.showGridChange.emit(v);
  }

  onToggleLandmarks(event: Event): void {
    const v = (event.target as HTMLInputElement).checked;
    this.landmarksEnabled = v;
    this.landmarksEnabledChange.emit(v);
  }

  onFilterChange(value: string): void {
    this.filter = value;
    this.filterChange.emit(value);
  }
}
