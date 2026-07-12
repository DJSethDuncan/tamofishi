import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadSurface() {
  const ctx = createContext({ Math })
  const code = readFileSync(join(__dir, '../src/js/behaviors/surface.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

// getSurfaceY drives every climbing/terrain interaction (crab, turtle, snail, shrimp),
// but every one of those consumer tests stubs it out with a fake — the real
// implementation itself has no test coverage at all.
const rock = (surfaceAt) => ({ type: 'rock', surfaceAt })

describe('getSurfaceY', () => {
  test('returns the floor when there are no entities', () => {
    const ctx = loadSurface()
    expect(ctx.getSurfaceY(10, 55, [], 55)).toBe(55)
  })

  test('returns the floor when no rock covers this x', () => {
    const ctx = loadSurface()
    const entities = [rock(() => null)]
    expect(ctx.getSurfaceY(10, 55, entities, 55)).toBe(55)
  })

  test('non-rock entities are ignored even if positioned here', () => {
    const ctx = loadSurface()
    const entities = [{ type: 'fish', surfaceAt: () => 20 }]
    expect(ctx.getSurfaceY(10, 55, entities, 55)).toBe(55)
  })

  test('lands on a rock surface when the entity is at or above it', () => {
    const ctx = loadSurface()
    const entities = [rock(() => 40)] // rock surface at y=40, above floor (55)
    expect(ctx.getSurfaceY(10, 40, entities, 55)).toBe(40)
  })

  test('the 1px tolerance still counts as "above" the surface', () => {
    const ctx = loadSurface()
    const entities = [rock(() => 40)]
    expect(ctx.getSurfaceY(10, 41, entities, 55)).toBe(40)
  })

  test('ignores a rock the entity is below (falling toward the floor past it)', () => {
    const ctx = loadSurface()
    const entities = [rock(() => 40)] // rock surface at 40, but entity is at 45 — below it
    expect(ctx.getSurfaceY(10, 45, entities, 55)).toBe(55)
  })

  test('picks the tallest (lowest y) rock the entity currently qualifies for', () => {
    const ctx = loadSurface()
    const entities = [rock(() => 40), rock(() => 25)]
    // Entity is above both rocks' surfaces (25 <= 25+1 and 25 <= 40+1) — must pick 25, not 40.
    expect(ctx.getSurfaceY(10, 25, entities, 55)).toBe(25)
  })

  test('does not pick a taller rock the entity has not reached yet', () => {
    const ctx = loadSurface()
    const entities = [rock(() => 40), rock(() => 25)]
    // Entity is above the shorter rock (40) but hasn't climbed to the taller one (25) yet.
    expect(ctx.getSurfaceY(10, 40, entities, 55)).toBe(40)
  })
})
