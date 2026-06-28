import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

// vm only exposes `var` declarations as context properties, not `const`.
// Rewrite before loading so all top-level names are reachable as ctx.name.
function loadBehavior(file, fixedRandom) {
  const m = fixedRandom !== undefined ? { ...Math, random: () => fixedRandom } : Math
  const ctx = createContext({ Math: m })
  const code = readFileSync(join(__dir, '../src/js/behaviors', file), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

describe('startPanic', () => {
  test('sets panic timer to PANIC_DURATION (1.5)', () => {
    const ctx = loadBehavior('panic.js', 0)
    const entity = { panic: 0, target: { x: 5 }, vx: 0, vy: 0, climbing: false }
    ctx.startPanic(entity)
    expect(entity.panic).toBe(1.5)
  })

  test('clears entity target', () => {
    const ctx = loadBehavior('panic.js', 0)
    const entity = { panic: 0, target: { x: 5 }, vx: 0, vy: 0 }
    ctx.startPanic(entity)
    expect(entity.target).toBeNull()
  })

  test('sets vx to negative panic speed when random < 0.5', () => {
    const ctx = loadBehavior('panic.js', 0) // random() = 0 → direction = -1
    const entity = { panic: 0, target: null, vx: 0, vy: 0 }
    ctx.startPanic(entity)
    expect(entity.vx).toBeLessThan(0)
    expect(Math.abs(entity.vx)).toBeCloseTo(0.5) // PANIC_SPEED + 0 * 0.2
  })

  test('sets vx to positive panic speed when random >= 0.5', () => {
    const ctx = loadBehavior('panic.js', 0.9) // random() = 0.9 → direction = 1
    const entity = { panic: 0, target: null, vx: 0, vy: 0 }
    ctx.startPanic(entity)
    expect(entity.vx).toBeGreaterThan(0)
    expect(entity.vx).toBeCloseTo(0.5 + 0.9 * 0.2) // 0.68
  })

  test('resets climbing flag', () => {
    const ctx = loadBehavior('panic.js', 0)
    const entity = { panic: 0, target: null, vx: 0, vy: 0, climbing: true }
    ctx.startPanic(entity)
    expect(entity.climbing).toBe(false)
  })
})

describe('updatePanic', () => {
  test('returns false and does not modify entity when panic is 0', () => {
    const ctx = loadBehavior('panic.js', 1)
    const entity = { panic: 0, idle: 0, vx: 0.5, vy: 0.2 }
    const result = ctx.updatePanic(entity, 0.1)
    expect(result).toBe(false)
    expect(entity.vx).toBe(0.5)
    expect(entity.vy).toBe(0.2)
  })

  test('returns true and decrements panic while panicking', () => {
    const ctx = loadBehavior('panic.js', 1) // random = 1, > 0.05, no vy nudge
    const entity = { panic: 1.5, idle: 0, vx: 0.5, vy: 0.2 }
    const result = ctx.updatePanic(entity, 0.3)
    expect(result).toBe(true)
    expect(entity.panic).toBeCloseTo(1.2)
  })

  test('slows entity and sets idle=1 when panic expires', () => {
    const ctx = loadBehavior('panic.js', 1) // random = 1, no vy nudge
    const entity = { panic: 0.05, idle: 0, vx: 0.5, vy: 0.4 }
    ctx.updatePanic(entity, 0.1) // panic = 0.05 - 0.1 < 0 → expires
    expect(entity.panic).toBe(0)
    expect(entity.idle).toBe(1)
    expect(entity.vx).toBeCloseTo(0.15) // 0.5 * 0.3
    expect(entity.vy).toBeCloseTo(0.12) // 0.4 * 0.3
  })

  test('returns true even in the expiry frame', () => {
    const ctx = loadBehavior('panic.js', 1)
    const entity = { panic: 0.01, idle: 0, vx: 0.5, vy: 0.2 }
    const result = ctx.updatePanic(entity, 0.1)
    expect(result).toBe(true)
  })
})
