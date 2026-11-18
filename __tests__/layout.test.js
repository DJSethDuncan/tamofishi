import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createContext, runInContext } from 'vm'

const __dir = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(join(__dir, '../src/js/layout.js'), 'utf8')

const runLayout = (process) => {
  const wrap = { style: {} }
  const document = { getElementById: (id) => (id === 'app-wrap' ? wrap : null) }
  runInContext(code, createContext({ document, process }))
  return wrap
}

describe('layout', () => {
  test('caps the app wrapper to the Electron window size in a browser', () => {
    const wrap = runLayout(undefined)
    expect(wrap.style.maxWidth).toBe('1440px')
    expect(wrap.style.maxHeight).toBe('585px')
  })

  test('leaves the wrapper untouched in Electron', () => {
    const wrap = runLayout({ versions: { electron: '35.0.0' } })
    expect(wrap.style).toEqual({})
  })

  test('treats a non-Electron process object as a browser', () => {
    const wrap = runLayout({ versions: {} })
    expect(wrap.style.maxWidth).toBe('1440px')
  })
})
