/** MediaPipe HandLandmarker wrapper */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { extractFeatures, HandFeatures, Vec3, resetFeatureHistory } from './handFeatures';
import { OneEuroFilter } from './oneEuroFilter';

export interface TrackedHands {
  left: { features: HandFeatures; worldLandmarks: Vec3[]; screenLandmarks: Vec3[] } | null;
  right: { features: HandFeatures; worldLandmarks: Vec3[]; screenLandmarks: Vec3[] } | null;
  timestamp: number;
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastResult: TrackedHands = { left: null, right: null, timestamp: 0 };
  private leftLostTime = 0;
  private rightLostTime = 0;

  // One Euro filters for smoothing (tuned for low latency and high responsiveness)
  private filtersLeft = {
    yaw: new OneEuroFilter(2.0, 0.05, 1.0),
    pitch: new OneEuroFilter(2.0, 0.05, 1.0),
    roll: new OneEuroFilter(1.2, 0.02, 1.0),
    closure: new OneEuroFilter(1.5, 0.02, 1.0)
  };
  private filtersRight = {
    yaw: new OneEuroFilter(2.0, 0.05, 1.0),
    pitch: new OneEuroFilter(2.0, 0.05, 1.0),
    roll: new OneEuroFilter(1.2, 0.02, 1.0),
    closure: new OneEuroFilter(1.5, 0.02, 1.0)
  };

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  processFrame(video: HTMLVideoElement, timestamp: number): TrackedHands {
    if (!this.landmarker || video.readyState < 2) return this.lastResult;

    const tsMs = Math.round(timestamp * 1000);
    let result;
    try {
      result = this.landmarker.detectForVideo(video, tsMs);
    } catch {
      return this.lastResult;
    }

    const now = performance.now() / 1000;
    let left: TrackedHands['left'] = null;
    let right: TrackedHands['right'] = null;

    for (let i = 0; i < (result.handednesses?.length ?? 0); i++) {
      const handedness = result.handednesses[i][0];
      const worldLm = result.worldLandmarks[i];
      const screenLm = result.landmarks[i];

      if (!worldLm || !screenLm) continue;

      const wl: Vec3[] = worldLm.map((l: any) => ({ x: l.x, y: l.y, z: l.z }));
      const sl: Vec3[] = screenLm.map((l: any) => ({ x: l.x, y: l.y, z: l.z }));

      // MediaPipe returns "Left" for the left hand in mirrored view
      // which is actually the user's right hand, and vice versa
      const label = handedness.categoryName as string;
      const isLeft = label === 'Right';  // mirrored

      const features = extractFeatures(wl, sl, isLeft ? 'Left' : 'Right', handedness.score, now);
      const filters = isLeft ? this.filtersLeft : this.filtersRight;

      // Apply One Euro filtering
      features.yaw = filters.yaw.filter(features.yaw, now);
      features.pitch = filters.pitch.filter(features.pitch, now);
      features.roll = filters.roll.filter(features.roll, now);
      features.closure = filters.closure.filter(features.closure, now);

      const handData = { features, worldLandmarks: wl, screenLandmarks: sl };

      if (isLeft) {
        left = handData;
        this.leftLostTime = 0;
      } else {
        right = handData;
        this.rightLostTime = 0;
      }
    }

    // Track loss duration
    if (!left && this.lastResult.left) {
      if (this.leftLostTime === 0) this.leftLostTime = now;
    }
    if (!right && this.lastResult.right) {
      if (this.rightLostTime === 0) this.rightLostTime = now;
    }

    this.lastResult = { left, right, timestamp: now };
    return this.lastResult;
  }

  get leftLostDuration(): number {
    if (this.leftLostTime === 0) return 0;
    return performance.now() / 1000 - this.leftLostTime;
  }

  get rightLostDuration(): number {
    if (this.rightLostTime === 0) return 0;
    return performance.now() / 1000 - this.rightLostTime;
  }

  get bothHandsLost(): boolean {
    return this.leftLostDuration > 0.3 && this.rightLostDuration > 0.3;
  }

  getLastResult(): TrackedHands {
    return this.lastResult;
  }

  reset(): void {
    this.lastResult = { left: null, right: null, timestamp: 0 };
    this.leftLostTime = 0;
    this.rightLostTime = 0;
    this.filtersLeft.yaw.reset();
    this.filtersLeft.pitch.reset();
    this.filtersLeft.roll.reset();
    this.filtersLeft.closure.reset();
    this.filtersRight.yaw.reset();
    this.filtersRight.pitch.reset();
    this.filtersRight.roll.reset();
    this.filtersRight.closure.reset();
    resetFeatureHistory();
  }
}
