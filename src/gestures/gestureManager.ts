/** Gesture Manager: coordinates all gestures, priorities, state machine */

import { TrackedHands } from '../tracking/handTracker';
import { updateAim, getAimState, AimState, freezeAim, unfreezeAim, resetAim } from './aim';
import { updateGrab, getGrabState, GrabState, resetGrab } from './grab';
import { updateThrow, ThrowResult, resetThrow } from './throw';
import { updateShield, getShieldState, ShieldState, resetShield } from './shield';
import { updatePull, getPullState, PullState, resetPull } from './pull';
import { HandFeatures } from '../tracking/handFeatures';

export interface GestureState {
  aim: AimState;
  grab: GrabState;
  throw: ThrowResult;
  shield: ShieldState;
  pull: PullState;
  leftFeatures: HandFeatures | null;
  rightFeatures: HandFeatures | null;
}

export class GestureManager {
  private hoveredObjectId: number | null = null;
  private hoveredObjectMass = 10;
  private enemyAimPositions: { yaw: number; pitch: number }[] = [];
  private lastState: GestureState;

  constructor() {
    this.lastState = {
      aim: getAimState(),
      grab: getGrabState(),
      throw: { triggered: false, velocity: null as any, power: 0 },
      shield: getShieldState(),
      pull: getPullState(),
      leftFeatures: null,
      rightFeatures: null
    };
  }

  setHoveredObject(id: number | null, mass: number): void {
    this.hoveredObjectId = id;
    this.hoveredObjectMass = mass;
  }

  setEnemyAimPositions(positions: { yaw: number; pitch: number }[]): void {
    this.enemyAimPositions = positions;
  }

  update(hands: TrackedHands, dt: number): GestureState {
    const leftFeatures = hands.left?.features ?? null;
    const rightFeatures = hands.right?.features ?? null;
    const time = hands.timestamp;

    // === RIGHT HAND: throw > grab > pull ===
    const throwResult = updateThrow(rightFeatures, dt);
    
    // Only process grab if not currently throwing
    const grab = updateGrab(
      rightFeatures,
      this.hoveredObjectId,
      this.hoveredObjectMass,
      dt
    );

    // === LEFT HAND: shield & aim ===
    const shield = updateShield(leftFeatures, dt);
    
    // Unfreeze aim so camera never locks up when making a fist or holding a shield!
    unfreezeAim();

    // Aim: Prefer left hand, fallback to right hand if left is offscreen
    const aimFeatures = leftFeatures ?? (grab.phase !== 'THROW' ? rightFeatures : null);
    const aim = updateAim(
      aimFeatures,
      this.enemyAimPositions,
      time
    );

    // Pull only if not grabbing
    const pull = updatePull(
      grab.phase === 'IDLE' || grab.phase === 'HOVER' ? rightFeatures : null,
      dt
    );

    this.lastState = {
      aim,
      grab,
      throw: throwResult,
      shield,
      pull,
      leftFeatures,
      rightFeatures
    };

    return this.lastState;
  }

  getState(): GestureState {
    return this.lastState;
  }

  reset(): void {
    resetAim();
    resetGrab();
    resetThrow();
    resetShield();
    resetPull();
    this.hoveredObjectId = null;
    this.hoveredObjectMass = 10;
    this.enemyAimPositions = [];
  }
}
