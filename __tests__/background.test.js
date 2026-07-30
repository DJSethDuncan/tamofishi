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
