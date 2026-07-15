import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadFeeding(fixedRandom) {
  // Object.create(Math), not { ...Math }: spreading Math drops its
  // non-enumerable methods (e.g. hypot), which feeding.js relies on.
  const m = fixedRandom !== undefined ? Object.assign(Object.create(Math), { random: () => fixedRandom }) : Math
  const ctx = createContext({ Math: m })
  const code = readFileSync(join(__dir, '../src/js/behaviors/feeding.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

// FEED_RANGE = 10, EAT_DIST = 0.8, FEED_COOLDOWN = 2

describe('isFood', () => {
  test('flake that has not been eaten is food', () => {
    const ctx = loadFeeding()
    expect(ctx.isFood({ type: 'flake', eaten: false })).toBe(true)
  })

  test('eaten flake is not food', () => {
    const ctx = loadFeeding()
    expect(ctx.isFood({ type: 'flake', eaten: true })).toBeFalsy()
  })

  test('duckweed that has not been eaten is food', () => {
    const ctx = loadFeeding()
    expect(ctx.isFood({ type: 'duckweed', eaten: false })).toBe(true)
  })

  test('dead entity (e.g. dead shrimp) is food', () => {
    const ctx = loadFeeding()
    expect(ctx.isFood({ type: 'shrimp', dead: true })).toBe(true)
  })

  test('live non-food entity is not food', () => {
    const ctx = loadFeeding()
    expect(ctx.isFood({ type: 'fish', eaten: false, dead: false })).toBe(false)
  })

  test('crab is not food', () => {
    const ctx = loadFeeding()
    expect(ctx.isFood({ type: 'crab' })).toBeFalsy()
  })
})

describe('findNearestFlake', () => {
  test('returns null when no food entities exist', () => {
    const ctx = loadFeeding()
    const entity = { x: 50, y: 30 }
    const others = [
      { type: 'fish', x: 51, y: 31, eaten: false },
      { type: 'crab', x: 52, y: 32 },
    ]
    expect(ctx.findNearestFlake(entity, others)).toBeNull()
  })

  test('returns nearest food entity within FEED_RANGE', () => {
    const ctx = loadFeeding()
    const entity = { x: 50, y: 30 }
    const near = { type: 'flake', x: 53, y: 30, eaten: false } // d=3
    const far  = { type: 'flake', x: 55, y: 30, eaten: false } // d=5
    expect(ctx.findNearestFlake(entity, [near, far])).toBe(near)
  })

  test('returns null when all food is beyond FEED_RANGE', () => {
    const ctx = loadFeeding()
    const entity = { x: 50, y: 30 }
    const distant = { type: 'flake', x: 70, y: 30, eaten: false } // d=20
    expect(ctx.findNearestFlake(entity, [distant])).toBeNull()
  })

  test('skips eaten flakes', () => {
    const ctx = loadFeeding()
    const entity = { x: 50, y: 30 }
    const eaten = { type: 'flake', x: 51, y: 30, eaten: true }
    const fresh = { type: 'flake', x: 54, y: 30, eaten: false }
    expect(ctx.findNearestFlake(entity, [eaten, fresh])).toBe(fresh)
  })

  test('applies optional filter', () => {
    const ctx = loadFeeding()
    const entity = { x: 50, y: 30 }
    const flake = { type: 'flake', x: 52, y: 30, eaten: false }
    const weed  = { type: 'duckweed', x: 53, y: 30, eaten: false }
    const result = ctx.findNearestFlake(entity, [flake, weed], e => e.type === 'duckweed')
    expect(result).toBe(weed)
  })
})

// noticeFlake is used directly by fish and shrimp to decide feeding targets,
// but had zero coverage — every distance/probability branch below is real,
// active production behavior.
describe('noticeFlake', () => {
  test('returns null when no food entities exist', () => {
    const ctx = loadFeeding(0)
    const entity = { x: 50, y: 30 }
    expect(ctx.noticeFlake(entity, [{ type: 'crab', x: 51, y: 31 }])).toBeNull()
  })

  test('never notices food outside FEED_RANGE, even with a guaranteed roll', () => {
    const ctx = loadFeeding(0) // random() = 0 always passes the probability check
    const entity = { x: 50, y: 30 }
    const distant = { type: 'flake', x: 70, y: 30, eaten: false } // d=20 > FEED_RANGE=10
    expect(ctx.noticeFlake(entity, [distant])).toBeNull()
  })

  test('returns the nearest in-range food when the roll always succeeds', () => {
    const ctx = loadFeeding(0)
    const entity = { x: 50, y: 30 }
    const near = { type: 'flake', x: 53, y: 30, eaten: false } // d=3
    const far  = { type: 'flake', x: 55, y: 30, eaten: false } // d=5
    expect(ctx.noticeFlake(entity, [near, far])).toBe(near)
  })

  test('does not notice close food when the random roll fails', () => {
    // d=1 → threshold is 1/(1*1+1) = 0.5. A roll of 0.99 must fail (0.99 is not < 0.5).
    const ctx = loadFeeding(0.99)
    const entity = { x: 50, y: 30 }
    const close = { type: 'flake', x: 51, y: 30, eaten: false }
    expect(ctx.noticeFlake(entity, [close])).toBeNull()
  })

  test('closer food is noticed at a roll value that farther food fails', () => {
    // d=1 → threshold 0.5 (0.2 < 0.5 passes). d=5 → threshold 1/26≈0.0385 (0.2 < 0.0385 fails).
    const ctx = loadFeeding(0.2)
    const entity = { x: 50, y: 30 }
    const close = { type: 'flake', x: 51, y: 30, eaten: false } // d=1
    const farAway = { type: 'flake', x: 55, y: 30, eaten: false } // d=5
    expect(ctx.noticeFlake(entity, [farAway])).toBeNull()
    expect(ctx.noticeFlake(entity, [close])).toBe(close)
  })

  test('applies optional filter', () => {
    const ctx = loadFeeding(0)
    const entity = { x: 50, y: 30 }
    const flake = { type: 'flake', x: 52, y: 30, eaten: false }
    const weed  = { type: 'duckweed', x: 53, y: 30, eaten: false }
    const result = ctx.noticeFlake(entity, [flake, weed], e => e.type === 'duckweed')
    expect(result).toBe(weed)
  })
})

describe('tryEat', () => {
  test('returns false when entity has no target', () => {
    const ctx = loadFeeding()
    const entity = { x: 50, y: 30, target: null, idle: 0 }
    expect(ctx.tryEat(entity)).toBe(false)
  })

  test('returns false when target is too far (beyond EAT_DIST=0.8)', () => {
    const ctx = loadFeeding()
    const target = { x: 52, y: 30, eaten: false }
    const entity = { x: 50, y: 30, target, idle: 0 }
    expect(ctx.tryEat(entity)).toBe(false)
    expect(target.eaten).toBe(false)
  })

  test('marks target eaten and returns true when within EAT_DIST', () => {
    const ctx = loadFeeding()
    const target = { x: 50.5, y: 30, eaten: false }
    const entity = { x: 50, y: 30, target, idle: 0 }
    const result = ctx.tryEat(entity)
    expect(result).toBe(true)
    expect(target.eaten).toBe(true)
    expect(entity.target).toBeNull()
  })

  test('sets idle cooldown after eating', () => {
    const ctx = loadFeeding()
    const target = { x: 50.3, y: 30, eaten: false }
    const entity = { x: 50, y: 30, target, idle: 0 }
    ctx.tryEat(entity)
    expect(entity.idle).toBe(2) // FEED_COOLDOWN = 2
  })
})
