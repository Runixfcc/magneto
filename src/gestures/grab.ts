/** Grab gesture: right hand fist → grab metal object */

import { HandFeatures } from '../tracking/handFeatures';

export type GrabPhase = 'IDLE' | 'HOVER' | 'GRAB' | 'THROW' | 'COOLDOWN';

export interface GrabState {
  phase: GrabPhase;
  targetId: number | null;
  holdDuration: number;
  /** how long in current phase */
  phaseTime: number;
}

// Hysteresis thresholds (tuned for responsive pickup and instant shot on open)
const CLOSURE_GRAB = 1.30;     // enter fist below this (easy to grab)
const CLOSURE_RELEASE = 1.40;  // exit fist above this (quick to open)
const DEBOUNCE_FRAMES = 1;     // zero-delay response
const COOLDOWN_TIME = 0.35;    // seconds

const state: GrabState = {
  phase: 'IDLE',
  targetId: null,
  holdDuration: 0,
  phaseTime: 0
};

let isFist = false;
let fistFrameCount = 0;
let openFrameCount = 0;

export function updateGrab(
  features: HandFeatures | null,
  hoveredObjectId: number | null,
  objectMass: number,
  dt: number
): GrabState {
  state.phaseTime += dt;

  if (!features) {
    // Lost hand: soft release
    if (state.phase === 'GRAB') {
      state.phase = 'IDLE';
      state.targetId = null;
      state.holdDuration = 0;
    }
    return state;
  }

  // Fist detection with hysteresis and debounce
  const closure = features.closure;
  if (!isFist && closure < CLOSURE_GRAB) {
    fistFrameCount++;
    if (fistFrameCount >= DEBOUNCE_FRAMES) {
      isFist = true;
      fistFrameCount = 0;
    }
  } else if (isFist && closure > CLOSURE_RELEASE) {
    openFrameCount++;
    if (openFrameCount >= DEBOUNCE_FRAMES) {
      isFist = false;
      openFrameCount = 0;
    }
  } else {
    if (!isFist) fistFrameCount = 0;
    if (isFist) openFrameCount = 0;
  }

  switch (state.phase) {
    case 'IDLE':
      if (hoveredObjectId !== null) {
        state.targetId = hoveredObjectId;
        state.phaseTime = 0;
        if (isFist) {
          state.phase = 'GRAB';
          state.holdDuration = 0;
        } else {
          state.phase = 'HOVER';
        }
      }
      break;

    case 'HOVER':
      if (hoveredObjectId === null) {
        if (state.phaseTime > 0.3) {
          state.phase = 'IDLE';
          state.targetId = null;
          state.phaseTime = 0;
        }
      } else {
        state.targetId = hoveredObjectId;
        state.phaseTime = 0;
      }
      if (isFist && state.targetId !== null) {
        state.phase = 'GRAB';
        state.holdDuration = 0;
        state.phaseTime = 0;
      }
      break;

    case 'GRAB':
      state.holdDuration += dt;
      if (!isFist) {
        // Hand opened: IMMEDIATELY transition to THROW to fire object forward!
        state.phase = 'THROW';
        state.phaseTime = 0;
      }
      break;

    case 'THROW':
      state.phase = 'COOLDOWN';
      state.targetId = null;
      state.holdDuration = 0;
      state.phaseTime = 0;
      break;

    case 'COOLDOWN':
      if (state.phaseTime >= COOLDOWN_TIME) {
        state.phase = 'IDLE';
        state.phaseTime = 0;
      }
      break;
  }

  return state;
}

export function triggerThrow(): void {
  if (state.phase === 'GRAB') {
    state.phase = 'THROW';
    state.phaseTime = 0;
  }
}

export function getGrabState(): GrabState {
  return state;
}

export function getIsFist(): boolean {
  return isFist;
}

export function resetGrab(): void {
  state.phase = 'IDLE';
  state.targetId = null;
  state.holdDuration = 0;
  state.phaseTime = 0;
  isFist = false;
  fistFrameCount = 0;
  openFrameCount = 0;
}
