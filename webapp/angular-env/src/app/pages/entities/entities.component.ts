import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type VideoStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface UploaderInfo {
  name: string;
  role: string;
  source: string;
}

interface VideoRow {
  id: string;
  title: string;
  fileName: string;
  status: VideoStatus;
  durationSec: number;
  fps: number;
  resolution: string;
  size: string;
  faces: number;
  dominantEmotion: string;
  confidence: number;
  uploadedBy: UploaderInfo;
  createdAt: string;
}

const STATUS_ORDER: Record<VideoStatus, number> = {
  queued: 0,
  processing: 1,
  completed: 2,
  failed: 3
};


@Component({
  selector: 'app-entities',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './entities.component.html',
  styleUrl: './entities.component.css'
})
export class EntitiesComponent {
  displayedColumns: string[] = [
    'title',
    'status',
    'duration',
    'fps',
    'resolution',
    'size',
    'faces',
    'emotion',
    'confidence',
    'uploadedBy',
    'createdAt',
    'actions'
  ];

  dataSource = new MatTableDataSource<VideoRow>([
    {
      id: 'v_01b9f',
      title: 'Interview clip',
      fileName: 'interview_001.mp4',
      status: 'completed',
      durationSec: 183,
      fps: 30,
      resolution: '1920x1080',
      size: '312.4 MB',
      faces: 1,
      dominantEmotion: 'happy',
      confidence: 0.92,
      uploadedBy: { name: 'John Smith', role: 'Operator', source: 'Web UI' },
      createdAt: '2025-08-07T14:12:00Z'
    },
    {
      id: 'v_020aa',
      title: 'Focus group',
      fileName: 'group_focus.mov',
      status: 'processing',
      durationSec: 942,
      fps: 25,
      resolution: '1280x720',
      size: '1.02 GB',
      faces: 6,
      dominantEmotion: 'neutral',
      confidence: 0.61,
      uploadedBy: { name: 'Elena Petrova', role: 'Analyst', source: 'API' },
      createdAt: '2025-08-07T15:05:00Z'
    },
    {
      id: 'v_031cc',
      title: 'User session A',
      fileName: 'session_a.webm',
      status: 'queued',
      durationSec: 455,
      fps: 24,
      resolution: '1920x1080',
      size: '508.7 MB',
      faces: 1,
      dominantEmotion: 'surprised',
      confidence: 0.73,
      uploadedBy: { name: 'Alex Kim', role: 'QA Engineer', source: 'Mobile App' },
      createdAt: '2025-08-07T16:41:00Z'
    },
    {
      id: 'v_042de',
      title: 'Usability test 3',
      fileName: 'usability_3.mp4',
      status: 'failed',
      durationSec: 77,
      fps: 30,
      resolution: '3840x2160',
      size: '221.3 MB',
      faces: 2,
      dominantEmotion: 'angry',
      confidence: 0.58,
      uploadedBy: { name: 'Demo User', role: 'Admin', source: 'Web UI' },
      createdAt: '2025-08-06T09:32:00Z'
    },
    {
      id: 'v_053ef',
      title: 'Standup meeting',
      fileName: 'standup_2025-08-01.mkv',
      status: 'completed',
      durationSec: 1260,
      fps: 30,
      resolution: '1920x1080',
      size: '2.34 GB',
      faces: 8,
      dominantEmotion: 'neutral',
      confidence: 0.67,
      uploadedBy: { name: 'Olga Ivanova', role: 'Operator', source: 'API' },
      createdAt: '2025-08-01T07:55:00Z'
    }
  ]);


  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item: VideoRow, property: string) => {
      switch (property) {
        case 'uploadedBy': return item.uploadedBy.name;
        case 'createdAt':  return new Date(item.createdAt).getTime();
        case 'confidence': return item.confidence;
        case 'duration':   return item.durationSec;
        case 'status':     return STATUS_ORDER[item.status];
        default:           return (item as any)[property];
      }
    };
    this.dataSource.sort = this.sort;
  }

  toHms(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  onView(row: VideoRow): void {
    console.log('view', row.id);
  }

  onDelete(row: VideoRow): void {
    console.log('delete', row.id);
  }
}
