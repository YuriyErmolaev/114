import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule, NgForOf, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaceLandmarkerService } from '../../services/face-landmarker.service';
import { HandsLandmarkerService } from '../../services/hands-landmarker.service';
import { PoseLandmarkerService } from '../../services/pose-landmarker.service';
import { VideoViewportComponent } from '../../components/video-viewport/video-viewport.component';
import { BlendShapesChartComponent } from '../../components/blend-shapes-chart/blend-shapes-chart.component';
import { BlendShapesPickerComponent } from '../../components/blend-shapes-picker/blend-shapes-picker.component';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-home',
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
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy {
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
    private readonly router: Router
  ) {}


  webcamEnabled = false;
  running = false;
  sourceMode: 'camera' | 'video' = 'camera';
  anSrc: string | MediaStream | null = null; // current media source


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

  selectedGestureNames: string[] = [];
  selectedPoseNames: string[] = [];

  readonly overlayRender = async (args: { ctx: CanvasRenderingContext2D; video: HTMLVideoElement; canvas: HTMLCanvasElement; timestampMs: number }) => {
    // Compose overlays from enabled modules
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
  showGrid =
    (typeof window !== 'undefined' && window.localStorage?.getItem('video.grid.enabled') === '1') || false;
  filter = '';
  categoryFilter = '';


  displayType: 'chart' | 'values' | 'sync' = 'chart';

  selectedNames: string[] = ['browDownLeft', 'browDownRight', 'browInnerUp', 'mouthSmileRight', 'mouthSmileLeft'];

  loadedDeviceFileName: string | null = null;
  loadedServerUrl: string | null = null;
  ipCameraUrl: string | null = null;

  showWebcamSettings = false;
  showServerFileDialog = false;
  serverUrlInput = '';
  showIpCameraSettings = false;

  private excludeNeutral = true;

  private isNeutral(name: string): boolean {
    const n = (name || '').toLowerCase();
    return n === 'neutral' || n === '_neutral';
  }

  valueItems(items: Array<{ categoryName: string; displayName?: string; score: number }> | null) {
    if (!Array.isArray(items)) return [];
    const base = this.excludeNeutral ? items.filter(i => !this.isNeutral(i.categoryName)) : items;
    const wanted = this.selectedNames.map(s => s.toLowerCase());
    if (wanted.length === 0) return base.slice(0, 4);
    const set = new Set(wanted);
    const picked = base.filter(
      i => set.has(i.categoryName.toLowerCase()) || set.has((i.displayName || '').toLowerCase())
    );
    return picked.length ? picked : base.slice(0, 4);
  }

  get settingsEnabled(): boolean {
    if (this.selectedSource === '') return false;
    if (this.selectedSource === 'deviceFile') return !!this.loadedDeviceFileName; // enabled after file chosen
    return true; // camera, serverFile, ipCamera
  }

  get secondaryLabel(): string {
    switch (this.selectedSource) {
      case 'camera':
        return this.running ? 'Остановить' : 'Включить камеру';
      case 'deviceFile':
        return 'Загрузить файл';
      case 'serverFile':
        return 'Открыть ссылку';
      case 'ipCamera':
        return this.running ? 'Остановить' : 'Включить камеру';
      default:
        return 'Недоступно';
    }
  }

  get secondaryEnabled(): boolean {
    switch (this.selectedSource) {
      case '':
        return false;
      case 'camera':
        return true;
      case 'deviceFile':
        return true;
      case 'serverFile':
        return true;
      case 'ipCamera':
        return !!this.ipCameraUrl; // only if URL provided
    }
  }

  get showPlayer(): boolean {
    if (this.running) return true;
    if (this.selectedSource === '') return false;
    if (this.secondaryEnabled) return true;
    if (this.loadedDeviceFileName || this.loadedServerUrl || this.ipCameraUrl) return true;
    return false;
  }

  onSourceChange(value: '' | 'camera' | 'deviceFile' | 'serverFile' | 'ipCamera'): void {
    // reset and do not auto-start
    this.selectedSource = value;
    this.stop();
    this.loadedDeviceFileName = null;
    this.loadedServerUrl = null;
    // update viewport mode
    this.sourceMode = value === 'camera' || value === 'ipCamera' ? 'camera' : 'video';
  }

  async onSecondaryAction(fileInput?: HTMLInputElement): Promise<void> {
    switch (this.selectedSource) {
      case 'camera':
        if (this.running) this.stop();
        else await this.startUserCamera();
        break;
      case 'deviceFile':
        fileInput?.click();
        break;
      case 'serverFile':
        this.serverUrlInput = this.loadedServerUrl || '';
        this.showServerFileDialog = true;
        break;
      case 'ipCamera':
        if (this.running) this.stop();
        else await this.startIpCamera();
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
      console.warn('[home] getUserMedia failed', e);
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

  onFileChosen(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.loadedDeviceFileName = file.name;
    const url = URL.createObjectURL(file);
    this.anSrc = url;
    this.sourceMode = 'video';
    this.webcamEnabled = true;
    this.running = false;
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


  isRecording = false;
  recordingBusy = false;


  showSavingModal = false;
  savingInProgress = false;
  private savingTimeout: any = null;


  deepAnalysisRunning = false;
  deepAnalysisProgress = 0;
  deepAnalysisStatus = '';
  private deepInterval: any = null;


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
    this.savingTimeout = setTimeout(() => {
      this.savingInProgress = false;
    }, 1000);
  }

  closeSaveModal(): void {
    this.showSavingModal = false;
    if (this.savingInProgress) {
      window.clearTimeout(this.savingTimeout);
      this.savingInProgress = false;
    }
  }

  startDeepAnalysis(): void {
    if (this.deepAnalysisRunning) return;
    this.deepAnalysisRunning = true;
    this.deepAnalysisProgress = 0;
    this.deepAnalysisStatus = 'Анализ начат';
    window.clearInterval(this.deepInterval);
    this.deepInterval = setInterval(() => {
      this.deepAnalysisProgress = Math.min(100, this.deepAnalysisProgress + 3);
      this.deepAnalysisStatus = `Анализ: ${this.deepAnalysisProgress}%`;
      if (this.deepAnalysisProgress >= 100) {
        this.deepAnalysisRunning = false;
        this.deepAnalysisStatus = 'Анализ завершен';
        window.clearInterval(this.deepInterval);
      }
    }, 120);
  }

  cancelDeepAnalysis(): void {
    if (!this.deepAnalysisRunning) return;
    this.deepAnalysisRunning = false;
    window.clearInterval(this.deepInterval);
    this.deepAnalysisStatus = 'Анализ прерван';
  }

  ngOnDestroy(): void {
    try { window.clearInterval(this.deepInterval); } catch {}
    try { window.clearTimeout(this.savingTimeout); } catch {}
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (this.overlayDropdownOpen) this.overlayDropdownOpen = false;
  }
}
