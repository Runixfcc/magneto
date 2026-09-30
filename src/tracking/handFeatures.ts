/** Hand feature extraction from MediaPipe landmarks */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface HandFeatures {
  /** 0-2 normalized closure (lower = fist) */
  closure: number;
  /** yaw angle in radians */
  yaw: number;
  /** pitch angle in radians */
  pitch: number;
  /** roll angle in radians */
  roll: number;
  /** palm size (normalized, for distance estimation) */
  palmSize: number;
  /** 2D palm size on camera screen (0-1), increases significantly when hand is pushed closer to screen */
  screenPalmSize: number;
  /** 2D wrist position (0-1 range, screen coords) */
  wristScreen: { x: number; y: number };
  /** wrist speed in screen units/sec */
  wristSpeed: number;
  /** direction palm is facing (normal vector) */
  palmNormal: Vec3;
  /** per-finger distances normalized by palm size */
  fingerDistances: number[];
  /** is palm facing camera */
  palmFacingCamera: boolean;
  /** pointing index finger gesture (☝️) */
  isPointingIndex: boolean;
  /** confidence score */
  confidence: number;
}

/* --- vector helpers --- */

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v: Vec3): Vec3 {
  const l = length(v);
  if (l < 1e-8) return { x: 0, y: 0, z: 1 };
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function dist(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* --- feature extraction --- */

const TIP_INDICES = [4, 8, 12, 16, 20];

interface WristHistory {
  x: number;
  y: number;
  t: number;
}

let leftWristHistory: WristHistory | null = null;
let rightWristHistory: WristHistory | null = null;

export function extractFeatures(
  worldLandmarks: Vec3[],
  screenLandmarks: Vec3[],
  handedness: 'Left' | 'Right',
  confidence: number,
  time: number
): HandFeatures {
  const w = worldLandmarks;
  const s = screenLandmarks;

  // Palm size: wrist to base of middle finger
  const palmSize = dist(w[0], w[9]);
  // Screen palm size: size on 2D camera viewport (0 to ~0.35+)
  const screenPalmSize = dist(s[0], s[9]);

  // Closure: average tip-to-wrist distance normalized by palm
  const fingerDistances = TIP_INDICES.map(t => dist(w[t], w[0]) / palmSize);
  const closure = fingerDistances.reduce((a, b) => a + b, 0) / fingerDistances.length;

  // Forward vector: wrist → middle finger base
  const forward = normalize(sub(w[9], w[0]));

  // Responsive left-right turning (yaw) and up-down aiming (pitch)
  // In mirrored user view (webcam is flipped horizontally via scaleX(-1)):
  // - Tilting hand to user's right makes s[0].x > s[9].x -> tiltYaw > 0
  // - Tilting hand to user's left makes s[0].x < s[9].x -> tiltYaw < 0
  // - Moving hand to user's right lowers camera s.x -> (0.5 - s[9].x) > 0
  // - Moving hand to user's left raises camera s.x -> (0.5 - s[9].x) < 0
  const tiltX = s[0].x - s[9].x;
  const tiltY = Math.max(0.02, s[0].y - s[9].y);
  const tiltYaw = Math.atan2(tiltX, tiltY);
  const posOffsetX = 0.5 - s[9].x;

  // Combine hand tilt and lateral hand movement for ultra-fluid turning
  const yaw = tiltYaw * 1.5 + posOffsetX * 3.0;

  // Vertical pitch: screen Y displacement + vertical finger angle
  const posOffsetY = 0.5 - s[9].y;
  const pitch = posOffsetY * 2.2 + clamp(-forward.y - 0.5, -0.8, 0.8) * 0.8;

  // Palm normal for roll and palm-facing detection
  const v1 = sub(w[5], w[0]);   // wrist → index base
  const v2 = sub(w[17], w[0]);  // wrist → pinky base
  const palmNormal = normalize(cross(v1, v2));
  const roll = Math.atan2(palmNormal.x, palmNormal.y);

  // Palm facing camera: check if normal z-component is positive (toward camera)
  const palmFacingCamera = palmNormal.z > 0.3;

  // Wrist screen position
  const wristScreen = { x: s[0].x, y: s[0].y };

  // Wrist speed
  const history = handedness === 'Left' ? leftWristHistory : rightWristHistory;
  let wristSpeed = 0;
  if (history) {
    const dt = Math.max(time - history.t, 0.001);
    const dx = s[0].x - history.x;
    const dy = s[0].y - history.y;
    wristSpeed = Math.sqrt(dx * dx + dy * dy) / dt;
  }
  const newHistory = { x: s[0].x, y: s[0].y, t: time };
  if (handedness === 'Left') leftWristHistory = newHistory;
  else rightWristHistory = newHistory;

  // Index pointing gesture (☝️): index extended, other 3 fingers curled
  const isIndexExtended = dist(w[8], w[0]) > dist(w[6], w[0]);
  const isPointingIndex =
    isIndexExtended &&
    fingerDistances[1] > 1.30 &&
    fingerDistances[1] > fingerDistances[2] + 0.25 &&
    fingerDistances[2] < 1.30 &&
    fingerDistances[3] < 1.30 &&
    fingerDistances[4] < 1.30;

  return {
    closure,
    yaw,
    pitch,
    roll,
    palmSize,
    screenPalmSize,
    wristScreen,
    wristSpeed,
    palmNormal,
    fingerDistances,
    palmFacingCamera,
    isPointingIndex,
    confidence
  };
}

export function resetFeatureHistory(): void {
  leftWristHistory = null;
  rightWristHistory = null;
}
