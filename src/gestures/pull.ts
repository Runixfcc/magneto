/** Pull gesture: open palm facing camera for 0.7s → attract metal objects */

import { HandFeatures } from '../tracking/handFeatures';

export interface PullState {
  active: boolean;
  chargeTime: number;
  cooldown: number;
  pulling: boolean;
}

const CHARGE_TIME = 0.7;      // seconds needed
const COOLDOWN_TIME = 6;       // seconds
const PULL_RADIUS = 12;        // meters
const PULL_CONE = 20 * Math.PI / 180; // 20 degrees

const state: PullState = {
  active: false,
  chargeTime: 0,
  cooldown: 0,
  pulling: false
};

export function updatePull(
  features: HandFeatures | null,
  dt: number
): PullState {
  // Cooldown ticks down
  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt);
  }

  if (!features || state.cooldown > 0) {
    state.chargeTime = 0;
    state.active = false;
    state.pulling = false;
    return state;
  }

  // Palm facing camera and open hand
  const isOpenPalm = features.closure > 1.6 && features.palmFacingCamera;

  if (isOpenPalm) {
    state.chargeTime += dt;
    if (state.chargeTime >= CHARGE_TIME) {
      state.active = true;
      state.pulling = true;
      state.cooldown = COOLDOWN_TIME;
      state.chargeTime = 0;
    }
  } else {
    state.chargeTime = 0;
    state.active = false;
    state.pulling = false;
  }

  return state;
}

export function getPullState(): PullState {
  return state;
}

export function getPullRadius(): number {
  return PULL_RADIUS;
}

export function getPullCone(): number {
  return PULL_CONE;
}

export function resetPull(): void {
  state.active = false;
  state.chargeTime = 0;
  state.cooldown = 0;
  state.pulling = false;
}
