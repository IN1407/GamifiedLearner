/**
 * Persistent campaign state for the Tank Battle game. Kept entirely separate
 * from the learning platform's IndexedDB layer: this is self-contained game
 * progress and lives in localStorage via zustand's persist middleware.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  BATTLES_PER_CHECKPOINT,
  CHECKPOINT_COUNT,
  COINS_PER_BOSS,
  coinsForTankMilestones,
} from './progression'
import { STARTER_TANK_ID, tankUnlockedByCheckpoint } from './tanks'
import { findPowerWeapon, findUpgrade } from './addons'

export interface GameProgress {
  coins: number
  /** Current checkpoint segment the player is working through (0..29). */
  checkpoint: number
  /** Next normal battle to play within the segment (0..BATTLES_PER_CHECKPOINT). */
  battle: number
  /** Running total of normal tanks destroyed (drives coin milestones). */
  tanksDestroyed: number
  /** Number of checkpoint bosses fully defeated. */
  bossesDefeated: number
  unlockedTankIds: string[]
  selectedTankId: string
  /** Purchased permanent upgrades, per tank id. */
  upgrades: Record<string, string[]>
  /** Owned consumable power weapons: tankId -> weaponId -> count. */
  powerWeapons: Record<string, Record<string, number>>
}

interface GameActions {
  /** Record a cleared normal battle and the tanks destroyed in it. */
  completeBattle: (tanksKilled: number) => void
  /** Record a defeated checkpoint boss (with the guards cleared alongside it). */
  defeatBoss: (guardsKilled: number) => void
  selectTank: (tankId: string) => void
  buyUpgrade: (tankId: string, upgradeId: string) => boolean
  buyPowerWeapon: (tankId: string, weaponId: string, qty?: number) => boolean
  /** Spend one unit of a power weapon (called by the engine when it is fired). */
  consumePowerWeapon: (tankId: string, weaponId: string) => void
  ownsUpgrade: (tankId: string, upgradeId: string) => boolean
  resetCampaign: () => void
}

export type GameStore = GameProgress & GameActions

function initialProgress(): GameProgress {
  return {
    coins: 0,
    checkpoint: 0,
    battle: 0,
    tanksDestroyed: 0,
    bossesDefeated: 0,
    unlockedTankIds: [STARTER_TANK_ID],
    selectedTankId: STARTER_TANK_ID,
    upgrades: {},
    powerWeapons: {},
  }
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialProgress(),

      completeBattle: (tanksKilled: number) =>
        set((s) => {
          const kills = Math.max(0, Math.floor(tanksKilled))
          const newTotal = s.tanksDestroyed + kills
          return {
            tanksDestroyed: newTotal,
            coins: s.coins + coinsForTankMilestones(s.tanksDestroyed, newTotal),
            battle: Math.min(s.battle + 1, BATTLES_PER_CHECKPOINT),
          }
        }),

      defeatBoss: (guardsKilled: number) =>
        set((s) => {
          const kills = Math.max(0, Math.floor(guardsKilled))
          const newTotal = s.tanksDestroyed + kills
          const reward = coinsForTankMilestones(s.tanksDestroyed, newTotal) + COINS_PER_BOSS
          const unlocked = tankUnlockedByCheckpoint(s.checkpoint)
          const unlockedTankIds = s.unlockedTankIds.includes(unlocked.id)
            ? s.unlockedTankIds
            : [...s.unlockedTankIds, unlocked.id]
          const nextCheckpoint = Math.min(s.checkpoint + 1, CHECKPOINT_COUNT)
          return {
            tanksDestroyed: newTotal,
            coins: s.coins + reward,
            unlockedTankIds,
            bossesDefeated: Math.max(s.bossesDefeated, s.checkpoint + 1),
            checkpoint: nextCheckpoint,
            battle: 0,
          }
        }),

      selectTank: (tankId: string) =>
        set((s) => (s.unlockedTankIds.includes(tankId) ? { selectedTankId: tankId } : {})),

      buyUpgrade: (tankId: string, upgradeId: string) => {
        const s = get()
        const def = findUpgrade(tankId, upgradeId)
        if (!def) return false
        if ((s.upgrades[tankId] ?? []).includes(upgradeId)) return false
        if (s.coins < def.price) return false
        set({
          coins: s.coins - def.price,
          upgrades: { ...s.upgrades, [tankId]: [...(s.upgrades[tankId] ?? []), upgradeId] },
        })
        return true
      },

      buyPowerWeapon: (tankId: string, weaponId: string, qty = 1) => {
        const s = get()
        const def = findPowerWeapon(tankId, weaponId)
        if (!def || qty <= 0) return false
        const cost = def.price * qty
        if (s.coins < cost) return false
        const forTank = s.powerWeapons[tankId] ?? {}
        set({
          coins: s.coins - cost,
          powerWeapons: {
            ...s.powerWeapons,
            [tankId]: { ...forTank, [weaponId]: (forTank[weaponId] ?? 0) + qty },
          },
        })
        return true
      },

      consumePowerWeapon: (tankId: string, weaponId: string) =>
        set((s) => {
          const forTank = s.powerWeapons[tankId] ?? {}
          const have = forTank[weaponId] ?? 0
          if (have <= 0) return {}
          return {
            powerWeapons: {
              ...s.powerWeapons,
              [tankId]: { ...forTank, [weaponId]: have - 1 },
            },
          }
        }),

      ownsUpgrade: (tankId: string, upgradeId: string) =>
        (get().upgrades[tankId] ?? []).includes(upgradeId),

      resetCampaign: () => set({ ...initialProgress() }),
    }),
    {
      name: 'tank-battle-save-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only the progress fields, never the action functions.
      partialize: (s): GameProgress => ({
        coins: s.coins,
        checkpoint: s.checkpoint,
        battle: s.battle,
        tanksDestroyed: s.tanksDestroyed,
        bossesDefeated: s.bossesDefeated,
        unlockedTankIds: s.unlockedTankIds,
        selectedTankId: s.selectedTankId,
        upgrades: s.upgrades,
        powerWeapons: s.powerWeapons,
      }),
    },
  ),
)

/** True once every checkpoint boss has been defeated. */
export function isCampaignComplete(p: Pick<GameProgress, 'bossesDefeated'>): boolean {
  return p.bossesDefeated >= CHECKPOINT_COUNT
}

/** Power-weapon count owned for a tank/weapon pair. */
export function weaponCount(p: GameProgress, tankId: string, weaponId: string): number {
  return p.powerWeapons[tankId]?.[weaponId] ?? 0
}
