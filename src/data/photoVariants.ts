// Helpers shared by the eager hero imports and the lazy photo-URL chunk. Kept
// free of asset imports so neither caller pulls the other's files in.

export type PhotoSources = {
  webp: Record<number, string>
  jpg: Record<number, string>
}

const FILE_NAME = /^(.*)-(\d+)\.(webp|jpe?g)$/i

/**
 * Groups `import.meta.glob` output by stem and width:
 *
 *   '../assets/destinations/pokhara-480.webp' → { pokhara: { webp: { 480: url }, … } }
 *
 * Files that do not carry a width suffix are ignored.
 */
export function groupPhotoFiles(files: Record<string, string>): Record<string, PhotoSources> {
  const photos: Record<string, PhotoSources> = {}
  for (const [filePath, url] of Object.entries(files)) {
    const match = (filePath.split('/').pop() ?? '').match(FILE_NAME)
    if (!match) continue
    const [, stem, width, extension] = match
    const sources = (photos[stem] ??= { webp: {}, jpg: {} })
    const bucket = extension.toLowerCase() === 'webp' ? sources.webp : sources.jpg
    bucket[Number(width)] = url
  }
  return photos
}

function widthsOf(sources: Record<number, string>): number[] {
  return Object.keys(sources)
    .map(Number)
    .sort((a, b) => a - b)
}

/** `'/…/pokhara-480.webp 480w, /…/pokhara-960.webp 960w'` */
export function srcsetFor(sources: Record<number, string>): string {
  return widthsOf(sources)
    .map((width) => `${sources[width]} ${width}w`)
    .join(', ')
}

/** The widest variant, used for `<img src>` and for the intrinsic size. */
export function largestVariant(sources: Record<number, string>): { width: number; url: string } | undefined {
  const widths = widthsOf(sources)
  const width = widths[widths.length - 1]
  if (width === undefined) return undefined
  return { width, url: sources[width] }
}
