import { describe, expect, it } from 'vitest'
import { safeInternalPath } from '../safePath'

describe('safeInternalPath', () => {
  it('keeps same-origin paths with their query and hash', () => {
    expect(safeInternalPath('/admin/destinations?page=2#top')).toBe('/admin/destinations?page=2#top')
    expect(safeInternalPath('/explore')).toBe('/explore')
  })

  it('rejects anything that could leave this origin', () => {
    expect(safeInternalPath(undefined)).toBeUndefined()
    expect(safeInternalPath('')).toBeUndefined()
    expect(safeInternalPath('admin')).toBeUndefined()
    expect(safeInternalPath('//evil.example/admin')).toBeUndefined()
    expect(safeInternalPath('https://evil.example/admin')).toBeUndefined()
    expect(safeInternalPath('/\\evil.example')).toBeUndefined()
  })

  it('drops credentials and keeps only the local path of a disguised URL', () => {
    expect(safeInternalPath('https://evil.example/')).toBeUndefined()
    expect(safeInternalPath('/admin@evil.example')).toBe('/admin@evil.example')
  })
})
