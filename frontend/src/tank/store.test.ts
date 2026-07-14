import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore, isCampaignComplete, weaponCount } from './store'
import { getAddons } from './addons'
import { tankUnlockedByCheckpoint } from './tanks'
import { CHECKPOINT_COUNT } from './progression'

const store = () => useGameStore.getState()

describe('game store', () => {
  beforeEach(() => {
    store().resetCampaign()
  })

  it('starts with only the starter tank and no coins', () => {
    const s = store()
    expect(s.coins).toBe(0)
    expect(s.unlockedTankIds).toEqual([s.selectedTankId])
    expect(s.checkpoint).toBe(0)
  })

  it('awards one coin per five tanks across battles', () => {
    store().completeBattle(3) // total 3
    expect(store().coins).toBe(0)
    store().completeBattle(3) // total 6 -> 1 coin
    expect(store().coins).toBe(1)
    expect(store().battle).toBe(2)
  })

  it('unlocks the checkpoint tank and advances on boss defeat', () => {
    const before = store().checkpoint
    const unlocked = tankUnlockedByCheckpoint(before)
    store().defeatBoss(3)
    const s = store()
    expect(s.coins).toBeGreaterThanOrEqual(10) // boss bonus
    expect(s.unlockedTankIds).toContain(unlocked.id)
    expect(s.checkpoint).toBe(before + 1)
    expect(s.battle).toBe(0)
    expect(s.bossesDefeated).toBe(1)
  })

  it('lets the player buy an affordable upgrade and blocks unaffordable ones', () => {
    const tankId = store().selectedTankId
    const upgrade = getAddons(tankId).upgrades[0]
    // Not enough coins yet.
    expect(store().buyUpgrade(tankId, upgrade.id)).toBe(false)
    // Grant coins via battles then buy.
    useGameStore.setState({ coins: 100 })
    expect(store().buyUpgrade(tankId, upgrade.id)).toBe(true)
    expect(store().ownsUpgrade(tankId, upgrade.id)).toBe(true)
    expect(store().coins).toBe(100 - upgrade.price)
    // Cannot buy the same upgrade twice.
    expect(store().buyUpgrade(tankId, upgrade.id)).toBe(false)
  })

  it('buys and consumes power weapons', () => {
    const tankId = store().selectedTankId
    const weapon = getAddons(tankId).powerWeapons[0]
    useGameStore.setState({ coins: 100 })
    expect(store().buyPowerWeapon(tankId, weapon.id, 2)).toBe(true)
    expect(weaponCount(store(), tankId, weapon.id)).toBe(2)
    store().consumePowerWeapon(tankId, weapon.id)
    expect(weaponCount(store(), tankId, weapon.id)).toBe(1)
  })

  it('cannot select a locked tank', () => {
    const locked = tankUnlockedByCheckpoint(0).id
    store().selectTank(locked)
    expect(store().selectedTankId).not.toBe(locked)
  })

  it('reports campaign completion after all checkpoints', () => {
    for (let cp = 0; cp < CHECKPOINT_COUNT; cp++) store().defeatBoss(0)
    expect(isCampaignComplete(store())).toBe(true)
    expect(store().checkpoint).toBe(CHECKPOINT_COUNT)
  })
})
