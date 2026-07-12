// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderShareCard, shareOrDownload } from './shareCard'

// jsdom has no real canvas; stub getContext with a recording 2D context so we
// can assert the card is drawn from data (text + tiles) and exports a PNG.
function installCanvasStub() {
  const calls: string[] = []
  const ctx: Record<string, unknown> = {
    fillStyle: '',
    font: '',
    globalAlpha: 1,
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => calls.push('fillRect'),
    beginPath: () => {},
    arc: () => {},
    fill: () => calls.push('fill'),
    fillText: (t: string) => calls.push(`text:${t}`),
    measureText: (t: string) => ({ width: t.length * 8 }),
    moveTo: () => {},
    arcTo: () => {},
    closePath: () => {},
  }
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never
  HTMLCanvasElement.prototype.toBlob = function (cb: (b: Blob | null) => void) {
    cb(new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }))
  } as never
  return calls
}

const data = {
  courseTitle: 'Python for AI & Backend',
  moduleTitle: 'Python Fundamentals',
  level: 4,
  totalXp: 1234,
  streakWeeks: 3,
}

describe('renderShareCard', () => {
  let calls: string[]
  beforeEach(() => {
    calls = installCanvasStub()
  })

  it('returns a PNG blob', async () => {
    const blob = await renderShareCard(data)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('draws the real stats onto the card (not placeholders)', async () => {
    await renderShareCard(data)
    const text = calls.filter((c) => c.startsWith('text:')).join('|')
    expect(text).toContain('LEVEL UP!')
    expect(text).toContain('Python Fundamentals')
    expect(text).toContain('4') // level
    expect(text).toContain('1,234') // xp formatted
    expect(text).toContain('3w') // streak
  })

  it('draws the earned status badge when provided', async () => {
    await renderShareCard({ ...data, statusTitle: 'Neural Architect', statusIcon: '🏗️' })
    const text = calls.filter((c) => c.startsWith('text:')).join('|')
    expect(text).toContain('Neural Architect')
    expect(text).toContain('STATUS UNLOCKED')
  })

  it('omits the status badge when no status is earned', async () => {
    await renderShareCard(data)
    const text = calls.filter((c) => c.startsWith('text:')).join('|')
    expect(text).not.toContain('STATUS UNLOCKED')
  })

  it('rejects if canvas export fails', async () => {
    HTMLCanvasElement.prototype.toBlob = function (cb: (b: Blob | null) => void) {
      cb(null)
    } as never
    await expect(renderShareCard(data)).rejects.toThrow(/export failed/i)
  })
})

describe('shareOrDownload', () => {
  it('falls back to a download when Web Share is unavailable', async () => {
    // @ts-expect-error force the fallback path
    navigator.canShare = undefined
    const clicked: string[] = []
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag) as HTMLElement
      if (tag === 'a') {
        el.click = () => clicked.push((el as HTMLAnchorElement).download)
      }
      return el
    })
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
    globalThis.URL.revokeObjectURL = vi.fn()

    const result = await shareOrDownload(new Blob(['x'], { type: 'image/png' }), 'card.png')
    expect(result).toBe('downloaded')
    expect(clicked).toContain('card.png')
    vi.restoreAllMocks()
  })
})
