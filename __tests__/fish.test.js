import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))

const makeTank = () => ({ x1: 2, y1: 2, x2: 177, y2: 55 })

function loadFishCtx(fixedRandom = 0) {
  const m = Object.create(Math, {
    random: { value: () => fixedRandom, writable: true, enumerable: true, configurable: true },
  })
  const ctx = createContext({ Math: m })
  const run = (file) => {
    const code = readFileSync(file, 'utf8')
    runInContext(code.replace(/\bconst\b/g, 'var'), ctx)
  }
  run(join(__dir, '../src/js/behaviors/feeding.js'))
  run(join(__dir, '../src/js/behaviors/panic.js'))
  run(join(__dir, '../src/js/behaviors/nudge.js'))
  run(join(__dir, '../src/js/behaviors/cursor.js'))
  run(join(__dir, '../src/js/entities/fish.js'))
  return ctx
}

describe('fish — fleeing the murder cursor', () => {
  test('fish actually moves away from the cursor in murder mode, not just sets velocity', () => {
    // REGRESSION: fleeCursor() only sets vx/vy — every other fish.js movement
    // branch applies position inline (f.x += ...), but the flee branch didn't,
    // so fish set a flee velocity and then froze in place instead of fleeing.
    const ctx = loadFishCtx(0)
    const tank = makeTank()
    const f = ctx.createFish(tank, 50, 30)
    f.panic = 0
    f.idle = 0
    f.target = null
    f.age = 0
    ctx.cursor.murder = true
    ctx.cursor.x = 55 // to the right, d = 5, within FEED_RANGE (10)
    ctx.cursor.y = 30
    const entities = [f]

    f.update(0.1, entities)

    expect(f.vx).toBeLessThan(0) // fleeCursor sets velocity away from the cursor
    expect(f.x).toBeLessThan(50) // and the fish must actually have moved, not frozen
  })
})
