/** Game scoring system */

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  kills: number;
  throws: number;
  hits: number;
  damageTaken: number;
}

const COMBO_WINDOW = 3.0; // seconds

const state: ScoreState = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  comboTimer: 0,
  kills: 0,
  throws: 0,
  hits: 0,
  damageTaken: 0
};

export function addKill(basePoints: number): void {
  state.kills++;
  state.combo++;
  state.comboTimer = COMBO_WINDOW;

  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  const comboMultiplier = Math.min(state.combo, 10);
  state.score += Math.round(basePoints * comboMultiplier);
}

export function addHit(): void {
  state.hits++;
}

export function addThrow(): void {
  state.throws++;
}

export function addDamage(damage: number): void {
  state.damageTaken += damage;
  state.score = Math.max(0, state.score - Math.round(damage * 2));
}

export function updateScoring(dt: number): void {
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
    }
  }
}

export function getAccuracy(): number {
  if (state.throws === 0) return 0;
  return Math.round((state.hits / state.throws) * 100);
}

export function getScoreState(): ScoreState {
  return { ...state };
}

export function resetScoring(): void {
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.comboTimer = 0;
  state.kills = 0;
  state.throws = 0;
  state.hits = 0;
  state.damageTaken = 0;
}
