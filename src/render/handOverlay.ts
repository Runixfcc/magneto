/** Hand overlay: draw hand skeleton on canvas over camera feed */

import { TrackedHands } from '../tracking/handTracker';
import { Vec3 } from '../tracking/handFeatures';
import { HighlightTarget } from '../coach/errorCoach';

// MediaPipe hand connections
const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16],// ring
  [0, 17], [17, 18], [18, 19], [19, 20],// pinky
  [5, 9], [9, 13], [13, 17]             // palm
];

const TIP_INDICES = [4, 8, 12, 16, 20];

export class HandOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 240;
  private height = 180;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  draw(hands: TrackedHands, highlight: HighlightTarget): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (hands.left) {
      this.drawHand(
        hands.left.screenLandmarks,
        highlight === 'left_hand' || highlight === 'left_palm' ? '#ff2222' : '#00d4ff',
        highlight
      );
    }

    if (hands.right) {
      this.drawHand(
        hands.right.screenLandmarks,
        highlight === 'right_hand' || highlight === 'wrist' || highlight === 'fingers' ? '#ff2222' : '#44ff88',
        highlight
      );
    }

    // Video frame highlight
    if (highlight === 'video_frame') {
      this.ctx.strokeStyle = '#ff2222';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(2, 2, this.width - 4, this.height - 4);
    }
  }

  private drawHand(
    landmarks: Vec3[],
    color: string,
    highlight: HighlightTarget
  ): void {
    const ctx = this.ctx;

    // Draw connections
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    for (const [a, b] of CONNECTIONS) {
      const la = landmarks[a];
      const lb = landmarks[b];

      ctx.beginPath();
      ctx.moveTo(la.x * this.width, la.y * this.height);
      ctx.lineTo(lb.x * this.width, lb.y * this.height);
      ctx.stroke();
    }

    // Draw landmarks
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = lm.x * this.width;
      const y = lm.y * this.height;

      let pointColor = color;
      let radius = 3;

      // Highlight specific fingers (for LOOSE_FIST error)
      if (highlight === 'fingers' && TIP_INDICES.includes(i)) {
        // Check if this finger is "loose"
        const wrist = landmarks[0];
        const palm = landmarks[9];
        const palmDist = Math.sqrt(
          (wrist.x - palm.x) ** 2 + (wrist.y - palm.y) ** 2
        );
        const tipDist = Math.sqrt(
          (lm.x - wrist.x) ** 2 + (lm.y - wrist.y) ** 2
        );
        if (palmDist > 0.001 && tipDist / palmDist > 1.3) {
          pointColor = '#ff0000';
          radius = 5;
        }
      }

      // Highlight wrist
      if (highlight === 'wrist' && i === 0) {
        pointColor = '#ff0000';
        radius = 6;
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = pointColor;
      ctx.fill();
    }
  }
}
