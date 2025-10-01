import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  AfterViewInit
} from '@angular/core';

@Component({
  selector: 'app-video-viewport',
  standalone: true,
  imports: [],
  templateUrl: './video-viewport.component.html',
  styleUrls: ['./video-viewport.component.css']
})
export class VideoViewportComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() src?: string | MediaStream;
  @Input() autoplay = true;
  @Input() muted = true;
  @Input() showGrid: boolean =
    (typeof window !== 'undefined' && window.localStorage?.getItem('video.grid.enabled') === '1') || false;
  @Input() overlayRender?: (args: { ctx: CanvasRenderingContext2D; video: HTMLVideoElement; canvas: HTMLCanvasElement; timestampMs: number }) => void | Promise<void>;
  @Input() sourceMode: 'camera' | 'video' = 'camera';

  @Output() frame = new EventEmitter<{ video: HTMLVideoElement; canvas: HTMLCanvasElement; timestampMs: number }>();
  @Output() snapshot = new EventEmitter<{ imageBitmap: ImageBitmap; canvas: HTMLCanvasElement }>();

  @ViewChild('video', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;

  private readonly GRID_STORAGE_KEY = 'video.grid.enabled';

  ngAfterViewInit(): void {
    this.ensureDefaultCameraIfNeeded().then(() => this.applySource().catch(console.error));
    this.startLoop();
    this.observeResize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src']) this.applySource().catch(console.error);
    if (changes['sourceMode']) {
      this.ensureDefaultCameraIfNeeded().then(() => this.applySource().catch(console.error));
    }
    if (changes['showGrid']) {
      try { window.localStorage?.setItem(this.GRID_STORAGE_KEY, this.showGrid ? '1' : '0'); } catch {}
    }
  }

  async capture(): Promise<void> {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    createImageBitmap(video).then(bitmap => this.snapshot.emit({ imageBitmap: bitmap, canvas }));
  }

  @HostListener('window:keydown', ['$event'])
  onKey(ev: KeyboardEvent): void {
    const k = ev.key.toLowerCase();
    if (k === 'g') {
      this.showGrid = !this.showGrid;
      try { window.localStorage?.setItem(this.GRID_STORAGE_KEY, this.showGrid ? '1' : '0'); } catch {}
    }
  }

  private async applySource(): Promise<void> {
    const video = this.videoRef.nativeElement;
    video.muted = !!this.muted;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => this.setAspectFromVideo(), { once: true });

    if (video.srcObject instanceof MediaStream) {
      const switchingAwayFromStream =
        !(this.src instanceof MediaStream) || this.src !== (video.srcObject as MediaStream);
      if (switchingAwayFromStream) {
        try { (video.srcObject as MediaStream).getTracks().forEach(t => t.stop()); } catch {}
        video.srcObject = null;
      }
    }

    if (this.src instanceof MediaStream) {
      video.srcObject = this.src;
      if (this.autoplay) await video.play().catch(() => null);
      this.setAspectFromVideo();

    } else if (typeof this.src === 'string' && this.src.length > 0) {
      if (video.srcObject) video.srcObject = null;
      video.src = this.src;
      await video.load();
      if (this.autoplay) await video.play().catch(() => null);
      this.setAspectFromVideo();
    }
  }

  private setAspectFromVideo(): void {
    const v = this.videoRef.nativeElement;
    if (!v.videoWidth || !v.videoHeight) return;
    const host = v.parentElement as HTMLElement;
    host.style.setProperty('--va-ratio', `${v.videoWidth} / ${v.videoHeight}`);
  }

  private stopCurrentStream(): void {
    const v = this.videoRef?.nativeElement;
    if (!v) return;
    if (v.srcObject instanceof MediaStream) {
      try { (v.srcObject as MediaStream).getTracks().forEach(t => t.stop()); } catch {}
    }
    v.srcObject = null;
  }

  private startLoop(): void {
    const step = () => {
      const video = this.videoRef.nativeElement;
      const canvas = this.canvasRef.nativeElement;

      if (video.readyState >= 2) {
        this.syncCanvasSize(canvas, video.videoWidth, video.videoHeight);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const t = performance.now();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (this.showGrid) this.drawGrid(ctx, canvas.width, canvas.height);

          const done = this.overlayRender
            ? Promise.resolve(this.overlayRender({ ctx, video, canvas, timestampMs: t }))
            : Promise.resolve();

          done.finally(() => {
            this.frame.emit({ video, canvas, timestampMs: t });
            this.rafId = requestAnimationFrame(step);
          });
          return;
        }
      }

      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  private observeResize(): void {
    const canvas = this.canvasRef.nativeElement;
    this.resizeObserver = new ResizeObserver(() => {
      const video = this.videoRef.nativeElement;
      this.syncCanvasSize(canvas, video.videoWidth, video.videoHeight);
    });
    this.resizeObserver.observe(canvas.parentElement as Element);
  }

  private syncCanvasSize(canvas: HTMLCanvasElement, w: number, h: number): void {
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const stroke = '#ffffff66';
    const centerStroke = '#ffffff99';
    const lineWidth = 1;

    ctx.save();
    ctx.lineWidth = lineWidth;

    const x1 = w / 3;
    const x2 = (w * 2) / 3;
    const y1 = h / 3;
    const y2 = (h * 2) / 3;

    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.moveTo(x1, 0); ctx.lineTo(x1, h);
    ctx.moveTo(x2, 0); ctx.lineTo(x2, h);
    ctx.moveTo(0, y1); ctx.lineTo(w, y1);
    ctx.moveTo(0, y2); ctx.lineTo(w, y2);
    ctx.stroke();

    const cx = w / 2;
    const cy = h / 2;
    const cLen = Math.min(w, h) * 0.04;

    ctx.strokeStyle = centerStroke;
    ctx.beginPath();
    ctx.moveTo(cx - cLen, cy); ctx.lineTo(cx + cLen, cy);
    ctx.moveTo(cx, cy - cLen); ctx.lineTo(cx, cy + cLen);
    ctx.stroke();

    ctx.restore();
  }

  private async ensureDefaultCameraIfNeeded(): Promise<void> {
    if (this.sourceMode !== 'camera') return;
    if (this.src instanceof MediaStream) return;
    if (typeof this.src === 'string' && this.src.length) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      this.src = stream;
    } catch (e) {
      console.warn('[VideoViewport] getUserMedia failed:', e);
    }
  }

  ngOnDestroy(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.stopCurrentStream();
    this.resizeObserver?.disconnect();
  }
}
