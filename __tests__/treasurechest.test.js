import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadEntity(file, fixedRandom) {
  const m = fixedRandom !== undefined
    ? Object.create(Math, { random: { value: () => fixedRandom, writable: true, enumerable: true, configurable: true } })
    : Math
  const ctx = createContext({ Math: m })
  const code = readFileSync(join(__dir, '../src/js/entities', file), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

const makeTank = () => ({ x1: 2, y1: 2, x2: 177, y2: 55 })

describe('createTreasureChest', () => {
  test('type is treasure-chest', () => {
    const ctx = loadEntity('treasurechest.js', 0.5)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    expect(chest.type).toBe('treasure-chest')
  })

  test('anchored at tank floor', () => {
    const ctx = loadEntity('treasurechest.js', 0.5)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    expect(chest.y).toBe(tank.y2)
  })

  test('does not emit bubble while dragged', () => {
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    chest.dragged = true
    // Force build timer to overflow
    chest._buildTimer = 999
    const entities = []
    chest.update(10, entities)
    expect(entities.length).toBe(0)
  })

  test('does not emit during build-up phase', () => {
    const ctx = loadEntity('treasurechest.js', 0.5)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    // Advance timer but not past buildNext (min is 4s)
    const entities = []
    chest.update(1, entities)
    chest.update(1, entities)
    expect(entities.length).toBe(0)
  })

  test('emits a burst of bubbles when build timer fires', () => {
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    // random=0 → buildNext = 4, burstRemain = 3, burstInterval = 0.12
    // Force build timer to trigger
    chest._buildTimer = chest._buildNext - 0.01
    const entities = []
    chest.update(0.05, entities) // triggers burst, primes _burstTimer = _burstInterval
    chest.update(0.15, entities) // fires first bubble
    chest.update(0.15, entities) // fires second
    chest.update(0.15, entities) // fires third (random=0 → burstRemain=3)
    expect(entities.length).toBe(3)
    expect(entities.every(e => e.type === 'bubble')).toBe(true)
  })

  test('burst resets and build timer restarts after burst completes', () => {
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    chest._buildTimer = chest._buildNext - 0.01
    const entities = []
    chest.update(0.05, entities) // trigger burst
    // Drain the full burst (burstRemain = 3 when random=0)
    for (let i = 0; i < 10; i++) chest.update(0.25, entities)
    expect(chest._burstRemain).toBe(0)
    expect(chest._buildTimer).toBeGreaterThanOrEqual(0)
    expect(chest._buildTimer).toBeLessThan(chest._buildNext)
  })

  test('bubbles have the small or medium pixel offsets from BUBBLE_SIZES', () => {
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    chest._buildTimer = chest._buildNext - 0.01
    const entities = []
    chest.update(0.05, entities)
    for (let i = 0; i < 10; i++) chest.update(0.25, entities)
    // Every bubble should have an offsets array with 4 or 5 entries (small or medium)
    for (const e of entities) {
      expect(e.offsets).toBeDefined()
      expect([4, 5]).toContain(e.offsets.length)
    }
  })

  test('bubbles rise over time', () => {
    const ctx = loadEntity('treasurechest.js', 0.5)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    chest._buildTimer = chest._buildNext - 0.01
    const entities = []
    chest.update(0.05, entities) // trigger burst
    chest.update(0.25, entities) // fire first bubble
    expect(entities.length).toBeGreaterThan(0)
    const bubble = entities[0]
    const startY = bubble.y
    bubble.update(0.1)
    expect(bubble.y).toBeLessThan(startY)
  })

  test('bubble expires when it reaches the surface', () => {
    const ctx = loadEntity('treasurechest.js', 0.5)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    chest._buildTimer = chest._buildNext - 0.01
    const entities = []
    chest.update(0.05, entities)
    chest.update(0.25, entities)
    const bubble = entities[0]
    bubble.y = tank.y1 + 1
    bubble.update(1)
    expect(bubble.eaten).toBe(true)
  })

  test('default intensity is 1.0', () => {
    const ctx = loadEntity('treasurechest.js', 0.5)
    const chest = ctx.createTreasureChest(makeTank(), 90)
    expect(chest.intensity).toBe(1.0)
  })

  test('higher intensity produces shorter build intervals', () => {
    // At intensity 2.0 the formula divides _buildNext by 2, so intervals are shorter on average.
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chestFast = ctx.createTreasureChest(tank, 90)
    chestFast.intensity = 2.0
    const chestSlow = ctx.createTreasureChest(tank, 90)
    chestSlow.intensity = 0.5

    const avgBuildNext = (chest) => {
      const vals = []
      for (let i = 0; i < 20; i++) {
        chest._buildTimer = chest._buildNext - 0.001
        chest.update(0.01, [])
        vals.push(chest._buildNext)
        chest._burstRemain = 0
        chest._buildTimer = 0
      }
      return vals.reduce((a, v) => a + v, 0) / vals.length
    }

    expect(avgBuildNext(chestFast)).toBeLessThan(avgBuildNext(chestSlow))
  })

  test('higher intensity produces more bubbles per burst', () => {
    // At intensity 2.0, _burstRemain is multiplied by 2, so each burst is bigger.
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chestFast = ctx.createTreasureChest(tank, 90)
    chestFast.intensity = 2.0
    chestFast._buildTimer = chestFast._buildNext - 0.001
    chestFast.update(0.01, [])
    const fastBurst = chestFast._burstRemain

    const chestSlow = ctx.createTreasureChest(tank, 90)
    chestSlow.intensity = 0.5
    chestSlow._buildTimer = chestSlow._buildNext - 0.001
    chestSlow.update(0.01, [])
    const slowBurst = chestSlow._burstRemain

    expect(fastBurst).toBeGreaterThan(slowBurst)
  })
})
