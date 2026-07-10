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
