/** Throw gesture: forward thrust + open hand = throw grabbed object */

import { HandFeatures, clamp } from '../tracking/handFeatures';
import { getGrabState, triggerThrow, getIsFist } from './grab';
import { getAimState } from './aim';
import * as THREE from 'three';

export interface ThrowResult {
  triggered: boolean;
  velocity: THREE.Vector3;
  power: number;
}

// Throw power and homing configuration
// Opening hand immediately launches the grabbed object at high velocity!
const BASE_POWER = 30;         // Fast, punchy base velocity (m/s)
const POWER_GAIN = 25;
const MIN_POWER = 28;
const MAX_POWER = 48;

// Self-homing: curves thrown objects toward enemies so hits land easily
const HOMING_CONE = 20 * Math.PI / 180;   // 20 degrees cone
const HOMING_STRENGTH = 6.0;              // Strong guidance
const HOMING_DURATION = 0.9;              // 0.9 seconds

let wasFist = false;
let throwHomingTimer = 0;
let lastThrowVelocity = new THREE.Vector3();

export function updateThrow(
  features: HandFeatures | null,
  dt: number
): ThrowResult {
  const result: ThrowResult = {
    triggered: false,
    velocity: new THREE.Vector3(),
    power: 0
  };

  if (!features) {
    wasFist = false;
    return result;
  }

  const grabState = getGrabState();
  const currentFist = getIsFist();

  // Detect opening of hand while grabbing an object:
  // Immediate shot when fist opens or if in GRAB/THROW phase and hand is open!
  const handOpening = (wasFist && !currentFist) || (grabState.phase === 'GRAB' && !currentFist) || (grabState.phase === 'THROW');

  if ((grabState.phase === 'GRAB' || grabState.phase === 'THROW') && handOpening) {
    const power = clamp(BASE_POWER + (features.wristSpeed || 0) * POWER_GAIN, MIN_POWER, MAX_POWER);
    
    // Direction from aim
    const aim = getAimState();
    const dir = new THREE.Vector3(
      Math.sin(aim.yaw) * Math.cos(aim.pitch),
      Math.sin(aim.pitch),
      -Math.cos(aim.yaw) * Math.cos(aim.pitch)
    ).normalize();

    result.velocity = dir.multiplyScalar(power);
    result.power = power;
    result.triggered = true;

    lastThrowVelocity.copy(result.velocity);
    throwHomingTimer = HOMING_DURATION;

    triggerThrow();
  }

  wasFist = currentFist;

  if (throwHomingTimer > 0) {
    throwHomingTimer -= dt;
  }

  return result;
}

/** Get homing adjustment for a thrown object toward a target */
export function getThrowHomingForce(
  objectPos: THREE.Vector3,
  targetPos: THREE.Vector3
): THREE.Vector3 {
  if (throwHomingTimer <= 0) return new THREE.Vector3();

  const toTarget = targetPos.clone().sub(objectPos);
  const dist = toTarget.length();
  if (dist < 0.5 || dist > 20) return new THREE.Vector3();

  // Check if within homing cone
  const dir = toTarget.normalize();
  const throwDir = lastThrowVelocity.clone().normalize();
  const angle = Math.acos(clamp(dir.dot(throwDir), -1, 1));

  if (angle < HOMING_CONE) {
    return dir.multiplyScalar(HOMING_STRENGTH * throwHomingTimer / HOMING_DURATION);
  }

  return new THREE.Vector3();
}

export function resetThrow(): void {
  wasFist = false;
  throwHomingTimer = 0;
  lastThrowVelocity.set(0, 0, 0);
}
