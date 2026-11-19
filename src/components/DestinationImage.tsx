import { useEffect, useState } from 'react'
import type { Destination } from '../types'
import { destinationPhoto, type DestinationPhoto } from '../data/destinationImages'
import { cx } from '../lib/format'
import { ScenicArt } from './ScenicArt'

interface Props {
  destination: Destination
  className?: string
  label?: string
  eager?: boolean
  /**
   * Rendered width of this slot, so the browser can pick the smallest variant.
   * The default suits the three-up card grid; a full-bleed hero should pass
   * `100vw`.
   */
  sizes?: string
}

const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'

/**
 * Renders the supplied photograph when one exists for the destination, and
 * falls back to the generated landscape illustration for the rest. Each photo
 * ships at 480/960/1600px in WebP and JPG, so a phone downloads a small file
 * for a card and a large one only for a hero. Photos carry their intrinsic
 * size, so late loading never shifts the layout. Photo URLs live in a lazy
 * chunk, so the first card asks for them once and every later card reuses the
 * cache.
 */
export function DestinationImage({ destination, className, label, eager = false, sizes = DEFAULT_SIZES }: Props) {
  const uploaded = destination.uploadedCoverUrl
  const [photo, setPhoto] = useState<DestinationPhoto | undefined>(undefined)

  useEffect(() => {
    if (uploaded) {
      setPhoto(undefined)
      return
    }

    let active = true
    destinationPhoto(destination.slug).then((resolved) => {
      if (active) setPhoto(resolved)
    })
    return () => {
      active = false
    }
  }, [destination.slug, uploaded])

  const src = uploaded || destination.fallbackImageUrl

  if (photo) {
    return (
      <picture className="contents">
        <source srcSet={photo.webpSrcset} sizes={sizes} type="image/webp" />
        <img
          src={photo.src}
          srcSet={photo.srcset}
          sizes={sizes}
          width={photo.width}
          height={photo.height}
          alt={label ?? destination.name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={cx(className, 'object-cover')}
        />
      </picture>
    )
  }

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
