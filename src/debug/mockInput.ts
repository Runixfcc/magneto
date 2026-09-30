/** Mock input: mouse-based controls for development without camera */

import { TrackedHands } from '../tracking/handTracker';
import { HandFeatures, Vec3 } from '../tracking/handFeatures';

export class MockInput {
  private mouseX = 0.5;
  private mouseY = 0.5;
  private mouseDown = false;
  private rightMouseDown = false;
  private prevMouseX = 0.5;
  private prevMouseY = 0.5;
  private prevTime = 0;
  private enabled = false;

  constructor() {
    window.addEventListener('mousemove', (e) => {
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseX = e.clientX / window.innerWidth;
      this.mouseY = e.clientY / window.innerHeight;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.enabled) e.preventDefault();
    });
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getHands(): TrackedHands {
    const time = performance.now() / 1000;
    const dt = Math.max(time - this.prevTime, 0.001);
    this.prevTime = time;

    // Speed from mouse movement
    const dx = this.mouseX - this.prevMouseX;
    const dy = this.mouseY - this.prevMouseY;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;

    // Left hand: aim based on mouse position (higher sensitivity)
    const leftYaw = (this.mouseX - 0.5) * 2.8;    // roughly ±1.4 rad
    const leftPitch = -(this.mouseY - 0.5) * 1.5; // roughly ±0.75 rad

    // Left fist on right mouse click triggers shield!
    const leftClosure = this.rightMouseDown ? 1.0 : 1.8;

    // Fake landmarks for left hand
    const leftScreen: Vec3[] = Array.from({ length: 21 }, () => ({
      x: 0.3,
      y: 0.5,
      z: 0
    }));

    const leftWorld: Vec3[] = Array.from({ length: 21 }, (_, i) => {
      const baseY = -0.1;
      if (i === 0) return { x: 0, y: baseY, z: 0 };
      if (i === 9) return { x: 0, y: baseY + 0.08, z: -0.05 };
      if (i === 5) return { x: -0.03, y: baseY + 0.07, z: -0.04 };
      if (i === 17) return { x: 0.03, y: baseY + 0.06, z: -0.04 };
      return { x: (Math.random() - 0.5) * 0.05, y: baseY + Math.random() * 0.08, z: -Math.random() * 0.05 };
    });

    const leftFeatures: HandFeatures = {
      closure: leftClosure,
      yaw: leftYaw,
      pitch: leftPitch,
      roll: 0,
      palmSize: 0.08,
      screenPalmSize: 0.08,
      wristScreen: { x: 0.3, y: 0.5 },
      wristSpeed: 0,
      palmNormal: { x: 0, y: 0, z: 1 },
      fingerDistances: this.rightMouseDown
        ? [1.0, 1.0, 1.0, 1.0, 1.0]
        : [1.8, 1.9, 2.0, 1.8, 1.6],
      palmFacingCamera: !this.rightMouseDown,
      isPointingIndex: false,
      confidence: 0.95
    };

    // Right hand: mouse controls grab
    const rightClosure = this.mouseDown ? 1.0 : 1.8;

    const rightScreen: Vec3[] = Array.from({ length: 21 }, () => ({
      x: this.mouseX,
      y: this.mouseY,
      z: 0
    }));

    const rightWorld: Vec3[] = Array.from({ length: 21 }, (_, i) => {
      const baseY = -0.1;
      if (i === 0) return { x: 0, y: baseY, z: 0 };
      if (i === 9) return { x: 0, y: baseY + 0.08, z: -0.05 };
      if (i === 5) return { x: -0.03, y: baseY + 0.07, z: -0.04 };
      if (i === 17) return { x: 0.03, y: baseY + 0.06, z: -0.04 };
      if (this.mouseDown) {
        // Closed fist: tips close to wrist
        return { x: (Math.random() - 0.5) * 0.02, y: baseY + Math.random() * 0.03, z: -Math.random() * 0.02 };
      }
      return { x: (Math.random() - 0.5) * 0.05, y: baseY + Math.random() * 0.08, z: -Math.random() * 0.05 };
    });

    const rightFeatures: HandFeatures = {
      closure: rightClosure,
      yaw: 0,
      pitch: 0,
      roll: 0,
      palmSize: 0.08,
      screenPalmSize: 0.08,
      wristScreen: { x: this.mouseX, y: this.mouseY },
      wristSpeed: speed,
      palmNormal: { x: 0, y: 0, z: 1 },
      fingerDistances: this.mouseDown
        ? [1.0, 1.0, 1.0, 1.0, 1.0]
        : [1.8, 1.9, 2.0, 1.8, 1.6],
      palmFacingCamera: !this.mouseDown,
      isPointingIndex: false,
      confidence: 0.95
    };

    return {
      left: { features: leftFeatures, worldLandmarks: leftWorld, screenLandmarks: leftScreen },
      right: { features: rightFeatures, worldLandmarks: rightWorld, screenLandmarks: rightScreen },
      timestamp: time
    };
  }
}
