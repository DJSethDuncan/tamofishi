import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

// cursor.js depends on FEED_RANGE declared in feeding.js
function loadCursorCtx() {
  const ctx = createContext({ Math })
  const base = join(__dir, '../src/js/behaviors')
  for (const f of ['feeding.js', 'cursor.js']) {
    const code = readFileSync(join(base, f), 'utf8')
    runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  }
  return ctx
}

// FEED_RANGE = 10

describe('chaseCursor', () => {
  test('returns false when cursor is not visible (x < 0)', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = -1
    ctx.cursor.murder = false
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    expect(ctx.chaseCursor(entity, 0.15)).toBe(false)
    expect(entity.x).toBe(50)
  })

  test('returns false in murder mode even when cursor is visible', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = 52
    ctx.cursor.y = 30
    ctx.cursor.murder = true
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    expect(ctx.chaseCursor(entity, 0.15)).toBe(false)
  })

  test('returns false when cursor is beyond FEED_RANGE', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = 70 // d = 20 > 10
    ctx.cursor.y = 30
    ctx.cursor.murder = false
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    expect(ctx.chaseCursor(entity, 0.15)).toBe(false)
  })

  test('moves entity toward cursor when within FEED_RANGE', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = 55 // d = 5, pure x direction
    ctx.cursor.y = 30
    ctx.cursor.murder = false
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    const result = ctx.chaseCursor(entity, 0.15)
    expect(result).toBe(true)
    expect(entity.x).toBeGreaterThan(50)
    expect(entity.vx).toBeCloseTo(0.15) // speed * (dx/d) = 0.15 * (5/5)
  })

  test('returns true without moving when already at cursor', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = 50
    ctx.cursor.y = 30
    ctx.cursor.murder = false
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    const result = ctx.chaseCursor(entity, 0.15)
    expect(result).toBe(true)
    expect(entity.x).toBe(50) // already there, no movement (d < 1)
  })
})

describe('fleeCursor', () => {
  test('returns false when not in murder mode', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = 52
    ctx.cursor.y = 30
    ctx.cursor.murder = false
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    expect(ctx.fleeCursor(entity, 0.2)).toBe(false)
  })

  test('returns false when cursor is not visible', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = -1
    ctx.cursor.murder = true
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    expect(ctx.fleeCursor(entity, 0.2)).toBe(false)
  })

  test('sets flee velocity away from cursor in murder mode', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = 55 // cursor to the right, d = 5
    ctx.cursor.y = 30
    ctx.cursor.murder = true
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    const result = ctx.fleeCursor(entity, 0.2)
    expect(result).toBe(true)
    expect(entity.vx).toBeLessThan(0)           // flee left, away from cursor
    expect(entity.vx).toBeCloseTo(-0.2)         // -speed * (dx/d)
  })

  test('returns false when cursor is beyond FEED_RANGE', () => {
    const ctx = loadCursorCtx()
    ctx.cursor.x = 70 // d = 20 > 10
    ctx.cursor.y = 30
    ctx.cursor.murder = true
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    expect(ctx.fleeCursor(entity, 0.2)).toBe(false)
  })

  test('returns false when the cursor is too close (d < 0.1), avoiding a velocity spike', () => {
    // Without this guard, dividing by a near-zero distance would produce an
    // erratic, extremely large flee velocity instead of a sane one.
    const ctx = loadCursorCtx()
    ctx.cursor.x = 50.05 // d = 0.05 < 0.1
    ctx.cursor.y = 30
    ctx.cursor.murder = true
    const entity = { x: 50, y: 30, vx: 0, vy: 0 }
    const result = ctx.fleeCursor(entity, 0.2)
    expect(result).toBe(false)
    expect(entity.vx).toBe(0)
  })
})
