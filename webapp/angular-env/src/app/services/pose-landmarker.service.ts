import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

type MPPoseLandmarker = any;

@Injectable({ providedIn: 'root' })
export class PoseLandmarkerService {
  private landmarker: MPPoseLandmarker | null = null;
  private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';
  private ready: Promise<void> | null = null;
  private visionNS: any | null = null;

  private ensureLoaded(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const vision = await import(/* @vite-ignore */ environment.mediapipeVisionBaseUrl) as any;
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(`${environment.mediapipeVisionBaseUrl}/wasm`);
      this.landmarker = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: environment.poseLandmarkerModelUrl, delegate: 'GPU' },
        runningMode: this.runningMode,
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
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
    const poses = result?.landmarks ?? result?.poseLandmarks ?? [];
    if (!ctx || !poses?.length) return;

    if (!this.visionNS) {
      this.visionNS = await import(/* @vite-ignore */ environment.mediapipeVisionBaseUrl) as any;
    }
    const { DrawingUtils, PoseLandmarker } = this.visionNS;
    const du = new DrawingUtils(ctx);

    for (const lm of poses) {
      du.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS || PoseLandmarker.POSE_LANDMARKS, { color: '#00FF7F', lineWidth: 2 });
      du.drawLandmarks(lm, { color: '#1E90FF', radius: 2 });
    }
  }

  dispose(): void {
    if (this.landmarker?.close) this.landmarker.close();
    this.landmarker = null;
    this.ready = null;
    this.visionNS = null;
  }
}
