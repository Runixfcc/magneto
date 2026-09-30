/** Wave system: 3 waves + mini-boss */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Enemy, spawnEnemy, EnemyType } from './enemies';
import { ArenaType } from '../render/scene';

export type WavePhase = 'PRE_WAVE' | 'ACTIVE' | 'INTER_WAVE' | 'COMPLETE';

export interface WaveState {
  currentWave: number;
  totalWaves: number;
  phase: WavePhase;
  timer: number;
  waveName: string;
  enemies: Enemy[];
  allEnemiesSpawned: boolean;
}

export interface WaveDef {
  name: string;
  enemies: { type: EnemyType; count: number }[];
  spawnDelay: number;
}

export const WAVE_DEFS: WaveDef[] = [
  // Wave 1: Wolverine charging fast dummies
  {
    name: 'Волна 1: Охота Росомахи',
    enemies: [{ type: 'wolverine', count: 4 }],
    spawnDelay: 1.2
  },
  // Wave 2: Black Widow & Hawkeye (Guns & Precision Archery)
  {
    name: 'Волна 2: Спецагенты — Вдова и Соколиный Глаз',
    enemies: [
      { type: 'blackwidow', count: 2 },
      { type: 'hawkeye', count: 2 }
    ],
    spawnDelay: 1.4
  },
  // Wave 3: Captain America + Wolverine rush
  {
    name: 'Волна 3: Первый Мститель — Бросок Щита',
    enemies: [
      { type: 'captainamerica', count: 2 },
      { type: 'wolverine', count: 3 }
    ],
    spawnDelay: 1.2
  },
  // Wave 4: Iron Man repulsor assault + Black Widow
  {
    name: 'Волна 4: Железный Человек — Репульсоры',
    enemies: [
      { type: 'ironman', count: 3 },
      { type: 'blackwidow', count: 2 }
    ],
    spawnDelay: 1.2
  },
  // Wave 5: Scarlet Witch chaos magic + Hawkeye
  {
    name: 'Волна 5: Алая Ведьма — Магия Хаоса',
    enemies: [
      { type: 'wanda', count: 2 },
      { type: 'hawkeye', count: 2 },
      { type: 'ironman', count: 1 }
    ],
    spawnDelay: 1.2
  },
  // Wave 6: Giant Jumping HULK + Cap + Wolverine
  {
    name: 'Волна 6: Невероятный ХАЛК — Прыжки и Сокрушение',
    enemies: [
      { type: 'hulk', count: 1 },
      { type: 'captainamerica', count: 2 },
      { type: 'wolverine', count: 2 }
    ],
    spawnDelay: 1.4
  },
  // Wave 7: Avengers Assemble (Hulk, Iron Man, Wanda, Cap)
  {
    name: 'Волна 7: Мстители, общий сбор!',
    enemies: [
      { type: 'hulk', count: 1 },
      { type: 'ironman', count: 2 },
      { type: 'wanda', count: 2 },
      { type: 'captainamerica', count: 2 }
    ],
    spawnDelay: 1.0
  },
  // Wave 8: FINAL BOSS: THANOS & The 6 Infinity Stones
  {
    name: 'ФИНАЛ: ТАНОС — Перчатка и 6 Камней Бесконечности',
    enemies: [
      { type: 'thanos', count: 1 },
      { type: 'wolverine', count: 3 }
    ],
    spawnDelay: 1.5
  }
];

const INTER_WAVE_DURATION = 4.0;

// Spawn positions: generous bigger range (15m to 26m away)
const SPAWN_POSITIONS = [
  new THREE.Vector3(0, 0, -20),     // Far center (20m)
  new THREE.Vector3(-12, 0, -18),   // Far left-center (21m)
  new THREE.Vector3(12, 0, -18),    // Far right-center (21m)
  new THREE.Vector3(-18, 0, -15),   // Left flank (23m)
  new THREE.Vector3(18, 0, -15),    // Right flank (23m)
  new THREE.Vector3(-6, 0, -25),    // Extreme deep left (26m)
  new THREE.Vector3(6, 0, -25),     // Extreme deep right (26m)
  new THREE.Vector3(0, 0, -15),     // Mid center (15m)
  new THREE.Vector3(-8, 0, -14),    // Mid left (16m)
  new THREE.Vector3(8, 0, -14),     // Mid right (16m)
];

export class WaveManager {
  state: WaveState;
  public battleActive = false;
  public arena: ArenaType = 'nyc';
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private spawnQueue: { type: EnemyType; delay: number }[] = [];
  private spawnTimer = 0;

  constructor(scene: THREE.Scene, world: RAPIER.World, arena: ArenaType = 'nyc') {
    this.scene = scene;
    this.world = world;
    this.arena = arena;
    this.battleActive = false;
    this.state = {
      currentWave: 0,
      totalWaves: WAVE_DEFS.length,
      phase: 'PRE_WAVE',
      timer: 2.0,
      waveName: WAVE_DEFS[0]?.name || 'Волна 1',
      enemies: [],
      allEnemiesSpawned: false
    };
  }

  startBattle(arena?: ArenaType): void {
    const curArena = arena || this.arena;
    // CRITICAL: Marvel enemies and battle waves ONLY EVER spawn in NYC!
    if (curArena !== 'nyc') {
      this.battleActive = false;
      return;
    }
    this.battleActive = true;
    this.state.currentWave = 0;
    this.state.waveName = WAVE_DEFS[0]?.name || 'Волна 1';
    this.state.phase = 'PRE_WAVE';
    this.state.timer = 1.0;
  }

  update(dt: number, arena?: ArenaType): void {
    const curArena = arena || this.arena;
    // CRITICAL: Do not update or spawn enemies if not in NYC or battle not active!
    if (!this.battleActive || curArena !== 'nyc') return;

    switch (this.state.phase) {
      case 'PRE_WAVE':
        this.state.timer -= dt;
        if (this.state.timer <= 0) {
          this.startWave();
        }
        break;

      case 'ACTIVE':
        // Spawn enemies from queue
        if (this.spawnQueue.length > 0) {
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            const next = this.spawnQueue.shift()!;
            this.spawnOneEnemy(next.type);
            if (this.spawnQueue.length > 0) {
              this.spawnTimer = this.spawnQueue[0].delay;
            } else {
              this.state.allEnemiesSpawned = true;
            }
          }
        }

        // Check if all enemies defeated
        if (this.state.allEnemiesSpawned &&
            this.state.enemies.every(e => !e.alive)) {
          this.endWave();
        }
        break;

      case 'INTER_WAVE':
        this.state.timer -= dt;
        if (this.state.timer <= 0) {
          if (this.state.currentWave >= WAVE_DEFS.length) {
            this.state.phase = 'COMPLETE';
          } else {
            this.state.phase = 'PRE_WAVE';
            this.state.timer = 2.0;
          }
        }
        break;

      case 'COMPLETE':
        break;
    }
  }

  private startWave(): void {
    const waveDef = WAVE_DEFS[this.state.currentWave];
    if (!waveDef) {
      this.state.phase = 'COMPLETE';
      return;
    }

    this.state.waveName = waveDef.name;
    this.state.phase = 'ACTIVE';
    this.state.allEnemiesSpawned = false;
    this.spawnQueue = [];

    for (const group of waveDef.enemies) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({
          type: group.type,
          delay: waveDef.spawnDelay
        });
      }
    }

    this.spawnTimer = 0.5; // slight initial delay
  }

  private spawnOneEnemy(type: EnemyType): void {
    // Pick appropriate spawn position based on enemy type
    let spawnPos: THREE.Vector3;
    let targetRadius = 8;

    if (type === 'thanos') {
      spawnPos = new THREE.Vector3(0, 0, -25);
      targetRadius = 13;
    } else if (type === 'hulk') {
      const side = Math.random() > 0.5 ? 5 : -5;
      spawnPos = new THREE.Vector3(side, 0, -22);
      targetRadius = 6.5;
    } else if (type === 'wolverine') {
      const idx = Math.floor(Math.random() * SPAWN_POSITIONS.length);
      spawnPos = SPAWN_POSITIONS[idx].clone();
      targetRadius = 1.5; // Runs right up to player!
    } else if (type === 'ironman') {
      spawnPos = new THREE.Vector3((Math.random() - 0.5) * 16, 0, -22);
      targetRadius = 14;
    } else if (type === 'wanda') {
      spawnPos = new THREE.Vector3((Math.random() - 0.5) * 14, 0, -20);
      targetRadius = 13;
    } else if (type === 'hawkeye') {
      const x = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 5);
      spawnPos = new THREE.Vector3(x, 0, -20);
      targetRadius = 14;
    } else if (type === 'captainamerica') {
      spawnPos = new THREE.Vector3((Math.random() - 0.5) * 10, 0, -18);
      targetRadius = 9;
    } else {
      const idx = Math.floor(Math.random() * SPAWN_POSITIONS.length);
      spawnPos = SPAWN_POSITIONS[idx].clone();
      targetRadius = 7 + Math.random() * 4;
    }

    spawnPos.y = 0;

    const targetAngle = Math.atan2(spawnPos.x, spawnPos.z);
    const enemy = spawnEnemy(type, spawnPos, this.scene, this.world);
    enemy.targetPosition.set(
      Math.sin(targetAngle) * targetRadius,
      0,
      Math.cos(targetAngle) * targetRadius
    );

    this.state.enemies.push(enemy);
  }

  private endWave(): void {
    this.state.currentWave++;
    this.state.phase = 'INTER_WAVE';
    this.state.timer = INTER_WAVE_DURATION;
  }

  getAliveEnemies(): Enemy[] {
    return this.state.enemies.filter(e => e.alive && !(e as any).bodyRemoved);
  }

  getBoss(): Enemy | null {
    return this.state.enemies.find(e => (e.type === 'thanos' || e.type === 'hulk') && e.alive && !(e as any).bodyRemoved) || null;
  }

  reset(): void {
    // Clean up existing enemies
    for (const enemy of this.state.enemies) {
      this.scene.remove(enemy.mesh);
      if (!(enemy as any).bodyRemoved) {
        (enemy as any).bodyRemoved = true;
        try {
          this.world.removeRigidBody(enemy.body);
        } catch {}
      }
    }

    this.state = {
      currentWave: 0,
      totalWaves: WAVE_DEFS.length,
      phase: 'PRE_WAVE',
      timer: 3.0,
      waveName: WAVE_DEFS[0]?.name || 'Волна 1',
      enemies: [],
      allEnemiesSpawned: false
    };
    this.spawnQueue = [];
    this.spawnTimer = 0;
  }
}
