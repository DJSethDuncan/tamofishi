import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadConditions() {
  const ctx = createContext({})
  const code = readFileSync(join(__dir, '../src/js/achievement-conditions.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx.ACHIEVEMENTS
}

const byId = (achievements, id) => achievements.find(a => a.id === id)

describe('achievement conditions', () => {
  test('getting-started unlocks once a fish exists', () => {
    const achievements = loadConditions()
    const def = byId(achievements, 'getting-started')
    expect(def.condition([])).toBe(false)
    expect(def.condition([{ type: 'crab' }])).toBe(false)
    expect(def.condition([{ type: 'fish' }])).toBe(true)
  })

  test('growing-family requires 10+ live creatures, decor does not count', () => {
    const achievements = loadConditions()
    const def = byId(achievements, 'growing-family')
    const nineFish = Array.from({ length: 9 }, () => ({ type: 'fish' }))
    expect(def.condition(nineFish)).toBe(false)
    expect(def.condition([...nineFish, { type: 'rock' }])).toBe(false)
    expect(def.condition([...nineFish, { type: 'crab' }])).toBe(true)
  })

  // REGRESSION: fading corpses (e.dead is a truthy countdown while a murdered
  // or naturally-dying creature floats/fades out, see fish.js/game.js) must
  // not be counted as "in the tank at once" -- otherwise murdering fish down
  // to a handful still reads as having 10+ creatures for as long as the
  // corpses take to decay out of the entities array.
  test('growing-family does not count fading (dead) creatures toward the total', () => {
    const achievements = loadConditions()
    const def = byId(achievements, 'growing-family')
    const threeLiveFish = Array.from({ length: 3 }, () => ({ type: 'fish' }))
    const sevenFadingFish = Array.from({ length: 7 }, () => ({ type: 'fish', dead: 900 }))
    expect(def.condition([...threeLiveFish, ...sevenFadingFish])).toBe(false)
  })

  test('full-house requires one of every live creature type', () => {
    const achievements = loadConditions()
    const def = byId(achievements, 'full-house')
    const fourOfFive = [{ type: 'fish' }, { type: 'crab' }, { type: 'shrimp' }, { type: 'snail' }]
    expect(def.condition(fourOfFive)).toBe(false)
    expect(def.condition([...fourOfFive, { type: 'turtle' }])).toBe(true)
  })

  test('green-thumb requires both a plant and a rock', () => {
    const achievements = loadConditions()
    const def = byId(achievements, 'green-thumb')
    expect(def.condition([{ type: 'plant' }])).toBe(false)
    expect(def.condition([{ type: 'rock' }])).toBe(false)
    expect(def.condition([{ type: 'plant' }, { type: 'rock' }])).toBe(true)
  })

  test('bubbly requires a bubbler-rock', () => {
    const achievements = loadConditions()
    const def = byId(achievements, 'bubbly')
    expect(def.condition([{ type: 'rock' }])).toBe(false)
    expect(def.condition([{ type: 'bubbler-rock' }])).toBe(true)
  })

  test('well-fed has no condition -- it is unlocked directly by feedAt', () => {
    const achievements = loadConditions()
    const def = byId(achievements, 'well-fed')
    expect(def.condition).toBeNull()
  })

  test('every achievement has a unique id', () => {
    const achievements = loadConditions()
    const ids = achievements.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('concurrent-count achievements', () => {
    test('escargogogo requires 25 snails present at the same time', () => {
      const achievements = loadConditions()
      const def = byId(achievements, 'escargogogo')
      const snails = (n) => Array.from({ length: n }, () => ({ type: 'snail' }))
      expect(def.condition(snails(24))).toBe(false)
      expect(def.condition(snails(25))).toBe(true)
    })

    test('dwayne (10 rocks) and amaze-x3 (25 rocks) are independent tiers on the same stat', () => {
      const achievements = loadConditions()
      const dwayne = byId(achievements, 'dwayne')
      const amaze = byId(achievements, 'amaze-x3')
      const rocks = (n) => Array.from({ length: n }, () => ({ type: 'rock' }))
      expect(dwayne.condition(rocks(10))).toBe(true)
      expect(amaze.condition(rocks(10))).toBe(false)
      expect(amaze.condition(rocks(25))).toBe(true)
    })

    // REGRESSION: murdered/dying entities aren't spliced out of the entities
    // array immediately -- they linger with a truthy e.dead countdown while
    // they fade out (see fish.js's startDying and game.js's handleTap murder
    // branch). A concurrent-count achievement checking the raw snapshot would
    // count those fading corpses as still "present", letting a count-based
    // achievement fire even though the tank doesn't actually hold that many
    // live creatures right now.
    test('a fading (murdered) snail does not count toward escargogogo', () => {
      const achievements = loadConditions()
      const def = byId(achievements, 'escargogogo')
      const snails = Array.from({ length: 24 }, () => ({ type: 'snail' }))
      const fadingSnail = { type: 'snail', dead: 900 }
      expect(def.condition([...snails, fadingSnail])).toBe(false)
      const liveSnail = { type: 'snail' }
      expect(def.condition([...snails, liveSnail])).toBe(true)
    })
  })

  describe('event-driven stat achievements', () => {
    test('fish-born tiers key off stats.fishBorn, not the current entity count', () => {
      const achievements = loadConditions()
      const def = byId(achievements, 'fish-born-50')
      // REGRESSION-SHAPED: a tank with zero fish present right now can still
      // have this unlocked, since it tracks a lifetime counter, not a
      // concurrent-count snapshot like escargogogo above.
      expect(def.condition([], { fishBorn: 49 })).toBe(false)
      expect(def.condition([], { fishBorn: 50 })).toBe(true)
    })

    test('fish-murdered and turtles-murdered (shredder) read separate counters', () => {
      const achievements = loadConditions()
      const fishMurdered = byId(achievements, 'fish-murdered-10')
      const shredder = byId(achievements, 'shredder')
      expect(fishMurdered.condition([], { fishMurdered: 9, turtlesMurdered: 4 })).toBe(false)
      expect(fishMurdered.condition([], { fishMurdered: 10, turtlesMurdered: 0 })).toBe(true)
      expect(shredder.condition([], { fishMurdered: 0, turtlesMurdered: 4 })).toBe(true)
    })

    test('oh-the-humanity reads stats.bubblesBlown', () => {
      const achievements = loadConditions()
      const def = byId(achievements, 'oh-the-humanity')
      expect(def.condition([], { bubblesBlown: 9999 })).toBe(false)
      expect(def.condition([], { bubblesBlown: 10000 })).toBe(true)
    })

    test('no-future (clear a tank) reads stats.tankCleared', () => {
      const achievements = loadConditions()
      const def = byId(achievements, 'no-future')
      expect(def.condition([], { tankCleared: 0 })).toBe(false)
      expect(def.condition([], { tankCleared: 1 })).toBe(true)
    })

    test('stat-based conditions do not throw when stats is undefined', () => {
      // REGRESSION-SHAPED: Achievements.check(entities) is called with only
      // one argument in a couple of older call sites/tests -- these
      // conditions must not crash on a missing second argument.
      const achievements = loadConditions()
      expect(() => byId(achievements, 'fish-born-50').condition([])).not.toThrow()
      expect(() => byId(achievements, 'shredder').condition([])).not.toThrow()
      expect(() => byId(achievements, 'oh-the-humanity').condition([])).not.toThrow()
      expect(() => byId(achievements, 'no-future').condition([])).not.toThrow()
    })
  })

  describe('tank-age achievements', () => {
    test('tank-age-1 unlocks once a full day has passed since tankCreatedAt', () => {
      const achievements = loadConditions()
      const def = byId(achievements, 'tank-age-1')
      const now = Date.now()
      expect(def.condition([], { tankCreatedAt: now - 23 * 3600 * 1000 })).toBe(false)
      expect(def.condition([], { tankCreatedAt: now - 25 * 3600 * 1000 })).toBe(true)
    })

    test('tank-age conditions do not throw when tankCreatedAt is missing', () => {
      const achievements = loadConditions()
      expect(byId(achievements, 'tank-age-1').condition([], {})).toBe(false)
    })
  })
})
