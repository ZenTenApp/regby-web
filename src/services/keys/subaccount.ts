/**
 * Login subaccounts: meltify's `-s` construction over an SSH key's raw seed.
 *
 * Ported from `chat/src/services/crypto/subaccount.ts` (login half only),
 * itself from meltify (`internal/sshkey/key.go:143`, `DeriveSubaccountKey`):
 *
 *     derivedSeed = SHA256( SHA256(name) || sshSeed )
 *
 * The name is a label, as in meltify, not a secret: the encrypted key is what
 * protects the identity. Kept byte for byte so the same key and name give the
 * same npub here as in chat and `meltify -s <name>`.
 */
import { sha256 } from '@noble/hashes/sha2.js';

import { utf8, wipe } from '@/lib/bytes';

/** An Ed25519 seed, and SHA256's output. */
const SEED_BYTES = 32;

/** The seed `subaccount` names under `sshSeed`. Both buffers are the caller's. */
export function deriveSubaccountSeed(sshSeed: Uint8Array, subaccount: string): Uint8Array {
  if (sshSeed.length !== SEED_BYTES) throw new Error(`SSH seed must be ${SEED_BYTES} bytes`);
  const material = new Uint8Array(SEED_BYTES * 2);
  const nameHash = sha256(utf8(subaccount));
  try {
    material.set(nameHash, 0);
    material.set(sshSeed, SEED_BYTES);
    return sha256(material);
  } finally {
    wipe(nameHash, material);
  }
}
