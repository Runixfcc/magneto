/** Metal objects: 24+ Realistic NYC Street Objects (Cars, Taxi, Motorcycle, I-Beams, Dumpsters, Hydrants, etc.) */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ArenaType } from '../render/scene';

export interface MetalObject {
  id: number;
  mesh: THREE.Group | THREE.Mesh;
  body: RAPIER.RigidBody;
  mass: number;
  type: ObjectType;
  grabbed: boolean;
  thrown: boolean;
  hitRadius: number;
}

export type ObjectType =
  | 'javelin'
  | 'target_board'
  | 'javelin_rack'
  | 'steel_helmet'
  | 'iron_grate'
  | 'corrugated_sheet'
  | 'rebar_bundle'
  | 'barbed_wire_roll'
  | 'car_sedan'
  | 'taxi_cab'
  | 'motorcycle'
  | 'iron_dumpster'
  | 'i_beam'
  | 'metal_pipe'
  | 'fire_hydrant'
  | 'street_lamppost'
  | 'traffic_barrier'
  | 'manhole_cover'
  | 'metal_bench'
  | 'bicycle'
  | 'ac_unit'
  | 'vending_machine'
  | 'shipping_crate'
  | 'propane_tank'
  | 'metal_trash_can'
  | 'street_sign_pole'
  | 'toolbox_cabinet'
  | 'satellite_dish'
  | 'steel_drum'
  | 'generator_cart'
  | 'steel_safe'
  | 'hot_dog_cart';

let nextId = 1;

// Helper to tag meshes for emission / raycast
function tagMesh(mesh: THREE.Object3D, color: number, emissive: number, emissiveInt = 0.25): void {
  mesh.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const m = child as THREE.Mesh;
      if (m.material) {
        (m as any).userData = (m as any).userData || {};
        (m as any).userData.origEmissive = emissive;
        (m as any).userData.origEmissiveIntensity = emissiveInt;
      }
    }
  });
}

// Builders for Mission-specific props: Stadium (Javelins & Targets), Bunker, and Camp Escape
function buildJavelin(): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.3, roughness: 0.5 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, metalness: 0.2, roughness: 0.8 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.98, roughness: 0.1 });

  // Main aerodynamic wood/carbon shaft: length 2.2m, diameter 0.03m
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 12), woodMat);
  shaft.rotation.x = Math.PI / 2;
  g.add(shaft);

  // Cord grip wrapping in center of gravity
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 12), gripMat);
  grip.rotation.x = Math.PI / 2;
  g.add(grip);

  // Decorative grip chrome collars
  for (const z of [-0.18, 0.18]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 12), chromeMat);
    ring.position.z = z;
    g.add(ring);
  }

  // Gleaming sharp pointed steel tip head (pointing forward towards -Z)
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.38, 12), chromeMat);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -1.28;
  g.add(tip);

  // Steel tail ferrule cap at rear (+Z)
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.25, 10), steelMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = 1.22;
  g.add(tail);

  tagMesh(g, 0xe2e8f0, 0x334466);
  return g;
}

function buildTargetBoard(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

  // Wooden tripod stand (scaled up and widened for stability)
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 2.2, 8), woodMat);
    const angle = (i * Math.PI * 2) / 3;
    leg.position.set(Math.cos(angle) * 0.85, 1.1, Math.sin(angle) * 0.85);
    leg.rotation.z = Math.cos(angle) * 0.28;
    leg.rotation.x = Math.sin(angle) * 0.28;
    g.add(leg);
  }

  // Circular target backing board (diameter 2.5m, thickness 0.12m - large & highly visible)
  const backing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 })
  );
  backing.rotation.x = Math.PI / 2;
  backing.position.y = 1.65;
  g.add(backing);

  // Concentric colored target rings (facing towards +Z, where player throws from)
  const rings = [
    { r: 1.20, color: 0xf8fafc }, // White outer (1-2 pts)
    { r: 0.96, color: 0x18181b }, // Black (3-4 pts)
    { r: 0.72, color: 0x0284c7 }, // Blue (5-6 pts)
    { r: 0.48, color: 0xdc2626 }, // Red (7-8 pts)
    { r: 0.24, color: 0xfacc15 }, // Gold Bullseye (9-10 pts)
  ];

  let zOff = 0.065;
  for (const ring of rings) {
    const circle = new THREE.Mesh(
      new THREE.CircleGeometry(ring.r, 32),
      new THREE.MeshStandardMaterial({ color: ring.color, roughness: 0.4 })
    );
    circle.position.set(0, 1.65, zOff);
    g.add(circle);
    zOff += 0.002;
  }

  // Golden Bullseye center pin
  const bullseyePin = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.0 })
  );
  bullseyePin.position.set(0, 1.65, zOff + 0.002);
  g.add(bullseyePin);

  tagMesh(g, 0xfacc15, 0x443300);
  return g;
}

function buildJavelinRack(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });

  for (const side of [-0.6, 0.6]) {
    const aFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.6), woodMat);
    aFrame.position.set(side, 0.55, 0);
    g.add(aFrame);
  }

  for (const y of [0.35, 0.85]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.08), woodMat);
    beam.position.set(0, y, 0);
    g.add(beam);
  }

  for (let x = -0.45; x <= 0.45; x += 0.22) {
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.12), metalMat);
    hook.position.set(x, 0.88, 0.04);
    g.add(hook);
  }

  tagMesh(g, 0x854d0e, 0x221100);
  return g;
}

function buildSteelHelmet(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.35 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
  dome.position.y = 0.1;
  g.add(dome);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.05, 16), mat);
  rim.position.y = 0.08;
  g.add(rim);
  tagMesh(g, 0x334155, 0x111122);
  return g;
}

function buildCorrugatedSheet(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.3 });
  for (let x = -0.55; x <= 0.55; x += 0.1) {
    const wave = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8, 1, false, 0, Math.PI), mat);
    wave.rotation.z = Math.PI / 2;
    wave.rotation.x = Math.PI / 2;
    wave.position.set(x, 0.9, 0);
    g.add(wave);
  }
  tagMesh(g, 0x94a3b8, 0x222233);
  return g;
}

function buildRebarBundle(): THREE.Group {
  const g = new THREE.Group();
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.8, roughness: 0.6 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95 });
  const positions = [
    [-0.08, -0.06], [0.08, -0.06],
    [-0.12, 0.05], [0, 0.08], [0.12, 0.05],
    [0, -0.04]
  ];
  for (const [rx, ry] of positions) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 8), rustMat);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(rx, ry + 0.15, 0);
    g.add(rod);
  }
  for (const z of [-0.8, 0, 0.8]) {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 6, 12), wireMat);
    tie.position.set(0, 0.15, z);
    g.add(tie);
  }
  tagMesh(g, 0x78350f, 0x331100);
  return g;
}

function buildIronGrate(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.4 });
  for (let x = -0.45; x <= 0.45; x += 0.15) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.35, 8), mat);
    bar.position.set(x, 0.7, 0);
    g.add(bar);
  }
  for (let y = 0.2; y <= 1.2; y += 0.3) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.04), mat);
    bar.position.set(0, y, 0);
    g.add(bar);
  }
  tagMesh(g, 0x1e293b, 0x001122);
  return g;
}

function buildBarbedWireRoll(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.95, roughness: 0.2 });
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 20), mat);
  coil.position.y = 0.45;
  g.add(coil);
  tagMesh(g, 0x64748b, 0x112233);
  return g;
}

// Model builders for each of the 24 realistic metallic objects
function buildCar(isTaxi: boolean): THREE.Group {
  const car = new THREE.Group();
  const bodyColor = isTaxi ? 0xeab308 : 0x1d4ed8; // Taxi Yellow or Midnight Blue
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.8, roughness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });

  // Chassis / Lower Body (length 3.6m, width 1.6m, height 0.6m)
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 3.6), bodyMat);
  chassis.position.y = 0.45;
  car.add(chassis);

  // Cabin / Roof (length 2.0m, width 1.4m, height 0.55m)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 2.0), glassMat);
  cabin.position.set(0, 0.95, -0.2);
  car.add(cabin);

  // Roof cap
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 1.9), bodyMat);
  roof.position.set(0, 1.25, -0.2);
  car.add(roof);

  // Bumpers & Grille
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.25, 0.2), darkMat);
  frontBumper.position.set(0, 0.35, -1.82);
  car.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.25, 0.2), darkMat);
  rearBumper.position.set(0, 0.35, 1.82);
  car.add(rearBumper);

  // Headlights
  for (const side of [-0.6, 0.6]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.08), chromeMat);
    light.position.set(side, 0.55, -1.82);
    car.add(light);
  }

  // 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.26, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
  const wheelPositions = [
    [-0.82, 0.32, -1.1],
    [0.82, 0.32, -1.1],
    [-0.82, 0.32, 1.1],
    [0.82, 0.32, 1.1]
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    car.add(wheel);
  }

  // Taxi Sign on roof
  if (isTaxi) {
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0aa, emissiveIntensity: 1.5 })
    );
    taxiSign.position.set(0, 1.38, -0.2);
    car.add(taxiSign);
  }

  tagMesh(car, bodyColor, 0x001133);
  return car;
}

function buildMotorcycle(): THREE.Group {
  const bike = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });

  // Frame & Gas Tank
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.8), metalMat);
  tank.position.set(0, 0.75, -0.1);
  bike.add(tank);

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.6), blackMat);
  seat.position.set(0, 0.72, 0.4);
  bike.add(seat);

  // Engine block
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.5), chromeMat);
  engine.position.set(0, 0.35, 0);
  bike.add(engine);

  // Exhaust pipe
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), chromeMat);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0.2, 0.25, 0.3);
  bike.add(exhaust);

  // Handlebars
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8), chromeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.95, -0.45);
  bike.add(bar);

  // Wheels (Front & Rear)
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 16);
  for (const wz of [-0.85, 0.85]) {
    const wheel = new THREE.Mesh(wheelGeo, blackMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.34, wz);
    bike.add(wheel);
  }

  tagMesh(bike, 0xd97706, 0x552200);
  return bike;
}

function buildDumpster(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.8, roughness: 0.4 }); // Dark Green
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7, roughness: 0.5 });

  // Main container (sloped top)
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.2), mat);
  box.position.y = 0.7;
  g.add(box);

  // Plastic/Steel Lids
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.1, 1.25), darkMat);
  lid.position.y = 1.3;
  g.add(lid);

  // Side pockets for garbage trucks
  for (const side of [-1, 1]) {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 1.0), darkMat);
    pocket.position.set(side * 0.84, 0.7, 0);
    g.add(pocket);
  }

  // 4 Wheels
  for (const x of [-0.65, 0.65]) {
    for (const z of [-0.45, 0.45]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), darkMat);
      wheel.position.set(x, 0.1, z);
      g.add(wheel);
    }
  }

  tagMesh(g, 0x15803d, 0x053311);
  return g;
}

function buildIBeam(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.85, roughness: 0.3 }); // Rust Orange / Iron

  // Web (center plate)
  const web = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 2.6), mat);
  g.add(web);

  // Top and bottom flanges
  for (const y of [-0.175, 0.175]) {
    const flange = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 2.6), mat);
    flange.position.y = y;
    g.add(flange);
  }

  tagMesh(g, 0xb45309, 0x441100);
  return g;
}

function buildPipe(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.9, roughness: 0.2 }); // Cyan chrome

  // Tube
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 16), mat);
  g.add(tube);

  // Ring flanges on both ends
  for (const y of [-1.15, 1.15]) {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16), mat);
    flange.position.y = y;
    g.add(flange);
  }

  tagMesh(g, 0x0ea5e9, 0x003366);
  return g;
}

function buildFireHydrant(): THREE.Group {
  const g = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.4 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.3 });

  // Main body
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.3, 12), redMat);
  base.position.y = 0.15;
  g.add(base);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.5, 12), redMat);
  body.position.y = 0.5;
  g.add(body);

  // Top bonnet
  const bonnet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 12), yellowMat);
  bonnet.position.y = 0.75;
  g.add(bonnet);

  // Top pentagon nut
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 5), yellowMat);
  nut.position.y = 0.95;
  g.add(nut);

  // Side nozzle caps
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 10), yellowMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(side * 0.23, 0.52, 0);
    g.add(cap);
  }

  tagMesh(g, 0xdc2626, 0x440000);
  return g;
}

function buildLamppost(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 3.2, 8), mat);
  pole.position.y = 1.6;
  g.add(pole);

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.35, 8), mat);
  head.position.set(0.35, 3.2, 0);
  g.add(head);

  tagMesh(g, 0x334155, 0x112233);
  return g;
}

function buildTrafficBarrier(): THREE.Group {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.3 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.4 });

  const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.2), metalMat);
  barrier.position.y = 0.5;
  g.add(barrier);

  // Yellow hazard stripe band
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.16, 0.21), stripeMat);
  stripe.position.y = 0.5;
  g.add(stripe);

  // Legs / feet
  for (const x of [-0.7, 0.7]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.6), metalMat);
    foot.position.set(x, 0.25, 0);
    g.add(foot);
  }

  tagMesh(g, 0x94a3b8, 0x222233);
  return g;
}

function buildManholeCover(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.9, roughness: 0.4 });

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), mat);
  g.add(plate);

  // Rim ring
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 8, 20), mat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.04;
  g.add(rim);

  tagMesh(g, 0x3f3f46, 0x111111);
  return g;
}

function buildMetalBench(): THREE.Group {
  const g = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.4 });

  // Seat slats
  for (let z = -0.2; z <= 0.2; z += 0.1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.07), slatMat);
    slat.position.set(0, 0.45, z);
    g.add(slat);
  }

  // Backrest slats
  for (let y = 0.6; y <= 0.85; y += 0.1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.04), slatMat);
    slat.position.set(0, y, -0.22);
    g.add(slat);
  }

  // Cast iron legs
  for (const x of [-0.65, 0.65]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.55), ironMat);
    leg.position.set(x, 0.42, -0.05);
    g.add(leg);
  }

  tagMesh(g, 0x1e293b, 0x001122);
  return g;
}

function buildBicycle(): THREE.Group {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.9, roughness: 0.2 }); // Red frame
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

  // Wheels
  const wheelGeo = new THREE.TorusGeometry(0.32, 0.04, 8, 16);
  for (const z of [-0.6, 0.6]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(0, 0.32, z);
    g.add(wheel);
  }

  // Triangular Frame
  const bar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), frameMat);
  bar1.position.set(0, 0.55, 0);
  bar1.rotation.x = 0.4;
  g.add(bar1);

  const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), frameMat);
  bar2.position.set(0, 0.55, -0.3);
  bar2.rotation.x = -0.5;
  g.add(bar2);

  // Handlebars & Seat
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.04), metalMat);
  bar.position.set(0, 0.85, -0.5);
  g.add(bar);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.24), wheelMat);
  seat.position.set(0, 0.78, 0.2);
  g.add(seat);

  tagMesh(g, 0xef4444, 0x440000);
  return g;
}

function buildACUnit(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.4 });
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.5 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.45), mat);
  box.position.y = 0.325;
  g.add(box);

  // Front fan grill
  const grill = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), grillMat);
  grill.rotation.x = Math.PI / 2;
  grill.position.set(0.1, 0.325, 0.23);
  g.add(grill);

  tagMesh(g, 0xcbd5e1, 0x223344);
  return g;
}

function buildVendingMachine(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.7, roughness: 0.3 }); // Crimson
  const frontMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.2 });

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.7, 0.75), bodyMat);
  cabinet.position.y = 0.85;
  g.add(cabinet);

  // Illuminated drink display window
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.0), frontMat);
  display.position.set(0, 1.05, 0.38);
  g.add(display);

  tagMesh(g, 0xb91c1c, 0x440000);
  return g;
}

function buildShippingCrate(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.85, roughness: 0.3 }); // Navy blue container steel

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat);
  box.position.y = 0.55;
  g.add(box);

  // Steel reinforced corners
  const cornerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
  const corner = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.08, 1.14), cornerMat);
  corner.position.y = 0.55;
  g.add(corner);

  tagMesh(g, 0x0369a1, 0x002244);
  return g;
}

function buildPropaneTank(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.85, roughness: 0.2 }); // Clean white steel

  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.75, 16), mat);
  cylinder.position.y = 0.5;
  g.add(cylinder);

  // Dome top & bottom
  const topDome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8), mat);
  topDome.position.y = 0.875;
  g.add(topDome);

  // Valve collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), mat);
  collar.position.y = 1.05;
  g.add(collar);

  tagMesh(g, 0xf1f5f9, 0x222233);
  return g;
}

function buildTrashCan(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.9, roughness: 0.3 }); // Galvanized steel

  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.8, 16), mat);
  can.position.y = 0.4;
  g.add(can);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 16), mat);
  lid.position.y = 0.84;
  g.add(lid);

  tagMesh(g, 0xa1a1aa, 0x222222);
  return g;
}

function buildStreetSign(): THREE.Group {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
  const signMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.4, roughness: 0.4 }); // Red STOP sign

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), poleMat);
  pole.position.y = 1.1;
  g.add(pole);

  // Octagon STOP plate
  const sign = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 8), signMat);
  sign.rotation.x = Math.PI / 2;
  sign.position.set(0, 1.9, 0.04);
  g.add(sign);

  tagMesh(g, 0xdc2626, 0x440000);
  return g;
}

function buildToolbox(): THREE.Group {
  const g = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.85, roughness: 0.25 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.5), redMat);
  box.position.y = 0.45;
  g.add(box);

  // Drawer pull handles
  for (let y = 0.25; y <= 0.75; y += 0.15) {
    const pull = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.03), chromeMat);
    pull.position.set(0, y, 0.26);
    g.add(pull);
  }

  tagMesh(g, 0xb91c1c, 0x330000);
  return g;
}

function buildSatelliteDish(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

  // Dish
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), mat);
  dish.rotation.x = -Math.PI / 2;
  dish.position.y = 0.6;
  g.add(dish);

  // Tripod base
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), mat);
  stand.position.y = 0.3;
  g.add(stand);

  tagMesh(g, 0x94a3b8, 0x222233);
  return g;
}

function buildSteelDrum(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.85, roughness: 0.3 }); // Hazard Red/Rose

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.85, 16), mat);
  drum.position.y = 0.425;
  g.add(drum);

  // Rolling ribs
  for (const y of [0.25, 0.6]) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.02, 6, 16), mat);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = y;
    g.add(rib);
  }

  tagMesh(g, 0xe11d48, 0x440011);
  return g;
}

function buildGeneratorCart(): THREE.Group {
  const g = new THREE.Group();
  const cageMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.3 }); // Yellow steel cage
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9, roughness: 0.3 });

  // Roll cage
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.55), cageMat);
  cage.position.y = 0.4;
  g.add(cage);

  // Engine
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.4), engineMat);
  engine.position.y = 0.38;
  g.add(engine);

  tagMesh(g, 0xfacc15, 0x553300);
  return g;
}

function buildSteelSafe(): THREE.Group {
  const g = new THREE.Group();
  const safeMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.25 });
  const dialMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.65), safeMat);
  box.position.y = 0.375;
  g.add(box);

  // Rotary Dial
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), dialMat);
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.12, 0.42, 0.34);
  g.add(dial);

  tagMesh(g, 0x334155, 0x112233);
  return g;
}

function buildHotDogCart(): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 }); // Stainless steel
  const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });

  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.8), steelMat);
  cart.position.y = 0.55;
  g.add(cart);

  // Umbrella
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), steelMat);
  pole.position.set(0.4, 1.4, 0);
  g.add(pole);

  const umbrella = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.35, 12), umbrellaMat);
  umbrella.position.set(0.4, 2.25, 0);
  g.add(umbrella);

  tagMesh(g, 0xe2e8f0, 0x223344);
  return g;
}

// Map of 24 distinct object blueprints
interface RealisticObjectSpec {
  type: ObjectType;
  mass: number;
  hitRadius: number;
  halfSize: THREE.Vector3;
  builder: () => THREE.Group;
  colliderType: 'cuboid' | 'cylinder';
  count: number;
}

const OBJECT_SPECS: RealisticObjectSpec[] = [
  { type: 'car_sedan', mass: 85, hitRadius: 2.2, halfSize: new THREE.Vector3(0.8, 0.6, 1.8), builder: () => buildCar(false), colliderType: 'cuboid', count: 4 },
  { type: 'taxi_cab', mass: 85, hitRadius: 2.2, halfSize: new THREE.Vector3(0.8, 0.6, 1.8), builder: () => buildCar(true), colliderType: 'cuboid', count: 4 },
  { type: 'motorcycle', mass: 35, hitRadius: 1.3, halfSize: new THREE.Vector3(0.3, 0.5, 0.8), builder: buildMotorcycle, colliderType: 'cuboid', count: 4 },
  { type: 'iron_dumpster', mass: 55, hitRadius: 1.5, halfSize: new THREE.Vector3(0.8, 0.6, 0.6), builder: buildDumpster, colliderType: 'cuboid', count: 4 },
  { type: 'i_beam', mass: 35, hitRadius: 1.6, halfSize: new THREE.Vector3(0.2, 0.2, 1.3), builder: buildIBeam, colliderType: 'cuboid', count: 5 },
  { type: 'metal_pipe', mass: 22, hitRadius: 1.5, halfSize: new THREE.Vector3(0.2, 1.2, 0.2), builder: buildPipe, colliderType: 'cylinder', count: 5 },
  { type: 'fire_hydrant', mass: 25, hitRadius: 1.0, halfSize: new THREE.Vector3(0.25, 0.45, 0.25), builder: buildFireHydrant, colliderType: 'cylinder', count: 4 },
  { type: 'street_lamppost', mass: 30, hitRadius: 1.8, halfSize: new THREE.Vector3(0.2, 1.6, 0.2), builder: buildLamppost, colliderType: 'cylinder', count: 3 },
  { type: 'traffic_barrier', mass: 45, hitRadius: 1.4, halfSize: new THREE.Vector3(1.0, 0.35, 0.2), builder: buildTrafficBarrier, colliderType: 'cuboid', count: 4 },
  { type: 'manhole_cover', mass: 28, hitRadius: 1.0, halfSize: new THREE.Vector3(0.42, 0.08, 0.42), builder: buildManholeCover, colliderType: 'cylinder', count: 4 },
  { type: 'metal_bench', mass: 25, hitRadius: 1.2, halfSize: new THREE.Vector3(0.8, 0.4, 0.3), builder: buildMetalBench, colliderType: 'cuboid', count: 4 },
  { type: 'bicycle', mass: 14, hitRadius: 1.2, halfSize: new THREE.Vector3(0.25, 0.45, 0.7), builder: buildBicycle, colliderType: 'cuboid', count: 4 },
  { type: 'ac_unit', mass: 26, hitRadius: 1.1, halfSize: new THREE.Vector3(0.4, 0.35, 0.25), builder: buildACUnit, colliderType: 'cuboid', count: 4 },
  { type: 'vending_machine', mass: 65, hitRadius: 1.5, halfSize: new THREE.Vector3(0.45, 0.85, 0.4), builder: buildVendingMachine, colliderType: 'cuboid', count: 3 },
  { type: 'shipping_crate', mass: 50, hitRadius: 1.3, halfSize: new THREE.Vector3(0.55, 0.55, 0.55), builder: buildShippingCrate, colliderType: 'cuboid', count: 4 },
  { type: 'propane_tank', mass: 18, hitRadius: 1.0, halfSize: new THREE.Vector3(0.2, 0.5, 0.2), builder: buildPropaneTank, colliderType: 'cylinder', count: 4 },
  { type: 'metal_trash_can', mass: 12, hitRadius: 0.9, halfSize: new THREE.Vector3(0.25, 0.4, 0.25), builder: buildTrashCan, colliderType: 'cylinder', count: 5 },
  { type: 'street_sign_pole', mass: 15, hitRadius: 1.4, halfSize: new THREE.Vector3(0.2, 1.1, 0.2), builder: buildStreetSign, colliderType: 'cylinder', count: 3 },
  { type: 'toolbox_cabinet', mass: 35, hitRadius: 1.2, halfSize: new THREE.Vector3(0.45, 0.4, 0.25), builder: buildToolbox, colliderType: 'cuboid', count: 3 },
  { type: 'satellite_dish', mass: 18, hitRadius: 1.2, halfSize: new THREE.Vector3(0.45, 0.4, 0.3), builder: buildSatelliteDish, colliderType: 'cuboid', count: 3 },
  { type: 'steel_drum', mass: 20, hitRadius: 1.0, halfSize: new THREE.Vector3(0.28, 0.45, 0.28), builder: buildSteelDrum, colliderType: 'cylinder', count: 5 },
  { type: 'generator_cart', mass: 40, hitRadius: 1.2, halfSize: new THREE.Vector3(0.45, 0.35, 0.3), builder: buildGeneratorCart, colliderType: 'cuboid', count: 3 },
  { type: 'steel_safe', mass: 60, hitRadius: 1.2, halfSize: new THREE.Vector3(0.38, 0.38, 0.35), builder: buildSteelSafe, colliderType: 'cuboid', count: 3 },
  { type: 'hot_dog_cart', mass: 45, hitRadius: 1.4, halfSize: new THREE.Vector3(0.65, 0.6, 0.45), builder: buildHotDogCart, colliderType: 'cuboid', count: 3 }
];

// Helper to instantiate any 3D metal object with Rapier rigid body and hover collider
function spawnDynamicObject(
  scene: THREE.Scene,
  world: RAPIER.World,
  type: ObjectType,
  mass: number,
  hitRadius: number,
  halfSize: THREE.Vector3,
  group: THREE.Group,
  pos: THREE.Vector3,
  rot: THREE.Euler,
  isFixed = false,
  colliderType: 'cuboid' | 'cylinder' = 'cuboid'
): MetalObject {
  group.position.copy(pos);
  group.rotation.copy(rot);
  scene.add(group);

  const hoverSphere = new THREE.Mesh(
    new THREE.SphereGeometry(hitRadius, 8, 6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  group.add(hoverSphere);

  const bodyDesc = isFixed ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
  bodyDesc
    .setTranslation(pos.x, pos.y, pos.z)
    .setRotation({
      x: group.quaternion.x,
      y: group.quaternion.y,
      z: group.quaternion.z,
      w: group.quaternion.w
    })
    .setLinearDamping(0.2)
    .setAngularDamping(0.2);

  const body = world.createRigidBody(bodyDesc);

  let colliderDesc: RAPIER.ColliderDesc;
  if (colliderType === 'cylinder') {
    colliderDesc = RAPIER.ColliderDesc.cylinder(halfSize.y, halfSize.x);
  } else {
    colliderDesc = RAPIER.ColliderDesc.cuboid(halfSize.x, halfSize.y, halfSize.z);
  }

  colliderDesc
    .setMass(mass)
    .setRestitution(0.3)
    .setFriction(0.65);

  world.createCollider(colliderDesc, body);

  const id = nextId++;
  (group as any).userData = { objectId: id };
  (hoverSphere as any).userData = { objectId: id };
  group.traverse((c) => {
    (c as any).userData = (c as any).userData || {};
    (c as any).userData.objectId = id;
  });

  return {
    id,
    mesh: group,
    body,
    mass,
    type,
    grabbed: false,
    thrown: false,
    hitRadius
  };
}

export function spawnFreshJavelin(
  scene: THREE.Scene,
  world: RAPIER.World,
  pos = new THREE.Vector3(0.42, 1.25, 4.8),
  rot = new THREE.Euler(0, 0, 0)
): MetalObject {
  return spawnDynamicObject(
    scene,
    world,
    'javelin',
    5,
    1.3,
    new THREE.Vector3(0.08, 0.08, 1.2),
    buildJavelin(),
    pos,
    rot,
    false,
    'cuboid'
  );
}

export function createArenaObjects(
  arena: ArenaType,
  scene: THREE.Scene,
  world: RAPIER.World
): MetalObject[] {
  const objects: MetalObject[] = [];

  // =========================================================================
  // 1. STADIUM ARENA (Mission 1: «Копьё» — 1930s Nuremberg Athletics Field)
  // =========================================================================
  if (arena === 'stadium') {
    // A) Gleaming Tournament Javelins right in front of player (player is at (0, 1.6, 6))
    const javelinPlacements = [
      // Right in front on throwing line (easy reach, aligned pointing towards targets -Z)
      { pos: new THREE.Vector3(0.42, 1.25, 4.8), rot: new THREE.Euler(0, 0, 0) },
      { pos: new THREE.Vector3(-0.42, 1.25, 4.8), rot: new THREE.Euler(0, 0, 0) },
      // On ready stands / racks
      { pos: new THREE.Vector3(0.9, 1.05, 5.3), rot: new THREE.Euler(0, 0.15, 0) },
      { pos: new THREE.Vector3(-0.9, 1.05, 5.3), rot: new THREE.Euler(0, -0.15, 0) },
      { pos: new THREE.Vector3(1.4, 0.95, 4.9), rot: new THREE.Euler(0, 0.1, 0) },
      { pos: new THREE.Vector3(-1.4, 0.95, 4.9), rot: new THREE.Euler(0, -0.1, 0) },
      // Runway reserves
      { pos: new THREE.Vector3(0, 0.9, 3.8), rot: new THREE.Euler(0, 0, 0) },
      { pos: new THREE.Vector3(0.65, 0.9, 3.5), rot: new THREE.Euler(0, 0.2, 0) },
      { pos: new THREE.Vector3(-0.65, 0.9, 3.5), rot: new THREE.Euler(0, -0.2, 0) },
      { pos: new THREE.Vector3(0, 0.85, 2.4), rot: new THREE.Euler(0, 0, 0) }
    ];

    for (const jp of javelinPlacements) {
      objects.push(
        spawnDynamicObject(
          scene,
          world,
          'javelin',
          5, // 5kg tournament spear
          1.3, // generous hover radius for effortless aiming
          new THREE.Vector3(0.08, 0.08, 1.2),
          buildJavelin(),
          jp.pos,
          jp.rot,
          false,
          'cuboid'
        )
      );
    }

    // B) Javelin Stands on left and right
    for (const side of [-1, 1]) {
      objects.push(
        spawnDynamicObject(
          scene,
          world,
          'javelin_rack',
          45,
          1.5,
          new THREE.Vector3(0.65, 0.55, 0.3),
          buildJavelinRack(),
          new THREE.Vector3(side * 1.9, 0.55, 5.1),
          new THREE.Euler(0, -side * 0.4, 0),
          true,
          'cuboid'
        )
      );
    }

    // C) Circular Target Boards downfield along the sector (facing towards player at +Z)
    // Placed at close, comfortable distances (from 6m to 21m instead of 60m!)
    const targetPlacements = [
      { pos: new THREE.Vector3(0, 0, 0), label: 'Center Front (6m)' },
      { pos: new THREE.Vector3(-3.0, 0, -3.5), label: 'Left Front (10m)' },
      { pos: new THREE.Vector3(3.0, 0, -3.5), label: 'Right Front (10m)' },
      { pos: new THREE.Vector3(-1.8, 0, -7.5), label: 'Mid Left (14m)' },
      { pos: new THREE.Vector3(1.8, 0, -7.5), label: 'Mid Right (14m)' },
      { pos: new THREE.Vector3(0, 0, -11.5), label: 'Center Mid (18m)' },
      { pos: new THREE.Vector3(-3.8, 0, -14.5), label: 'Left Mid-Far (21m)' },
      { pos: new THREE.Vector3(3.8, 0, -14.5), label: 'Right Mid-Far (21m)' }
    ];

    for (const tp of targetPlacements) {
      objects.push(
        spawnDynamicObject(
          scene,
          world,
          'target_board',
          140, // Sturdy tripod stand
          2.8, // Large hover radius for effortless targeting
          new THREE.Vector3(1.25, 1.6, 0.4),
          buildTargetBoard(),
          tp.pos,
          new THREE.Euler(0, 0, 0),
          true, // Fixed in Rapier so it stays upright as a solid target
          'cuboid'
        )
      );
    }

    // D) Sideline Track Benches
    for (const side of [-1, 1]) {
      for (const z of [-12, 2]) {
        objects.push(
          spawnDynamicObject(
            scene,
            world,
            'metal_bench',
            30,
            1.3,
            new THREE.Vector3(0.8, 0.4, 0.3),
            buildMetalBench(),
            new THREE.Vector3(side * 9, 0.4, z),
            new THREE.Euler(0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0),
            false,
            'cuboid'
          )
        );
      }
    }

    return objects;
  }

  // =========================================================================
  // 2. BUNKER ARENA (Mission 2: «Замок» — Underground Vault Room)
  // =========================================================================
  if (arena === 'bunker') {
    const bunkerProps = [
      { type: 'iron_grate' as ObjectType, builder: buildIronGrate, mass: 40, size: new THREE.Vector3(0.6, 0.7, 0.1), rad: 1.3, col: 'cuboid' as const },
      { type: 'metal_pipe' as ObjectType, builder: buildPipe, mass: 22, size: new THREE.Vector3(0.2, 1.2, 0.2), rad: 1.4, col: 'cylinder' as const },
      { type: 'steel_safe' as ObjectType, builder: buildSteelSafe, mass: 65, size: new THREE.Vector3(0.38, 0.38, 0.35), rad: 1.2, col: 'cuboid' as const },
      { type: 'toolbox_cabinet' as ObjectType, builder: buildToolbox, mass: 35, size: new THREE.Vector3(0.45, 0.4, 0.25), rad: 1.2, col: 'cuboid' as const },
      { type: 'steel_drum' as ObjectType, builder: buildSteelDrum, mass: 25, size: new THREE.Vector3(0.28, 0.45, 0.28), rad: 1.1, col: 'cylinder' as const },
      { type: 'generator_cart' as ObjectType, builder: buildGeneratorCart, mass: 45, size: new THREE.Vector3(0.45, 0.35, 0.3), rad: 1.2, col: 'cuboid' as const },
      { type: 'shipping_crate' as ObjectType, builder: buildShippingCrate, mass: 55, size: new THREE.Vector3(0.55, 0.55, 0.55), rad: 1.3, col: 'cuboid' as const }
    ];

    for (let i = 0; i < 20; i++) {
      const prop = bunkerProps[i % bunkerProps.length];
      const angle = (i / 20) * Math.PI * 2;
      const dist = 2.4 + (i % 3) * 1.2;
      const x = Math.sin(angle) * dist;
      const z = -2.5 + Math.cos(angle) * (dist * 0.8);
      objects.push(
        spawnDynamicObject(
          scene,
          world,
          prop.type,
          prop.mass,
          prop.rad,
          prop.size,
          prop.builder(),
          new THREE.Vector3(x, prop.size.y + 0.05, z),
          new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
          false,
          prop.col
        )
      );
    }

    return objects;
  }

  // =========================================================================
  // 3. CAMP ESCAPE ARENA (Mission 3: «Побег» — Nighttime Prison Camp)
  // =========================================================================
  if (arena === 'camp') {
    const campProps = [
      { type: 'steel_helmet' as ObjectType, builder: buildSteelHelmet, mass: 6, size: new THREE.Vector3(0.2, 0.15, 0.2), rad: 1.0, col: 'cylinder' as const, count: 6 },
      { type: 'corrugated_sheet' as ObjectType, builder: buildCorrugatedSheet, mass: 25, size: new THREE.Vector3(0.6, 0.9, 0.1), rad: 1.5, col: 'cuboid' as const, count: 4 },
      { type: 'rebar_bundle' as ObjectType, builder: buildRebarBundle, mass: 35, size: new THREE.Vector3(0.2, 0.2, 1.3), rad: 1.5, col: 'cuboid' as const, count: 4 },
      { type: 'iron_grate' as ObjectType, builder: buildIronGrate, mass: 40, size: new THREE.Vector3(0.6, 0.7, 0.1), rad: 1.4, col: 'cuboid' as const, count: 4 },
      { type: 'barbed_wire_roll' as ObjectType, builder: buildBarbedWireRoll, mass: 16, size: new THREE.Vector3(0.45, 0.45, 0.45), rad: 1.2, col: 'cylinder' as const, count: 4 },
      { type: 'steel_drum' as ObjectType, builder: buildSteelDrum, mass: 22, size: new THREE.Vector3(0.28, 0.45, 0.28), rad: 1.1, col: 'cylinder' as const, count: 4 },
      { type: 'metal_pipe' as ObjectType, builder: buildPipe, mass: 22, size: new THREE.Vector3(0.2, 1.2, 0.2), rad: 1.4, col: 'cylinder' as const, count: 4 },
      { type: 'traffic_barrier' as ObjectType, builder: buildTrafficBarrier, mass: 45, size: new THREE.Vector3(1.0, 0.35, 0.2), rad: 1.4, col: 'cuboid' as const, count: 3 }
    ];

    // Distribute objects along the escape road from Z=20 to Z=-18
    const corridorZPlacements = [
      18, 15, 12, 9, 6, 3, 0, -3, -6, -9, -12, -15, -18
    ];

    let propIdx = 0;
    for (const z of corridorZPlacements) {
      // 2 to 3 objects per segment along sides of road
      const sideOffsets = [-5.5, -3.2, 3.2, 5.5];
      for (const ox of sideOffsets) {
        if (Math.random() < 0.25) continue; // slight organic variation
        const spec = campProps[propIdx % campProps.length];
        propIdx++;
        const jitterX = ox + (Math.random() - 0.5) * 1.0;
        const jitterZ = z + (Math.random() - 0.5) * 1.5;

        objects.push(
          spawnDynamicObject(
            scene,
            world,
            spec.type,
            spec.mass,
            spec.rad,
            spec.size,
            spec.builder(),
            new THREE.Vector3(jitterX, spec.size.y + 0.05, jitterZ),
            new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
            false,
            spec.col
          )
        );
      }
    }

    return objects;
  }

  // =========================================================================
  // 4. ARAKKO MINDSCAPE (Mission 4: «Марионетка» & Mission 5: «Пробуждение»)
  // Metallic weapons floating directly in front of player facing boss
  // =========================================================================
  if (arena === 'mindscape') {
    const astralProps = [
      { type: 'steel_safe' as ObjectType, builder: buildSteelSafe, mass: 45, size: new THREE.Vector3(0.38, 0.38, 0.35), rad: 1.4 },
      { type: 'metal_pipe' as ObjectType, builder: buildPipe, mass: 22, size: new THREE.Vector3(0.2, 1.2, 0.2), rad: 1.5 },
      { type: 'steel_drum' as ObjectType, builder: buildSteelDrum, mass: 25, size: new THREE.Vector3(0.28, 0.45, 0.28), rad: 1.3 },
      { type: 'i_beam' as ObjectType, builder: buildIBeam, mass: 50, size: new THREE.Vector3(0.25, 0.25, 1.4), rad: 1.8 },
      { type: 'toolbox_cabinet' as ObjectType, builder: buildToolbox, mass: 35, size: new THREE.Vector3(0.45, 0.4, 0.25), rad: 1.3 },
      { type: 'shipping_crate' as ObjectType, builder: buildShippingCrate, mass: 55, size: new THREE.Vector3(0.55, 0.55, 0.55), rad: 1.4 },
      { type: 'satellite_dish' as ObjectType, builder: buildSatelliteDish, mass: 20, size: new THREE.Vector3(0.45, 0.4, 0.3), rad: 1.4 }
    ];

    // Place 14 objects in two forward concentric arcs directly between player (z = 0) and Boss (z = -8)
    const placements = [
      // Close arc (z ~ -3.2)
      { x: -2.4, y: 1.35, z: -3.0 },
      { x: -1.2, y: 1.55, z: -3.4 },
      { x: 0.0, y: 1.30, z: -3.6 },
      { x: 1.2, y: 1.55, z: -3.4 },
      { x: 2.4, y: 1.35, z: -3.0 },
      // Mid arc (z ~ -5.0)
      { x: -3.6, y: 1.45, z: -4.8 },
      { x: -2.0, y: 1.65, z: -5.2 },
      { x: -0.8, y: 1.35, z: -5.5 },
      { x: 0.8, y: 1.35, z: -5.5 },
      { x: 2.0, y: 1.65, z: -5.2 },
      { x: 3.6, y: 1.45, z: -4.8 },
      // Flanking reserves
      { x: -4.2, y: 1.25, z: -2.6 },
      { x: 4.2, y: 1.25, z: -2.6 },
      { x: 0.0, y: 1.70, z: -2.2 }
    ];

    for (let i = 0; i < placements.length; i++) {
      const p = astralProps[i % astralProps.length];
      const pos = placements[i];
      objects.push(
        spawnDynamicObject(
          scene,
          world,
          p.type,
          p.mass,
          p.rad,
          p.size,
          p.builder(),
          new THREE.Vector3(pos.x, pos.y, pos.z),
          new THREE.Euler(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3),
          false,
          'cuboid'
        )
      );
    }

    return objects;
  }

  // =========================================================================
  // 6. DUEL ARENA (Режим «ДУЭЛИ» — Парящий металл вокруг дуэлянта)
  // =========================================================================
  if (arena === 'duel') {
    const duelProps = [
      { type: 'metal_pipe' as ObjectType, builder: buildPipe, mass: 22, size: new THREE.Vector3(0.2, 1.2, 0.2), rad: 1.4 },
      { type: 'steel_drum' as ObjectType, builder: buildSteelDrum, mass: 25, size: new THREE.Vector3(0.28, 0.45, 0.28), rad: 1.2 },
      { type: 'i_beam' as ObjectType, builder: buildIBeam, mass: 45, size: new THREE.Vector3(0.25, 0.25, 1.4), rad: 1.8 },
      { type: 'propane_tank' as ObjectType, builder: buildPropaneTank, mass: 20, size: new THREE.Vector3(0.25, 0.45, 0.25), rad: 1.2 },
      { type: 'traffic_barrier' as ObjectType, builder: buildTrafficBarrier, mass: 35, size: new THREE.Vector3(0.8, 0.45, 0.2), rad: 1.5 },
      { type: 'steel_safe' as ObjectType, builder: buildSteelSafe, mass: 45, size: new THREE.Vector3(0.38, 0.38, 0.35), rad: 1.2 }
    ];

    // Player is at (0, 1.6, 3.5), Opponent is at (0, 1.4, -5.5)
    // 8 floating weapons hover directly in front of player's hands at eye/chest level
    const duelPlacements = [
      { x: -1.6, y: 1.35, z: 2.2 },
      { x: 1.6, y: 1.35, z: 2.2 },
      { x: -0.9, y: 1.50, z: 1.7 },
      { x: 0.9, y: 1.50, z: 1.7 },
      { x: -1.8, y: 1.40, z: 1.3 },
      { x: 1.8, y: 1.40, z: 1.3 },
      { x: -0.7, y: 1.30, z: 2.5 },
      { x: 0.7, y: 1.30, z: 2.5 }
    ];

    for (let i = 0; i < duelPlacements.length; i++) {
      const p = duelProps[i % duelProps.length];
      const pos = duelPlacements[i];

      objects.push(
        spawnDynamicObject(
          scene,
          world,
          p.type,
          p.mass,
          p.rad,
          p.size,
          p.builder(),
          new THREE.Vector3(pos.x, pos.y, pos.z),
          new THREE.Euler(Math.random() * 0.3, Math.random() * Math.PI, 0),
          false,
          'cuboid'
        )
      );
    }

    return objects;
  }

  // =========================================================================
  // 5. NYC STREET ARENA (Mission 4: «Марионетка» & Quick Arena)
  // =========================================================================
  const placedPositions: { x: number; z: number }[] = [];

  function isValidPlacement(x: number, z: number, minDist = 1.4): boolean {
    if (Math.hypot(x, z) < 2.2) return false;
    for (const p of placedPositions) {
      if (Math.hypot(p.x - x, p.z - z) < minDist) return false;
    }
    return true;
  }

  const frontArcSlots: { x: number; z: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const angle = -Math.PI / 2 + ((i - 6.5) / 7) * 1.1;
    const dist = 3.2 + (i % 3) * 0.7;
    frontArcSlots.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist
    });
  }

  let slotIndex = 0;

  for (const spec of OBJECT_SPECS) {
    for (let i = 0; i < spec.count; i++) {
      let x = 0;
      let z = 0;

      if (slotIndex < frontArcSlots.length) {
        x = frontArcSlots[slotIndex].x;
        z = frontArcSlots[slotIndex].z;
        slotIndex++;
      } else {
        let attempts = 0;
        let found = false;
        while (attempts < 50 && !found) {
          attempts++;
          const onSidewalk = Math.random() > 0.45;
          let rx = 0;
          if (onSidewalk) {
            rx = (Math.random() > 0.5 ? 1 : -1) * (13 + Math.random() * 5);
          } else {
            rx = (Math.random() - 0.5) * 18;
          }
          const rz = -28 + Math.random() * 56;
          if (isValidPlacement(rx, rz, spec.hitRadius * 0.7)) {
            x = rx;
            z = rz;
            found = true;
          }
        }
        if (!found) {
          const idx = objects.length;
          x = (idx % 2 === 0 ? -1 : 1) * (4 + (idx % 6) * 1.8);
          z = -18 + ((idx * 3) % 40);
        }
      }

      placedPositions.push({ x, z });
      const y = spec.halfSize.y + 0.05;

      objects.push(
        spawnDynamicObject(
          scene,
          world,
          spec.type,
          spec.mass,
          spec.hitRadius,
          spec.halfSize,
          spec.builder(),
          new THREE.Vector3(x, y, z),
          new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
          false,
          spec.colliderType
        )
      );
    }
  }

  return objects;
}

export function createObjects(
  scene: THREE.Scene,
  world: RAPIER.World
): MetalObject[] {
  return createArenaObjects('nyc', scene, world);
}

/** Sync mesh transforms from Rapier physics bodies */
export function syncObjects(objects: MetalObject[]): void {
  for (const obj of objects) {
    const pos = obj.body.translation();
    const rot = obj.body.rotation();
    obj.mesh.position.set(pos.x, pos.y, pos.z);
    obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  }
}

/** Apply direct spring force to pull grabbed object swiftly to hold point */
export function applyGrabForce(
  obj: MetalObject,
  holdPoint: THREE.Vector3
): void {
  const pos = obj.body.translation();
  const dx = holdPoint.x - pos.x;
  const dy = holdPoint.y - pos.y;
  const dz = holdPoint.z - pos.z;

  const dist = Math.hypot(dx, dy, dz);
  const speed = Math.min(dist * 20, 36);

  const nx = dist > 0.001 ? dx / dist : 0;
  const ny = dist > 0.001 ? dy / dist : 0;
  const nz = dist > 0.001 ? dz / dist : 0;

  obj.body.setLinvel({
    x: nx * speed,
    y: ny * speed,
    z: nz * speed
  }, true);

  // Gentle levitation torque
  obj.body.setAngvel({
    x: (Math.random() - 0.5) * 0.2,
    y: 0.5,
    z: (Math.random() - 0.5) * 0.2
  }, true);
}

export function resetObjectId(): void {
  nextId = 1;
}

export function spawnDuelReplenishObject(
  scene: THREE.Scene,
  world: RAPIER.World,
  playerX: number,
  side: number,
  playerZ = 3.5
): MetalObject {
  const duelPool = [
    { type: 'metal_pipe' as ObjectType, builder: buildPipe, mass: 22, size: new THREE.Vector3(0.2, 1.2, 0.2), rad: 1.5 },
    { type: 'steel_drum' as ObjectType, builder: buildSteelDrum, mass: 25, size: new THREE.Vector3(0.28, 0.45, 0.28), rad: 1.4 },
    { type: 'i_beam' as ObjectType, builder: buildIBeam, mass: 45, size: new THREE.Vector3(0.25, 0.25, 1.4), rad: 1.8 },
    { type: 'propane_tank' as ObjectType, builder: buildPropaneTank, mass: 20, size: new THREE.Vector3(0.25, 0.45, 0.25), rad: 1.3 }
  ];
  const item = duelPool[Math.floor(Math.random() * duelPool.length)];
  const spawnX = playerX + side * (1.5 + Math.random() * 0.6);
  const spawnY = 1.3 + Math.random() * 0.3;
  const spawnZ = playerZ - 1.8 + (Math.random() - 0.5) * 0.6;

  return spawnDynamicObject(
    scene,
    world,
    item.type,
    item.mass,
    item.rad,
    item.size,
    item.builder(),
    new THREE.Vector3(spawnX, spawnY, spawnZ),
    new THREE.Euler(Math.random() * 0.3, Math.random() * Math.PI, 0),
    false,
    'cuboid'
  );
}
