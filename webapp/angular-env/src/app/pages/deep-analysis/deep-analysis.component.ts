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

    // CSV name for staged pipeline
    private csvName: string | null = null;

  // Staged task ids
  private predictTaskId: string | null = null;
  private emoTaskId: string | null = null;
  private framesTaskId: string | null = null;

  // timers
  private pollPredictTimer: any = null;
  private pollEmoTimer: any = null;
  private pollFramesTimer: any = null;
  private pollTimer: any = null; // legacy /run_async polling
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
    if (this.pollPredictTimer) {
      clearTimeout(this.pollPredictTimer);
      this.pollPredictTimer = null;
    }
    if (this.pollEmoTimer) {
      clearTimeout(this.pollEmoTimer);
      this.pollEmoTimer = null;
    }
    if (this.pollFramesTimer) {
      clearTimeout(this.pollFramesTimer);
      this.pollFramesTimer = null;
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

  private cacheBust(url: string | null): string | null {
    if (!url) return url;
    const t = Date.now();
    return url.includes('?') ? `${url}&t=${t}` : `${url}?t=${t}`;
  }

  private setEmotionsImgFrom(rawUrl?: string | null): void {
    if (!rawUrl || this.emotionsImgUrl) return;
    try {
      const abs = this.toAbs(rawUrl);
      if (!abs) {
        console.error('[DeepAnalysis] EMO PLOT build error', { apiBase: this.apiBase, emo_url: rawUrl });
        return;
      }
      const finalUrl = this.cacheBust(abs)!;
      console.log('[DeepAnalysis] EMO PLOT request', { raw: rawUrl, final: finalUrl });
      const im = new Image();
      im.onload = () => {
        console.log('[DeepAnalysis] EMO PLOT loaded', { w: im.naturalWidth, h: im.naturalHeight });
        this.emotionsImgUrl = finalUrl;
      };
      im.onerror = (e) => {
        console.error('[DeepAnalysis] EMO PLOT load error', e);
      };
      im.src = finalUrl;
    } catch (e: any) {
      console.error('[DeepAnalysis] EMO PLOT exception', e?.stack || e?.message || e);
    }
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

    // staged ids & csv
    this.predictTaskId = null;
    this.emoTaskId = null;
    this.framesTaskId = null;
    this.csvName = null;

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

    const payload = {
      session_id: this.sessionId,
      filename: this.uploadedFilename,
      artifacts: 'artifacts',
      fps: 12,
      skip_frames: 1,
      face_threshold: 0.9,
    };

    // Stage 1: start_predict
    console.log('[DeepAnalysis] START predict payload', payload);
    const startPredictUrl = `${this.apiBase}/analyze/start_predict`;
    try {
      const startResp: any = await lastValueFrom(this.http.post(startPredictUrl, payload));
      console.log('[DeepAnalysis] START predict response', startResp);
      this.predictTaskId = startResp?.task_id || null;
      if (!this.predictTaskId) throw new Error('No task_id from start_predict');
      this.schedulePredictPoll(0);
    } catch (e: any) {
      console.error('[DeepAnalysis] start_predict error', e?.stack || e?.message || e);
      // Fallback to legacy async route
      await this.startLegacyAsyncFlow(payload);
    }
  }

  private async runAnalysisSyncFallback(body: any): Promise<void> {
    const url = `${this.apiBase}/analyze/run`;
    try {
      const resp: any = await lastValueFrom(this.http.post(url, body));
      console.log('[DeepAnalysis] Sync /analyze/run response (finalResult)', { finalResult: resp });
      this.applyFinalResult(resp);
    } catch (e: any) {
      console.error('[DeepAnalysis] /analyze/run error', e?.stack || e?.message || e);
      throw e;
    } finally {
      this.running = false;
    }
  }

  private schedulePredictPoll(delayMs: number): void {
    if (!this.predictTaskId) return;
    this.pollPredictTimer = setTimeout(() => this.pollPredictStatus(), delayMs);
  }

  private async pollPredictStatus(): Promise<void> {
    if (this.canceled || !this.predictTaskId) return;
    const jitter = 700 + Math.floor(Math.random() * 500);
    const url = `${this.apiBase}/analyze/status_predict/${encodeURIComponent(this.predictTaskId)}`;
    try {
      const st: any = await lastValueFrom(this.http.get(url));
      const csvReady = !!st?.csv_name;
      console.log('[DeepAnalysis] STATUS predict', { url, status: st?.status, progress: st?.progress, csvReady });
      if (typeof st?.progress === 'number') this.progress = Math.max(0, Math.min(100, st.progress));
      this.statusMessage = st?.message || null;

      if (csvReady) {
        this.csvName = st.csv_name;
        this.csvUrl = this.toAbs(st.csv_url);
        // Kick off emotions and frames stages in parallel if not started
        if (!this.emoTaskId && this.csvName) {
          await this.startEmotionsStage(this.csvName);
        }
        if (!this.framesTaskId && this.csvName) {
          await this.startFramesStage(this.csvName);
        }
      }

      if (st?.status === 'error') {
        console.error('[DeepAnalysis] STATUS predict error', st?.error);
        this.error = st?.error || 'Ошибка предсказания';
        return;
      }

      if (st?.status !== 'done') {
        this.schedulePredictPoll(jitter);
      }
    } catch (e: any) {
      console.error('[DeepAnalysis] STATUS predict fetch error', e?.stack || e?.message || e);
      this.error = e?.message || 'Ошибка статуса предсказания';
    }
  }

  private async startEmotionsStage(csvName: string): Promise<void> {
    const url = `${this.apiBase}/analyze/start_emotions`;
    const payload = { session_id: this.sessionId, csv_name: csvName };
    try {
      const resp: any = await lastValueFrom(this.http.post(url, payload));
      this.emoTaskId = resp?.task_id || null;
      this.scheduleEmoPoll(0);
    } catch (e: any) {
      console.error('[DeepAnalysis] start_emotions error', e?.stack || e?.message || e);
    }
  }

  private scheduleEmoPoll(delayMs: number): void {
    if (!this.emoTaskId) return;
    this.pollEmoTimer = setTimeout(() => this.pollEmoStatus(), delayMs);
  }

  private async pollEmoStatus(): Promise<void> {
    if (this.canceled || !this.emoTaskId) return;
    const jitter = 700 + Math.floor(Math.random() * 500);
    const url = `${this.apiBase}/analyze/status_emotions/${encodeURIComponent(this.emoTaskId)}`;
    try {
      const st: any = await lastValueFrom(this.http.get(url));
      console.log('[DeepAnalysis] STATUS emotions', { url, status: st?.status, progress: st?.progress, hasEmo: !!st?.emo_url });
      if (!this.emotionsImgUrl && st?.emo_url) {
        this.setEmotionsImgFrom(st.emo_url);
      }
      if (st?.status === 'error') {
        console.error('[DeepAnalysis] STATUS emotions error', st?.error);
        return;
      }
      if (st?.status !== 'done' || !st?.emo_url) {
        this.scheduleEmoPoll(jitter);
      }
    } catch (e: any) {
      console.error('[DeepAnalysis] STATUS emotions fetch error', e?.stack || e?.message || e);
    }
  }

  private async startFramesStage(csvName: string): Promise<void> {
    const url = `${this.apiBase}/analyze/start_frames`;
    // Use image mode; source consistent with baseline (hmm by default)
    const payload = { session_id: this.sessionId, csv_name: csvName, source: 'hmm', fps: this.framesFps, mode: 'image' };
    try {
      const resp: any = await lastValueFrom(this.http.post(url, payload));
      this.framesTaskId = resp?.task_id || null;
      this.scheduleFramesPoll(0);
    } catch (e: any) {
      console.error('[DeepAnalysis] start_frames error', e?.stack || e?.message || e);
    }
  }

  private scheduleFramesPoll(delayMs: number): void {
    if (!this.framesTaskId) return;
    this.pollFramesTimer = setTimeout(() => this.pollFramesStatus(), delayMs);
  }

  private async pollFramesStatus(): Promise<void> {
    if (this.canceled || !this.framesTaskId) return;
    const jitter = 700 + Math.floor(Math.random() * 500);
    const url = `${this.apiBase}/analyze/status_frames/${encodeURIComponent(this.framesTaskId)}`;
    try {
      const st: any = await lastValueFrom(this.http.get(url));
      const baseSet = !!(st?.frames_base_url || this.framesBaseUrl);
      const fps = st?.frames_fps;
      const newCount = Array.isArray(st?.frames) ? st.frames.length : 0;
      console.log('[DeepAnalysis] STATUS frames', { url, status: st?.status, progress: st?.progress, baseSet, fps, newCount });

      if (!this.framesBaseUrl && st?.frames_base_url) {
        this.framesBaseUrl = st.frames_base_url;
        const isAbs = /^https?:\/\//i.test(this.framesBaseUrl || '');
        console.log('[DeepAnalysis] FRAMES base detected', { frames_base_url: this.framesBaseUrl, isAbs });
      }
      if (typeof fps === 'number' && fps > 0 && fps !== this.framesFps) {
        this.framesFps = Math.max(1, Math.min(30, Math.floor(fps)));
        const interval = Math.max(30, Math.floor(1000 / Math.max(1, this.framesFps)));
        console.log('[DeepAnalysis] PLAYBACK fps set', { fps: this.framesFps, intervalMs: interval });
        this.startPlaybackTimer();
      }

      const base = this.framesBaseUrl || '';
      const newNames: string[] = Array.isArray(st?.frames) ? st.frames : [];
      if (newNames.length) this.appendFrames(base, newNames);

      if (st?.status === 'error') {
        console.error('[DeepAnalysis] STATUS frames error', st?.error);
        return;
      }
      if (st?.status !== 'done') {
        this.scheduleFramesPoll(jitter);
      }
    } catch (e: any) {
      console.error('[DeepAnalysis] STATUS frames fetch error', e?.stack || e?.message || e);
    }
  }

  private async startLegacyAsyncFlow(body: any): Promise<void> {
    // Preserve old behavior as fallback
    console.log('[DeepAnalysis] START run_async payload', {
      session_id: body.session_id,
      filename: body.filename,
      fps: body.fps,
      skip_frames: body.skip_frames,
      face_threshold: body.face_threshold,
      render_avatar: true,
      avatar_source: 'hmm',
    });
    const runAsyncUrl = `${this.apiBase}/analyze/run_async`;
    try {
      const startResp: any = await lastValueFrom(this.http.post(runAsyncUrl, { ...body, render_avatar: true, avatar_source: 'hmm' }));
      console.log('[DeepAnalysis] START run_async response', startResp);
      const taskId = startResp?.task_id;
      if (!taskId) throw new Error('No task_id returned');
      this.schedulePoll(taskId, 0);
    } catch (e: any) {
      console.error('[DeepAnalysis] run_async error', e?.stack || e?.message || e);
      if (e?.status && [404, 405, 501].includes(e.status)) {
        await this.runAnalysisSyncFallback(body);
      } else {
        try {
          await this.runAnalysisSyncFallback(body);
        } catch (e2: any) {
          console.error('[DeepAnalysis] Sync fallback failed', e2?.stack || e2?.message || e2);
          this.error = e2?.message || e?.message || 'Анализ не выполнен';
          this.running = false;
        }
      }
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
      console.log('[DeepAnalysis] STATUS', { url, status: st?.status, progress: st?.progress, hasEmo: !!st?.emo_url, newFrames: (Array.isArray(st?.frames) ? st.frames.length : 0) });
      // Update progress & status
      if (typeof st?.progress === 'number') this.progress = Math.max(0, Math.min(100, st.progress));
      this.statusMessage = st?.message || null;

      // Emotions plot preview as soon as available
      if (!this.emotionsImgUrl && st?.emo_url) {
        this.setEmotionsImgFrom(st.emo_url);
      }

      // Frames progressive
      if (!this.framesBaseUrl && st?.frames_base_url) {
        this.framesBaseUrl = st.frames_base_url; // keep as server-provided; we'll prepend apiBase later
        const isAbs = /^https?:\/\//i.test(this.framesBaseUrl || '');
        console.log('[DeepAnalysis] FRAMES base detected', { frames_base_url: this.framesBaseUrl, isAbs });
      }
      const base = this.framesBaseUrl || st?.result?.base || '';
      const fps = st?.frames_fps || st?.result?.avatar_frames?.fps;
      if (typeof fps === 'number' && fps > 0 && fps !== this.framesFps) {
        this.framesFps = Math.max(1, Math.min(30, Math.floor(fps)));
        const interval = Math.max(30, Math.floor(1000 / Math.max(1, this.framesFps)));
        console.log('[DeepAnalysis] PLAYBACK fps set', { fps: this.framesFps, intervalMs: interval });
        this.startPlaybackTimer();
      }
      const newNames: string[] = Array.isArray(st?.frames) ? st.frames : [];
      if (newNames.length) this.appendFrames(base, newNames);

      // Final result
      if (st?.status === 'done' && st?.result) {
        console.log('[DeepAnalysis] Final result received', { finalResult: st.result });
        this.applyFinalResult(st.result);
        this.running = false;
        this.clearTimers();
        return;
      }

      if (st?.status === 'error') {
        console.error('[DeepAnalysis] Status error', st?.error);
        this.error = st?.error || 'Ошибка анализа';
        this.running = false;
        this.clearTimers();
        return;
      }

      // continue polling
      this.schedulePoll(taskId, jitter);
    } catch (e: any) {
      // Stop on status fetch errors
      console.error('[DeepAnalysis] Poll status error', e?.stack || e?.message || e);
      this.error = e?.message || 'Ошибка статуса анализа';
      this.running = false;
      this.clearTimers();
    }
  }

  private appendFrames(base: string, names: string[]): void {
    if (!names || !names.length) return;
    if (!base) return; // wait until we know base URL
    let duplicates = 0;
    const isAbs = /^https?:\/\//i.test(base || '');
    for (const name of names) {
      if (!name) continue;
      if (this.framesSet.has(name)) { duplicates++; continue; }
      // Dedup by name to avoid re-requests
      this.framesSet.add(name);
      const raw = (isAbs ? base : `${this.apiBase}${base}`) + name;
      const finalUrl = this.cacheBust(raw)!;
      console.log('[DeepAnalysis] FRAME request', { name, finalUrl });
      const im = new Image();
      im.onload = () => {
        console.log('[DeepAnalysis] FRAME loaded', { name, w: im.naturalWidth, h: im.naturalHeight });
        this.frames.push(finalUrl);
        if (this.frames.length && !this.playbackTimer) {
          this.startPlaybackTimer();
        }
      };
      im.onerror = (e) => {
        console.error('[DeepAnalysis] FRAME load error', { name, finalUrl, e });
      };
      im.src = finalUrl;
    }
    if (duplicates > 0) {
      console.log('[DeepAnalysis] Frames dedup - dropped duplicates only', { duplicatesDropped: duplicates });
    }
  }

  private startPlaybackTimer(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    if (!this.frames.length) return;
    const interval = Math.max(30, Math.floor(1000 / Math.max(1, this.framesFps)));
    console.log('[DeepAnalysis] Start/Restart playback timer', { framesFps: this.framesFps, intervalMs: interval });
    this.playbackTimer = setInterval(() => {
      if (!this.frames.length) return;
      this.currentFrameUrl = this.frames[this.frameIndex % this.frames.length] || null;
      this.frameIndex = (this.frameIndex + 1) % Math.max(1, this.frames.length);
    }, interval);
  }

  cancelAnalysis(): void {
    if (!this.running) return;
    console.log('User canceled analysis');
    this.canceled = true;
    this.statusMessage = 'Отменено пользователем';
    this.clearTimers();
    this.predictTaskId = null;
    this.emoTaskId = null;
    this.framesTaskId = null;
    this.running = false;
  }

  private applyFinalResult(resp: any): void {
    const toAbs = (p?: string | null) => this.toAbs(p);
    this.csvUrl = toAbs(resp?.csv?.url);
    this.avatarGifUrl = toAbs(resp?.avatar?.url);
    // prefer final emotions plot URL if provided and not already shown during polling
    if (!this.emotionsImgUrl && resp?.emotions_plot?.url) {
      console.log('[DeepAnalysis] Using final emotions_plot URL (fallback)');
      this.setEmotionsImgFrom(resp?.emotions_plot?.url);
    }

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
