/**
 * SSH key import: an encrypted OpenSSH Ed25519 private key becomes the raw
 * 32-byte seed that roots the user's Nostr identity.
 *
 * Ported from `chat/src/services/ssh/index.ts`. The same SSH key must yield
 * the same npub here as in chat and usdt-pay, so the seed handling is kept
 * byte for byte; see `services/keys/nip06.ts` for the rest of the ladder.
 */
import { ed25519 } from '@noble/curves/ed25519.js';

import { copyBytes, equalBytes, wipe } from '@/lib/bytes';
import { KeyError } from '@/lib/errors';

import { decryptOpenSSHPrivateBlock } from './bcrypt';
import { extractEd25519Seed, headerEd25519PublicKey, parseEncryptedOpenSSHKey } from './openssh';

export { estimateDecryptSeconds } from './bcrypt';

/**
 * Decrypt an OpenSSH Ed25519 private key to its raw 32-byte seed, the
 * caller's to wipe. Unencrypted keys are refused outright.
 *
 * Runs bcrypt_pbkdf at the key's round count, seconds to minutes. Call it
 * from the key worker, never on the main thread.
 */
export function convertOpenSSHEd25519(pemContent: string, passphrase: string): Uint8Array {
  const parsedKey = parseEncryptedOpenSSHKey(pemContent);
  const decryptedBlock = decryptOpenSSHPrivateBlock(parsedKey, passphrase);
  try {
    // `extractEd25519Seed` returns a view into `decryptedBlock`, which is wiped
    // below, so the copy is what lets the seed outlive this call at all.
    const seed = copyBytes(extractEd25519Seed(decryptedBlock));
    try {
      // Binding the header public key to the seed stops a crafted file from
      // naming one key while unlocking another identity.
      if (!equalBytes(ed25519.getPublicKey(seed), headerEd25519PublicKey(parsedKey))) {
        throw new KeyError('damaged-key', 'Header public key does not match the private key');
      }
      return seed;
    } catch (error) {
      wipe(seed);
      throw error;
    }
  } finally {
    wipe(decryptedBlock);
  }
}
