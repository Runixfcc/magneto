/** Shield gesture: left fist → magnetic shield */

import { HandFeatures } from '../tracking/handFeatures';
import * as THREE from 'three';

export interface ShieldState {
  active: boolean;
  energy: number;
  holdTime: number;
}

const MAX_ENERGY = 100;
const DRAIN_RATE = 20;      // per second
const REGEN_RATE = 8;       // per second
const ACTIVATION_TIME = 0.2; // seconds of fist needed
const SHIELD_CLOSURE_THRESHOLD = 1.15;  // same as grab fist

const state: ShieldState = {
  active: false,
  energy: MAX_ENERGY,
  holdTime: 0
};

export function updateShield(
  features: HandFeatures | null,
  dt: number
): ShieldState {
  if (!features) {
    state.active = false;
    state.holdTime = 0;
    // Still regenerate
    state.energy = Math.min(MAX_ENERGY, state.energy + REGEN_RATE * dt);
    return state;
  }

  const isFist = features.closure < SHIELD_CLOSURE_THRESHOLD;

  if (isFist) {
    state.holdTime += dt;
    if (state.holdTime >= ACTIVATION_TIME) {
      state.active = true;
      state.energy = MAX_ENERGY;
    }
  } else {
    state.active = false;
    state.holdTime = 0;
    state.energy = MAX_ENERGY;
  }

  return state;
}

/** Reflect a bullet velocity off the shield */
export function reflectBullet(
  bulletVel: THREE.Vector3,
  shieldNormal: THREE.Vector3
): THREE.Vector3 {
  const n = shieldNormal.clone().normalize();
  const reflected = bulletVel.clone().sub(
    n.multiplyScalar(2 * bulletVel.dot(n))
  );
  return reflected.multiplyScalar(0.8);
}

export function getShieldState(): ShieldState {
  return state;
}

export function resetShield(): void {
  state.active = false;
  state.energy = MAX_ENERGY;
  state.holdTime = 0;
}
