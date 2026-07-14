/**
 * The real-time Three.js battle engine. One instance drives a single encounter
 * — either a normal battle or a checkpoint boss fight — and reports outcomes
 * back to React through callbacks. React owns all progression/economy; the
 * engine owns only the live arena.
 *
 * Boss design implements the game's core learning loop:
 *   phase 1  the boss is INVULNERABLE ("undefeatable") and lethal, so the
 *            player is guaranteed to die -> engine emits `needReading`.
 *   reading  React shows a passage + MCQs; on success it calls
 *            reviveForSecondChance().
 *   phase 2  the boss becomes a real, defeatable (but hard) opponent.
 */
import * as THREE from 'three'
import type { TankStats } from '../types'
import { getTank } from '../tanks'
import { bossStats, enemyStats } from '../progression'
import type { Loadout } from '../loadout'
import {
  buildArena,
  buildTankMesh,
  faceCamera,
  setHealthBar,
  type Arena,
  type TankMeshRefs,
} from './meshes'

export type EncounterKind = 'battle' | 'boss'

export interface Hud {
  playerHp: number
  playerMaxHp: number
  enemiesLeft: number
  objective: string
  isBoss: boolean
  bossHp: number
  bossMaxHp: number
  bossInvulnerable: boolean
  powerWeapons: Array<{ id: string; name: string; count: number }>
}

export type Outcome =
  | { type: 'battleWon'; tanksKilled: number }
  | { type: 'battleLost' }
  | { type: 'needReading'; guardsKilled: number }
  | { type: 'bossDefeated'; guardsKilled: number }

export interface EngineConfig {
  kind: EncounterKind
  /** 0-indexed checkpoint driving enemy/boss difficulty. */
  checkpoint: number
  loadout: Loadout
  /** Number of normal enemies for a battle. */
  enemyCount: number
  /** Number of guards for a boss encounter. */
  guardCount: number
  seed: number
  onHud: (hud: Hud) => void
  onOutcome: (outcome: Outcome) => void
  /** Called when a power weapon is expended so the store can decrement it. */
  onPowerWeaponUsed: (weaponId: string) => void
}

interface Entity {
  refs: TankMeshRefs
  hp: number
  maxHp: number
  stats: TankStats
  radius: number
  fireCooldown: number
  alive: boolean
  isBoss: boolean
  invulnerable: boolean
}

interface Shell {
  mesh: THREE.Mesh
  vx: number
  vz: number
  damage: number
  fromPlayer: boolean
  life: number
}

interface Effect {
  mesh: THREE.Mesh
  life: number
  ttl: number
}

const PLAYER_RADIUS = 0.9
const ENEMY_RADIUS = 0.9
const BOSS_RADIUS = 1.7
const SHELL_RADIUS = 0.28
const SHELL_TTL = 2.5

export class TankEngine {
  private cfg: EngineConfig
  private container: HTMLElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private clock = new THREE.Clock()
  private raf = 0
  private disposed = false

  private arena: Arena
  private player!: Entity
  private enemies: Entity[] = []
  private boss: Entity | null = null
  private shells: Shell[] = []
  private effects: Effect[] = []

  private guardsKilled = 0
  private finished = false
  private enrageTimer = 0

  // Input state.
  private keys = new Set<string>()
  private pointer = new THREE.Vector2()
  private pointerDown = false
  private aimPoint = new THREE.Vector3(0, 0, 5)
  private mobileMove: { x: number; z: number } | null = null
  private mobileFire = false
  private raycaster = new THREE.Raycaster()
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private powerCounts: Record<string, number> = {}

  private readonly onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase())
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
      e.preventDefault()
    }
    if (e.key === '1') this.usePowerWeapon(this.cfg.loadout.powerWeapons[0]?.def.id)
    if (e.key === '2') this.usePowerWeapon(this.cfg.loadout.powerWeapons[1]?.def.id)
  }
  private readonly onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())
  private readonly onPointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }
  private readonly onPointerDown = (e: PointerEvent) => {
    if (e.button === 0) this.pointerDown = true
  }
  private readonly onPointerUp = () => {
    this.pointerDown = false
  }
  private readonly onResize = () => this.resize()

  constructor(container: HTMLElement, cfg: EngineConfig) {
    this.cfg = cfg
    this.container = container

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x8fb9d6)
    this.scene.fog = new THREE.Fog(0x8fb9d6, 40, 75)

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200)

    // Lighting.
    const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 0.8)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 1.1)
    sun.position.set(18, 30, 12)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 90
    const d = 34
    sun.shadow.camera.left = -d
    sun.shadow.camera.right = d
    sun.shadow.camera.top = d
    sun.shadow.camera.bottom = -d
    this.scene.add(sun)

    this.arena = buildArena(this.scene, cfg.seed)

    for (const w of cfg.loadout.powerWeapons) this.powerCounts[w.def.id] = w.count

    this.spawnPlayer()
    if (cfg.kind === 'battle') this.spawnBattle()
    else this.spawnBoss()

    this.resize()
    this.attachInput()
    this.emitHud()
  }

  // ---- setup ----

  private spawnPlayer(): void {
    const { loadout } = this.cfg
    const refs = buildTankMesh(loadout.tank)
    refs.group.position.set(0, 0, this.arena.half - 6)
    this.scene.add(refs.group)
    this.player = {
      refs,
      hp: loadout.stats.maxHp,
      maxHp: loadout.stats.maxHp,
      stats: loadout.stats,
      radius: PLAYER_RADIUS,
      fireCooldown: 0,
      alive: true,
      isBoss: false,
      invulnerable: false,
    }
  }

  private makeEnemy(stats: TankStats, x: number, z: number, isBoss: boolean): Entity {
    // Enemy skin is fixed per checkpoint (same skin between checkpoints), cycling
    // through the roster's later hulls so it visually differs from the player.
    const skin = getTank(`tank-${(this.cfg.checkpoint % 30) + 1}`)
    const refs = buildTankMesh(skin, { isBoss })
    refs.group.position.set(x, 0, z)
    this.scene.add(refs.group)
    return {
      refs,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      stats,
      radius: isBoss ? BOSS_RADIUS : ENEMY_RADIUS,
      fireCooldown: Math.random() * 1.2,
      alive: true,
      isBoss,
      invulnerable: false,
    }
  }

  private spawnBattle(): void {
    const stats = enemyStats(this.cfg.checkpoint)
    for (let i = 0; i < this.cfg.enemyCount; i++) {
      const angle = (i / this.cfg.enemyCount) * Math.PI - Math.PI / 2
      const x = Math.sin(angle) * 12
      const z = -this.arena.half + 6 + Math.cos(angle) * 4
      this.enemies.push(this.makeEnemy(stats, x, z, false))
    }
  }

  private spawnBoss(): void {
    const guardStats = enemyStats(this.cfg.checkpoint)
    for (let i = 0; i < this.cfg.guardCount; i++) {
      const angle = (i / Math.max(1, this.cfg.guardCount)) * Math.PI - Math.PI / 2
      const x = Math.sin(angle) * 9
      const z = -this.arena.half + 9
      this.enemies.push(this.makeEnemy(guardStats, x, z, false))
    }
    const bstats = bossStats(this.cfg.checkpoint)
    this.boss = this.makeEnemy(bstats, 0, -this.arena.half + 5, true)
    // Phase 1: invulnerable and extra-lethal so the player must earn a second chance.
    this.boss.invulnerable = true
    this.enemies.push(this.boss)
  }

  // ---- public API ----

  /** Revive the player and turn the boss into its defeatable second-chance form. */
  reviveForSecondChance(): void {
    if (this.disposed || !this.boss) return
    this.finished = false
    this.enrageTimer = 0
    // Clear any surviving guards so the second chance is a clean duel.
    for (const e of this.enemies) {
      if (e !== this.boss && e.alive) this.killEntity(e, false)
    }
    this.boss.invulnerable = false
    this.player.hp = this.player.maxHp
    // Reposition player to a safe spot.
    this.player.refs.group.position.set(0, 0, this.arena.half - 6)
    this.clock.getDelta() // drop the paused delta
    this.emitHud()
  }

  usePowerWeapon(weaponId: string | undefined): void {
    if (!weaponId || this.finished || this.disposed) return
    const remaining = this.powerCounts[weaponId] ?? 0
    if (remaining <= 0) return
    const def = this.cfg.loadout.powerWeapons.find((w) => w.def.id === weaponId)?.def
    if (!def) return
    this.powerCounts[weaponId] = remaining - 1
    this.cfg.onPowerWeaponUsed(weaponId)

    const px = this.player.refs.group.position.x
    const pz = this.player.refs.group.position.z
    this.spawnExplosion(px, pz, def.radius, 0xffcc33)
    for (const e of this.enemies) {
      if (!e.alive) continue
      const dist = Math.hypot(e.refs.group.position.x - px, e.refs.group.position.z - pz)
      if (dist <= def.radius) this.damageEntity(e, def.damage)
    }
    this.emitHud()
  }

  /** Mobile joystick vector (each component in [-1, 1]); null clears it. */
  setMobileMove(v: { x: number; z: number } | null): void {
    this.mobileMove = v
  }
  setMobileFire(on: boolean): void {
    this.mobileFire = on
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.detachInput()
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = (mesh as THREE.Mesh).material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else if (mat) (mat as THREE.Material).dispose()
    })
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  start(): void {
    this.clock.start()
    this.loop()
  }

  // ---- input ----

  private attachInput(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('resize', this.onResize)
    const el = this.renderer.domElement
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointerup', this.onPointerUp)
  }

  private detachInput(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('resize', this.onResize)
    const el = this.renderer.domElement
    el.removeEventListener('pointermove', this.onPointerMove)
    el.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointerup', this.onPointerUp)
  }

  private resize(): void {
    const w = this.container.clientWidth || window.innerWidth
    const h = this.container.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  // ---- main loop ----

  private loop = (): void => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.update(dt)
    this.renderer.render(this.scene, this.camera)
  }

  private update(dt: number): void {
    if (!this.finished) {
      this.updatePlayer(dt)
      this.updateEnemies(dt)
      this.updateShells(dt)
    }
    this.updateEffects(dt)
    this.updateCamera(dt)
    for (const e of this.enemies) if (e.alive) faceCamera(e.refs.healthBar, this.camera)
    faceCamera(this.player.refs.healthBar, this.camera)
  }

  private updatePlayer(dt: number): void {
    const p = this.player
    if (!p.alive) return

    // Movement (camera-relative world axes; camera is fixed-orientation).
    let mx = 0
    let mz = 0
    if (this.keys.has('w') || this.keys.has('arrowup')) mz -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) mz += 1
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1
    if (this.mobileMove) {
      mx += this.mobileMove.x
      mz += this.mobileMove.z
    }
    const len = Math.hypot(mx, mz)
    if (len > 0.001) {
      mx /= len
      mz /= len
      const pos = p.refs.group.position
      pos.x += mx * p.stats.speed * dt
      pos.z += mz * p.stats.speed * dt
      this.resolveCollisions(p)
      // Hull faces travel direction.
      p.refs.group.rotation.y = Math.atan2(mx, mz)
    }

    // Aim: raycast pointer onto the ground plane.
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = new THREE.Vector3()
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hit)) this.aimPoint.copy(hit)
    const pos = p.refs.group.position
    const aimAngle = Math.atan2(this.aimPoint.x - pos.x, this.aimPoint.z - pos.z)
    p.refs.turret.rotation.y = aimAngle - p.refs.group.rotation.y

    // Fire.
    p.fireCooldown -= dt
    if ((this.pointerDown || this.mobileFire || this.keys.has(' ')) && p.fireCooldown <= 0) {
      this.fire(p, aimAngle, true)
      p.fireCooldown = 1 / p.stats.fireRate
    }
  }

  private updateEnemies(dt: number): void {
    const p = this.player
    const ppos = p.refs.group.position
    for (const e of this.enemies) {
      if (!e.alive) continue
      const pos = e.refs.group.position
      const toPlayerX = ppos.x - pos.x
      const toPlayerZ = ppos.z - pos.z
      const dist = Math.hypot(toPlayerX, toPlayerZ) || 0.001
      const angleToPlayer = Math.atan2(toPlayerX, toPlayerZ)

      // Boss phase-1 enrages once its guards are gone, guaranteeing the player dies.
      let speed = e.stats.speed
      let fireRate = e.stats.fireRate
      let ramDamage = e.stats.damage * 0.5
      if (e === this.boss && e.invulnerable) {
        fireRate *= 1.6
        ramDamage *= 1.4
        if (this.allGuardsDead()) {
          this.enrageTimer += dt
          const rage = 1 + Math.min(this.enrageTimer * 0.25, 2.5)
          speed *= rage
          fireRate *= rage
        }
      }

      // Keep a preferred range; close in if far, back off if too close.
      const preferred = e.isBoss ? 8 : 10
      let dir = 0
      if (dist > preferred + 1) dir = 1
      else if (dist < preferred - 2) dir = -1
      if (dir !== 0 && p.alive) {
        pos.x += (toPlayerX / dist) * speed * dir * dt
        pos.z += (toPlayerZ / dist) * speed * dir * dt
      }
      // Gentle strafing to feel alive.
      pos.x += Math.cos(angleToPlayer) * speed * 0.25 * dt
      pos.z -= Math.sin(angleToPlayer) * speed * 0.25 * dt
      this.resolveCollisions(e)

      e.refs.group.rotation.y = angleToPlayer
      e.refs.turret.rotation.y = 0

      // Contact/ram damage when overlapping the player.
      if (p.alive && dist < e.radius + p.radius + 0.1) {
        this.damagePlayer(ramDamage * dt)
      }

      // Fire at the player when in range.
      e.fireCooldown -= dt
      if (p.alive && dist < 26 && e.fireCooldown <= 0) {
        this.fire(e, angleToPlayer, false)
        e.fireCooldown = 1 / fireRate
      }
    }
  }

  private allGuardsDead(): boolean {
    return this.enemies.every((e) => e === this.boss || !e.alive)
  }

  private fire(from: Entity, angle: number, fromPlayer: boolean): void {
    const muzzle = new THREE.Vector3()
    from.refs.muzzle.getWorldPosition(muzzle)
    const spread = fromPlayer ? this.cfg.loadout.extraBarrels : 0
    const shots = 1 + spread
    for (let i = 0; i < shots; i++) {
      const offset = shots === 1 ? 0 : (i - (shots - 1) / 2) * 0.12
      const a = angle + offset
      this.spawnShell(muzzle, a, from.stats.damage, from.stats.shellSpeed, fromPlayer)
    }
    this.spawnMuzzleFlash(muzzle)
  }

  private spawnShell(from: THREE.Vector3, angle: number, damage: number, speed: number, fromPlayer: boolean): void {
    const geo = new THREE.SphereGeometry(SHELL_RADIUS, 8, 8)
    const mat = new THREE.MeshBasicMaterial({ color: fromPlayer ? 0xffe066 : 0xff5533 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(from)
    mesh.position.y = 0.9
    this.scene.add(mesh)
    this.shells.push({
      mesh,
      vx: Math.sin(angle) * speed,
      vz: Math.cos(angle) * speed,
      damage,
      fromPlayer,
      life: SHELL_TTL,
    })
  }

  private updateShells(dt: number): void {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i]
      s.life -= dt
      s.mesh.position.x += s.vx * dt
      s.mesh.position.z += s.vz * dt
      let remove = s.life <= 0

      // Walls.
      const lim = this.arena.half - 0.2
      if (Math.abs(s.mesh.position.x) > lim || Math.abs(s.mesh.position.z) > lim) remove = true
      // Obstacles.
      if (!remove) {
        for (const o of this.arena.obstacles) {
          if (Math.hypot(s.mesh.position.x - o.x, s.mesh.position.z - o.z) < o.radius + SHELL_RADIUS) {
            remove = true
            break
          }
        }
      }

      if (!remove) {
        if (s.fromPlayer) {
          for (const e of this.enemies) {
            if (!e.alive) continue
            if (this.hitTest(s, e)) {
              this.damageEntity(e, s.damage)
              this.spawnExplosion(s.mesh.position.x, s.mesh.position.z, 1.2, 0xffaa33)
              remove = true
              break
            }
          }
        } else if (this.player.alive && this.hitTest(s, this.player)) {
          this.damagePlayer(s.damage)
          this.spawnExplosion(s.mesh.position.x, s.mesh.position.z, 1.2, 0xff5533)
          remove = true
        }
      }

      if (remove) {
        this.scene.remove(s.mesh)
        s.mesh.geometry.dispose()
        ;(s.mesh.material as THREE.Material).dispose()
        this.shells.splice(i, 1)
      }
    }
  }

  private hitTest(s: Shell, e: Entity): boolean {
    const dx = s.mesh.position.x - e.refs.group.position.x
    const dz = s.mesh.position.z - e.refs.group.position.z
    return Math.hypot(dx, dz) < e.radius + SHELL_RADIUS
  }

  // ---- damage / death ----

  private damageEntity(e: Entity, amount: number): void {
    if (!e.alive) return
    if (e.invulnerable) {
      // Show that the boss shrugs it off (visual only).
      this.spawnExplosion(e.refs.group.position.x, e.refs.group.position.z, 1.4, 0x66ccff)
      return
    }
    e.hp -= amount
    setHealthBar(e.refs, e.hp / e.maxHp)
    if (e.hp <= 0) this.killEntity(e, true)
    this.emitHud()
  }

  private killEntity(e: Entity, counts: boolean): void {
    e.alive = false
    this.spawnExplosion(e.refs.group.position.x, e.refs.group.position.z, 2.4, 0xff8800)
    this.scene.remove(e.refs.group)
    if (e === this.boss) {
      if (counts) this.finishBossDefeated()
      return
    }
    if (counts) this.guardsKilled++
    this.checkBattleEnd()
  }

  private damagePlayer(amount: number): void {
    const p = this.player
    if (!p.alive) return
    p.hp -= amount
    setHealthBar(p.refs, p.hp / p.maxHp)
    if (p.hp <= 0) {
      p.hp = 0
      p.alive = false
      this.spawnExplosion(p.refs.group.position.x, p.refs.group.position.z, 2.6, 0xff4444)
      this.scene.remove(p.refs.group)
      this.onPlayerDeath()
    }
    this.emitHud()
  }

  private onPlayerDeath(): void {
    if (this.finished) return
    this.finished = true
    if (this.cfg.kind === 'boss') {
      this.cfg.onOutcome({ type: 'needReading', guardsKilled: this.guardsKilled })
    } else {
      this.cfg.onOutcome({ type: 'battleLost' })
    }
  }

  private checkBattleEnd(): void {
    if (this.cfg.kind !== 'battle') return
    if (this.finished) return
    if (this.enemies.every((e) => !e.alive)) {
      this.finished = true
      this.cfg.onOutcome({ type: 'battleWon', tanksKilled: this.cfg.enemyCount })
    }
  }

  private finishBossDefeated(): void {
    if (this.finished) return
    this.finished = true
    this.cfg.onOutcome({ type: 'bossDefeated', guardsKilled: this.guardsKilled })
  }

  // ---- collisions ----

  private resolveCollisions(e: Entity): void {
    const pos = e.refs.group.position
    const lim = this.arena.half - e.radius
    pos.x = Math.max(-lim, Math.min(lim, pos.x))
    pos.z = Math.max(-lim, Math.min(lim, pos.z))
    for (const o of this.arena.obstacles) {
      const dx = pos.x - o.x
      const dz = pos.z - o.z
      const dist = Math.hypot(dx, dz)
      const min = o.radius + e.radius
      if (dist < min && dist > 0.0001) {
        pos.x = o.x + (dx / dist) * min
        pos.z = o.z + (dz / dist) * min
      }
    }
  }

  // ---- effects ----

  private spawnExplosion(x: number, z: number, radius: number, color: number): void {
    const geo = new THREE.SphereGeometry(radius, 12, 12)
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, 0.8, z)
    mesh.scale.setScalar(0.2)
    this.scene.add(mesh)
    this.effects.push({ mesh, life: 0, ttl: 0.4 })
  }

  private spawnMuzzleFlash(at: THREE.Vector3): void {
    const geo = new THREE.SphereGeometry(0.4, 8, 8)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.9 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(at)
    this.scene.add(mesh)
    this.effects.push({ mesh, life: 0, ttl: 0.12 })
  }

  private updateEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i]
      fx.life += dt
      const t = fx.life / fx.ttl
      fx.mesh.scale.setScalar(0.2 + t * 1.6)
      ;(fx.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - t))
      if (fx.life >= fx.ttl) {
        this.scene.remove(fx.mesh)
        fx.mesh.geometry.dispose()
        ;(fx.mesh.material as THREE.Material).dispose()
        this.effects.splice(i, 1)
      }
    }
  }

  private updateCamera(dt: number): void {
    const target = this.player.refs.group.position
    const desired = new THREE.Vector3(target.x, 22, target.z + 15)
    this.camera.position.lerp(desired, Math.min(1, dt * 4))
    this.camera.lookAt(target.x, 0, target.z - 2)
  }

  // ---- HUD ----

  private emitHud(): void {
    const enemiesLeft = this.enemies.filter((e) => e.alive && e !== this.boss).length
    const objective =
      this.cfg.kind === 'battle'
        ? `Destroy all tanks — ${enemiesLeft} left`
        : this.boss && this.boss.invulnerable
          ? this.allGuardsDead()
            ? 'The boss is too powerful — survive!'
            : `Clear the ${enemiesLeft} guards!`
          : 'Finish the weakened boss!'
    this.cfg.onHud({
      playerHp: Math.max(0, Math.round(this.player.hp)),
      playerMaxHp: Math.round(this.player.maxHp),
      enemiesLeft,
      objective,
      isBoss: this.cfg.kind === 'boss',
      bossHp: this.boss ? Math.max(0, Math.round(this.boss.hp)) : 0,
      bossMaxHp: this.boss ? Math.round(this.boss.maxHp) : 0,
      bossInvulnerable: this.boss?.invulnerable ?? false,
      powerWeapons: this.cfg.loadout.powerWeapons.map((w) => ({
        id: w.def.id,
        name: w.def.name,
        count: this.powerCounts[w.def.id] ?? 0,
      })),
    })
  }
}
