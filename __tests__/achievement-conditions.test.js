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
})
