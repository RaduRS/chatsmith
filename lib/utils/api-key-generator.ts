import crypto from 'crypto'

export function generateApiKey() {
  return crypto.randomBytes(24).toString('hex')
}