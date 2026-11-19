#!/usr/bin/env node
/**
 * Image pipeline for PathYatra.
 *
 *   npm run images:optimize   (or `node scripts/optimize-images.mjs`)
 *
 * 1. Every destination photograph is emitted at 480, 960 and 1600px wide (never
 *    enlarged past the source) in both WebP and JPG. The file name carries the
 *    real width — `pokhara-480.webp` — because the app derives its `srcset`
 *    descriptors from those names. The untouched JPG stays in place as the
 *    pipeline source.
 * 2. Sizes are recorded in src/data/destinationImageManifest.json so the app can
 *    render width/height attributes (no layout shift) and know which widths to
 *    expect.
 * 3. The wordmark logo is rewritten at 2x its rendered size with a palette, to
 *    stay under 48 KB.
 *
 * Idempotent: every variant is derived from the source JPG on each run.
 */
import { readdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIRS = [
  path.join(root, 'src', 'assets', 'destinations'),
  path.join(root, 'backend', 'public', 'images', 'destinations'),
]
const MANIFEST = path.join(root, 'src', 'data', 'destinationImageManifest.json')
const LOGO = path.join(root, 'src', 'assets', 'logo.png')

/** Rendered variants. Keep in sync with the glob in src/data/destinationPhotoUrls.ts. */
const WIDTHS = [480, 960, 1600]
const MAX_WIDTH = 1600
const MAX_BYTES = 200 * 1000
const WEBP_QUALITY = 78
const JPG_QUALITY = 82
const LOGO_MAX_BYTES = 48 * 1000
const LOGO_WIDTH = 440

const kb = (bytes) => `${Math.round(bytes / 1000)} KB`

/**
 * The smallest variant is 480px, the largest is the source's own width capped at
 * 1600px — so a 1024px photo ships 480/960/1024, not an upscaled 1600.
 */
function planWidths(naturalWidth) {
  const capped = Math.min(naturalWidth, MAX_WIDTH)
  const widths = WIDTHS.filter((width) => width < capped)
  widths.push(capped)
  return [...new Set(widths)].sort((a, b) => a - b)
}

/**
 * Hold WebP quality at 78 and trim it only for a variant over the budget; once
 * quality reaches 50, give up width instead. Returned width is the width that
 * was actually encoded, so the file name and srcset descriptor always match.
 */
async function webpAt(file, width) {
  let quality = WEBP_QUALITY
  let current = width
  for (;;) {
    const buffer = await sharp(file, { failOn: 'error' })
      .rotate()
      .resize({ width: current, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toBuffer()
    if (buffer.length <= MAX_BYTES) return { buffer, quality, width: current }
    if (quality > 50) {
      quality -= 6
      continue
    }
    if (current > 1200) {
      current = Math.max(1200, current - 200)
      quality = WEBP_QUALITY
      continue
    }
    return { buffer, quality, width: current }
  }
}

function jpgAt(file, width) {
  return sharp(file, { failOn: 'error' })
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true, progressive: true })
    .toBuffer()
}

async function variantsFor(file, written) {
  const { size: before } = await stat(file)
  const meta = await sharp(file, { failOn: 'error' }).metadata()
  const widths = planWidths(meta.width ?? MAX_WIDTH)
  const variants = []

  for (const plannedWidth of widths) {
    const webp = await webpAt(file, plannedWidth)
    const jpg = await jpgAt(file, webp.width)
    const stem = file.replace(/\.jpe?g$/i, '')
    const webpMeta = await sharp(webp.buffer).metadata()
    const width = webpMeta.width ?? webp.width

    await writeFile(`${stem}-${width}.webp`, webp.buffer)
    await writeFile(`${stem}-${width}.jpg`, jpg)
    written.add(`${stem}-${width}.webp`)
    written.add(`${stem}-${width}.jpg`)

    variants.push({
      width,
      height: webpMeta.height ?? 0,
      webp: webp.buffer.length,
      jpg: jpg.length,
      quality: webp.quality,
    })
  }

  return { before, variants }
}

/**
 * Drops any width variant this run did not write — a photo that shrank to fit
 * the budget must not keep the larger file around, and the app globs them all.
 */
async function pruneStaleVariants(dir, files, written) {
  const removed = []
  for (const name of files) {
    if (!/-\d+\.(webp|jpe?g)$/i.test(name) || written.has(path.join(dir, name))) continue
    await unlink(path.join(dir, name))
    removed.push(name)
  }
  return removed.length
}

/** Drops the single-size `foo.webp` files the previous pipeline produced. */
async function pruneSingleSizeWebp(dir, files) {
  const names = new Set(files)
  const removed = []
  for (const name of files) {
    if (!/\.webp$/i.test(name) || /-\d+\.webp$/i.test(name)) continue
    const stem = name.replace(/\.webp$/i, '')
    if (!names.has(`${stem}.jpg`) && !names.has(`${stem}.jpeg`)) continue
    await unlink(path.join(dir, name))
    removed.push(name)
  }
  return removed
}

async function run() {
  const rows = []
  const manifest = {}
  const pruned = []

  for (const dir of SOURCE_DIRS) {
    let files = []
    try {
      files = await readdir(dir)
    } catch {
      continue
    }
    pruned.push(...(await pruneSingleSizeWebp(dir, files)).map((name) => path.join(path.relative(root, dir), name)))

    // Skip this script's own `foo-480.jpg` outputs so runs stay idempotent.
    const sources = files.filter((entry) => /\.jpe?g$/i.test(entry) && !/-\d+\.jpe?g$/i.test(entry)).sort()
    const written = new Set()

    for (const name of sources) {
      const file = path.join(dir, name)
      const { before, variants } = await variantsFor(file, written)
      const slug = name.replace(/\.jpe?g$/i, '')
      if (dir === SOURCE_DIRS[0]) {
        const largest = variants[variants.length - 1]
        manifest[slug] = {
          width: largest.width,
          height: largest.height,
          widths: variants.map((variant) => variant.width),
        }
      }
      rows.push({ dir: path.relative(root, dir), file: name, before, variants })
    }

    const stale = await pruneStaleVariants(dir, await readdir(dir), written)
    if (stale) pruned.push(`${path.relative(root, dir)}: ${stale} superseded variant(s)`)
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)

  // The wordmark: 440px wide covers its 2x rendering, palette keeps it tiny.
  const logoBefore = (await stat(LOGO)).size
  const logoMeta = await sharp(LOGO).metadata()
  const logoBuffer = await sharp(LOGO)
    .resize({ width: LOGO_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer()
  if (logoBuffer.length <= LOGO_MAX_BYTES) await writeFile(LOGO, logoBuffer)

  console.log('\nDestination photographs → 480/960/1600 WebP + JPG')
  console.log('─'.repeat(96))
  for (const row of rows) {
    const sizes = row.variants
      .map((variant) => `${variant.width}px ${kb(variant.webp)}/${kb(variant.jpg)}`)
      .join('  ')
    console.log(`${row.file.padEnd(30)} ${kb(row.before).padStart(8)} →  ${sizes}`)
  }
  const totalBefore = rows.reduce((sum, row) => sum + row.before, 0)
  const totalAfter = rows.reduce(
    (sum, row) => sum + row.variants.reduce((inner, variant) => inner + variant.webp + variant.jpg, 0),
    0,
  )
  console.log('─'.repeat(96))
  console.log(`${String(rows.length).padStart(2)} files${''.padEnd(83)}${kb(totalBefore).padStart(8)} → ${kb(totalAfter).padStart(7)}`)
  console.log(`Variants per photo: ${WIDTHS.join('/')}px, capped at the source width.`)
  if (pruned.length) console.log(`Removed single-size WebP: ${pruned.join(', ')}`)

  console.log('\nLogo')
  console.log(`  ${logoMeta.width}×${logoMeta.height} ${kb(logoBefore)} → ${LOGO_WIDTH}px ${kb(logoBuffer.length)}`)

  // Only the largest variant of each photo is expected to fit the full-size budget.
  const over = rows.filter((row) => (row.variants.at(-1)?.webp ?? 0) > MAX_BYTES)
  const largest = [...rows].sort((a, b) => (b.variants.at(-1)?.webp ?? 0) - (a.variants.at(-1)?.webp ?? 0))[0]
  console.log(`\nLargest WebP: ${largest.file} at ${kb(largest.variants.at(-1)?.webp ?? 0)}`)
  if (over.length) {
    console.log(`Over the ${kb(MAX_BYTES)} budget: ${over.map((row) => row.file).join(', ')}`)
    process.exitCode = 1
  }
  if (logoBuffer.length > LOGO_MAX_BYTES) {
    console.log(`Logo over ${kb(LOGO_MAX_BYTES)} — left unchanged.`)
    process.exitCode = 1
  }
  console.log(`Manifest: ${path.relative(root, MANIFEST)}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
