/** Marvel Heroes & Thanos Boss Enemies: Wolverine, Iron Man, Black Widow, Captain America, Hulk, Wanda, Hawkeye, Thanos */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { addKill, addHit } from './scoring';

export type EnemyType =
  | 'guard'
  | 'stormtrooper'
  | 'sniper'
  | 'miniboss'
  | 'wolverine'
  | 'ironman'
  | 'blackwidow'
  | 'captainamerica'
  | 'hulk'
  | 'wanda'
  | 'hawkeye'
  | 'thanos'
  | 'puppetmaster'
  | 'spectral_echo';

export interface Enemy {
  id: number;
  type: EnemyType;
  mesh: THREE.Group;
  body: RAPIER.RigidBody;
  hp: number;
  maxHp: number;
  alive: boolean;
  shootTimer: number;
  shootInterval: number;
  points: number;
  laserCharge: number;
  targetPosition: THREE.Vector3;
  inPosition: boolean;
  grabbed?: boolean;
  thrown?: boolean;
  thrownVelocity?: THREE.Vector3;
  // Specific hero states:
  hulkJump?: {
    isJumping: boolean;
    progress: number;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    cooldown: number;
  };
  thanosData?: {
    stoneIndex: number;
    attackTimer: number;
    stoneMeshList: THREE.Mesh[];
  };
}

export type ProjectileType =
  | 'bullet'
  | 'repulsor'
  | 'shield'
  | 'hex'
  | 'arrow'
  | 'power_stone'
  | 'reality_shard'
  | 'mind_beam'
  | 'puppet_tendril'
  | 'astral_bolt';

export interface Bullet {
  id: number;
  mesh: THREE.Mesh | THREE.Group;
  body: RAPIER.RigidBody;
  damage: number;
  lifetime: number;
  fromEnemy: number;
  projectileType: ProjectileType;
}

export const ENEMY_DEFS: Record<EnemyType, {
  name: string;
  hp: number;
  shootInterval: number;
  points: number;
  color: number;
  height: number;
  width: number;
  speed: number;
  bulletDamage: number;
}> = {
  guard: {
    name: 'Нацистский караульный',
    hp: 30,
    shootInterval: 999999,
    points: 150,
    color: 0x475569,
    height: 1.85,
    width: 0.6,
    speed: 2.2,
    bulletDamage: 0
  },
  stormtrooper: {
    name: 'Штурмовик',
    hp: 25,
    shootInterval: 999999,
    points: 250,
    color: 0x64748b,
    height: 2.0,
    width: 0.65,
    speed: 2.5,
    bulletDamage: 0
  },
  sniper: {
    name: 'Снайпер',
    hp: 20,
    shootInterval: 999999,
    points: 300,
    color: 0xf43f5e,
    height: 1.8,
    width: 0.5,
    speed: 2.2,
    bulletDamage: 0
  },
  miniboss: {
    name: 'Охранный дроид',
    hp: 40,
    shootInterval: 999999,
    points: 1000,
    color: 0x8b5cf6,
    height: 2.5,
    width: 0.85,
    speed: 2.0,
    bulletDamage: 0
  },
  wolverine: {
    name: 'Росомаха',
    hp: 35,
    shootInterval: 999999,
    points: 250,
    color: 0xeab308,
    height: 1.8,
    width: 0.65,
    speed: 6.0,
    bulletDamage: 0
  },
  ironman: {
    name: 'Железный Человек',
    hp: 35,
    shootInterval: 999999,
    points: 400,
    color: 0xb91c1c,
    height: 2.0,
    width: 0.7,
    speed: 2.8,
    bulletDamage: 0
  },
  blackwidow: {
    name: 'Чёрная Вдова',
    hp: 30,
    shootInterval: 999999,
    points: 300,
    color: 0x18181b,
    height: 1.75,
    width: 0.5,
    speed: 3.5,
    bulletDamage: 0
  },
  captainamerica: {
    name: 'Капитан Америка',
    hp: 40,
    shootInterval: 999999,
    points: 500,
    color: 0x1e3a8a,
    height: 1.9,
    width: 0.65,
    speed: 3.0,
    bulletDamage: 0
  },
  hulk: {
    name: 'Невероятный Халк',
    hp: 55,
    shootInterval: 999999,
    points: 900,
    color: 0x16a34a,
    height: 3.2,
    width: 1.6,
    speed: 3.0,
    bulletDamage: 0
  },
  wanda: {
    name: 'Алая Ведьма',
    hp: 35,
    shootInterval: 999999,
    points: 450,
    color: 0xdc2626,
    height: 1.75,
    width: 0.55,
    speed: 2.4,
    bulletDamage: 0
  },
  hawkeye: {
    name: 'Соколиный Глаз',
    hp: 30,
    shootInterval: 999999,
    points: 350,
    color: 0x581c87,
    height: 1.85,
    width: 0.55,
    speed: 2.5,
    bulletDamage: 0
  },
  thanos: {
    name: 'ТАНОС — Владыка Бесконечности',
    hp: 75,
    shootInterval: 999999,
    points: 3500,
    color: 0x7c3aed,
    height: 3.5,
    width: 1.6,
    speed: 2.2,
    bulletDamage: 0
  },
  puppetmaster: {
    name: 'АСТРАЛЬНЫЙ КУКЛОВОД // ПАРАЗИТ РАЗУМА',
    hp: 90,
    shootInterval: 999999,
    points: 4000,
    color: 0xdc2626,
    height: 2.4,
    width: 1.4,
    speed: 1.5,
    bulletDamage: 0
  },
  spectral_echo: {
    name: 'Спектральный Фантом',
    hp: 25,
    shootInterval: 999999,
    points: 300,
    color: 0x9333ea,
    height: 1.9,
    width: 0.7,
    speed: 2.2,
    bulletDamage: 0
  }
};

let nextEnemyId = 1;
let nextBulletId = 1;

// =============================================================================
// HERO & CHARACTER MODEL BUILDERS
// =============================================================================

function addHPBar(group: THREE.Group, height: number): void {
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x1f2937, side: THREE.DoubleSide })
  );
  hpBarBg.position.y = height + 0.35;
  hpBarBg.name = 'hpBarBg';
  group.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide })
  );
  hpBarFill.position.y = height + 0.35;
  hpBarFill.name = 'hpBarFill';
  group.add(hpBarFill);
}

// 1. Wolverine: Yellow/Blue Suit, Horned Cowl, 6 Adamantium Claws
function buildWolverine(): THREE.Group {
  const g = new THREE.Group();
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.7 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.4), yellowMat);
  torso.position.y = 0.95;
  torso.castShadow = true;
  g.add(torso);

  // Blue shoulder pads
  for (const s of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.42), blueMat);
    pad.position.set(s * 0.38, 1.25, 0);
    g.add(pad);
  }

  // Head & Mask
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
  head.position.y = 1.48;
  g.add(head);

  // Black/Blue Horns/Fins on Mask
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 5), blueMat);
    horn.rotation.z = s * -0.45;
    horn.position.set(s * 0.22, 1.62, -0.05);
    g.add(horn);
  }

  // Legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.65, 0.25), blueMat);
    leg.position.set(s * 0.16, 0.35, 0);
    g.add(leg);
  }

  // Arms & Adamantium Claws
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), yellowMat);
    arm.position.set(s * 0.44, 0.9, 0);
    g.add(arm);

    // 3 Razor Claws extending forward from each fist
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.45), clawMat);
      claw.position.set(s * 0.44 + c * 0.05, 0.65, 0.22);
      g.add(claw);
    }
  }

  addHPBar(g, 1.8);
  return g;
}

// 2. Iron Man: Crimson & Gold Armor, Glowing Arc Reactor, Visor
function buildIronMan(): THREE.Group {
  const g = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.85, roughness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.15 });
  const arcMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 3.0 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.8, 0.42), redMat);
  torso.position.y = 1.05;
  g.add(torso);

  // Glowing Arc Reactor
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), arcMat);
  arc.rotation.x = Math.PI / 2;
  arc.position.set(0, 1.15, 0.22);
  g.add(arc);

  // Helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.38), redMat);
  helmet.position.y = 1.62;
  g.add(helmet);

  const faceplate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.08), goldMat);
  faceplate.position.set(0, 1.6, 0.18);
  g.add(faceplate);

  // Glowing Eye Visor
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), arcMat);
  eyes.position.set(0, 1.63, 0.23);
  g.add(eyes);

  // Arms & Legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), redMat);
    leg.position.set(s * 0.18, 0.36, 0);
    g.add(leg);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), redMat);
    arm.position.set(s * 0.46, 1.0, 0);
    g.add(arm);

    // Palm repulsor node
    const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), arcMat);
    palm.rotation.x = Math.PI / 2;
    palm.position.set(s * 0.46, 0.68, 0.1);
    g.add(palm);
  }

  addHPBar(g, 2.0);
  return g;
}

// 3. Black Widow: Sleek Tactical Suit, Red Hair, Dual Pistols
function buildBlackWidow(): THREE.Group {
  const g = new THREE.Group();
  const suitMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.3 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
  const redMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.7, 0.32), suitMat);
  torso.position.y = 0.95;
  g.add(torso);

  // Red Hourglass Belt Emblem
  const emblem = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.09, 3), redMat);
  emblem.position.set(0, 0.65, 0.17);
  g.add(emblem);

  // Head & Hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
  head.position.y = 1.45;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), hairMat);
  hair.position.set(0, 1.48, -0.06);
  g.add(hair);

  // Legs & Arms
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.2), suitMat);
    leg.position.set(s * 0.14, 0.32, 0);
    g.add(leg);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.14), suitMat);
    arm.position.set(s * 0.34, 0.92, 0.05);
    g.add(arm);

    // Dual Pistols held in hands
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.22), gunMat);
    gun.position.set(s * 0.34, 0.7, 0.2);
    g.add(gun);
  }

  addHPBar(g, 1.75);
  return g;
}

// 4. Captain America: Blue Suit, Chest Star, Helmet 'A', Vibranium Shield
function buildCaptainAmerica(): THREE.Group {
  const g = new THREE.Group();
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
  const brownMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.78, 0.38), blueMat);
  torso.position.y = 1.0;
  g.add(torso);

  // White Chest Star
  const star = new THREE.Mesh(new THREE.CircleGeometry(0.12, 5), whiteMat);
  star.position.set(0, 1.18, 0.2);
  g.add(star);

  // Red & White Abdominal Stripes
  for (let i = -2; i <= 2; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.02), i % 2 === 0 ? whiteMat : redMat);
    stripe.position.set(i * 0.1, 0.8, 0.2);
    g.add(stripe);
  }

  // Helmet with 'A'
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), blueMat);
  helmet.position.y = 1.55;
  g.add(helmet);

  const letterA = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), whiteMat);
  letterA.position.set(0, 1.62, 0.21);
  g.add(letterA);

  // Legs & Arms
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.68, 0.26), blueMat);
    leg.position.set(s * 0.16, 0.34, 0);
    g.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.25, 0.3), brownMat);
    boot.position.set(s * 0.16, 0.12, 0.03);
    g.add(boot);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.18), blueMat);
    arm.position.set(s * 0.44, 0.98, 0);
    g.add(arm);
  }

  // Vibranium Shield on Left Arm
  const shield = buildVibraniumShieldMesh();
  shield.position.set(-0.52, 0.95, 0.15);
  shield.rotation.y = Math.PI / 4;
  g.add(shield);

  addHPBar(g, 1.9);
  return g;
}

export function buildVibraniumShieldMesh(): THREE.Group {
  const sg = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8, roughness: 0.2 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.15 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.85, roughness: 0.2 });

  // Concentric Rings
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.48, 24), redMat);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.35, 24), whiteMat);
  const ring3 = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.24, 24), redMat);
  const center = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), blueMat);
  const star = new THREE.Mesh(new THREE.CircleGeometry(0.08, 5), whiteMat);

  const parts = [ring1, ring2, ring3, center, star];
  parts.forEach((p, idx) => {
    p.position.z = idx * 0.005;
    sg.add(p);
  });

  return sg;
}

// 5. Hulk: Massive Gamma Green Muscle Titan, Purple Pants
function buildHulk(): THREE.Group {
  const g = new THREE.Group();
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });
  const purpleMat = new THREE.MeshStandardMaterial({ color: 0x7e22ce, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });

  // Massive Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.25, 0.9), greenMat);
  torso.position.y = 1.9;
  g.add(torso);

  // Ripped Purple Pants
  const hips = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.85), purpleMat);
  hips.position.y = 1.25;
  g.add(hips);

  // Big Fierce Head & Black Hair
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 0.65), greenMat);
  head.position.y = 2.75;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.25, 0.68), hairMat);
  hair.position.set(0, 3.05, -0.05);
  g.add(hair);

  // Huge Tree-Trunk Legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.6), purpleMat);
    leg.position.set(s * 0.45, 0.55, 0);
    g.add(leg);

    // Massive Muscular Arms & Heavy Fists
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.1, 0.48), greenMat);
    arm.position.set(s * 1.05, 1.85, 0);
    g.add(arm);

    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.45, 0.52), greenMat);
    fist.position.set(s * 1.05, 1.15, 0.1);
    g.add(fist);
  }

  addHPBar(g, 3.2);
  return g;
}

// 6. Wanda (Scarlet Witch): Crimson Coat, Tiara, Glowing Red Chaos Magic
function buildWanda(): THREE.Group {
  const g = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.4 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x5c2b2b, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
  const magicMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff0044, emissiveIntensity: 2.8 });

  // Torso / Corset
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.32), redMat);
  torso.position.y = 0.96;
  g.add(torso);

  // Head & Auburn Hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
  head.position.y = 1.46;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.35), hairMat);
  hair.position.set(0, 1.4, -0.06);
  g.add(hair);

  // Scarlet Witch M-shaped Crimson Tiara
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 4), redMat);
  crown.rotation.z = Math.PI;
  crown.position.set(0, 1.62, 0.14);
  g.add(crown);

  // Legs & Arms
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.2), darkMat);
    leg.position.set(s * 0.14, 0.32, 0);
    g.add(leg);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.14), redMat);
    arm.position.set(s * 0.35, 0.95, 0);
    g.add(arm);

    // Glowing Red Chaos Magic Orbs in palms
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), magicMat);
    orb.position.set(s * 0.35, 0.66, 0.2);
    g.add(orb);
  }

  addHPBar(g, 1.75);
  return g;
}

// 7. Hawkeye: Dark Purple Tactical Vest, Quiver, Compound Bow
function buildHawkeye(): THREE.Group {
  const g = new THREE.Group();
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.6 });
  const bowMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.75, 0.36), vestMat);
  torso.position.y = 1.0;
  g.add(torso);

  // Quiver on Back
  const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), darkMat);
  quiver.rotation.z = 0.35;
  quiver.position.set(0.12, 1.1, -0.22);
  g.add(quiver);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), skinMat);
  head.position.y = 1.52;
  g.add(head);

  // Legs & Arms
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.24), darkMat);
    leg.position.set(s * 0.15, 0.34, 0);
    g.add(leg);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.16), vestMat);
    arm.position.set(s * 0.38, 0.95, 0);
    g.add(arm);
  }

  // Compound Archery Bow in Hand
  const bowArc = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 16, Math.PI), bowMat);
  bowArc.rotation.y = Math.PI / 2;
  bowArc.position.set(-0.38, 0.95, 0.3);
  g.add(bowArc);

  addHPBar(g, 1.85);
  return g;
}

// 8. Boss Thanos: Giant Purple Titan, Golden Cuirass & Infinity Gauntlet with 6 Glowing Stones
function buildThanos(): { group: THREE.Group; stoneMeshes: THREE.Mesh[] } {
  const g = new THREE.Group();
  const titanSkinMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.65 });
  const goldArmorMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
  const darkBlueMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.3 });

  // Massive Titan Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.3, 0.95), goldArmorMat);
  torso.position.y = 2.05;
  g.add(torso);

  // Blue Inset Lines on Armor
  const chestDeco = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.04), darkBlueMat);
  chestDeco.position.set(0, 2.1, 0.5);
  g.add(chestDeco);

  // Titan Head & Golden Horned Helmet
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.68), titanSkinMat);
  head.position.y = 2.95;
  g.add(head);

  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.35, 0.72), goldArmorMat);
  helmet.position.set(0, 3.2, 0);
  g.add(helmet);

  // Legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.25, 0.6), darkBlueMat);
    leg.position.set(s * 0.46, 0.65, 0);
    g.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.7), goldArmorMat);
    boot.position.set(s * 0.46, 0.22, 0.05);
    g.add(boot);
  }

  // Right Arm (Standard gold armored arm)
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.45), goldArmorMat);
  rightArm.position.set(1.08, 2.0, 0);
  g.add(rightArm);

  // Left Arm & THE INFINITY GAUNTLET!
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.25, 0.52), goldArmorMat);
  leftArm.position.set(-1.12, 1.95, 0);
  g.add(leftArm);

  // Massive Gauntlet Fist
  const gauntletFist = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.62), goldArmorMat);
  gauntletFist.position.set(-1.12, 1.2, 0.15);
  g.add(gauntletFist);

  // THE 6 INFINITY STONES
  const stoneDefs = [
    { name: 'Power', color: 0xa855f7, pos: [-1.28, 1.35, 0.46], r: 0.06 }, // Purple
    { name: 'Space', color: 0x38bdf8, pos: [-1.2, 1.35, 0.46], r: 0.06 },  // Blue
    { name: 'Reality', color: 0xef4444, pos: [-1.12, 1.35, 0.46], r: 0.06 }, // Red
    { name: 'Soul', color: 0xf97316, pos: [-1.04, 1.35, 0.46], r: 0.06 }, // Orange
    { name: 'Time', color: 0x22c55e, pos: [-0.96, 1.35, 0.46], r: 0.06 }, // Green
    { name: 'Mind', color: 0xfacc15, pos: [-1.12, 1.15, 0.48], r: 0.10 }  // Yellow (Big Center Stone!)
  ];

  const stoneMeshes: THREE.Mesh[] = [];
  for (const s of stoneDefs) {
    const sMat = new THREE.MeshStandardMaterial({
      color: s.color,
      emissive: s.color,
      emissiveIntensity: 3.5,
      roughness: 0.1
    });
    const stone = new THREE.Mesh(new THREE.SphereGeometry(s.r, 12, 10), sMat);
    stone.position.set(s.pos[0], s.pos[1], s.pos[2]);
    g.add(stone);
    stoneMeshes.push(stone);
  }

  addHPBar(g, 3.5);
  return { group: g, stoneMeshes };
}

// 9. Nazi Camp Guard: Feldgrau uniform, German Stahlhelm, red armband, Kar98k rifle
function buildNaziGuard(): THREE.Group {
  const g = new THREE.Group();
  const uniformMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.7 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
  const redMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
  const rifleWood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  const rifleSteel = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });

  // Torso (Feldgrau tunic)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.75, 0.34), uniformMat);
  torso.position.y = 0.95;
  g.add(torso);

  // Leather Belt & Buckle
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.36), beltMat);
  belt.position.y = 0.66;
  g.add(belt);

  // Red Armband on left arm
  const armband = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), redMat);
  armband.position.set(-0.38, 1.05, 0);
  g.add(armband);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
  head.position.y = 1.48;
  g.add(head);

  // German Stahlhelm Helmet
  const helmetDome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetMat);
  helmetDome.position.y = 1.54;
  g.add(helmetDome);

  const helmetRim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.08, 12), helmetMat);
  helmetRim.position.y = 1.5;
  g.add(helmetRim);

  // Legs & Boots
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.22), uniformMat);
    leg.position.set(s * 0.14, 0.42, 0);
    g.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.26), bootMat);
    boot.position.set(s * 0.14, 0.14, 0.02);
    g.add(boot);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), uniformMat);
    arm.position.set(s * 0.38, 0.92, 0.05);
    g.add(arm);
  }

  // Kar98k Rifle held forward in ready stance
  const rifleGroup = new THREE.Group();
  rifleGroup.position.set(0.18, 0.85, 0.25);
  rifleGroup.rotation.x = -0.15;

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.65), rifleWood);
  rifleGroup.add(stock);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6), rifleSteel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, 0.35);
  rifleGroup.add(barrel);

  g.add(rifleGroup);

  addHPBar(g, 1.8);
  return g;
}

// 10. The Astral Puppetmaster: High-contrast astral boss, golden armor trims, glowing crimson core & eyes, eye-level visibility
function buildPuppetmaster(): THREE.Group {
  const g = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.2
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.15
  });
  const crimsonPulseMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 3.8,
    roughness: 0.1
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    metalness: 0.85,
    roughness: 0.25
  });

  // Main Torso (Centered at eye level ~1.1m)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 0.65), armorMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  g.add(torso);

  // Gold Breastplate Trim
  const breastplate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.12), goldTrimMat);
  breastplate.position.set(0, 1.15, 0.32);
  g.add(breastplate);

  // Glowing Crimson Core in Chest (Facing directly toward player at +Z)
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), crimsonPulseMat);
  core.position.set(0, 1.18, 0.38);
  g.add(core);

  // Head / Mask (Centered at 1.85m)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), armorMat);
  head.position.set(0, 1.85, 0);
  head.castShadow = true;
  g.add(head);

  // Gold Face Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.08), goldTrimMat);
  visor.position.set(0, 1.88, 0.26);
  g.add(visor);

  // Radiant Glowing Crimson Eyes (Facing +Z)
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.06), crimsonPulseMat);
    eye.position.set(s * 0.15, 1.9, 0.3);
    g.add(eye);

    // Golden Crown Horns
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.65, 6), hornMat);
    horn.position.set(s * 0.32, 2.3, 0);
    horn.rotation.z = s * -0.45;
    g.add(horn);
  }

  // Floating Segmented Shoulder Pauldrons
  for (const s of [-1, 1]) {
    const pauldron = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 5), goldTrimMat);
    pauldron.position.set(s * 0.85, 1.55, 0);
    pauldron.rotation.z = s * -1.2;
    g.add(pauldron);

    // Glowing Marionette Tendrils
    for (let t = 0; t < 2; t++) {
      const tendril = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.01, 1.2, 6),
        crimsonPulseMat
      );
      tendril.position.set(s * (0.8 + t * 0.12), 0.75, t * 0.1);
      g.add(tendril);
    }
  }

  // High-visibility Overhead Boss Beacon (Target diamond above head)
  const beaconGeo = new THREE.OctahedronGeometry(0.2, 0);
  const beacon = new THREE.Mesh(beaconGeo, crimsonPulseMat);
  beacon.position.set(0, 2.55, 0);
  g.add(beacon);

  addHPBar(g, 2.2);
  return g;
}

// 11. Spectral Echo: Floating dark phantom silhouette with glowing violet/crimson eyes
function buildSpectralEcho(): THREE.Group {
  const g = new THREE.Group();
  const shadowMat = new THREE.MeshStandardMaterial({
    color: 0x312e81,
    metalness: 0.8,
    roughness: 0.3
  });
  const glowEyeMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0xc084fc,
    emissiveIntensity: 3.5
  });

  const torso = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.1, 8), shadowMat);
  torso.rotation.x = Math.PI;
  torso.position.y = 1.0;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), shadowMat);
  head.position.y = 1.6;
  head.castShadow = true;
  g.add(head);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), glowEyeMat);
    eye.position.set(s * 0.08, 1.62, 0.2);
    g.add(eye);
  }

  addHPBar(g, 1.85);
  return g;
}

// Router to build enemy mesh by type
function createEnemyMesh(type: EnemyType): { group: THREE.Group; stoneMeshes?: THREE.Mesh[] } {
  switch (type) {
    case 'guard':
    case 'stormtrooper':
      return { group: buildNaziGuard() };
    case 'wolverine':
      return { group: buildWolverine() };
    case 'ironman':
      return { group: buildIronMan() };
    case 'blackwidow':
      return { group: buildBlackWidow() };
    case 'captainamerica':
      return { group: buildCaptainAmerica() };
    case 'hulk':
      return { group: buildHulk() };
    case 'wanda':
      return { group: buildWanda() };
    case 'hawkeye':
      return { group: buildHawkeye() };
    case 'thanos':
      return buildThanos();
    case 'puppetmaster':
      return { group: buildPuppetmaster() };
    case 'spectral_echo':
      return { group: buildSpectralEcho() };
    default:
      return { group: buildNaziGuard() };
  }
}

// =============================================================================
// ENEMY SPAWNING
// =============================================================================

export function spawnEnemy(
  type: EnemyType,
  position: THREE.Vector3,
  scene: THREE.Scene,
  world: RAPIER.World
): Enemy {
  const def = ENEMY_DEFS[type] ?? ENEMY_DEFS.wolverine;
  const { group: mesh, stoneMeshes } = createEnemyMesh(type);
  mesh.position.copy(position);
  scene.add(mesh);

  // Rapier physics body
  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(position.x, position.y, position.z);
  const body = world.createRigidBody(bodyDesc);

  const halfH = def.height * 0.5;
  const halfW = def.width * 0.5;
  const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH, halfW * 0.8);
  world.createCollider(colliderDesc, body);

  const id = nextEnemyId++;

  // Tag group and children for raycasting & magnetic interactions, record original materials
  (mesh as any).userData = { enemyId: id, isEnemy: true };
  mesh.traverse((c) => {
    (c as any).userData = (c as any).userData || {};
    (c as any).userData.enemyId = id;
    (c as any).userData.isEnemy = true;
    if ((c as THREE.Mesh).isMesh) {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (m && m.emissive) {
        (c as any).userData.origEmissive = m.emissive.clone();
        (c as any).userData.origEmissiveIntensity = m.emissiveIntensity;
      }
    }
  });

  // Generous hover helper sphere for responsive crosshair targeting
  const hoverRadius = Math.max(def.height * 0.85, 2.0);
  const hoverSphere = new THREE.Mesh(
    new THREE.SphereGeometry(hoverRadius, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hoverSphere.position.y = halfH;
  (hoverSphere as any).userData = { enemyId: id, isEnemy: true };
  mesh.add(hoverSphere);

  const enemy: Enemy = {
    id,
    type,
    mesh,
    body,
    hp: def.hp,
    maxHp: def.hp,
    alive: true,
    shootTimer: 0.5 + Math.random() * (def.shootInterval * 0.5),
    shootInterval: def.shootInterval,
    points: def.points,
    laserCharge: 0,
    targetPosition: position.clone(),
    inPosition: false,
    grabbed: false,
    thrown: false
  };

  if (type === 'hulk') {
    enemy.hulkJump = {
      isJumping: false,
      progress: 0,
      startPos: position.clone(),
      targetPos: position.clone(),
      cooldown: 3.5
    };
  }

  if (type === 'thanos' && stoneMeshes) {
    enemy.thanosData = {
      stoneIndex: 0,
      attackTimer: 2.0,
      stoneMeshList: stoneMeshes
    };
  }

  return enemy;
}

// =============================================================================
// ENEMY AI & MOVEMENT
// =============================================================================

export function updateEnemyAI(
  enemy: Enemy,
  playerPos: THREE.Vector3,
  dt: number,
  sfx?: any,
  fx?: any
): void {
  if (!enemy.alive) return;
  if (enemy.grabbed || enemy.thrown) return;

  const pos = enemy.mesh.position;
  const def = ENEMY_DEFS[enemy.type] ?? ENEMY_DEFS.wolverine;

  // 1. WOLVERINE: Fast aggressive charge directly toward player!
  if (enemy.type === 'wolverine') {
    const toPlayer = playerPos.clone().sub(pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 1.2) {
      // Zig-zag charge
      const t = performance.now() / 1000;
      const sideOffset = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize().multiplyScalar(Math.sin(t * 4 + enemy.id) * 0.4);
      const step = toPlayer.normalize().add(sideOffset).normalize().multiplyScalar(def.speed * dt);
      pos.add(step);
    }
  }
  // 2. HULK: Ground Movement + Earth-Shattering Super Jump!
  else if (enemy.type === 'hulk' && enemy.hulkJump) {
    const hj = enemy.hulkJump;
    if (hj.isJumping) {
      hj.progress += dt * 0.9; // ~1.1s jump duration
      const t = Math.min(hj.progress, 1.0);
      // Parabolic jump trajectory: peak height 10m
      pos.x = THREE.MathUtils.lerp(hj.startPos.x, hj.targetPos.x, t);
      pos.z = THREE.MathUtils.lerp(hj.startPos.z, hj.targetPos.z, t);
      pos.y = Math.sin(t * Math.PI) * 10;

      if (t >= 1.0) {
        // LANDING SLAM!
        hj.isJumping = false;
        pos.y = 0;
        hj.cooldown = 4.5;
        sfx?.playHulkSmash();
        fx?.spawnRepulsionWave(pos);
      }
    } else {
      hj.cooldown -= dt;
      // Walk slowly toward player
      const toPlayer = playerPos.clone().sub(pos);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      if (dist > 5.0) {
        pos.add(toPlayer.normalize().multiplyScalar(def.speed * dt));
      }

      // Trigger jump when cooldown expires
      if (hj.cooldown <= 0 && dist > 4.0) {
        hj.isJumping = true;
        hj.progress = 0;
        hj.startPos.copy(pos);
        // Target near player (3m offset)
        hj.targetPos.copy(playerPos).add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3));
      }
    }
  }
  // 3. IRON MAN: Levitation Hover and Strafe
  else if (enemy.type === 'ironman') {
    const t = performance.now() / 1000 + enemy.id;
    pos.y = 1.4 + Math.sin(t * 2.5) * 0.35;
    pos.x = enemy.targetPosition.x + Math.sin(t * 0.6) * 3.5;
  }
  // 4. WANDA: Floating Chaos Levitation
  else if (enemy.type === 'wanda') {
    const t = performance.now() / 1000 + enemy.id;
    pos.y = 1.0 + Math.sin(t * 2.0) * 0.25;
    pos.x = enemy.targetPosition.x + Math.cos(t * 0.5) * 2.0;
  }
  // 5. PUPPETMASTER: Eye-level Astral Hover in Mindscape Front
  else if (enemy.type === 'puppetmaster') {
    const t = performance.now() / 1000 + enemy.id;
    pos.y = enemy.targetPosition.y + Math.sin(t * 1.5) * 0.25;
    pos.x = enemy.targetPosition.x + Math.sin(t * 0.4) * 2.0;
    pos.z = enemy.targetPosition.z + Math.cos(t * 0.3) * 0.6;
  }
  // 6. SPECTRAL ECHO: Gliding Orbit Around Puppetmaster in Player's View
  else if (enemy.type === 'spectral_echo') {
    const t = performance.now() / 1000 * 0.8 + enemy.id * 1.57;
    pos.y = enemy.targetPosition.y + Math.sin(t * 2.2) * 0.2;
    pos.x = enemy.targetPosition.x + Math.sin(t) * 1.8;
    pos.z = enemy.targetPosition.z + Math.cos(t) * 1.0;
  }
  // 5. Standard movement for other heroes and Thanos
  else {
    if (!enemy.inPosition) {
      const toTarget = enemy.targetPosition.clone().sub(pos);
      const dist = toTarget.length();
      if (dist > 0.4) {
        const step = toTarget.normalize().multiplyScalar(Math.min(def.speed * dt, dist));
        pos.add(step);
      } else {
        enemy.inPosition = true;
      }
    }
  }

  // Face player
  const lookDir = playerPos.clone().sub(pos);
  lookDir.y = 0;
  if (lookDir.lengthSq() > 0.01) {
    const angle = Math.atan2(lookDir.x, lookDir.z);
    enemy.mesh.rotation.y = angle;
  }

  // Update physics body
  try {
    enemy.body.setNextKinematicTranslation({
      x: pos.x,
      y: pos.y,
      z: pos.z
    });
  } catch {}

  // HP Bar update
  const fill = enemy.mesh.getObjectByName('hpBarFill') as THREE.Mesh;
  if (fill) {
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    fill.scale.x = ratio;
    fill.position.x = -(1 - ratio) * 0.6;
  }
}

// =============================================================================
// HERO & THANOS SHOOTING & ABILITIES
// =============================================================================

function createProjectileMesh(type: ProjectileType): THREE.Object3D {
  switch (type) {
    case 'repulsor': {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 3.0 })
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.04, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
      );
      g.add(core, ring);
      return g;
    }

    case 'shield': {
      const s = buildVibraniumShieldMesh();
      s.scale.set(0.85, 0.85, 0.85);
      return s;
    }

    case 'hex': {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 14, 12),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff0044, emissiveIntensity: 3.0 })
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.035, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
      );
      ring.rotation.x = Math.PI / 2;
      g.add(core, ring);
      return g;
    }

    case 'arrow': {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
      );
      shaft.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.16, 5),
        new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 2.0 })
      );
      head.rotation.x = -Math.PI / 2;
      head.position.z = -0.48;
      g.add(shaft, head);
      return g;
    }

    case 'power_stone': {
      const g = new THREE.Group();
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 3.5 })
      );
      const aura = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.4 })
      );
      g.add(orb, aura);
      return g;
    }

    case 'reality_shard': {
      return new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.55, 4),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.5 })
      );
    }

    case 'mind_beam': {
      return new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 3.5 })
      );
    }

    case 'puppet_tendril': {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xef4444, emissiveIntensity: 3.5 })
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.035, 6, 12),
        new THREE.MeshBasicMaterial({ color: 0xff0044 })
      );
      ring.rotation.x = Math.PI / 2;
      g.add(core, ring);
      return g;
    }

    case 'astral_bolt': {
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0xa855f7, emissiveIntensity: 2.8 })
      );
    }

    case 'bullet':
    default: {
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 2.0 })
      );
    }
  }
}

export function spawnProjectile(
  fromPos: THREE.Vector3,
  dir: THREE.Vector3,
  speed: number,
  type: ProjectileType,
  damage: number,
  fromEnemyId: number,
  scene: THREE.Scene,
  world: RAPIER.World,
  bullets: Bullet[]
): void {
  const mesh = createProjectileMesh(type);
  mesh.position.copy(fromPos);
  scene.add(mesh);

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(fromPos.x, fromPos.y, fromPos.z)
    .setLinvel(dir.x * speed, dir.y * speed, dir.z * speed)
    .setGravityScale(type === 'shield' || type === 'arrow' ? 0.3 : 0)
    .setLinearDamping(0.01);

  const body = world.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.ball(0.25).setSensor(true);
  world.createCollider(colliderDesc, body);

  bullets.push({
    id: nextBulletId++,
    mesh: mesh as any,
    body,
    damage,
    lifetime: 4.5,
    fromEnemy: fromEnemyId,
    projectileType: type
  });
}

export function updateEnemyShooting(
  _enemy: Enemy,
  _playerPos: THREE.Vector3,
  _scene: THREE.Scene,
  _world: RAPIER.World,
  _bullets: Bullet[],
  _dt: number,
  _objects?: any[],
  _sfx?: any
): void {
  // Enemies strictly do not shoot at the player as requested!
  return;
}

function _unusedEnemyShooting(
  enemy: Enemy,
  playerPos: THREE.Vector3,
  scene: THREE.Scene,
  world: RAPIER.World,
  bullets: Bullet[],
  dt: number,
  objects?: any[],
  sfx?: any
): void {
  if (!enemy.alive) return;
  if (enemy.grabbed || enemy.thrown) return;

  const def = ENEMY_DEFS[enemy.type];
  if (!def || def.shootInterval > 9000) return; // Wolverine dummies don't shoot

  enemy.shootTimer -= dt;
  if (enemy.shootTimer > 0) return;
  enemy.shootTimer = def.shootInterval + (Math.random() - 0.5) * 0.4;

  const startPos = enemy.mesh.position.clone();
  startPos.y += def.height * 0.65;

  const dir = playerPos.clone().sub(startPos).normalize();

  // 1. IRON MAN: Repulsor Blast
  if (enemy.type === 'ironman') {
    sfx?.playRepulsor();
    spawnProjectile(startPos, dir, 26, 'repulsor', def.bulletDamage, enemy.id, scene, world, bullets);
  }
  // 2. BLACK WIDOW: Dual Tactical Pistol Shots
  else if (enemy.type === 'blackwidow') {
    sfx?.playGunshot();
    spawnProjectile(startPos.clone().add(new THREE.Vector3(-0.25, 0, 0)), dir, 36, 'bullet', def.bulletDamage, enemy.id, scene, world, bullets);
    setTimeout(() => {
      if (enemy.alive) {
        sfx?.playGunshot();
        spawnProjectile(startPos.clone().add(new THREE.Vector3(0.25, 0, 0)), dir, 36, 'bullet', def.bulletDamage, enemy.id, scene, world, bullets);
      }
    }, 150);
  }
  // 3. CAPTAIN AMERICA: Throws Vibranium Shield!
  else if (enemy.type === 'captainamerica') {
    sfx?.playShieldThrow();
    spawnProjectile(startPos, dir, 22, 'shield', def.bulletDamage, enemy.id, scene, world, bullets);
  }
  // 4. WANDA (SCARLET WITCH): Red Chaos Magic Sphere
  else if (enemy.type === 'wanda') {
    sfx?.playHexMagic();
    spawnProjectile(startPos, dir, 20, 'hex', def.bulletDamage, enemy.id, scene, world, bullets);
  }
  // 5. HAWKEYE: Supersonic Arrow
  else if (enemy.type === 'hawkeye') {
    sfx?.playArrowShot();
    spawnProjectile(startPos, dir, 40, 'arrow', def.bulletDamage, enemy.id, scene, world, bullets);
  }
  // 6. NAZI GUARD: Kar98k Rifle Shot
  else if (enemy.type === 'guard' || enemy.type === 'stormtrooper') {
    sfx?.playGunshot();
    spawnProjectile(startPos, dir, 32, 'bullet', def.bulletDamage, enemy.id, scene, world, bullets);
  }
  // 7. THANOS: Gauntlet Object Throw & 6 Infinity Stones!
  else if (enemy.type === 'thanos' && enemy.thanosData) {
    const td = enemy.thanosData;
    const stoneIndex = td.stoneIndex % 6;
    td.stoneIndex++;

    // Check if Thanos throws a nearby street object with his Infinity Gauntlet!
    const nearbyObj = objects ? objects.find((o: any) => !o.grabbed && !o.thrown && o.mesh.position.distanceTo(enemy.mesh.position) < 18) : null;
    if (nearbyObj && (Math.random() < 0.4 || stoneIndex === 1)) {
      sfx?.playInfinityStone();
      nearbyObj.thrown = true;
      const objPos = nearbyObj.mesh.position;
      const throwDir = playerPos.clone().sub(objPos).normalize();
      nearbyObj.body.setLinvel({
        x: throwDir.x * 26,
        y: Math.max(3, throwDir.y * 26 + 3.5),
        z: throwDir.z * 26
      }, true);
      return;
    }

    sfx?.playInfinityStone();

    // Highlight active stone on gauntlet
    if (td.stoneMeshList[stoneIndex]) {
      const stoneMat = td.stoneMeshList[stoneIndex].material as THREE.MeshStandardMaterial;
      stoneMat.emissiveIntensity = 8.0;
      setTimeout(() => {
        try { stoneMat.emissiveIntensity = 3.5; } catch {}
      }, 700);
    }

    switch (stoneIndex) {
      // 0. POWER STONE (Purple): Massive Cosmic Destruction Orb!
      case 0:
        spawnProjectile(startPos, dir, 20, 'power_stone', 30, enemy.id, scene, world, bullets);
        break;

      // 1. SPACE STONE (Blue): Teleport & Launch Energy Barrage!
      case 1: {
        // Warp Thanos to a new street lane
        const newX = (Math.random() - 0.5) * 16;
        const newZ = -14 - Math.random() * 12;
        enemy.mesh.position.set(newX, 0, newZ);
        enemy.targetPosition.set(newX, 0, newZ);
        spawnProjectile(enemy.mesh.position.clone().add(new THREE.Vector3(0, 2.0, 0)), dir, 24, 'repulsor', 22, enemy.id, scene, world, bullets);
        break;
      }

      // 2. REALITY STONE (Red): 3 Shards of Distorted Reality!
      case 2:
        for (let i = -1; i <= 1; i++) {
          const spreadDir = dir.clone().add(new THREE.Vector3(i * 0.15, 0, 0)).normalize();
          spawnProjectile(startPos, spreadDir, 28, 'reality_shard', 16, enemy.id, scene, world, bullets);
        }
        break;

      // 3. TIME STONE (Green): Temporal Reversal (Heals 30 HP!)
      case 3:
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + 30);
        // Launch slow-moving green temporal pulse
        spawnProjectile(startPos, dir, 15, 'hex', 18, enemy.id, scene, world, bullets);
        break;

      // 4. SOUL STONE (Orange): High-Impact Soul Wave
      case 4:
        spawnProjectile(startPos, dir, 24, 'power_stone', 24, enemy.id, scene, world, bullets);
        break;

      // 5. MIND STONE (Yellow): Piercing Laser Bolt
      case 5:
        spawnProjectile(startPos, dir, 45, 'mind_beam', 28, enemy.id, scene, world, bullets);
        break;
    }
  }

  // 9. PUPPETMASTER: Fires crimson psychic tendril beam
  if (enemy.type === 'puppetmaster') {
    sfx?.playPsychicWhisper();
    spawnProjectile(startPos, dir, 22, 'puppet_tendril', def.bulletDamage, enemy.id, scene, world, bullets);
  }

  // 10. SPECTRAL ECHO: Fires shadowy astral bolt
  if (enemy.type === 'spectral_echo') {
    spawnProjectile(startPos, dir, 18, 'astral_bolt', def.bulletDamage, enemy.id, scene, world, bullets);
  }
}

// =============================================================================
// DAMAGE & CRUSH (CRASH PROTECTED)
// =============================================================================

export function damageEnemy(
  enemy: Enemy,
  impactEnergy: number,
  relativeSpeed: number,
  scene: THREE.Scene,
  world: RAPIER.World
): boolean {
  if (!enemy.alive || relativeSpeed < 0.8) return false;

  const DAMAGE_K = 0.04;
  const damage = Math.min(Math.max(impactEnergy * DAMAGE_K, 10), 30);
  enemy.hp -= damage;

  if (damage > 0) addHit();

  if (enemy.hp <= 0) {
    enemy.alive = false;
    addKill(enemy.points);

    // Death effect: fall over and safely remove
    const mesh = enemy.mesh;
    const fallTween = { t: 0 };
    const startRot = mesh.rotation.x;
    
    const animate = () => {
      fallTween.t += 0.04;
      if (fallTween.t >= 1) {
        scene.remove(mesh);
        if (!(enemy as any).bodyRemoved) {
          (enemy as any).bodyRemoved = true;
          try { world.removeRigidBody(enemy.body); } catch {}
        }
        return;
      }
      mesh.rotation.x = startRot + fallTween.t * Math.PI * 0.5;
      mesh.position.y -= 0.02;
      requestAnimationFrame(animate);
    };
    animate();

    return true;
  }

  // Flash red on hit
  enemy.mesh.traverse(child => {
    if ((child as THREE.Mesh).material) {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        const origColor = mat.emissive.clone();
        mat.emissive.set(0xff0000);
        setTimeout(() => mat.emissive.copy(origColor), 150);
      }
    }
  });

  return false;
}

export function crushEnemy(
  enemy: Enemy,
  scene: THREE.Scene,
  world: RAPIER.World
): boolean {
  if (!enemy.alive) return false;
  enemy.alive = false;
  enemy.hp = 0;
  enemy.grabbed = false;
  enemy.thrown = false;
  enemy.thrownVelocity = undefined;
  addKill(enemy.points + 250);

  // Instantly POP and disappear from scene
  scene.remove(enemy.mesh);
  enemy.mesh.visible = false;

  // Safely remove rigid body and tag as removed to prevent double-free
  if (!(enemy as any).bodyRemoved) {
    (enemy as any).bodyRemoved = true;
    try {
      enemy.body.setNextKinematicTranslation({ x: 0, y: -9999, z: 0 });
    } catch {}
    try {
      world.removeRigidBody(enemy.body);
    } catch {}
  }

  return true;
}

// =============================================================================
// BULLET UPDATES & SHIELD REFLECTION
// =============================================================================

export function updateBullets(
  bullets: Bullet[],
  playerPos: THREE.Vector3,
  scene: THREE.Scene,
  world: RAPIER.World,
  dt: number,
  shieldActive: boolean,
  shieldPos: THREE.Vector3
): { damage: number; reflectedBullets: Bullet[] } {
  let totalDamage = 0;
  const reflected: Bullet[] = [];
  const toRemove: number[] = [];

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.lifetime -= dt;

    // Sync mesh from physics
    const bpos = bullet.body.translation();
    bullet.mesh.position.set(bpos.x, bpos.y, bpos.z);

    // Dynamic rotation: shield spins, arrow aligns
    if (bullet.projectileType === 'shield') {
      bullet.mesh.rotation.z += 22 * dt;
    } else if (bullet.projectileType === 'hex') {
      bullet.mesh.rotation.y += 10 * dt;
    }

    if (bullet.lifetime <= 0) {
      toRemove.push(i);
      continue;
    }

    const distToPlayer = bullet.mesh.position.distanceTo(playerPos);

    // Left hand Shield Deflection check
    if (shieldActive && distToPlayer < 2.8) {
      const distToShield = bullet.mesh.position.distanceTo(shieldPos);
      if (distToShield < 2.2) {
        // Reflect projectile back at enemies with high power!
        const vel = bullet.body.linvel();
        const normal = bullet.mesh.position.clone().sub(shieldPos).normalize();
        const d = vel.x * normal.x + vel.y * normal.y + vel.z * normal.z;
        bullet.body.setLinvel({
          x: (vel.x - 2 * d * normal.x) * 1.2,
          y: (vel.y - 2 * d * normal.y) * 1.2,
          z: (vel.z - 2 * d * normal.z) * 1.2
        }, true);
        reflected.push(bullet);
        continue;
      }
    }

    // Hit player
    if (distToPlayer < 0.9) {
      totalDamage += bullet.damage;
      toRemove.push(i);
    }
  }

  // Clean up expired or impact bullets
  for (const i of toRemove.sort((a, b) => b - a)) {
    const bullet = bullets[i];
    scene.remove(bullet.mesh);
    try { world.removeRigidBody(bullet.body); } catch {}
    bullets.splice(i, 1);
  }

  return { damage: totalDamage, reflectedBullets: reflected };
}

export function resetEnemyIds(): void {
  nextEnemyId = 1;
  nextBulletId = 1;
}
