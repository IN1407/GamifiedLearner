import { useRef, useState } from 'react'
import type { Hud as HudData } from '../engine/TankEngine'

/** In-battle heads-up display overlay. Purely presentational + input relay. */
export default function Hud({
  hud,
  onUsePower,
  onMove,
  onFire,
}: {
  hud: HudData
  onUsePower: (id: string) => void
  onMove: (v: { x: number; z: number } | null) => void
  onFire: (on: boolean) => void
}) {
  const playerFrac = hud.playerMaxHp > 0 ? hud.playerHp / hud.playerMaxHp : 0
  const bossFrac = hud.bossMaxHp > 0 ? hud.bossHp / hud.bossMaxHp : 0

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* Objective banner */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-950/70 px-4 py-1.5 text-center text-sm font-semibold text-white shadow">
        {hud.objective}
      </div>

      {/* Boss health */}
      {hud.isBoss && (
        <div className="absolute left-1/2 top-12 w-[min(90vw,520px)] -translate-x-1/2">
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-white">
            <span>👹 BOSS</span>
            <span>{hud.bossInvulnerable ? 'INVULNERABLE' : `${hud.bossHp}/${hud.bossMaxHp}`}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-900/80 ring-1 ring-white/20">
            <div
              className={`h-full transition-[width] duration-150 ${
                hud.bossInvulnerable ? 'bg-sky-400/70' : 'bg-red-500'
              }`}
              style={{ width: `${hud.bossInvulnerable ? 100 : Math.round(bossFrac * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Player health */}
      <div className="absolute bottom-4 left-4 w-56">
        <div className="mb-1 flex justify-between text-xs font-bold text-white">
          <span>🛡️ HULL</span>
          <span>
            {hud.playerHp}/{hud.playerMaxHp}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-900/80 ring-1 ring-white/20">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-150"
            style={{ width: `${Math.round(playerFrac * 100)}%` }}
          />
        </div>
      </div>

      {/* Power weapons */}
      {hud.powerWeapons.length > 0 && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {hud.powerWeapons.map((w, i) => (
            <button
              key={w.id}
              type="button"
              disabled={w.count <= 0}
              onClick={() => onUsePower(w.id)}
              className="rounded-2xl border border-amber-400/50 bg-slate-900/80 px-3 py-2 text-xs font-bold text-amber-200 shadow disabled:opacity-30"
              title={`${w.name} — press ${i + 1}`}
            >
              💣 {w.name}
              <span className="ml-1 rounded bg-amber-400/20 px-1">{w.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Touch controls (helpful on tablets; harmless with mouse/keyboard). */}
      <Joystick onMove={onMove} />
      <button
        type="button"
        className="pointer-events-auto absolute bottom-24 right-6 h-20 w-20 rounded-full bg-red-600/80 text-lg font-black text-white shadow-lg active:bg-red-500 sm:hidden"
        onPointerDown={(e) => {
          e.preventDefault()
          onFire(true)
        }}
        onPointerUp={() => onFire(false)}
        onPointerLeave={() => onFire(false)}
      >
        FIRE
      </button>
    </div>
  )
}

/** Minimal drag joystick for touch play. Hidden on desktop (sm+). */
function Joystick({ onMove }: { onMove: (v: { x: number; z: number } | null) => void }) {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  function handle(e: React.PointerEvent) {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const max = rect.width / 2
    const len = Math.hypot(dx, dy) || 1
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    setKnob({ x: dx, y: dy })
    // Screen down (+y) maps to world +z (toward camera); screen up maps to -z.
    onMove({ x: dx / max, z: dy / max })
  }

  function end() {
    setKnob({ x: 0, y: 0 })
    onMove(null)
  }

  return (
    <div
      ref={baseRef}
      className="pointer-events-auto absolute bottom-20 left-6 h-28 w-28 touch-none rounded-full bg-slate-900/50 ring-1 ring-white/20 sm:hidden"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        handle(e)
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0 || e.pointerType === 'touch') handle(e)
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-slate-200/80"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  )
}
