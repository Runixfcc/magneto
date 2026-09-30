/** Leaderboard: localStorage-based high scores */

export interface LeaderboardEntry {
  score: number;
  date: string;
  accuracy: number;
  maxCombo: number;
}

const STORAGE_KEY = 'magnetic_master_leaderboard';
const MAX_ENTRIES = 10;

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export function addScore(entry: LeaderboardEntry): number {
  const board = getLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, MAX_ENTRIES);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable
  }

  return trimmed.findIndex(e => e === entry) + 1;
}

export function isHighScore(score: number): boolean {
  const board = getLeaderboard();
  if (board.length < MAX_ENTRIES) return true;
  return score > (board[board.length - 1]?.score ?? 0);
}
