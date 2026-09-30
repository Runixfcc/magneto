/** Visual effects: bloom, field lines, particles, shield sphere */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class FXManager {
  composer: EffectComposer;
  private fieldLines: THREE.Line[] = [];
  private particles: THREE.Points;
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;
  private shieldMesh: THREE.Mesh;
  private sparkPool: THREE.Mesh[] = [];
  private scene: THREE.Scene;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    lowQuality: boolean
  ) {
    this.scene = scene;

    // Post-processing
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    if (!lowQuality) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,   // strength
        0.4,   // radius
        0.85   // threshold
      );
      this.composer.addPass(bloomPass);
    }

    // Magnetic field lines (initially invisible)
    for (let i = 0; i < 6; i++) {
      const points = [];
      for (let j = 0; j < 20; j++) {
        points.push(new THREE.Vector3(0, 0, 0));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.4,
        linewidth: 1
      });
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      scene.add(line);
      this.fieldLines.push(line);
    }

    // Particle system for ambient dust/sparks
    const PARTICLE_COUNT = 200;
    this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particlePositions[i * 3] = (Math.random() - 0.5) * 30;
      this.particlePositions[i * 3 + 1] = Math.random() * 8;
      this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.particleVelocities[i * 3 + 1] = Math.random() * 0.01 + 0.005;
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x4488aa,
      size: 0.05,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(particleGeo, particleMat);
    scene.add(this.particles);

    // Shield mesh (invisible by default)
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0x6644ff,
        emissive: 0x6644ff,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.15,
        wireframe: true,
        side: THREE.DoubleSide
      })
    );
    this.shieldMesh.visible = false;
    scene.add(this.shieldMesh);

    // Spark pool
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.8
    });
    for (let i = 0; i < 40; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 4, 4),
        sparkMat.clone()
      );
      spark.visible = false;
      scene.add(spark);
      this.sparkPool.push(spark);
    }

    // Repulsion shockwave mesh (expanding glowing ring on the ground)
    const ringGeo = new THREE.RingGeometry(0.8, 1.6, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.repulsionRing = new THREE.Mesh(ringGeo, ringMat);
    this.repulsionRing.rotation.x = -Math.PI / 2;
    this.repulsionRing.position.y = 0.15;
    this.repulsionRing.visible = false;
    scene.add(this.repulsionRing);

    // Crush implosion flash sphere
    const flashGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0
    });
    this.crushFlash = new THREE.Mesh(flashGeo, flashMat);
    this.crushFlash.visible = false;
    scene.add(this.crushFlash);
  }

  private repulsionRing: THREE.Mesh;
  private repulsionTime = 0;
  private crushFlash: THREE.Mesh;
  private crushFlashTime = 0;

  update(dt: number): void {
    // Animate dust particles
    for (let i = 0; i < this.particlePositions.length / 3; i++) {
      this.particlePositions[i * 3] += this.particleVelocities[i * 3];
      this.particlePositions[i * 3 + 1] += this.particleVelocities[i * 3 + 1];
      this.particlePositions[i * 3 + 2] += this.particleVelocities[i * 3 + 2];

      // Reset if too high
      if (this.particlePositions[i * 3 + 1] > 9) {
        this.particlePositions[i * 3 + 1] = 0;
        this.particlePositions[i * 3] = (Math.random() - 0.5) * 30;
        this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    // Fade out sparks
    for (const spark of this.sparkPool) {
      if (spark.visible) {
        const mat = spark.material as THREE.MeshBasicMaterial;
        mat.opacity -= dt * 3;
        spark.scale.multiplyScalar(0.95);
        if (mat.opacity <= 0) {
          spark.visible = false;
        }
      }
    }

    // Animate repulsion shockwave
    if (this.repulsionTime > 0) {
      this.repulsionTime -= dt;
      const progress = 1.0 - (this.repulsionTime / 0.65); // 0 to 1
      const currentRadius = 0.5 + progress * 24; // expands to 24m
      this.repulsionRing.scale.set(currentRadius, currentRadius, 1);
      (this.repulsionRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.85);
      if (this.repulsionTime <= 0) {
        this.repulsionRing.visible = false;
      }
    }

    // Animate crush flash
    if (this.crushFlashTime > 0) {
      this.crushFlashTime -= dt;
      const progress = 1.0 - (this.crushFlashTime / 0.35);
      const scale = 0.5 + progress * 2.2;
      this.crushFlash.scale.set(scale, scale, scale);
      (this.crushFlash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.9);
      if (this.crushFlashTime <= 0) {
        this.crushFlash.visible = false;
      }
    }
  }

  /** Trigger expanding repulsion wave shockwave */
  spawnRepulsionWave(centerPos: THREE.Vector3): void {
    this.repulsionRing.position.set(centerPos.x, 0.18, centerPos.z);
    this.repulsionRing.scale.set(0.5, 0.5, 1);
    this.repulsionRing.visible = true;
    (this.repulsionRing.material as THREE.MeshBasicMaterial).opacity = 0.85;
    this.repulsionTime = 0.65; // duration 0.65s

    // Also spawn burst of sparks around center
    this.spawnSparks(centerPos, 20);
  }

  /** Trigger magnetic crush implosion flash and debris */
  spawnCrushExplosion(pos: THREE.Vector3): void {
    this.crushFlash.position.copy(pos);
    this.crushFlash.scale.set(0.4, 0.4, 0.4);
    this.crushFlash.visible = true;
    (this.crushFlash.material as THREE.MeshBasicMaterial).opacity = 0.9;
    this.crushFlashTime = 0.35;

    // Sparks
    this.spawnSparks(pos, 25);
  }

  /** Show magnetic field lines from hand to object */
  showFieldLines(
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    intensity: number = 1
  ): void {
    const time = performance.now() / 1000;

    for (let i = 0; i < this.fieldLines.length; i++) {
      const line = this.fieldLines[i];
      line.visible = true;

      const positions = line.geometry.attributes.position as THREE.BufferAttribute;
      const offset = (i / this.fieldLines.length) * Math.PI * 2;

      for (let j = 0; j < 20; j++) {
        const t = j / 19;
        const x = fromPos.x + (toPos.x - fromPos.x) * t;
        const y = fromPos.y + (toPos.y - fromPos.y) * t;
        const z = fromPos.z + (toPos.z - fromPos.z) * t;

        // Add sinusoidal offset for field line shape
        const wave = Math.sin(t * Math.PI) * 0.5;
        const noiseX = Math.sin(time * 3 + offset + t * 5) * wave * 0.3;
        const noiseY = Math.cos(time * 2.5 + offset + t * 4) * wave * 0.3;

        positions.setXYZ(j, x + noiseX, y + noiseY, z);
      }

      positions.needsUpdate = true;
      (line.material as THREE.LineBasicMaterial).opacity = 0.3 * intensity;
    }
  }

  hideFieldLines(): void {
    for (const line of this.fieldLines) {
      line.visible = false;
    }
  }

  /** Show/hide shield */
  showShield(position: THREE.Vector3, active: boolean): void {
    this.shieldMesh.visible = active;
    if (active) {
      this.shieldMesh.position.copy(position);
      this.shieldMesh.position.z -= 1.5;
      this.shieldMesh.rotation.y += 0.02;
      const mat = this.shieldMesh.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.1 + Math.sin(performance.now() / 200) * 0.05;
    }
  }

  /** Spawn sparks at impact point */
  spawnSparks(position: THREE.Vector3, count: number = 8): void {
    let spawned = 0;
    for (const spark of this.sparkPool) {
      if (!spark.visible && spawned < count) {
        spark.visible = true;
        spark.position.copy(position);
        spark.position.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ));
        spark.scale.set(1, 1, 1);
        const mat = spark.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.8;
        spawned++;
      }
    }
  }

  render(): void {
    this.composer.render();
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  dispose(): void {
    for (const line of this.fieldLines) {
      this.scene.remove(line);
    }
    this.scene.remove(this.particles);
    this.scene.remove(this.shieldMesh);
    for (const spark of this.sparkPool) {
      this.scene.remove(spark);
    }
  }
}
