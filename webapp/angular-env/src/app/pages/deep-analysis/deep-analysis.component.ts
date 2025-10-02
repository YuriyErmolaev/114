import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
export class DeepAnalysisComponent implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly apiBase = environment.apiUrl || '/api';

  userUid!: string;
  sessionId!: string;

  selectedFile: File | null = null;
  uploadedFilename: string | null = null;
  uploading = false;
  running = false;
  error: string | null = null;

  // Results
  emotionsImgUrl: string | null = null;
  avatarGifUrl: string | null = null;
  csvUrl: string | null = null;

  // Landmarks preview
  landmarksCols: { x: string[]; y: string[] } = { x: [], y: [] };
  firstFrameLandmarks: { x: number[]; y: number[] } = { x: [], y: [] };

  constructor(private http: HttpClient, private session: SessionService) {}

  async ngOnInit(): Promise<void> {
    this.session.syncSessionToCurrentUser();
    this.userUid = this.session.getUserUid();
    this.sessionId = this.session.getSessionId();
    await this.ensureSession();
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

  async runAnalysis(): Promise<void> {
    if (!this.uploadedFilename) {
      this.error = 'Сначала загрузите файл.';
      return;
    }
    this.running = true;
    this.error = null;

    const url = `${this.apiBase}/analyze/run`;
    const body = {
      session_id: this.sessionId,
      filename: this.uploadedFilename,
      artifacts: 'artifacts',
      fps: 12,
      skip_frames: 25,
      face_threshold: 0.9,
      render_avatar: true,
      avatar_source: 'hmm'
    };

    try {
      const resp: any = await lastValueFrom(this.http.post(url, body));
      const toAbs = (p?: string | null) => (p ? `${this.apiBase}${p}` : null);
      this.csvUrl = toAbs(resp?.csv?.url);
      this.avatarGifUrl = toAbs(resp?.avatar?.url);
      this.emotionsImgUrl = toAbs(resp?.emotions_plot?.url);
      const landmarks = resp?.data?.landmarks || {};
      this.landmarksCols = { x: landmarks.x_cols || [], y: landmarks.y_cols || [] };
      this.firstFrameLandmarks = landmarks.first_frame || { x: [], y: [] };
    } catch (e: any) {
      this.error = e?.message || 'Анализ не выполнен';
    } finally {
      this.running = false;
    }
  }
}
