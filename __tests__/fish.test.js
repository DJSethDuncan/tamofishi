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
  run(join(__dir, '../src/js/behaviors/mortality.js'))
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

describe('fish — eating shrimp uses deferred removal, not direct splice', () => {
  test('eating a shrimp marks it eaten instead of splicing it out mid-update', () => {
    // REGRESSION: this path used to splice the shrimp directly out of the shared
    // entities array during entities.forEach(e => e.update(...)), which can skip
    // another entity's update() for that frame if it shifted into an
    // already-visited array index. Removal must be deferred via .eaten = true,
    // matching tryEat() and the game loop's dedicated sweep pass.
    const ctx = loadFishCtx(1) // an adult fish, so a fixedRandom of 0 would always trigger the new mortality check below
    const tank = makeTank()
    const f = ctx.createFish(tank, 50, 30)
    f.panic = 0
    f.idle = 0
    f.age = 3600
    f.fullTimer = 0
    f.sex = 'm'
    const shrimp = { type: 'shrimp', x: 50.2, y: 30, perched: false, eaten: false }
    f.target = shrimp
    const entities = [f, shrimp]

    f.update(0.1, entities)

    expect(entities.length).toBe(2)
    expect(entities).toContain(shrimp)
    expect(shrimp.eaten).toBe(true)
  })
})

describe('fish — rarely chasing a bubble', () => {
  test('targets a nearby bubble when the random roll succeeds and no other target is set', () => {
    const ctx = loadFishCtx(0) // always succeeds the chase roll
    const tank = makeTank()
    const f = ctx.createFish(tank, 50, 30)
    f.panic = 0
    f.idle = 0
    f.age = 0 // juvenile: skip the shrimp-hunting branch entirely
    f.target = null
    const bubble = { type: 'bubble', x: 51, y: 30, eaten: false }
    const entities = [f, bubble]

    f.update(0.1, entities)

    expect(f.target).toBe(bubble)
  })

  test('does not chase a bubble outside the notice range', () => {
    const ctx = loadFishCtx(0)
    const tank = makeTank()
    const f = ctx.createFish(tank, 50, 30)
    f.panic = 0
    f.idle = 0
    f.age = 0
    f.target = null
    const bubble = { type: 'bubble', x: 60, y: 30, eaten: false } // d = 10, beyond the 6-unit range
    const entities = [f, bubble]

    f.update(0.1, entities)

    expect(f.target).toBeNull()
  })

  test('eating a bubble does not fill the fish up', () => {
    const ctx = loadFishCtx(0)
    const tank = makeTank()
    const f = ctx.createFish(tank, 50, 30)
    f.panic = 0
    f.idle = 0
    f.age = 0
    f.belly = 0
    f.bellyMax = 3
    const bubble = { type: 'bubble', x: 50.2, y: 30, eaten: false }
    f.target = bubble
    const entities = [f, bubble]

    f.update(0.1, entities)

    expect(bubble.eaten).toBe(true)
    expect(f.belly).toBe(0) // bubbles aren't food -- fed() must not run
  })
})

describe('fish — natural death', () => {
  test('an adult fish that fails its mortality roll starts dying and skips its normal behavior this tick', () => {
    const ctx = loadFishCtx(0) // always fails checkMortality's roll
    const tank = makeTank()
    const f = ctx.createFish(tank, 50, 30)
    f.panic = 0
    f.idle = 0
    f.age = 3600
    f.fullTimer = 0
    const startX = f.x

    f.update(0.1, [f])

    expect(f.dead).toBeDefined()
    expect(f.x).toBe(startX) // dying short-circuits before any swimming logic
  })

  test('a baby/juvenile fish never rolls for death, regardless of the random roll', () => {
    const ctx = loadFishCtx(0)
    const tank = makeTank()
    const f = ctx.createFish(tank, 50, 30)
    f.panic = 0
    f.idle = 0
    f.age = 0
    f.target = null

    f.update(0.1, [f])

    expect(f.dead).toBeUndefined()
  })

  test('a dying fish floats upward and fades, then is left for the game loop to remove once dead reaches 0', () => {
    const ctx = loadFishCtx(0)
    const tank = makeTank()
    const f = ctx.createFish(tank, 50, 30)
    f.dead = 5
    const startY = f.y

    f.update(10, [f])

    expect(f.y).toBeLessThan(startY) // floats up while dying
    expect(f.dead).toBeLessThanOrEqual(0) // game.js's sweep removes entities once dead <= 0
  })
})
