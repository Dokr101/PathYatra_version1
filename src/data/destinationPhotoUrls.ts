// This module is only ever reached through a dynamic import (see
// destinationImages.ts), so Vite puts the ~100 photo URLs in a separate chunk
// instead of the entry bundle. Keep it free of runtime imports beyond the pure
// grouping helper.

import { groupPhotoFiles, type PhotoSources } from './photoVariants'

// Only the width-suffixed variants that scripts/optimize-images.mjs writes
// (`pokhara-480.webp`) are imported. `langtang-valley.*` is an unused
// byte-identical copy of the Everest photo; keep it out of the bundle until
// someone removes the file.
const files = import.meta.glob(
  ['../assets/destinations/*-[0-9]*.{webp,jpg}', '!../assets/destinations/langtang-valley-*'],
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

export const PHOTOS: Record<string, PhotoSources> = groupPhotoFiles(files)
