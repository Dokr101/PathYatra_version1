import { describe, expect, it } from 'vitest'
import { categoryPhoto, destinationPhoto, hasDestinationPhoto, heroPhoto } from '../../data/destinationImages'

/** `'/…/pokhara-480.jpg 480w, …'` → [480, 960, 1600] */
function descriptors(srcset: string): number[] {
  return srcset.split(', ').map((candidate) => Number(candidate.match(/(\d+)w$/)?.[1]))
}

describe('destination photos', () => {
  it('resolves the width variants and builds srcset strings', async () => {
    const photo = await destinationPhoto('pokhara')
    expect(photo?.src).toMatch(/pokhara-1600\.jpg/)
    expect(photo?.webp).toMatch(/pokhara-1600\.webp/)
    expect(photo).toMatchObject({ width: 1600, height: 800 })
    expect(descriptors(photo?.srcset ?? '')).toEqual([480, 960, 1600])
    expect(descriptors(photo?.webpSrcset ?? '')).toEqual([480, 960, 1600])
    expect(photo?.srcset).toMatch(/pokhara-480\.jpg 480w/)
    expect(photo?.webpSrcset).toMatch(/pokhara-480\.webp 480w/)
  })

  it('never upscales: a 1024px photo stops at 1024', async () => {
    const photo = await categoryPhoto('sacred')
    expect(photo).toMatchObject({ width: 1024, height: 673 })
    expect(descriptors(photo?.srcset ?? '')).toEqual([480, 960, 1024])
  })

  it('maps category ids to their photograph', async () => {
    await expect(categoryPhoto('lakes')).resolves.toMatchObject({ width: 1600 })
  })

  it('returns undefined for a slug without a photo', async () => {
    await expect(destinationPhoto('not-a-destination')).resolves.toBeUndefined()
    expect(hasDestinationPhoto('not-a-destination')).toBe(false)
    expect(hasDestinationPhoto('rara-lake')).toBe(true)
  })

  it('keeps the hero eager with its manifest size', () => {
    expect(heroPhoto?.src).toMatch(/everest-base-camp-1600\.jpg/)
    expect(heroPhoto?.webp).toMatch(/everest-base-camp-1600\.webp/)
    expect(heroPhoto).toMatchObject({ width: 1600, height: 900 })
    expect(descriptors(heroPhoto?.webpSrcset ?? '')).toEqual([480, 960, 1600])
  })
})
