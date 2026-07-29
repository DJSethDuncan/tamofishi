import { describe, test, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadMortality() {
  const ctx = createContext({ Math })
  const code = readFileSync(join(__dir, '../src/js/behaviors/mortality.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('checkMortality', () => {
  test('never kills when the random roll is just above the death threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const ctx = loadMortality()
    expect(ctx.checkMortality({}, 1)).toBe(false)
  })

  test('kills when the random roll lands under the base rate for the elapsed dt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const ctx = loadMortality()
    expect(ctx.checkMortality({}, 1)).toBe(true)
  })

  test('scales the death chance with dt -- a longer tick is a bigger risk window', () => {
    // REGRESSION-SHAPED: a rate that ignores dt would kill at the same
    // probability whether a frame took 1ms or 1 full second.
    const ctx = loadMortality()
    const roll = 5e-6 // between the 1s-tick rate (~1.39e-5) and the 0.1s-tick rate (~1.39e-6)
    vi.spyOn(Math, 'random').mockReturnValue(roll)
    expect(ctx.checkMortality({}, 1)).toBe(true)
    expect(ctx.checkMortality({}, 0.1)).toBe(false)
  })

  test('additional factors raise the death chance for that entity', () => {
    const ctx = loadMortality()
    const roll = 0.01 // far above the tiny base rate alone
    vi.spyOn(Math, 'random').mockReturnValue(roll)
    const crowded = () => 0.02 // a large extra per-second contribution
    expect(ctx.checkMortality({}, 1, [crowded])).toBe(true)
    expect(ctx.checkMortality({}, 1)).toBe(false)
  })

  test('factors receive the entity so they can inspect its own state', () => {
    const ctx = loadMortality()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const entity = { hungry: true }
    const seen = []
    const factor = (e) => { seen.push(e); return 0 }
    ctx.checkMortality(entity, 1, [factor])
    expect(seen).toEqual([entity])
  })
})
