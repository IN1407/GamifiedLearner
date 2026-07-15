/**
 * Procedurally-generated, tileable cartoony textures for the arena. Drawn on a
 * 2D canvas at runtime and wrapped in THREE.CanvasTexture, so the game still
 * ships with ZERO external image assets — no downloads, no licensing, tiny
 * footprint — while giving the ground and rocks a hand-painted, low-poly look
 * that matches the flat-shaded tanks.
 *
 * Textures are generated once and cached at module scope so every arena reuses
 * the same GPU upload.
 */
import * as THREE from 'three'

const SIZE = 256

/** Local deterministic PRNG so textures are reproducible (kept independent of meshes). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let grassTex: THREE.Texture | null = null
let rockTex: THREE.Texture | null = null

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  return { canvas, ctx }
}

/** Draw a splat and its wrapped copies so the texture tiles seamlessly. */
function wrappedSplat(x: number, y: number, draw: (dx: number, dy: number) => void): void {
  for (const ox of [-SIZE, 0, SIZE]) {
    for (const oy of [-SIZE, 0, SIZE]) {
      // Only bother with copies near the edges.
      if (ox !== 0 && x + ox < -SIZE * 0.5) continue
      draw(x + ox, y + oy)
    }
  }
}

/** Cartoony grass: saturated green base with soft clumps and short blades. */
export function grassTexture(): THREE.Texture {
  if (grassTex) return grassTex
  const made = makeCanvas()
  if (!made) {
    grassTex = new THREE.Texture()
    return grassTex
  }
  const { canvas, ctx } = made
  const rng = mulberry32(1337)

  // Base gradient so it doesn't look perfectly flat.
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE)
  g.addColorStop(0, '#4c7d3f')
  g.addColorStop(1, '#437036')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Soft clumps of lighter / darker grass.
  const clumps = ['#5b9147', '#3e6a31', '#67a052', '#3a6330']
  for (let i = 0; i < 90; i++) {
    const x = rng() * SIZE
    const y = rng() * SIZE
    const r = 10 + rng() * 26
    const color = clumps[(rng() * clumps.length) | 0]
    wrappedSplat(x, y, (dx, dy) => {
      ctx.globalAlpha = 0.18 + rng() * 0.12
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(dx, dy, r, r * (0.7 + rng() * 0.4), rng() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  ctx.globalAlpha = 1

  // Short blade strokes for a painted feel.
  for (let i = 0; i < 520; i++) {
    const x = rng() * SIZE
    const y = rng() * SIZE
    const len = 3 + rng() * 5
    const lean = (rng() - 0.5) * 3
    ctx.strokeStyle = rng() > 0.5 ? 'rgba(120,175,90,0.55)' : 'rgba(48,86,38,0.5)'
    ctx.lineWidth = 1
    wrappedSplat(x, y, (dx, dy) => {
      ctx.beginPath()
      ctx.moveTo(dx, dy)
      ctx.lineTo(dx + lean, dy - len)
      ctx.stroke()
    })
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  tex.colorSpace = THREE.SRGBColorSpace
  grassTex = tex
  return tex
}

/** Cartoony rock: rounded stone cells with dark cel outlines and top highlights. */
export function rockTexture(): THREE.Texture {
  if (rockTex) return rockTex
  const made = makeCanvas()
  if (!made) {
    rockTex = new THREE.Texture()
    return rockTex
  }
  const { canvas, ctx } = made
  const rng = mulberry32(9001)

  ctx.fillStyle = '#7b8290'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Scatter pebble-like stone cells on a loose grid for even coverage.
  const cell = 42
  for (let gx = -1; gx <= SIZE / cell; gx++) {
    for (let gy = -1; gy <= SIZE / cell; gy++) {
      const cx = gx * cell + cell * (0.3 + rng() * 0.4)
      const cy = gy * cell + cell * (0.3 + rng() * 0.4)
      const r = cell * (0.35 + rng() * 0.25)
      const shade = 90 + ((rng() * 60) | 0)
      wrappedSplat(cx, cy, (dx, dy) => {
        // Body.
        ctx.fillStyle = `rgb(${shade},${shade + 6},${shade + 14})`
        ctx.beginPath()
        ctx.ellipse(dx, dy, r, r * (0.8 + rng() * 0.3), rng() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
        // Dark cel outline.
        ctx.strokeStyle = 'rgba(40,44,52,0.55)'
        ctx.lineWidth = 2
        ctx.stroke()
        // Top-left highlight.
        ctx.fillStyle = 'rgba(210,216,226,0.35)'
        ctx.beginPath()
        ctx.ellipse(dx - r * 0.3, dy - r * 0.35, r * 0.4, r * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }

  // A few dark cracks.
  ctx.strokeStyle = 'rgba(35,38,45,0.5)'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 10; i++) {
    let x = rng() * SIZE
    let y = rng() * SIZE
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let s = 0; s < 5; s++) {
      x += (rng() - 0.5) * 30
      y += (rng() - 0.5) * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  tex.colorSpace = THREE.SRGBColorSpace
  rockTex = tex
  return tex
}
