/**
 * Procedural Three.js mesh builders for the Tank Battle game. Everything is
 * assembled from primitives (boxes, cylinders, planes) so the game needs zero
 * external 3D assets: no downloads, no licensing, no loading failures, and a
 * tiny footprint — while still looking like proper 3D tanks with lighting and
 * shadows.
 */
import * as THREE from 'three'
import type { TankDef } from '../types'
import { grassTexture, rockTexture } from './textures'

export interface TankMeshRefs {
  /** Root group: position is world position, rotation.y is the hull heading. */
  group: THREE.Group
  /** Turret group, rotated independently for aiming. */
  turret: THREE.Group
  /** Empty object at the barrel muzzle; use getWorldPosition to spawn shells. */
  muzzle: THREE.Object3D
  /** Health-bar group to be billboarded toward the camera each frame. */
  healthBar: THREE.Group
  /** Fill plane whose x-scale represents current health fraction. */
  healthFill: THREE.Mesh
  /** Full width of the health bar in world units (for left-anchored scaling). */
  healthWidth: number
}

/** Build a full tank mesh. Bosses are larger and menacing; players/enemies share form. */
export function buildTankMesh(
  def: TankDef,
  opts: { isBoss?: boolean } = {},
): TankMeshRefs {
  const scale = opts.isBoss ? 1.9 : 1
  const hullColor = new THREE.Color(def.hull)
  const accentColor = new THREE.Color(def.accent)

  const group = new THREE.Group()

  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.7, metalness: 0.3 })
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5, metalness: 0.4 })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9, metalness: 0.1 })

  // Treads (left/right dark boxes).
  const treadGeo = new THREE.BoxGeometry(0.4 * scale, 0.45 * scale, 2.4 * scale)
  for (const sx of [-1, 1]) {
    const tread = new THREE.Mesh(treadGeo, darkMat)
    tread.position.set(sx * 0.85 * scale, 0.22 * scale, 0)
    tread.castShadow = true
    tread.receiveShadow = true
    group.add(tread)
  }

  // Hull body.
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale, 0.55 * scale, 2.2 * scale), hullMat)
  hull.position.y = 0.55 * scale
  hull.castShadow = true
  hull.receiveShadow = true
  group.add(hull)

  // Sloped front glacis for a bit of shape.
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale, 0.3 * scale, 0.5 * scale), accentMat)
  nose.position.set(0, 0.45 * scale, 1.1 * scale)
  nose.castShadow = true
  group.add(nose)

  // Turret group (rotates for aiming).
  const turret = new THREE.Group()
  turret.position.y = 0.9 * scale
  group.add(turret)

  const turretBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55 * scale, 0.65 * scale, 0.5 * scale, 12),
    accentMat,
  )
  turretBody.castShadow = true
  turret.add(turretBody)

  // Barrel points along +Z (forward).
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 1.6 * scale, 10),
    darkMat,
  )
  barrel.rotation.x = Math.PI / 2
  barrel.position.set(0, 0.05 * scale, 0.95 * scale)
  barrel.castShadow = true
  turret.add(barrel)

  if (opts.isBoss) {
    // Spikes to make bosses read as dangerous.
    const spikeGeo = new THREE.ConeGeometry(0.18 * scale, 0.5 * scale, 6)
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.6 })
    for (const [x, z] of [
      [-0.6, 0.6],
      [0.6, 0.6],
      [-0.6, -0.6],
      [0.6, -0.6],
    ] as const) {
      const spike = new THREE.Mesh(spikeGeo, spikeMat)
      spike.position.set(x * scale, 0.3 * scale, z * scale)
      turret.add(spike)
    }
  }

  const muzzle = new THREE.Object3D()
  muzzle.position.set(0, 0.05 * scale, 1.9 * scale)
  turret.add(muzzle)

  // Health bar above the tank.
  const healthWidth = 1.6 * scale
  const healthBar = new THREE.Group()
  healthBar.position.y = (opts.isBoss ? 2.6 : 1.9) * scale
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(healthWidth + 0.1, 0.24),
    new THREE.MeshBasicMaterial({ color: 0x111111 }),
  )
  healthBar.add(barBg)
  const healthFill = new THREE.Mesh(
    new THREE.PlaneGeometry(healthWidth, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x4ade80 }),
  )
  healthFill.position.z = 0.001
  healthBar.add(healthFill)
  group.add(healthBar)

  return { group, turret, muzzle, healthBar, healthFill, healthWidth }
}

/** Update a health bar: fraction in [0,1], left-anchored, colour by remaining health. */
export function setHealthBar(refs: TankMeshRefs, fraction: number): void {
  const f = Math.max(0, Math.min(1, fraction))
  refs.healthFill.scale.x = f === 0 ? 0.0001 : f
  refs.healthFill.position.x = -(refs.healthWidth * (1 - f)) / 2
  const mat = refs.healthFill.material as THREE.MeshBasicMaterial
  mat.color.setHex(f > 0.5 ? 0x4ade80 : f > 0.25 ? 0xfacc15 : 0xef4444)
}

/** Billboard a health bar so it always faces the camera. */
export function faceCamera(healthBar: THREE.Group, camera: THREE.Camera): void {
  healthBar.quaternion.copy(camera.quaternion)
}

export interface Arena {
  /** Half-size of the square play field (walls sit at +/- this). */
  half: number
  /** Static obstacle circles for collision: {x, z, radius}. */
  obstacles: Array<{ x: number; z: number; radius: number }>
}

/** Build the ground, boundary walls, and scattered cover blocks. */
export function buildArena(scene: THREE.Scene, seed: number): Arena {
  const half = 26
  // Cartoony grass texture tiled across the field.
  const grass = grassTexture()
  grass.repeat.set(half / 2, half / 2)
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xd9e8cf, map: grass, roughness: 1 })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Cartoony rock texture, reused for walls and cover blocks.
  const rock = rockTexture()

  // Boundary walls (rocky).
  const wallTex = rock.clone()
  wallTex.needsUpdate = true
  wallTex.repeat.set(half / 2, 1)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xbfc4cc, map: wallTex, roughness: 0.95 })
  const wallH = 1.6
  const wallT = 0.8
  const wallGeoNS = new THREE.BoxGeometry(half * 2 + wallT * 2, wallH, wallT)
  const wallGeoEW = new THREE.BoxGeometry(wallT, wallH, half * 2 + wallT * 2)
  const positions: Array<[THREE.BoxGeometry, number, number]> = [
    [wallGeoNS, 0, -half - wallT / 2],
    [wallGeoNS, 0, half + wallT / 2],
    [wallGeoEW, -half - wallT / 2, 0],
    [wallGeoEW, half + wallT / 2, 0],
  ]
  for (const [geo, x, z] of positions) {
    const wall = new THREE.Mesh(geo, wallMat)
    wall.position.set(x, wallH / 2, z)
    wall.castShadow = true
    wall.receiveShadow = true
    scene.add(wall)
  }

  // Deterministic scattered cover blocks (obstacles), rocky.
  const rng = mulberry32(seed)
  const blockMat = new THREE.MeshStandardMaterial({ color: 0xc7ccd4, map: rock, roughness: 0.85 })
  const obstacles: Arena['obstacles'] = []
  const count = 7
  for (let i = 0; i < count; i++) {
    const s = 1.4 + rng() * 1.6
    const x = (rng() * 2 - 1) * (half - 6)
    const z = (rng() * 2 - 1) * (half - 6)
    // Keep the centre spawn clear.
    if (Math.hypot(x, z) < 6) continue
    const block = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.9, s), blockMat)
    block.position.set(x, (s * 0.9) / 2, z)
    block.castShadow = true
    block.receiveShadow = true
    scene.add(block)
    obstacles.push({ x, z, radius: s * 0.65 })
  }

  return { half, obstacles }
}

/** Small deterministic PRNG so arenas look varied but are reproducible per battle. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
