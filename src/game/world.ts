import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ArenaType, createArenaScene } from '../render/scene';
import { MetalObject, createArenaObjects, createObjects, syncObjects, applyGrabForce, spawnFreshJavelin, spawnDuelReplenishObject } from './objects';
import { Enemy, EnemyType, Bullet, ProjectileType, updateEnemyAI, updateEnemyShooting, damageEnemy, crushEnemy, updateBullets, resetEnemyIds, spawnProjectile, spawnEnemy } from './enemies';
import { WaveManager } from './waves';
import { GestureState } from '../gestures/gestureManager';
import { getThrowHomingForce } from '../gestures/throw';
import { FXManager } from '../render/fx';
import { SFXManager } from '../audio/sfx';
import { updateScoring, addThrow, resetScoring } from './scoring';
import { resetObjectId } from './objects';
import { showToast } from '../ui/screens';

export type MissionId =
  | 'mission_1_javelin'
  | 'mission_2_lock'
  | 'mission_3_escape'
  | 'mission_4_marionette'
  | 'mission_5_awakening'
  | 'mission_6_heroes'
  | 'mission_7_ultimatum'
  | 'duel_mode'
  | 'quick_arena';

export class GameWorld {
  // Three.js
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  
  // Mission and Arena State
  currentMission: MissionId = 'quick_arena';
  currentArena: ArenaType = 'nyc';
  targetHits = 0;
  escapeBulletsBlocked = 0;
  campSniperTimer = 0;
  javelinReplenishTimer = 0;

  // Duel Mode State
  public duelRound = 1;
  public duelDodgeX = 0;
  public duelReplenishTimer = 0;
  public duelEnemyShootTimer = 4.0;
  public duelLaserChargeTimer = 0;
  public duelWarmupTimer = 3.5;

  // Physics
  rapierWorld: RAPIER.World | null = null;
  
  // Game objects
  objects: MetalObject[] = [];
  bullets: Bullet[] = [];
  waveManager: WaveManager | null = null;
  
  // Effects
  fx: FXManager | null = null;
  sfx: SFXManager;
  
  // Player state
  playerHP = 100;
  playerPos = new THREE.Vector3(0, 1.6, 0);
  
  // Aim
  private aimYaw = 0;
  private aimPitch = 0;
  
  // Object and Enemy interaction
  private grabbedObject: MetalObject | null = null;
  private grabbedEnemy: Enemy | null = null;
  private hoveredObjectId: number | null = null; // positive = MetalObject.id, negative = -Enemy.id
  private raycaster = new THREE.Raycaster();

  // Left & Right hand powers state
  private wasLeftFist = false;
  private wasRightFist = false;
  private leftCrushCooldown = 0;
  private leftImpulseCooldown = 0;
  private leftHoldTimer = 0;
  private leftVortexSoundTimer = 0;
  private mindscapeReplenishTimer = 0;

  // Camera Optical Gestures:
  // 1. «МАГНИТНЫЙ РАЗРЫВ» (Magnetic Tear): Dual fists close (<0.28) -> yanked apart (>0.55)
  public tearPrimed = false;
  public tearCooldown = 0;
  public static readonly TEAR_COOLDOWN_TIME = 2.0;

  // 2. «КИНЕТИЧЕСКАЯ ИМПЛОЗИЯ» (Implosion Clap): Dual open palms wide (>0.55) -> slammed together (<0.22)
  public implosionPrimed = false;
  public implosionCooldown = 0;
  public static readonly IMPLOSION_COOLDOWN_TIME = 2.5;

  // Locomotion Modes: Standing (false, default) vs Walking (true)
  public walkModeActive = false;
  private walkToggleCooldown = 0;
  private wasPointing = false;
  private prevScreenPalmSize = 0;
  private isForwardKeyPressed = false;

  // Camera Swoop intro animation (descending from the sky into player body)
  public cameraSwoopActive = false;
  private cameraSwoopTimer = 0;
  private cameraSwoopDuration = 2.4;
  private cameraSwoopStartPos = new THREE.Vector3();
  private cameraSwoopStartPitch = -1.25;
  private onSwoopComplete?: () => void;

  // Quality
  lowQuality: boolean;

  // Mission 4: «Марионетка» Psychic Infiltration State
  public puppetStringsActive = false;
  private puppetStringTimer = 6.0;
  initialized = false;

  constructor(canvas: HTMLCanvasElement, lowQuality: boolean) {
    this.lowQuality = lowQuality;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !lowQuality,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowQuality ? 1 : 1.5));
    this.renderer.shadowMap.enabled = !lowQuality;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );
    this.camera.position.copy(this.playerPos);

    // Audio
    this.sfx = new SFXManager();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());

    // Locomotion keys: W / Up arrow to move, C / M to toggle Standing vs Walking mode
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.isForwardKeyPressed = true;
      }
      if (e.code === 'KeyC' || e.code === 'KeyM') {
        this.toggleWalkMode();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.isForwardKeyPressed = false;
      }
    });
  }

  public toggleWalkMode(): boolean {
    this.walkModeActive = !this.walkModeActive;
    this.walkToggleCooldown = 0.85;
    this.sfx.playClick();
    if (this.walkModeActive) {
      showToast('🚶 Режим ходьбы: ВКЛ (толкай руку к экрану для движения)', 'info');
    } else {
      showToast('🛑 Режим стоять: ВКЛ (персонаж стоит на месте)', 'info');
    }
    return this.walkModeActive;
  }

  public setMission(mission: MissionId): void {
    this.currentMission = mission;
    this.targetHits = 0;
    this.escapeBulletsBlocked = 0;
    this.campSniperTimer = 0;

    // Fixed exposure across all missions (Camp Escape now uses single sun on white ground with crisp shadows)
    this.renderer.toneMappingExposure = 0.95;

    switch (mission) {
      case 'mission_1_javelin':
        this.setArena('stadium');
        break;
      case 'mission_2_lock':
        this.setArena('bunker');
        break;
      case 'mission_3_escape':
        this.setArena('camp');
        break;
      case 'mission_4_marionette':
        this.setArena('mindscape');
        break;
      case 'quick_arena':
        this.setArena('nyc');
        break;
      case 'mission_5_awakening':
        this.setArena('mindscape');
        break;
      case 'mission_6_heroes':
        this.setArena('nyc');
        break;
      case 'mission_7_ultimatum':
        this.setArena('nyc');
        break;
      case 'duel_mode':
        this.duelRound = 1;
        this.playerHP = 200;
        this.duelWarmupTimer = 3.5;
        this.duelEnemyShootTimer = 4.5;
        this.setArena('duel');
        break;
    }
  }

  public setArena(arena: ArenaType): void {
    this.currentArena = arena;
    if (!this.rapierWorld) return;

    // 1. Remove old objects from scene and clear arrays
    for (const obj of this.objects) {
      this.scene.remove(obj.mesh);
    }
    for (const bullet of this.bullets) {
      this.scene.remove(bullet.mesh);
    }
    this.objects = [];
    this.bullets = [];
    this.grabbedObject = null;
    this.grabbedEnemy = null;
    this.hoveredObjectId = null;

    // Remove any leftover enemies completely from scene
    if (this.waveManager) {
      this.waveManager.battleActive = false;
      for (const e of this.waveManager.state.enemies) {
        this.scene.remove(e.mesh);
        if (e.body) {
          try { this.rapierWorld.removeRigidBody(e.body); } catch (_) {}
        }
      }
      this.waveManager.state.enemies = [];
    }

    // 2. Clear scene meshes and build new arena scene
    createArenaScene(arena, this.scene, this.lowQuality);

    // 3. Reset Rapier physics world
    this.rapierWorld.free();
    const gravity = { x: 0, y: -9.81, z: 0 };
    this.rapierWorld = new RAPIER.World(gravity);

    // 4. Setup arena-specific physics boundaries & player spawn position
    if (arena === 'stadium') {
      // Floor (Grass & running track)
      const floorBody = this.rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0)
      );
      this.rapierWorld.createCollider(
        RAPIER.ColliderDesc.cuboid(60, 0.1, 70),
        floorBody
      );

      // Boundary grandstand walls
      const walls = [
        { pos: [0, 4, 38], size: [40, 5, 0.5] },   // South runway end
        { pos: [0, 4, -68], size: [40, 5, 0.5] },  // Far North sector end
        { pos: [-38, 4, 0], size: [0.5, 5, 68] },  // West grandstand line
        { pos: [38, 4, 0], size: [0.5, 5, 68] }    // East grandstand line
      ];
      for (const w of walls) {
        const body = this.rapierWorld.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(w.pos[0], w.pos[1], w.pos[2])
        );
        this.rapierWorld.createCollider(
          RAPIER.ColliderDesc.cuboid(w.size[0], w.size[1], w.size[2]),
          body
        );
      }

      // Player stands on javelin runway facing downfield towards the targets (-Z)
      this.playerPos.set(0, 1.6, 6);
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(0, 0, 0);

    } else if (arena === 'bunker') {
      // Floor
      const floorBody = this.rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0)
      );
      this.rapierWorld.createCollider(
        RAPIER.ColliderDesc.cuboid(14, 0.1, 14),
        floorBody
      );

      // Concrete walls
      const walls = [
        { pos: [0, 2.2, -7.0], size: [10, 3, 0.5] }, // Front vault door wall
        { pos: [0, 2.2, 9.0], size: [10, 3, 0.5] },  // Rear wall
        { pos: [-8.5, 2.2, 0], size: [0.5, 3, 10] }, // Left wall
        { pos: [8.5, 2.2, 0], size: [0.5, 3, 10] }   // Right wall
      ];
      for (const w of walls) {
        const body = this.rapierWorld.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(w.pos[0], w.pos[1], w.pos[2])
        );
        this.rapierWorld.createCollider(
          RAPIER.ColliderDesc.cuboid(w.size[0], w.size[1], w.size[2]),
          body
        );
      }

      // Player stands in bunker room facing locked vault door (-Z)
      this.playerPos.set(0, 1.6, 2.5);
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(0, 0, 0);

    } else if (arena === 'camp') {
      // Floor
      const floorBody = this.rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0)
      );
      this.rapierWorld.createCollider(
        RAPIER.ColliderDesc.cuboid(30, 0.1, 45),
        floorBody
      );

      // Perimeter barbed wire & gate colliders (North exit gate at z = -20)
      const walls = [
        { pos: [0, 3, -24], size: [18, 4, 0.5] }, // North wall just behind gate
        { pos: [0, 3, 24], size: [18, 4, 0.5] },  // South spawn boundary
        { pos: [-10, 3, 0], size: [0.5, 4, 30] }, // West fence
        { pos: [10, 3, 0], size: [0.5, 4, 30] }   // East fence
      ];
      for (const w of walls) {
        const body = this.rapierWorld.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(w.pos[0], w.pos[1], w.pos[2])
        );
        this.rapierWorld.createCollider(
          RAPIER.ColliderDesc.cuboid(w.size[0], w.size[1], w.size[2]),
          body
        );
      }

      // Player starts at South end of the camp facing North towards the exit gate (-Z)
      this.playerPos.set(0, 1.6, 18);
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(0, 0, 0);

    } else if (arena === 'duel') {
      // Pure White Plane Arena (Режим «ДУЭЛИ»)
      const floorBody = this.rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0)
      );
      this.rapierWorld.createCollider(
        RAPIER.ColliderDesc.cuboid(50, 0.1, 70),
        floorBody
      );

      // Side invisible boundaries
      const leftWall = this.rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(-8.5, 2, 0)
      );
      this.rapierWorld.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 4, 60), leftWall);
      const rightWall = this.rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(8.5, 2, 0)
      );
      this.rapierWorld.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 4, 60), rightWall);

      // Player stands at z = 3.5 looking downfield at enemy at z = -5.5 (9m distance)
      this.duelDodgeX = 0;
      this.playerPos.set(0, 1.6, 3.5);
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(0, 0, 0);
      this.aimYaw = 0;
      this.aimPitch = 0;

    } else {
      // NYC & Mindscape
      const floorBody = this.rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0)
      );
      this.rapierWorld.createCollider(
        RAPIER.ColliderDesc.cuboid(40, 0.1, 40),
        floorBody
      );

      const wallBodies = [
        { pos: [0, 4, -39], size: [20, 5, 0.5] },
        { pos: [0, 4, 39], size: [20, 5, 0.5] },
        { pos: [-18, 4, 0], size: [0.5, 5, 40] },
        { pos: [18, 4, 0], size: [0.5, 5, 40] }
      ];
      for (const wall of wallBodies) {
        const body = this.rapierWorld.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(wall.pos[0], wall.pos[1], wall.pos[2])
        );
        this.rapierWorld.createCollider(
          RAPIER.ColliderDesc.cuboid(wall.size[0], wall.size[1], wall.size[2]),
          body
        );
      }

      this.playerPos.set(0, 1.6, 0);
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(0, 0, 0);
    }

    // 5. Spawn arena specific metallic objects
    this.objects = createArenaObjects(arena, this.scene, this.rapierWorld);

    // 6. Rebind wave manager
    this.waveManager = new WaveManager(this.scene, this.rapierWorld, arena);
    this.waveManager.battleActive = false;

    // 7. If Camp arena, spawn Nazi Guards stationed along the escape path
    if (arena === 'camp') {
      this.waveManager.battleActive = true;
      const guardSpawns = [
        { x: -3.5, y: 0, z: 13 },
        { x: 3.5, y: 0, z: 11 },
        { x: -3.8, y: 0, z: 5 },
        { x: 3.8, y: 0, z: 3 },
        { x: -3.5, y: 0, z: -3 },
        { x: 3.5, y: 0, z: -5 },
        { x: -3.6, y: 0, z: -11 },
        { x: 3.6, y: 0, z: -13 }
      ];
      this.waveManager.state.enemies = guardSpawns.map(pos =>
        spawnEnemy('guard', new THREE.Vector3(pos.x, pos.y, pos.z), this.scene, this.rapierWorld!)
      );
    }

    // 8. If Mindscape arena for Mission 4: «Марионетка», spawn Puppetmaster Boss & Spectral Echoes directly in front!
    if (this.currentMission === 'mission_4_marionette') {
      this.waveManager.battleActive = true;
      const puppetBoss = spawnEnemy('puppetmaster', new THREE.Vector3(0, 0.2, -8.0), this.scene, this.rapierWorld!);
      puppetBoss.mesh.rotation.y = 0; // Local +Z faces world +Z toward player
      const echoes = [
        spawnEnemy('spectral_echo', new THREE.Vector3(-3.8, 0.2, -7.5), this.scene, this.rapierWorld!),
        spawnEnemy('spectral_echo', new THREE.Vector3(3.8, 0.2, -7.5), this.scene, this.rapierWorld!),
        spawnEnemy('spectral_echo', new THREE.Vector3(-2.2, 0.2, -9.2), this.scene, this.rapierWorld!),
        spawnEnemy('spectral_echo', new THREE.Vector3(2.2, 0.2, -9.2), this.scene, this.rapierWorld!)
      ];
      for (const echo of echoes) {
        echo.mesh.rotation.y = 0;
      }
      this.waveManager.state.enemies = [puppetBoss, ...echoes];
    }

    // 9. Mission 6: «Битва с Героями Земли» -> Iron Man, Captain America & Support Sentinels
    if (this.currentMission === 'mission_6_heroes') {
      this.waveManager.battleActive = true;
      const ironman = spawnEnemy('ironman', new THREE.Vector3(0, 1.8, -15), this.scene, this.rapierWorld!);
      const cap = spawnEnemy('captainamerica', new THREE.Vector3(-4.5, 1.4, -13), this.scene, this.rapierWorld!);
      const sentinel1 = spawnEnemy('miniboss', new THREE.Vector3(5, 1.8, -16), this.scene, this.rapierWorld!);
      const sentinel2 = spawnEnemy('miniboss', new THREE.Vector3(-7, 1.8, -17), this.scene, this.rapierWorld!);
      this.waveManager.state.enemies = [ironman, cap, sentinel1, sentinel2];
    }

    // 10. Mission 7: «Ультиматум Мутантов» -> Hulk, Wanda, Iron Man & Heavy War Sentinel
    if (this.currentMission === 'mission_7_ultimatum') {
      this.waveManager.battleActive = true;
      const hulk = spawnEnemy('hulk', new THREE.Vector3(0, 2.0, -16), this.scene, this.rapierWorld!);
      const wanda = spawnEnemy('wanda', new THREE.Vector3(4.5, 1.6, -14), this.scene, this.rapierWorld!);
      const ironman = spawnEnemy('ironman', new THREE.Vector3(-5, 1.8, -15), this.scene, this.rapierWorld!);
      const heavySentinel = spawnEnemy('miniboss', new THREE.Vector3(0, 2.2, -22), this.scene, this.rapierWorld!);
      this.waveManager.state.enemies = [hulk, wanda, ironman, heavySentinel];
    }

    // 11. Режим «ДУЭЛИ» (1 на 1 на Белой Плоскости)
    if (arena === 'duel') {
      this.waveManager.battleActive = true;
      const duelTypes: EnemyType[] = ['ironman', 'captainamerica', 'hulk', 'thanos'];
      const enemyType = duelTypes[(this.duelRound - 1) % duelTypes.length];
      // Opponent placed 9m in front of player (player at z = 3.5, opponent at z = -5.5)
      const opponent = spawnEnemy(enemyType, new THREE.Vector3(0, 1.4, -5.5), this.scene, this.rapierWorld!);
      // Increase opponent HP by 35% for epic duel endurance
      opponent.hp = Math.round(opponent.maxHp * 1.35);
      opponent.maxHp = opponent.hp;
      opponent.mesh.rotation.y = 0;

      // Add high-visibility glowing target beacon above opponent's head
      const beaconGeom = new THREE.OctahedronGeometry(0.35, 0);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0xff1744,
        wireframe: true
      });
      const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
      beaconMesh.position.set(0, 2.5, 0);
      beaconMesh.name = 'targetBeacon';
      opponent.mesh.add(beaconMesh);

      this.waveManager.state.enemies = [opponent];
    }
  }

  async init(): Promise<void> {
    // Initialize Rapier
    await RAPIER.init();
    const gravity = { x: 0, y: -9.81, z: 0 };
    this.rapierWorld = new RAPIER.World(gravity);

    // Build current arena (defaulting to stadium for story or nyc for quick arena)
    this.setArena(this.currentArena);

    // FX
    this.fx = new FXManager(this.renderer, this.scene, this.camera, this.lowQuality);

    // SFX
    this.sfx.init();
    this.sfx.startFieldHum();

    this.initialized = true;
  }

  /** Trigger cinematic camera swoop from sky into player's body */
  public startCameraSwoop(duration = 2.2, onComplete?: () => void): void {
    this.cameraSwoopActive = true;
    this.cameraSwoopTimer = 0;
    this.cameraSwoopDuration = duration;
    this.onSwoopComplete = onComplete;

    // Start high up in the sky
    this.cameraSwoopStartPos.set(
      this.playerPos.x,
      this.playerPos.y + 60,
      this.playerPos.z + 30
    );
    this.camera.position.copy(this.cameraSwoopStartPos);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateX(this.cameraSwoopStartPitch);
    this.camera.fov = 95;
    this.camera.updateProjectionMatrix();

    // Play rushing dive sound
    this.sfx.playSkyDive();

    // Show visual overlay for speed lines & possession
    const overlay = document.getElementById('camera-swoop-overlay');
    if (overlay) {
      overlay.classList.remove('hidden', 'impact');
      const title = overlay.querySelector('.swoop-title');
      const sub = overlay.querySelector('.swoop-sub');
      if (title) title.textContent = 'ПОГРУЖЕНИЕ В СОЗНАНИЕ...';
      if (sub) sub.textContent = 'СИНХРОНИЗАЦИЯ С ТЕЛОМ';
    }
  }

  private triggerPossessionFlash(): void {
    const overlay = document.getElementById('camera-swoop-overlay');
    if (overlay) {
      overlay.classList.add('impact');
      const title = overlay.querySelector('.swoop-title');
      const sub = overlay.querySelector('.swoop-sub');
      if (title) title.textContent = '⚡ СОЗНАНИЕ АКТИВИРОВАНО: ЭРИК ЛЕНШЕР';
      if (sub) sub.textContent = 'МАГНЕТИЗМ ПОД КОНТРОЛЕМ';
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('impact');
      }, 550);
    }
  }

  update(dt: number, gestures: GestureState): void {
    if (!this.rapierWorld || !this.waveManager || !this.fx) return;

    // Clamp dt
    dt = Math.min(dt, 1 / 30);

    // Cooldowns
    if (this.leftCrushCooldown > 0) {
      this.leftCrushCooldown -= dt;
    }
    if (this.leftImpulseCooldown > 0) {
      this.leftImpulseCooldown -= dt;
    }

    const isMarionetteOrArcade = (
      this.currentMission === 'mission_4_marionette' ||
      this.currentMission === 'quick_arena' ||
      this.currentMission === 'mission_6_heroes' ||
      this.currentMission === 'mission_7_ultimatum' ||
      this.currentMission === 'duel_mode'
    );
    const isCampEscape = (this.currentMission === 'mission_3_escape');

    // === Camera update ===
    this.aimYaw = gestures.aim.yaw;
    this.aimPitch = gestures.aim.pitch;

    if (this.cameraSwoopActive) {
      this.cameraSwoopTimer += dt;
      const progress = Math.min(1, this.cameraSwoopTimer / this.cameraSwoopDuration);
      
      // Dramatic plunge: rapid descent slowing down smoothly into the player's eyes
      const ease = 1 - Math.pow(1 - progress, 4);

      // Lerp position from sky down into player eyes
      this.camera.position.lerpVectors(this.cameraSwoopStartPos, this.playerPos, ease);

      // Lerp rotation from looking down to facing current aim direction
      const currentPitch = THREE.MathUtils.lerp(this.cameraSwoopStartPitch, this.aimPitch, ease);
      const currentYaw = THREE.MathUtils.lerp(0, -this.aimYaw, ease);
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotateY(currentYaw);
      this.camera.rotateX(currentPitch);

      // Dynamic FOV zoom: wide 95 in the sky down to 70
      this.camera.fov = THREE.MathUtils.lerp(95, 70, ease);
      this.camera.updateProjectionMatrix();

      if (progress >= 1) {
        this.cameraSwoopActive = false;
        this.camera.position.copy(this.playerPos);
        this.camera.fov = 70;
        this.camera.updateProjectionMatrix();
        this.sfx.playImpact(200);
        this.triggerPossessionFlash();
        if (this.onSwoopComplete) {
          this.onSwoopComplete();
          this.onSwoopComplete = undefined;
        }
      }
    } else {
      if (!gestures.aim.frozen) {
        this.camera.rotation.set(0, 0, 0);
        this.camera.rotateY(-this.aimYaw);
        this.camera.rotateX(this.aimPitch);
      }
      this.camera.position.copy(this.playerPos);
    }

    // Enemies across all arenas: NYC, Camp, Mindscape, and Duel
    const aliveEnemies = this.waveManager ? this.waveManager.getAliveEnemies() : [];

    // === Raycasting & Cone Proximity for hover (checks BOTH metal objects AND enemy models) ===
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    
    const testObjects: THREE.Object3D[] = [];
    // Enemies prioritized first for responsive aim targeting
    for (const e of aliveEnemies) {
      if (!e.alive) continue;
      testObjects.push(e.mesh);
      testObjects.push(...e.mesh.children);
    }
    for (const o of this.objects) {
      testObjects.push(o.mesh);
      testObjects.push(...o.mesh.children);
    }

    const intersects = this.raycaster.intersectObjects(testObjects, true);

    this.hoveredObjectId = null;
    if (intersects.length > 0 && intersects[0].distance < 38) {
      let hit: THREE.Object3D | null = intersects[0].object;
      while (hit && !(hit as any).userData?.objectId && !(hit as any).userData?.enemyId) {
        hit = hit.parent;
      }
      if (hit) {
        if ((hit as any).userData?.enemyId) {
          this.hoveredObjectId = -(hit as any).userData.enemyId;
        } else if ((hit as any).userData?.objectId) {
          this.hoveredObjectId = (hit as any).userData.objectId;
        }
      }
    }

    // Generous cone proximity snap: seamless high-priority targeting for enemies and metal props
    if (!this.hoveredObjectId) {
      const camPos = this.camera.position;
      const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
      
      let bestScore = Infinity;
      let bestId: number | null = null;

      // 1. Enemies (high priority for targeting)
      for (const enemy of aliveEnemies) {
        if (!enemy.alive) continue;
        const ePos = enemy.mesh.position;
        const toEnemy = ePos.clone().sub(camPos);
        const dist = toEnemy.length();
        if (dist > 0.4 && dist < 36) {
          toEnemy.normalize();
          const angle = camDir.angleTo(toEnemy);
          const angleThreshold = 2.4 / dist + 0.28;
          if (angle < angleThreshold) {
            const score = angle * 6 + dist * 0.08 - 1.2; // strong priority
            if (score < bestScore) {
              bestScore = score;
              bestId = -enemy.id;
            }
          }
        }
      }

      // 2. Metal Objects
      for (const obj of this.objects) {
        if (obj.grabbed) continue;
        const objPos = obj.mesh.position;
        const toObj = objPos.clone().sub(camPos);
        const dist = toObj.length();
        if (dist > 0.4 && dist < 32) {
          toObj.normalize();
          const angle = camDir.angleTo(toObj);
          const angleThreshold = (obj.hitRadius ?? 1.2) / dist + 0.14;
          if (angle < angleThreshold) {
            const score = angle * 14 + dist * 0.16;
            if (score < bestScore) {
              bestScore = score;
              bestId = obj.id;
            }
          }
        }
      }

      if (bestId !== null) {
        this.hoveredObjectId = bestId;
      }
    }

    // === Highlight hovered/grabbed objects and enemies ===
    for (const obj of this.objects) {
      const isGrabbed = obj.grabbed;
      const isHovered = obj.id === this.hoveredObjectId;
      obj.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive) {
            if (isGrabbed) {
              mat.emissive.set(0x00ffff);
              mat.emissiveIntensity = 3.0;
            } else if (isHovered) {
              mat.emissive.set(0xffb703);
              mat.emissiveIntensity = 2.0;
            } else {
              const orig = (child as any).userData?.origEmissive ?? 0x001122;
              const origInt = (child as any).userData?.origEmissiveIntensity ?? 0.25;
              mat.emissive.set(orig);
              mat.emissiveIntensity = origInt;
            }
          }
        }
      });
    }

    for (const enemy of aliveEnemies) {
      const isGrabbed = enemy.grabbed;
      const isHovered = this.hoveredObjectId === -enemy.id;
      enemy.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive && child.name !== 'hpBarBg' && child.name !== 'hpBarFill') {
            if (isGrabbed) {
              mat.emissive.set(0x00ffff);
              mat.emissiveIntensity = 3.2;
            } else if (isHovered) {
              mat.emissive.set(0xffb703);
              mat.emissiveIntensity = 2.2;
            } else {
              // Restore true original superhero suit materials (no blue wash!)
              const orig = (child as any).userData?.origEmissive;
              const origInt = (child as any).userData?.origEmissiveIntensity;
              if (orig !== undefined && orig !== null) {
                mat.emissive.copy(orig);
                mat.emissiveIntensity = origInt ?? 0;
              } else {
                mat.emissive.set(0x000000);
                mat.emissiveIntensity = 0;
              }
            }
          }
        }
      });
    }

    // =========================================================================
    // === LEFT HAND: POWERFUL MAGNETIC IMPULSE (МАГНИТНЫЙ ИМПУЛЬС) & VORTEX ===
    // =========================================================================
    const leftClosure = gestures.leftFeatures ? gestures.leftFeatures.closure : 2.0;
    const isLeftFist = (gestures.leftFeatures !== null && leftClosure < 1.38)
      || gestures.shield.active
      || Boolean((window as any).__magneto_right_mouse_down);

    // Initial fist clench OR repeat pulse when held with cooldown
    const triggerImpulse = (isLeftFist && !this.wasLeftFist)
      || (isLeftFist && this.leftHoldTimer > 0.6 && this.leftImpulseCooldown <= 0);

    if (triggerImpulse && this.leftImpulseCooldown <= 0) {
      this.leftImpulseCooldown = 0.45;
      this.leftHoldTimer = 0;

      const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
      const waveCenter = this.playerPos.clone().add(camForward.clone().multiplyScalar(2.2));

      // 1. Audio and Visual FX
      this.sfx.playRepulsion();
      this.fx.spawnRepulsionWave(waveCenter);
      this.fx.spawnSparks(waveCenter, 30);
      showToast('💥 МАГНИТНЫЙ ИМПУЛЬС!', 'info');

      // 2. Blast all enemies in front/vicinity with huge kinetic impulse!
      for (const enemy of aliveEnemies) {
        if (!enemy.alive) continue;
        const toEnemy = enemy.mesh.position.clone().sub(this.playerPos);
        const dist = toEnemy.length();
        if (dist > 0.3 && dist < 35) {
          const dir = toEnemy.clone().normalize();
          const angle = camForward.angleTo(dir);
          // If in forward cone (< 75 deg) or very close (< 8m)
          if (angle < 1.3 || dist < 8.0) {
            const power = Math.max(30, 52 - dist * 0.9);
            // Launch upward and outward!
            const launchDir = dir.clone().add(new THREE.Vector3(0, 0.45, 0)).normalize();
            enemy.thrown = true;
            enemy.thrownVelocity = launchDir.multiplyScalar(power);
            enemy.mesh.rotation.x += (Math.random() - 0.5) * 8;
            enemy.mesh.rotation.z += (Math.random() - 0.5) * 8;
            damageEnemy(enemy, 25, power * 0.5, this.scene, this.rapierWorld);
          }
        }
      }

      // 3. Blast all metal objects in front!
      for (const obj of this.objects) {
        if (obj.grabbed) continue;
        const toObj = obj.mesh.position.clone().sub(this.playerPos);
        const dist = toObj.length();
        if (dist > 0.3 && dist < 32) {
          const dir = toObj.clone().normalize();
          const angle = camForward.angleTo(dir);
          if (angle < 1.3 || dist < 8.0) {
            const power = Math.max(18, 38 - dist * 0.8) * obj.mass;
            const launchDir = dir.clone().add(new THREE.Vector3(0, 0.35, 0)).normalize();
            obj.body.applyImpulse({
              x: launchDir.x * power,
              y: launchDir.y * power,
              z: launchDir.z * power
            }, true);
          }
        }
      }
    }

    if (isLeftFist) {
      this.leftHoldTimer += dt;
      // While held: Magnetic vortex lifts nearby enemies and objects into the air in front!
      const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
      const levitateCenter = this.playerPos.clone().add(camForward.clone().multiplyScalar(4.0));
      levitateCenter.y = 1.6; // eye level

      for (const enemy of aliveEnemies) {
        if (!enemy.alive || enemy.grabbed || enemy.thrown) continue;
        const dist = enemy.mesh.position.distanceTo(this.playerPos);
        if (dist < 28 && dist > 1.8) {
          const pullDir = levitateCenter.clone().sub(enemy.mesh.position).normalize();
          enemy.mesh.position.add(pullDir.multiplyScalar(7.5 * dt));
          enemy.body.setNextKinematicTranslation({
            x: enemy.mesh.position.x,
            y: enemy.mesh.position.y,
            z: enemy.mesh.position.z
          });
        }
      }

      for (const obj of this.objects) {
        if (obj.grabbed) continue;
        const dist = obj.mesh.position.distanceTo(this.playerPos);
        if (dist < 26 && dist > 1.5) {
          const pullDir = levitateCenter.clone().sub(obj.mesh.position).normalize();
          obj.body.applyImpulse({
            x: pullDir.x * obj.mass * 4.0 * dt,
            y: (pullDir.y * 5.0 + 9.81) * obj.mass * dt,
            z: pullDir.z * obj.mass * 4.0 * dt
          }, true);
          obj.body.setLinearDamping(2.0);
        }
      }
    } else {
      if (this.wasLeftFist && this.leftHoldTimer > 0.2) {
        // Fist released -> secondary repulsion push!
        this.sfx.playRepulsion();
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        this.fx.spawnRepulsionWave(this.playerPos.clone().add(camForward.clone().multiplyScalar(3.0)));
        for (const enemy of aliveEnemies) {
          if (!enemy.alive || enemy.grabbed) continue;
          const dist = enemy.mesh.position.distanceTo(this.playerPos);
          if (dist < 18) {
            enemy.thrown = true;
            enemy.thrownVelocity = camForward.clone().add(new THREE.Vector3(0, 0.3, 0)).normalize().multiplyScalar(32);
          }
        }
      }
      this.leftHoldTimer = 0;
    }

    this.wasLeftFist = isLeftFist;

    // =========================================================================
    // === DUAL-HAND OPTICAL GESTURE MECHANICS (NEW CAMERA MECHANICS) ===
    // =========================================================================
    if (this.tearCooldown > 0) this.tearCooldown -= dt;
    if (this.implosionCooldown > 0) this.implosionCooldown -= dt;

    if (gestures.leftFeatures && gestures.rightFeatures) {
      const leftWrist = gestures.leftFeatures.wristScreen;
      const rightWrist = gestures.rightFeatures.wristScreen;
      const handDist = Math.hypot(leftWrist.x - rightWrist.x, leftWrist.y - rightWrist.y);
      const lClosure = gestures.leftFeatures.closure;
      const rClosure = gestures.rightFeatures.closure;

      // 1. «МАГНИТНЫЙ РАЗРЫВ» (Magnetic Tear): Dual Fists close (< 0.28) -> Yanked apart (> 0.55)
      const isDualFist = (lClosure < 1.25 && rClosure < 1.25);
      if (isDualFist && handDist < 0.28 && this.tearCooldown <= 0) {
        if (!this.tearPrimed) {
          this.tearPrimed = true;
          this.sfx.playLockCrack();
        }
      }
      if (this.tearPrimed) {
        if (handDist > 0.55 || (gestures.leftFeatures.wristSpeed > 0.7 || gestures.rightFeatures.wristSpeed > 0.7)) {
          this.triggerMagneticTear(aliveEnemies);
        } else if (!isDualFist && handDist > 0.42) {
          this.tearPrimed = false;
        }
      }

      // 2. «КИНЕТИЧЕСКАЯ ИМПЛОЗИЯ» (Implosion Clap): Dual Open Palms wide (> 0.55) -> Slammed together (< 0.22)
      const isDualOpen = (lClosure > 1.55 && rClosure > 1.55);
      if (isDualOpen && handDist > 0.55 && this.implosionCooldown <= 0) {
        if (!this.implosionPrimed) {
          this.implosionPrimed = true;
          this.sfx.playVortex();
        }
      }
      if (this.implosionPrimed) {
        if (handDist < 0.22) {
          this.triggerScrapImplosion(aliveEnemies);
        } else if (!isDualOpen && handDist < 0.35) {
          this.implosionPrimed = false;
        }
      }
    }

    // =========================================================================
    // === RIGHT HAND: GRAB & THROW (BOTH OBJECTS AND ENEMY MODELS) ===
    // =========================================================================
    const rightClosure = gestures.rightFeatures ? gestures.rightFeatures.closure : 2.0;
    const isRightFist = (gestures.rightFeatures !== null && rightClosure < 1.30)
      || gestures.grab.phase === 'GRAB'
      || Boolean((window as any).__magneto_space_down);

    if (isRightFist && !this.grabbedObject && !this.grabbedEnemy) {
      let targetEnemy: Enemy | undefined;
      let targetObj: MetalObject | undefined;

      // 1. Direct target from hover/raycast
      if (this.hoveredObjectId !== null && this.hoveredObjectId < 0) {
        const eId = -this.hoveredObjectId;
        targetEnemy = aliveEnemies.find(e => e.id === eId && e.alive);
      } else if (gestures.grab.targetId !== null && gestures.grab.targetId < 0) {
        const eId = -gestures.grab.targetId;
        targetEnemy = aliveEnemies.find(e => e.id === eId && e.alive);
      } else if (this.hoveredObjectId !== null && this.hoveredObjectId > 0) {
        targetObj = this.objects.find(o => o.id === this.hoveredObjectId && !o.grabbed);
      } else if (gestures.grab.targetId !== null && gestures.grab.targetId > 0) {
        targetObj = this.objects.find(o => o.id === gestures.grab.targetId && !o.grabbed);
      }

      // 2. Auto-snap fallback: check BOTH enemies and objects in front of camera (enemy prioritized!)
      if (!targetEnemy && !targetObj) {
        const camPos = this.camera.position;
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
        
        let bestEnemyScore = Infinity;
        let bestEnemyMatch: Enemy | undefined;
        for (const enemy of aliveEnemies) {
          if (!enemy.alive || enemy.grabbed) continue;
          const toEnemy = enemy.mesh.position.clone().sub(camPos);
          const dist = toEnemy.length();
          if (dist > 0.4 && dist < 36) {
            toEnemy.normalize();
            const angle = camForward.angleTo(toEnemy);
            if (angle < 0.95) { // ~55 degrees cone
              const score = angle * 8 + dist * 0.1;
              if (score < bestEnemyScore) {
                bestEnemyScore = score;
                bestEnemyMatch = enemy;
              }
            }
          }
        }

        let bestObjScore = Infinity;
        let bestObjMatch: MetalObject | undefined;
        for (const obj of this.objects) {
          if (obj.grabbed) continue;
          const toObj = obj.mesh.position.clone().sub(camPos);
          const dist = toObj.length();
          if (dist > 0.4 && dist < 28) {
            toObj.normalize();
            const angle = camForward.angleTo(toObj);
            if (angle < 0.9) {
              const score = angle * 14 + dist * 0.16;
              if (score < bestObjScore) {
                bestObjScore = score;
                bestObjMatch = obj;
              }
            }
          }
        }

        // Prioritize enemy if present
        if (bestEnemyMatch && bestEnemyScore < bestObjScore + 2.5) {
          targetEnemy = bestEnemyMatch;
        } else if (bestObjMatch) {
          targetObj = bestObjMatch;
        } else if (bestEnemyMatch) {
          targetEnemy = bestEnemyMatch;
        }
      }

      if (targetEnemy) {
        this.grabbedEnemy = targetEnemy;
        targetEnemy.grabbed = true;
        targetEnemy.thrown = false;
        targetEnemy.thrownVelocity = undefined;
        this.sfx.playGrab();
      } else if (targetObj) {
        this.grabbedObject = targetObj;
        targetObj.grabbed = true;
        targetObj.body.setGravityScale(0, true);
        targetObj.body.setLinearDamping(3.5);
        targetObj.body.setAngularDamping(3.5);
        this.sfx.playGrab();
      }
    }

    // Apply grab positioning: hold directly in front of camera
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    const holdPoint = this.camera.position.clone()
      .add(forward.clone().multiplyScalar(2.3))
      .add(right.clone().multiplyScalar(0.42))
      .add(up.clone().multiplyScalar(-0.25));

    if (this.grabbedObject) {
      applyGrabForce(this.grabbedObject, holdPoint);
      this.fx.showFieldLines(
        this.camera.position.clone().add(right.clone().multiplyScalar(0.4)).add(up.clone().multiplyScalar(-0.3)),
        this.grabbedObject.mesh.position,
        1.0
      );
      this.sfx.setFieldIntensity(0.8);
    } else if (this.grabbedEnemy) {
      // Float grabbed enemy cleanly in front of view with hovering rotation
      this.grabbedEnemy.mesh.position.lerp(holdPoint, 0.35);
      this.grabbedEnemy.body.setNextKinematicTranslation({
        x: this.grabbedEnemy.mesh.position.x,
        y: this.grabbedEnemy.mesh.position.y,
        z: this.grabbedEnemy.mesh.position.z
      });
      this.grabbedEnemy.mesh.rotation.y += 0.08;
      this.fx.showFieldLines(
        this.camera.position.clone().add(right.clone().multiplyScalar(0.4)).add(up.clone().multiplyScalar(-0.3)),
        this.grabbedEnemy.mesh.position,
        1.2
      );
      this.sfx.setFieldIntensity(0.8);
    } else {
      this.fx.hideFieldLines();
      this.sfx.setFieldIntensity(0);
    }

    // Handle throw: opening hand fires the held object or enemy forward immediately!
    const rightOpen = (gestures.rightFeatures !== null && rightClosure > 1.35);
    const isThrow = (gestures.throw.triggered || gestures.grab.phase === 'THROW' || (this.wasRightFist && rightOpen));

    if (isThrow && this.grabbedObject) {
      const obj = this.grabbedObject;
      obj.body.setGravityScale(1, true);
      obj.body.setLinearDamping(0.02);
      obj.body.setAngularDamping(0.05);

      const aimDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const throwSpeed = Math.max(gestures.throw.velocity?.length() || 0, 36);
      obj.body.setLinvel({
        x: aimDir.x * throwSpeed,
        y: aimDir.y * throwSpeed,
        z: aimDir.z * throwSpeed
      }, true);

      obj.grabbed = false;
      obj.thrown = true;
      this.grabbedObject = null;
      addThrow();
      this.sfx.playThrow();
    } else if (gestures.grab.phase === 'IDLE' && !isRightFist && this.grabbedObject) {
      this.grabbedObject.body.setGravityScale(1, true);
      this.grabbedObject.body.setLinearDamping(0.2);
      this.grabbedObject.body.setAngularDamping(0.2);
      this.grabbedObject.grabbed = false;
      this.grabbedObject = null;
    }

    if (isThrow && this.grabbedEnemy) {
      const enemy = this.grabbedEnemy;
      enemy.grabbed = false;
      enemy.thrown = true;

      const aimDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const throwSpeed = Math.max(gestures.throw.velocity?.length() || 0, 48);
      enemy.thrownVelocity = aimDir.clone().multiplyScalar(throwSpeed);

      this.grabbedEnemy = null;
      addThrow();
      this.sfx.playThrow();
      this.fx.spawnSparks(enemy.mesh.position, 16);
    } else if (gestures.grab.phase === 'IDLE' && !isRightFist && this.grabbedEnemy) {
      const enemy = this.grabbedEnemy;
      enemy.grabbed = false;
      enemy.thrown = true;
      enemy.thrownVelocity = new THREE.Vector3(0, -1.5, 0); // gentle drop
      this.grabbedEnemy = null;
    }

    this.wasRightFist = isRightFist;

    // === Homing assistance for thrown metal objects ===
    for (const obj of this.objects) {
      if (!obj.thrown) continue;
      let nearestEnemy: Enemy | null = null;
      let minDist = Infinity;
      for (const enemy of aliveEnemies) {
        if (!enemy.alive) continue;
        const d = obj.mesh.position.distanceTo(enemy.mesh.position);
        if (d < minDist && d > 0.8) {
          minDist = d;
          nearestEnemy = enemy;
        }
      }
      if (nearestEnemy) {
        const homingForce = getThrowHomingForce(obj.mesh.position, nearestEnemy.mesh.position);
        if (homingForce.lengthSq() > 0.0001) {
          obj.body.applyImpulse({
            x: homingForce.x * obj.mass * 1.5,
            y: homingForce.y * obj.mass * 1.5,
            z: homingForce.z * obj.mass * 1.5
          }, true);
        }
      }
    }

    // === Thrown enemy physics & collision logic ===
    for (const enemy of aliveEnemies) {
      if (!enemy.alive) continue;
      if (enemy.thrown && enemy.thrownVelocity) {
        // Gravity (lighter floaty gravity so enemies sail through the air!)
        enemy.thrownVelocity.y -= 7.5 * dt;
        const nextPos = enemy.mesh.position.clone().add(enemy.thrownVelocity.clone().multiplyScalar(dt));
        enemy.mesh.position.copy(nextPos);
        enemy.body.setNextKinematicTranslation({
          x: nextPos.x,
          y: nextPos.y,
          z: nextPos.z
        });
        // Tumble rotation
        enemy.mesh.rotation.x += 12 * dt;
        enemy.mesh.rotation.z += 9 * dt;

        // Ground impact
        if (nextPos.y <= 0.6) {
          const speed = enemy.thrownVelocity.length();
          this.fx.spawnSparks(nextPos, 16);
          this.sfx.playImpact(speed * 18);
          const killed = damageEnemy(enemy, Math.min(speed * 2.5, 120), speed, this.scene, this.rapierWorld);
          if (killed) {
            this.sfx.playEnemyDeath();
          } else {
            // Settle on ground, ready to be grabbed and thrown again!
            enemy.mesh.position.y = 0.5;
            enemy.mesh.rotation.x = 0;
            enemy.mesh.rotation.z = 0;
          }
          enemy.thrown = false;
          enemy.thrownVelocity = undefined;
          continue;
        }

        // Wall / Building impact (x: -17 or 17, z: -38 or 38)
        if (Math.abs(nextPos.x) > 17 || Math.abs(nextPos.z) > 38) {
          this.fx.spawnSparks(nextPos, 22);
          this.sfx.playImpact(400);
          const speed = enemy.thrownVelocity.length();
          const killed = damageEnemy(enemy, Math.min(speed * 3.0, 150), 20, this.scene, this.rapierWorld);
          if (killed) {
            this.sfx.playEnemyDeath();
          } else {
            // Settle back into bounds, ready to be grabbed again!
            enemy.mesh.position.x = Math.max(-16.5, Math.min(16.5, nextPos.x));
            enemy.mesh.position.z = Math.max(-37.5, Math.min(37.5, nextPos.z));
            enemy.mesh.rotation.x = 0;
            enemy.mesh.rotation.z = 0;
          }
          enemy.thrown = false;
          enemy.thrownVelocity = undefined;
          continue;
        }

        // Collide with other enemies!
        for (const other of aliveEnemies) {
          if (other.id === enemy.id || !other.alive) continue;
          if (nextPos.distanceTo(other.mesh.position) < 2.0) {
            this.fx.spawnSparks(nextPos, 24);
            this.sfx.playImpact(500);
            const speed = enemy.thrownVelocity.length();
            const killed1 = damageEnemy(enemy, Math.min(speed * 2.5, 100), 18, this.scene, this.rapierWorld);
            const killed2 = damageEnemy(other, Math.min(speed * 2.5, 100), 18, this.scene, this.rapierWorld);
            if (killed1 || killed2) this.sfx.playEnemyDeath();
            enemy.thrown = false;
            enemy.thrownVelocity = undefined;
            // Knock other enemy back too
            other.thrown = true;
            other.thrownVelocity = new THREE.Vector3(
              (Math.random() - 0.5) * 15,
              12,
              (Math.random() - 0.5) * 15
            );
            break;
          }
        }
      }
    }

    // === Collision detection: thrown objects → enemies ===
    for (const obj of this.objects) {
      if (!obj.thrown) continue;
      const vel = obj.body.linvel();
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
      if (speed < 2) {
        obj.thrown = false;
        continue;
      }

      for (const enemy of aliveEnemies) {
        if (!enemy.alive) continue;
        const dist = obj.mesh.position.distanceTo(enemy.mesh.position);
        if (dist < 2.2) {
          const impactEnergy = 0.5 * obj.mass * speed * speed;
          const killed = damageEnemy(enemy, impactEnergy, speed, this.scene, this.rapierWorld);
          if (killed) {
            this.sfx.playEnemyDeath();
          }
          this.sfx.playImpact(impactEnergy);
          this.fx.spawnSparks(obj.mesh.position, 16);
          obj.thrown = false;

          // Reduce object velocity after impact
          obj.body.setLinvel({
            x: vel.x * 0.2,
            y: vel.y * 0.2,
            z: vel.z * 0.2
          }, true);
          break;
        }
      }

      // === Stadium target hit detection for thrown javelins ===
      if (obj.type === 'javelin') {
        for (const target of this.objects) {
          if (target.type !== 'target_board') continue;
          const targetCenter = target.mesh.position.clone().add(new THREE.Vector3(0, 1.65, 0));
          const dist = obj.mesh.position.distanceTo(targetCenter);
          if (dist < 2.45) {
            const impactEnergy = 0.5 * obj.mass * speed * speed;
            this.sfx.playImpact(impactEnergy + 500);
            this.fx.spawnSparks(obj.mesh.position, 28);
            obj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            obj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            obj.thrown = false;
            addThrow();
            this.targetHits++;
            if (this.targetHits < 5) {
              showToast(`🎯 ПРЯМО В МИШЕНЬ! Попадания: ${this.targetHits} / 5`, 'info');
            } else {
              showToast('🏆 5 ИЗ 5! ИДЕАЛЬНЫЙ БРОСОК! Ты превзошёл всех в Нюрнберге!', 'info');
              (window as any).__magneto_javelin_complete = true;
            }
            (window as any).__magneto_target_hit = true;
            break;
          }
        }
      }
    }

    // === Javelin Replenish on Stadium (Mission 1: «Копьё») ===
    if (this.currentMission === 'mission_1_javelin') {
      if (this.javelinReplenishTimer > 0) {
        this.javelinReplenishTimer -= dt;
      }
      let readyJavelins = 0;
      for (const obj of this.objects) {
        if (obj.type === 'javelin' && !obj.thrown && !obj.grabbed) {
          if (obj.mesh.position.distanceTo(this.playerPos) < 6.0) {
            readyJavelins++;
          }
        }
      }
      if (readyJavelins < 2 && this.javelinReplenishTimer <= 0) {
        this.javelinReplenishTimer = 1.2;
        const newJavelin = spawnFreshJavelin(
          this.scene,
          this.rapierWorld,
          new THREE.Vector3(0.42, 1.25, 4.8),
          new THREE.Euler(0, 0, 0)
        );
        this.objects.push(newJavelin);
      }
    }

    // =========================================================================
    // === TWO MODES: STANDING (Default: firm stop) vs WALKING (Toggle via ☝️) ===
    // === (Enabled in Mission 4 «Марионетка», Quick Arena, AND Mission 3 «Побег») ===
    // =========================================================================
    let forwardSpeed = 0;
    const canMove = isMarionetteOrArcade || isCampEscape;

    if (canMove) {
      const isPointing = (gestures.leftFeatures?.isPointingIndex || gestures.rightFeatures?.isPointingIndex) ?? false;
      if (this.walkToggleCooldown > 0) {
        this.walkToggleCooldown -= dt;
      }
      if (isPointing && !this.wasPointing && this.walkToggleCooldown <= 0) {
        this.toggleWalkMode();
      }
      this.wasPointing = isPointing;

      // In Camp Escape, walk mode is ON by default so the player can run to freedom!
      if (isCampEscape) {
        this.walkModeActive = true;
      }

      if (this.walkModeActive) {
        const leftScreenSize = gestures.leftFeatures?.screenPalmSize ?? 0;
        const rightScreenSize = gestures.rightFeatures?.screenPalmSize ?? 0;
        const currentHandSize = Math.max(leftScreenSize, rightScreenSize);

        const PUSH_FORWARD_THRESHOLD = 0.12;

        if (currentHandSize > PUSH_FORWARD_THRESHOLD) {
          forwardSpeed = (currentHandSize - PUSH_FORWARD_THRESHOLD) * 45;
          const pushDelta = (currentHandSize - this.prevScreenPalmSize) / dt;
          if (pushDelta > 0.03) {
            forwardSpeed += pushDelta * 12;
          }
        } else if (this.prevScreenPalmSize > 0) {
          const pushDelta = (currentHandSize - this.prevScreenPalmSize) / dt;
          if (pushDelta > 0.12) {
            forwardSpeed = pushDelta * 16;
          }
        }

        // In Camp Escape, automatic steady forward jog toward freedom!
        if (isCampEscape) {
          forwardSpeed = Math.max(forwardSpeed, 4.8);
        }

        // Keyboard support (W or Up arrow)
        if (this.isForwardKeyPressed) {
          forwardSpeed = Math.max(forwardSpeed, 7.8);
        }

        // Strictly forward, never backward
        forwardSpeed = Math.max(0, forwardSpeed);
        forwardSpeed = Math.min(forwardSpeed, 9.5);

        if (forwardSpeed > 0.05) {
          const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
          forwardDir.y = 0;
          if (forwardDir.lengthSq() > 0.001) {
            forwardDir.normalize();
            this.playerPos.add(forwardDir.multiplyScalar(forwardSpeed * dt));
            if (isCampEscape) {
              this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -7.0, 7.0);
              this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -22, 20);
            } else {
              this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -14, 14);
              this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -32, 32);
            }
            this.playerPos.y = 1.6;
            this.camera.position.copy(this.playerPos);
          }
        }

        this.prevScreenPalmSize = currentHandSize;
      } else {
        forwardSpeed = 0;
        this.prevScreenPalmSize = 0;
      }
    } else {
      // In story training missions (Stadium, Bunker, Mindscape): standing firm!
      this.walkModeActive = false;
      this.prevScreenPalmSize = 0;
      forwardSpeed = 0;
    }

    // === Camp Escape Victory Condition: Reach the exit gate (z <= -16) OR defeat all camp guards! ===
    if (isCampEscape && (this.playerPos.z <= -16 || aliveEnemies.length === 0)) {
      if (!(window as any).__magneto_escape_complete) {
        (window as any).__magneto_escape_complete = true;
        this.sfx.playImpact(1000);
        this.fx.spawnSparks(new THREE.Vector3(0, 2.5, -20), 45);
        showToast('🏃 СВОБОДА! Ворота лагеря сорваны с петель! Макс вырвался наружу!', 'info');
      }
    }

    // === Shield (Optional kinetic barrier in Camp Escape and Marionette/Arcade) ===
    const canUseShield = (isCampEscape || isMarionetteOrArcade);
    const shieldActive = gestures.shield.active && canUseShield;
    const shieldPos = this.camera.position.clone()
      .add(new THREE.Vector3(0, 0, -1.5).applyQuaternion(this.camera.quaternion));
    this.fx.showShield(shieldPos, shieldActive);
    if (shieldActive) {
      this.sfx.playShield();
    }

    // === Camp Sniper Tower Shooting (Mission 3: «Побег») - disabled so enemies don't shoot at player ===
    // (Sniper tower shooting disabled)

    // === Enemies AI & Shooting (NYC Heroes, Camp Nazi Guards, Mindscape & Duel Opponent) ===
    const isMindscapeBattle = (this.currentMission === 'mission_4_marionette');
    const isDuelBattle = (this.currentArena === 'duel');
    if ((this.currentArena === 'nyc' || this.currentArena === 'camp' || isMindscapeBattle || isDuelBattle) && this.waveManager) {
      if (this.currentArena === 'nyc' && !isMindscapeBattle && this.currentMission === 'quick_arena') {
        this.waveManager.update(dt, this.currentArena);
      }

      for (const enemy of aliveEnemies) {
        if (!enemy.alive) continue;
        updateEnemyAI(enemy, this.playerPos, dt, this.sfx, this.fx);
        if (this.currentArena === 'camp') {
          // Guards shoot if within 42m of player
          if (enemy.mesh.position.distanceTo(this.playerPos) < 42) {
            updateEnemyShooting(enemy, this.playerPos, this.scene, this.rapierWorld, this.bullets, dt, this.objects, this.sfx);
          }
        } else if (this.currentArena !== 'duel') {
          // Normal arenas shooting
          updateEnemyShooting(enemy, this.playerPos, this.scene, this.rapierWorld, this.bullets, dt, this.objects, this.sfx);
        }
      }
    }

    // === MINDSCAPE ARENA FLOATING MAGNETIC WEAPONS & REPLENISHMENT ===
    if (this.currentArena === 'mindscape') {
      let activeNearObjects = 0;
      for (const obj of this.objects) {
        if (!obj.grabbed && !obj.thrown) {
          const pos = obj.body.translation();
          if (pos.z < 2 && pos.z > -10) {
            activeNearObjects++;
            const targetY = 1.35 + Math.sin(Date.now() * 0.002 + obj.id * 1.5) * 0.22;
            const dy = targetY - pos.y;
            // Counteract gravity so objects float gracefully at eye level in front of player
            obj.body.applyImpulse({
              x: 0,
              y: (dy * 5.0 + 9.81) * obj.mass * dt,
              z: 0
            }, true);
            obj.body.setLinearDamping(1.6);
          }
        }
      }

      if (activeNearObjects < 4) {
        this.mindscapeReplenishTimer -= dt;
        if (this.mindscapeReplenishTimer <= 0) {
          this.mindscapeReplenishTimer = 0.8;
          const side = Math.random() < 0.5 ? -1 : 1;
          const newObj = spawnDuelReplenishObject(this.scene, this.rapierWorld!, 0, side);
          newObj.body.setTranslation({
            x: side * (1.6 + Math.random() * 2.2),
            y: 1.4,
            z: -3.2 - Math.random() * 2.5
          }, true);
          this.objects.push(newObj);
          if (this.fx) this.fx.spawnSparks(newObj.mesh.position, 12);
        }
      }
    }

    // === REZHIM «DUELI» (DUELS 1v1 ON WHITE PLANE) ===
    if (this.currentArena === 'duel') {
      // Warmup countdown timer (3.5s grace period so player can ready hands, view enemy, and grab weapon)
      if (this.duelWarmupTimer > 0) {
        this.duelWarmupTimer = Math.max(0, this.duelWarmupTimer - dt);
      }

      // 1. Player Dodging: Keyboard [A/D], Arrow keys, or physical side lean (wristScreen.x < 0.22 or > 0.78)
      // IMPORTANT: Do NOT use gestures.aim.yaw as it breaks hand aiming/crosshairs!
      let dodgeDir = 0;
      if ((window as any).__magneto_dodge_left) dodgeDir -= 1;
      if ((window as any).__magneto_dodge_right) dodgeDir += 1;

      // Optical body/wrist lean detection (only at extreme edges of webcam, leaving central area free for aiming)
      const leftWrist = gestures.leftFeatures?.wristScreen;
      const rightWrist = gestures.rightFeatures?.wristScreen;
      if ((leftWrist && leftWrist.x < 0.22) || (rightWrist && rightWrist.x < 0.22)) {
        dodgeDir -= 0.8;
      }
      if ((leftWrist && leftWrist.x > 0.78) || (rightWrist && rightWrist.x > 0.78)) {
        dodgeDir += 0.8;
      }

      this.duelDodgeX = THREE.MathUtils.clamp(this.duelDodgeX + dodgeDir * 10.0 * dt, -7.0, 7.0);
      this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, this.duelDodgeX, dt * 14);
      this.playerPos.z = 3.5;
      this.playerPos.y = 1.6;
      this.camera.position.x = this.playerPos.x;
      this.camera.position.z = this.playerPos.z;
      this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, -dodgeDir * 0.04, dt * 10);

      // 2. Keep nearby floating magnetic objects accompanying player's dodge
      let availableNearbyObjects = 0;
      for (const obj of this.objects) {
        if (!obj.grabbed && !obj.thrown) {
          const pos = obj.body.translation();
          if (pos.z > 0 && pos.z < 5.5) {
            availableNearbyObjects++;
            // Floating levitation drift following player's dodge X
            const sideOffset = (pos.x >= this.playerPos.x ? 1.6 : -1.6);
            const targetX = this.playerPos.x + sideOffset;
            const dx = targetX - pos.x;
            const dy = 1.35 - pos.y;
            obj.body.applyImpulse({
              x: dx * obj.mass * 3.5 * dt,
              y: (dy * 5.0 + 9.81) * obj.mass * dt,
              z: 0
            }, true);
            obj.body.setLinearDamping(1.8);
          }
        }
      }

      // 3. Replenish floating metal objects when thrown
      if (availableNearbyObjects < 4) {
        this.duelReplenishTimer -= dt;
        if (this.duelReplenishTimer <= 0) {
          this.duelReplenishTimer = 0.65;
          const side = Math.random() < 0.5 ? -1 : 1;
          const newObj = spawnDuelReplenishObject(this.scene, this.rapierWorld!, this.playerPos.x, side, this.playerPos.z);
          this.objects.push(newObj);
          this.fx.spawnSparks(newObj.mesh.position, 14);
        }
      }

      // 4. Opponent shooting attacks at player in Duel mode
      const duelOpponent = aliveEnemies[0];
      if (duelOpponent && duelOpponent.alive) {
        // Opponent weaves slightly left/right between -4.0 and 4.0
        const curOppPos = duelOpponent.mesh.position;
        const targetOppX = Math.sin(Date.now() * 0.0016) * 4.0;
        curOppPos.x = THREE.MathUtils.lerp(curOppPos.x, targetOppX, dt * 2.0);
        curOppPos.z = -5.5; // Locked at -5.5
        duelOpponent.body.setNextKinematicTranslation({
          x: curOppPos.x,
          y: curOppPos.y,
          z: curOppPos.z
        });

        // Rotate overhead target beacon
        const beacon = duelOpponent.mesh.getObjectByName('targetBeacon');
        if (beacon) {
          beacon.rotation.y += dt * 3.0;
          beacon.rotation.x += dt * 1.5;
        }

        // Only start shooting attack cycle once warmup is complete!
        if (this.duelWarmupTimer <= 0) {
          this.duelEnemyShootTimer -= dt;

          // Telegraph warning sparks before shot
          if (this.duelEnemyShootTimer <= 0.85 && this.duelEnemyShootTimer > 0) {
            this.fx.spawnSparks(curOppPos.clone().add(new THREE.Vector3(0, 0.4, 0.8)), 4);
          }

          // Fire phase: shoot projectile towards player's position!
          if (this.duelEnemyShootTimer <= 0) {
            this.duelEnemyShootTimer = 2.4 + Math.random() * 0.8;
            const oppPos = curOppPos.clone().add(new THREE.Vector3(0, 0.6, 0.5));
            const aimTarget = this.playerPos.clone();
            const aimDir = aimTarget.sub(oppPos).normalize();

            let pType: ProjectileType = 'bullet';
            let dmg = 12;
            if (duelOpponent.type === 'ironman') {
              pType = 'repulsor';
              dmg = 14;
            } else if (duelOpponent.type === 'captainamerica') {
              pType = 'shield';
              dmg = 15;
            } else if (duelOpponent.type === 'hulk') {
              pType = 'power_stone';
              dmg = 16;
            } else if (duelOpponent.type === 'thanos') {
              pType = Math.random() < 0.5 ? 'mind_beam' : 'reality_shard';
              dmg = 18;
            }

            this.sfx.playGunshot();
            // Moderate projectile speed (20 m/s) so player can dodge with A/D!
            spawnProjectile(
              oppPos,
              aimDir,
              20,
              pType,
              dmg,
              duelOpponent.id,
              this.scene,
              this.rapierWorld!,
              this.bullets
            );
          }
        }
      } else if (!duelOpponent || (duelOpponent && !duelOpponent.alive)) {
        // Duel round won! Advance to next round!
        if (this.waveManager && this.waveManager.battleActive) {
          this.waveManager.battleActive = false;
          this.duelRound++;
          this.playerHP = 200; // Fully restore 200 HP for next round
          this.duelWarmupTimer = 3.0; // Warmup for next round
          this.duelEnemyShootTimer = 4.0;
          this.sfx.playWaveComplete();
          showToast(`⚔️ РАУНД ${this.duelRound - 1} ВЫИГРАН! ЗДОРОВЬЕ ВОССТАНОВЛЕНО!`, 'info');
          setTimeout(() => {
            if (this.currentArena === 'duel') {
              this.setArena('duel');
            }
          }, 1400);
        }
      }
    }

    // === Mission 6: «Битва с Героями Земли» Completion Check ===
    if (this.currentMission === 'mission_6_heroes') {
      if (aliveEnemies.length === 0 && !(window as any).__magneto_heroes_complete) {
        (window as any).__magneto_heroes_complete = true;
        this.sfx.playWaveComplete();
        showToast('⚡ ГЕРОИ ЗЕМЛИ ПОВЕРЖЕНЫ! Броня Старка и щит Кэпа обращены в прах!', 'info');
      }
    }

    // === Mission 7: «Ультиматум Мутантов» Completion Check ===
    if (this.currentMission === 'mission_7_ultimatum') {
      if (aliveEnemies.length === 0 && !(window as any).__magneto_ultimatum_complete) {
        (window as any).__magneto_ultimatum_complete = true;
        this.sfx.playWaveComplete();
        showToast('👑 УЛЬТИМАТУМ ПРИНЯТ! Стражи уничтожены, Халк повержен! Мутанты свободны!', 'info');
      }
    }

    // === Mission 4: «Марионетка» Puppet Strings Tension Cycle ===
    if (this.currentMission === 'mission_4_marionette') {
      const puppetBoss = aliveEnemies.find(e => e.type === 'puppetmaster');
      if (puppetBoss && puppetBoss.alive) {
        this.puppetStringTimer -= dt;
        if (this.puppetStringTimer <= 0) {
          this.puppetStringTimer = 8.0 + Math.random() * 2.0;
          this.puppetStringsActive = true;
          this.sfx.playHeartbeat();
          this.sfx.playPsychicWhisper();
          showToast('⚠️ КУКЛОВОД СЖИМАЕТ НИТИ РАЗУМА! Жми [ Т ] или разорви кулаки!', 'error');
        }
        if (this.puppetStringsActive) {
          // Slight psychic drain while puppet strings are active
          this.playerHP = Math.max(1, this.playerHP - 2.8 * dt);
        }
      } else if (!puppetBoss || (puppetBoss && !puppetBoss.alive)) {
        if (!(window as any).__magneto_marionette_complete) {
          (window as any).__magneto_marionette_complete = true;
          this.puppetStringsActive = false;
          this.sfx.playWaveComplete();
          showToast('💥 КУКЛОВОД УНИЧТОЖЕН! Астральный паразит повержен!', 'info');
        }
      }

      const overlay = document.getElementById('puppet-strings-overlay');
      if (overlay) {
        if (this.puppetStringsActive) {
          overlay.classList.remove('hidden');
          overlay.classList.add('active');
        } else {
          overlay.classList.remove('active');
          overlay.classList.add('hidden');
        }
      }
    }

    // === Bullets ===
    const bulletResult = updateBullets(
      this.bullets,
      this.playerPos,
      this.scene,
      this.rapierWorld,
      dt,
      shieldActive,
      shieldPos
    );

    if (bulletResult.reflectedBullets.length > 0) {
      this.sfx.playImpact(500);
      this.fx.spawnSparks(shieldPos, 22);
    }

    if (bulletResult.damage > 0) {
      let dmg = bulletResult.damage;
      if (this.currentMission === 'mission_3_escape') {
        dmg = Math.min(bulletResult.damage * 0.35, 6);
      } else if (this.currentArena === 'duel') {
        dmg = Math.min(bulletResult.damage * 0.6, 15);
      }
      this.playerHP -= dmg;
      this.sfx.playPlayerHit();
    }

    // === Physics step ===
    this.rapierWorld.step();

    // === Sync ===
    syncObjects(this.objects);
    updateScoring(dt);

    // === FX ===
    this.fx.update(dt);
  }

  render(): void {
    if (this.fx) {
      this.fx.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  getHoveredObjectId(): number | null {
    return this.hoveredObjectId;
  }

  getHoveredObjectMass(): number {
    if (this.hoveredObjectId !== null && this.hoveredObjectId > 0) {
      const obj = this.objects.find(o => o.id === this.hoveredObjectId);
      return obj?.mass ?? 10;
    }
    if (this.hoveredObjectId !== null && this.hoveredObjectId < 0) {
      return 3; // enemy mass: ultra-light, instant effortless lift!
    }
    return 10;
  }

  getEnemyAimPositions(): { yaw: number; pitch: number }[] {
    if (!this.waveManager) return [];
    return this.waveManager.getAliveEnemies().map(e => {
      const dir = e.mesh.position.clone().sub(this.playerPos).normalize();
      return {
        yaw: Math.atan2(dir.x, -dir.z),
        pitch: Math.asin(-dir.y)
      };
    });
  }

  isGameOver(): boolean {
    return this.playerHP <= 0;
  }

  isVictory(): boolean {
    return this.waveManager?.state.phase === 'COMPLETE';
  }

  getBoss() {
    return this.waveManager?.getBoss() ?? null;
  }

  public triggerMagneticTear(aliveEnemies?: Enemy[]): void {
    if (!this.rapierWorld || this.tearCooldown > 0) return;
    this.tearCooldown = GameWorld.TEAR_COOLDOWN_TIME;
    this.tearPrimed = false;

    const enemies = aliveEnemies || (this.waveManager ? this.waveManager.getAliveEnemies() : []);
    const targetEnemyId = this.hoveredObjectId !== null && this.hoveredObjectId < 0
      ? -this.hoveredObjectId
      : (this.grabbedEnemy ? this.grabbedEnemy.id : null);

    let targetEnemy: Enemy | null = targetEnemyId ? (enemies.find(e => e.id === targetEnemyId) || null) : null;
    if (!targetEnemy && enemies.length > 0) {
      let minDist = 35;
      for (const e of enemies) {
        if (!e.alive) continue;
        const d = e.mesh.position.distanceTo(this.playerPos);
        if (d < minDist) {
          minDist = d;
          targetEnemy = e;
        }
      }
    }

    this.sfx.playImpact(1200);
    this.sfx.playLockCrack();

    // Mission 4: Sever puppet strings on Magnetic Tear!
    if (this.puppetStringsActive) {
      this.puppetStringsActive = false;
      this.sfx.playPuppetStringSnap();
      this.sfx.playImpact(1500);
      showToast('⚡ НИТИ КУКЛОВОДА СОРВАНЫ! Контроль разума разрушен!', 'info');
      const puppetBoss = enemies.find(e => e.type === 'puppetmaster' && e.alive);
      if (puppetBoss) {
        damageEnemy(puppetBoss, 200, 25, this.scene, this.rapierWorld);
        if (this.fx) {
          this.fx.spawnCrushExplosion(puppetBoss.mesh.position);
          this.fx.spawnSparks(puppetBoss.mesh.position, 60);
        }
      }
    }

    if (targetEnemy && targetEnemy.alive) {
      const pos = targetEnemy.mesh.position.clone();
      if (this.fx) {
        this.fx.spawnCrushExplosion(pos);
        this.fx.spawnSparks(pos, 45);
      }
      damageEnemy(targetEnemy, 450, 30, this.scene, this.rapierWorld);
      if (targetEnemy.hp <= 0) {
        crushEnemy(targetEnemy, this.scene, this.rapierWorld);
        this.sfx.playEnemyDeath();
      }
      showToast('⚡ МАГНИТНЫЙ РАЗРЫВ! Броня врага сорвана и расщеплена!', 'info');
    } else {
      for (const obj of this.objects) {
        const d = obj.mesh.position.distanceTo(this.playerPos);
        if (d < 24 && !obj.grabbed) {
          if (this.fx) this.fx.spawnSparks(obj.mesh.position, 25);
          obj.body.applyImpulse({ x: (Math.random() - 0.5) * 50, y: 35, z: -40 }, true);
          obj.thrown = true;
        }
      }
      showToast('⚡ МАГНИТНЫЙ РАЗРЫВ! Металл вокруг разорван мощным полем!', 'info');
    }
  }

  public triggerScrapImplosion(aliveEnemies?: Enemy[]): void {
    if (!this.rapierWorld || this.implosionCooldown > 0) return;
    this.implosionCooldown = GameWorld.IMPLOSION_COOLDOWN_TIME;
    this.implosionPrimed = false;

    const enemies = aliveEnemies || (this.waveManager ? this.waveManager.getAliveEnemies() : []);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const focalPoint = this.playerPos.clone().add(forward.clone().multiplyScalar(9.0));

    for (const obj of this.objects) {
      if (obj.grabbed) continue;
      const d = obj.mesh.position.distanceTo(this.playerPos);
      if (d < 28) {
        const dir = focalPoint.clone().sub(obj.mesh.position).normalize();
        obj.body.setLinvel({ x: dir.x * 32, y: (dir.y + 0.2) * 32, z: dir.z * 32 }, true);
        obj.thrown = true;
      }
    }

    this.sfx.playImpact(1500);
    if (this.fx) {
      this.fx.spawnCrushExplosion(focalPoint);
      this.fx.spawnSparks(focalPoint, 55);
    }

    // Mission 4: Kinetic implosion obliterates all orbiting spectral echoes!
    if (this.currentMission === 'mission_4_marionette') {
      for (const enemy of enemies) {
        if (enemy.type === 'spectral_echo' && enemy.alive) {
          crushEnemy(enemy, this.scene, this.rapierWorld);
          if (this.fx) this.fx.spawnCrushExplosion(enemy.mesh.position);
          this.sfx.playCrush();
        }
      }
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const d = enemy.mesh.position.distanceTo(focalPoint);
      if (d < 16) {
        damageEnemy(enemy, 280, 20, this.scene, this.rapierWorld);
        const launchDir = enemy.mesh.position.clone().sub(focalPoint).normalize();
        launchDir.y = 0.6;
        enemy.thrown = true;
        enemy.thrownVelocity = launchDir.multiplyScalar(24);
        if (enemy.hp <= 0) {
          this.sfx.playEnemyDeath();
        }
      }
    }

    showToast('💥 КИНЕТИЧЕСКАЯ ИМПЛОЗИЯ! Схлопывание металлического ядра!', 'info');
  }

  getTearState(): { primed: boolean; cooldown: number; max: number } {
    return {
      primed: this.tearPrimed,
      cooldown: Math.max(0, this.tearCooldown),
      max: GameWorld.TEAR_COOLDOWN_TIME
    };
  }

  getImplosionState(): { primed: boolean; cooldown: number; max: number } {
    return {
      primed: this.implosionPrimed,
      cooldown: Math.max(0, this.implosionCooldown),
      max: GameWorld.IMPLOSION_COOLDOWN_TIME
    };
  }

  getWalkMode(): boolean {
    return this.walkModeActive;
  }

  getWaveState() {
    if (this.currentMission === 'mission_1_javelin') {
      return {
        currentWave: this.targetHits,
        totalWaves: 5,
        phase: 'ACTIVE' as const,
        timer: 0,
        waveName: `Миссия 1: «Копьё» — Попадания: ${this.targetHits} / 5`,
        enemies: [],
        allEnemiesSpawned: true
      };
    }
    if (this.currentMission === 'mission_2_lock') {
      return {
        currentWave: 1,
        totalWaves: 1,
        phase: 'ACTIVE' as const,
        timer: 0,
        waveName: 'Миссия 2: «Замок» — Двуручный рывок!',
        enemies: [],
        allEnemiesSpawned: true
      };
    }
    if (this.currentMission === 'mission_3_escape') {
      const distTraveled = Math.max(0, Math.min(36, Math.round(18 - this.playerPos.z)));
      const distRemaining = Math.max(0, 36 - distTraveled);
      return {
        currentWave: distTraveled,
        totalWaves: 36,
        phase: 'ACTIVE' as const,
        timer: 0,
        waveName: `Миссия 3: «Побег» — До северных ворот: ${distRemaining}м (Беги: W / ☝️)`,
        enemies: this.waveManager ? this.waveManager.state.enemies : [],
        allEnemiesSpawned: true
      };
    }
    if (this.currentMission === 'mission_4_marionette') {
      const boss = this.waveManager?.state.enemies.find(e => e.type === 'puppetmaster');
      const bossHp = boss && boss.alive ? boss.hp : 0;
      return {
        currentWave: Math.max(0, 550 - bossHp),
        totalWaves: 550,
        phase: 'ACTIVE' as const,
        timer: 0,
        waveName: this.puppetStringsActive
          ? '⚠️ НИТИ КУКЛОВОДА СЖИМАЮТСЯ! ЖМИ [ Т ] ДЛЯ РАЗРЫВА!'
          : `Астральный Кукловод — Здоровье: ${bossHp} / 550 HP`,
        enemies: this.waveManager ? this.waveManager.state.enemies : [],
        allEnemiesSpawned: true
      };
    }
    if (this.currentMission === 'mission_5_awakening') {
      return {
        currentWave: 1,
        totalWaves: 1,
        phase: 'ACTIVE' as const,
        timer: 0,
        waveName: 'Финал: «Пробуждение» — Раскрой ладони к камере!',
        enemies: [],
        allEnemiesSpawned: true
      };
    }
    if (this.currentMission === 'mission_6_heroes') {
      const alive = this.waveManager ? this.waveManager.getAliveEnemies().length : 0;
      return {
        currentWave: Math.max(0, 4 - alive),
        totalWaves: 4,
        phase: 'ACTIVE' as const,
        timer: 0,
        waveName: 'Миссия 6: «Битва с Героями Земли» — Сокруши Мстителей и Стражей',
        enemies: this.waveManager ? this.waveManager.state.enemies : [],
        allEnemiesSpawned: true
      };
    }
    if (this.currentMission === 'mission_7_ultimatum') {
      const alive = this.waveManager ? this.waveManager.getAliveEnemies().length : 0;
      return {
        currentWave: Math.max(0, 4 - alive),
        totalWaves: 4,
        phase: 'ACTIVE' as const,
        timer: 0,
        waveName: 'Миссия 7: «Ультиматум Мутантов» — Халк и Омега-Стражи',
        enemies: this.waveManager ? this.waveManager.state.enemies : [],
        allEnemiesSpawned: true
      };
    }
    if (this.currentMission === 'duel_mode') {
      const opp = this.waveManager?.state.enemies[0];
      const oppHp = opp && opp.alive ? opp.hp : 0;
      let waveTitle = `Режим «Дуэли» — Раунд ${this.duelRound}: Соперник (${oppHp} HP)`;
      if (this.duelWarmupTimer > 0) {
        waveTitle = `⚡ ПРИГОТОВЬСЯ: ${this.duelWarmupTimer.toFixed(1)}с | Раунд ${this.duelRound} (${oppHp} HP)`;
      }
      return {
        currentWave: this.duelRound,
        totalWaves: 99,
        phase: 'ACTIVE' as const,
        timer: 0,
        waveName: waveTitle,
        enemies: this.waveManager ? this.waveManager.state.enemies : [],
        allEnemiesSpawned: true
      };
    }

    return this.waveManager?.state ?? {
      currentWave: 0,
      totalWaves: 8,
      phase: 'PRE_WAVE' as const,
      timer: 0,
      waveName: 'Волна 1: Охота Росомахи',
      enemies: [],
      allEnemiesSpawned: false
    };
  }

  getMissionObjective(): {
    title: string;
    desc: string;
    current: number;
    total: number;
    unit: string;
    remaining: number;
  } {
    if (this.currentMission === 'mission_1_javelin') {
      return {
        title: 'МИССИЯ 1: «КОПЬЁ»',
        desc: 'Порази мишени турнирным копьём',
        current: this.targetHits,
        total: 5,
        unit: 'мишеней',
        remaining: Math.max(0, 5 - this.targetHits)
      };
    }
    if (this.currentMission === 'mission_2_lock') {
      return {
        title: 'МИССИЯ 2: «ЗАМОК»',
        desc: 'Двуручный рывок: сорви броневой замок',
        current: 1,
        total: 1,
        unit: 'замок',
        remaining: 0
      };
    }
    if (this.currentMission === 'mission_3_escape') {
      const distTraveled = Math.max(0, Math.min(58, Math.round(26 - this.playerPos.z)));
      const distRemaining = Math.max(0, 58 - distTraveled);
      return {
        title: 'МИССИЯ 3: «ПОБЕГ»',
        desc: 'Доберись до ворот лагеря, отбиваясь от нацистов',
        current: distTraveled,
        total: 58,
        unit: 'м',
        remaining: distRemaining
      };
    }
    if (this.currentMission === 'mission_4_marionette') {
      const boss = this.waveManager?.state.enemies.find(e => e.type === 'puppetmaster');
      const bossHp = boss && boss.alive ? boss.hp : 0;
      return {
        title: 'МИССИЯ 4: «МАРИОНЕТКА»',
        desc: this.puppetStringsActive
          ? '⚡ РАЗОРВИ НИТИ КУКЛОВОДА! [ КЛАВИША T / РАЗВЕДИ КУЛАКИ ]'
          : 'Сокруши Астрального Кукловода силой магнетизма',
        current: Math.max(0, 550 - bossHp),
        total: 550,
        unit: 'HP Босса',
        remaining: bossHp
      };
    }
    if (this.currentMission === 'mission_5_awakening') {
      return {
        title: 'ФИНАЛ: «ПРОБУЖДЕНИЕ»',
        desc: 'Раскрой обе ладони навстречу свету',
        current: 1,
        total: 1,
        unit: 'разум',
        remaining: 0
      };
    }
    if (this.currentMission === 'mission_6_heroes') {
      const alive = this.waveManager ? this.waveManager.getAliveEnemies().length : 0;
      return {
        title: 'МИССИЯ 6: «ГЕРОИ ЗЕМЛИ»',
        desc: 'Сокруши Железного Человека, Капитана Америку и Стражей',
        current: Math.max(0, 4 - alive),
        total: 4,
        unit: 'героев',
        remaining: alive
      };
    }
    if (this.currentMission === 'mission_7_ultimatum') {
      const alive = this.waveManager ? this.waveManager.getAliveEnemies().length : 0;
      return {
        title: 'МИССИЯ 7: «УЛЬТИМАТУМ»',
        desc: 'Сотри Халка, Ванду и сверхтяжёлых боевых Стражей',
        current: Math.max(0, 4 - alive),
        total: 4,
        unit: 'титанов',
        remaining: alive
      };
    }
    if (this.currentMission === 'duel_mode') {
      const opp = this.waveManager?.state.enemies[0];
      const oppHp = opp && opp.alive ? opp.hp : 0;
      const oppMax = opp ? opp.maxHp : 100;
      let desc = 'Уклоняйся [A/D / Стрелки] и метай встречный металл [КУЛАК] во врага!';
      if (this.duelWarmupTimer > 0) {
        desc = `⚡ ПРИГОТОВИТЬСЯ: ${this.duelWarmupTimer.toFixed(1)}с! Захвати металл жестом [КУЛАК]!`;
      }
      return {
        title: `РЕЖИМ «ДУЭЛИ» (РАУНД ${this.duelRound})`,
        desc,
        current: Math.max(0, oppMax - oppHp),
        total: oppMax,
        unit: 'HP урона',
        remaining: oppHp
      };
    }

    const alive = this.waveManager ? this.waveManager.getAliveEnemies().length : 0;
    const wave = this.waveManager?.state;
    return {
      title: `ВОЛНА ${(wave?.currentWave ?? 0) + 1} / ${wave?.totalWaves ?? 8}`,
      desc: wave?.waveName || 'Отрази нападение противников',
      current: Math.max(0, 10 - alive),
      total: 10,
      unit: 'врагов',
      remaining: alive
    };
  }

  reset(): void {
    this.playerHP = 100;
    this.wasLeftFist = false;
    this.leftCrushCooldown = 0;
    this.leftVortexSoundTimer = 0;
    this.tearPrimed = false;
    this.tearCooldown = 0;
    this.implosionPrimed = false;
    this.implosionCooldown = 0;
    this.walkModeActive = false;
    this.walkToggleCooldown = 0;
    this.wasPointing = false;
    this.prevScreenPalmSize = 0;
    this.isForwardKeyPressed = false;

    resetScoring();
    resetObjectId();
    resetEnemyIds();

    this.setArena(this.currentArena);
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.fx?.resize(w, h);
  }
}

