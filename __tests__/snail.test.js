import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

// makeTank: x1/y1 = 2, x2 = 177, y2 = 55 (FLOOR = 55)
const makeTank = () => ({ x1: 2, y1: 2, x2: 177, y2: 55 })
// makeFloorPlant: mock plant entity at a given x, rooted at FLOOR
const makeFloorPlant = (x = 50) => ({ type: 'plant', x, y: 55, swayAt: () => 0 })

function loadSnailCtx(fixedRandom = 0.5) {
  const m = Object.create(Math, {
    random: { value: () => fixedRandom, writable: true, enumerable: true, configurable: true },
  })
  const ctx = createContext({ Math: m, getSurfaceY: (_x, _y, _entities, floor) => floor })
  const run = (file) => {
    const code = readFileSync(file, 'utf8')
    runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  }
  run(join(__dir, '../src/js/behaviors/feeding.js'))
  run(join(__dir, '../src/js/behaviors/nudge.js'))
  run(join(__dir, '../src/js/behaviors/cursor.js'))
  run(join(__dir, '../src/js/entities/snail.js'))
  return ctx
}

describe('snail — plant detection at floor level', () => {
  test('snail at floor level detects plant and starts climbing toward goalY', () => {
    // REGRESSION: findPlantAt used `s.y < FLOOR` (strict), so a snail standing
    // exactly on the floor at a plant's base couldn't detect it and never climbed.
    // fixedRandom = 0.5 keeps it above the 0.0006 detach-from-plant roll.
    const ctx = loadSnailCtx(0.5)
    const tank = makeTank() // FLOOR = 55
    const s = ctx.createSnail(tank, 50, 55) // y = FLOOR
    const plant = makeFloorPlant(50)
    s.idle = 0
    s.target = null
    s.goalX = 50
    s.goalY = 50 // above floor
    const entities = [s, plant]
    s.update(0.1, entities)
    // Snail should detect plant and move upward (vy < 0)
    expect(s.vy).toBeLessThan(0)
    expect(s.y).toBeLessThan(55)
    expect(s.plant).toBe(plant)
  })

  test('snail above floor (y < FLOOR) also detects plant when climbing', () => {
    // Verify existing behaviour still works after the fix.
    const ctx = loadSnailCtx(0.5)
    const tank = makeTank()
    const s = ctx.createSnail(tank, 50, 52) // above floor
    const plant = makeFloorPlant(50)
    s.idle = 0
    s.target = null
    s.goalX = 50
    s.goalY = 48
    const entities = [s, plant]
    s.update(0.1, entities)
    expect(s.vy).toBeLessThan(0) // still climbing
  })

  test('plant too far away (>2 x-units) is not detected', () => {
    const ctx = loadSnailCtx(0.5)
    const tank = makeTank()
    const s = ctx.createSnail(tank, 50, 55)
    const plant = makeFloorPlant(90) // x diff = 40 — beyond ±2 threshold
    s.idle = 0
    s.target = null
    s.goalX = 48 // move along the floor instead
    s.goalY = undefined
    const entities = [s, plant]
    s.update(0.1, entities)
    // No plant detected — snail moves along the floor toward goalX, not climbing
    expect(s.vy).toBe(0)
    expect(s.vx).not.toBe(0)
  })

  test('snail just above the FLOOR-20 climb ceiling still detects the plant', () => {
    // Sanity check on the lower bound (s.y >= FLOOR - 20), untouched by this fix.
    const ctx = loadSnailCtx(0.5)
    const tank = makeTank() // FLOOR = 55, so FLOOR - 20 = 35
    const s = ctx.createSnail(tank, 50, 35)
    const plant = makeFloorPlant(50)
    s.idle = 0
    s.target = null
    s.goalX = 50
    s.goalY = 30
    const entities = [s, plant]
    s.update(0.1, entities)
    expect(s.vy).toBeLessThan(0)
    expect(s.plant).toBe(plant)
  })
})
