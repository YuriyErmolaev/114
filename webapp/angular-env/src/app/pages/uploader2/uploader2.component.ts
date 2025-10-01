import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {lastValueFrom} from 'rxjs';
import { environment } from '@env/environment';
import {SessionService} from '../../services/session.service';
import {FormsModule} from '@angular/forms';

interface SelectedFile {
  file: File;
  name: string;
  size: number;
  type: string;
}

interface ServerFile {
  name: string;
  size: string;
  modified: string;
  permissions: string;
}



@Component({
  selector: 'app-uploader2',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    FormsModule
  ],
  templateUrl: './uploader2.component.html',
  styleUrl: './uploader2.component.css'
})
export class Uploader2Component implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly apiBase = environment.apiUrl || '/api';

  userUid!: string;
  sessionId!: string;

  readonly directories = ['uploads', 'storage', 'workspace', 'downloads'] as const;
  directory: typeof this.directories[number] = 'uploads';

  selected: SelectedFile[] = [];
  uploaded: ServerFile[] = [];
  uploading = false;

  constructor(private http: HttpClient, private session: SessionService) {}

  private async initSession(): Promise<void> {
    const url = `${this.apiBase}/core/`;
    const headers = new HttpHeaders({
      'X-User-Id': this.userUid,
      'X-Session-Id': this.sessionId
    });
    try {
      await lastValueFrom(this.http.post(url, null, { headers }));
    } catch {
      // ignore
    }
  }

  async ngOnInit(): Promise<void> {
    this.session.syncSessionToCurrentUser();
    this.userUid = this.session.getUserUid();
    this.sessionId = this.session.getSessionId();
    await this.initSession();         // ensure <dir>/<sessionId> exists
    await this.refreshList();
  }




  onOpenPicker(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    const mapped = files.map(f => ({ file: f, name: f.name, size: f.size, type: f.type }));
    this.selected = [...this.selected, ...mapped];
    input.value = '';
  }

  removeAt(index: number): void {
    this.selected.splice(index, 1);
    this.selected = [...this.selected];
  }

  clearAll(): void {
    this.selected = [];
  }

  async uploadSelected(): Promise<void> {
    if (!this.selected.length || this.uploading) return;
    this.uploading = true;

    const headers = new HttpHeaders({
      'X-User-Id': this.userUid,
      'X-Session-Id': this.sessionId
    });

    try {
      for (const item of this.selected) {
        const url = `${this.apiBase}/core/upload/${this.directory}/${encodeURIComponent(this.sessionId)}/`;
        const form = new FormData();
        form.append('file', item.file, item.name);

        try {
          await lastValueFrom(this.http.post(url, form, { headers }));
        } catch (e: any) {
          if (e?.status === 404) {
            await this.initSession(); // создать директории для sessionId
            await lastValueFrom(this.http.post(url, form, { headers }));
          } else {
            throw e;
          }
        }
      }
      await this.refreshList();
      this.clearAll();
    } finally {
      this.uploading = false;
    }
  }


  async refreshList(): Promise<void> {
    const headers = new HttpHeaders({
      'X-User-Id': this.userUid,
      'X-Session-Id': this.sessionId
    });
    const url = `${this.apiBase}/core/list/${this.directory}/${encodeURIComponent(this.sessionId)}/`;
    try {
      const resp = await lastValueFrom(this.http.get(url, { headers }));
      const data = resp as { directory: string; files: ServerFile[] };
      this.uploaded = Array.isArray(data.files) ? data.files : [];
    } catch {
      this.uploaded = [];
    }
  }


  onDirectoryChange(): void {
    this.refreshList();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }
}

