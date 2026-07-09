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

describe('createPlant — drag hit-test footprint', () => {
  test('hitHalfWidth/hitHeight cover every pixel actually drawn, across several sway phases', () => {
    // REGRESSION: the drag hit-test used a fixed 3px radius from the plant's rooted
    // base point regardless of its actual height — a "tall" plant can reach ~90% of
    // the tank height, so most of its visible stalk was unclickable.
    const ctx = loadEntity('plant.js', 0.5)
    const tank = makeTank()
    const p = ctx.createPlant(tank, 90, 'tall')
    const mockCtx = makeMockCtx()
    // Sample across a full sway cycle so drift/animation doesn't escape the footprint.
    for (let i = 0; i < 20; i++) {
      p.update(0.3)
      p.draw(mockCtx)
    }
    expect(mockCtx.pixels.length).toBeGreaterThan(0)
    for (const px of mockCtx.pixels) {
      expect(Math.abs(px.x - Math.round(p.x))).toBeLessThanOrEqual(p.hitHalfWidth)
      expect(tank.y2 - px.y).toBeLessThanOrEqual(p.hitHeight)
    }
  })

  test('hitHeight exceeds the old fixed 3px hit radius for a tall plant', () => {
    const ctx = loadEntity('plant.js', 0.5)
    const p = ctx.createPlant(makeTank(), 90, 'tall')
    expect(p.hitHeight).toBeGreaterThan(3)
  })
})
