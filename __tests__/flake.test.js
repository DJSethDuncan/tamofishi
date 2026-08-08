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

const makeTank = () => ({ x1: 0, y1: 10, x2: 100, y2: 70 })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createFlake', () => {
  test('falls (increasing y) and settles at the tank floor', () => {
    const ctx = loadFlake()
    const tank = makeTank()
    const f = ctx.createFlake(tank, 50)
    for (let i = 0; i < 10000; i++) f.update(1)
    expect(f.y).toBe(tank.y2)
    expect(f.vy).toBe(0)
  })

  test('stops moving horizontally once it settles at the floor', () => {
    // REGRESSION-SHAPED: settling zeroes vx too, not just vy — otherwise a
    // "resting" flake would keep drifting sideways forever.
    const ctx = loadFlake()
    const tank = makeTank()
    const f = ctx.createFlake(tank, 50)
    for (let i = 0; i < 10000; i++) f.update(1)
    const xAtRest = f.x
    f.update(1)
    expect(f.x).toBe(xAtRest)
    expect(f.vx).toBe(0)
  })

  test('x is clamped within the tank bounds', () => {
    const ctx = loadFlake()
    vi.spyOn(Math, 'random').mockReturnValue(1) // maximizes vx (+0.075/tick)
    const tank = makeTank()
    const f = ctx.createFlake(tank, tank.x2 - 1)
    for (let i = 0; i < 1000; i++) {
      f.update(1)
      expect(f.x).toBeGreaterThanOrEqual(tank.x1)
      expect(f.x).toBeLessThanOrEqual(tank.x2)
    }
  })

  test('horizontal velocity decays toward zero over time', () => {
    const ctx = loadFlake()
    vi.spyOn(Math, 'random').mockReturnValue(1) // vx starts at its max magnitude
    const tank = makeTank()
    const f = ctx.createFlake(tank, 50)
    const initialVx = f.vx
    for (let i = 0; i < 200; i++) f.update(1)
    expect(Math.abs(f.vx)).toBeLessThan(Math.abs(initialVx))
  })

  test('draws a single pixel at its rounded position', () => {
    const ctx = loadFlake()
    const tank = makeTank()
    const f = ctx.createFlake(tank, 50.4)
    const rects = []
    const mockCtx = { fillStyle: '', fillRect: (x, y, w, h) => rects.push({ x, y, w, h }) }

    f.draw(mockCtx)

    expect(rects).toEqual([{ x: Math.round(f.x), y: Math.round(f.y), w: 1, h: 1 }])
  })
})
