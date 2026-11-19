/**
 * Storage is plain text: markup is stripped on write, and React escapes again
 * on render. Returns null when nothing but markup was submitted.
 */
export function plainText(value: string | null | undefined): string | null {
  if (!value) return null
  const stripped = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped.length > 0 ? stripped : null
}
