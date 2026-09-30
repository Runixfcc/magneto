/**
 * CameraCursorManager — Virtual cursor controlled by optical hand tracking
 * Allows aiming at UI elements (like "ДАЛЕЕ ▶", "ПРОПУСТИТЬ", etc.)
 * and clicking by clenching hand into a fist (✊).
 */

import { TrackedHands } from '../tracking/handTracker';
import { OneEuroFilter } from '../tracking/oneEuroFilter';
import { SFXManager } from '../audio/sfx';

export class CameraCursorManager {
  private el: HTMLElement | null = null;
  private ringEl: HTMLElement | null = null;
  private progressFill: SVGCircleElement | null = null;
  private iconEl: HTMLElement | null = null;
  private textEl: HTMLElement | null = null;
  private shockwaveEl: HTMLElement | null = null;

  // Smoothing filters (tuned for responsive movement with minimal jitter)
  private filterX = new OneEuroFilter(2.2, 0.04, 1.0);
  private filterY = new OneEuroFilter(2.2, 0.04, 1.0);

  private sfx: SFXManager;
  private isFistDown = false;
  private currentHoveredElement: HTMLElement | null = null;
  private lastClickTime = 0;
  private clickCooldown = 0.35; // seconds
  private lastHoverToneTime = 0;
  private lastTargetElementId = '';

  // Configuration thresholds
  private readonly CLOSURE_FIST = 1.25; // below this = fist clenched (click!)
  private readonly CLOSURE_OPEN = 1.36; // above this = hand opened (reset)
  private readonly SNAP_RADIUS = 55;    // pixels for magnetic snap to nearest button

  // Circle circumference: 2 * PI * 23 ≈ 144.51
  private readonly CIRCUMFERENCE = 2 * Math.PI * 23;

  constructor(sfx: SFXManager) {
    this.sfx = sfx;
    this.initDOM();
  }

  private initDOM(): void {
    let existing = document.getElementById('camera-cursor');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'camera-cursor';
      existing.className = 'camera-cursor hidden';
      existing.setAttribute('aria-hidden', 'true');
      existing.innerHTML = `
        <div class="cursor-glow"></div>
        <div class="cursor-ring">
          <svg class="cursor-progress-svg" viewBox="0 0 60 60">
            <circle class="cursor-track" cx="30" cy="30" r="23" />
            <circle id="cursor-progress-fill" class="cursor-fill" cx="30" cy="30" r="23" />
          </svg>
          <div class="cursor-crosshair">
            <span class="cross-line h"></span>
            <span class="cross-line v"></span>
          </div>
          <div class="cursor-center-dot"></div>
          <div class="cursor-ticks">
            <span class="tick t-top"></span>
            <span class="tick t-right"></span>
            <span class="tick t-bottom"></span>
            <span class="tick t-left"></span>
          </div>
        </div>
        <div class="cursor-tag-box">
          <span id="cursor-icon" class="cursor-icon">🖐</span>
          <span id="cursor-text" class="cursor-text">НАВЕДЕНИЕ</span>
        </div>
        <div id="cursor-shockwave" class="cursor-shockwave"></div>
      `;
      document.body.appendChild(existing);
    }

    this.el = existing;
    this.ringEl = existing.querySelector('.cursor-ring');
    this.progressFill = existing.querySelector('#cursor-progress-fill') as SVGCircleElement | null;
    this.iconEl = existing.querySelector('#cursor-icon');
    this.textEl = existing.querySelector('#cursor-text');
    this.shockwaveEl = existing.querySelector('#cursor-shockwave');

    if (this.progressFill) {
      this.progressFill.style.strokeDasharray = `${this.CIRCUMFERENCE}`;
      this.progressFill.style.strokeDashoffset = `${this.CIRCUMFERENCE}`;
    }
  }

  /**
   * Main update called each animation frame
   */
  update(hands: TrackedHands, dt: number, isEnabled: boolean): void {
    if (!isEnabled || !this.el) {
      this.hide();
      return;
    }

    // Select active hand (prefer right hand, or left hand, or whichever has valid confidence)
    const hand = (hands.right && hands.right.features.confidence > 0.4)
      ? hands.right
      : (hands.left && hands.left.features.confidence > 0.4 ? hands.left : null);

    if (!hand) {
      this.hide();
      return;
    }

    const features = hand.features;
    const sl = hand.screenLandmarks;
    if (!sl || sl.length < 21) {
      this.hide();
      return;
    }

    const now = performance.now() / 1000;

    // Anchor landmark calculation:
    // When hand is open (closure > 1.35), user aims with index fingertip (sl[8]).
    // When hand curls into a fist, fingertip curls into the palm, which would displace the cursor.
    // By blending smoothly towards index MCP knuckle (sl[5]), which remains stationary during fist clench,
    // the cursor remains ROCK-SOLID on target when clenching!
    const closure = features.closure;
    const t = Math.max(0, Math.min(1, (closure - 1.15) / (1.40 - 1.15)));
    const anchorX = sl[5].x * (1 - t) + (sl[8].x * 0.70 + sl[5].x * 0.30) * t;
    const anchorY = sl[5].y * (1 - t) + (sl[8].y * 0.70 + sl[5].y * 0.30) * t;

    // Camera video is mirrored horizontally (scaleX(-1))
    const mirroredX = 1 - anchorX;
    const mirroredY = anchorY;

    // Remap natural webcam reach bounds [0.14, 0.86] -> [0, 1] screen bounds
    const xMin = 0.14, xMax = 0.86;
    const yMin = 0.12, yMax = 0.86;
    const normX = Math.max(0, Math.min(1, (mirroredX - xMin) / (xMax - xMin)));
    const normY = Math.max(0, Math.min(1, (mirroredY - yMin) / (yMax - yMin)));

    const rawScreenX = normX * window.innerWidth;
    const rawScreenY = normY * window.innerHeight;

    // Filter with OneEuroFilter for smooth, non-jittery movement
    const filteredX = this.filterX.filter(rawScreenX, now);
    const filteredY = this.filterY.filter(rawScreenY, now);

    // Find interactive button candidates and perform magnetic snapping
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button:not([disabled]), .tactical-cmd-btn, .btn-skip-intro, .vn-next-btn, .vn-skip-btn, .lock-pull-btn, .expo-btn, #btn-skip-tutorial, #btn-skip-video, #btn-vn-next, #btn-vn-skip, #btn-story, #btn-play, #btn-mock, #btn-restart, .vn-dialogue-box'
      )
    );

    let bestTarget: HTMLElement | null = null;
    let bestDist = Infinity;
    let bestRect: DOMRect | null = null;

    for (const el of candidates) {
      if (!el.offsetParent && el.style.display === 'none') continue;
      // Do not consider elements from hidden containers
      if (el.closest('.hidden')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;

      const dx = Math.max(rect.left - filteredX, 0, filteredX - rect.right);
      const dy = Math.max(rect.top - filteredY, 0, filteredY - rect.bottom);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Give generous capture to primary actions (Next, Skip)
      const isPrimary = el.id === 'btn-vn-next' || el.id === 'btn-skip-video' || el.id === 'btn-skip-tutorial' || el.classList.contains('vn-next-btn');
      const captureRadius = isPrimary ? this.SNAP_RADIUS * 1.6 : this.SNAP_RADIUS;

      if (dist < captureRadius && dist < bestDist) {
        bestDist = dist;
        bestTarget = el;
        bestRect = rect;
      }
    }

    let displayX = filteredX;
    let displayY = filteredY;

    if (bestTarget && bestRect) {
      // Magnetic pull towards center of target button
      const centerX = bestRect.left + bestRect.width / 2;
      const centerY = bestRect.top + bestRect.height / 2;
      const isPrimary = bestTarget.id === 'btn-vn-next' || bestTarget.id === 'btn-skip-video' || bestTarget.id === 'btn-skip-tutorial';
      const maxRadius = isPrimary ? this.SNAP_RADIUS * 1.6 : this.SNAP_RADIUS;
      const snapFactor = Math.max(0, 1 - bestDist / maxRadius) * 0.65;

      displayX = filteredX * (1 - snapFactor) + centerX * snapFactor;
      displayY = filteredY * (1 - snapFactor) + centerY * snapFactor;

      if (bestTarget !== this.currentHoveredElement) {
        this.clearHoverState();
        this.currentHoveredElement = bestTarget;
        this.currentHoveredElement.classList.add('camera-hovered');

        // Play gentle hover audio tone
        if (now - this.lastHoverToneTime > 0.18) {
          this.sfx.playUIHover?.();
          this.lastHoverToneTime = now;
        }
      }
    } else {
      this.clearHoverState();
    }

    // Fist Squeeze Progress (0% when open >= 1.40, 100% when clenched <= 1.25)
    const squeeze = Math.max(0, Math.min(1, (1.40 - closure) / (1.40 - this.CLOSURE_FIST)));

    if (this.progressFill) {
      const offset = this.CIRCUMFERENCE * (1 - squeeze);
      this.progressFill.style.strokeDashoffset = `${offset}`;
      if (squeeze > 0.75) {
        this.progressFill.style.stroke = '#ff3344';
      } else if (squeeze > 0.35) {
        this.progressFill.style.stroke = '#ffb700';
      } else {
        this.progressFill.style.stroke = '#00e5ff';
      }
    }

    const isClenched = closure <= this.CLOSURE_FIST;
    const isReleased = closure >= this.CLOSURE_OPEN;

    if (isReleased) {
      this.isFistDown = false;
    }

    // Trigger Click when fist is clenched and cooldown elapsed
    if (isClenched && !this.isFistDown && (now - this.lastClickTime > this.clickCooldown)) {
      this.isFistDown = true;
      this.lastClickTime = now;

      this.triggerShockwave();

      if (this.currentHoveredElement) {
        const target = this.currentHoveredElement;
        this.lastTargetElementId = target.id || target.className;

        target.classList.add('camera-clicking');
        setTimeout(() => target.classList.remove('camera-clicking'), 220);

        this.sfx.playClick();

        // Dispatch native click
        target.click();

        this.showClickFlash();
      } else {
        // Even if not hovering over a specific button, clenching fist in Visual Novel can advance dialogue
        const vnBox = document.getElementById('vn-box');
        const novelContainer = document.getElementById('story-container');
        if (vnBox && novelContainer && !novelContainer.classList.contains('hidden')) {
          this.sfx.playClick();
          vnBox.click();
          this.showClickFlash();
        }
      }
    }

    // Update cursor badge label & icon
    this.updateBadge(isClenched);

    // Apply cursor position with smooth GPU transform (centering around 30px offset)
    this.el.style.transform = `translate3d(${displayX - 30}px, ${displayY - 30}px, 0)`;
    this.el.classList.remove('hidden');
  }

  private updateBadge(isClenched: boolean): void {
    if (!this.iconEl || !this.textEl) return;

    if (this.isFistDown) {
      this.iconEl.textContent = '💥';
      this.textEl.textContent = 'НАЖАТО!';
      this.el?.classList.add('active-click');
      return;
    }

    this.el?.classList.remove('active-click');

    if (isClenched) {
      this.iconEl.textContent = '✊';
      this.textEl.textContent = 'КУЛАК СЖАТ';
      return;
    }

    if (this.currentHoveredElement) {
      this.iconEl.textContent = '✊';
      const id = this.currentHoveredElement.id;
      if (id === 'btn-vn-next') {
        this.textEl.textContent = 'СОЖМИ ДЛЯ ДАЛЕЕ';
      } else if (id === 'btn-skip-video' || id === 'btn-skip-tutorial' || id === 'btn-vn-skip') {
        this.textEl.textContent = 'СОЖМИ ДЛЯ ПРОПУСКА';
      } else if (id === 'btn-story') {
        this.textEl.textContent = 'СОЖМИ: СЮЖЕТ';
      } else if (id === 'btn-play') {
        this.textEl.textContent = 'СОЖМИ: АРЕНА';
      } else if (id === 'btn-restart') {
        this.textEl.textContent = 'СОЖМИ: РЕСТАРТ';
      } else {
        this.textEl.textContent = 'СОЖМИ КУЛАК';
      }
    } else {
      this.iconEl.textContent = '🖐';
      this.textEl.textContent = 'НАВЕДЕНИЕ';
    }
  }

  private triggerShockwave(): void {
    if (!this.shockwaveEl) return;
    this.shockwaveEl.classList.remove('pulse-anim');
    void this.shockwaveEl.offsetWidth; // trigger reflow
    this.shockwaveEl.classList.add('pulse-anim');
  }

  private showClickFlash(): void {
    if (!this.iconEl || !this.textEl) return;
    this.iconEl.textContent = '💥';
    this.textEl.textContent = 'НАЖАТО!';
  }

  private clearHoverState(): void {
    if (this.currentHoveredElement) {
      this.currentHoveredElement.classList.remove('camera-hovered');
      this.currentHoveredElement = null;
    }
  }

  hide(): void {
    if (this.el) {
      this.el.classList.add('hidden');
    }
    this.clearHoverState();
    this.filterX.reset();
    this.filterY.reset();
  }
}
