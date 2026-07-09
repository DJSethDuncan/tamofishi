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

describe('createBubblerRock', () => {
  test('type is bubbler-rock', () => {
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    expect(br.type).toBe('bubbler-rock')
  })

  test('anchored at tank floor', () => {
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    expect(br.y).toBe(tank.y2)
  })

  test('surfaceAt returns peak height at centre column', () => {
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    // Centre column (col=0) has BUBBLER_COLS[5]=5 → surface at FLOOR-5
    expect(br.surfaceAt(90)).toBe(tank.y2 - 5)
  })

  test('surfaceAt returns null outside the mound', () => {
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    expect(br.surfaceAt(90 - 10)).toBeNull()
    expect(br.surfaceAt(90 + 10)).toBeNull()
  })

  test('does not emit bubble while dragged', () => {
    const ctx = loadEntity('bubblerrock.js', 0)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    br.dragged = true
    br._timer = 999
    const entities = []
    br.update(10, entities)
    expect(entities.length).toBe(0)
  })

  test('emits a bubble when timer fires', () => {
    const ctx = loadEntity('bubblerrock.js', 0)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    br._next = 0.5
    const entities = []
    br.update(1, entities)
    expect(entities.length).toBeGreaterThan(0)
    expect(entities[0].type).toBe('bubble')
  })

  test('timer resets to 0 after emitting', () => {
    const ctx = loadEntity('bubblerrock.js', 0)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    br._next = 0.1
    const entities = []
    br.update(0.2, entities)
    expect(br._timer).toBe(0)
  })

  test('bubbles emerge from both sides of the rock center', () => {
    // ventCol must cover -4..+4 symmetrically. The old formula
    // (Math.floor((Math.random()-0.5)*6)) gave -3..+2, silently skipping
    // the right half of the mound (columns +3, +4).
    const ctx = loadEntity('bubblerrock.js')
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    const leftXs = [], rightXs = []
    for (let i = 0; i < 500; i++) {
      const entities = []
      br._timer = 999; br._next = 0.1
      br.update(1, entities)
      if (entities.length > 0) {
        const bx = entities[0].x
        if (bx < 90) leftXs.push(bx)
        else if (bx > 90) rightXs.push(bx)
      }
    }
    // Both sides of the rock must produce bubbles
    expect(leftXs.length).toBeGreaterThan(0)
    expect(rightXs.length).toBeGreaterThan(0)
  })

  test('default intensity is 1.0', () => {
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const br = ctx.createBubblerRock(makeTank(), 90)
    expect(br.intensity).toBe(1.0)
  })

  test('higher intensity produces shorter _next interval on average', () => {
    // Run many emissions at intensity 2.0 and 0.5; 2× intensity should halve the interval.
    const ctx = loadEntity('bubblerrock.js', 0)
    const tank = makeTank()
    const brFast = ctx.createBubblerRock(tank, 90)
    brFast.intensity = 2.0
    const brSlow = ctx.createBubblerRock(tank, 90)
    brSlow.intensity = 0.5

    const nexts = (br) => {
      const vals = []
      for (let i = 0; i < 20; i++) {
        br._timer = 999; br._next = 0.1
        br.update(1, [])
        vals.push(br._next)
        br._timer = 0
      }
      return vals.reduce((a, v) => a + v, 0) / vals.length
    }

    // At intensity 2× the formula divides by 2, so _next should be ~half
    expect(nexts(brFast)).toBeLessThan(nexts(brSlow))
  })

  test('hitHalfWidth/hitHeight cover every pixel actually drawn', () => {
    // REGRESSION: the drag hit-test used a fixed 3px radius from the mound's base
    // point, but the mound is 11px wide — most of it was unclickable.
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    const pixels = []
    const mockCtx = { fillStyle: '', globalAlpha: 1, fillRect: (x, y) => pixels.push({ x, y }) }
    br.draw(mockCtx)
    expect(pixels.length).toBeGreaterThan(0)
    for (const px of pixels) {
      expect(Math.abs(px.x - Math.round(br.x))).toBeLessThanOrEqual(br.hitHalfWidth)
      expect(tank.y2 - px.y).toBeLessThanOrEqual(br.hitHeight)
    }
  })
})

describe('createMeanderingBubble (via update)', () => {
  test('bubble rises over time', () => {
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    br._next = 0.1
    const entities = []
    br.update(0.5, entities)
    const bubble = entities[0]
    const startY = bubble.y
    bubble.update(0.1)
    expect(bubble.y).toBeLessThan(startY)
  })

  test('bubble expires when it reaches the surface', () => {
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    br._next = 0.1
    const entities = []
    br.update(0.5, entities)
    const bubble = entities[0]
    bubble.y = tank.y1 + 1
    bubble.update(1)
    expect(bubble.eaten).toBe(true)
  })

  test('bubble is clamped within tank horizontal bounds', () => {
    const ctx = loadEntity('bubblerrock.js', 0.5)
    const tank = makeTank()
    const br = ctx.createBubblerRock(tank, 90)
    br._next = 0.1
    const entities = []
    br.update(0.5, entities)
    const bubble = entities[0]
    bubble.x = tank.x1 - 10
    bubble.update(0.1)
    expect(bubble.x).toBeGreaterThanOrEqual(tank.x1 + 1)
  })
})
