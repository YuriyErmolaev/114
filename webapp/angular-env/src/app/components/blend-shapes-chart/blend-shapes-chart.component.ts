import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';

export interface BlendItem {
  categoryName: string;
  displayName?: string;
  score: number;
}

@Component({
  selector: 'app-blend-shapes-chart',
  standalone: true,
  imports: [],
  templateUrl: './blend-shapes-chart.component.html',
  styleUrls: ['./blend-shapes-chart.component.css']
})
export class BlendShapesChartComponent implements OnChanges {
  @Input() items: BlendItem[] | null = null;
  @Input() selectedNames: string[] | null = null;
  @Input() excludeNeutral = true;
  @Input() view: 'chart' | 'bars' = 'chart';
  @Input() height = 280;
  @Input() showNames = true;

  private readonly historyLen = 600;
  private history = new Map<string, number[]>();

  @ViewChild('chartCanvas', { static: false }) chartCanvas?: ElementRef<HTMLCanvasElement>;
  private ctx?: CanvasRenderingContext2D;

  ngOnChanges(_: SimpleChanges): void {
    this.updateHistory();
    this.drawOnce();
  }

  private get allItems(): BlendItem[] {
    const src = Array.isArray(this.items) ? this.items : [];
    if (!this.excludeNeutral) return src;
    return src.filter(i => {
      const n = (i.categoryName || '').toLowerCase();
      return n !== 'neutral' && n !== '_neutral';
    });
  }

  private get visibleItems(): BlendItem[] {
    const base = this.allItems;
    const selected = (this.selectedNames || []).map(s => s.toLowerCase());
    if (selected.length === 0) return base.slice(0, 4);
    const wanted = new Set(selected);
    return base.filter(i => wanted.has(i.categoryName.toLowerCase()) || wanted.has((i.displayName || '').toLowerCase()));
  }

  private updateHistory(): void {
    const items = this.visibleItems;
    for (const it of items) {
      const key = it.categoryName;
      if (!this.history.has(key)) this.history.set(key, []);
      const buf = this.history.get(key)!;
      buf.push(Number(it.score || 0));
      if (buf.length > this.historyLen) buf.splice(0, buf.length - this.historyLen);
    }
    for (const key of Array.from(this.history.keys())) {
      if (!items.find(i => i.categoryName === key)) this.history.delete(key);
    }
  }

  private ensureContext(): void {
    if (!this.chartCanvas) return;
    const canvas = this.chartCanvas.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || 560;
    const cssH = this.height || rect.height || 280;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx = ctx;
  }

  private cssVar(name: string, fallback: string): string {
    const el = this.chartCanvas?.nativeElement.parentElement;
    const v = el ? getComputedStyle(el).getPropertyValue(name).trim() : '';
    return v || fallback;
  }

  private cssVarPx(name: string, fallback: number): number {
    const v = this.cssVar(name, fallback + 'px');
    const n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  private drawOnce(): void {
    if (!this.chartCanvas) return;

    if (this.view === 'bars') {
      this.ensureContext();
      const ctx = this.ctx;
      if (!ctx) return;
      this.drawBars(ctx);
      return;
    }

    this.ensureContext();
    const ctx = this.ctx;
    if (!ctx) return;

    const canvas = this.chartCanvas.nativeElement;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    const paperBg = this.cssVar('--paper-bg', '#f5f1df');
    const paperAlt = this.cssVar('--paper-alt', '#efe7c4');
    const gridMinor = this.cssVar('--grid-minor', '#00000022');
    const gridMajor = this.cssVar('--grid-major', '#00000033');
    const trace = this.cssVar('--trace', '#2b303b');

    ctx.clearRect(0, 0, w, h);

    const items = this.visibleItems;
    const nBands = Math.max(1, items.length);

    const labelW = this.showNames ? this.cssVarPx('--blend-label-w', 120) : 0;
    const padL = 10 + labelW;
    const padR = 10;
    const padT = 8;
    const padB = 10;

    const drawW = Math.max(1, w - padL - padR);
    const drawH = Math.max(1, h - padT - padB);
    const bandH = drawH / nBands;
    const innerPad = Math.min(8, bandH * 0.18);

    ctx.save();
    ctx.translate(padL, padT);

    const majorW = Math.max(40, Math.round(drawW / 8));
    for (let i = 0, x = 0; x < drawW; i++, x += majorW) {
      ctx.fillStyle = i % 2 === 0 ? paperBg : paperAlt;
      ctx.fillRect(x, 0, Math.min(majorW, drawW - x), drawH);
    }

    const minorStep = Math.max(8, Math.round(majorW / 5));
    ctx.strokeStyle = gridMinor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let x = 0; x <= drawW; x += minorStep) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, drawH);
      ctx.stroke();
    }

    ctx.strokeStyle = gridMajor;
    for (let x = 0; x <= drawW; x += majorW) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, drawH);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = gridMajor;
    for (let b = 0; b < nBands; b++) {
      const center = b * bandH + bandH / 2;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(center) + 0.5);
      ctx.lineTo(drawW, Math.round(center) + 0.5);
      ctx.stroke();
    }

    if (this.showNames) {
      ctx.fillStyle = gridMajor;
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const itemsArr = this.visibleItems;
      for (let b = 0; b < nBands; b++) {
        const it = itemsArr[b];
        const name = (it?.displayName || it?.categoryName || '').toString();
        const centerY = b * bandH + bandH / 2;
        ctx.fillText(name, -8, centerY);
      }
    }

    ctx.lineWidth = 1.6;
    ctx.strokeStyle = trace;

    this.visibleItems.forEach((it, idx) => {
      const buf = this.history.get(it.categoryName) ?? [];
      if (buf.length < 2) return;

      const top = idx * bandH + innerPad;
      const yH = Math.max(1, bandH - innerPad * 2);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, idx * bandH, drawW, bandH);
      ctx.clip();

      const n = buf.length;
      for (let i = 0; i < n; i++) {
        const x = (i / (this.historyLen - 1)) * drawW;
        const v = Math.max(0, Math.min(1, buf[i]));
        const y = top + (1 - v) * yH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }

  private drawBars(ctx: CanvasRenderingContext2D): void {
    const canvas = this.chartCanvas!.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    const labelW = this.showNames ? this.cssVarPx('--blend-label-w', 120) : 0;
    const padL = 10 + labelW;
    const valueW = 72;
    const padR = 10 + valueW;
    const padT = 8;
    const padB = 10;

    const drawW = Math.max(1, w - padL - padR);
    const drawH = Math.max(1, h - padT - padB);

    const items = this.visibleItems;
    const n = Math.max(1, items.length);

    const bandH = drawH / n;
    const innerPad = Math.min(8, bandH * 0.18);
    const barH = Math.max(1, bandH - innerPad * 2);

    const back = this.cssVar('--chart-bar-back', '#e5e7eb');
    const fill = this.cssVar('--chart-bar-fill', '#64748b');
    const text = this.cssVar('--color-text', '#374151');

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(padL, padT);

    ctx.fillStyle = text;
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < n; i++) {
      const it = items[i];
      const name = (it.displayName || it.categoryName || '').toString();
      const val = Math.max(0, Math.min(1, Number(it.score || 0)));

      const top = i * bandH + innerPad;

      if (this.showNames) {
        ctx.save();
        ctx.translate(-8, 0);
        ctx.fillText(name, 0, i * bandH + bandH / 2);
        ctx.restore();
      }

      ctx.fillStyle = back;
      ctx.fillRect(0, top, drawW, barH);

      const wFill = Math.max(0, Math.min(drawW, val * drawW));
      ctx.fillStyle = fill;
      ctx.fillRect(0, top, wFill, barH);

      const txt = val.toFixed(3);
      ctx.fillStyle = text;
      ctx.textAlign = 'left';
      ctx.fillText(txt, drawW + 18, i * bandH + bandH / 2);
      ctx.textAlign = 'right';
    }

    ctx.restore();
  }
}
