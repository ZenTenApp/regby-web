/**
 * NIP-06 key derivation: BIP39 seed -> `m/44'/1237'/0'/0/0`.
 *
 * Ported from `chat/src/services/crypto/nip06.ts`. Any drift in this path
 * gives the same SSH key a different npub here than in chat and usdt-pay;
 * the card label (BIP39 passphrase) step follows zentenpay's Cards.
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
 * The BIP39 seed a 32-byte SSH seed roots. The seed is re-encoded as the
 * identity's 24 words (a re-encoding, not a derivation); a card label is the
 * BIP39 passphrase over them, making a Card as zentenpay does, and an empty
 * one is the plain wallet. Pass the label already normalised
 * (`normalizeCardLabel`). The returned seed is the caller's to wipe.
 */
export function bip39SeedFromSshSeed(sshSeed: Uint8Array, cardLabel: string): Uint8Array {
  return mnemonicToSeedSync(entropyToMnemonic(sshSeed, wordlist), cardLabel);
}

/**
 * The Nostr secret key a 32-byte SSH seed roots: its BIP39 seed run down the
 * standard NIP-06 ladder. `cardLabel` is required, not defaulted, so no call
 * site can drop a Card's label and silently sign as its wallet. The returned
 * key is the caller's to wipe.
 */
export function nostrKeyFromSshSeed(sshSeed: Uint8Array, cardLabel: string): Uint8Array {
  return nostrKeyFromSeed(bip39SeedFromSshSeed(sshSeed, cardLabel));
}
