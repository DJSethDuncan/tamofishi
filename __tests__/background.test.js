import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadBackground() {
  const ctx = createContext({ Math })
  const code = readFileSync(join(__dir, '../src/js/behaviors/background.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

describe('waterRowColor', () => {
  test('returns flat black for the "black" background regardless of row', () => {
    const ctx = loadBackground()
    expect(ctx.waterRowColor('black', 0, 10)).toBe('#000000')
    expect(ctx.waterRowColor('black', 9, 10)).toBe('#000000')
  })

  test('returns the brightest gradient color at the top row', () => {
    const ctx = loadBackground()
    expect(ctx.waterRowColor('gradient', 0, 10)).toBe('rgb(11,43,11)')
  })

  test('returns a darker gradient color toward the bottom row', () => {
    const ctx = loadBackground()
    // REGRESSION-SHAPED: the gradient must actually darken with row, not
    // just return a constant -- otherwise "gradient" and "black" would be
    // visually indistinguishable at the extremes.
    const top = ctx.waterRowColor('gradient', 0, 10)
    const bottom = ctx.waterRowColor('gradient', 9, 10)
    expect(bottom).not.toBe(top)
    expect(bottom).toBe('rgb(3,13,3)')
  })

  test('falls back to the gradient for an unset/legacy background value', () => {
    expect(loadBackground().waterRowColor(undefined, 0, 10)).toBe('rgb(11,43,11)')
  })

})

describe('BACKDROP_OPTIONS / BACKGROUND_LABELS', () => {
  test('every option has a label and every label maps back to a valid option', () => {
    const ctx = loadBackground()
    expect(ctx.BACKDROP_OPTIONS.length).toBeGreaterThanOrEqual(5)
    for (const opt of ctx.BACKDROP_OPTIONS) {
      expect(ctx.BACKGROUND_LABELS[opt]).toBeTruthy()
    }
    expect(Object.keys(ctx.BACKGROUND_LABELS).sort()).toEqual([...ctx.BACKDROP_OPTIONS].sort())
  })
})

describe('drawBackdropElements', () => {
  const tank = { x1: 2, y1: 2, x2: 177, y2: 55 }

  function makeMockCtx() {
    const pixels = []
    return {
      fillStyle: '',
      fillRect(x, y, w, h) { pixels.push({ x, y, w, h }) },
      pixels,
    }
  }

  test('draws nothing extra for gradient or black -- those are water-only options', () => {
    const ctx = loadBackground()
    for (const plain of ['gradient', 'black']) {
      const mockCtx = makeMockCtx()
      ctx.drawBackdropElements(mockCtx, plain, tank)
      expect(mockCtx.pixels.length).toBe(0)
    }
  })

  test.each(['undersea', 'rocks', 'shipwreck'])(
    'draws scene elements for the "%s" backdrop, all within tank bounds',
    (theme) => {
      const ctx = loadBackground()
      const mockCtx = makeMockCtx()
      ctx.drawBackdropElements(mockCtx, theme, tank)
      expect(mockCtx.pixels.length).toBeGreaterThan(0)
      for (const px of mockCtx.pixels) {
        expect(px.x).toBeGreaterThanOrEqual(tank.x1 - 5) // small silhouette overhang is fine
        expect(px.x).toBeLessThanOrEqual(tank.x2 + 5)
      }
    }
  )

  test('shipwreck (and every other themed backdrop) only ever uses colors from the GREEN ramp', () => {
    // The task explicitly said "only use the ship and grass, not the fish"
    // for shipwreck, and separately (in follow-up feedback) that every
    // backdrop must stay strictly green-hued, no other hues -- this
    // asserts every fillStyle used across all four themes is one of the
    // GREEN ramp's own values, never an introduced grey/brown/blue tone
    // (which would imply an off-theme or unrelated decorative element).
    const ctx = loadBackground()
    const greenValues = new Set(Object.values(ctx.GREEN))
    for (const theme of ['undersea', 'rocks', 'shipwreck']) {
      const seenColors = new Set()
      const mockCtx = {
        pixels: [],
        set fillStyle(c) { this._c = c; seenColors.add(c) },
        get fillStyle() { return this._c },
        fillRect(x, y, w, h) { this.pixels.push({ x, y, w, h, color: this._c }) },
      }
      ctx.drawBackdropElements(mockCtx, theme, tank)
      for (const color of seenColors) {
        expect(greenValues.has(color)).toBe(true)
      }
    }
  })
})
