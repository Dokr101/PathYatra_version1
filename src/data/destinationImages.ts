import type { Category } from '../types'
import manifest from './destinationImageManifest.json'
import { groupPhotoFiles, largestVariant, srcsetFor } from './photoVariants'

/** A destination photograph in both formats, at every width the pipeline emits. */
export type DestinationPhoto = {
  /** Widest JPG, the `<img src>` fallback for browsers without srcset support. */
  src: string
  /** Widest WebP, used by callers that only take one source. */
  webp: string
  /** JPG candidates, e.g. `'/…/pokhara-480.jpg 480w, /…/pokhara-960.jpg 960w'`. */
  srcset: string
  /** The same candidates as WebP, for `<source type="image/webp">`. */
  webpSrcset: string
  /** Intrinsic size of the widest variant, for the width/height attributes. */
  width: number
  height: number
}

const sizes = manifest as Record<string, { width: number; height: number; widths?: number[] }>

// The hero must paint with the first render, so its six URLs are direct imports
// (no async chunk). Every other photo URL arrives through one lazy chunk
// (destinationPhotoUrls.ts) the first time a photo is needed.
const heroFiles = import.meta.glob('../assets/destinations/everest-base-camp-[0-9]*.{webp,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const heroSources = groupPhotoFiles(heroFiles)['everest-base-camp']

function photoFrom(
  sources: { webp: Record<number, string>; jpg: Record<number, string> } | undefined,
  size: { width: number; height: number } | undefined,
): DestinationPhoto | undefined {
  if (!sources || !size) return undefined
  const largestJpg = largestVariant(sources.jpg)
  const largestWebp = largestVariant(sources.webp)
  if (!largestJpg || !largestWebp) return undefined
  return {
    src: largestJpg.url,
    webp: largestWebp.url,
    srcset: srcsetFor(sources.jpg),
    webpSrcset: srcsetFor(sources.webp),
    width: size.width,
    height: size.height,
  }
}

export const heroPhoto: DestinationPhoto | undefined = photoFrom(heroSources, sizes['everest-base-camp'])
export const heroImage = heroPhoto?.src ?? ''

/**
 * Media policy: every published destination carries a real photograph, so Home,
 * Explore, the map list and detail pages all look the same. The generated
 * ScenicArt illustration is only a last resort for a destination that arrives
 * without any image (for example a new admin record with no cover yet).
 *
 * Slug → file name in src/assets/destinations (see scripts/optimize-images.mjs).
 */
const PHOTO_STEMS: Record<string, string> = {
  'everest-base-camp': 'everest-base-camp',
  'annapurna-circuit': 'annapurna-circuit',
  'upper-mustang': 'upper-mustang',
  'langtang-valley': 'langtang',
  'kathmandu-heritage': 'kathmandu-heritage',
  pokhara: 'pokhara',
  lumbini: 'lumbini',
  janakpur: 'janakpur',
  chitwan: 'chitwan',
  'rara-lake': 'rara-lake',
  bandipur: 'bandipur',
  bardia: 'bardiya_national_park',
  bhaktapur: 'bhaktapur_durbar_square',
  ghandruk: 'ghandruk',
  gosaikunda: 'gosaikunda',
  'koshi-tappu': 'koshi_tapu_wildlife_reserve',
  nagarkot: 'nagarkot',
  'shey-phoksundo': 'shey_phoksundo_lake',
}

const CATEGORY_STEMS: Record<Category, string> = {
  adventure: 'everest-base-camp',
  sacred: 'kathmandu-heritage',
  lakes: 'pokhara',
  wildlife: 'chitwan',
}

type PhotoUrls = {
  photos: Record<string, { webp: Record<number, string>; jpg: Record<number, string> }>
}

let urlsPromise: Promise<PhotoUrls> | undefined

function loadUrls(): Promise<PhotoUrls> {
  urlsPromise ??= import('./destinationPhotoUrls').then((module) => ({ photos: module.PHOTOS }))
  return urlsPromise
}

const photoCache = new Map<string, Promise<DestinationPhoto | undefined>>()

function photoForStem(stem: string | undefined): Promise<DestinationPhoto | undefined> {
  if (!stem) return Promise.resolve(undefined)

  let cached = photoCache.get(stem)
  if (!cached) {
    cached = loadUrls().then(({ photos }) => photoFrom(photos[stem], sizes[stem]))
    photoCache.set(stem, cached)
  }
  return cached
}

/** Resolves the width variants for a destination, or undefined when it has none. */
export function destinationPhoto(slug: string): Promise<DestinationPhoto | undefined> {
  return photoForStem(PHOTO_STEMS[slug])
}

/** JPG URL for callers that only need one source. */
export function destinationImage(slug: string): Promise<string | undefined> {
  return destinationPhoto(slug).then((photo) => photo?.src)
}

export function categoryPhoto(category: Category): Promise<DestinationPhoto | undefined> {
  return photoForStem(CATEGORY_STEMS[category])
}

export function categoryImage(category: Category): Promise<string> {
  return categoryPhoto(category).then((photo) => photo?.src ?? heroImage)
}

/** Synchronous check: the manifest lists every stem that ships width variants. */
export function hasDestinationPhoto(slug: string): boolean {
  return Boolean(PHOTO_STEMS[slug] && sizes[PHOTO_STEMS[slug]])
}
