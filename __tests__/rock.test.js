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

const makeMockCtx = () => {
  const pixels = []
  return { pixels, fillStyle: '', fillRect: (x, y) => pixels.push({ x, y }) }
}

describe('createRock — drag hit-test footprint', () => {
  test('hitHalfWidth/hitHeight cover every pixel actually drawn', () => {
    // REGRESSION: the drag hit-test used a fixed 3px radius from the rock's base
    // point regardless of its actual size — large rocks (up to ~70px wide) could
    // only be dragged by clicking within 3px of that single anchor point.
    const ctx = loadEntity('rock.js', 0.5)
    const tank = makeTank()
    const r = ctx.createRock(tank, 90, 'tall')
    const mockCtx = makeMockCtx()
    r.draw(mockCtx)
    expect(mockCtx.pixels.length).toBeGreaterThan(0)
    for (const px of mockCtx.pixels) {
      expect(Math.abs(px.x - Math.round(r.x))).toBeLessThanOrEqual(r.hitHalfWidth)
      expect(tank.y2 - px.y).toBeLessThanOrEqual(r.hitHeight)
    }
  })

  test('hitHalfWidth exceeds the old fixed 3px hit radius for a tall rock', () => {
    const ctx = loadEntity('rock.js', 0.7)
    const r = ctx.createRock(makeTank(), 90, 'tall')
    expect(r.hitHalfWidth).toBeGreaterThan(3)
  })
})
