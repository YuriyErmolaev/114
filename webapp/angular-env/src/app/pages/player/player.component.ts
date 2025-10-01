  import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { MatButtonModule } from '@angular/material/button';
  import { MatIconModule } from '@angular/material/icon';
  import { MatSliderModule } from '@angular/material/slider';
  import { MatSelectModule } from '@angular/material/select';
  import { MatFormFieldModule } from '@angular/material/form-field';
  import { ActivatedRoute } from '@angular/router';

  interface SourceItem { id: string; label: string; url: string; }

  @Component({
    selector: 'app-player',
    standalone: true,
    imports: [
      CommonModule, FormsModule,
      MatButtonModule, MatIconModule, MatSliderModule, MatSelectModule, MatFormFieldModule
    ],
    templateUrl: './player.component.html',
    styleUrl: './player.component.css'
  })
  export class PlayerComponent implements OnInit, OnDestroy {
    @ViewChild('videoRef', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

    sources: SourceItem[] = [
      { id: 'demo1', label: 'Demo clip (H264)', url: '/assets/demo/demo.mp4' },
      { id: 'demo2', label: 'Demo clip (WebM)', url: '/assets/demo/demo.webm' }
    ];
    selectedSourceId = this.sources[0].id;

    isPlaying = false;
    isMuted = false;
    volume = 100;
    rate = 1;
    duration = 0;
    current = 0;
    private raf: number | null = null;

    // currentSrc = '/assets/demo/demo.mp4';

    constructor(private route: ActivatedRoute) {}

    ngOnInit(): void {
      const qpSrc = this.route.snapshot.queryParamMap.get('src');
      if (qpSrc) {
        this.sources = [{ id: 'external', label: 'Query param src', url: qpSrc }];
        this.selectedSourceId = 'external';
      }
    }

    ngOnDestroy(): void {
      if (this.raf !== null) cancelAnimationFrame(this.raf);
    }

    get currentSrc(): string {
      return this.sources.find(s => s.id === this.selectedSourceId)?.url ?? '';
    }

    onLoadedMetadata(): void {
      this.duration = this.videoRef.nativeElement.duration || 0;
    }

    togglePlay(): void {
      const v = this.videoRef.nativeElement;
      if (v.paused) {
        v.play();
        this.isPlaying = true;
        this.tick();
      } else {
        v.pause();
        this.isPlaying = false;
        if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
      }
    }

    private tick = () => {
      const v = this.videoRef.nativeElement;
      this.current = v.currentTime || 0;
      if (!v.paused) this.raf = requestAnimationFrame(this.tick);
    };

    onSeek(val: number): void {
      const v = this.videoRef.nativeElement;
      v.currentTime = val;
      this.current = val;
    }

    onVolume(val: number): void {
      const v = this.videoRef.nativeElement;
      this.volume = val;
      v.volume = Math.max(0, Math.min(1, val / 100));
      this.isMuted = v.muted = v.volume === 0 ? true : this.isMuted && v.volume === 0;
    }

    toggleMute(): void {
      const v = this.videoRef.nativeElement;
      v.muted = !v.muted;
      this.isMuted = v.muted;
    }

    onRate(val: number): void {
      const v = this.videoRef.nativeElement;
      this.rate = val;
      v.playbackRate = val;
    }

    changeSource(): void {
      const v = this.videoRef.nativeElement;
      this.isPlaying = false;
      v.pause();
      v.load();
    }

    toHms(sec: number): string {
      if (!isFinite(sec)) return '0:00';
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      const m = Math.floor((sec / 60) % 60).toString();
      const h = Math.floor(sec / 3600);
      return h > 0 ? `${h}:${m.padStart(2, '0')}:${s}` : `${m}:${s}`;
    }

    fullscreen(): void {
      const el = this.videoRef.nativeElement;
      if (document.fullscreenElement) document.exitFullscreen();
      else el.requestFullscreen().catch(() => {});
    }
  }
