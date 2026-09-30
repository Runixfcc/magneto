/** Screen management: start, calibration, tutorial, results */

import { ScoreState, getAccuracy } from '../game/scoring';
import { getLeaderboard, addScore, LeaderboardEntry } from '../game/leaderboard';
import { ErrorCoach } from '../coach/errorCoach';

type ScreenName = 'start' | 'calibration' | 'tutorial' | 'results' | 'pause' | 'none';

export class ScreenManager {
  private screens: Map<string, HTMLElement> = new Map();
  private current: ScreenName = 'start';

  constructor() {
    this.screens.set('start', document.getElementById('screen-start')!);
    this.screens.set('calibration', document.getElementById('screen-calibration')!);
    this.screens.set('tutorial', document.getElementById('screen-tutorial')!);
    this.screens.set('results', document.getElementById('screen-results')!);
    this.screens.set('pause', document.getElementById('screen-pause')!);
  }

  show(name: ScreenName): void {
    for (const [key, el] of this.screens.entries()) {
      if (key === name) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
    this.current = name;
  }

  getCurrent(): ScreenName {
    return this.current;
  }

  hideAll(): void {
    for (const el of this.screens.values()) {
      el.classList.add('hidden');
    }
    this.current = 'none';
  }

  /** Update calibration ring progress (0–1) */
  updateCalibration(progress: number, secondsLeft: number): void {
    const ring = document.getElementById('ring-progress') as SVGCircleElement | null;
    const timer = document.getElementById('calibration-timer');
    if (ring) {
      const circumference = 2 * Math.PI * 54;
      ring.style.strokeDashoffset = `${circumference * (1 - progress)}`;
    }
    if (timer) {
      timer.textContent = `${Math.ceil(secondsLeft)}`;
    }
  }

  /** Update tutorial step */
  updateTutorial(step: number, totalSteps: number, icon: string, text: string): void {
    const iconEl = document.getElementById('tutorial-icon');
    const textEl = document.getElementById('tutorial-text');
    const progressEl = document.getElementById('tutorial-progress-text');
    if (iconEl) iconEl.textContent = icon;
    if (textEl) textEl.textContent = text;
    if (progressEl) progressEl.textContent = `Шаг ${step} из ${totalSteps}`;
  }

  /** Show results */
  showResults(scoring: ScoreState, coach: ErrorCoach): void {
    this.show('results');

    document.getElementById('result-score')!.textContent = `${scoring.score}`;
    document.getElementById('result-accuracy')!.textContent = `${getAccuracy()}%`;
    document.getElementById('result-kills')!.textContent = `${scoring.kills}`;
    document.getElementById('result-combo')!.textContent = `x${scoring.maxCombo}`;

    // Top error
    const topError = coach.getTopError();
    const topErrorEl = document.getElementById('result-top-error')!;
    const adviceEl = document.getElementById('result-error-advice')!;
    if (topError) {
      topErrorEl.textContent = `${topError.type.replace(/_/g, ' ')} (${topError.count} раз)`;
      adviceEl.textContent = topError.advice;
    } else {
      topErrorEl.textContent = 'Нет ошибок — отлично!';
      adviceEl.textContent = '';
    }

    // Save to leaderboard
    const entry: LeaderboardEntry = {
      score: scoring.score,
      date: new Date().toLocaleDateString(),
      accuracy: getAccuracy(),
      maxCombo: scoring.maxCombo
    };
    addScore(entry);

    // Display leaderboard
    const list = document.getElementById('leaderboard-list')!;
    list.innerHTML = '';
    const board = getLeaderboard();
    for (let i = 0; i < board.length; i++) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="lb-rank">#${i + 1}</span>
        <span>${board[i].date}</span>
        <span class="lb-score">${board[i].score}</span>
      `;
      list.appendChild(li);
    }
  }
}

/** Show toast notification in top-left corner without overlapping */
export function showToast(message: string, type: 'info' | 'error' = 'info'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Don't spawn duplicate identical message if one is already visible
  const existing = Array.from(container.children).find(
    (el) => el.textContent === message
  ) as HTMLElement | undefined;

  if (existing) {
    existing.style.animation = 'none';
    existing.offsetHeight; // trigger reflow
    existing.style.animation = 'toastInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    return;
  }

  // Cap at 3 visible toasts to ensure clean spacing
  while (container.children.length >= 3) {
    const oldest = container.firstElementChild as HTMLElement;
    oldest?.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOutLeft 0.25s ease-in forwards';
    setTimeout(() => toast.remove(), 250);
  }, 2700);
}
