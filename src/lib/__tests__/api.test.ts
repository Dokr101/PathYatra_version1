import { describe, expect, it } from 'vitest'
import { ApiRequestError, isAbortError } from '../api'

describe('isAbortError', () => {
  it('recognises a real fetch abort', () => {
    const controller = new AbortController()
    const reason = controller.signal.reason ?? new DOMException('Aborted', 'AbortError')
    expect(isAbortError(reason)).toBe(true)
    expect(isAbortError(new DOMException('The user aborted a request.', 'AbortError'))).toBe(true)
  })

  it('does not treat API failures or timeouts as aborts', () => {
    expect(isAbortError(new ApiRequestError(0, 'Cannot reach the PathYatra server.'))).toBe(false)
    expect(isAbortError(new Error('Cannot reach the PathYatra server.'))).toBe(false)
    expect(isAbortError(new DOMException('Timed out', 'TimeoutError'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError('AbortError')).toBe(false)
  })
})
