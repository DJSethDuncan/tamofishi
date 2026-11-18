import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(__dir, '../src/js/favicon.js'), 'utf8')

const runFavicon = () => {
  const rects = []
  const ctx = {
    fillStyle: null,
    fillRect(x, y, w, h) { rects.push({ color: this.fillStyle, x, y, w, h }) },
  }
  const canvas = { getContext: () => ctx, toDataURL: () => 'data:image/png;base64,CRAB' }
  const appended = []
  const document = {
    createElement: (tag) => (tag === 'canvas' ? canvas : { tag }),
    head: { appendChild: (el) => appended.push(el) },
  }
  runInContext(code, createContext({ document }))
  return { canvas, rects, appended }
}

describe('favicon', () => {
  test('draws on a 32x32 canvas', () => {
    const { canvas } = runFavicon()
    expect(canvas.width).toBe(32)
    expect(canvas.height).toBe(32)
  })

  test('draws the crab body, two eyes and two legs inside the canvas', () => {
    const { rects } = runFavicon()
    const px = 32 / 7
    expect(rects).toEqual([
      { color: '#2a8a2a', x: 2 * px, y: 2 * px, w: 3 * px, h: px },
      { color: '#33ff33', x: 2 * px, y: 2 * px, w: px, h: px },
      { color: '#33ff33', x: 4 * px, y: 2 * px, w: px, h: px },
      { color: '#2a8a2a', x: 1 * px, y: 3 * px, w: px, h: px },
      { color: '#2a8a2a', x: 5 * px, y: 3 * px, w: px, h: px },
    ])
    rects.forEach(({ x, y, w, h }) => {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x + w).toBeLessThanOrEqual(32)
      expect(y + h).toBeLessThanOrEqual(32)
    })
  })

  test('appends one icon link pointing at the canvas image', () => {
    const { appended } = runFavicon()
    expect(appended).toEqual([{ tag: 'link', rel: 'icon', href: 'data:image/png;base64,CRAB' }])
  })
})
