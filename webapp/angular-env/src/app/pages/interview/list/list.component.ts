import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatSort, MatSortModule } from '@angular/material/sort';
import {InterviewCreateChoiceDialogComponent} from '../create-choice-dialog/create-choice-dialog.component';

type InterviewStatus = 'Запланировано' | 'В процессе' | 'Готов анализ';
export interface InterviewRow {
  uuid: string;
  title: string;
  interviewer: string;
  status: InterviewStatus;
}

@Component({
  selector: 'app-interview-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatSortModule, RouterModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['uuid', 'title', 'interviewer', 'status', 'actions'];
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  private originalData: InterviewRow[] = [];
  dataSource: InterviewRow[] = [];

  constructor(private readonly http: HttpClient, private readonly router: Router, private readonly dialog: MatDialog) {}

  onPlay(row: any): void {
    console.log('[InterviewList] Play clicked:', row?.uuid ?? row);
  }

  onUpload(row: any): void {
    console.log('[InterviewList] Upload/Share clicked:', row?.uuid ?? row);
  }

  onSettings(row: any): void {
    console.log('[InterviewList] Settings clicked:', row?.uuid ?? row);
  }


  ngOnInit(): void {
    // Subscribe to sort changes
    if (this.sort) {
      this.sort.sortChange.subscribe(() => this.applySort());
    }

    this.http.get<InterviewRow[]>('/assets/demo/interviews.json').subscribe({
      next: rows => {
        this.originalData = rows || [];
        this.applySort();
      },
      error: err => {
        console.warn('[interview-list] failed to load mocks', err);
        this.originalData = [
          { uuid: 'e90dfff4-cd6c-467b-8ead-3d443661ddde', title: 'Запись-1', interviewer: 'Иванов', status: 'Запланировано' },
          { uuid: '6b7bf3fb-1a3a-4a5a-9ef8-9b0d2f4cf111', title: 'Запись-2', interviewer: 'Петров', status: 'В процессе' },
          { uuid: 'c0b0a5ab-0b22-4a79-8b76-3c7b0fd3aa22', title: 'Запись-3', interviewer: 'Сидоров', status: 'Готов анализ' }
        ];
        this.applySort();
      }
    });
  }

  private applySort(): void {
    if (!this.sort || !this.sort.active || this.sort.direction === '') {
      this.dataSource = [...this.originalData];
      return;
    }
    const active = this.sort.active as keyof InterviewRow;
    const direction = this.sort.direction === 'asc' ? 1 : -1;
    this.dataSource = [...this.originalData].sort((a, b) => this.compare(a[active], b[active]) * direction);
  }

  private compare(a: any, b: any): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const da = new Date(a as any).getTime();
    const db = new Date(b as any).getTime();
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return String(a).localeCompare(String(b));
  }

  openDetails(row: InterviewRow): void {
    this.router.navigate(['/interview', row.uuid]);
  }

  openCreateChoice(): void {
    const ref = this.dialog.open(InterviewCreateChoiceDialogComponent);
    ref.afterClosed().subscribe(choice => {
      if (choice === 'online') {
        this.router.navigate(['/interview/online/create']);
      } else if (choice === 'offline') {
        this.router.navigate(['/interview/offline/create']);
      }
    });
  }
}
