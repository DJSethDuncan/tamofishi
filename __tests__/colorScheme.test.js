import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadColorSchemeCtx() {
  const ctx = createContext({})
  const code = readFileSync(join(__dir, '../src/js/behaviors/colorScheme.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

describe('computeHueShift', () => {
  test('green scheme, murder off -> no shift', () => {
    const ctx = loadColorSchemeCtx()
    expect(ctx.computeHueShift('green', false)).toBe(0)
  })

  test('amber scheme, murder off -> amber shift', () => {
    const ctx = loadColorSchemeCtx()
    expect(ctx.computeHueShift('amber', false)).toBe(-80)
  })

  test('green scheme, murder on -> murder shift', () => {
    const ctx = loadColorSchemeCtx()
    expect(ctx.computeHueShift('green', true)).toBe(-120)
  })

  test('amber scheme, murder on -> murder overrides amber instead of stacking', () => {
    // Regression: stacking -80 (amber) with -120 (murder) landed on -200deg,
    // which rendered purple instead of the intended murder-mode red.
    const ctx = loadColorSchemeCtx()
    expect(ctx.computeHueShift('amber', true)).toBe(-120)
  })
})

describe('cursorAccentFor', () => {
  test('returns the green accent for the green scheme', () => {
    const ctx = loadColorSchemeCtx()
    expect(ctx.cursorAccentFor('green')).toBe('#33ff33')
  })

  test('returns the amber accent for the amber scheme', () => {
    const ctx = loadColorSchemeCtx()
    expect(ctx.cursorAccentFor('amber')).toBe('#ffbb34')
  })
})
