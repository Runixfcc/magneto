/** Error detection thresholds — easy to tune */

export const THRESHOLDS = {
  // Priority 1: Tracker confidence
  LOW_CONFIDENCE: 0.5,
  LOW_CONFIDENCE_DURATION: 1.0,

  // Priority 2: Hand near edge
  EDGE_MARGIN: 0.08,   // 8% from edge

  // Priority 3: Palm size bounds
  PALM_SIZE_MIN: 0.04,
  PALM_SIZE_MAX: 0.18,

  // Priority 4: Roll limit
  ROLL_LIMIT: 30 * Math.PI / 180,

  // Priority 5: Jitter
  JITTER_WINDOW: 0.5,   // seconds
  JITTER_THRESHOLD: 0.08, // variance threshold

  // Priority 6: Closure during grab
  GRAB_CLOSURE_PEAK: 1.3,

  // Priority 7: Early throw (relaxed for instant shots)
  MIN_HOLD_TIME: 0.05,  // seconds

  // Priority 8: Throw speed (relaxed for effortless throws)
  MIN_THROW_SPEED: 0.15,

  // Priority 9: Throw direction
  MAX_THROW_ANGLE: 35 * Math.PI / 180,

  // Display
  TOAST_DURATION: 2.5,  // seconds
  COOLDOWN: 3.0,        // seconds per error type
};
