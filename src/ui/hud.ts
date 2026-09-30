/** HUD: update health, energy, score, combo, wave indicators, Boss health bar & Repulsion ability cooldown */

import { ScoreState } from '../game/scoring';
import { ShieldState } from '../gestures/shield';
import { WaveState } from '../game/waves';
import { Enemy } from '../game/enemies';

export class HUD {
  private hpFill: HTMLElement;
  private hpText: HTMLElement;
  private scoreText: HTMLElement;
  private comboEl: HTMLElement;
  private comboText: HTMLElement;
  private waveText: HTMLElement;
  private waveNameText: HTMLElement | null;
  private hudEl: HTMLElement;
  private bossEl: HTMLElement | null;
  private bossName: HTMLElement | null;
  private bossHpText: HTMLElement | null;
  private bossHpFill: HTMLElement | null;
  private powerStatus: HTMLElement | null;
  private badgeTear: HTMLElement | null;
  private badgeImplosion: HTMLElement | null;
  private modeEl: HTMLElement | null;
  private modeIcon: HTMLElement | null;
  private modeStatus: HTMLElement | null;
  private objectiveEl: HTMLElement | null;
  private objectiveTitle: HTMLElement | null;
  private objectiveCounter: HTMLElement | null;
  private objectiveFill: HTMLElement | null;
  private objectiveDesc: HTMLElement | null;
  private objectiveRem: HTMLElement | null;
  private objectivePips: HTMLElement | null;

  constructor() {
    this.hpFill = document.getElementById('hp-fill')!;
    this.hpText = document.getElementById('hp-text')!;
    this.scoreText = document.getElementById('score-text')!;
    this.comboEl = document.getElementById('hud-combo')!;
    this.comboText = document.getElementById('combo-text')!;
    this.waveText = document.getElementById('wave-text')!;
    this.waveNameText = document.getElementById('wave-name');
    this.hudEl = document.getElementById('hud')!;
    this.bossEl = document.getElementById('hud-boss');
    this.bossName = document.getElementById('boss-name');
    this.bossHpText = document.getElementById('boss-hp-text');
    this.bossHpFill = document.getElementById('boss-hp-fill');
    this.powerStatus = document.getElementById('power-status');
    this.badgeTear = document.getElementById('badge-tear');
    this.badgeImplosion = document.getElementById('badge-implosion');
    this.modeEl = document.getElementById('hud-mode');
    this.modeIcon = document.getElementById('mode-icon');
    this.modeStatus = document.getElementById('mode-status');
    this.objectiveEl = document.getElementById('hud-objective');
    this.objectiveTitle = document.getElementById('objective-title');
    this.objectiveCounter = document.getElementById('objective-counter');
    this.objectiveFill = document.getElementById('objective-fill');
    this.objectiveDesc = document.getElementById('objective-desc');
    this.objectiveRem = document.getElementById('objective-rem');
    this.objectivePips = document.getElementById('objective-pips');
  }

  show(): void {
    this.hudEl.classList.remove('hidden');
  }

  hide(): void {
    this.hudEl.classList.add('hidden');
  }

  update(
    hp: number,
    scoring: ScoreState,
    _shield: ShieldState,
    wave: WaveState,
    boss?: Enemy | null,
    tearState?: { primed: boolean; cooldown: number; max: number },
    implosionState?: { primed: boolean; cooldown: number; max: number },
    walkMode?: boolean,
    objective?: { title: string; desc: string; current: number; total: number; unit?: string; remaining?: number }
  ): void {
    // Locomotion Mode (Standing vs Walking)
    if (this.modeEl && this.modeIcon && this.modeStatus) {
      if (walkMode) {
        this.modeEl.className = 'hud-mode walking';
        this.modeIcon.textContent = '🚶';
        this.modeStatus.textContent = 'ХОДЬБА (ВКЛ)';
      } else {
        this.modeEl.className = 'hud-mode standing';
        this.modeIcon.textContent = '🛑';
        this.modeStatus.textContent = 'СТОЯТЬ';
      }
    }

    // HP
    const maxHp = (hp > 100) ? 200 : 100;
    const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    this.hpFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${Math.round(hp)}`;

    // Danger pulse when low HP
    if (hpPct < 25) {
      this.hpFill.style.animation = 'crosshairPulse 0.5s infinite';
    } else {
      this.hpFill.style.animation = '';
    }

    // Score
    this.scoreText.textContent = `${scoring.score}`;

    // Combo
    if (scoring.combo > 1) {
      this.comboEl.classList.remove('hidden');
      this.comboText.textContent = `x${scoring.combo}`;
    } else {
      this.comboEl.classList.add('hidden');
    }

    // Optical Camera Powers (Magnetic Tear & Scrap Implosion)
    if (this.badgeTear && tearState) {
      if (tearState.primed) {
        this.badgeTear.className = 'power-hud-badge primed';
        this.badgeTear.textContent = '⚡ ТЯНИ В СТОРОНЫ!';
      } else if (tearState.cooldown > 0) {
        this.badgeTear.className = 'power-hud-badge cooling';
        this.badgeTear.textContent = `⚡ РАЗРЫВ (${tearState.cooldown.toFixed(1)}s)`;
      } else {
        this.badgeTear.className = 'power-hud-badge ready';
        this.badgeTear.textContent = '⚡ РАЗРЫВ [T]';
      }
    }

    if (this.badgeImplosion && implosionState) {
      if (implosionState.primed) {
        this.badgeImplosion.className = 'power-hud-badge primed';
        this.badgeImplosion.textContent = '💥 ХЛОПОК РУКАМИ!';
      } else if (implosionState.cooldown > 0) {
        this.badgeImplosion.className = 'power-hud-badge cooling';
        this.badgeImplosion.textContent = `💥 ИМПЛОЗИЯ (${implosionState.cooldown.toFixed(1)}s)`;
      } else {
        this.badgeImplosion.className = 'power-hud-badge ready';
        this.badgeImplosion.textContent = '💥 ИМПЛОЗИЯ [Q]';
      }
    }

    if (this.powerStatus) {
      if ((tearState?.primed) || (implosionState?.primed)) {
        this.powerStatus.textContent = 'READY TO FIRE';
        this.powerStatus.className = 'repulsion-status ready';
      } else if ((tearState?.cooldown ?? 0) <= 0 || (implosionState?.cooldown ?? 0) <= 0) {
        this.powerStatus.textContent = 'READY';
        this.powerStatus.className = 'repulsion-status ready';
      } else {
        this.powerStatus.textContent = 'CHARGING';
        this.powerStatus.className = 'repulsion-status cooling';
      }
    }

    // Wave number & name
    if (wave.waveName && (wave.waveName.startsWith('Миссия') || wave.waveName.startsWith('Финал'))) {
      this.waveText.textContent = `${wave.currentWave}/${wave.totalWaves}`;
      if (this.modeEl) this.modeEl.classList.add('hidden');
    } else {
      this.waveText.textContent = `${Math.min(wave.currentWave + 1, wave.totalWaves)}/${wave.totalWaves}`;
      if (this.modeEl) this.modeEl.classList.remove('hidden');
    }
    if (this.waveNameText && wave.waveName) {
      this.waveNameText.textContent = wave.waveName;
    }

    // Boss bar
    if (this.bossEl) {
      if (boss && boss.alive && wave.phase === 'ACTIVE') {
        this.bossEl.classList.remove('hidden');
        if (this.bossName) {
          this.bossName.textContent = boss.type === 'thanos' ? 'ТАНОС — ВЛАДЫКА БЕСКОНЕЧНОСТИ' : 'НЕВЕРОЯТНЫЙ ХАЛК';
        }
        const bHpPct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
        if (this.bossHpFill) {
          this.bossHpFill.style.width = `${bHpPct}%`;
        }
        if (this.bossHpText) {
          this.bossHpText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
        }
      } else {
        this.bossEl.classList.add('hidden');
      }
    }

    // Mission Objective Tracker
    if (this.objectiveEl) {
      if (objective) {
        this.objectiveEl.classList.remove('hidden');
        if (this.objectiveTitle) this.objectiveTitle.textContent = objective.title;
        if (this.objectiveCounter) {
          if (objective.current >= objective.total) {
            this.objectiveCounter.textContent = `${objective.current} / ${objective.total} ✓`;
            this.objectiveCounter.className = 'objective-counter completed';
          } else {
            this.objectiveCounter.textContent = `${objective.current} / ${objective.total}`;
            this.objectiveCounter.className = 'objective-counter';
          }
        }
        if (this.objectiveDesc) this.objectiveDesc.textContent = objective.desc;
        if (this.objectiveRem) {
          if (objective.remaining !== undefined) {
            this.objectiveRem.textContent = objective.remaining > 0
              ? `Осталось: ${objective.remaining} ${objective.unit || ''}`
              : 'ВЫПОЛНЕНО! (Ожидание перехода)';
          }
        }
        if (this.objectiveFill) {
          const pct = Math.min(100, (objective.current / Math.max(1, objective.total)) * 100);
          this.objectiveFill.style.width = `${pct}%`;
        }
        if (this.objectivePips) {
          const pips = this.objectivePips.querySelectorAll('.pip');
          pips.forEach((pip, idx) => {
            if (idx < objective.current) {
              pip.classList.add('active');
            } else {
              pip.classList.remove('active');
            }
          });
        }
      } else {
        this.objectiveEl.classList.add('hidden');
      }
    }
  }

  flashDamage(): void {
    const flash = document.createElement('div');
    flash.className = 'damage-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 300);
  }
}
