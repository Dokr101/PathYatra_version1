import crypto from 'node:crypto'
import { env } from '../lib/env.js'
import { ApiError } from '../lib/api-error.js'

const UPLOAD_URL = 'https://api.cloudinary.com/v1_1'

export interface CloudinaryResult {
  secure_url: string
  public_id: string
  width: number
  height: number
  format: string
  bytes: number
}

function requireConfig() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new ApiError(
      503,
      'Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on the API server.',
    )
  }
  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    apiSecret: env.cloudinaryApiSecret,
  }
}

function signature(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return crypto.createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex')
}

/**
 * Uploads an in-memory image buffer to Cloudinary. Only the URL and public ID
 * are returned; the binary is never written to the database or disk.
 */
export async function uploadImage(
  buffer: Buffer,
  folder: string,
  options: { publicId?: string; altText?: string } = {},
): Promise<CloudinaryResult> {
  const { cloudName, apiKey, apiSecret } = requireConfig()

  const timestamp = String(Math.floor(Date.now() / 1000))
  const signParams: Record<string, string> = { folder, timestamp }
  if (options.publicId) signParams.public_id = options.publicId

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buffer)]), 'upload')
  form.append('api_key', apiKey)
  form.append('timestamp', timestamp)
  form.append('folder', folder)
  if (options.publicId) form.append('public_id', options.publicId)
  if (options.altText) form.append('context', `alt=${options.altText}`)
  form.append('signature', signature(signParams, apiSecret))

  let response: Response
  try {
    response = await fetch(`${UPLOAD_URL}/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    })
  } catch {
    throw new ApiError(502, 'Could not reach Cloudinary. Check the server network connection.')
  }

  const payload = (await response.json().catch(() => null)) as
    | (CloudinaryResult & { error?: { message?: string } })
    | null

  if (!response.ok || !payload?.secure_url) {
    throw new ApiError(
      502,
      payload?.error?.message || `Cloudinary rejected the upload (${response.status})`,
    )
  }

  return {
    secure_url: payload.secure_url,
    public_id: payload.public_id,
    width: payload.width,
    height: payload.height,
    format: payload.format,
    bytes: payload.bytes,
  }
}

export async function destroyImage(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = requireConfig()
  const timestamp = String(Math.floor(Date.now() / 1000))
  const form = new FormData()
  form.append('public_id', publicId)
  form.append('api_key', apiKey)
  form.append('timestamp', timestamp)
  form.append('signature', signature({ public_id: publicId, timestamp }, apiSecret))

  const response = await fetch(`${UPLOAD_URL}/${cloudName}/image/destroy`, {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    // The database record is still removed; a stale Cloudinary asset is not fatal.
    console.warn(`[cloudinary] could not destroy ${publicId}: ${response.status}`)
  }
}
