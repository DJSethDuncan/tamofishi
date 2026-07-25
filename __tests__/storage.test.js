import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadStorage(localStorageImpl) {
  const windowObj = {}
  const ctx = createContext({ window: windowObj, localStorage: localStorageImpl, JSON })
  const code = readFileSync(join(__dir, '../src/js/storage.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return windowObj.tank
}

describe('tank.save', () => {
  test('persists data to localStorage as JSON', () => {
    const store = {}
    const tank = loadStorage({
      setItem: (k, v) => { store[k] = v },
      getItem: (k) => store[k],
    })

    tank.save([{ type: 'fish' }])

    expect(store['tamofishi-tank']).toBe(JSON.stringify([{ type: 'fish' }]))
  })

  test('does not throw when localStorage.setItem fails (e.g. quota exceeded)', () => {
    // REGRESSION: unlike tank.load, which already catches JSON.parse failures,
    // tank.save had no error handling -- since it runs on a 5s setInterval for
    // the entire life of the tab, a single quota/private-browsing failure
    // would throw uncaught, repeatedly, forever.
    const tank = loadStorage({
      setItem: () => { throw new Error('QuotaExceededError') },
    })

    expect(() => tank.save([{ type: 'fish' }])).not.toThrow()
  })
})

describe('tank.load', () => {
  test('returns the parsed data when present', () => {
    const store = { 'tamofishi-tank': JSON.stringify([{ type: 'fish' }]) }
    const tank = loadStorage({ getItem: (k) => store[k] })

    expect(tank.load()).toEqual([{ type: 'fish' }])
  })

  test('returns null for corrupt JSON instead of throwing', () => {
    const tank = loadStorage({ getItem: () => '{not valid json' })
    expect(tank.load()).toBeNull()
  })
})
