/**
 * Scene setup: 5 Distinct Arenas tailored to each Mission
 * 1. Stadium (Mission 1: «Копьё» — 1930s Nuremberg Athletics Stadium)
 * 2. Bunker (Mission 2: «Замок» — Auschwitz underground vault room with heavy steel door)
 * 3. Camp (Mission 3: «Побег» — Nighttime prison camp with searchlights & barbed wire)
 * 4. NYC (Mission 4: «Марионетка» — Manhattan Avenue in brilliant daytime)
 * 5. Mindscape (Mission 5: «Пробуждение» — Cosmic astral mental plane)
 */

import * as THREE from 'three';

export type ArenaType = 'stadium' | 'bunker' | 'camp' | 'nyc' | 'mindscape' | 'duel';

export function createArenaScene(type: ArenaType, scene: THREE.Scene, lowQuality: boolean): void {
  // Clear any existing children from the scene
  while (scene.children.length > 0) {
    const obj = scene.children[0];
    scene.remove(obj);
  }

  switch (type) {
    case 'stadium':
      createNurembergStadiumScene(scene, lowQuality);
      break;
    case 'bunker':
      createBunkerLockScene(scene, lowQuality);
      break;
    case 'camp':
      createCampEscapeScene(scene, lowQuality);
      break;
    case 'nyc':
      createNYCStreetScene(scene, lowQuality);
      break;
    case 'mindscape':
      createArakkoMindscapeScene(scene, lowQuality);
      break;
    case 'duel':
      createDuelArenaScene(scene, lowQuality);
      break;
  }
}

// Backwards-compatible alias for existing imports
export const createWarehouseScene = createNYCStreetScene;

// ============================================================================
// 1. NUREMBERG ATHLETICS STADIUM (1930s European Javelin Field)
// ============================================================================
export function createNurembergStadiumScene(scene: THREE.Scene, lowQuality: boolean): void {
  // Vintage 1930s cloudy sky & soft atmospheric haze
  scene.background = new THREE.Color(0xb4c8dc);
  scene.fog = new THREE.FogExp2(0xc8d7e6, 0.009);

  // Soft vintage sunlight filtering through clouds
  const sunPos = new THREE.Vector3(26, 42, -22);
  const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
  sunLight.position.copy(sunPos);
  sunLight.castShadow = !lowQuality;
  if (!lowQuality) {
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    sunLight.shadow.bias = -0.0006;
  }
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3d6b38, 1.25);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // --- Central Grass Pitch (Javelin Sector: 44m x 90m) ---
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x2e6629, // Lush athletic green lawn
    roughness: 0.88,
    metalness: 0.05
  });
  const grassGeo = new THREE.PlaneGeometry(44, 90);
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  // --- Red Cinder / Clay Running Track (Surrounding the grass) ---
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x8a3520, // Vintage brick red cinder clay
    roughness: 0.9,
    metalness: 0.05
  });
  for (const side of [-1, 1]) {
    const track = new THREE.Mesh(new THREE.PlaneGeometry(16, 90), trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(side * 30, 0.002, 0);
    track.receiveShadow = true;
    scene.add(track);

    // Track lane divider white lines
    for (let l = 1; l <= 5; l++) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 90),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(side * (22 + l * 2.8), 0.004, 0);
      scene.add(line);
    }
  }

  // --- Chalk Field Markings on the Grass ---
  const chalkMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });

  // Javelin runway track (4m wide, 24m long leading to foul line at z = 2.0)
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 24), new THREE.MeshStandardMaterial({
    color: 0x944026,
    roughness: 0.9
  }));
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.003, 14);
  runway.receiveShadow = true;
  scene.add(runway);

  // White runway borders
  for (const rx of [-2.05, 2.05]) {
    const rBorder = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 24), chalkMat);
    rBorder.rotation.x = -Math.PI / 2;
    rBorder.position.set(rx, 0.005, 14);
    scene.add(rBorder);
  }

  // Javelin throwing foul line arc (at z = 2.0)
  const arcGeo = new THREE.RingGeometry(7.9, 8.08, 32, 1, Math.PI * 0.35, Math.PI * 0.3);
  const arc = new THREE.Mesh(arcGeo, chalkMat);
  arc.rotation.x = -Math.PI / 2;
  arc.position.set(0, 0.006, 10);
  scene.add(arc);

  // Sector lines radiating into the field towards targets (-Z)
  for (const sign of [-1, 1]) {
    const sectorLine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 70), chalkMat);
    sectorLine.rotation.x = -Math.PI / 2;
    sectorLine.rotation.z = sign * 0.26;
    sectorLine.position.set(sign * 9.5, 0.005, -24);
    scene.add(sectorLine);
  }

  // Distance curved chalk lines (15m, 30m, 45m, 60m markers)
  const distMarkers = [
    { z: -10, label: '15m' },
    { z: -20, label: '30m' },
    { z: -30, label: '45m' },
    { z: -40, label: '60m' }
  ];
  for (const marker of distMarkers) {
    const mLine = new THREE.Mesh(new THREE.PlaneGeometry(24, 0.14), chalkMat);
    mLine.rotation.x = -Math.PI / 2;
    mLine.position.set(0, 0.005, marker.z);
    scene.add(mLine);
  }

  // --- Wooden Grandstands on Both Sides ---
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x451a03, // Dark oak weathered timber
    roughness: 0.85
  });
  const darkBenchMat = new THREE.MeshStandardMaterial({
    color: 0x2e1065,
    roughness: 0.7
  });

  for (const side of [-1, 1]) {
    const standX = side * 41;
    const standGroup = new THREE.Group();
    standGroup.position.set(standX, 0, 0);

    // Multi-tier tiered grandstand
    for (let tier = 0; tier < 8; tier++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.55 * (tier + 1), 84),
        woodMat
      );
      step.position.set(-side * tier * 1.5, (0.55 * (tier + 1)) / 2, 0);
      step.receiveShadow = true;
      step.castShadow = !lowQuality;
      standGroup.add(step);
    }

    // Wooden pavilion roof over the grandstand
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.35, 86),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.65 })
    );
    roof.position.set(-side * 5, 8.5, 0);
    roof.rotation.z = side * 0.1;
    standGroup.add(roof);

    // Support pillars
    for (let pz = -38; pz <= 38; pz += 19) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 8.5, 8),
        woodMat
      );
      pillar.position.set(0, 4.25, pz);
      standGroup.add(pillar);
    }

    // Grandstand Banner sign
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide })
    );
    banner.position.set(0, 7.8, 0);
    banner.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    standGroup.add(banner);

    // Spectator crowd silhouettes on benches
    for (let i = 0; i < 40; i++) {
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 6, 6),
        darkBenchMat
      );
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.7, 6),
        darkBenchMat
      );
      torso.position.y = -0.4;
      head.add(torso);
      const tz = (Math.random() - 0.5) * 76;
      const tTier = Math.floor(Math.random() * 7);
      head.position.set(-side * tTier * 1.5, 0.55 * (tTier + 1) + 0.6, tz);
      standGroup.add(head);
    }

    scene.add(standGroup);
  }

  // Surrounding perimeter pine trees in the background
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2e18, roughness: 0.9 });
  for (let tz = -45; tz <= 45; tz += 9) {
    for (const tx of [-52, 52]) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 8), trunkMat);
      trunk.position.y = 2;
      tree.add(trunk);

      const foliage = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 8), foliageMat);
      foliage.position.y = 6;
      tree.add(foliage);

      tree.position.set(tx + (Math.random() - 0.5) * 3, 0, tz);
      scene.add(tree);
    }
  }
}

// ============================================================================
// 2. AUSCHWITZ BUNKER VAULT (Mission 2: «Замок» — Fortified Steel Door)
// ============================================================================
export function createBunkerLockScene(scene: THREE.Scene, lowQuality: boolean): void {
  scene.background = new THREE.Color(0x06080e);
  scene.fog = new THREE.FogExp2(0x0c101c, 0.035);

  // Dim dramatic overhead industrial bulb
  const bulbLight = new THREE.PointLight(0xf59e0b, 3.2, 35, 1.2);
  bulbLight.position.set(0, 3.6, -1.5);
  bulbLight.castShadow = !lowQuality;
  scene.add(bulbLight);

  // Secondary cold cyan backlight from door seam cracks
  const seamLight = new THREE.PointLight(0x00d4ff, 2.5, 20, 1.5);
  seamLight.position.set(0, 2.0, -6.6);
  scene.add(seamLight);

  const ambient = new THREE.AmbientLight(0x1e293b, 0.5);
  scene.add(ambient);

  // Concrete Bunker Floor
  const floorGeo = new THREE.PlaneGeometry(24, 24);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e2530,
    roughness: 0.85,
    metalness: 0.15
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Concrete Ceiling with exposed steel girders
  const ceiling = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.9
  }));
  ceiling.position.y = 4.4;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // Concrete bunker side walls
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.9
  });
  for (const sign of [-1, 1]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.4, 24), wallMat);
    sideWall.position.set(sign * 8.5, 2.2, 0);
    scene.add(sideWall);
  }

  // Rear Wall behind player
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 4.4, 0.6), wallMat);
  backWall.position.set(0, 2.2, 9);
  scene.add(backWall);

  // --- Front Bunker Wall with the Massive Vault Door (at z = -6.8) ---
  const frontWallGroup = new THREE.Group();
  frontWallGroup.position.set(0, 0, -6.8);

  // Concrete doorway arch surround
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.4, 1.2), wallMat);
  leftPillar.position.set(-5.6, 2.2, 0);
  frontWallGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.4, 1.2), wallMat);
  rightPillar.position.set(5.6, 2.2, 0);
  frontWallGroup.add(rightPillar);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.8, 1.2), wallMat);
  lintel.position.set(0, 4.0, 0);
  frontWallGroup.add(lintel);

  // --- The Massive Fortified Steel Bunker Double-Door ---
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Heavy dark oxidized iron
    metalness: 0.85,
    roughness: 0.4
  });
  const ironBarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.95,
    roughness: 0.25
  });

  // Left & Right door leaves (total width 4.8m, height 3.6m)
  for (const dSide of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.35, 3.55, 0.22), doorMat);
    leaf.position.set(dSide * 1.22, 1.8, 0);
    frontWallGroup.add(leaf);

    // Diagonal reinforced steel bracing
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.8, 0.08), ironBarMat);
    brace.rotation.z = dSide * 0.55;
    brace.position.set(dSide * 1.22, 1.8, 0.12);
    frontWallGroup.add(brace);

    // Heavy hinges on outer edges
    for (const hy of [0.6, 1.8, 3.0]) {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12), ironBarMat);
      hinge.position.set(dSide * 2.38, hy, 0.12);
      frontWallGroup.add(hinge);
    }
  }

  // --- Heavy Locking Bar across the doors ---
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 0.16), ironBarMat);
  crossbar.position.set(0, 1.85, 0.2);
  frontWallGroup.add(crossbar);

  // --- Giant Padlock (Замок) with Chains in Center ---
  const lockGroup = new THREE.Group();
  lockGroup.position.set(0, 1.85, 0.32);

  // Padlock U-shackle
  const shackleGeo = new THREE.TorusGeometry(0.28, 0.07, 12, 24, Math.PI);
  const shackle = new THREE.Mesh(shackleGeo, new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.2
  }));
  shackle.position.y = 0.24;
  lockGroup.add(shackle);

  // Padlock body
  const lockBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.65, 0.24),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.3
    })
  );
  lockGroup.add(lockBody);

  // Glowing Keyhole
  const keyhole = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.18, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff })
  );
  keyhole.position.set(0, -0.04, 0.13);
  lockGroup.add(keyhole);

  // Wrapped chains draped across the lock
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 });
  for (let c = -3; c <= 3; c++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16), chainMat);
    link.position.set(c * 0.18, 0.15 - Math.abs(c) * 0.06, 0.14);
    link.rotation.y = c % 2 === 0 ? 0 : Math.PI / 2;
    lockGroup.add(link);
  }

  frontWallGroup.add(lockGroup);
  scene.add(frontWallGroup);

  // Overhead ventilation ducts and pipes
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.4 });
  for (const px of [-3.5, 3.5]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 16, 16), pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(px, 3.8, 0);
    scene.add(pipe);
  }
}

// ============================================================================
// 3. CAMP ESCAPE (Mission 3: «Побег» — High-Visibility Daytime / Single Sun & White Ground)
// ============================================================================
export function createCampEscapeScene(scene: THREE.Scene, lowQuality: boolean): void {
  // 1. Crisp clean sky
  scene.background = new THREE.Color(0xf1f5f9);
  scene.fog = new THREE.Fog(0xf1f5f9, 70, 240);

  // 2. ONLY ONE light source: The Sun (Directional Light with crisp shadows)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
  sunLight.position.set(20, 42, 12);
  sunLight.castShadow = !lowQuality;
  if (!lowQuality) {
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.bias = -0.0005;
  }
  scene.add(sunLight);

  // Ground terrain (Чистая белая земля)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.02
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 110), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Central Paved Escape Road (Белая дорога)
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.05
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 95), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, 0);
  road.receiveShadow = true;
  scene.add(road);

  // Road edge high-visibility yellow safety borders
  const yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  for (const bx of [-7.6, 7.6]) {
    const borderLine = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 90), yellowStripeMat);
    borderLine.rotation.x = -Math.PI / 2;
    borderLine.position.set(bx, 0.015, 0);
    scene.add(borderLine);
  }

  // White dashed center line on the escape road
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let dz = -38; dz <= 38; dz += 4.5) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2.4), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.016, dz);
    scene.add(dash);
  }

  // --- Wooden Barracks on Both Sides (Warm Cedar Timber with Galvanized Tin Roofs) ---
  const barrackMat = new THREE.MeshStandardMaterial({
    color: 0x92400e, // Warm rich cedar wood
    roughness: 0.75
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1, // Bright galvanized zinc roofing
    roughness: 0.35,
    metalness: 0.6
  });

  for (const side of [-1, 1]) {
    const bx = side * 15.5;
    for (let bz = -28; bz <= 28; bz += 24) {
      const barrack = new THREE.Group();
      barrack.position.set(bx, 0, bz);

      // Main walls
      const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 3.6, 18), barrackMat);
      walls.position.y = 1.8;
      walls.receiveShadow = true;
      walls.castShadow = !lowQuality;
      barrack.add(walls);

      // Sloped Gable Roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 2.2, 4), roofMat);
      roof.position.y = 4.3;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.1, 1, 1.8);
      barrack.add(roof);

      scene.add(barrack);
    }
  }

  // --- Double Barbed Wire Perimeter Fences (Bright Galvanized Steel) ---
  const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.4 });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });

  for (const fx of [-8.8, 8.8]) {
    for (let fz = -36; fz <= 36; fz += 4) {
      // Concrete fence post with curved top
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), postMat);
      post.position.set(fx, 1.7, fz);
      scene.add(post);
    }

    // Horizontal barbed wire strands
    for (const wy of [0.6, 1.2, 1.8, 2.4, 3.0]) {
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 76, 4), wireMat);
      strand.rotation.x = Math.PI / 2;
      strand.position.set(fx, wy, 0);
      scene.add(strand);
    }
  }

  // --- Industrial Pole Floodlights along the road (Clear visibility corridor!) ---
  const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
  const lampGlassMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const lampPositions = [
    { x: -8.2, z: 22 }, { x: 8.2, z: 22 },
    { x: -8.2, z: 10 }, { x: 8.2, z: 10 },
    { x: -8.2, z: -2 }, { x: 8.2, z: -2 },
    { x: -8.2, z: -14 }, { x: 8.2, z: -14 }
  ];

  for (const lp of lampPositions) {
    const postGroup = new THREE.Group();
    postGroup.position.set(lp.x, 0, lp.z);

    // Vertical metal pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.8, 8), lampPostMat);
    pole.position.y = 2.4;
    postGroup.add(pole);

    // Overhanging arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.1), lampPostMat);
    const armDir = lp.x < 0 ? 1 : -1;
    arm.position.set(armDir * 0.35, 4.75, 0);
    postGroup.add(arm);

    // Glowing lantern housing
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.25, 8), lampGlassMat);
    fixture.position.set(armDir * 0.7, 4.6, 0);
    postGroup.add(fixture);

    // Real PointLight illuminating the ground
    const light = new THREE.PointLight(0xfef08a, 2.5, 24, 1.2);
    light.position.set(armDir * 0.7, 4.4, 0);
    postGroup.add(light);

    scene.add(postGroup);
  }

  // --- Watchtowers at North End ---
  for (const wx of [-12, 12]) {
    const tower = new THREE.Group();
    tower.position.set(wx, 0, -28);

    // 4 legs
    for (const dx of [-1.4, 1.4]) {
      for (const dz of [-1.4, 1.4]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), barrackMat);
        leg.position.set(dx, 4.5, dz);
        tower.add(leg);
      }
    }

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 3.6), barrackMat);
    cabin.position.y = 9.8;
    tower.add(cabin);

    // Searchlight Projector
    const spotLight = new THREE.SpotLight(0xfef08a, 4.0, 50, Math.PI * 0.26, 0.4, 1);
    spotLight.position.set(0, 10.2, 0);
    spotLight.target.position.set(-wx * 0.35, 0, 8);
    tower.add(spotLight);
    tower.add(spotLight.target);

    scene.add(tower);
  }

  // --- FORTIFIED MAIN CAMP EXIT GATE (Goal at z = -20) ---
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, -20);

  const gateConcrete = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
  const gateIron = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });

  // Concrete Gate Pillars
  for (const px of [-5.2, 5.2]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.6, 1.6), gateConcrete);
    pillar.position.set(px, 2.8, 0);
    gateGroup.add(pillar);

    // Hazard yellow/black stripes around pillar
    const hazardStripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.64, 0.8, 1.64),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    hazardStripe.position.set(px, 1.4, 0);
    gateGroup.add(hazardStripe);

    // Red warning beacon on top of pillar
    const redLight = new THREE.PointLight(0xef4444, 3.2, 16, 1.5);
    redLight.position.set(px, 5.8, 0);
    gateGroup.add(redLight);

    const beaconMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.35, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    beaconMesh.position.set(px, 5.75, 0);
    gateGroup.add(beaconMesh);
  }

  // Overhead Gate Arch
  const arch = new THREE.Mesh(new THREE.BoxGeometry(12.0, 1.1, 1.4), gateConcrete);
  arch.position.set(0, 5.3, 0);
  gateGroup.add(arch);

  // Glowing Green "ВЫХОД / EXIT" Sign (Brilliant Emissive Clarity)
  const exitSignMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 3.5,
    roughness: 0.2
  });
  const exitSign = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.85, 0.25), exitSignMat);
  exitSign.position.set(0, 5.3, 0.8);
  gateGroup.add(exitSign);

  const exitLight = new THREE.PointLight(0x22c55e, 4.5, 24, 1.2);
  exitLight.position.set(0, 4.8, 2.0);
  gateGroup.add(exitLight);

  // Heavy Iron Double Gates (Left & Right)
  for (const s of [-1, 1]) {
    const gateLeaf = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.4, 0.2), gateIron);
    gateLeaf.position.set(s * 2.2, 2.2, 0);
    // Diagonal reinforcing steel bars
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.2, 0.08), gateIron);
    bar.rotation.z = s * 0.65;
    bar.position.set(s * 2.2, 2.2, 0.12);
    gateGroup.add(bar);
  }

  scene.add(gateGroup);
}

// ============================================================================
// 4. NYC STREET (Mission 4: «Марионетка» & Quick Arena)
// ============================================================================
export function createNYCStreetScene(scene: THREE.Scene, lowQuality: boolean): void {
  scene.background = new THREE.Color(0x60a5fa);
  scene.fog = new THREE.FogExp2(0xaad3fc, 0.007);

  const sunPos = new THREE.Vector3(28, 48, -24);
  const sunGroup = new THREE.Group();
  sunGroup.position.copy(sunPos);

  const sunCoreGeo = new THREE.SphereGeometry(3.8, 24, 24);
  const sunCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  sunGroup.add(new THREE.Mesh(sunCoreGeo, sunCoreMat));

  const coronaGeo = new THREE.RingGeometry(3.8, 9.8, 32);
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    fog: false
  });
  const corona = new THREE.Mesh(coronaGeo, coronaMat);
  corona.lookAt(0, 1.6, 0);
  sunGroup.add(corona);
  scene.add(sunGroup);

  const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.8);
  sunLight.position.copy(sunPos);
  sunLight.castShadow = !lowQuality;
  if (!lowQuality) {
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.bias = -0.0008;
  }
  scene.add(sunLight);

  scene.add(new THREE.HemisphereLight(0x93c5fd, 0x645c54, 1.3));
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  // Asphalt Avenue
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x32353e,
    roughness: 0.55,
    metalness: 0.1
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(24, 80), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);

  // Yellow Center lines
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  for (const offset of [-0.15, 0.15]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 78), yellowMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(offset, 0.005, 0);
    scene.add(line);
  }

  // Sidewalks
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(22, 0.25, 80), sidewalkMat);
    sw.position.set(side * 23, 0.125, 0);
    sw.receiveShadow = true;
    scene.add(sw);
  }

  // Buildings & Skyscrapers
  const buildingDefs = [
    { x: -26, z: -28, width: 18, depth: 16, height: 42, color: 0x1e3a8a },
    { x: -25, z: -10, width: 16, depth: 14, height: 26, color: 0x7c2d12 },
    { x: -26, z: 8, width: 17, depth: 16, height: 35, color: 0x991b1b },
    { x: -27, z: 26, width: 19, depth: 16, height: 50, color: 0x0f172a },
    { x: 26, z: -28, width: 18, depth: 16, height: 48, color: 0x0f172a },
    { x: 25, z: -10, width: 16, depth: 14, height: 32, color: 0xb45309 },
    { x: 26, z: 8, width: 17, depth: 16, height: 28, color: 0x1e293b },
    { x: 27, z: 26, width: 19, depth: 16, height: 45, color: 0x1e3a8a }
  ];

  for (const b of buildingDefs) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.width, b.height, b.depth),
      new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.4, metalness: 0.3 })
    );
    mesh.position.set(b.x, b.height / 2, b.z);
    mesh.castShadow = !lowQuality;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

// ============================================================================
// 5. ARAKKO MINDSCAPE (Mission 4: «Марионетка» & Mission 5: «Пробуждение»)
// High-visibility Sunlit Astral Sanctuary with Single Sun & White Marble Arena
// ============================================================================
export function createArakkoMindscapeScene(scene: THREE.Scene, lowQuality: boolean): void {
  // Pure radiant sky & clean atmospheric visibility
  scene.background = new THREE.Color(0xf1f5f9);
  scene.fog = new THREE.Fog(0xf1f5f9, 50, 160);

  // 1. High-illumination Sun in the sky
  const sunPos = new THREE.Vector3(16, 44, 14);
  const sunGroup = new THREE.Group();
  sunGroup.position.copy(sunPos);

  const sunCoreGeo = new THREE.SphereGeometry(3.6, 24, 24);
  const sunCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  sunGroup.add(new THREE.Mesh(sunCoreGeo, sunCoreMat));

  const coronaGeo = new THREE.RingGeometry(3.7, 9.6, 32);
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    fog: false
  });
  const corona = new THREE.Mesh(coronaGeo, coronaMat);
  corona.lookAt(0, 1.6, 0);
  sunGroup.add(corona);
  scene.add(sunGroup);

  // Primary Directional Sun Light with sharp shadows
  const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
  sunLight.position.copy(sunPos);
  sunLight.castShadow = !lowQuality;
  if (!lowQuality) {
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.bias = -0.0006;
  }
  scene.add(sunLight);

  // Balanced daylight fill so all enemies & flying metal objects stand out clearly
  scene.add(new THREE.HemisphereLight(0xffedd5, 0x94a3b8, 1.25));
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  // 2. Pure White Sunlit Marble Ground (Чистая белая земля)
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.05
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // High-contrast Golden & Ruby Rune Rings on the white floor
  const goldRuneMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
  const rubyRuneMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
  for (const r of [3, 7, 12, 18]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.07, r + 0.07, 64),
      r % 2 === 0 ? rubyRuneMat : goldRuneMat
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.006;
    scene.add(ring);
  }

  // Floating crystalline obsidian & gold monoliths around perimeter
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.2
  });

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const r = 18 + (i % 3) * 3;
    const h = 4 + (i % 4) * 2;
    const mono = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.7, h, 6), crystalMat);
    mono.position.set(Math.cos(angle) * r, h / 2, Math.sin(angle) * r);
    mono.rotation.y = angle;
    mono.castShadow = !lowQuality;
    mono.receiveShadow = true;
    scene.add(mono);
  }
}

// ============================================================================
// 6. DUEL ARENA (Режим «ДУЭЛИ» — Стильная белая арена 1 на 1 без ослепления)
// ============================================================================
export function createDuelArenaScene(scene: THREE.Scene, lowQuality: boolean): void {
  // Soft alabaster/sky tone — non-glaring, easy on the eyes, crisp depth
  scene.background = new THREE.Color(0xdce7f0);
  scene.fog = new THREE.Fog(0xdce7f0, 32, 95);

  // Balanced directional sun casting clean dark shadows on the white floor
  const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
  sunLight.position.set(12, 28, 10);
  sunLight.castShadow = !lowQuality;
  if (!lowQuality) {
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0005;
  }
  scene.add(sunLight);

  // Soft ambient fill
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.65));

  // Matte alabaster plane (Белая плоскость без ослепляющего пересвета)
  const floorGeo = new THREE.PlaneGeometry(70, 100);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.35,
    metalness: 0.04
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Cyber Grid for clear distance and depth perspective
  const grid = new THREE.GridHelper(60, 60, 0x00e5ff, 0xcbd5e1);
  grid.position.y = 0.004;
  scene.add(grid);

  // Neon combat boundary rings (Cyan inner duel ring & Gold perimeter)
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(7.4, 7.6, 64),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.set(0, 0.008, -1.0);
  scene.add(innerRing);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(13.8, 14.0, 64),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.set(0, 0.008, -1.0);
  scene.add(outerRing);

  // Opponent Combat Platform Pad at z = -5.5
  const oppPad = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.75, 48),
    new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
  );
  oppPad.rotation.x = -Math.PI / 2;
  oppPad.position.set(0, 0.009, -5.5);
  scene.add(oppPad);

  // Player Starting Pad at z = 3.5
  const playerPad = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.55, 48),
    new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
  );
  playerPad.rotation.x = -Math.PI / 2;
  playerPad.position.set(0, 0.009, 3.5);
  scene.add(playerPad);
}
