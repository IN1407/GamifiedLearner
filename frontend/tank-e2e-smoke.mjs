// Browser smoke test for the Tank Battle game. Drives the real app in Chromium
// (software WebGL) to prove the 3D engine mounts, a normal battle runs, and the
// boss death -> reading challenge -> revive learning loop works end to end.
//
// Usage: start the dev server (npm run dev) then `node tank-e2e-smoke.mjs`.
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const SHOTS = process.env.SHOT_DIR || '/tmp'
const results = []
const check = (name, cond) => {
  results.push({ name, ok: !!cond })
  console.log(`${cond ? '✅' : '❌'} ${name}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({
  executablePath,
  // SwiftShader gives a WebGL context in headless CI where there is no GPU.
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
  ],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

try {
  // ---- Campaign menu renders without course onboarding ----
  await page.goto(BASE + '/tank', { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Tank Battle Campaign/ }).waitFor({ timeout: 15000 })
  check('tank menu renders (onboarding-exempt)', true)
  check('shows the 30-checkpoint track', (await page.getByTitle('Checkpoint 1').count()) > 0)

  // ---- Start a normal battle; engine + HUD must mount ----
  await page.getByRole('button', { name: /Start Battle 1/ }).click()
  await page.locator('canvas').waitFor({ timeout: 15000 })
  check('battle mounts a WebGL canvas', (await page.locator('canvas').count()) > 0)
  await page.getByText(/Destroy all tanks/).waitFor({ timeout: 10000 })
  check('HUD objective shows for a normal battle', true)
  check('HUD shows the hull health bar', (await page.getByText('🛡️ HULL').count()) > 0)

  // Fire and move a little to exercise the shell/collision path.
  const box = await page.locator('canvas').boundingBox()
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(box.x + box.width / 2 + (i % 3) * 40, box.y + box.height / 2 - 120)
    await page.mouse.down()
    await page.keyboard.down('w')
    await sleep(150)
    await page.mouse.up()
    await page.keyboard.up('w')
  }
  await page.screenshot({ path: `${SHOTS}/tank-battle.png` })
  check('no errors during normal battle', errors.length === 0)

  // ---- Boss learning loop: seed a boss-ready save, face the boss, die, read ----
  await page.evaluate(() => {
    const save = {
      state: {
        coins: 20,
        checkpoint: 0,
        battle: 10, // all normal battles cleared -> boss ready
        tanksDestroyed: 30,
        bossesDefeated: 0,
        unlockedTankIds: ['starter'],
        selectedTankId: 'starter',
        upgrades: {},
        powerWeapons: {},
      },
      version: 1,
    }
    localStorage.setItem('tank-battle-save-v1', JSON.stringify(save))
  })
  await page.goto(BASE + '/tank', { waitUntil: 'networkidle' })
  const bossBtn = page.getByRole('button', { name: /Face the Checkpoint 1 Boss/ })
  await bossBtn.waitFor({ timeout: 10000 })
  check('boss button appears once battles are cleared', true)
  await bossBtn.click()
  await page.locator('canvas').waitFor({ timeout: 15000 })

  // Stay idle; guards + invulnerable boss destroy the idle player -> reading gate.
  const reading = page.getByText(/Read to earn a second chance/)
  await reading.waitFor({ timeout: 30000 })
  check('boss death triggers the reading challenge', true)

  // Checkpoint 0's first passage is deterministic ("The Sleepy Cat"); answer it.
  await page.locator('fieldset').first().waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: 'Grey' }).click()
  await page.getByRole('button', { name: 'In the sun' }).click()
  await page.getByRole('button', { name: /Check my answers/ }).click()

  await reading.waitFor({ state: 'detached', timeout: 8000 })
  check('correct answers grant the second chance (reading closes)', true)
  await page.getByText(/Finish the weakened boss/).waitFor({ timeout: 8000 })
  check('second-chance boss is now defeatable', true)
  await page.screenshot({ path: `${SHOTS}/tank-boss-revive.png` })

  await browser.close()
} catch (e) {
  check(`no exception during flow (${String(e).slice(0, 200)})`, false)
  await page.screenshot({ path: `${SHOTS}/tank-failure.png` }).catch(() => {})
  await browser.close()
}

check('no uncaught page errors', errors.length === 0)
if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 8))

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
