import {Component, Input, SimpleChanges} from '@angular/core';
import {KeyValuePipe, NgForOf, NgIf} from "@angular/common";

@Component({
  selector: 'app-csv-table',
  standalone: true,
  imports: [
    KeyValuePipe,
    NgIf,
    NgForOf
  ],
  templateUrl: './csv-table.component.html',
  styleUrl: './csv-table.component.scss'
})
export class CsvTableComponent {
  @Input() csvData: any[] = [];
  isLoading: boolean = true;

  ngOnChanges(changes: SimpleChanges) {
    if (this.csvData && this.csvData.length > 0) {
      this.isLoading = false;
    }
    if (changes['csvData'] && this.csvData && this.csvData.length > 0) {
      const headers = Object.keys(this.csvData[0]);
      const firstRows = this.csvData.slice(0, 2);
      //comment console.log("Updated headers in CsvTableComponent:", headers);
      //comment console.log("Updated first rows in CsvTableComponent:", firstRows);
    } else if (changes['csvData']) {
      //comment console.log("CsvTableComponent received no data");
    }
  }

  getHeaders(): string[] {
    return this.csvData.length > 0 ? Object.keys(this.csvData[0]) : [];
  }


}
