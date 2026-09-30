/** Aim gesture: left hand orientation → camera/crosshair direction */

import { HandFeatures, clamp, lerp } from '../tracking/handFeatures';
import { OneEuroFilter } from '../tracking/oneEuroFilter';

export interface AimState {
  yaw: number;     // radians, camera yaw
  pitch: number;   // radians, camera pitch
  calibrated: boolean;
  frozen: boolean;
}

// Calibration offsets
let yaw0 = 0;
let pitch0 = 0;

// Aim-assist
const AIM_ASSIST_CONE = 16 * Math.PI / 180;   // 16 degrees (generous cone)
const AIM_ASSIST_STRENGTH = 0.40;

// Parameters (ultra-responsive, smooth, user-tuneable sensitivity)
const DEAD_ZONE = 0.2 * Math.PI / 180;        // 0.2 degrees (virtually zero deadzone)
const BASE_GAIN = 3.6;                        // Base gain
let sensitivityMultiplier = 1.25;             // User sensitivity multiplier (default 125%)
const YAW_LIMIT = 110 * Math.PI / 180;        // Full arena coverage (up to 110 degrees)
const PITCH_LIMIT = 55 * Math.PI / 180;       // Generous pitch range

export function setAimSensitivity(multiplier: number): void {
  sensitivityMultiplier = Math.max(0.4, Math.min(3.0, multiplier));
}

export function getAimSensitivity(): number {
  return sensitivityMultiplier;
}

const smoothYaw = new OneEuroFilter(2.5, 0.08, 1.0);
const smoothPitch = new OneEuroFilter(2.5, 0.08, 1.0);

const state: AimState = {
  yaw: 0,
  pitch: 0,
  calibrated: false,
  frozen: false
};

// Calibration accumulator
let calibSamples: { yaw: number; pitch: number }[] = [];

export function startCalibration(): void {
  calibSamples = [];
  state.calibrated = false;
}

export function addCalibrationSample(features: HandFeatures): void {
  calibSamples.push({ yaw: features.yaw, pitch: features.pitch });
}

export function finishCalibration(): boolean {
  if (calibSamples.length < 10) return false;
  yaw0 = calibSamples.reduce((s, c) => s + c.yaw, 0) / calibSamples.length;
  pitch0 = calibSamples.reduce((s, c) => s + c.pitch, 0) / calibSamples.length;
  state.calibrated = true;
  smoothYaw.reset();
  smoothPitch.reset();
  return true;
}

function applyDeadZone(val: number): number {
  if (Math.abs(val) < DEAD_ZONE) return 0;
  const sign = val > 0 ? 1 : -1;
  return sign * (Math.abs(val) - DEAD_ZONE);
}

export function updateAim(
  features: HandFeatures | null,
  _enemyPositions: { yaw: number; pitch: number }[],
  time: number
): AimState {
  if (!features || !state.calibrated) {
    state.frozen = true;
    return state;
  }

  state.frozen = false;

  // Subtract calibration offset
  let rawYaw = features.yaw - yaw0;
  let rawPitch = features.pitch - pitch0;

  // Dead zone
  rawYaw = applyDeadZone(rawYaw);
  rawPitch = applyDeadZone(rawPitch);

  // Gain with sensitivity multiplier
  const effectiveGain = BASE_GAIN * sensitivityMultiplier;
  rawYaw *= effectiveGain;
  rawPitch *= effectiveGain;

  // Smooth
  const sy = smoothYaw.filter(rawYaw, time);
  const sp = smoothPitch.filter(rawPitch, time);

  // Clamp
  state.yaw = clamp(sy, -YAW_LIMIT, YAW_LIMIT);
  state.pitch = clamp(sp, -PITCH_LIMIT, PITCH_LIMIT);

  // Aim assist: attract to nearest enemy if within cone
  for (const enemy of _enemyPositions) {
    const dYaw = enemy.yaw - state.yaw;
    const dPitch = enemy.pitch - state.pitch;
    const angle = Math.sqrt(dYaw * dYaw + dPitch * dPitch);
    if (angle < AIM_ASSIST_CONE && angle > 0.001) {
      state.yaw += dYaw * AIM_ASSIST_STRENGTH;
      state.pitch += dPitch * AIM_ASSIST_STRENGTH;
      break; // assist to nearest only
    }
  }

  return state;
}

export function getAimState(): AimState {
  return state;
}

export function freezeAim(): void {
  state.frozen = true;
}

export function unfreezeAim(): void {
  state.frozen = false;
}

export function resetAim(): void {
  state.yaw = 0;
  state.pitch = 0;
  state.calibrated = false;
  state.frozen = false;
  calibSamples = [];
  smoothYaw.reset();
  smoothPitch.reset();
}
