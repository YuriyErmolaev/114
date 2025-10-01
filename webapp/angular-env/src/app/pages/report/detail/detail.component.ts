import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf, AsyncPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface ReportDetail {
  uuid: string;
  interviewUuid: string;
  subjectName: string;
  interviewer: string;
  date: string;
  summaryScore: number;
  summaryText: string;
  emotions: { [name: string]: number };
  traits: { name: string; score: number }[];
  risks: { stressLevel: 'Low' | 'Medium' | 'High'; deceptionLikelihood: 'Low' | 'Medium' | 'High' };
  recommendations: string[];
}

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, AsyncPipe, FormsModule, RouterModule],
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css']
})
export class DetailComponent implements OnInit {
  uuid = '';
  item: ReportDetail | null = null;
  loading = true;
  notFound = false;

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || '';
    console.log('[detail] uuid', this.uuid);
    this.http.get<ReportDetail[]>('/assets/demo/reports.json').subscribe({
      next: rows => {
        this.item = rows.find(r => r.uuid === this.uuid) || null;
        this.notFound = !this.item;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notFound = true;
      }
    });
  }

  back(): void {
    this.router.navigate(['/report/list']);
  }

  trackByIndex(i: number): number {
    return i;
  }
}
