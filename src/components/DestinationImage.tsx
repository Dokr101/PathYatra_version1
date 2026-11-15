import type { Destination } from '../types'
import { destinationImage } from '../data/destinationImages'
import { cx } from '../lib/format'
import { ScenicArt } from './ScenicArt'

interface Props {
  destination: Destination
  className?: string
  label?: string
  eager?: boolean
}

/**
 * Renders the supplied photograph when one exists for the destination, and
 * falls back to the generated landscape illustration for the rest.
 */
export function DestinationImage({ destination, className, label, eager = false }: Props) {
  const src =
    destination.uploadedCoverUrl || destinationImage(destination.slug) || destination.fallbackImageUrl

  if (!src) {
    return <ScenicArt scene={destination.scene} label={label} className={className} />
  }

  return (
    <img
      src={src}
      alt={label ?? destination.name}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cx(className, 'object-cover')}
    />
  )
}
