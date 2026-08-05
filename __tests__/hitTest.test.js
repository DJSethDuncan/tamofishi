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
  test('among decor, the later array entry wins -- array order IS the z-index', () => {
    // Decor z-order is exactly what the long-press settings modal's
    // bring-to-front/send-to-back buttons manipulate (see game.js), by
    // reordering entities within the array. So unlike creatures, decor
    // has no fixed per-type ranking -- whichever decor entity is later in
    // the array is the one actually drawn on top and should win.
    const ctx = loadHitTest()
    const rock = { type: 'rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const plant = { type: 'plant', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }

    expect(ctx.pickTopmostDraggable([rock, plant], 50, 29)).toBe(plant)
    expect(ctx.pickTopmostDraggable([plant, rock], 50, 29)).toBe(rock)
  })

  test('decor type does not create a fixed hierarchy -- only array position does', () => {
    const ctx = loadHitTest()
    const rock = { type: 'rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const chest = { type: 'treasure-chest', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const bubblerRock = { type: 'bubbler-rock', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }

    expect(ctx.pickTopmostDraggable([rock, chest], 50, 29)).toBe(chest)
    expect(ctx.pickTopmostDraggable([chest, bubblerRock], 50, 29)).toBe(bubblerRock)
    // bubblerRock is listed first here, so rock -- later in the array -- wins,
    // even though bubbler-rock "used to" always beat rock under the old
    // fixed-type ranking.
    expect(ctx.pickTopmostDraggable([bubblerRock, rock], 50, 29)).toBe(rock)
  })

  test('creatures always beat decor, regardless of array order', () => {
    // Creatures are drawn after all decor in game.js's draw loop no matter
    // where they fall in the entities array, so a creature must win a tie
    // against decor even if it happens to come earlier in the array (decor
    // z-index reordering must never accidentally let decor grab a click
    // meant for a snail/turtle sitting on top of it).
    const ctx = loadHitTest()
    const plant = { type: 'plant', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5 }
    const snail = { type: 'snail', x: 50, y: 30 }

    expect(ctx.pickTopmostDraggable([plant, snail], 50, 30)).toBe(snail)
    expect(ctx.pickTopmostDraggable([snail, plant], 50, 30)).toBe(snail)
  })

  test('picks the later-added rock when two overlapping rocks tie', () => {
    // REGRESSION: two same-type entities tie on array position too if
    // compared with a strict `>` instead of `>=` -- that kept whichever
    // rock was found first instead of the later (frontmost) one.
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

  test('a plant with hitStem defined is only grabbable on its literal stem pixels, not its bounding box', () => {
    // REGRESSION: plants used to be grabbable anywhere within their
    // hitHalfWidth/hitHeight bounding box -- a click aimed at something
    // behind the plant, a few boxes off its stem, grabbed the plant instead.
    const ctx = loadHitTest()
    const plant = {
      type: 'plant', x: 50, y: 30, hitHalfWidth: 5, hitHeight: 5,
      hitStem: (tx, ty) => tx === 50 && ty === 28, // only one literal stem pixel
    }

    expect(ctx.pickTopmostDraggable([plant], 50, 28)).toBe(plant)
    expect(ctx.pickTopmostDraggable([plant], 52, 29)).toBeNull() // inside the box, off the stem
  })
})
