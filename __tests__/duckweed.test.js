import { describe, test, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadDuckweed() {
  const ctx = createContext({ Math })
  const code = readFileSync(join(__dir, '../src/js/entities/duckweed.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

const makeTank = () => ({ x1: 0, y1: 10, x2: 100 })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createDuckweed', () => {
  test('y is always pinned to the surface, one unit below tank.y1', () => {
    const ctx = loadDuckweed()
    const tank = makeTank()
    const d = ctx.createDuckweed(tank, 50)
    d.update(1, [d])
    expect(d.y).toBe(tank.y1 + 1)
  })

  test('x is clamped within the tank bounds even as phase drifts', () => {
    const ctx = loadDuckweed()
    const tank = makeTank()
    const d = ctx.createDuckweed(tank, tank.x1 + 1)
    // Run many ticks so sin-driven drift has a chance to push it past the edge.
    for (let i = 0; i < 500; i++) {
      d.update(1, [d])
      expect(d.x).toBeGreaterThanOrEqual(tank.x1 + 1)
      expect(d.x).toBeLessThanOrEqual(tank.x2 - 1)
    }
  })

  test('reproduces when under the population cap and the random roll succeeds', () => {
    const ctx = loadDuckweed()
    vi.spyOn(Math, 'random').mockReturnValue(0) // always < 0.00015 threshold
    const tank = makeTank()
    const d = ctx.createDuckweed(tank, 50)
    const entities = [d]

    d.update(1, entities)
    expect(entities.length).toBe(2)
    expect(entities[1].type).toBe('duckweed')
  })

  test('does not reproduce when the random roll fails', () => {
    const ctx = loadDuckweed()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // always >= 0.00015 threshold
    const tank = makeTank()
    const d = ctx.createDuckweed(tank, 50)
    const entities = [d]

    d.update(1, entities)
    expect(entities.length).toBe(1)
  })

  test('does not reproduce once the live population cap (40) is reached', () => {
    // REGRESSION-SHAPED: the cap check must actually gate reproduction, not
    // just be dead code next to an always-true random roll.
    const ctx = loadDuckweed()
    vi.spyOn(Math, 'random').mockReturnValue(0) // random roll would always succeed
    const tank = makeTank()
    const d = ctx.createDuckweed(tank, 50)
    const entities = [d, ...Array.from({ length: 39 }, () => ctx.createDuckweed(tank, 10))]
    expect(entities.length).toBe(40)

    d.update(1, entities)
    expect(entities.length).toBe(40)
  })

  test('eaten duckweed do not count toward the population cap', () => {
    const ctx = loadDuckweed()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const tank = makeTank()
    const d = ctx.createDuckweed(tank, 50)
    const eatenDuckweed = Array.from({ length: 39 }, () => {
      const e = ctx.createDuckweed(tank, 10)
      e.eaten = true
      return e
    })
    const entities = [d, ...eatenDuckweed]

    d.update(1, entities)
    // Only 1 live duckweed exists (the rest are eaten), so a new one is allowed.
    expect(entities.length).toBe(41)
  })
})
