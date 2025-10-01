import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

type MPHandLandmarker = any;

@Injectable({ providedIn: 'root' })
export class HandsLandmarkerService {
  private landmarker: MPHandLandmarker | null = null;
  private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';
  private ready: Promise<void> | null = null;
  private visionNS: any | null = null;

  private static readonly DEFAULT_CONNECTIONS: Array<[number, number]> = [
    [0,1],[1,2],[2,3],[3,4], // thumb
    [0,5],[5,6],[6,7],[7,8], // index
    [5,9],[9,10],[10,11],[11,12], // middle
    [9,13],[13,14],[14,15],[15,16], // ring
    [13,17],[17,18],[18,19],[19,20], // pinky
    [0,17]
  ];

  private ensureLoaded(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const vision = await import(/* @vite-ignore */ environment.mediapipeVisionBaseUrl) as any;
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(`${environment.mediapipeVisionBaseUrl}/wasm`);
      this.landmarker = await vision.HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: environment.handsLandmarkerModelUrl, delegate: 'GPU' },
        runningMode: this.runningMode,
        numHands: 2
      });
    })();
    return this.ready;
  }

  private async detectForVideo(video: HTMLVideoElement, timestampMs: number): Promise<any> {
    await this.ensureLoaded();
    if (!this.landmarker) return null;
    if (this.runningMode !== 'VIDEO') {
      await this.landmarker.setOptions({ runningMode: 'VIDEO' });
      this.runningMode = 'VIDEO';
    }
    return await this.landmarker.detectForVideo(video, timestampMs);
  }

  async renderOverlay(video: HTMLVideoElement, ctx: CanvasRenderingContext2D, timestampMs: number): Promise<void> {
    const result = await this.detectForVideo(video, timestampMs);
    const hands = (result?.handLandmarks ?? result?.landmarks ?? []) as Array<Array<{x:number;y:number}>>;
    if (!ctx || !hands?.length) return;

    if (!this.visionNS) {
      this.visionNS = await import(/* @vite-ignore */ environment.mediapipeVisionBaseUrl) as any;
    }
    const { DrawingUtils, HandLandmarker } = this.visionNS;
    const du = new DrawingUtils(ctx);

    const connections: Array<[number, number]> = (HandLandmarker?.HAND_CONNECTIONS || HandLandmarker?.HAND_LANDMARKS || HandsLandmarkerService.DEFAULT_CONNECTIONS);

    for (const lm of hands) {
      try { du.drawConnectors(lm as any, connections as any, { color: '#00BFFF', lineWidth: 3 }); } catch {}
      try { du.drawLandmarks(lm as any, { color: '#FF1493', radius: 2 }); } catch {}
    }
  }

  dispose(): void {
    if (this.landmarker?.close) this.landmarker.close();
    this.landmarker = null;
    this.ready = null;
    this.visionNS = null;
  }
}
