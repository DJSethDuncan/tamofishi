import { describe, test, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadNudge() {
  const ctx = createContext({ Math })
  const code = readFileSync(join(__dir, '../src/js/behaviors/nudge.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

// checkNudge drives the "startle when something bumps into me" behavior shared
// by crab, turtle, snail, shrimp, and fish — but none of those consumers test
// the real function, only their own reaction to its (mocked) return value.
const other = (type, x, y) => ({ type, x, y })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkNudge', () => {
  test('returns false and clears _touched when the entity is not idle', () => {
    const ctx = loadNudge()
    const entity = { idle: 0, x: 0, y: 0, _touched: true }
    expect(ctx.checkNudge(entity, [])).toBe(false)
    expect(entity._touched).toBe(false)
  })

  test('returns false when no other entity is within range', () => {
    const ctx = loadNudge()
    const entity = { idle: 5, x: 0, y: 0 }
    const entities = [entity, other('fish', 100, 100)]
    expect(ctx.checkNudge(entity, entities)).toBe(false)
    expect(entity._touched).toBeFalsy()
  })

  test('ignores flake, plant, and rock entities even at zero distance', () => {
    const ctx = loadNudge()
    const entity = { idle: 5, x: 0, y: 0 }
    const entities = [
      entity,
      other('flake', 0, 0),
      other('plant', 0, 0),
      other('rock', 0, 0),
    ]
    expect(ctx.checkNudge(entity, entities)).toBe(false)
    expect(entity._touched).toBeFalsy()
  })

  test('fires on the transition into contact when the random roll succeeds', () => {
    const ctx = loadNudge()
    vi.spyOn(Math, 'random').mockReturnValue(0) // < 0.75
    const entity = { idle: 5, x: 0, y: 0 }
    const entities = [entity, other('fish', 1, 0)] // distance 1 < NUDGE_DIST (2)

    expect(ctx.checkNudge(entity, entities)).toBe(true)
    expect(entity.idle).toBe(0)
    expect(entity._touched).toBe(true)
  })

  test('marks _touched on contact even when the random roll fails, but does not reset idle', () => {
    const ctx = loadNudge()
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // >= 0.75
    const entity = { idle: 5, x: 0, y: 0 }
    const entities = [entity, other('fish', 1, 0)]

    expect(ctx.checkNudge(entity, entities)).toBe(false)
    expect(entity.idle).toBe(5)
    expect(entity._touched).toBe(true)
  })

  test('does not re-fire on subsequent frames while contact continues (edge-triggered, not level-triggered)', () => {
    const ctx = loadNudge()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const entity = { idle: 5, x: 0, y: 0 }
    const entities = [entity, other('fish', 1, 0)]

    expect(ctx.checkNudge(entity, entities)).toBe(true)
    entity.idle = 5 // simulate idle being set again between frames
    expect(ctx.checkNudge(entity, entities)).toBe(false)
    expect(ctx.checkNudge(entity, entities)).toBe(false)
  })

  test('can fire again after contact is broken and re-established', () => {
    const ctx = loadNudge()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const entity = { idle: 5, x: 0, y: 0 }
    const touching = [entity, other('fish', 1, 0)]
    const apart = [entity, other('fish', 100, 100)]

    expect(ctx.checkNudge(entity, touching)).toBe(true)
    entity.idle = 5

    expect(ctx.checkNudge(entity, apart)).toBe(false)
    expect(entity._touched).toBe(false)

    expect(ctx.checkNudge(entity, touching)).toBe(true)
  })
})
