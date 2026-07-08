/**
 * Renders the shareable "Level Up" card straight to a <canvas> from data we
 * already have — no screen capture APIs, no html2canvas. Returns a PNG blob.
 */
export interface ShareCardData {
  courseTitle: string
  moduleTitle: string
  level: number
  totalXp: number
  streakWeeks: number
}

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const W = 1200
  const H = 630
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#312e81')
  bg.addColorStop(0.55, '#4f46e5')
  bg.addColorStop(1, '#7c3aed')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Soft decorative circles
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#ffffff'
  for (const [x, y, r] of [
    [1050, 90, 160],
    [120, 540, 200],
    [1120, 520, 90],
  ] as const) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  const sans = (weight: number, size: number) =>
    `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

  // Brand
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = sans(700, 34)
  ctx.fillText('🎓 GamifiedLearner', 70, 92)

  // Headline
  ctx.fillStyle = '#ffffff'
  ctx.font = sans(800, 88)
  ctx.fillText('LEVEL UP!', 70, 220)

  // Module completed
  ctx.font = sans(600, 40)
  ctx.fillStyle = '#c7d2fe'
  const moduleLine = `Checkpoint cleared: ${data.moduleTitle}`
  ctx.fillText(truncate(ctx, moduleLine, W - 140), 70, 290)
  ctx.font = sans(500, 30)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(truncate(ctx, data.courseTitle, W - 140), 70, 340)

  // Stat tiles
  const stats: [string, string][] = [
    [`${data.level}`, 'LEVEL'],
    [`${data.totalXp.toLocaleString()}`, 'TOTAL XP'],
    [`${data.streakWeeks}w`, 'STREAK'],
  ]
  const tileW = 320
  const tileH = 150
  stats.forEach(([value, label], i) => {
    const x = 70 + i * (tileW + 30)
    const y = 400
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    roundRect(ctx, x, y, tileW, tileH, 24)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = sans(800, 60)
    ctx.fillText(value, x + 30, y + 82)
    ctx.font = sans(600, 24)
    ctx.fillStyle = '#c7d2fe'
    ctx.fillText(label, x + 30, y + 122)
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png')
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 3 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

/** Share via Web Share API when available, otherwise download the PNG. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'GamifiedLearner — Level Up!' })
      return 'shared'
    } catch {
      /* user cancelled or share failed — fall through to download */
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
