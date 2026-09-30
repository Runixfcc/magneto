/** Camera module: getUserMedia and video frame callback */

export class CameraManager {
  video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private frameCallback: ((video: HTMLVideoElement, timestamp: number) => void) | null = null;
  private running = false;

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
  }

  get isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running && this.stream) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.running = true;
    } catch (err) {
      console.error('Camera access denied:', err);
      throw new Error('Camera access denied. Please allow camera access and reload.');
    }
  }

  onFrame(callback: (video: HTMLVideoElement, timestamp: number) => void): void {
    this.frameCallback = callback;
    this.startFrameLoop();
  }

  private startFrameLoop(): void {
    if (!this.running) return;

    if ('requestVideoFrameCallback' in this.video) {
      const loop = (_now: number, metadata: { mediaTime: number }) => {
        if (!this.running) return;
        this.frameCallback?.(this.video, metadata.mediaTime);
        (this.video as any).requestVideoFrameCallback(loop);
      };
      (this.video as any).requestVideoFrameCallback(loop);
    } else {
      // Fallback: use requestAnimationFrame at ~30fps
      let lastTime = 0;
      const loop = (t: number) => {
        if (!this.running) return;
        if (t - lastTime > 33) { // ~30fps
          this.frameCallback?.(this.video, t / 1000);
          lastTime = t;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  stop(): void {
    this.running = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
