import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { FaceLandmarkerService } from '../../services/face-landmarker.service';
import { HandsLandmarkerService } from '../../services/hands-landmarker.service';
import { PoseLandmarkerService } from '../../services/pose-landmarker.service';
import { VideoViewportComponent } from '../../components/video-viewport/video-viewport.component';
import { BlendShapesChartComponent } from '../../components/blend-shapes-chart/blend-shapes-chart.component';
import { BlendShapesPickerComponent } from '../../components/blend-shapes-picker/blend-shapes-picker.component';

import { environment } from '@env/environment';
import { SessionService } from '../../services/session.service';

@Component({
  standalone: true,
  selector: 'app-home-deep',
  imports: [
    CommonModule,
    FormsModule,
    NgForOf,
    NgIf,
    AsyncPipe,
    VideoViewportComponent,
    BlendShapesChartComponent,
    BlendShapesPickerComponent
  ],
  templateUrl: './home-deep.component.html',
  styleUrls: ['./home-deep.component.css']
})
export class HomeDeepComponent implements OnInit, OnDestroy {
  readonly labels = {
    addPatientInfo: 'Дополнительная информация',
    questionLabel: 'Текст вопроса',
    questionPlaceholder: 'Блок вопросов',
    spaceHint: 'Нажимайте Пробел перед каждым шагом, чтобы получить разметку',
    finish: 'Завершить интервью',
    saveRecording: 'Сохранять запись',
    deepAnalysis: 'Глубокий анализ',
    resultHint: 'Вы можете посмотреть результаты после окончания анализа'
  } as const;

  constructor(
    private readonly face: FaceLandmarkerService,
    private readonly hands: HandsLandmarkerService,
    private readonly pose: PoseLandmarkerService,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly session: SessionService,
  ) {}

  // Session/API
  private readonly apiBase = environment.apiUrl || '/api';
  userUid!: string;
  sessionId!: string;

  // Source and player
  webcamEnabled = false;
  running = false;
  sourceMode: 'camera' | 'video' = 'camera';
  anSrc: string | MediaStream | null = null;

  get videoBlendShapes$() { return this.face.videoBlendShapes$; }

  selectedCategory: 'mimic' | 'gestures' | 'pose' = 'mimic';

  gestureItems: Array<{ categoryName: string; displayName?: string; score: number }> = [
    { categoryName: 'handOpen', displayName: 'Open palm', score: 0 },
    { categoryName: 'fist', displayName: 'Fist', score: 0 },
    { categoryName: 'pointing', displayName: 'Pointing', score: 0 },
    { categoryName: 'pinch', displayName: 'Pinch', score: 0 },
    { categoryName: 'okSign', displayName: 'OK sign', score: 0 },
  ];

  poseItems: Array<{ categoryName: string; displayName?: string; score: number }> = [
    { categoryName: 'leanForward', displayName: 'Lean forward', score: 0 },
    { categoryName: 'leanBack', displayName: 'Lean back', score: 0 },
    { categoryName: 'turnLeft', displayName: 'Turn left', score: 0 },
    { categoryName: 'turnRight', displayName: 'Turn right', score: 0 },
    { categoryName: 'shouldersUp', displayName: 'Shoulders up', score: 0 },
  ];

  readonly overlayRender = async (args: { ctx: CanvasRenderingContext2D; video: HTMLVideoElement; canvas: HTMLCanvasElement; timestampMs: number }) => {
    if (this.landmarksEnabled) {
      await this.face.renderOverlay(args.video, args.ctx, args.timestampMs);
    }
    if (this.gesturesEnabled) {
      await this.hands.renderOverlay(args.video, args.ctx, args.timestampMs);
    }
    if (this.poseEnabled) {
      await this.pose.renderOverlay(args.video, args.ctx, args.timestampMs);
    }
  };

  sources: Array<{ id: '' | 'camera' | 'deviceFile' | 'serverFile' | 'ipCamera'; name: string }> = [
    { id: '', name: 'Не выбран' },
    { id: 'camera', name: 'Веб-камера' },
    { id: 'deviceFile', name: 'Файл с устройства' },
    { id: 'serverFile', name: 'Файл с сервера' },
    { id: 'ipCamera', name: 'IP-камера' }
  ];
  selectedSource: '' | 'camera' | 'deviceFile' | 'serverFile' | 'ipCamera' = '';

  landmarksEnabled = true;
  gesturesEnabled = false;
  poseEnabled = false;
  showGrid = (typeof window !== 'undefined' && window.localStorage?.getItem('video.grid.enabled') === '1') || false;
  filter = '';
  categoryFilter = '';

  // UI state from original Home
  loadedDeviceFileName: string | null = null;
  loadedServerUrl: string | null = null;
  ipCameraUrl: string | null = null;
  showServerFileDialog = false;
  serverUrlInput = '';
  showWebcamSettings = false;
  showIpCameraSettings = false;

  // Save/recording from original Home
  isRecording = false;
  recordingBusy = false;
  showSavingModal = false;
  savingInProgress = false;
  private savingTimeout: any = null;

  // Deep analysis state
  deepAnalysisRunning = false;
  deepAnalysisProgress = 0;
  deepAnalysisStatus = '';
  private deepInterval: any = null;
  deepIndeterminate = false;
  private pendingTimer: any = null;
  private deepPollTimer: any = null;
  private deepTaskId: string | null = null;

  // Integration: backend upload + results
  uploadedFilename: string | null = null;
  error: string | null = null;
  emotionsImgUrl: string | null = null;
  avatarGifUrl: string | null = null;
  csvUrl: string | null = null;
  landmarksCols: { x: string[]; y: string[] } = { x: [], y: [] };
  firstFrameLandmarks: { x: number[]; y: number[] } = { x: [], y: [] };

  // Avatar frames player
  avatarFrames: string[] = [];
  avatarFps = 10;
  avatarIndex = 0;
  avatarPlaying = false;
  private avatarTimer: any = null;

  async ngOnInit(): Promise<void> {
    // prepare session for backend operations
    this.session.syncSessionToCurrentUser();
    this.userUid = this.session.getUserUid();
    this.sessionId = this.session.getSessionId();
    await this.ensureSession();
  }

  private async ensureSession(): Promise<void> {
    const url = `${this.apiBase}/core/`;
    const headers = new HttpHeaders({ 'X-User-Id': this.userUid, 'X-Session-Id': this.sessionId });
    try { await lastValueFrom(this.http.post(url, null, { headers })); } catch {}
  }

  // Source selection handlers
  get settingsEnabled(): boolean { return this.selectedSource === 'camera' || this.selectedSource === 'ipCamera'; }
  get secondaryEnabled(): boolean { return this.selectedSource !== ''; }
  get secondaryLabel(): string {
    switch (this.selectedSource) {
      case 'camera': return this.running ? 'Остановить' : 'Включить камеру';
      case 'deviceFile': return 'Выбрать файл';
      case 'serverFile': return 'Открыть URL';
      case 'ipCamera': return this.running ? 'Остановить' : 'Старт';
      default: return '—';
    }
  }

  onSourceChange(value: '' | 'camera' | 'deviceFile' | 'serverFile' | 'ipCamera'): void {
    this.selectedSource = value;
    this.stop();
    this.loadedDeviceFileName = null;
    this.loadedServerUrl = null;
    this.sourceMode = value === 'camera' || value === 'ipCamera' ? 'camera' : 'video';
  }

  async onSecondaryAction(fileInput?: HTMLInputElement): Promise<void> {
    switch (this.selectedSource) {
      case 'camera':
        if (this.running) this.stop(); else await this.startUserCamera();
        break;
      case 'deviceFile':
        fileInput?.click();
        break;
      case 'serverFile':
        this.serverUrlInput = this.loadedServerUrl || '';
        this.showServerFileDialog = true;
        break;
      case 'ipCamera':
        if (this.running) this.stop(); else await this.startIpCamera();
        break;
    }
  }

  private async startUserCamera(): Promise<void> {
    this.stopCurrentStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      this.anSrc = stream;
      this.webcamEnabled = true;
      this.running = true;
    } catch (e) {
      console.warn('[home-deep] getUserMedia failed', e);
      alert('Не удалось получить доступ к камере');
    }
  }

  private async startIpCamera(): Promise<void> {
    if (!this.ipCameraUrl) return;
    this.stopCurrentStream();
    this.anSrc = null;
    this.webcamEnabled = false;
    this.running = true;
  }

  async onFileChosen(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.loadedDeviceFileName = file.name;
    const url = URL.createObjectURL(file);
    this.anSrc = url;
    this.sourceMode = 'video';
    this.webcamEnabled = true;
    this.running = false;

    // Upload to backend in background
    await this.uploadFileToBackend(file);
    input.value = '';
  }

  async uploadFileToBackend(file: File): Promise<void> {
    this.error = null;
    const headers = new HttpHeaders({ 'X-User-Id': this.userUid, 'X-Session-Id': this.sessionId });
    const url = `${this.apiBase}/core/upload/uploads/${encodeURIComponent(this.sessionId)}/`;
    const form = new FormData();
    form.append('file', file, file.name);
    try {
      try { await lastValueFrom(this.http.post(url, form, { headers })); }
      catch (e: any) {
        if (e?.status === 404) { await this.ensureSession(); await lastValueFrom(this.http.post(url, form, { headers })); }
        else { throw e; }
      }
      this.uploadedFilename = file.name;
    } catch (e: any) {
      this.error = e?.message || 'Upload failed';
      this.uploadedFilename = null;
    }
  }

  confirmServerUrl(): void {
    const u = (this.serverUrlInput || '').trim();
    this.loadedServerUrl = u || null;
    this.showServerFileDialog = false;
    if (this.loadedServerUrl) {
      this.anSrc = this.loadedServerUrl;
      this.sourceMode = 'video';
      this.webcamEnabled = true;
      this.running = false;
    }
  }
  cancelServerUrl(): void { this.showServerFileDialog = false; }
  openWebcamSettings(): void { if (this.settingsEnabled) this.showWebcamSettings = true; }
  closeWebcamSettings(): void { this.showWebcamSettings = false; }
  openIpCameraSettings(): void { this.showIpCameraSettings = true; }
  closeIpCameraSettings(): void { this.showIpCameraSettings = false; }

  stop(): void {
    this.running = false;
    this.stopCurrentStream();
    this.webcamEnabled = false;
    this.anSrc = null;
  }

  uploadInterview(): void { this.router.navigate(['/interview/offline/create']); }
  conductInterview(): void { this.router.navigate(['/interview/online/create']); }

  toggleLandmarks(checked: boolean): void { this.landmarksEnabled = checked; }
  onFilterChange(v: string): void { this.filter = v; }

  private stopCurrentStream(): void {
    if (this.anSrc instanceof MediaStream) {
      try { this.anSrc.getTracks().forEach(t => t.stop()); } catch {}
    }
  }

  onAddPatientInfo(): void { console.log('open patient form'); }
  onFinish(): void { console.log('finish interview'); }

  toggleSaveRecording(checked: boolean): void { console.log(`recording ${checked ? 'on' : 'off'}`); }

  toggleRecording(checked: boolean): void {
    this.recordingBusy = true;
    window.clearTimeout(this.savingTimeout);
    const target = !!checked;
    setTimeout(() => {
      this.isRecording = target;
      this.recordingBusy = false;
    }, 400);
  }

  onSaveClick(): void {
    this.showSavingModal = true;
    this.savingInProgress = true;
    window.clearTimeout(this.savingTimeout);
    this.savingTimeout = setTimeout(() => { this.savingInProgress = false; }, 1000);
  }

  closeSaveModal(): void {
    this.showSavingModal = false;
    if (this.savingInProgress) {
      window.clearTimeout(this.savingTimeout);
      this.savingInProgress = false;
    }
  }

  async startDeepAnalysis(): Promise<void> {
    if (this.deepAnalysisRunning) return;
    if (!this.uploadedFilename && this.loadedDeviceFileName) {
      this.deepAnalysisStatus = 'Файл не загружен. Выберите видео из "Файл с устройства" ещё раз.';
      return;
    }
    if (!this.uploadedFilename) {
      this.deepAnalysisStatus = 'Нет видеофайла для анализа';
      return;
    }

    this.deepAnalysisRunning = true;
    this.deepAnalysisProgress = 1;
    this.deepAnalysisStatus = 'Запуск анализа...';

    // enable pending animation
    this.deepIndeterminate = true;
    try { window.clearInterval(this.pendingTimer); } catch {}
    let t = 0;
    this.pendingTimer = setInterval(() => {
      if (!this.deepIndeterminate) return;
      t += 1;
      const phase = (t % 80) / 80; // 0..1
      const val = 10 + Math.abs(Math.sin(phase * Math.PI * 2)) * 80; // 10..90
      this.deepAnalysisProgress = Math.round(val);
      this.deepAnalysisStatus = 'Анализ выполняется...';
    }, 200);

    const body = {
      session_id: this.sessionId,
      filename: this.uploadedFilename,
      artifacts: 'artifacts',
      fps: 12,
      skip_frames: 1,
      face_threshold: 0.9,
      render_avatar: true,
      avatar_source: 'hmm'
    };

    try {
      // Start async task
      const start: any = await lastValueFrom(this.http.post(`${this.apiBase}/analyze/run_async`, body));
      const taskId = start?.task_id as string;
      if (!taskId) { throw new Error('Не удалось запустить анализ'); }
      this.deepTaskId = taskId;

      // Poll status
      try { window.clearInterval(this.deepPollTimer); } catch {}
      this.deepPollTimer = setInterval(async () => {
        try {
          const st: any = await lastValueFrom(this.http.get(`${this.apiBase}/analyze/status/${taskId}`));
          const status = st?.status as string;
          const p = Number(st?.progress ?? 0);
          if (Number.isFinite(p)) {
            this.deepAnalysisProgress = Math.max(1, Math.min(100, Math.round(p)));
          }
          if (st?.message) this.deepAnalysisStatus = st.message;
          if (typeof st?.frames_done === 'number' && typeof st?.frames_total === 'number' && st.frames_total > 0) {
            // Show partial progress numerically
            this.deepAnalysisStatus = `Кадры: ${st.frames_done} / ${st.frames_total}`;
          }

          if (status === 'done') {
            const resp = st?.result || {};
            const toAbs = (p?: string | null) => (p ? `${this.apiBase}${p}` : null);
            this.csvUrl = toAbs(resp?.csv?.url);
            this.avatarGifUrl = toAbs(resp?.avatar?.url);
            this.emotionsImgUrl = toAbs(resp?.emotions_plot?.url);
            const landmarks = resp?.data?.landmarks || {};
            this.landmarksCols = { x: landmarks.x_cols || [], y: landmarks.y_cols || [] };
            this.firstFrameLandmarks = landmarks.first_frame || { x: [], y: [] };

            // Avatar frames
            const afr = resp?.avatar_frames || {};
            const files = Array.isArray(afr.files) ? afr.files : [];
            const fps = Number(afr.fps || 10);
            const toAbsFile = (f: any) => (typeof f?.url === 'string' ? `${this.apiBase}${f.url}` : null);
            this.avatarFrames = files.map(toAbsFile).filter((u: string | null): u is string => !!u);
            this.avatarFps = fps > 0 && fps <= 60 ? fps : 10;
            this.avatarIndex = 0;
            this.stopAvatar();

            this.deepIndeterminate = false;
            this.deepAnalysisProgress = 100;
            this.deepAnalysisStatus = 'Анализ завершён';
            this.deepAnalysisRunning = false;
            try { window.clearInterval(this.pendingTimer); } catch {}
            try { window.clearInterval(this.deepPollTimer); } catch {}
          } else if (status === 'error') {
            this.error = st?.error || 'Анализ не выполнен';
            this.deepIndeterminate = false;
            this.deepAnalysisStatus = 'Ошибка анализа';
            this.deepAnalysisRunning = false;
            try { window.clearInterval(this.pendingTimer); } catch {}
            try { window.clearInterval(this.deepPollTimer); } catch {}
          }
        } catch (e) {
          // Stop polling on fetch error
          try { window.clearInterval(this.deepPollTimer); } catch {}
        }
      }, 1000);
    } catch (e: any) {
      this.error = e?.message || 'Анализ не выполнен';
      this.deepIndeterminate = false;
      this.deepAnalysisStatus = 'Ошибка анализа';
      this.deepAnalysisRunning = false;
      try { window.clearInterval(this.pendingTimer); } catch {}
    }
  }

  cancelDeepAnalysis(): void {
    if (!this.deepAnalysisRunning && !this.deepIndeterminate) return;
    this.deepAnalysisRunning = false;
    this.deepIndeterminate = false;
    try { window.clearInterval(this.pendingTimer); } catch {}
    try { window.clearInterval(this.deepPollTimer); } catch {}
    this.deepAnalysisStatus = 'Анализ прерван';
  }

  // --- Avatar frames player controls ---
  playAvatar(): void {
    if (!this.avatarFrames?.length) return;
    if (this.avatarPlaying) return;
    this.avatarPlaying = true;
    const interval = Math.max(20, Math.round(1000 / Math.max(1, this.avatarFps)));
    try { window.clearInterval(this.avatarTimer); } catch {}
    this.avatarTimer = setInterval(() => {
      if (!this.avatarPlaying || !this.avatarFrames?.length) return;
      this.avatarIndex = (this.avatarIndex + 1) % this.avatarFrames.length;
    }, interval);
  }

  stopAvatar(): void {
    this.avatarPlaying = false;
    try { window.clearInterval(this.avatarTimer); } catch {}
  }

  toggleAvatar(): void {
    if (this.avatarPlaying) this.stopAvatar(); else this.playAvatar();
  }

  onAvatarIndexChange(i: number): void {
    const n = this.avatarFrames?.length || 0;
    if (n === 0) return;
    const clamped = Math.max(0, Math.min(n - 1, Math.round(i)));
    this.avatarIndex = clamped;
  }

  ngOnDestroy(): void {
    try { window.clearInterval(this.deepInterval); } catch {}
    try { window.clearTimeout(this.savingTimeout); } catch {}
    try { window.clearInterval(this.pendingTimer); } catch {}
    try { window.clearInterval(this.avatarTimer); } catch {}
    this.stopCurrentStream();
  }

  overlayDropdownOpen = false;
  toggleOverlayDropdown(): void { this.overlayDropdownOpen = !this.overlayDropdownOpen; }
  setActiveMask(mask: 'mimic' | 'gestures' | 'pose'): void { this.selectedCategory = mask; }

  matchesCategory(label: string): boolean {
    const q = (this.categoryFilter || '').trim().toLowerCase();
    if (!q) return true;
    return label.toLowerCase().includes(q);
  }

  toggleMask(mask: 'mimic' | 'gestures' | 'pose'): void {
    switch (mask) {
      case 'mimic': this.landmarksEnabled = !this.landmarksEnabled; break;
      case 'gestures': this.gesturesEnabled = !this.gesturesEnabled; break;
      case 'pose': this.poseEnabled = !this.poseEnabled; break;
    }
    this.selectedCategory = mask;
    this.ensureSelectedCategoryValid();
  }

  disableMask(mask: 'mimic' | 'gestures' | 'pose'): void {
    switch (mask) {
      case 'mimic': this.landmarksEnabled = false; break;
      case 'gestures': this.gesturesEnabled = false; break;
      case 'pose': this.poseEnabled = false; break;
    }
    if (this.selectedCategory === mask) {
      this.ensureSelectedCategoryValid();
    }
  }

  private ensureSelectedCategoryValid(): void {
    const order: Array<{ key: 'mimic' | 'gestures' | 'pose'; enabled: boolean }> = [
      { key: 'mimic', enabled: this.landmarksEnabled },
      { key: 'gestures', enabled: this.gesturesEnabled },
      { key: 'pose', enabled: this.poseEnabled },
    ];
    const current = order.find(o => o.key === this.selectedCategory);
    if (current && current.enabled) return;
    const firstEnabled = order.find(o => o.enabled);
    if (firstEnabled) this.selectedCategory = firstEnabled.key;
  }

  // keyboard shortcuts from original Home
  @HostListener('window:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent): void {
    if (ev.code === 'Space') {
      ev.preventDefault();
      if (this.running) this.stop(); else {
        if (this.selectedSource === 'camera') this.startUserCamera();
        if (this.selectedSource === 'ipCamera') this.startIpCamera();
      }
    }
  }
}
