/**
 * Returns `next` as a same-origin path (pathname + search + hash), or undefined
 * when it is missing, absolute, protocol-relative, or otherwise tries to leave
 * this origin. Use this before navigating to a caller-supplied destination.
 */
export function safeInternalPath(next: string | undefined): string | undefined {
  if (!next?.startsWith('/') || next.startsWith('//') || next.includes('\\')) return undefined

  try {
    const url = new URL(next, window.location.origin)
    if (url.origin !== window.location.origin) return undefined
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return undefined
  }
}
