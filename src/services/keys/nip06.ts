/**
 * NIP-06 key derivation: BIP39 seed -> `m/44'/1237'/0'/0/0`.
 *
 * Ported from `chat/src/services/crypto/nip06.ts`. Any drift in this path
 * gives the same SSH key a different npub here than in chat and usdt-pay.
 */
import { HDKey } from '@scure/bip32';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { copyBytes, wipe } from '@/lib/bytes';
import { KeyError } from '@/lib/errors';

const NOSTR_PATH = "m/44'/1237'/0'/0/0";

/** The BIP32 ladder. **Consumes and wipes `seed`.** */
function nostrKeyFromSeed(seed: Uint8Array): Uint8Array {
  try {
    const master = HDKey.fromMasterSeed(seed);
    try {
      const derived = master.derive(NOSTR_PATH);
      if (!derived.privateKey) throw new KeyError('internal', 'Failed to derive Nostr private key');
      const priv = copyBytes(derived.privateKey);
      wipe(derived.privateKey);
      return priv;
    } finally {
      wipe(master.privateKey);
    }
  } finally {
    wipe(seed);
  }
}

/**
 * The Nostr secret key a 32-byte SSH seed roots. The seed is re-encoded as
 * the identity's 24 words (a re-encoding, not a derivation), which then run
 * the standard NIP-06 ladder. The returned key is the caller's to wipe.
 */
export function nostrKeyFromSshSeed(sshSeed: Uint8Array): Uint8Array {
  return nostrKeyFromSeed(mnemonicToSeedSync(entropyToMnemonic(sshSeed, wordlist)));
}
