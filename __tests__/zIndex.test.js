import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadZIndex() {
  const ctx = createContext({})
  const code = readFileSync(join(__dir, '../src/js/behaviors/zIndex.js'), 'utf8')
  runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  return ctx
}

const DECOR_TYPES = ['rock', 'treasure-chest', 'bubbler-rock', 'plant']

describe('bringDecorToFront', () => {
  test('moves the target to the end of the array', () => {
    const ctx = loadZIndex()
    const a = { type: 'rock' }, b = { type: 'plant' }, c = { type: 'rock' }
    const entities = [a, b, c]

    ctx.bringDecorToFront(entities, a)

    expect(entities).toEqual([b, c, a])
  })

  test('no-op when the target is not in the array', () => {
    const ctx = loadZIndex()
    const a = { type: 'rock' }, ghost = { type: 'rock' }
    const entities = [a]

    ctx.bringDecorToFront(entities, ghost)

    expect(entities).toEqual([a])
  })
})

describe('sendDecorToBack', () => {
  test('moves the target to the start of the array', () => {
    const ctx = loadZIndex()
    const a = { type: 'rock' }, b = { type: 'plant' }, c = { type: 'rock' }
    const entities = [a, b, c]

    ctx.sendDecorToBack(entities, c)

    expect(entities).toEqual([c, a, b])
  })
})

describe('swapDecorWithNeighbor', () => {
  test('forward (+1) swaps with the next decor entity later in the array', () => {
    const ctx = loadZIndex()
    const rock = { type: 'rock' }, fish = { type: 'fish' }, plant = { type: 'plant' }
    const entities = [rock, fish, plant] // a non-decor entity sits between them

    ctx.swapDecorWithNeighbor(entities, rock, 1, DECOR_TYPES)

    // rock and plant swap places; fish (not decor) is skipped over, not swapped with
    expect(entities).toEqual([plant, fish, rock])
  })

  test('backward (-1) swaps with the next decor entity earlier in the array', () => {
    const ctx = loadZIndex()
    const rock = { type: 'rock' }, plant = { type: 'plant' }
    const entities = [rock, plant]

    ctx.swapDecorWithNeighbor(entities, plant, -1, DECOR_TYPES)

    expect(entities).toEqual([plant, rock])
  })

  test('no-op when already at the front/back with no decor neighbor in that direction', () => {
    const ctx = loadZIndex()
    const rock = { type: 'rock' }, plant = { type: 'plant' }
    const entities = [rock, plant]

    ctx.swapDecorWithNeighbor(entities, rock, -1, DECOR_TYPES) // nothing before rock

    expect(entities).toEqual([rock, plant])
  })

  test('skips over non-decor entities entirely when searching for a neighbor', () => {
    const ctx = loadZIndex()
    const rock = { type: 'rock' }, snail = { type: 'snail' }, fish = { type: 'fish' }
    const entities = [rock, snail, fish] // no other decor at all

    ctx.swapDecorWithNeighbor(entities, rock, 1, DECOR_TYPES)

    expect(entities).toEqual([rock, snail, fish])
  })
})
