import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

const makeTank = () => ({ x1: 2, y1: 2, x2: 177, y2: 55 })

function loadTurtleCtx(fixedRandom = 0.5) {
  const m = Object.create(Math, { random: { value: () => fixedRandom, writable: true, enumerable: true, configurable: true } })
  const ctx = createContext({
    Math: m,
    getSurfaceY: (_x, _y, _entities, floor) => floor,
    checkNudge: () => false,
    chaseCursor: () => false,
  })
  const run = (file) => {
    const code = readFileSync(file, 'utf8')
    runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  }
  run(join(__dir, '../src/js/behaviors/feeding.js'))
  run(join(__dir, '../src/js/behaviors/panic.js'))
  run(join(__dir, '../src/js/behaviors/nudge.js'))
  run(join(__dir, '../src/js/entities/turtle.js'))
  return ctx
}

describe('turtle balance — crab cooldown', () => {
  test('turtle idles 20s after eating a crab (not FEED_COOLDOWN=2)', () => {
    const ctx = loadTurtleCtx(0)
    const tank = makeTank()
    const t = ctx.createTurtle(tank, 50, 55)
    t.idle = 0
    t.panic = 0
    const crab = { type: 'crab', x: 50, y: 55, eaten: false }
    t.target = crab
    const entities = [t, crab]
    t.update(0.1, entities)
    expect(t.idle).toBe(20)
    expect(crab.eaten).toBe(true)
  })

  test('turtle still uses FEED_COOLDOWN (2s) after eating a fish', () => {
    const ctx = loadTurtleCtx(0)
    const tank = makeTank()
    const t = ctx.createTurtle(tank, 50, 55)
    t.idle = 0
    t.panic = 0
    const fish = { type: 'fish', x: 50, y: 55, eaten: false }
    t.target = fish
    const entities = [t, fish]
    t.update(0.1, entities)
    expect(t.idle).toBe(2)
    expect(fish.eaten).toBe(true)
  })
})

describe('turtle balance — eating uses deferred removal, not direct splice', () => {
  test('eating does not remove the prey from the entities array mid-update', () => {
    // REGRESSION: chasePrey used to splice the prey directly out of the shared
    // entities array during entities.forEach(e => e.update(...)). If an entity
    // earlier in the array ate prey later in the array, later entities would
    // shift down and one would silently skip its update() call that frame.
    // Removal must be deferred: mark .eaten = true and let the game loop's
    // dedicated sweep pass (after forEach completes) do the actual splice.
    const ctx = loadTurtleCtx(0)
    const tank = makeTank()
    const t = ctx.createTurtle(tank, 50, 55)
    t.idle = 0
    t.panic = 0
    const fish = { type: 'fish', x: 50, y: 55, eaten: false }
    t.target = fish
    const entities = [t, fish]
    t.update(0.1, entities)
    expect(entities.length).toBe(2)
    expect(entities).toContain(fish)
    expect(fish.eaten).toBe(true)
  })
})

describe('turtle balance — crab gang-up', () => {
  test('turtle panics when 2 crabs are within 8px', () => {
    const ctx = loadTurtleCtx(0.9) // high random so nudge/stroll branches don't fire startPanic
    const tank = makeTank()
    const t = ctx.createTurtle(tank, 50, 55)
    t.idle = 0
    t.panic = 0
    const crabs = [
      { type: 'crab', x: 52, y: 55, eaten: false },
      { type: 'crab', x: 54, y: 55, eaten: false },
    ]
    const entities = [t, ...crabs]
    t.update(0.1, entities)
    expect(t.panic).toBeGreaterThan(0)
  })

  test('single crab nearby does not trigger panic', () => {
    const ctx = loadTurtleCtx(0.9)
    const tank = makeTank()
    const t = ctx.createTurtle(tank, 50, 55)
    t.idle = 2
    t.panic = 0
    const entities = [t, { type: 'crab', x: 52, y: 55, eaten: false }]
    t.update(0.1, entities)
    expect(t.panic).toBe(0)
  })

  test('eaten crabs do not count toward gang-up', () => {
    const ctx = loadTurtleCtx(0.9)
    const tank = makeTank()
    const t = ctx.createTurtle(tank, 50, 55)
    t.idle = 2
    t.panic = 0
    const entities = [
      t,
      { type: 'crab', x: 52, y: 55, eaten: true },
      { type: 'crab', x: 54, y: 55, eaten: true },
    ]
    t.update(0.1, entities)
    expect(t.panic).toBe(0)
  })

  test('crabs outside 8px do not trigger gang-up', () => {
    const ctx = loadTurtleCtx(0.9)
    const tank = makeTank()
    const t = ctx.createTurtle(tank, 50, 55)
    t.idle = 2
    t.panic = 0
    const entities = [
      t,
      { type: 'crab', x: 59, y: 55, eaten: false },
      { type: 'crab', x: 61, y: 55, eaten: false },
    ]
    t.update(0.1, entities)
    expect(t.panic).toBe(0)
  })

  test('already-panicking turtle is not re-triggered by crabs', () => {
    const ctx = loadTurtleCtx(0.9)
    const tank = makeTank()
    const t = ctx.createTurtle(tank, 50, 55)
    t.idle = 2
    t.panic = 0.5 // already panicking
    const crabs = [
      { type: 'crab', x: 52, y: 55, eaten: false },
      { type: 'crab', x: 54, y: 55, eaten: false },
    ]
    const entities = [t, ...crabs]
    const panicBefore = t.panic
    t.update(0.1, entities)
    // Panic should have decremented, not reset to PANIC_DURATION
    expect(t.panic).toBeLessThan(panicBefore)
  })
})
