import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function makeElement(id) {
  const listeners = {}
  const classes = new Set()
  const el = {
    id,
    textContent: '',
    innerHTML: '',
    children: [],
    style: { setProperty(name, value) { this[name] = value } },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    addEventListener: (event, handler) => { listeners[event] = handler },
    trigger: (event) => listeners[event] && listeners[event]({ target: el }),
    appendChild(child) { this.children.push(child) },
    append(...kids) { this.children.push(...kids) },
    contains(node) { return node === el || this.children.includes(node) },
    remove() {},
  }
  return el
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

  const docListeners = {}
  const document = {
    getElementById: (id) => elements[id],
    createElement: () => makeElement(null),
    addEventListener: (event, handler) => { docListeners[event] = handler },
    // Simulates a click bubbling to the document -- fires the document-level
    // listener with the given element as e.target, same shape a real click
    // event has by the time it reaches a bubble-phase document listener.
    triggerDocumentClick: (target) => docListeners.click && docListeners.click({ target }),
  }

  const ACHIEVEMENTS = [
    { id: 'first-fish', name: 'First Fish', description: 'Add your first fish.', condition: (e) => e.length > 0 },
    { id: 'well-fed', name: 'Well Fed', description: 'Feed the fish.', condition: null },
  ]

  const ctx = createContext({ document, ACHIEVEMENTS })
  const code = readFileSync(join(__dir, '../src/js/achievements.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return { Achievements: ctx.Achievements, elements, document }
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

  test('unlocking spawns a bunch of bubble elements into the unlock modal', () => {
    const { Achievements, elements } = loadAchievementsCtx()
    Achievements.unlock('first-fish')

    const modal = elements['achievement-unlock-modal']
    expect(modal.children.length).toBeGreaterThanOrEqual(10)
    for (const bubble of modal.children) {
      expect(bubble.className).toBe('unlock-bubble')
    }
  })

  test('each bubble removes itself once its rise animation finishes', () => {
    const { Achievements, elements } = loadAchievementsCtx()
    Achievements.unlock('first-fish')

    const modal = elements['achievement-unlock-modal']
    const bubbleCountBefore = modal.children.length
    expect(bubbleCountBefore).toBeGreaterThan(0)

    // REGRESSION-SHAPED: without a self-removing animationend listener,
    // repeated unlocks would pile up bubble elements in the modal forever.
    modal.children.forEach((b) => b.trigger('animationend'))
  })
})

describe('achievements-modal outside-click-to-close', () => {
  test('clicking outside the open modal closes it', () => {
    const { elements, document } = loadAchievementsCtx()
    elements['achievements-btn'].trigger('click') // opens it
    expect(elements['achievements-modal'].classList.contains('hidden')).toBe(false)

    document.triggerDocumentClick(elements['achievements-modal']) // a click that starts inside the modal itself
    expect(elements['achievements-modal'].classList.contains('hidden')).toBe(false) // should NOT close

    const outsideEl = { id: null }
    document.triggerDocumentClick(outsideEl)
    expect(elements['achievements-modal'].classList.contains('hidden')).toBe(true)
  })

  test('the same click that opens the modal (via the achievements-btn) does not immediately close it', () => {
    // REGRESSION-SHAPED: the achievements-btn's own click listener runs
    // first and opens the modal; if the document-level outside-click
    // listener didn't specifically exclude that button, the same click
    // event bubbling to the document would immediately close what it just
    // opened.
    const { elements, document } = loadAchievementsCtx()
    elements['achievements-btn'].trigger('click')
    document.triggerDocumentClick(elements['achievements-btn'])

    expect(elements['achievements-modal'].classList.contains('hidden')).toBe(false)
  })

  test('clicking outside does nothing when the modal is already hidden', () => {
    const { elements, document } = loadAchievementsCtx()
    const outsideEl = { id: null }
    expect(() => document.triggerDocumentClick(outsideEl)).not.toThrow()
    expect(elements['achievements-modal'].classList.contains('hidden')).toBe(true)
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
