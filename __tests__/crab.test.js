import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

const makeTank = () => ({ x1: 2, y1: 2, x2: 177, y2: 55 })

function loadCrabCtx(fixedRandom = 0.5) {
  const m = Object.create(Math, { random: { value: () => fixedRandom, writable: true, enumerable: true, configurable: true } })
  const ctx = createContext({
    Math: m,
    getSurfaceY: (_x, _y, _entities, floor) => floor,
    checkNudge: () => false,
  })
  const run = (file) => {
    const code = readFileSync(file, 'utf8')
    runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  }
  run(join(__dir, '../src/js/behaviors/feeding.js'))
  run(join(__dir, '../src/js/behaviors/panic.js'))
  run(join(__dir, '../src/js/behaviors/nudge.js'))
  run(join(__dir, '../src/js/behaviors/cursor.js'))
  run(join(__dir, '../src/js/entities/crab.js'))
  return ctx
}

describe('crab — eating prey uses deferred removal, not direct splice', () => {
  test('eating a fish marks it eaten instead of splicing it out mid-update', () => {
    // REGRESSION: chasePrey used to splice the prey directly out of the shared
    // entities array during entities.forEach(e => e.update(...)). If a crab
    // earlier in the array ate prey later in the array, later entities would
    // shift down and one would silently skip its update() call that frame.
    // Removal must be deferred: mark .eaten = true and let the game loop's
    // dedicated sweep pass (after forEach completes) do the actual splice,
    // matching the pattern tryEat() already uses.
    const ctx = loadCrabCtx(0)
    const tank = makeTank()
    const c = ctx.createCrab(tank, 50, tank.y2)
    c.idle = 0
    c.panic = 0
    const fish = { type: 'fish', x: 50.2, y: tank.y2, eaten: false }
    c.target = fish
    const entities = [c, fish]

    c.update(0.1, entities)

    expect(entities.length).toBe(2)
    expect(entities).toContain(fish)
    expect(fish.eaten).toBe(true)
    expect(c.idle).toBeGreaterThan(0)
  })
})

describe('crab — tank wall boundary handling', () => {
  test('reaching the left wall while on the floor starts climbing up it', () => {
    const ctx = loadCrabCtx(0.5)
    const tank = makeTank()
    const c = ctx.createCrab(tank, tank.x1, tank.y2)
    c.idle = 10
    c.vx = -0.5
    c.vy = 0
    const entities = [c]

    c.update(0.1, entities)

    expect(c.x).toBe(tank.x1)
    expect(c.climbing).toBe(true)
    expect(c.vx).toBe(0)
    expect(c.vy).toBe(-0.04)
    expect(c.idle).toBe(0.5)
  })

  test('reaching the right wall while on the floor starts climbing up it', () => {
    const ctx = loadCrabCtx(0.5)
    const tank = makeTank()
    const c = ctx.createCrab(tank, tank.x2, tank.y2)
    c.idle = 10
    c.vx = 0.5
    c.vy = 0
    const entities = [c]

    c.update(0.1, entities)

    expect(c.x).toBe(tank.x2)
    expect(c.climbing).toBe(true)
    expect(c.vx).toBe(0)
    expect(c.vy).toBe(-0.04)
    expect(c.idle).toBe(0.5)
  })

  test('climbing down the left wall and landing on the floor does not re-trigger climbing', () => {
    // REGRESSION: the wall-boundary check used to gate the climb-start on the
    // live c.climbing flag. A crab climbing down reaches the floor and the
    // "stop climbing" logic sets c.climbing = false earlier in this same
    // update() call -- so by the time the wall-boundary check ran, it looked
    // identical to a crab freshly walking into the wall, and immediately
    // restarted climbing. That trapped crabs in an infinite climb/land loop
    // right at the corner, never actually walking on the floor.
    const ctx = loadCrabCtx(0.5)
    const tank = makeTank()
    const c = ctx.createCrab(tank, tank.x1, tank.y2 - 0.03)
    c.climbing = true
    c.idle = 10
    c.vx = 0
    c.vy = 0.04
    const entities = [c]

    c.update(0.1, entities)

    expect(c.x).toBe(tank.x1)
    expect(c.y).toBe(tank.y2)
    expect(c.climbing).toBe(false)
    expect(c.vy).toBe(0)
  })

  test('climbing down the right wall and landing on the floor does not re-trigger climbing', () => {
    const ctx = loadCrabCtx(0.5)
    const tank = makeTank()
    const c = ctx.createCrab(tank, tank.x2, tank.y2 - 0.03)
    c.climbing = true
    c.idle = 10
    c.vx = 0
    c.vy = 0.04
    const entities = [c]

    c.update(0.1, entities)

    expect(c.x).toBe(tank.x2)
    expect(c.y).toBe(tank.y2)
    expect(c.climbing).toBe(false)
    expect(c.vy).toBe(0)
  })

  test('reaching the left wall while airborne bounces away instead of climbing', () => {
    // Only a crab standing on the floor should start a wall climb — one still
    // falling/jumping through the air should just bounce off the wall.
    const ctx = loadCrabCtx(0.5)
    const tank = makeTank()
    const c = ctx.createCrab(tank, tank.x1, tank.y1)
    c.idle = 10
    c.vx = -0.5
    c.vy = 0
    const entities = [c]

    c.update(0.1, entities)

    expect(c.x).toBe(tank.x1)
    expect(c.climbing).toBe(false)
    expect(c.vx).toBeCloseTo(0.45, 5)
  })
})
