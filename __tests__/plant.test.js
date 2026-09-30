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
  const ctx = createContext({ Math: m, Date })
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

describe('createPlant — hitStem (literal stem pixels, not the bounding-box zone)', () => {
  test('hitStem is true for every pixel actually drawn this frame', () => {
    const ctx = loadEntity('plant.js', 0.5)
    const p = ctx.createPlant(makeTank(), 90, 'tall')
    const mockCtx = makeMockCtx()
    p.draw(mockCtx)
    expect(mockCtx.pixels.length).toBeGreaterThan(0)
    for (const px of mockCtx.pixels) {
      expect(p.hitStem(px.x, px.y)).toBe(true)
    }
  })

  test('hitStem is false for a point inside the bounding box but not on a drawn stem pixel', () => {
    // REGRESSION: a click several boxes off the stem, but still within the
    // old hitHalfWidth/hitHeight rectangle, used to grab the plant anyway --
    // this is exactly the "grabbing zone" bug report.
    const ctx = loadEntity('plant.js', 0.5)
    const p = ctx.createPlant(makeTank(), 90, 'tall')
    const mockCtx = makeMockCtx()
    p.draw(mockCtx)
    const drawn = new Set(mockCtx.pixels.map((px) => `${px.x},${px.y}`))

    // Sweep the reported bounding box for at least one point that's inside
    // the box but wasn't actually drawn on.
    let foundGap = false
    for (let dx = -p.hitHalfWidth; dx <= p.hitHalfWidth && !foundGap; dx++) {
      for (let dy = 0; dy <= p.hitHeight && !foundGap; dy++) {
        const x = Math.round(p.x) + dx
        const y = p.y - dy
        if (!drawn.has(`${x},${y}`)) {
          expect(p.hitStem(x, y)).toBe(false)
          foundGap = true
        }
      }
    }
    expect(foundGap).toBe(true)
  })

  test('hitStem tracks the stem as it sways between frames', () => {
    const ctx = loadEntity('plant.js', 0.5)
    const p = ctx.createPlant(makeTank(), 90, 'tall')
    const mockCtx1 = makeMockCtx()
    p.draw(mockCtx1)
    p.update(0.5)
    const mockCtx2 = makeMockCtx()
    p.draw(mockCtx2)
    expect(mockCtx2.pixels.length).toBeGreaterThan(0)
    for (const px of mockCtx2.pixels) {
      expect(p.hitStem(px.x, px.y)).toBe(true)
    }
  })
})

describe('createPlant — growth', () => {
  test('growth is zero and lastGrowthAt is recent on creation', () => {
    const ctx = loadEntity('plant.js', 0.5)
    const p = ctx.createPlant(makeTank(), 90, 'short')
    expect(p.growth).toBe(0)
    expect(Date.now() - p.lastGrowthAt).toBeLessThan(1000)
  })

  test('applyGrowth increases stalk height by the growth amount below the vertical cap', () => {
    const ctx = loadEntity('plant.js', 0.5)
    const p = ctx.createPlant(makeTank(), 90, 'short')
    const before = p.hitHeight
    p.growth = 3
    p.applyGrowth()
    expect(p.hitHeight).toBe(before + 3)
  })

  test('growth beyond the vertical cap spreads horizontally instead of continuing to grow up', () => {
    const ctx = loadEntity('plant.js', 0.5)
    const tank = makeTank()
    const p = ctx.createPlant(tank, 90, 'tall')
    const maxStalkH = Math.max(4, (tank.y2 - tank.y1) - 2)
    const widthBefore = p.hitHalfWidth
    // Push growth far past any possible baseH so every stalk is capped.
    p.growth = maxStalkH + 20
    p.applyGrowth()
    expect(p.hitHeight).toBe(maxStalkH)
    expect(p.hitHalfWidth).toBeGreaterThan(widthBefore)
  })

  test('applyGrowth is deterministic -- same growth value reproduces the same shape', () => {
    const ctx = loadEntity('plant.js', 0.5)
    const p1 = ctx.createPlant(makeTank(), 90, 'medium')
    p1.growth = 5
    p1.applyGrowth()
    const h1 = p1.hitHeight

    const ctx2 = loadEntity('plant.js', 0.5)
    const p2 = ctx2.createPlant(makeTank(), 90, 'medium')
    p2.growth = 5
    p2.applyGrowth()
    expect(p2.hitHeight).toBe(h1)
  })

  test('update() rolls growth for each elapsed real day and advances lastGrowthAt', () => {
    // fixedRandom=0.1 -- below the 0.5 growth-chance threshold, so every
    // elapsed day grows the plant.
    const ctx = loadEntity('plant.js', 0.1)
    const p = ctx.createPlant(makeTank(), 90, 'short')
    const DAY_MS = 24 * 60 * 60 * 1000
    p.lastGrowthAt = Date.now() - DAY_MS * 3
    const before = p.growth
    p.update(1 / 60, [])
    expect(p.growth).toBeGreaterThan(before)
    expect(Date.now() - p.lastGrowthAt).toBeLessThan(1000)
  })

  test('update() only advances lastGrowthAt by the checks actually rolled, not the full elapsed gap', () => {
    // REGRESSION: a tank reopened after a long gap (daysElapsed far beyond
    // MAX_GROWTH_CHECKS_PER_TICK) used to jump lastGrowthAt straight to
    // "now", silently losing every day past the per-tick cap forever
    // instead of catching up on them over subsequent ticks.
    const ctx = loadEntity('plant.js', 0.1)
    const p = ctx.createPlant(makeTank(), 90, 'short')
    const DAY_MS = 24 * 60 * 60 * 1000
    const MAX_GROWTH_CHECKS_PER_TICK = 60
    const start = Date.now() - DAY_MS * (MAX_GROWTH_CHECKS_PER_TICK + 40)
    p.lastGrowthAt = start
    p.update(1 / 60, [])
    expect(p.lastGrowthAt).toBe(start + MAX_GROWTH_CHECKS_PER_TICK * DAY_MS)

    // The remaining days must still roll on a later tick instead of being lost.
    const growthAfterFirstTick = p.growth
    p.update(1 / 60, [])
    expect(p.growth).toBeGreaterThan(growthAfterFirstTick)
  })

  test('update() does not roll growth before a full day has elapsed', () => {
    const ctx = loadEntity('plant.js', 0.1)
    const p = ctx.createPlant(makeTank(), 90, 'short')
    p.lastGrowthAt = Date.now() - 1000
    const before = p.growth
    p.update(1 / 60, [])
    expect(p.growth).toBe(before)
  })

  test('a dragged plant does not grow or procreate', () => {
    const ctx = loadEntity('plant.js', 0.1)
    const p = ctx.createPlant(makeTank(), 90, 'short')
    p.dragged = true
    const DAY_MS = 24 * 60 * 60 * 1000
    p.lastGrowthAt = Date.now() - DAY_MS * 3
    const entities = [p]
    p.update(1 / 60, entities)
    expect(p.growth).toBe(0)
    expect(entities.length).toBe(1)
  })
})

describe('createPlant — procreation', () => {
  test('a low random roll spawns a new adjacent plant below the population cap', () => {
    const ctx = loadEntity('plant.js', 0.0000001)
    const p = ctx.createPlant(makeTank(), 90, 'medium')
    const entities = [p]
    p.update(1 / 60, entities)
    expect(entities.length).toBe(2)
    expect(entities[1].type).toBe('plant')
  })

  test('does not spawn past the population cap', () => {
    const ctx = loadEntity('plant.js', 0.0000001)
    const p = ctx.createPlant(makeTank(), 90, 'medium')
    const entities = [p]
    for (let i = 0; i < 30; i++) entities.push({ type: 'plant' })
    p.update(1 / 60, entities)
    expect(entities.length).toBe(31)
  })
})
