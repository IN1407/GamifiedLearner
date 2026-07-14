import { useEffect, useRef, useState } from 'react'
import { TankEngine, type Hud as HudData, type Outcome } from '../engine/TankEngine'
import { computeLoadout } from '../loadout'
import { useGameStore } from '../store'
import {
  BOSS_GUARDS,
  ENEMIES_PER_BATTLE,
  readingLevelForCheckpoint,
} from '../progression'
import { pickPassage } from '../passages'
import { tankUnlockedByCheckpoint } from '../tanks'
import HudOverlay from './Hud'
import ReadingChallenge from './ReadingChallenge'

type Phase = 'fighting' | 'reading' | 'battleLost' | 'battleWon' | 'bossWon'

/**
 * Hosts one live encounter: creates the Three.js engine, relays HUD + input,
 * and translates engine outcomes into store updates and the reading gate.
 */
export default function BattleView({
  kind,
  onDone,
}: {
  kind: 'battle' | 'boss'
  onDone: (result: 'won' | 'retreat') => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<TankEngine | null>(null)
  const guardsKilledRef = useRef(0)

  const [hud, setHud] = useState<HudData | null>(null)
  const [phase, setPhase] = useState<Phase>('fighting')
  const [attempt, setAttempt] = useState(0)
  const [readingAttempt, setReadingAttempt] = useState(0)

  // Checkpoint is fixed for the duration of this encounter.
  const [checkpoint] = useState(() => useGameStore.getState().checkpoint)

  // Create / recreate the engine when the battle (re)starts.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const state = useGameStore.getState()
    const loadout = computeLoadout(
      state.selectedTankId,
      state.upgrades[state.selectedTankId] ?? [],
      state.powerWeapons[state.selectedTankId] ?? {},
    )

    const engine = new TankEngine(container, {
      kind,
      checkpoint,
      loadout,
      enemyCount: ENEMIES_PER_BATTLE,
      guardCount: BOSS_GUARDS,
      seed: checkpoint * 101 + attempt * 17 + (kind === 'boss' ? 7 : 0),
      onHud: setHud,
      onOutcome: handleOutcome,
      onPowerWeaponUsed: (weaponId) =>
        useGameStore.getState().consumePowerWeapon(state.selectedTankId, weaponId),
    })
    engineRef.current = engine
    engine.start()
    return () => {
      engine.dispose()
      engineRef.current = null
    }
    // handleOutcome is intentionally stable via refs/setState; re-run only on retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, checkpoint, attempt])

  function handleOutcome(outcome: Outcome) {
    switch (outcome.type) {
      case 'battleWon':
        useGameStore.getState().completeBattle(outcome.tanksKilled)
        setPhase('battleWon')
        break
      case 'battleLost':
        setPhase('battleLost')
        break
      case 'needReading':
        guardsKilledRef.current = outcome.guardsKilled
        setPhase('reading')
        break
      case 'bossDefeated':
        useGameStore.getState().defeatBoss(outcome.guardsKilled)
        setPhase('bossWon')
        break
    }
  }

  const level = readingLevelForCheckpoint(checkpoint)
  const passage = pickPassage(level, checkpoint * 7 + readingAttempt)
  const unlockedTank = tankUnlockedByCheckpoint(checkpoint)

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-sky-200">
      <div ref={containerRef} className="absolute inset-0" />

      {hud && phase === 'fighting' && (
        <HudOverlay
          hud={hud}
          onUsePower={(id) => engineRef.current?.usePowerWeapon(id)}
          onMove={(v) => engineRef.current?.setMobileMove(v)}
          onFire={(on) => engineRef.current?.setMobileFire(on)}
        />
      )}

      {phase === 'reading' && (
        <ReadingChallenge
          passage={passage}
          onPass={() => {
            setPhase('fighting')
            engineRef.current?.reviveForSecondChance()
          }}
          onIncorrect={() => setReadingAttempt((a) => a + 1)}
        />
      )}

      {phase === 'battleWon' && (
        <ResultCard
          title="Victory! 🎉"
          tone="win"
          lines={['All enemy tanks destroyed.', 'Coins are awarded for every 5 tanks you beat.']}
          actions={[{ label: 'Continue →', onClick: () => onDone('won'), primary: true }]}
        />
      )}

      {phase === 'battleLost' && (
        <ResultCard
          title="Tank destroyed 💥"
          tone="lose"
          lines={['Regroup and give it another shot.']}
          actions={[
            {
              label: 'Try again',
              primary: true,
              onClick: () => {
                setPhase('fighting')
                setAttempt((a) => a + 1)
              },
            },
            { label: 'Retreat to base', onClick: () => onDone('retreat') },
          ]}
        />
      )}

      {phase === 'bossWon' && (
        <ResultCard
          title="BOSS DEFEATED! 🏆"
          tone="win"
          lines={[`You unlocked the ${unlockedTank.name} tank!`, '+10 coins earned.']}
          actions={[{ label: 'Claim reward →', onClick: () => onDone('won'), primary: true }]}
        />
      )}
    </div>
  )
}

function ResultCard({
  title,
  tone,
  lines,
  actions,
}: {
  title: string
  tone: 'win' | 'lose'
  lines: string[]
  actions: Array<{ label: string; onClick: () => void; primary?: boolean }>
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 text-center shadow-2xl ${
          tone === 'win' ? 'border-emerald-500/40 bg-slate-900' : 'border-red-500/40 bg-slate-900'
        }`}
      >
        <h2 className="text-2xl font-extrabold text-white">{title}</h2>
        <div className="mt-2 space-y-1">
          {lines.map((l) => (
            <p key={l} className="text-sm text-slate-300">
              {l}
            </p>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className={`rounded-2xl px-4 py-3 text-base font-bold transition ${
                a.primary
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'border border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
