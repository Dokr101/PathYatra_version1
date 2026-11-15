import type { Category } from '../types'
import annapurnaCircuit from '../assets/destinations/annapurna-circuit.jpg'
import chitwan from '../assets/destinations/chitwan.jpg'
import everestBaseCamp from '../assets/destinations/everest-base-camp.jpg'
import janakpur from '../assets/destinations/janakpur.jpg'
import kathmanduHeritage from '../assets/destinations/kathmandu-heritage.jpg'
import langtangValley from '../assets/destinations/langtang-valley.jpg'
import lumbini from '../assets/destinations/lumbini.jpg'
import pokhara from '../assets/destinations/pokhara.jpg'
import raraLake from '../assets/destinations/rara-lake.jpg'
import upperMustang from '../assets/destinations/upper-mustang.jpg'

/**
 * Photographs supplied for the seeded destinations. Destinations without a
 * photo keep their generated ScenicArt illustration.
 */
const DESTINATION_IMAGES: Record<string, string> = {
  'everest-base-camp': everestBaseCamp,
  'annapurna-circuit': annapurnaCircuit,
  'upper-mustang': upperMustang,
  'langtang-valley': langtangValley,
  'kathmandu-heritage': kathmanduHeritage,
  pokhara,
  lumbini,
  janakpur,
  chitwan,
  'rara-lake': raraLake,
}

const CATEGORY_IMAGES: Record<Category, string> = {
  adventure: everestBaseCamp,
  sacred: kathmanduHeritage,
  lakes: pokhara,
  wildlife: chitwan,
}

export function destinationImage(slug: string): string | undefined {
  return DESTINATION_IMAGES[slug]
}

export function categoryImage(category: Category): string {
  return CATEGORY_IMAGES[category]
}

export { everestBaseCamp as heroImage }
