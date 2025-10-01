import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, AsyncPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { FaceLandmarkerService } from '../../../services/face-landmarker.service';
import { VideoViewportComponent } from '../../../components/video-viewport/video-viewport.component';
import { VideoDisplayControlsComponent } from '../../../components/video-display-controls/video-display-controls.component';
import { BlendShapesChartComponent } from '../../../components/blend-shapes-chart/blend-shapes-chart.component';
import { BlendShapesPickerComponent } from '../../../components/blend-shapes-picker/blend-shapes-picker.component';

interface InterviewDetail {
  uuid: string;
  title: string;
  interviewer: string;
  status: string;
}

@Component({
  selector: 'app-interview-detail',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    AsyncPipe,
    FormsModule,
    RouterModule,
    VideoViewportComponent,
    VideoDisplayControlsComponent,
    BlendShapesChartComponent,
    BlendShapesPickerComponent
  ],
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css']
})
export class DetailComponent implements OnInit {
  uuid = '';
  item: InterviewDetail | null = null;
  loading = true;
  notFound = false;

  webcamEnabled = false;
  running = false;
  landmarksEnabled = true;
  showGrid =
    (typeof window !== 'undefined' && window.localStorage?.getItem('video.grid.enabled') === '1') || false;

  sourceMode: 'camera' | 'video' = 'video';
  anSrc: string | MediaStream | undefined;
  autoplay = false;

  selectedNames: string[] = [
    'browDownLeft',
    'browDownRight',
    'browInnerUp',
    'mouthSmileRight',
    'mouthSmileLeft'
  ];

  displayType: 'chart' | 'values' | 'sync' = 'chart';
  filter = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private readonly face: FaceLandmarkerService
  ) {}

  get videoBlendShapes$() {
    return this.face.videoBlendShapes$;
  }

  readonly overlayRender = async (args: {
    ctx: CanvasRenderingContext2D;
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    timestampMs: number;
  }) => {
    if (!this.landmarksEnabled) return;
    await this.face.renderOverlay(args.video, args.ctx, args.timestampMs);
  };

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || '';
    console.log('[detail] uuid', this.uuid);
    this.http.get<InterviewDetail[]>('/assets/demo/interviews.json').subscribe({
      next: rows => {
        this.item = rows.find(r => r.uuid === this.uuid) || null;
        this.notFound = !this.item;
        this.loading = false;
        this.sourceMode = 'video';
        this.anSrc = '/assets/demo/demo.mp4';
        this.autoplay = false;

      },
      error: () => {
        this.loading = false;
        this.notFound = true;
      }
    });
  }

  back(): void {
    this.router.navigate(['/interview/list']);
  }

  onSourceChange(value: '' | 'camera' | 'video'): void {
    this.autoplay = false;
    if (value === 'camera') {
      this.selectCamera(false);
    } else if (value === 'video') {
      this.selectDemo(false);
    } else {
      this.stop();
    }
  }

  async selectCamera(auto: boolean): Promise<void> {
    this.stopCurrentStream();
    this.sourceMode = 'camera';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      this.anSrc = stream;
      this.webcamEnabled = true;
      this.running = auto;
      this.autoplay = auto;
    } catch (e) {
      console.warn('[detail] getUserMedia failed', e);
      this.webcamEnabled = false;
      this.running = false;
    }
  }

  selectDemo(auto: boolean): void {
    this.stopCurrentStream();
    this.sourceMode = 'video';
    this.webcamEnabled = false;
    this.running = false;

    this.anSrc = undefined;
    setTimeout(() => {
      this.anSrc = '/assets/demo/demo.mp4?v=' + Date.now();
      this.autoplay = !!auto;
    });
  }

  startAnalysis(): void {
    this.landmarksEnabled = true;
    this.selectDemo(true);
  }

  stop(): void {
    this.running = false;
    this.autoplay = false;
    this.stopCurrentStream();
    this.webcamEnabled = false;
    this.anSrc = undefined;
  }

  toggleLandmarks(checked: boolean): void {
    this.landmarksEnabled = checked;
  }

  onFilterChange(v: string): void {
    this.filter = v;
  }

  onFinish(): void {
    console.log('interview finished');
  }

  private stopCurrentStream(): void {
    if (this.anSrc instanceof MediaStream) {
      try {
        this.anSrc.getTracks().forEach(t => t.stop());
      } catch {}
    }
  }
}
