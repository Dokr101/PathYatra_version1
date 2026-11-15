import 'dotenv/config'

function readJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or shorter than 32 characters. Set it in backend/.env (generate one with: openssl rand -hex 32).',
    )
  }
  return secret
}

function readPort(): number {
  const parsed = Number(process.env.PORT)
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65_536) return parsed
  return 3001
}

export const env = {
  port: readPort(),
  jwtSecret: readJwtSecret(),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY?.trim() ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET?.trim() ?? '',
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER?.trim() || 'pathyatra',
}
