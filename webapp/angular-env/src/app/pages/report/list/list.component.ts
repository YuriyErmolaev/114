import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSort, MatSortModule } from '@angular/material/sort';

interface ReportRow {
  uuid: string;
  interviewUuid: string;
  subjectName: string;
  interviewer: string;
  date: string;
  summaryScore: number;
  status: string;
}

@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatSortModule, RouterModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['uuid', 'subjectName', 'interviewer', 'date', 'summaryScore', 'status', 'actions'];
  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  private originalData: ReportRow[] = [];
  dataSource: ReportRow[] = [];

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  ngOnInit(): void {
    if (this.sort) {
      this.sort.sortChange.subscribe(() => this.applySort());
    }

    this.http.get<any[]>('/assets/demo/reports.json').subscribe({
      next: rows => {
        this.originalData = (rows || []).map(r => ({
          uuid: r.uuid,
          interviewUuid: r.interviewUuid,
          subjectName: r.subjectName,
          interviewer: r.interviewer,
          date: r.date,
          summaryScore: r.summaryScore,
          status: r.status ?? (typeof r.summaryScore === 'number' ? (r.summaryScore >= 60 ? 'Ready' : 'Processing') : 'Processing')
        }) as ReportRow);
        this.applySort();
      },
      error: err => {
        console.warn('[ReportList] failed to load mocks', err);
        this.originalData = [
          {
            uuid: 'rpt-1001',
            interviewUuid: 'e90dfff4-cd6c-467b-8ead-3d443661ddde',
            subjectName: 'Иван Иванов',
            interviewer: 'Иванов',
            date: '2025-09-15T10:24:00Z',
            summaryScore: 72,
            status: 'Ready'
          },
          {
            uuid: 'rpt-1002',
            interviewUuid: '6b7bf3fb-1a3a-4a5a-9ef8-9b0d2f4cf111',
            subjectName: 'Петр Петров',
            interviewer: 'Петров',
            date: '2025-09-16T14:03:00Z',
            summaryScore: 61,
            status: 'Ready'
          },
          {
            uuid: 'rpt-1003',
            interviewUuid: 'c0b0a5ab-0b22-4a79-8b76-3c7b0fd3aa22',
            subjectName: 'Сидор Сидоров',
            interviewer: 'Сидоров',
            date: '2025-09-17T09:10:00Z',
            summaryScore: 83,
            status: 'Processing'
          }
        ];
        this.applySort();
      }
    });
  }

  openDetails(row: ReportRow): void {
    this.router.navigate(['/report', row.uuid]);
  }

  onView(row: ReportRow): void {
    console.log('[ReportList] View clicked:', row.uuid);
    this.openDetails(row);
  }

  onShare(row: ReportRow): void {
    console.log('[ReportList] Share clicked:', row.uuid);
  }

  onDownload(row: ReportRow): void {
    console.log('[ReportList] Download PDF clicked:', row.uuid);
  }

  private applySort(): void {
    if (!this.sort || !this.sort.active || this.sort.direction === '') {
      this.dataSource = [...this.originalData];
      return;
    }
    const active = this.sort.active as keyof ReportRow;
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
}
