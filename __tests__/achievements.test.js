import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function makeElement(id) {
  const listeners = {}
  const classes = new Set()
  return {
    id,
    textContent: '',
    innerHTML: '',
    children: [],
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    addEventListener: (event, handler) => { listeners[event] = handler },
    trigger: (event) => listeners[event] && listeners[event](),
    appendChild(child) { this.children.push(child) },
    append(...kids) { this.children.push(...kids) },
  }
}

function loadAchievementsCtx() {
  const elements = {}
  const ELEMENT_IDS = [
    'achievement-unlock-modal', 'achievement-unlock-name', 'achievement-unlock-description',
    'achievement-unlock-close', 'achievements-list', 'achievements-btn',
    'achievements-modal', 'achievements-modal-close',
  ]
  ELEMENT_IDS.forEach((id) => { elements[id] = makeElement(id) })
  // achievement-unlock-modal starts hidden, matching the real markup in index.html.
  elements['achievement-unlock-modal'].classList.add('hidden')
  elements['achievements-modal'].classList.add('hidden')

  const document = {
    getElementById: (id) => elements[id],
    createElement: () => makeElement(null),
  }

  const ACHIEVEMENTS = [
    { id: 'first-fish', name: 'First Fish', description: 'Add your first fish.', condition: (e) => e.length > 0 },
    { id: 'well-fed', name: 'Well Fed', description: 'Feed the fish.', condition: null },
  ]

  const ctx = createContext({ document, ACHIEVEMENTS })
  const code = readFileSync(join(__dir, '../src/js/achievements.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return { Achievements: ctx.Achievements, elements }
}

describe('Achievements.unlock', () => {
  test('unlocking an unknown id is a no-op', () => {
    const { Achievements } = loadAchievementsCtx()
    Achievements.unlock('does-not-exist')
    expect(Achievements.serialize()).toEqual([])
  })

  test('unlocking the same id twice only shows the modal once', () => {
    // REGRESSION: unlock() re-triggering showNextInQueue for an already-unlocked
    // id would re-queue and re-show a modal the player already dismissed.
    const { Achievements, elements } = loadAchievementsCtx()
    Achievements.unlock('first-fish')
    elements['achievement-unlock-close'].trigger('click') // dismiss it

    Achievements.unlock('first-fish')

    expect(elements['achievement-unlock-modal'].classList.contains('hidden')).toBe(true)
  })

  test('unlocking shows the modal with the achievement name and description', () => {
    const { Achievements, elements } = loadAchievementsCtx()
    Achievements.unlock('first-fish')

    expect(elements['achievement-unlock-modal'].classList.contains('hidden')).toBe(false)
    expect(elements['achievement-unlock-name'].textContent).toBe('First Fish')
    expect(elements['achievement-unlock-description'].textContent).toBe('Add your first fish.')
  })

  test('a second unlock while a modal is showing queues rather than replacing it', () => {
    const { Achievements, elements } = loadAchievementsCtx()
    Achievements.unlock('first-fish')
    Achievements.unlock('well-fed')

    expect(elements['achievement-unlock-name'].textContent).toBe('First Fish')

    elements['achievement-unlock-close'].trigger('click')

    expect(elements['achievement-unlock-name'].textContent).toBe('Well Fed')
  })
})

describe('Achievements.check', () => {
  test('unlocks every achievement whose condition currently passes', () => {
    const { Achievements } = loadAchievementsCtx()
    Achievements.check([{ type: 'fish' }])
    expect(Achievements.serialize()).toEqual(['first-fish'])
  })

  test('skips achievements with no condition function (unlocked only via explicit unlock elsewhere)', () => {
    const { Achievements } = loadAchievementsCtx()
    Achievements.check([{ type: 'fish' }])
    expect(Achievements.serialize()).not.toContain('well-fed')
  })
})

describe('Achievements.serialize / restore', () => {
  test('round-trips unlocked ids through serialize/restore', () => {
    const { Achievements } = loadAchievementsCtx()
    Achievements.unlock('first-fish')

    const saved = Achievements.serialize()
    const { Achievements: fresh } = loadAchievementsCtx()
    fresh.restore(saved)

    expect(fresh.serialize()).toEqual(['first-fish'])
  })

  test('restore replaces rather than merges with any already-unlocked ids', () => {
    const { Achievements } = loadAchievementsCtx()
    Achievements.unlock('first-fish')

    Achievements.restore(['well-fed'])

    expect(Achievements.serialize()).toEqual(['well-fed'])
  })

  test('restore treats a missing/undefined list as empty rather than throwing', () => {
    const { Achievements } = loadAchievementsCtx()
    Achievements.restore(undefined)
    expect(Achievements.serialize()).toEqual([])
  })
})
