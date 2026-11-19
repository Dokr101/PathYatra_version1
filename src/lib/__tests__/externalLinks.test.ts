import { describe, expect, it } from 'vitest'

// Read the JSX sources through Vite so this guard needs no filesystem typings.
const sources = import.meta.glob('/src/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('target="_blank" links', () => {
  it('always set rel="noopener" so the new tab cannot navigate the opener', () => {
    const offenders: string[] = []

    for (const [file, text] of Object.entries(sources)) {
      for (const match of text.matchAll(/target="_blank"/g)) {
        // JSX attributes can sit on following lines, so look a little past the match.
        const attributes = text.slice(match.index, match.index + 300)
        const rel = /rel="([^"]*)"/.exec(attributes)?.[1] ?? ''
        if (!rel.split(/\s+/).includes('noopener')) {
          const line = text.slice(0, match.index).split('\n').length
          offenders.push(`${file.replace('/src/', 'src/')}:${line}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
