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

function loadShrimpCtx(fixedRandom = 0) {
  const m = Object.create(Math, {
    random: { value: () => fixedRandom, writable: true, enumerable: true, configurable: true },
  })
  const ctx = createContext({ Math: m, getSurfaceY: (_x, _y, _entities, floor) => floor })
  const run = (file) => {
    const code = readFileSync(file, 'utf8')
    runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  }
  run(join(__dir, '../src/js/behaviors/feeding.js'))
  run(join(__dir, '../src/js/behaviors/panic.js'))
  run(join(__dir, '../src/js/behaviors/nudge.js'))
  run(join(__dir, '../src/js/behaviors/cursor.js'))
  run(join(__dir, '../src/js/entities/shrimp.js'))
  return ctx
}

describe('shrimp — plant detection at floor level', () => {
  test('shrimp at floor level detects plant and starts climbing toward goalY', () => {
    // REGRESSION: findPlantAt used `sh.y < FLOOR` (strict), so a shrimp standing
    // exactly on the floor at a plant's base couldn't detect it and never climbed.
    const ctx = loadShrimpCtx(0)
    const tank = makeTank() // FLOOR = 55
    const sh = ctx.createShrimp(tank, 50, 55) // y = FLOOR
    const plant = makeFloorPlant(50)
    sh.idle = 0
    sh.panic = 0
    sh.perched = false
    sh.target = null
    sh.goalX = 50
    sh.goalY = 50 // above floor
    const entities = [sh, plant]
    sh.update(0.1, entities)
    // Shrimp should detect plant and move upward (vy < 0)
    expect(sh.vy).toBeLessThan(0)
    expect(sh.y).toBeLessThan(55)
  })

  test('shrimp at floor base of plant perches immediately when no goal is set', () => {
    // REGRESSION: same `sh.y < FLOOR` bug prevented immediate perching when
    // idle expired with the shrimp already at the plant base.
    const ctx = loadShrimpCtx(0)
    const tank = makeTank()
    const sh = ctx.createShrimp(tank, 50, 55)
    const plant = makeFloorPlant(50)
    sh.idle = 0
    sh.panic = 0
    sh.perched = false
    sh.target = null
    sh.goalX = undefined
    sh.goalY = undefined
    const entities = [sh, plant]
    sh.update(0.1, entities)
    expect(sh.perched).toBe(true)
    expect(sh.plant).toBe(plant)
  })

  test('shrimp above floor (y < FLOOR) also detects plant when climbing', () => {
    // Verify existing behaviour still works after the fix.
    const ctx = loadShrimpCtx(0)
    const tank = makeTank()
    const sh = ctx.createShrimp(tank, 50, 52) // above floor
    const plant = makeFloorPlant(50)
    sh.idle = 0
    sh.panic = 0
    sh.perched = false
    sh.target = null
    sh.goalX = 50
    sh.goalY = 48
    const entities = [sh, plant]
    sh.update(0.1, entities)
    expect(sh.vy).toBeLessThan(0) // still climbing
  })

  test('plant too far away (>2 x-units) is not detected', () => {
    const ctx = loadShrimpCtx(0)
    const tank = makeTank()
    const sh = ctx.createShrimp(tank, 50, 55)
    const plant = makeFloorPlant(54) // x diff = 4 — beyond ±2 threshold
    sh.idle = 0
    sh.panic = 0
    sh.perched = false
    sh.target = null
    sh.goalX = undefined
    sh.goalY = undefined
    const entities = [sh, plant]
    sh.update(0.1, entities)
    expect(sh.perched).toBe(false)
  })
})

describe('shrimp — birth is capped and slowed', () => {
  test('an adult female does not give birth when the population is already at SHRIMP_MAX', () => {
    // REGRESSION: birth had no population cap at all -- a growing group of
    // adult females kept rolling every tick, compounding without bound.
    const ctx = loadShrimpCtx(0) // Math.random() always returns 0 -- would win any birth roll
    const tank = makeTank()
    const sh = ctx.createShrimp(tank, 50, 55)
    sh.sex = 'f'
    sh.age = 1000
    sh.idle = 0
    sh.panic = 0
    sh.perched = false
    sh.target = null
    sh.goalX = undefined
    sh.goalY = undefined
    // Pad the entity list up to SHRIMP_MAX (20) shrimp, including sh itself.
    const entities = [sh]
    for (let i = entities.length; i < 20; i++) entities.push(ctx.createShrimp(tank, 10 + i, 55))

    sh.update(0.1, entities)

    expect(entities.length).toBe(20)
  })

  test('an adult female under the cap gives birth to 1-3 shrimp when the roll succeeds', () => {
    const ctx = loadShrimpCtx(0) // Math.random() always returns 0 -- wins the birth roll, litter size floors to 1
    const tank = makeTank()
    const sh = ctx.createShrimp(tank, 50, 55)
    sh.sex = 'f'
    sh.age = 1000
    sh.idle = 0
    sh.panic = 0
    sh.perched = false
    sh.target = null
    sh.goalX = undefined
    sh.goalY = undefined
    const entities = [sh]

    sh.update(0.1, entities)

    expect(entities.length).toBe(2)
  })

  test('a female younger than the maturity threshold does not give birth', () => {
    const ctx = loadShrimpCtx(0)
    const tank = makeTank()
    const sh = ctx.createShrimp(tank, 50, 55)
    sh.sex = 'f'
    sh.age = 899 // just under the 900 threshold
    sh.idle = 0
    sh.panic = 0
    sh.perched = false
    sh.target = null
    sh.goalX = undefined
    sh.goalY = undefined
    const entities = [sh]

    sh.update(0.1, entities)

    expect(entities.length).toBe(1)
  })

  test('a male shrimp never gives birth regardless of age or the roll', () => {
    const ctx = loadShrimpCtx(0)
    const tank = makeTank()
    const sh = ctx.createShrimp(tank, 50, 55)
    sh.sex = 'm'
    sh.age = 1000
    sh.idle = 0
    sh.panic = 0
    sh.perched = false
    sh.target = null
    sh.goalX = undefined
    sh.goalY = undefined
    const entities = [sh]

    sh.update(0.1, entities)

    expect(entities.length).toBe(1)
  })
})

describe('shrimp — stays attached to a plant that moves', () => {
  test('perched shrimp follows its plant when the plant is dragged to a new x', () => {
    // REGRESSION: a perched shrimp stored a reference to its plant but never
    // re-synced its own x to the plant's x, so dragging the plant left the
    // shrimp behind at the plant's old spot, floating in open water.
    const ctx = loadShrimpCtx(0)
    const tank = makeTank()
    const sh = ctx.createShrimp(tank, 50, 55)
    const plant = makeFloorPlant(50)
    sh.perched = true
    sh.plant = plant
    sh.idle = 5 // not expiring this tick
    sh.panic = 0
    sh.target = null
    sh.goalX = undefined
    sh.goalY = undefined
    const entities = [sh, plant]

    // Simulate the plant being dragged to a new location
    plant.x = 90
    sh.update(0.1, entities)

    expect(sh.x).toBe(90)
    expect(sh.perched).toBe(true)
  })
})
