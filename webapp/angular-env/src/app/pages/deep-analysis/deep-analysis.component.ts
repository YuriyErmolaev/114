import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-deep-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf],
  templateUrl: './deep-analysis.component.html',
  styleUrls: ['./deep-analysis.component.css']
})
export class DeepAnalysisComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly apiBase = environment.apiUrl || '/api';

  userUid!: string;
  sessionId!: string;

  selectedFile: File | null = null;
  uploadedFilename: string | null = null;
  uploading = false;
  running = false;
  error: string | null = null;

  // Progress / status
  progress: number | null = null;
  statusMessage: string | null = null;
  canceled = false;

  // Results
  emotionsImgUrl: string | null = null;
  avatarGifUrl: string | null = null;
  csvUrl: string | null = null;

  // Progressive frames player
  framesBaseUrl: string | null = null;
  frames: string[] = [];
  private framesSet = new Set<string>();
  framesFps = 12;
  currentFrameUrl: string | null = null;
  private frameIndex = 0;

  // Landmarks preview
  landmarksCols: { x: string[]; y: string[] } = { x: [], y: [] };
  firstFrameLandmarks: { x: number[]; y: number[] } = { x: [], y: [] };

  // timers
  private pollTimer: any = null;
  private playbackTimer: any = null;

  constructor(private http: HttpClient, private session: SessionService) {}

  async ngOnInit(): Promise<void> {
    this.session.syncSessionToCurrentUser();
    this.userUid = this.session.getUserUid();
    this.sessionId = this.session.getSessionId();
    await this.ensureSession();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  private toAbs(p?: string | null): string | null {
    if (!p) return null;
    // If it already looks absolute (http/https), return as is
    if (/^https?:\/\//i.test(p)) return p;
    return `${this.apiBase}${p}`;
    }

  private async ensureSession(): Promise<void> {
    const url = `${this.apiBase}/core/`;
    const headers = new HttpHeaders({
      'X-User-Id': this.userUid,
      'X-Session-Id': this.sessionId
    });
    try {
      await lastValueFrom(this.http.post(url, null, { headers }));
    } catch {}
  }

  onOpenPicker(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.selectedFile = files[0] || null;
    this.uploadedFilename = null;
    input.value = '';
  }

  async upload(): Promise<void> {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.error = null;

    const headers = new HttpHeaders({
      'X-User-Id': this.userUid,
      'X-Session-Id': this.sessionId
    });
    const url = `${this.apiBase}/core/upload/uploads/${encodeURIComponent(this.sessionId)}/`;
    const form = new FormData();
    form.append('file', this.selectedFile, this.selectedFile.name);

    try {
      try {
        await lastValueFrom(this.http.post(url, form, { headers }));
      } catch (e: any) {
        if (e?.status === 404) {
          await this.ensureSession();
          await lastValueFrom(this.http.post(url, form, { headers }));
        } else {
          throw e;
        }
      }
      this.uploadedFilename = this.selectedFile.name;
    } catch (e: any) {
      this.error = e?.message || 'Upload failed';
    } finally {
      this.uploading = false;
    }
  }

  private resetRunState(): void {
    this.clearTimers();
    this.running = true;
    this.canceled = false;
    this.error = null;
    this.progress = 0;
    this.statusMessage = null;

    // clear previous results
    this.emotionsImgUrl = null;
    this.avatarGifUrl = null;
    this.csvUrl = null;

    // frames
    this.framesBaseUrl = null;
    this.frames = [];
    this.framesSet.clear();
    this.framesFps = 12;
    this.currentFrameUrl = null;
    this.frameIndex = 0;
  }

  async runAnalysis(): Promise<void> {
    if (!this.uploadedFilename) {
      this.error = 'Сначала загрузите файл.';
      return;
    }

    this.resetRunState();

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

    // Prefer async API
    const runAsyncUrl = `${this.apiBase}/analyze/run_async`;
    try {
      const startResp: any = await lastValueFrom(this.http.post(runAsyncUrl, body));
      const taskId = startResp?.task_id;
      if (!taskId) throw new Error('No task_id returned');
      this.schedulePoll(taskId, 0);
      return;
    } catch (e: any) {
      // Fallback to sync route for backward compatibility
      if (e?.status && [404, 405, 501].includes(e.status)) {
        await this.runAnalysisSyncFallback(body);
        return;
      }
      // If other error types (network, etc.), try fallback once as well
      try {
        await this.runAnalysisSyncFallback(body);
        return;
      } catch (e2: any) {
        this.error = e2?.message || e?.message || 'Анализ не выполнен';
        this.running = false;
      }
    }
  }

  private async runAnalysisSyncFallback(body: any): Promise<void> {
    const url = `${this.apiBase}/analyze/run`;
    try {
      const resp: any = await lastValueFrom(this.http.post(url, body));
      this.applyFinalResult(resp);
    } finally {
      this.running = false;
    }
  }

  private schedulePoll(taskId: string, delayMs: number): void {
    this.pollTimer = setTimeout(() => this.pollStatus(taskId), delayMs);
  }

  private async pollStatus(taskId: string): Promise<void> {
    if (this.canceled) return;
    const jitter = 700 + Math.floor(Math.random() * 500); // 700–1200ms
    const url = `${this.apiBase}/analyze/status/${encodeURIComponent(taskId)}`;
    try {
      const st: any = await lastValueFrom(this.http.get(url));
      // Update progress & status
      if (typeof st?.progress === 'number') this.progress = Math.max(0, Math.min(100, st.progress));
      this.statusMessage = st?.message || null;

      // Emotions plot preview as soon as available
      if (!this.emotionsImgUrl && st?.emo_url) {
        this.emotionsImgUrl = this.toAbs(st.emo_url);
      }

      // Frames progressive
      if (!this.framesBaseUrl && st?.frames_base_url) {
        this.framesBaseUrl = st.frames_base_url; // keep as server-provided; we'll prepend apiBase later
      }
      const base = this.framesBaseUrl || st?.result?.base || '';
      const fps = st?.frames_fps || st?.result?.avatar_frames?.fps;
      if (typeof fps === 'number' && fps > 0 && fps !== this.framesFps) {
        this.framesFps = Math.max(1, Math.min(30, Math.floor(fps)));
        this.startPlaybackTimer();
      }
      const newNames: string[] = Array.isArray(st?.frames) ? st.frames : [];
      if (newNames.length) this.appendFrames(base, newNames);

      // Final result
      if (st?.status === 'done' && st?.result) {
        this.applyFinalResult(st.result);
        this.running = false;
        this.clearTimers();
        return;
      }

      if (st?.status === 'error') {
        this.error = st?.error || 'Ошибка анализа';
        this.running = false;
        this.clearTimers();
        return;
      }

      // continue polling
      this.schedulePoll(taskId, jitter);
    } catch (e: any) {
      // Stop on status fetch errors
      this.error = e?.message || 'Ошибка статуса анализа';
      this.running = false;
      this.clearTimers();
    }
  }

  private appendFrames(base: string, names: string[]): void {
    if (!names || !names.length) return;
    if (!base) return; // wait until we know base URL
    for (const name of names) {
      if (!name || this.framesSet.has(name)) continue;
      this.framesSet.add(name);
      const url = this.toAbs(`${base}${name}`);
      if (url) this.frames.push(url);
    }
    // start playback if not started
    if (this.frames.length && !this.playbackTimer) {
      this.startPlaybackTimer();
    }
  }

  private startPlaybackTimer(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    if (!this.frames.length) return;
    const interval = Math.max(30, Math.floor(1000 / Math.max(1, this.framesFps)));
    this.playbackTimer = setInterval(() => {
      if (!this.frames.length) return;
      this.currentFrameUrl = this.frames[this.frameIndex % this.frames.length] || null;
      this.frameIndex = (this.frameIndex + 1) % Math.max(1, this.frames.length);
    }, interval);
  }

  cancelAnalysis(): void {
    if (!this.running) return;
    this.canceled = true;
    this.statusMessage = 'Отменено пользователем';
    this.clearTimers();
    this.running = false;
  }

  private applyFinalResult(resp: any): void {
    const toAbs = (p?: string | null) => this.toAbs(p);
    this.csvUrl = toAbs(resp?.csv?.url);
    this.avatarGifUrl = toAbs(resp?.avatar?.url);
    // prefer final emotions plot URL if provided
    this.emotionsImgUrl = this.emotionsImgUrl || toAbs(resp?.emotions_plot?.url);

    // frames: attach full list if available
    const files = resp?.avatar_frames?.files;
    const framesBase = this.framesBaseUrl || resp?.base || (files && files.length ? files[0]?.url?.replace(/[^/]+\/?$/, '') : null);
    const finalFps = resp?.avatar_frames?.fps;
    if (typeof finalFps === 'number' && finalFps > 0) this.framesFps = finalFps;
    if (Array.isArray(files) && framesBase) {
      const base = framesBase;
      const names: string[] = files.map((f: any) => f?.name || '')
        .filter((n: string) => !!n);
      this.appendFrames(base, names);
    }

    const landmarks = resp?.data?.landmarks || {};
    this.landmarksCols = { x: landmarks.x_cols || [], y: landmarks.y_cols || [] };
    this.firstFrameLandmarks = landmarks.first_frame || { x: [], y: [] };
  }
}
