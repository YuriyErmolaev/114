import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';

type MPFaceLandmarker = any;

@Injectable({ providedIn: 'root' })
export class FaceLandmarkerService {
  private landmarker: MPFaceLandmarker | null = null;
  private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';
  private ready: Promise<void> | null = null;
  private visionNS: any | null = null;

  readonly videoBlendShapes$ = new BehaviorSubject<Array<{ categoryName: string; displayName?: string; score: number }>>([]);
  readonly imageBlendShapes$ = new BehaviorSubject<Array<{ categoryName: string; displayName?: string; score: number }>>([]);

  private ensureLoaded(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const vision = await import(/* @vite-ignore */ environment.mediapipeVisionBaseUrl) as any;
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(`${environment.mediapipeVisionBaseUrl}/wasm`);
      this.landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: environment.faceLandmarkerModelUrl, delegate: 'GPU' },
        runningMode: this.runningMode,
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrices: false
      });
    })();
    return this.ready;
  }

  async detectForVideo(video: HTMLVideoElement, timestampMs: number): Promise<any> {
    await this.ensureLoaded();
    if (!this.landmarker) return null;
    if (this.runningMode !== 'VIDEO') {
      await this.landmarker.setOptions({ runningMode: 'VIDEO' });
      this.runningMode = 'VIDEO';
    }
    const result = await this.landmarker.detectForVideo(video, timestampMs);
    const shapes = result?.faceBlendshapes?.[0]?.categories ?? [];
    this.videoBlendShapes$.next(
      shapes.map((c: any) => ({ categoryName: c.categoryName, displayName: c.displayName, score: Number(c.score) }))
    );
    return result;
  }

  async renderOverlay(video: HTMLVideoElement, ctx: CanvasRenderingContext2D, timestampMs: number): Promise<void> {
    const result = await this.detectForVideo(video, timestampMs);
    const faces = result?.faceLandmarks ?? [];
    if (!ctx || !faces.length) return;

    if (!this.visionNS) {
      this.visionNS = await import(/* @vite-ignore */ environment.mediapipeVisionBaseUrl) as any;
    }
    const { DrawingUtils, FaceLandmarker } = this.visionNS;
    const du = new DrawingUtils(ctx);

    for (const landmarks of faces) {
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: '#FF3030' });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: '#FF3030' });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: '#30FF30' });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: '#30FF30' });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: '#E0E0E0' });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: '#E0E0E0' });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: '#FF3030' });
      du.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: '#30FF30' });
    }
  }

  async detectImage(image: ImageBitmap | HTMLImageElement | HTMLCanvasElement): Promise<any> {
    await this.ensureLoaded();
    if (!this.landmarker) return null;
    if (this.runningMode !== 'IMAGE') {
      await this.landmarker.setOptions({ runningMode: 'IMAGE' });
      this.runningMode = 'IMAGE';
    }
    const result = await this.landmarker.detect(image as any);
    const shapes = result?.faceBlendshapes?.[0]?.categories ?? [];
    this.imageBlendShapes$.next(
      shapes.map((c: any) => ({ categoryName: c.categoryName, displayName: c.displayName, score: Number(c.score) }))
    );
    return result;
  }

  dispose(): void {
    if (this.landmarker?.close) this.landmarker.close();
    this.landmarker = null;
    this.ready = null;
    this.visionNS = null;
  }
}
