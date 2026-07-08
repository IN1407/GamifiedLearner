/**
 * API-key encryption at rest.
 *
 * The key is AES-GCM-encrypted before it touches IndexedDB, using a
 * non-extractable CryptoKey that itself lives in IndexedDB (structured clone
 * preserves CryptoKey objects without exposing key material to JS).
 *
 * Honest scope: this protects against casual inspection of IndexedDB contents
 * (e.g. someone browsing DevTools storage, disk-level DB copies read
 * elsewhere) — it is NOT a defense against code running in this same origin,
 * which could always call decrypt itself. The plaintext key exists in memory
 * only while a request is being sent, and is sent only to our own backend
 * over the app origin, never to third parties other than the chosen provider.
 */
import { getMeta, setMeta } from './db'

const KEY_ID = 'aes-key-v1'

async function getOrCreateAesKey(): Promise<CryptoKey> {
  const existing = await getMeta<CryptoKey>(KEY_ID)
  if (existing) return existing
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  )
  await setMeta(KEY_ID, key)
  return key
}

export async function encryptSecret(
  plaintext: string,
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const key = await getOrCreateAesKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { ciphertext, iv }
}

export async function decryptSecret(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
): Promise<string> {
  const key = await getOrCreateAesKey()
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext,
  )
  return new TextDecoder().decode(plain)
}
