import { describe, test, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadFlake() {
  const ctx = createContext({ Math })
  const code = readFileSync(join(__dir, '../src/js/entities/flake.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createFlake', () => {
  test('settles at the tank floor and zeroes both velocities on arrival', () => {
    const ctx = loadFlake()
    vi.spyOn(Math, 'random').mockReturnValue(0) // vx = -0.075, vy = 0.02
    const tank = { x1: 0, y1: 0, x2: 100, y2: 0.01 }
    const f = ctx.createFlake(tank, 50)

    f.update(1)

    expect(f.y).toBe(tank.y2)
    expect(f.vy).toBe(0)
    expect(f.vx).toBe(0)
  })

  test('does not settle before reaching the floor', () => {
    const ctx = loadFlake()
    vi.spyOn(Math, 'random').mockReturnValue(0) // vy = 0.02
    const tank = { x1: 0, y1: 0, x2: 100, y2: 1000 }
    const f = ctx.createFlake(tank, 50)

    f.update(1)

    expect(f.y).toBeCloseTo(0.02)
    expect(f.vy).toBeCloseTo(0.02) // untouched while still sinking
  })

  test('horizontal velocity decays by 1% each tick while still sinking', () => {
    const ctx = loadFlake()
    vi.spyOn(Math, 'random').mockReturnValue(0) // vx = -0.075
    const tank = { x1: -1000, y1: 0, x2: 1000, y2: 1000 }
    const f = ctx.createFlake(tank, 50)

    f.update(1)

    expect(f.vx).toBeCloseTo(-0.075 * 0.99, 6)
  })

  test('x is clamped to the left tank bound', () => {
    const ctx = loadFlake()
    vi.spyOn(Math, 'random').mockReturnValue(0) // vx = -0.075 (drifts left)
    const tank = { x1: 0, y1: 0, x2: 100, y2: 1000 }
    const f = ctx.createFlake(tank, 0.01)

    f.update(1)

    expect(f.x).toBe(tank.x1)
  })

  test('x is clamped to the right tank bound', () => {
    const ctx = loadFlake()
    vi.spyOn(Math, 'random').mockReturnValue(1) // vx = +0.075 (drifts right)
    const tank = { x1: 0, y1: 0, x2: 100, y2: 1000 }
    const f = ctx.createFlake(tank, 99.99)

    f.update(1)

    expect(f.x).toBe(tank.x2)
  })
})
