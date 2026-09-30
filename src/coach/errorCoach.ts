/** Error Coach: detects technique errors and provides specific feedback */

import { HandFeatures } from '../tracking/handFeatures';
import { GestureState } from '../gestures/gestureManager';
import { THRESHOLDS } from './thresholds';

export interface ErrorEntry {
  type: ErrorType;
  priority: number;
  message: string;
  highlight: HighlightTarget;
}

export type ErrorType =
  | 'LOW_CONFIDENCE'
  | 'HAND_AT_EDGE'
  | 'TOO_FAR'
  | 'TOO_CLOSE'
  | 'ROLL_TILTED'
  | 'JITTER'
  | 'LOOSE_FIST'
  | 'EARLY_THROW'
  | 'WEAK_THROW'
  | 'BAD_DIRECTION';

export type HighlightTarget =
  | 'video_frame'
  | 'left_hand'
  | 'right_hand'
  | 'left_palm'
  | 'fingers'
  | 'wrist'
  | 'none';

interface ErrorRule {
  type: ErrorType;
  priority: number;
  message: string;
  highlight: HighlightTarget;
  advice: string;  // for results screen
}

const ERROR_RULES: ErrorRule[] = [
  {
    type: 'LOW_CONFIDENCE',
    priority: 1,
    message: 'Мало света или рука закрыта: включи свет',
    highlight: 'video_frame',
    advice: 'Убедись, что руки хорошо освещены спереди.'
  },
  {
    type: 'HAND_AT_EDGE',
    priority: 2,
    message: 'Рука у края кадра: сдвинься к центру',
    highlight: 'right_hand',
    advice: 'Старайся держать руки ближе к центру кадра камеры.'
  },
  {
    type: 'TOO_FAR',
    priority: 3,
    message: 'Отойди на шаг назад',
    highlight: 'video_frame',
    advice: 'Оптимальное расстояние до камеры: 1.5–2 метра.'
  },
  {
    type: 'TOO_CLOSE',
    priority: 3,
    message: 'Подойди ближе',
    highlight: 'video_frame',
    advice: 'Оптимальное расстояние до камеры: 1.5–2 метра.'
  },
  {
    type: 'ROLL_TILTED',
    priority: 4,
    message: 'Держи ладонь ровнее: прицел уходит вбок',
    highlight: 'left_palm',
    advice: 'Старайся не наклонять левую ладонь — это сбивает прицел.'
  },
  {
    type: 'JITTER',
    priority: 5,
    message: 'Рука дрожит: опусти локоть, замри перед выстрелом',
    highlight: 'left_hand',
    advice: 'Положи локоть на стол или прижми к телу для стабильности.'
  },
  {
    type: 'LOOSE_FIST',
    priority: 6,
    message: 'Сожми кулак плотнее: пальцы не касаются ладони',
    highlight: 'fingers',
    advice: 'Полностью закрывай кулак при захвате — пальцы к ладони.'
  },
  {
    type: 'EARLY_THROW',
    priority: 7,
    message: 'Объект не успел стабилизироваться: держи кулак секунду',
    highlight: 'right_hand',
    advice: 'Подожди секунду после захвата перед броском.'
  },
  {
    type: 'WEAK_THROW',
    priority: 8,
    message: 'Слабый бросок: толкни рукой резче вперёд',
    highlight: 'wrist',
    advice: 'Делай более резкое движение руки при броске.'
  },
  {
    type: 'BAD_DIRECTION',
    priority: 9,
    message: 'Бросок ушёл вбок: толкай руку в сторону прицела',
    highlight: 'right_hand',
    advice: 'Направляй бросок туда же, куда смотрит прицел (левая рука).'
  }
];

export class ErrorCoach {
  private errorCounts: Map<ErrorType, number> = new Map();
  private cooldowns: Map<ErrorType, number> = new Map();
  private currentError: ErrorEntry | null = null;
  private toastTimer = 0;
  private lowConfidenceTimer = 0;
  private yawHistory: { value: number; time: number }[] = [];

  update(
    gestures: GestureState,
    dt: number
  ): ErrorEntry | null {
    // Decrement cooldowns
    for (const [type, cd] of this.cooldowns.entries()) {
      const newCd = cd - dt;
      if (newCd <= 0) this.cooldowns.delete(type);
      else this.cooldowns.set(type, newCd);
    }

    // Decrement toast timer
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.currentError = null;
      }
    }

    // Collect all triggered errors
    const triggered: ErrorEntry[] = [];

    const left = gestures.leftFeatures;
    const right = gestures.rightFeatures;

    // Check each rule
    // P1: Low confidence
    if (left && left.confidence < THRESHOLDS.LOW_CONFIDENCE) {
      this.lowConfidenceTimer += dt;
    } else if (right && right.confidence < THRESHOLDS.LOW_CONFIDENCE) {
      this.lowConfidenceTimer += dt;
    } else {
      this.lowConfidenceTimer = 0;
    }
    if (this.lowConfidenceTimer > THRESHOLDS.LOW_CONFIDENCE_DURATION) {
      triggered.push(this.makeEntry('LOW_CONFIDENCE'));
    }

    // P2: Hand at edge
    const checkEdge = (f: HandFeatures) => {
      const { x, y } = f.wristScreen;
      return x < THRESHOLDS.EDGE_MARGIN || x > 1 - THRESHOLDS.EDGE_MARGIN ||
             y < THRESHOLDS.EDGE_MARGIN || y > 1 - THRESHOLDS.EDGE_MARGIN;
    };
    if ((left && checkEdge(left)) || (right && checkEdge(right))) {
      triggered.push(this.makeEntry('HAND_AT_EDGE'));
    }

    // P3: Palm size (only warn if excessively far away, pushing hand forward is now locomotion)
    if (left) {
      if (left.palmSize < THRESHOLDS.PALM_SIZE_MIN) triggered.push(this.makeEntry('TOO_FAR'));
    }

    // P4: Roll
    if (left && Math.abs(left.roll) > THRESHOLDS.ROLL_LIMIT) {
      triggered.push(this.makeEntry('ROLL_TILTED'));
    }

    // P5: Jitter
    if (left) {
      const now = performance.now() / 1000;
      this.yawHistory.push({ value: left.yaw, time: now });
      // Keep only recent samples
      this.yawHistory = this.yawHistory.filter(s => now - s.time < THRESHOLDS.JITTER_WINDOW);
      if (this.yawHistory.length > 5) {
        const mean = this.yawHistory.reduce((s, e) => s + e.value, 0) / this.yawHistory.length;
        const variance = this.yawHistory.reduce((s, e) => s + (e.value - mean) ** 2, 0) / this.yawHistory.length;
        if (variance > THRESHOLDS.JITTER_THRESHOLD) {
          triggered.push(this.makeEntry('JITTER'));
        }
      }
    }

    // P6: Loose fist during grab attempt
    if (right && gestures.grab.phase === 'HOVER' && right.closure > THRESHOLDS.GRAB_CLOSURE_PEAK) {
      // Only trigger if they seem to be trying to grab (some fingers closing)
      if (right.closure < 1.6) {
        triggered.push(this.makeEntry('LOOSE_FIST'));
      }
    }

    // P7: Early throw
    if (gestures.throw.triggered && gestures.grab.holdDuration < THRESHOLDS.MIN_HOLD_TIME) {
      triggered.push(this.makeEntry('EARLY_THROW'));
    }

    // P8: Weak throw
    if (gestures.throw.triggered && gestures.throw.power < THRESHOLDS.MIN_THROW_SPEED * 20) {
      triggered.push(this.makeEntry('WEAK_THROW'));
    }

    // P9: Bad direction (would need aim vs throw direction comparison)
    // This is checked elsewhere when throw actually happens

    // Pick highest priority (lowest number) that isn't on cooldown
    const available = triggered
      .filter(e => !this.cooldowns.has(e.type))
      .sort((a, b) => a.priority - b.priority);

    if (available.length > 0 && this.toastTimer <= 0) {
      const error = available[0];
      this.currentError = error;
      this.toastTimer = THRESHOLDS.TOAST_DURATION;
      this.cooldowns.set(error.type, THRESHOLDS.COOLDOWN);
      
      // Count
      const count = this.errorCounts.get(error.type) || 0;
      this.errorCounts.set(error.type, count + 1);
    }

    return this.currentError;
  }

  private makeEntry(type: ErrorType): ErrorEntry {
    const rule = ERROR_RULES.find(r => r.type === type)!;
    return {
      type: rule.type,
      priority: rule.priority,
      message: rule.message,
      highlight: rule.highlight
    };
  }

  recordDirectionError(): void {
    if (!this.cooldowns.has('BAD_DIRECTION') && this.toastTimer <= 0) {
      const entry = this.makeEntry('BAD_DIRECTION');
      this.currentError = entry;
      this.toastTimer = THRESHOLDS.TOAST_DURATION;
      this.cooldowns.set('BAD_DIRECTION', THRESHOLDS.COOLDOWN);
      const count = this.errorCounts.get('BAD_DIRECTION') || 0;
      this.errorCounts.set('BAD_DIRECTION', count + 1);
    }
  }

  getCurrentError(): ErrorEntry | null {
    return this.currentError;
  }

  getErrorCounts(): Map<ErrorType, number> {
    return new Map(this.errorCounts);
  }

  getTopError(): { type: ErrorType; count: number; advice: string } | null {
    let maxType: ErrorType | null = null;
    let maxCount = 0;
    for (const [type, count] of this.errorCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }
    if (!maxType) return null;
    const rule = ERROR_RULES.find(r => r.type === maxType)!;
    return { type: maxType, count: maxCount, advice: rule.advice };
  }

  getHighlightTarget(): HighlightTarget {
    return this.currentError?.highlight ?? 'none';
  }

  reset(): void {
    this.errorCounts.clear();
    this.cooldowns.clear();
    this.currentError = null;
    this.toastTimer = 0;
    this.lowConfidenceTimer = 0;
    this.yawHistory = [];
  }
}
