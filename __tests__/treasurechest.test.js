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
    // Advance timer well under the 20–30 s minimum
    const entities = []
    chest.update(5, entities)
    chest.update(5, entities)
    expect(entities.length).toBe(0)
  })

  test('emits a burst of bubbles when build timer fires', () => {
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    // random=0 → buildNext = 20, burstRemain = 3, burstInterval = 0.12
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

  test('bubbles are single-pixel dual-sine style matching bubbler-rock', () => {
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    chest._buildTimer = chest._buildNext - 0.01
    const entities = []
    chest.update(0.05, entities)
    for (let i = 0; i < 10; i++) chest.update(0.25, entities)
    // Bubbles should use dual-sine drift (phase2 property) and no offsets array
    for (const e of entities) {
      expect(e.phase2).toBeDefined()
      expect(e.offsets).toBeUndefined()
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

  test('lid opens when burst starts and closes when burst ends', () => {
    const ctx = loadEntity('treasurechest.js', 0)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    expect(chest._lidLift).toBe(0)
    // Trigger a burst
    chest._buildTimer = chest._buildNext - 0.01
    chest.update(0.05, [])
    expect(chest._lidTarget).toBe(3)
    // Let lid animate open (8px/s → fully open in 0.375 s)
    chest.update(0.4, [])
    expect(chest._lidLift).toBeCloseTo(3, 1)
    // Drain the burst manually and check lid closes
    chest._burstRemain = 1
    const entities = []
    chest._burstTimer = chest._burstInterval
    chest.update(0.01, entities) // fires last bubble, sets _lidTarget = 0
    expect(chest._lidTarget).toBe(0)
    chest.update(0.5, []) // lid animates closed
    expect(chest._lidLift).toBeCloseTo(0, 1)
  })

  test('startPanic called on nearby entity when burst fires', () => {
    const m = Object.create(Math, { random: { value: () => 0, writable: true, enumerable: true, configurable: true } })
    let panicCalled = false
    const ctx = createContext({
      Math: m,
      startPanic: () => { panicCalled = true; },
    })
    const code = readFileSync(join(__dir, '../src/js/entities/treasurechest.js'), 'utf8')
    runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    chest._buildTimer = chest._buildNext - 0.01
    // Nearby entity with a panic property within range 15
    const fish = { type: 'fish', x: 95, y: tank.y2, panic: 0 }
    chest.update(0.05, [chest, fish])
    expect(panicCalled).toBe(true)
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

  test('hitHalfWidth/hitHeight cover every pixel actually drawn, lid open or closed', () => {
    // REGRESSION: the drag hit-test used a fixed 3px radius from the chest's base
    // point — the chest is 10px wide, so most of its body and lid were unclickable.
    const ctx = loadEntity('treasurechest.js', 0.5)
    const tank = makeTank()
    const chest = ctx.createTreasureChest(tank, 90)
    const pixels = []
    const mockCtx = { fillStyle: '', fillRect: (x, y) => pixels.push({ x, y }) }
    chest.draw(mockCtx)
    chest._lidLift = chest._lidTarget = 3 // lid fully open
    chest.draw(mockCtx)
    expect(pixels.length).toBeGreaterThan(0)
    for (const px of pixels) {
      expect(Math.abs(px.x - Math.round(chest.x))).toBeLessThanOrEqual(chest.hitHalfWidth)
      expect(tank.y2 - px.y).toBeLessThanOrEqual(chest.hitHeight)
    }
  })
})
