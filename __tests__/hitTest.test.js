import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadHitTest() {
  const ctx = createContext({ Math })
  const code = readFileSync(join(__dir, '../src/js/behaviors/hitTest.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

describe('pickTopmostDraggable', () => {
  test('picks the frontmost entity when two decor items overlap, regardless of array order', () => {
    // REGRESSION: a plain entities.find(...) returned whichever matching
    // entity happened to come first in the array (e.g. spawn order), not
    // the one actually drawn on top -- a rock behind a plant could steal
    // the plant's click.
    const ctx = loadHitTest()
    const rock = { type: 'rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const plant = { type: 'plant', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    // rock listed first in the array, but plant is drawn on top per game.js's draw order
    const entities = [rock, plant]

    const hit = ctx.pickTopmostDraggable(entities, 50, 29)

    expect(hit).toBe(plant)
  })

  test('order in the array does not matter -- same result either way', () => {
    const ctx = loadHitTest()
    const rock = { type: 'rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const plant = { type: 'plant', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }

    const hit = ctx.pickTopmostDraggable([plant, rock], 50, 29)

    expect(hit).toBe(plant)
  })

  test('bubbler-rock beats treasure-chest, which beats rock', () => {
    const ctx = loadHitTest()
    const rock = { type: 'rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const chest = { type: 'treasure-chest', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const bubblerRock = { type: 'bubbler-rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }

    expect(ctx.pickTopmostDraggable([rock, chest], 50, 29)).toBe(chest)
    expect(ctx.pickTopmostDraggable([chest, bubblerRock], 50, 29)).toBe(bubblerRock)
    expect(ctx.pickTopmostDraggable([bubblerRock, rock], 50, 29)).toBe(bubblerRock)
  })

  test('snail beats decor items drawn behind it', () => {
    const ctx = loadHitTest()
    const plant = { type: 'plant', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const snail = { type: 'snail', x: 50, y: 30 }

    const hit = ctx.pickTopmostDraggable([plant, snail], 50, 30)

    expect(hit).toBe(snail)
  })

  test('picks the later-added rock when two overlapping rocks tie on z-order', () => {
    // REGRESSION: two same-type entities tie on DRAG_Z_ORDER, but game.js
    // draws same-type entities in array order, so the later one in the
    // array is the one actually drawn on top and should win the hit test --
    // a strict `>` tie-check kept whichever rock was found first instead.
    const ctx = loadHitTest()
    const backRock = { type: 'rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const frontRock = { type: 'rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const entities = [backRock, frontRock] // frontRock added later -- drawn on top

    const hit = ctx.pickTopmostDraggable(entities, 50, 29)

    expect(hit).toBe(frontRock)
  })

  test('returns null when nothing is hit', () => {
    const ctx = loadHitTest()
    const rock = { type: 'rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }

    expect(ctx.pickTopmostDraggable([rock], 90, 90)).toBeNull()
  })

  test('ignores entities with no drag footprint (fish, flake, bubble)', () => {
    const ctx = loadHitTest()
    const fish = { type: 'fish', x: 50, y: 30 }

    expect(ctx.pickTopmostDraggable([fish], 50, 30)).toBeNull()
  })
})
